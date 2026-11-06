import { getOperations } from './operations';
import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import bcrypt from 'bcryptjs';
import { db, hash, token, json } from './server';
import { getChatGPTUser } from './chatgpt-auth';
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'checkin';
  auth_version?: number;
};
const COOKIE = 'bmk_admin';
export async function siteOwner() {
  const user = await getChatGPTUser();
  const email = env.BMK_ADMIN_EMAIL?.trim().toLowerCase();
  return user && email && user.email.toLowerCase() === email ? user : null;
}
export async function getAdmin(): Promise<AdminUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !/^[a-f0-9]{48}$/.test(raw)) return null;
  return db()
    .prepare(
      'SELECT u.id,u.name,u.email,u.role,u.auth_version FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 AND s.auth_version=u.auth_version',
    )
    .bind(await hash(raw), Date.now())
    .first<AdminUser>();
}
export function canEdit(user: AdminUser) {
  return user.role === 'owner' || user.role === 'editor';
}
export function passwordValid(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 12 &&
    password.length <= 72 &&
    new TextEncoder().encode(password).length <= 72
  );
}
export async function passwordHash(password: string) {
  return bcrypt.hash(password, 12);
}
export async function verifyPassword(password: string, stored: string) {
  return bcrypt.compare(password, stored);
}
function cookie(request: Request, value: string, age: number) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function loginResponse(request: Request, user: AdminUser, expectedVersion = 0) {
  const LIFETIME = (await getOperations()).settings.adminSessionHours * 3600000;
  const raw = token(),
    now = Date.now(),
    previous = (await cookies()).get(COOKIE)?.value;
  const saved = await db().batch([
    db()
      .prepare('DELETE FROM admin_sessions WHERE expires_at<=? OR token_hash=?')
      .bind(now, previous ? await hash(previous) : ''),
    db()
      .prepare(
        'INSERT INTO admin_sessions (token_hash,user_id,expires_at,created_at,auth_version) SELECT ?,id,?,?,auth_version FROM admin_users WHERE id=? AND active=1 AND auth_version=?',
      )
      .bind(await hash(raw), now + LIFETIME, now, user.id, expectedVersion),
  ]);
  if (!saved[1].meta.changes)
    return json({ error: 'Hesap bilgilerin değişti. Yeniden giriş yap.' }, 409);
  const response = json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
  response.headers.set('Set-Cookie', cookie(request, raw, LIFETIME / 1000));
  return response;
}
export async function logoutResponse(request: Request) {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw)
    await db()
      .prepare('DELETE FROM admin_sessions WHERE token_hash=?')
      .bind(await hash(raw))
      .run();
  const response = json({ ok: true });
  response.headers.set('Set-Cookie', cookie(request, '', 0));
  return response;
}
export async function audit(user: AdminUser, action: string, target: string) {
  await db()
    .prepare(
      'INSERT INTO audit_log (id,actor_id,actor_name,action,target,created_at) VALUES (?,?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), user.id, user.name, action, target.slice(0, 200), Date.now())
    .run();
}
