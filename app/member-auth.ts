import { getOperations } from './operations';
import { cookies } from 'next/headers';
import { db, hash, token, json } from './server';
import type { ClubAccount } from './membership-model';
export const accountColumns =
  'id,name,email,department,club_role,card_style,member_no,card_code,active,created_at,updated_at';
const COOKIE = 'bmk_member';
export async function getMember(): Promise<ClubAccount | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !/^[a-f0-9]{48}$/.test(raw)) return null;
  return db()
    .prepare(
      `SELECT ${accountColumns
        .split(',')
        .map((c) => 'u.' + c)
        .join(
          ',',
        )} FROM club_sessions s JOIN club_accounts u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 AND s.auth_version=u.auth_version`,
    )
    .bind(await hash(raw), Date.now())
    .first<ClubAccount>();
}
function cookie(request: Request, value: string, age: number) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function memberLogin(
  request: Request,
  id: string,
  extra: Record<string, unknown> = {},
  expectedVersion = 0,
) {
  const LIFETIME = (await getOperations()).settings.memberSessionDays * 86400000;
  const raw = token(),
    now = Date.now(),
    old = (await cookies()).get(COOKIE)?.value;
  const saved = await db().batch([
    db()
      .prepare('DELETE FROM club_sessions WHERE expires_at<=? OR token_hash=?')
      .bind(now, old ? await hash(old) : ''),
    db()
      .prepare(
        'INSERT INTO club_sessions (token_hash,user_id,expires_at,created_at,auth_version) SELECT ?,id,?,?,auth_version FROM club_accounts WHERE id=? AND active=1 AND auth_version=?',
      )
      .bind(await hash(raw), now + LIFETIME, now, id, expectedVersion),
  ]);
  if (!saved[1].meta.changes)
    return json({ error: 'Hesap bilgilerin değişti. Yeniden giriş yap.' }, 409);
  const user = await db()
    .prepare(
      `SELECT ${accountColumns} FROM club_accounts WHERE id=? AND active=1 AND auth_version=?`,
    )
    .bind(id, expectedVersion)
    .first<ClubAccount>();
  if (!user) return json({ error: 'Hesabın erişimi değişti. Yeniden giriş yap.' }, 409);
  const r = json({ ok: true, user, ...extra });
  r.headers.set('Set-Cookie', cookie(request, raw, LIFETIME / 1000));
  return r;
}
export async function memberLogout(request: Request) {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (raw)
    await db()
      .prepare('DELETE FROM club_sessions WHERE token_hash=?')
      .bind(await hash(raw))
      .run();
  const r = json({ ok: true });
  r.headers.set('Set-Cookie', cookie(request, '', 0));
  return r;
}
export function recoveryCode() {
  return token().slice(0, 32).toUpperCase().match(/.{4}/g)!.join('-');
}
export function normalizeRecovery(value: string) {
  return value.replace(/[-\s]/g, '').toUpperCase();
}
