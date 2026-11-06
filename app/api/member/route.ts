import { getOperations } from '../../operations';
import { z } from 'zod';
import {
  db,
  body,
  json,
  rate,
  rateKey,
  requestFailure,
  sameOrigin,
  token,
  hash,
} from '../../server';
import {
  getMember,
  memberLogin,
  memberLogout,
  recoveryCode,
  normalizeRecovery,
} from '../../member-auth';
import { passwordValid, passwordHash, verifyPassword } from '../../admin-auth';
import { regularStyles } from '../../membership-model';
export const dynamic = 'force-dynamic';
const emailSchema = z
  .string()
  .trim()
  .email()
  .max(180)
  .transform((v) => v.toLowerCase());
const signupSchema = z
  .object({
    action: z.literal('signup'),
    name: z.string().trim().min(2).max(80),
    email: emailSchema,
    password: z.string(),
    department: z.string().trim().max(100).default(''),
    style: z.enum(regularStyles).default('forest'),
    consent: z.literal(true),
    website: z.literal('').default(''),
  })
  .strict();
const dummy = '$2b$12$y2IWXJjEZpx2El65WPmXIeQMIpMnrHus48E2xB0lh7eVLCYI7F6Ka';
export async function GET() {
  return json({ user: await getMember() });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  try {
    const d = await body(request);
    if (d.action === 'logout') return memberLogout(request);
    if (d.action === 'signup') {
      const ops = (await getOperations()).settings;
      if (!ops.signupOpen) return json({ error: ops.closedMessage }, 503);
      if (!(await rate(request, 'member-signup', 8)))
        return json({ error: 'Biraz ara verip tekrar deneyebilirsin.' }, 429);
      const p = signupSchema.safeParse(d);
      if (!p.success) return json({ error: 'Ad, e-posta ve üyelik onayını kontrol et.' }, 400);
      const v = p.data;
      if (!passwordValid(v.password))
        return json({ error: 'Şifren en az 12 karakter, en fazla 72 bayt olmalı.' }, 400);
      const id = crypto.randomUUID(),
        now = Date.now(),
        recovery = recoveryCode();
      const created = await db()
        .prepare(
          "INSERT INTO club_accounts (id,email,name,password_hash,department,club_role,card_style,member_no,card_code,recovery_hash,active,created_at,updated_at) SELECT ?,?,?,?,?,'member',?,?,?,?,1,?,? WHERE COALESCE((SELECT json_extract(value,'$.signupOpen') FROM settings WHERE key='operations'),1)=1",
        )
        .bind(
          id,
          v.email,
          v.name,
          await passwordHash(v.password),
          v.department,
          v.style,
          'BMK-' +
            new Date(now).getFullYear().toString().slice(2) +
            '-' +
            token().slice(0, 8).toUpperCase(),
          token().slice(0, 32),
          await hash(normalizeRecovery(recovery)),
          now,
          now,
        )
        .run();
      if (!created.meta.changes) return json({ error: ops.closedMessage }, 503);
      return memberLogin(request, id, { recoveryCode: recovery, created: true });
    }
    if (d.action === 'login') {
      if (!(await rate(request, 'member-login', 20)))
        return json({ error: 'Çok fazla giriş denemesi. Biraz sonra tekrar dene.' }, 429);
      const p = emailSchema.safeParse(d.email);
      if (
        !p.success ||
        typeof d.password !== 'string' ||
        new TextEncoder().encode(d.password).length > 72
      )
        return json({ error: 'E-posta veya şifre hatalı.' }, 401);
      if (!(await rateKey('member-login-account', p.data, 40)))
        return json({ error: 'Çok fazla giriş denemesi. Biraz sonra tekrar dene.' }, 429);
      const row = await db()
        .prepare('SELECT id,password_hash,active,auth_version FROM club_accounts WHERE email=?')
        .bind(p.data)
        .first<{ id: string; password_hash: string; active: number; auth_version: number }>();
      const valid = await verifyPassword(d.password, row?.password_hash || dummy);
      if (!row || !valid || !row.active)
        return json(
          { error: 'E-posta veya şifre hatalı; hesabın erişimi de kapatılmış olabilir.' },
          401,
        );
      return memberLogin(request, row.id, {}, row.auth_version);
    }
    if (d.action === 'recover') {
      if (!(await rate(request, 'member-recover', 8)))
        return json({ error: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, 429);
      if (!passwordValid(d.password))
        return json({ error: 'Yeni şifren en az 12 karakter, en fazla 72 bayt olmalı.' }, 400);
      const now = Date.now(),
        reset =
          typeof d.token === 'string' && /^[a-f0-9]{48}$/.test(d.token) ? await hash(d.token) : '',
        p = emailSchema.safeParse(d.email);
      const recovery =
        typeof d.code === 'string' && /^[a-fA-F0-9\s-]{32,50}$/.test(d.code)
          ? await hash(normalizeRecovery(d.code))
          : '';
      if (!reset && (!p.success || !recovery))
        return json({ error: 'Kurtarma bilgileri geçersiz veya süresi dolmuş.' }, 400);
      const newRecovery = recoveryCode(),
        password = await passwordHash(d.password),
        completedAt = Date.now();
      // The compare-and-swap consumes either recovery method exactly once, even concurrently.
      const result = await db()
        .prepare(
          "UPDATE club_accounts SET auth_version=auth_version+1,password_hash=?,recovery_hash=?,reset_hash=NULL,reset_expires=NULL,updated_at=MAX(updated_at+1,?) WHERE active=1 AND ((?!='' AND reset_hash=? AND reset_expires>?) OR (?!='' AND email=? AND recovery_hash=?)) RETURNING id,auth_version",
        )
        .bind(
          password,
          await hash(normalizeRecovery(newRecovery)),
          completedAt,
          reset,
          reset,
          completedAt,
          recovery,
          p.success ? p.data : '',
          recovery,
        )
        .first<{ id: string; auth_version: number }>();
      if (!result) return json({ error: 'Kurtarma bilgileri geçersiz veya süresi dolmuş.' }, 400);
      await db()
        .prepare('DELETE FROM club_sessions WHERE user_id=? AND auth_version<?')
        .bind(result.id, result.auth_version)
        .run();
      return memberLogin(request, result.id, { recoveryCode: newRecovery }, result.auth_version);
    }
    const user = await getMember();
    if (!user) return json({ error: 'Üye girişi gerekiyor.' }, 401);
    if (!(await rate(request, 'member-edit', 40)))
      return json({ error: 'Çok fazla işlem. Biraz sonra tekrar dene.' }, 429);
    if (d.action === 'style') {
      const parsed = z
        .object({ action: z.literal('style'), style: z.enum(regularStyles) })
        .strict()
        .safeParse(d);
      if (!parsed.success) return json({ error: 'Bu kart tasarımı seçilemiyor.' }, 400);
      if (user.club_role !== 'member')
        return json({ error: 'Görevine ait kart tasarımı otomatik atanır.' }, 403);
      const result = await db()
        .prepare(
          "UPDATE club_accounts SET card_style=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND club_role='member' AND active=1",
        )
        .bind(parsed.data.style, Date.now(), user.id)
        .run();
      if (!result.meta.changes)
        return json({ error: 'Üyelik durumun değişti. Sayfayı yenile.' }, 409);
      return json({ ok: true });
    }
    if (d.action === 'profile') {
      const p = z
        .object({
          action: z.literal('profile'),
          name: z.string().trim().min(2).max(80),
          department: z.string().trim().max(100),
        })
        .strict()
        .safeParse(d);
      if (!p.success) return json({ error: 'Ad ve bölüm bilgilerini kontrol et.' }, 400);
      await db()
        .prepare(
          'UPDATE club_accounts SET name=?,department=?,updated_at=MAX(updated_at+1,?) WHERE id=?',
        )
        .bind(p.data.name, p.data.department, Date.now(), user.id)
        .run();
      return json({ ok: true });
    }
    if (d.action === 'password') {
      if (!(await rate(request, 'member-password', 6)))
        return json({ error: 'Biraz sonra tekrar dene.' }, 429);
      if (
        typeof d.current !== 'string' ||
        new TextEncoder().encode(d.current).length > 72 ||
        !passwordValid(d.password)
      )
        return json(
          { error: 'Şifre alanlarını kontrol et. Yeni şifre en az 12 karakter olmalı.' },
          400,
        );
      const row = await db()
        .prepare('SELECT password_hash,auth_version FROM club_accounts WHERE id=?')
        .bind(user.id)
        .first<{ password_hash: string; auth_version: number }>();
      if (!row || !(await verifyPassword(d.current, row.password_hash)))
        return json({ error: 'Mevcut şifre hatalı.' }, 400);
      const changed = await db()
        .prepare(
          'UPDATE club_accounts SET password_hash=?,auth_version=auth_version+1,reset_hash=NULL,reset_expires=NULL,updated_at=MAX(updated_at+1,?) WHERE id=? AND active=1 AND auth_version=? RETURNING auth_version',
        )
        .bind(await passwordHash(d.password), Date.now(), user.id, row.auth_version)
        .first<{ auth_version: number }>();
      if (!changed) return json({ error: 'Hesap değişti. Yeniden giriş yap.' }, 409);
      await db()
        .prepare('DELETE FROM club_sessions WHERE user_id=? AND auth_version<?')
        .bind(user.id, changed.auth_version)
        .run();
      return memberLogin(request, user.id, {}, changed.auth_version);
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    if (String(e).includes('club_accounts.email'))
      return json(
        { error: 'Bu e-posta kayıtlı. Giriş yapabilir veya hesabını kurtarabilirsin.' },
        409,
      );
    return requestFailure(e, 'İşlem tamamlanamadı. Bilgilerini kontrol edip tekrar dene.');
  }
}
