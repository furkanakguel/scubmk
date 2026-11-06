import handler from 'vinext/server/fetch-handler';
import { runWithConnectorBinding } from '../lib/connector-context';
import type { ConnectorBinding } from '../lib/connector-contract.mjs';
import { body, RequestError } from '../app/server';

let nextMaintenanceAt = 0;
async function cleanExpired(database: D1Database, now: number) {
  const tables = [
    ['rate_limits', 'key'],
    ['admin_sessions', 'token_hash'],
    ['club_sessions', 'token_hash'],
    ['game_runs', 'id'],
    ['admin_invites', 'id'],
  ] as const;
  await database.batch(
    tables.map(([table, key]) =>
      database
        .prepare(
          `DELETE FROM ${table} WHERE ${key} IN (SELECT ${key} FROM ${table} WHERE expires_at<=? LIMIT 200)`,
        )
        .bind(now),
    ),
  );
  await database
    .prepare(
      'DELETE FROM club_password_resets WHERE challenge_hash IN (SELECT challenge_hash FROM club_password_resets WHERE expires_at<=? AND (verified_expires_at IS NULL OR verified_expires_at<=?) LIMIT 200)',
    )
    .bind(now, now)
    .run();
}

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    const url = new URL(request.url),
      isAPI = url.pathname.startsWith('/api/'),
      requestId = crypto.randomUUID();
    // Bounded housekeeping in the background; business records and audit history are untouched.
    if (isAPI && env.DB && Date.now() >= nextMaintenanceAt) {
      const now = Date.now();
      nextMaintenanceAt = now + 15 * 60000;
      ctx.waitUntil(
        cleanExpired(env.DB, now).catch(() =>
          console.warn('Expired-record housekeeping deferred.'),
        ),
      );
    }
    if (
      isAPI &&
      ['POST', 'PUT', 'PATCH'].includes(request.method) &&
      url.pathname !== '/api/admin/media'
    ) {
      try {
        const parsed = await body(request);
        request = new Request(request, { body: JSON.stringify(parsed) });
      } catch (error) {
        return Response.json(
          { error: error instanceof RequestError ? error.message : 'İstek okunamadı.', requestId },
          {
            status: error instanceof RequestError ? error.status : 400,
            headers: {
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
              'X-Request-ID': requestId,
            },
          },
        );
      }
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: 'request_context_expired' };
          return preview.getContext?.() ?? { status: 'binding_unavailable' };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: 'request_context_expired',
              message: 'This request has expired. Please try again.',
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    let response: Response;
    try {
      response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    } catch {
      console.error(JSON.stringify({ event: 'request_failed', requestId, method: request.method }));
      return Response.json(
        { error: 'İşlem şu anda tamamlanamıyor.', requestId },
        { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': requestId } },
      );
    }
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Request-ID', requestId);
    headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    if (
      isAPI ||
      /^\/(admin|kartim|kart|bilet|giris|uye-ol|sifremi-unuttum)(\/|$)/.test(url.pathname)
    )
      headers.set('Cache-Control', 'private, no-store');
    if (response.status === 429 && !headers.has('Retry-After')) headers.set('Retry-After', '600');
    if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;
