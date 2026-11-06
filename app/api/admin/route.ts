import { requestFailure, db, json, sameOrigin, body, hash, token, rate } from '../../server';
import { getAdmin, canEdit, audit } from '../../admin-auth';
import { getSettings } from '../../content';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const flag = z.boolean().default(false),
  image = z.string().max(80).default('');
const safeUrl = z
  .string()
  .url()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), 'Geçerli bir bağlantı gir.');
const eventSchema = z.object({
  id: z.string().max(80).optional(),
  updatedAt: z.number().int().nonnegative().optional(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(800),
  details: z.string().trim().max(5000).default(''),
  category: z.enum(['Buluşma', 'Atölye', 'Hackathon', 'Söyleşi', 'Gezi', 'Diğer']),
  date: z.string().datetime({ offset: true }),
  location: z.string().trim().min(3).max(160),
  capacity: z.number().int().min(1).max(10000),
  question: z.string().trim().max(240).default(''),
  imageId: image,
  imageAlt: z.string().trim().max(180).default(''),
  published: flag,
  registrationOpen: flag,
});
const memberSchema = z.object({
  id: z.string().max(80).optional(),
  updatedAt: z.number().int().nonnegative().optional(),
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  role: z.string().trim().min(2).max(100),
  team: z.string().trim().max(100).default(''),
  email: z.union([z.literal(''), z.string().email().max(180)]).default(''),
  department: z.string().trim().max(100).default(''),
  year: z.string().trim().max(50).default(''),
  bio: z.string().trim().max(3000).default(''),
  photoId: image,
  photoAlt: z.string().trim().max(180).default(''),
  links: z
    .array(z.object({ label: z.string().trim().min(1).max(40), url: safeUrl }))
    .max(5)
    .default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  published: flag,
});
const settingsSchema = z.object({
  heroTitle: z.string().trim().min(3).max(65),
  heroText: z.string().trim().min(10).max(500),
  aboutText: z.string().trim().min(10).max(1800),
  heroImage: image,
  heroImageAlt: z.string().trim().max(180).default(''),
  announcement: z.string().trim().max(200),
  instagram: safeUrl,
  contactEmail: z.union([z.literal(''), z.string().email().max(180)]),
  membershipOpen: z.boolean(),
});
async function validImage(id: string) {
  return (
    !id || !!(await db().prepare('SELECT id FROM media WHERE id=? AND archived=0').bind(id).first())
  );
}
function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '\ufeffKayıt bulunamadı\r\n';
  const cell = (v: unknown) =>
    '"' +
    String(v ?? '')
      .replace(/^[\s\x00-\x1f]*[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  return (
    '\ufeff' +
    [
      Object.keys(rows[0]).map(cell).join(','),
      ...rows.map((r) => Object.values(r).map(cell).join(',')),
    ].join('\r\n')
  );
}
export async function GET(request: Request) {
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  const p = new URL(request.url).searchParams,
    section = p.get('section') || 'overview',
    page = Math.max(1, Math.min(10000, Math.floor(Number(p.get('page')) || 1))),
    offset = (page - 1) * 30;
  try {
    if (section === 'me') return json({ user });
    if (user.role === 'checkin') return json({ error: 'Bu bölüm için yetkin yok.' }, 403);
    if (section === 'overview') {
      const results = await db().batch([
        db().prepare('SELECT COUNT(*) AS total FROM events WHERE archived=0'),
        db().prepare(
          'SELECT COUNT(*) AS total,SUM(checked_in_at IS NOT NULL) AS checked FROM registrations WHERE demo=0',
        ),
        db().prepare(
          'SELECT COUNT(*) AS total,SUM(published=1) AS published FROM members WHERE archived=0',
        ),
        db().prepare(
          'SELECT id,event_title,name,created_at FROM registrations WHERE demo=0 ORDER BY created_at DESC LIMIT 6',
        ),
        db()
          .prepare(
            'SELECT id,title,date,location,published FROM events WHERE archived=0 AND date>? ORDER BY date LIMIT 4',
          )
          .bind(new Date().toISOString()),
        db().prepare(
          'SELECT actor_name,action,target,created_at FROM audit_log ORDER BY created_at DESC LIMIT 6',
        ),
      ]);
      return json({
        events: results[0].results[0],
        registrations: results[1].results[0],
        members: results[2].results[0],
        recent: results[3].results,
        next: results[4].results,
        activity: results[5].results,
      });
    }
    if (section === 'events' || section === 'members') {
      const q = (p.get('q') || '').slice(0, 100),
        status = p.get('status') || '',
        table = section === 'events' ? 'events' : 'members',
        column = table === 'events' ? 'title' : 'name',
        where = `WHERE archived=? AND (?='' OR ${column} LIKE ?) ${status === 'draft' ? 'AND published=0' : status === 'published' ? 'AND published=1' : ''}`,
        binds = [status === 'archived' ? 1 : 0, q, '%' + q + '%'];
      const select =
          table === 'events'
            ? 'SELECT events.*,(SELECT COUNT(*) FROM registrations r WHERE r.event_id=events.id) AS count FROM events'
            : 'SELECT * FROM members',
        order = table === 'events' ? 'date DESC,id' : 'sort_order,name,id';
      const rows = await db().batch([
        db()
          .prepare(`${select} ${where} ORDER BY ${order} LIMIT 30 OFFSET ?`)
          .bind(...binds, offset),
        db()
          .prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`)
          .bind(...binds),
      ]);
      return json({
        items: rows[0].results,
        total: (rows[1].results[0] as { total: number }).total,
        page,
      });
    }
    if (section === 'registrations') {
      const q = (p.get('q') || '').slice(0, 100),
        event = (p.get('event') || '').slice(0, 80),
        status = p.get('status'),
        where =
          "WHERE demo=0 AND (?='' OR name LIKE ? OR email LIKE ?) AND (?='' OR event_id=?)" +
          (status === 'checked'
            ? ' AND checked_in_at IS NOT NULL'
            : status === 'waiting'
              ? ' AND checked_in_at IS NULL'
              : '');
      const params = [q, '%' + q + '%', '%' + q + '%', event, event];
      const total = await db()
        .prepare('SELECT COUNT(*) AS count FROM registrations ' + where)
        .bind(...params)
        .first<{ count: number }>();
      if (p.get('format') === 'csv' && (total?.count || 0) > 10000)
        return json({ error: 'Dışa aktarmak için etkinlik veya arama filtresini daralt.' }, 400);
      const rows = (
        await db()
          .prepare(
            'SELECT id,event_id,event_title,name,email,department,year,answer,created_at,checked_in_at FROM registrations ' +
              where +
              ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
          )
          .bind(
            ...params,
            p.get('format') === 'csv' ? 10000 : 30,
            p.get('format') === 'csv' ? 0 : offset,
          )
          .all()
      ).results;
      if (p.get('format') === 'csv')
        return new Response(csv(rows), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="bmk-basvurular.csv"',
            'Cache-Control': 'no-store',
          },
        });
      return json({
        items: rows,
        total: total?.count || 0,
        page,
        events: (
          await db().prepare('SELECT id,title FROM events ORDER BY date DESC LIMIT 500').all()
        ).results,
      });
    }
    if (section === 'media')
      return json({
        items: (
          await db()
            .prepare(
              'SELECT id,name,type,size,created_at,archived FROM media WHERE archived=' +
                (p.get('archived') === '1' ? '1' : '0') +
                ' ORDER BY created_at DESC LIMIT 60 OFFSET ?',
            )
            .bind((page - 1) * 60)
            .all()
        ).results,
        page,
      });
    if (section === 'settings')
      return json({
        settings: await getSettings(),
        version:
          (
            await db()
              .prepare("SELECT updated_at FROM settings WHERE key='site'")
              .first<{ updated_at: number }>()
          )?.updated_at || 0,
      });
    if (section === 'admins') {
      if (user.role !== 'owner') return json({ error: 'Yalnızca site sahibi erişebilir.' }, 403);
      return json({
        items: (
          await db()
            .prepare(
              'SELECT id,email,name,role,active,created_at FROM admin_users ORDER BY created_at',
            )
            .all()
        ).results,
        invites: (
          await db()
            .prepare(
              'SELECT id,email,name,role,expires_at FROM admin_invites WHERE used_at IS NULL AND expires_at>? ORDER BY created_at DESC',
            )
            .bind(Date.now())
            .all()
        ).results,
      });
    }
    if (section === 'audit') {
      if (user.role !== 'owner') return json({ error: 'Yalnızca site sahibi erişebilir.' }, 403);
      return json({
        items: (
          await db()
            .prepare(
              'SELECT actor_name,action,target,created_at FROM audit_log ORDER BY created_at DESC LIMIT 30 OFFSET ?',
            )
            .bind(offset)
            .all()
        ).results,
        page,
      });
    }
    return json({ error: 'Bölüm bulunamadı.' }, 404);
  } catch {
    return json({ error: 'Veriler yüklenemedi. Yeniden deneyebilirsin.' }, 500);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  try {
    if (!(await rate(request, 'admin-write', 150)))
      return json({ error: 'Çok fazla işlem. Biraz sonra tekrar dene.' }, 429);
    const data = await body(request);
    if (data.action === 'checkin') {
      if (typeof data.token !== 'string' || !/^[a-f0-9]{48}$/.test(data.token))
        return json({ error: 'QR kodu geçerli değil.' }, 400);
      const h = await hash(data.token);
      const row = await db()
        .prepare(
          'UPDATE registrations SET checked_in_at=? WHERE checkin_hash=? AND checked_in_at IS NULL RETURNING name,event_title AS eventTitle,demo',
        )
        .bind(Date.now(), h)
        .first();
      if (row) {
        await audit(user, 'Giriş kaydedildi', String(row.eventTitle));
        return json({ ok: true, registration: row });
      }
      const exists = await db()
        .prepare('SELECT id FROM registrations WHERE checkin_hash=?')
        .bind(h)
        .first();
      return json({ error: exists ? 'Bu bilet daha önce kullanılmış.' : 'Bilet bulunamadı.' }, 409);
    }
    if (!canEdit(user)) return json({ error: 'Bu işlem için yetkin yok.' }, 403);
    if (data.action === 'renew-ticket') {
      if (typeof data.id !== 'string') return json({ error: 'Başvuru bulunamadı.' }, 400);
      const raw = token(),
        checkin = (await hash('checkin:' + raw)).slice(0, 48);
      const r = await db()
        .prepare(
          'UPDATE registrations SET token_hash=?,checkin_hash=? WHERE id=? RETURNING name,event_title',
        )
        .bind(await hash(raw), await hash(checkin), data.id)
        .first<{ name: string; event_title: string }>();
      if (!r) return json({ error: 'Başvuru bulunamadı.' }, 404);
      await audit(user, 'Bilet bağlantısı yenilendi', r.name + ' / ' + r.event_title);
      return json({ ok: true, link: new URL('/bilet', request.url).href + '#' + raw });
    }
    if (data.action === 'event') {
      const parsed = eventSchema.safeParse(data.event);
      if (!parsed.success)
        return json({ error: 'Başlık, açıklama, tarih ve kontenjan alanlarını kontrol et.' }, 400);
      const e = parsed.data;
      e.date = new Date(e.date).toISOString();
      if (e.registrationOpen && new Date(e.date).getTime() <= Date.now())
        return json({ error: 'Geçmiş etkinliğin başvurularını açamazsın.' }, 400);
      if (!(await validImage(e.imageId)))
        return json({ error: 'Görsel bulunamadı. Yeniden yükle.' }, 400);
      const id = e.id || crypto.randomUUID(),
        now = Date.now();
      if (e.id) {
        const result = await db()
          .prepare(
            'UPDATE events SET title=?,description=?,details=?,category=?,date=?,location=?,capacity=?,question=?,image_id=?,image_alt=?,published=?,registration_open=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND (? IS NULL OR updated_at=?) AND (SELECT COUNT(*) FROM registrations WHERE event_id=?)<=?',
          )
          .bind(
            e.title,
            e.description,
            e.details,
            e.category,
            e.date,
            e.location,
            e.capacity,
            e.question,
            e.imageId,
            e.imageAlt,
            +e.published,
            +e.registrationOpen,
            now,
            id,
            e.updatedAt ?? null,
            e.updatedAt ?? null,
            id,
            e.capacity,
          )
          .run();
        if (!result.meta.changes)
          return json(
            {
              error:
                'Etkinlik değişmiş olabilir veya kontenjan mevcut başvuru sayısından küçük. Listeyi yenileyip kontrol et.',
            },
            409,
          );
      } else
        await db()
          .prepare(
            'INSERT INTO events (id,title,description,details,category,date,location,capacity,question,image_id,image_alt,published,registration_open,updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            id,
            e.title,
            e.description,
            e.details,
            e.category,
            e.date,
            e.location,
            e.capacity,
            e.question,
            e.imageId,
            e.imageAlt,
            +e.published,
            +e.registrationOpen,
            now,
            now,
          )
          .run();
      await audit(user, e.id ? 'Etkinlik güncellendi' : 'Etkinlik eklendi', e.title);
      return json({ ok: true, id });
    }
    if (data.action === 'member') {
      const parsed = memberSchema.safeParse(data.member);
      if (!parsed.success)
        return json({ error: 'Ad, görev, profil adresi ve bağlantıları kontrol et.' }, 400);
      const m = parsed.data;
      if (!(await validImage(m.photoId))) return json({ error: 'Fotoğraf bulunamadı.' }, 400);
      const id = m.id || crypto.randomUUID(),
        now = Date.now(),
        values = [
          m.name,
          m.slug,
          m.role,
          m.team,
          m.email,
          m.department,
          m.year,
          m.bio,
          m.photoId,
          m.photoAlt,
          JSON.stringify(m.links),
          JSON.stringify(m.skills),
          m.sortOrder,
          +m.published,
          now,
        ];
      if (m.id) {
        const result = await db()
          .prepare(
            'UPDATE members SET name=?,slug=?,role=?,team=?,email=?,department=?,year=?,bio=?,photo_id=?,photo_alt=?,links=?,skills=?,sort_order=?,published=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND (? IS NULL OR updated_at=?)',
          )
          .bind(...values, id, m.updatedAt ?? null, m.updatedAt ?? null)
          .run();
        if (!result.meta.changes)
          return json({ error: 'Profil değişmiş veya bulunamadı. Listeyi yenile.' }, 409);
      } else
        await db()
          .prepare(
            'INSERT INTO members (name,slug,role,team,email,department,year,bio,photo_id,photo_alt,links,skills,sort_order,published,updated_at,id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .bind(...values, id, now)
          .run();
      await audit(user, m.id ? 'Üye güncellendi' : 'Üye eklendi', m.name);
      return json({ ok: true, id });
    }
    if (data.action === 'archive') {
      if (
        !['events', 'members'].includes(data.table) ||
        typeof data.id !== 'string' ||
        typeof data.archived !== 'boolean'
      )
        return json({ error: 'Geçersiz işlem.' }, 400);
      const table = data.table === 'events' ? 'events' : 'members';
      const result = await db()
        .prepare(`UPDATE ${table} SET archived=?,updated_at=MAX(updated_at+1,?) WHERE id=?`)
        .bind(+data.archived, Date.now(), data.id)
        .run();
      if (!result.meta.changes) return json({ error: 'Kayıt bulunamadı.' }, 404);
      await audit(
        user,
        data.archived ? 'Arşive taşındı' : 'Arşivden çıkarıldı',
        table + ': ' + data.id,
      );
      return json({ ok: true });
    }
    if (data.action === 'settings') {
      const parsed = settingsSchema.safeParse(data.settings);
      if (!parsed.success)
        return json({ error: 'Metin uzunluklarını ve iletişim bilgilerini kontrol et.' }, 400);
      if (!(await validImage(parsed.data.heroImage)))
        return json({ error: 'Kapak görseli bulunamadı.' }, 400);
      if (data.version !== undefined && !Number.isSafeInteger(data.version))
        return json({ error: 'Geçersiz kayıt sürümü.' }, 400);
      const saved = await db()
        .prepare(
          "INSERT INTO settings (key,value,updated_at) SELECT 'site',?,? WHERE ? IS NULL OR ?=0 OR EXISTS(SELECT 1 FROM settings WHERE key='site') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=MAX(settings.updated_at+1,excluded.updated_at) WHERE ? IS NULL OR settings.updated_at=? RETURNING updated_at",
        )
        .bind(
          JSON.stringify(parsed.data),
          Date.now(),
          data.version ?? null,
          data.version ?? null,
          data.version ?? null,
          data.version ?? null,
        )
        .first();
      if (!saved)
        return json(
          { error: 'Ayarlar başka bir yönetici tarafından değişti. Yenileyip tekrar dene.' },
          409,
        );
      await audit(user, 'Site bilgileri güncellendi', 'Ana sayfa ve iletişim');
      return json({ ok: true });
    }
    if (user.role !== 'owner')
      return json({ error: 'Yalnızca site sahibi bu işlemi yapabilir.' }, 403);
    if (data.action === 'invite') {
      const parsed = z
        .object({
          email: z
            .string()
            .trim()
            .email()
            .max(180)
            .transform((v) => v.toLowerCase()),
          name: z.string().trim().min(2).max(80),
          role: z.enum(['editor', 'checkin']),
        })
        .safeParse(data);
      if (!parsed.success) return json({ error: 'Ad ve e-posta bilgilerini kontrol et.' }, 400);
      const p = parsed.data;
      if (await db().prepare('SELECT id FROM admin_users WHERE email=?').bind(p.email).first())
        return json({ error: 'Bu e-posta için zaten bir yönetici var.' }, 409);
      const raw = token(),
        now = Date.now();
      await db().batch([
        db()
          .prepare('UPDATE admin_invites SET used_at=? WHERE email=? AND used_at IS NULL')
          .bind(now, p.email),
        db()
          .prepare(
            'INSERT INTO admin_invites (id,token_hash,email,name,role,expires_at,created_at) VALUES (?,?,?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            await hash(raw),
            p.email,
            p.name,
            p.role,
            now + 72 * 3600000,
            now,
          ),
      ]);
      await audit(user, 'Yönetici daveti oluşturuldu', p.email);
      return json({ ok: true, link: new URL('/admin/giris', request.url).href + '#davet=' + raw });
    }
    if (data.action === 'cancel-invite') {
      if (typeof data.id !== 'string') return json({ error: 'Geçersiz davet.' }, 400);
      await db()
        .prepare('UPDATE admin_invites SET used_at=? WHERE id=?')
        .bind(Date.now(), data.id)
        .run();
      await audit(user, 'Davet iptal edildi', data.id);
      return json({ ok: true });
    }
    if (data.action === 'admin-status') {
      if (typeof data.id !== 'string' || typeof data.active !== 'boolean' || data.id === user.id)
        return json({ error: 'Kendi erişimini kapatamazsın.' }, 400);
      const result = await db()
        .prepare(
          "UPDATE admin_users SET active=?,auth_version=auth_version+1 WHERE id=? AND role!='owner'",
        )
        .bind(+data.active, data.id)
        .run();
      if (!result.meta.changes) return json({ error: 'Yönetici bulunamadı.' }, 404);
      if (!data.active)
        await db()
          .prepare(
            'DELETE FROM admin_sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM admin_users WHERE id=? AND active=0)',
          )
          .bind(data.id, data.id)
          .run();
      await audit(
        user,
        data.active ? 'Yönetici erişimi açıldı' : 'Yönetici erişimi kapatıldı',
        data.id,
      );
      return json({ ok: true });
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return json({ error: 'Bu profil adresi veya e-posta zaten kullanılıyor.' }, 409);
    return requestFailure(e, 'Kaydedilemedi. Bilgilerini kontrol edip tekrar dene.');
  }
}
