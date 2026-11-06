import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { db, json, body, sameOrigin, rate, requestFailure } from '../../../server';
import { getAdmin, audit, loginResponse } from '../../../admin-auth';
import { getOperations } from '../../../operations';
import { operationsSchema } from '../../../operations-model';
import { recoveryMailConfigured } from '../../../recovery-mail';
export const dynamic = 'force-dynamic';
const exports: Record<string, string> = {
  events:
    'id,title,description,category,date,location,capacity,published,question,details,image_id,image_alt,registration_open,archived,created_at,updated_at',
  members:
    'id,name,slug,role,team,email,department,year,bio,photo_id,photo_alt,links,skills,published,archived,sort_order,created_at,updated_at',
  club_accounts:
    'id,name,email,department,club_role,card_style,member_no,active,created_at,updated_at',
  registrations:
    'id,event_id,event_title,event_date,event_location,name,email,department,year,answer,created_at,checked_in_at',
  media: 'id,name,type,size,archived,created_at',
  audit_log: 'id,actor_name,action,target,created_at',
};
export async function GET(request: Request) {
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (user.role !== 'owner') return json({ error: 'Bu bölüm yalnızca site sahibine açık.' }, 403);
  try {
    const q = new URL(request.url).searchParams,
      section = q.get('section') || 'status',
      page = Math.max(1, Math.min(10000, Math.floor(Number(q.get('page')) || 1)));
    if (section === 'export') {
      const collection = q.get('collection') || '';
      if (!Object.hasOwn(exports, collection)) return json({ error: 'Geçersiz veri grubu.' }, 400);
      if (!(await rate(request, 'admin-export', 30)))
        return json({ error: 'Biraz sonra tekrar dene.' }, 429);
      const results = await db().batch([
        db()
          .prepare(
            `SELECT ${exports[collection]} FROM ${collection} ORDER BY id LIMIT 500 OFFSET ?`,
          )
          .bind((page - 1) * 500),
        db().prepare(`SELECT COUNT(*) AS n FROM ${collection}`),
      ]);
      await audit(user, 'Veriler dışa aktarıldı', collection + ' / sayfa ' + page);
      const response = json({
        format: 'bmk-data-v1',
        collection,
        page,
        pageSize: 500,
        total: (results[1].results[0] as { n: number }).n,
        exportedAt: new Date().toISOString(),
        items: results[0].results,
      });
      response.headers.set(
        'Content-Disposition',
        `attachment; filename="bmk-${collection}-${page}.json"`,
      );
      return response;
    }
    if (section === 'scores') {
      const day =
        q.get('day') || new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: 'Tarih geçersiz.' }, 400);
      const results = await db().batch([
        db()
          .prepare(
            'SELECT id,nickname,score,day,version,hidden,created_at FROM game_scores WHERE day=? ORDER BY score DESC,id LIMIT 30 OFFSET ?',
          )
          .bind(day, (page - 1) * 30),
        db().prepare('SELECT COUNT(*) AS n FROM game_scores WHERE day=?').bind(day),
      ]);
      return json({
        items: results[0].results,
        total: (results[1].results[0] as { n: number }).n,
        page,
        day,
      });
    }
    const began = performance.now();
    let database = false,
      storage = false;
    try {
      database = !!(await db().prepare('SELECT 1 AS ok').first());
    } catch {}
    const databaseMs = Math.round(performance.now() - began);
    try {
      if (env.BUCKET) {
        await env.BUCKET.list({ limit: 1 });
        storage = true;
      }
    } catch {}
    if (!database)
      return json({ error: 'Veritabanı kontrolü başarısız.', database: false, storage }, 503);
    const now = Date.now(),
      results = await db().batch([
        db()
          .prepare(
            'SELECT u.id,u.name,u.email,u.role,COUNT(s.token_hash) AS sessions,MAX(s.created_at) AS lastLogin FROM admin_users u LEFT JOIN admin_sessions s ON s.user_id=u.id AND s.expires_at>? AND s.auth_version=u.auth_version WHERE u.active=1 GROUP BY u.id ORDER BY u.created_at',
          )
          .bind(now),
        db()
          .prepare(
            'SELECT COUNT(*) AS n FROM club_sessions s JOIN club_accounts u ON u.id=s.user_id AND u.active=1 AND u.auth_version=s.auth_version WHERE s.expires_at>?',
          )
          .bind(now),
        db().prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE expires_at<=?').bind(now),
      ]);
    return json({
      ...(await getOperations()),
      health: { database, storage, databaseMs, email: recoveryMailConfigured(), checkedAt: now },
      admins: results[0].results,
      memberSessions: (results[1].results[0] as { n: number }).n,
      expiredLimits: (results[2].results[0] as { n: number }).n,
    });
  } catch (e) {
    return requestFailure(e, 'Sistem bilgileri alınamadı.');
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (user.role !== 'owner') return json({ error: 'Bu işlem yalnızca site sahibine açık.' }, 403);
  try {
    if (!(await rate(request, 'admin-operations', 60)))
      return json({ error: 'Çok fazla işlem.' }, 429);
    const d = await body(request);
    if (d.action === 'settings') {
      const parsed = operationsSchema.safeParse(d.settings);
      if (!parsed.success || !Number.isSafeInteger(d.version))
        return json(
          { error: 'Ayarları kontrol et. Oturum ve dosya sınırları güvenli aralıkta olmalı.' },
          400,
        );
      const saved = await db()
        .prepare(
          "INSERT INTO settings (key,value,updated_at) SELECT 'operations',?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM settings WHERE key='operations') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=MAX(settings.updated_at+1,excluded.updated_at) WHERE settings.updated_at=? RETURNING updated_at",
        )
        .bind(JSON.stringify(parsed.data), Date.now(), d.version, d.version)
        .first();
      if (!saved)
        return json(
          { error: 'Ayarlar başka bir yönetici tarafından değişti. Yenileyip tekrar dene.' },
          409,
        );
      await audit(
        user,
        'İşletim ayarları güncellendi',
        'Kayıtlar, oyun, oturumlar ve dosya sınırı',
      );
      return json({ ok: true });
    }
    if (d.action === 'admin-role') {
      const p = z
        .object({ id: z.string().min(1).max(80), role: z.enum(['editor', 'checkin']) })
        .safeParse(d);
      if (!p.success) return json({ error: 'Yönetici ve yetkiyi kontrol et.' }, 400);
      const changed = await db()
        .prepare(
          "UPDATE admin_users SET role=?,auth_version=auth_version+1 WHERE id=? AND role!='owner' RETURNING name",
        )
        .bind(p.data.role, p.data.id)
        .first<{ name: string }>();
      if (!changed) return json({ error: 'Bu yöneticinin yetkisi değiştirilemez.' }, 409);
      await audit(user, 'Yönetici yetkisi değiştirildi', changed.name + ' / ' + p.data.role);
      return json({ ok: true });
    }
    if (d.action === 'revoke-admin') {
      if (typeof d.id !== 'string' || d.id.length > 80)
        return json({ error: 'Geçersiz yönetici.' }, 400);
      const changed = await db()
        .prepare(
          'UPDATE admin_users SET auth_version=auth_version+1 WHERE id=? AND active=1 RETURNING auth_version,name',
        )
        .bind(d.id)
        .first<{ auth_version: number; name: string }>();
      if (!changed) return json({ error: 'Yönetici bulunamadı.' }, 404);
      await db()
        .prepare('DELETE FROM admin_sessions WHERE user_id=? AND auth_version<?')
        .bind(d.id, changed.auth_version)
        .run();
      await audit(user, 'Yönetici oturumları kapatıldı', changed.name);
      return d.id === user.id
        ? loginResponse(request, user, changed.auth_version)
        : json({ ok: true });
    }
    if (d.action === 'score-visibility') {
      const p = z.object({ id: z.string().uuid(), hidden: z.boolean() }).safeParse(d);
      if (!p.success) return json({ error: 'Skor bilgisi geçersiz.' }, 400);
      const row = await db()
        .prepare('UPDATE game_scores SET hidden=? WHERE id=? RETURNING nickname')
        .bind(+p.data.hidden, p.data.id)
        .first<{ nickname: string }>();
      if (!row) return json({ error: 'Skor bulunamadı.' }, 404);
      await audit(user, p.data.hidden ? 'Skor gizlendi' : 'Skor yeniden gösterildi', row.nickname);
      return json({ ok: true });
    }
    if (d.action === 'cleanup') {
      // Bounded maintenance; never delete member, registration, score, content or audit history.
      const now = Date.now(),
        statements = [
          ['rate_limits', 'key', 'expires_at'],
          ['admin_sessions', 'token_hash', 'expires_at'],
          ['club_sessions', 'token_hash', 'expires_at'],
          ['game_runs', 'id', 'expires_at'],
          ['admin_invites', 'id', 'expires_at'],
        ] as const;
      const results = await db().batch(
        statements.map(([table, key, expiry]) =>
          db()
            .prepare(
              `DELETE FROM ${table} WHERE ${key} IN (SELECT ${key} FROM ${table} WHERE ${expiry}<=? LIMIT 1000)`,
            )
            .bind(now),
        ),
      );
      await db()
        .prepare(
          'DELETE FROM club_password_resets WHERE challenge_hash IN (SELECT challenge_hash FROM club_password_resets WHERE expires_at<=? AND (verified_expires_at IS NULL OR verified_expires_at<=?) LIMIT 1000)',
        )
        .bind(now, now)
        .run();
      await audit(user, 'Süresi dolan geçici kayıtlar temizlendi', 'En fazla 1.000 kayıt / grup');
      return json({ ok: true, removed: results.reduce((n, r) => n + r.meta.changes, 0) });
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    return requestFailure(e);
  }
}
