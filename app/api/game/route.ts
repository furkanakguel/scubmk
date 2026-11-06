import { getOperations } from '../../operations';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  RequestError,
  requestFailure,
  db,
  json,
  body,
  rate,
  sameOrigin,
  hash,
  token,
} from '../../server';
import {
  challengeDay,
  dailySeed,
  createRun,
  replaySegment,
  score,
  ENGINE_VERSION,
  MAX_SEGMENT_TICKS,
  type InputEvent,
  type RunState,
} from '../../game/engine';
export const dynamic = 'force-dynamic';
const COOKIE = 'bmk_runner';
const segment = {
  runId: z.string().regex(/^[a-f0-9]{48}$/),
  fromTick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  tick: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  events: z
    .array(
      z.tuple([
        z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      ]),
    )
    .max(700),
};
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('checkpoint'), ...segment }).strict(),
  z
    .object({
      action: z.literal('finish'),
      ...segment,
      nickname: z
        .string()
        .trim()
        .min(2)
        .max(20)
        .regex(/^[\p{L}\p{N}_ .-]+$/u),
    })
    .strict(),
]);
async function player() {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw && /^[a-f0-9]{48}$/.test(raw) ? raw : null;
}
export async function GET() {
  try {
    const day = challengeDay(),
      raw = await player(),
      ops = (await getOperations()).settings;
    if (!ops.leaderboardVisible)
      return json({
        day,
        seed: dailySeed(day),
        version: ENGINE_VERSION,
        leaders: [],
        mine: null,
        hidden: true,
      });
    const rows = await db()
      .prepare(
        'SELECT nickname,score,ticks,bits,chain,created_at FROM game_scores WHERE hidden=0 AND day=? AND version=? ORDER BY score DESC,created_at ASC LIMIT 10',
      )
      .bind(day, ENGINE_VERSION)
      .all();
    const mine = raw
      ? await db()
          .prepare(
            'SELECT nickname,score FROM game_scores WHERE hidden=0 AND day=? AND version=? AND player_hash=?',
          )
          .bind(day, ENGINE_VERSION, await hash(raw))
          .first()
      : null;
    return json({
      day,
      seed: dailySeed(day),
      version: ENGINE_VERSION,
      leaders: rows.results,
      mine,
    });
  } catch {
    return json({ error: 'Sıralama şu an yüklenemiyor. Antrenman oynayabilirsin.' }, 503);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  try {
    const d = await body(request);
    if (d.action === 'start') {
      const ops = (await getOperations()).settings;
      if (!ops.gameOpen) return json({ error: ops.closedMessage }, 503);
      if (!(await rate(request, 'game-start', 600)))
        return json({ error: 'Biraz ara verip tekrar dene.' }, 429);
      const raw = (await player()) || token(),
        id = token(),
        day = challengeDay(),
        now = Date.now(),
        seed = crypto.getRandomValues(new Uint32Array(1))[0],
        playerHash = await hash(raw);
      if (!(await rate(request, 'game-player-start-' + playerHash, 40)))
        return json({ error: 'Biraz ara verip tekrar dene.' }, 429);
      await db().batch([
        db().prepare('DELETE FROM game_runs WHERE expires_at<?').bind(now),
        db()
          .prepare(
            'INSERT INTO game_runs(id,player_hash,day,seed,version,started_at,expires_at) VALUES(?,?,?,?,?,?,?)',
          )
          .bind(id, playerHash, day, seed, ENGINE_VERSION, now, now + 30 * 60000),
      ]);
      const r = json({ runId: id, day, seed, version: ENGINE_VERSION });
      r.headers.set(
        'Set-Cookie',
        `${COOKIE}=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
      );
      return r;
    }
    const parsed = schema.safeParse(d);
    if (!parsed.success) return json({ error: 'Koşu bilgilerini kontrol et.' }, 400);
    const v = parsed.data;
    if (v.tick <= v.fromTick || v.tick - v.fromTick > MAX_SEGMENT_TICKS)
      return json({ error: 'Koşu bölümü çok uzun. Bağlantıyı kontrol et.' }, 400);
    const raw = await player();
    if (!raw) return json({ error: 'Koşu oturumun bulunamadı. Yeni bir koşu başlat.' }, 401);
    const playerHash = await hash(raw),
      now = Date.now();
    if (
      !(await rate(request, 'game-sync', 6000)) ||
      !(await rate(request, 'game-player-sync-' + playerHash, 200))
    )
      return json({ error: 'Biraz sonra tekrar dene.' }, 429);
    const run = await db()
      .prepare(
        'SELECT seed,day,version,started_at,expires_at,used_at,verified_tick,checkpoint,checkpoint_hash FROM game_runs WHERE id=? AND player_hash=?',
      )
      .bind(v.runId, playerHash)
      .first<{
        seed: number;
        day: string;
        version: number;
        started_at: number;
        expires_at: number;
        used_at: number | null;
        verified_tick: number;
        checkpoint: string | null;
        checkpoint_hash: string | null;
      }>();
    if (!run || run.used_at || run.expires_at < now || run.version !== ENGINE_VERSION)
      return json(
        { error: 'Bu koşu kaydedilmiş veya oturumu kapanmış. Yeni bir koşu başlat.' },
        409,
      );
    const digest = await hash(JSON.stringify(v));
    // Retrying an acknowledged checkpoint is safe, including after a lost response.
    if (v.action === 'checkpoint' && run.verified_tick === v.tick && run.checkpoint_hash === digest)
      return json({ ok: true, tick: v.tick });
    if (run.verified_tick !== v.fromTick)
      return json({ error: 'Koşu kaydı sırası uyuşmuyor.' }, 409);
    if (now - run.started_at + 1000 < (v.tick / 60) * 1000)
      return json({ error: 'Koşu süresi doğrulanamadı.' }, 400);
    const initial = run.checkpoint ? (JSON.parse(run.checkpoint) as RunState) : createRun(run.seed);
    const result = replaySegment(initial, v.events as InputEvent[], v.tick, v.action === 'finish');
    if (v.action === 'checkpoint') {
      const saved = await db()
        .prepare(
          'UPDATE game_runs SET checkpoint=?,verified_tick=?,checkpoint_hash=?,expires_at=? WHERE id=? AND player_hash=? AND verified_tick=? AND used_at IS NULL',
        )
        .bind(
          JSON.stringify(result),
          v.tick,
          digest,
          now + 30 * 60000,
          v.runId,
          playerHash,
          v.fromTick,
        )
        .run();
      if (!saved.meta.changes)
        return json({ error: 'Koşu bölümü zaten işlendi. Aynı kaydı tekrar dene.' }, 409);
      return json({ ok: true, tick: v.tick });
    }
    const points = score(result);
    // Atomic final segment + best score. Only the server's own replay supplies points.
    const saved = await db().batch([
      db()
        .prepare(
          'INSERT INTO game_scores(id,player_hash,day,version,nickname,score,ticks,bits,chain,created_at) SELECT ?,player_hash,day,version,?,?,?,?,?,? FROM game_runs WHERE id=? AND player_hash=? AND used_at IS NULL AND expires_at>? AND verified_tick=? ON CONFLICT(day,version,player_hash) DO UPDATE SET nickname=excluded.nickname,score=excluded.score,ticks=excluded.ticks,bits=excluded.bits,chain=excluded.chain,created_at=excluded.created_at WHERE excluded.score>game_scores.score',
        )
        .bind(
          crypto.randomUUID(),
          v.nickname,
          points,
          result.tick,
          result.bits,
          result.maxChain,
          now,
          v.runId,
          playerHash,
          now,
          v.fromTick,
        ),
      db()
        .prepare(
          'UPDATE game_runs SET used_at=? WHERE id=? AND player_hash=? AND used_at IS NULL AND expires_at>? AND verified_tick=?',
        )
        .bind(now, v.runId, playerHash, now, v.fromTick),
    ]);
    if (!saved[1].meta.changes) return json({ error: 'Koşu daha önce kaydedilmiş.' }, 409);
    const mine = await db()
      .prepare(
        'SELECT score FROM game_scores WHERE hidden=0 AND day=? AND version=? AND player_hash=?',
      )
      .bind(run.day, ENGINE_VERSION, playerHash)
      .first<{ score: number }>();
    return json({ ok: true, score: points, best: mine?.score || points, day: run.day });
  } catch (e) {
    if (e instanceof RequestError) return requestFailure(e);
    return json({ error: 'Koşu doğrulanamadı. Bilgilerini kontrol edip tekrar dene.' }, 400);
  }
}
