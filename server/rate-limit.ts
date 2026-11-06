import { db } from './database';
import { hash } from './crypto';
export async function rateKey(scope: string, identity: string, max: number, window = 600000) {
  const key = scope + ':' + (await hash(identity)),
    now = Date.now();
  const row = await db()
    .prepare(
      'INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE MIN(count+1,1000000) END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count',
    )
    .bind(key, now + window, now, now, now + window)
    .first<{ count: number }>();
  return !!row && row.count <= max;
}
export async function rate(request: Request, scope: string, max: number) {
  return rateKey(scope, request.headers.get('cf-connecting-ip') || 'local', max);
}
