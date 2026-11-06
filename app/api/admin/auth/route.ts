import { z } from 'zod';
import { db, json, sameOrigin, body, rate, rateKey, requestFailure, hash } from '../../../server';
import {
  getAdmin,
  siteOwner,
  passwordValid,
  passwordHash,
  verifyPassword,
  loginResponse,
  logoutResponse,
  audit,
  AdminUser,
} from '../../../admin-auth';
export const dynamic = 'force-dynamic';
const account = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(180)
    .transform((s) => s.toLowerCase()),
  name: z.string().trim().min(2).max(80),
  password: z
    .string()
    .refine(passwordValid, 'Şifre en az 12 karakter olmalı; UTF-8 uzunluğu 72 baytı geçmemeli.'),
});
export async function GET() {
  const count = await db().prepare('SELECT COUNT(*) AS n FROM admin_users').first<{ n: number }>();
  const owner = await siteOwner();
  return json({
    user: await getAdmin(),
    initialized: !!count?.n,
    canSetup: !!owner && !count?.n,
    canRecover: !!owner && !!count?.n,
    ownerEmail: !count?.n ? owner?.email || null : null,
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  try {
    const data = await body(request);
    if (data.action === 'logout') return logoutResponse(request);
    if (data.action === 'login') {
      if (!(await rate(request, 'admin-login', 15)))
        return json({ error: 'Çok fazla giriş denemesi. 10 dakika sonra tekrar deneyin.' }, 429);
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
      if (
        typeof data.password !== 'string' ||
        new TextEncoder().encode(data.password).length > 72 ||
        !email ||
        email.length > 180
      )
        return json({ error: 'E-posta veya şifre hatalı.' }, 401);
      if (!(await rateKey('admin-login-account', email, 30)))
        return json({ error: 'Çok fazla giriş denemesi. Biraz sonra tekrar dene.' }, 429);
      const user = await db()
        .prepare('SELECT * FROM admin_users WHERE email=? AND active=1')
        .bind(email)
        .first<AdminUser & { password_hash: string }>();
      // A fixed dummy bcrypt hash keeps missing-account checks on the same password-verification path.
      const valid = await verifyPassword(
        data.password,
        user?.password_hash || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5h9SuG5xgqrDLs9VkDqCkY2w4uVVs8.',
      );
      if (!user || !valid) return json({ error: 'E-posta veya şifre hatalı.' }, 401);
      await audit(user, 'Oturum açıldı', 'Yönetim paneli');
      return loginResponse(
        request,
        { id: user.id, name: user.name, email: user.email, role: user.role },
        user.auth_version,
      );
    }
    if (data.action === 'invite-info') {
      if (!(await rate(request, 'invite-info', 30)))
        return json({ error: 'Lütfen daha sonra tekrar dene.' }, 429);
      if (typeof data.token !== 'string' || !/^[a-f0-9]{48}$/.test(data.token))
        return json({ error: 'Davet geçersiz.' }, 400);
      const invite = await db()
        .prepare(
          'SELECT name,email,role FROM admin_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?',
        )
        .bind(await hash(data.token), Date.now())
        .first();
      return invite
        ? json({ invite })
        : json({ error: 'Davet kullanılmış veya süresi dolmuş.' }, 404);
    }
    if (data.action === 'recover') {
      if (!(await siteOwner()))
        return json({ error: 'Hesap kurtarma yalnızca doğrulanmış site sahibine açık.' }, 403);
      if (!(await rate(request, 'admin-recover', 5)))
        return json({ error: 'Lütfen daha sonra tekrar dene.' }, 429);
      if (!passwordValid(data.password))
        return json({ error: 'En az 12 karakterlik bir şifre seç.' }, 400);
      const user = await db()
        .prepare(
          "SELECT id,name,email,role,auth_version FROM admin_users WHERE role='owner' AND active=1",
        )
        .first<AdminUser>();
      if (!user) return json({ error: 'Hesap bulunamadı.' }, 404);
      const changed = await db()
        .prepare(
          'UPDATE admin_users SET password_hash=?,auth_version=auth_version+1 WHERE id=? AND auth_version=? RETURNING auth_version',
        )
        .bind(await passwordHash(data.password), user.id, user.auth_version)
        .first<{ auth_version: number }>();
      if (!changed) return json({ error: 'Hesap değişti. Yeniden dene.' }, 409);
      await db()
        .prepare('DELETE FROM admin_sessions WHERE user_id=? AND auth_version<?')
        .bind(user.id, changed.auth_version)
        .run();
      await audit(user, 'Site sahibi hesabını kurtardı', 'Tüm eski oturumlar kapatıldı');
      return loginResponse(request, user, changed.auth_version);
    }
    if (data.action === 'setup') {
      const owner = await siteOwner();
      if (!owner)
        return json({ error: 'İlk yönetici hesabını yalnızca site sahibi oluşturabilir.' }, 403);
      if (!(await rate(request, 'admin-setup', 5)))
        return json({ error: 'Lütfen daha sonra tekrar deneyin.' }, 429);
      const p = account.safeParse(data);
      if (!p.success)
        return json({ error: p.error.issues[0]?.message || 'Bilgileri kontrol edin.' }, 400);
      const a = p.data;
      const result = await db()
        .prepare(
          'INSERT INTO admin_users (id,email,name,password_hash,role,active,created_at) SELECT ?,?,?,?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM admin_users)',
        )
        .bind('owner', a.email, a.name, await passwordHash(a.password), 'owner', Date.now())
        .run();
      if (!result.meta.changes)
        return json({ error: 'İlk yönetici hesabı zaten oluşturulmuş.' }, 409);
      return loginResponse(request, { id: 'owner', email: a.email, name: a.name, role: 'owner' });
    }
    if (data.action === 'accept-invite') {
      if (!(await rate(request, 'admin-invite', 10)))
        return json({ error: 'Lütfen daha sonra tekrar deneyin.' }, 429);
      if (
        typeof data.token !== 'string' ||
        !/^[a-f0-9]{48}$/.test(data.token) ||
        !passwordValid(data.password)
      )
        return json(
          { error: 'Davet bağlantısını ve en az 12 karakterlik şifrenizi kontrol edin.' },
          400,
        );
      const h = await hash(data.token);
      const invite = await db()
        .prepare(
          'SELECT * FROM admin_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?',
        )
        .bind(h, Date.now())
        .first<{ id: string; email: string; name: string; role: AdminUser['role'] }>();
      if (!invite) return json({ error: 'Davet bağlantısı geçersiz veya süresi dolmuş.' }, 400);
      const id = crypto.randomUUID(),
        password = await passwordHash(data.password),
        now = Date.now();
      const results = await db().batch([
        db()
          .prepare(
            'INSERT INTO admin_users (id,email,name,password_hash,role,active,created_at) SELECT ?,?,?,?,?,1,? WHERE EXISTS (SELECT 1 FROM admin_invites WHERE id=? AND used_at IS NULL AND expires_at>?)',
          )
          .bind(id, invite.email, invite.name, password, invite.role, now, invite.id, now),
        db()
          .prepare(
            'UPDATE admin_invites SET used_at=? WHERE id=? AND EXISTS (SELECT 1 FROM admin_users WHERE id=?)',
          )
          .bind(now, invite.id, id),
      ]);
      if (!results[0].meta.changes) return json({ error: 'Bu davet kullanılmış.' }, 409);
      return loginResponse(request, {
        id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
      });
    }
    if (data.action === 'password') {
      const user = await getAdmin();
      if (!user) return json({ error: 'Giriş yapmanız gerekiyor.' }, 401);
      if (!(await rate(request, 'password-change', 6)))
        return json({ error: 'Lütfen daha sonra tekrar deneyin.' }, 429);
      const old = await db()
        .prepare('SELECT password_hash,auth_version FROM admin_users WHERE id=?')
        .bind(user.id)
        .first<{ password_hash: string; auth_version: number }>();
      if (
        typeof data.current !== 'string' ||
        new TextEncoder().encode(data.current).length > 72 ||
        !old ||
        !(await verifyPassword(data.current, old.password_hash))
      )
        return json({ error: 'Mevcut şifre hatalı.' }, 400);
      if (!passwordValid(data.password))
        return json(
          { error: 'Yeni şifre en az 12 karakter olmalı; UTF-8 uzunluğu 72 baytı geçmemeli.' },
          400,
        );
      const changed = await db()
        .prepare(
          'UPDATE admin_users SET password_hash=?,auth_version=auth_version+1 WHERE id=? AND active=1 AND auth_version=? RETURNING auth_version',
        )
        .bind(await passwordHash(data.password), user.id, old.auth_version)
        .first<{ auth_version: number }>();
      if (!changed) return json({ error: 'Hesap değişti. Yeniden giriş yap.' }, 409);
      await db()
        .prepare('DELETE FROM admin_sessions WHERE user_id=? AND auth_version<?')
        .bind(user.id, changed.auth_version)
        .run();
      await audit(user, 'Şifre değiştirildi', 'Hesap');
      return loginResponse(request, user, changed.auth_version);
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return json({ error: 'Bu hesap veya davet daha önce kullanılmış.' }, 409);
    return requestFailure(e, 'Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.');
  }
}
