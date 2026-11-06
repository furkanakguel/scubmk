import { waitUntil } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db, body, json, rate, sameOrigin, token, hash, requestFailure } from '../../../server';
import { passwordHash, passwordValid } from '../../../admin-auth';
import { recoveryCode, normalizeRecovery } from '../../../member-auth';
import {
  recoveryMailConfigured,
  sendRecoveryCode,
  sendPasswordChanged,
} from '../../../recovery-mail';
export const dynamic = 'force-dynamic';
const COOKIE = 'bmk_recovery',
  LIFETIME = 10 * 60000,
  MAX_ATTEMPTS = 5;
const nonce = z.string().regex(/^[a-f0-9]{48}$/);
const requestSchema = z
  .object({
    action: z.literal('request'),
    email: z
      .string()
      .trim()
      .email()
      .max(180)
      .transform((v) => v.toLowerCase()),
  })
  .strict();
const verifySchema = z
  .object({ action: z.literal('verify'), challenge: nonce, code: z.string().regex(/^\d{6}$/) })
  .strict();
const resetSchema = z.object({ action: z.literal('reset'), password: z.string() }).strict();
const invalid =
  'Kod hatalı, kullanılmış veya süresi dolmuş. Kontrol edip tekrar dene; gerekirse yeni kod iste.';
