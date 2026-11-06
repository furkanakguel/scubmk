import { z } from 'zod';
import { getAdmin, canEdit, audit, passwordHash } from '../../../admin-auth';
import { accountColumns } from '../../../member-auth';
import { requestFailure, db, json, body, rate, sameOrigin, token, hash } from '../../../server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(admin)) return json({ error: 'Bu bölüm için yetkin yok.' }, 403);
  const p = new URL(request.url).searchParams,
    q = (p.get('q') || '').slice(0, 100),
    role = p.get('role') || '',
    status = p.get('status') || '',
    page = Math.max(1, Math.min(10000, Math.floor(Number(p.get('page')) || 1)));
  const where =
    "WHERE (?='' OR name LIKE ? OR email LIKE ? OR member_no LIKE ?) AND (?='' OR club_role=?)" +
    (status === 'active' ? ' AND active=1' : status === 'inactive' ? ' AND active=0' : '');
  const binds = [q, '%' + q + '%', '%' + q + '%', '%' + q + '%', role, role];
  const results = await db().batch([
    db()
      .prepare(
        `SELECT ${accountColumns} FROM club_accounts ${where} ORDER BY created_at DESC,id LIMIT 30 OFFSET ?`,
      )
      .bind(...binds, (page - 1) * 30),
    db()
      .prepare('SELECT COUNT(*) AS total FROM club_accounts ' + where)
      .bind(...binds),
  ]);
  return json({
    items: results[0].results,
    total: (results[1].results[0] as { total: number } | undefined)?.total || 0,
    page,
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const admin = await getAdmin();
  if (!admin) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(admin)) return json({ error: 'Bu işlem için yetkin yok.' }, 403);
  try {
    if (!(await rate(request, 'admin-member-write', 80)))
      return json({ error: 'Çok fazla işlem.' }, 429);
    const d = await body(request);

    if (d.action === 'create') {
      const p = z
        .object({
          action: z.literal('create'),
          name: z.string().trim().min(2).max(80),
          email: z
            .string()
            .trim()
            .email()
            .max(180)
            .transform((s) => s.toLowerCase()),
          department: z.string().trim().max(100),
        })
        .strict()
        .safeParse(d);
      if (!p.success) return json({ error: 'Ad, e-posta ve bölüm bilgilerini kontrol et.' }, 400);
      const v = p.data,
        id = crypto.randomUUID(),
        raw = token(),
        now = Date.now();
      await db()
        .prepare(
          'INSERT INTO club_accounts (id,name,email,department,password_hash,member_no,card_code,recovery_hash,reset_hash,reset_expires,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          v.name,
          v.email,
          v.department,
          await passwordHash(token()),
          'BMK-' +
            new Date(now).getFullYear().toString().slice(2) +
            '-' +
            token().slice(0, 8).toUpperCase(),
          token().slice(0, 32),
          await hash(token()),
          await hash(raw),
          now + 3600000,
          now,
          now,
        )
        .run();
      await audit(admin, 'Üye hesabı oluşturuldu', v.email);
      return json({ ok: true, link: new URL('/giris', request.url).href + '#kurtar=' + raw }, 201);
    }
    if (d.action === 'profile') {
      const p = z
        .object({
          action: z.literal('profile'),
          id: z.string().uuid(),
          name: z.string().trim().min(2).max(80),
          department: z.string().trim().max(100),
          updatedAt: z.number().int(),
        })
        .strict()
        .safeParse(d);
      if (!p.success) return json({ error: 'Bilgileri kontrol et.' }, 400);
      const v = p.data;
      const saved = await db()
        .prepare(
          'UPDATE club_accounts SET name=?,department=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND updated_at=? RETURNING name',
        )
        .bind(v.name, v.department, Date.now(), v.id, v.updatedAt)
        .first<{ name: string }>();
      if (!saved) return json({ error: 'Hesap değişti. Listeyi yenile.' }, 409);
      await audit(admin, 'Üye bilgileri güncellendi', saved.name);
      return json({ ok: true });
    }
    if (d.action === 'revoke') {
      if (typeof d.id !== 'string' || d.id.length > 80)
        return json({ error: 'Geçersiz hesap.' }, 400);
      const saved = await db()
        .prepare(
          'UPDATE club_accounts SET auth_version=auth_version+1,updated_at=MAX(updated_at+1,?) WHERE id=? RETURNING name',
        )
        .bind(Date.now(), d.id)
        .first<{ name: string }>();
      if (!saved) return json({ error: 'Üye bulunamadı.' }, 404);
      await audit(admin, 'Üyenin oturumları kapatıldı', saved.name);
      return json({ ok: true });
    }
    if (d.action === 'update') {
      const p = z
        .object({
          action: z.literal('update'),
          id: z.string().uuid(),
          role: z.enum(['member', 'core', 'president', 'vice_president', 'advisor']),
          active: z.boolean(),
          updatedAt: z.number().int(),
        })
        .strict()
        .safeParse(d);
      if (!p.success) return json({ error: 'Üyelik bilgilerini kontrol et.' }, 400);
      const v = p.data;
      const writes = [
        db()
          .prepare(
            'UPDATE club_accounts SET club_role=?,auth_version=auth_version+CASE WHEN active!=? THEN 1 ELSE 0 END,active=?,reset_hash=CASE WHEN ?=0 THEN NULL ELSE reset_hash END,reset_expires=CASE WHEN ?=0 THEN NULL ELSE reset_expires END,updated_at=MAX(updated_at+1,?) WHERE id=? AND updated_at=? RETURNING name',
          )
          .bind(v.role, +v.active, +v.active, +v.active, +v.active, Date.now(), v.id, v.updatedAt),
      ];
      if (!v.active)
        writes.push(
          db()
            .prepare(
              'DELETE FROM club_sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM club_accounts WHERE id=? AND active=0)',
            )
            .bind(v.id, v.id),
          db()
            .prepare(
              'DELETE FROM club_password_resets WHERE user_id=? AND EXISTS(SELECT 1 FROM club_accounts WHERE id=? AND active=0)',
            )
            .bind(v.id, v.id),
        );
      const results = await db().batch(writes),
        row = results[0].results[0] as { name: string } | undefined;
      if (!row)
        return json(
          { error: 'Kayıt değişmiş veya bulunamadı. Listeyi yenileyip tekrar dene.' },
          409,
        );
      await audit(
        admin,
        'Üyelik unvanı / erişimi güncellendi',
        row.name + ' / ' + v.role + ' / ' + (v.active ? 'Aktif' : 'Askıda'),
      );
      return json({ ok: true });
    }
    if (d.action === 'reset-link') {
      if (typeof d.id !== 'string') return json({ error: 'Hesap bulunamadı.' }, 400);
      const raw = token();
      const row = await db()
        .prepare(
          'UPDATE club_accounts SET reset_hash=?,reset_expires=? WHERE id=? AND active=1 RETURNING name',
        )
        .bind(await hash(raw), Date.now() + 3600000, d.id)
        .first<{ name: string }>();
      if (!row) return json({ error: 'Aktif hesap bulunamadı.' }, 404);
      await audit(admin, 'Üyelik kurtarma bağlantısı oluşturuldu', row.name);
      return json({ ok: true, link: new URL('/giris', request.url).href + '#kurtar=' + raw });
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return json({ error: 'Bu e-posta ile bir hesap zaten var.' }, 409);
    return requestFailure(e, 'Üyelik kaydedilemedi.');
  }
}