function recoveryCookie(request: Request, value = '', seconds = 0) {
  return `${COOKIE}=${value}; Path=/api/member/recovery; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
function clearSession(request: Request) {
  return `bmk_member=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
function randomCode() {
  const limit = Math.floor(0x100000000 / 1000000) * 1000000,
    a = new Uint32Array(1);
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limit);
  return (a[0] % 1000000).toString().padStart(6, '0');
}
async function emailCooldown(email: string, now: number) {
  const row = await db()
    .prepare(
      'INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count,expires_at',
    )
    .bind('recovery-cooldown:' + (await hash(email)), now + 60000, now, now, now + 60000)
    .first<{ count: number; expires_at: number }>();
  return row && row.count <= 1
    ? 0
    : Math.max(1, Math.ceil(((row?.expires_at || now + 60000) - now) / 1000));
}
export async function GET() {
  return json({ emailAvailable: recoveryMailConfigured() });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  try {
    const input = await body(request),
      now = Date.now();
    if (input.action === 'request') {
      const parsed = requestSchema.safeParse(input);
      if (!parsed.success) return json({ error: 'Geçerli bir e-posta adresi yaz.' }, 400);
      if (!recoveryMailConfigured())
        return json(
          {
            error:
              'E-posta ile şifre yenileme henüz etkin değil. Kurtarma kodunu kullanabilir veya kulüp yönetimine ulaşabilirsin.',
            code: 'email_unavailable',
          },
          503,
        );
      if (!(await rate(request, 'recovery-request', 20)))
        return json({ error: 'Çok fazla kod istendi. Biraz sonra tekrar dene.' }, 429);
      const email = parsed.data.email,
        cooldown = await emailCooldown(email, now);
      if (cooldown) {
        const response = json(
          { error: 'Yeni kod istemeden önce kısa bir süre bekle.', retryAfter: cooldown },
          429,
        );
        response.headers.set('Retry-After', String(cooldown));
        return response;
      }
      if (
        !(await rate(
          new Request(request.url, { headers: { 'cf-connecting-ip': email } }),
          'recovery-email',
          5,
        ))
      )
        return json(
          { error: 'Bu adres için çok fazla kod istendi. Biraz sonra tekrar dene.' },
          429,
        );
      const user = await db()
        .prepare('SELECT id,password_hash FROM club_accounts WHERE email=? AND active=1')
        .bind(email)
        .first<{ id: string; password_hash: string }>();
      const challenge = token(),
        challengeHash = await hash(challenge),
        code = randomCode();
      // Only hashes are stored. The nonce needed to test a six-digit code stays in the browser.
      await db().batch([
        db()
          .prepare(
            'DELETE FROM club_password_resets WHERE expires_at<? AND (verified_expires_at IS NULL OR verified_expires_at<?)',
          )
          .bind(now, now),
        db()
          .prepare('DELETE FROM club_password_resets WHERE user_id=?')
          .bind(user?.id || ''),
        db()
          .prepare(
            "INSERT INTO club_password_resets (challenge_hash,user_id,credential_hash,code_hash,delivery_status,attempts,expires_at,created_at) VALUES (?,?,?,?,'pending',0,?,?)",
          )
          .bind(
            challengeHash,
            user?.id || null,
            user?.password_hash || '',
            await hash(challenge + ':' + code),
            now + LIFETIME,
            now,
          ),
      ]);
      if (user)
        waitUntil(
          (async () => {
            try {
              await sendRecoveryCode(email, code, 'recovery-code/' + challengeHash);
              await db()
                .prepare(
                  "UPDATE club_password_resets SET delivery_status='sent' WHERE challenge_hash=? AND delivery_status='pending'",
                )
                .bind(challengeHash)
                .run();
            } catch {
              await db()
                .prepare(
                  "UPDATE club_password_resets SET delivery_status='failed',code_hash='' WHERE challenge_hash=?",
                )
                .bind(challengeHash)
                .run();
              console.error('BMK recovery email delivery failed.');
            }
          })(),
        );
      // Unknown and inactive accounts get the same response and a non-verifiable challenge.
      const response = json({
        ok: true,
        challenge,
        retryAfter: 60,
        expiresIn: 600,
        message: 'Adresin kayıtlıysa doğrulama kodun e-postana ulaşacak.',
      });
      response.headers.set('Set-Cookie', recoveryCookie(request));
      return response;
    }
    if (input.action === 'verify') {
      const parsed = verifySchema.safeParse(input);
      if (!parsed.success) return json({ error: invalid }, 400);
      if (!(await rate(request, 'recovery-verify', 30)))
        return json({ error: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, 429);
      const { challenge, code } = parsed.data,
        challengeHash = await hash(challenge),
        codeHash = await hash(challenge + ':' + code),
        raw = token(),
        verifiedHash = await hash(raw);
      // Counting every attempt and granting a reset session happen in one atomic write.
      const result = await db()
        .prepare(
          "UPDATE club_password_resets SET attempts=attempts+1,verified_hash=CASE WHEN code_hash=? THEN ? ELSE NULL END,verified_expires_at=CASE WHEN code_hash=? THEN ? ELSE NULL END WHERE challenge_hash=? AND expires_at>? AND attempts<? AND verified_hash IS NULL AND delivery_status='sent' AND EXISTS (SELECT 1 FROM club_accounts u WHERE u.id=club_password_resets.user_id AND u.active=1 AND u.password_hash=club_password_resets.credential_hash) RETURNING verified_hash",
        )
        .bind(codeHash, verifiedHash, codeHash, now + LIFETIME, challengeHash, now, MAX_ATTEMPTS)
        .first<{ verified_hash: string | null }>();
      if (result?.verified_hash !== verifiedHash) return json({ error: invalid }, 400);
      const response = json({ ok: true, expiresIn: 600 });
      response.headers.set('Set-Cookie', recoveryCookie(request, raw, 600));
      return response;
    }
    if (input.action === 'reset') {
      const parsed = resetSchema.safeParse(input);
      if (!parsed.success || !passwordValid(parsed.data.password))
        return json(
          { error: 'Yeni şifren en az 12 karakter olmalı. Çok uzunsa biraz kısaltıp tekrar dene.' },
          400,
        );
      if (!(await rate(request, 'recovery-reset', 10)))
        return json({ error: 'Çok fazla deneme. Biraz sonra tekrar dene.' }, 429);
      const raw = (await cookies()).get(COOKIE)?.value;
      if (!raw || !nonce.safeParse(raw).success)
        return json(
          { error: 'Şifre yenileme oturumun geçersiz. Yeniden kod iste.', code: 'reset_expired' },
          401,
        );
      const verifiedHash = await hash(raw),
        newRecovery = recoveryCode(),
        password = await passwordHash(parsed.data.password),
        completedAt = Date.now();
      // D1 batches are transactional: one token updates the password at most once and revokes all sessions.
      const result = await db().batch([
        db()
          .prepare(
            "UPDATE club_accounts SET auth_version=auth_version+1,password_hash=?,recovery_hash=?,reset_hash=NULL,reset_expires=NULL,updated_at=MAX(updated_at+1,?) WHERE active=1 AND id=(SELECT user_id FROM club_password_resets WHERE verified_hash=? AND verified_expires_at>? AND delivery_status='sent') AND password_hash=(SELECT credential_hash FROM club_password_resets WHERE verified_hash=?) RETURNING id,email",
          )
          .bind(
            password,
            await hash(normalizeRecovery(newRecovery)),
            completedAt,
            verifiedHash,
            completedAt,
            verifiedHash,
          ),
        db()
          .prepare(
            'DELETE FROM club_sessions WHERE user_id=(SELECT r.user_id FROM club_password_resets r JOIN club_accounts u ON u.id=r.user_id WHERE r.verified_hash=? AND r.verified_expires_at>? AND u.password_hash=?)',
          )
          .bind(verifiedHash, completedAt, password),
        db()
          .prepare(
            'DELETE FROM club_password_resets WHERE user_id=(SELECT r.user_id FROM club_password_resets r JOIN club_accounts u ON u.id=r.user_id WHERE r.verified_hash=? AND r.verified_expires_at>? AND u.password_hash=?)',
          )
          .bind(verifiedHash, completedAt, password),
      ]);
      const user = result[0].results[0] as { id: string; email: string } | undefined;
      if (!user) {
        const response = json(
          {
            error: 'Şifre yenileme oturumunun süresi doldu veya kullanıldı. Yeniden kod iste.',
            code: 'reset_expired',
          },
          401,
        );
        response.headers.set('Set-Cookie', recoveryCookie(request));
        return response;
      }
      waitUntil(
        sendPasswordChanged(user.email, 'password-changed/' + verifiedHash).catch(() =>
          console.error('BMK password change notification failed.'),
        ),
      );
      const response = json({ ok: true, recoveryCode: newRecovery });
      response.headers.append('Set-Cookie', recoveryCookie(request));
      response.headers.append('Set-Cookie', clearSession(request));
      return response;
    }
    return json({ error: 'Geçersiz işlem.' }, 400);
  } catch (e) {
    return requestFailure(e);
  }
}
