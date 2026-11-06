import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 3 }, () => randomTestPassword());
// Isolated real-SQLite/API test: no network calls and no messages sent to real people.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import ts from 'typescript';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle')
  .filter((f) => /^\d+.*\.sql$/.test(f))
  .sort())
  sqlite.exec(readFileSync('drizzle/' + file, 'utf8'));
function prepared(sql, values = []) {
  return {
    sql,
    values,
    bind(...v) {
      return prepared(sql, v);
    },
    async first() {
      return sqlite.prepare(sql).get(...values) || null;
    },
    async run() {
      const result = sqlite.prepare(sql).run(...values);
      return { success: true, meta: { changes: Number(result.changes) }, results: [] };
    },
  };
}
const database = {
  prepare: prepared,
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = statements.map((s) => {
        const rows = sqlite.prepare(s.sql).all(...s.values);
        return {
          success: true,
          results: rows,
          meta: { changes: Number(sqlite.prepare('SELECT changes() AS n').get().n) },
        };
      });
      sqlite.exec('COMMIT');
      return results;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
};
const context = new AsyncLocalStorage(),
  pending = [],
  outbox = [],
  calls = [];
let failed = false,
  deliveryGate = null;
const environment = { DB: database };
const cloudflare = { env: environment, waitUntil: (p) => pending.push(p) };
async function transport(url, options) {
  assert.equal(url, 'https://api.resend.com/emails');
  calls.push(options);
  const mail = JSON.parse(options.body);
  if (failed) return Response.json({ error: 'synthetic rejection' }, { status: 403 });
  outbox.push(mail);
  if (deliveryGate) await deliveryGate;
  return Response.json({ id: crypto.randomUUID() });
}
function compile(file, deps) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('exports', 'require', 'fetch', js)(
    exports,
    (path) => {
      assert.ok(path in deps, 'Missing test dependency ' + path);
      return deps[path];
    },
    transport,
  );
  return exports;
}
const headers = {
  cookies: async () => ({
    get: (name) => {
      const value = context
        .getStore()
        ?.cookie.split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith(name + '='))
        ?.slice(name.length + 1);
      return value ? { value } : undefined;
    },
  }),
};
const chatgpt = { getChatGPTUser: async () => null };
const databaseModule = compile('server/database.ts', { 'cloudflare:workers': cloudflare });
const cryptoModule = compile('server/crypto.ts', {}),
  httpModule = compile('server/http.ts', {});
const limitsModule = compile('server/rate-limit.ts', {
  './database': databaseModule,
  './crypto': cryptoModule,
});
const server = compile('app/server.ts', {
  '../server/database': databaseModule,
  '../server/crypto': cryptoModule,
  '../server/http': httpModule,
  '../server/rate-limit': limitsModule,
});
const operationsModel = compile('app/operations-model.ts', { zod: { z } });
const operations = compile('app/operations.ts', {
  './server': server,
  './operations-model': operationsModel,
});
const auth = compile('app/admin-auth.ts', {
  'next/headers': headers,
  'cloudflare:workers': cloudflare,
  bcryptjs: bcrypt,
  './server': server,
  './operations': operations,
  './chatgpt-auth': chatgpt,
});
const member = compile('app/member-auth.ts', {
  'next/headers': headers,
  './server': server,
  './operations': operations,
});
const mailer = compile('app/recovery-mail.ts', { 'cloudflare:workers': cloudflare });
const route = compile('app/api/member/recovery/route.ts', {
  'cloudflare:workers': cloudflare,
  'next/headers': headers,
  zod: { z },
  '../../../server': server,
  '../../../admin-auth': auth,
  '../../../member-auth': member,
  '../../../recovery-mail': mailer,
});
let n = 0,
  ip = 0;
const base = 'https://bmk.test',
  oldPassword = testPasswords[0],
  newPassword = testPasswords[1],
  oldHash = await bcrypt.hash(oldPassword, 12),
  originalDateNow = Date.now;
let now = originalDateNow();
Date.now = () => now;
function check(value, message) {
  assert.ok(value, message);
  console.log('PASS ' + ++n + ' ' + message);
}
async function flush() {
  while (pending.length) await Promise.all(pending.splice(0));
}
async function request(
  data,
  cookie = '',
  origin = base,
  address = '127.100.' + Math.floor(++ip / 250) + '.' + (ip % 250),
) {
  const req = new Request(base + '/api/member/recovery', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'cf-connecting-ip': address },
    body: JSON.stringify(data),
  });
  const response = await context.run({ cookie }, () => route.POST(req));
  return {
    r: response,
    d: await response.json(),
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; '),
  };
}
async function account(label, active = 1) {
  const id = crypto.randomUUID(),
    email = label + '@example.test';
  sqlite
    .prepare(
      "INSERT INTO club_accounts (id,email,name,password_hash,department,club_role,card_style,member_no,card_code,recovery_hash,active,created_at,updated_at) VALUES (?,?,?,?,'','member','mono',?,?,?, ?,?,?)",
    )
    .run(
      id,
      email,
      'Recovery test',
      oldHash,
      'BMK-' + id,
      id.replaceAll('-', ''),
      'backup-original',
      active,
      now,
      now,
    );
  return { id, email };
}
const getAccount = (u) => sqlite.prepare('SELECT * FROM club_accounts WHERE id=?').get(u.id);
async function issue(u) {
  const result = await request({ action: 'request', email: u.email });
  assert.equal(result.r.status, 200);
  await flush();
  const message = outbox.findLast((m) => m.to[0] === u.email && m.text.includes('kodun:'));
  assert.ok(message);
  return { ...result, code: message.text.match(/kodun: (\d{6})/)[1] };
}
async function verified(u) {
  const issued = await issue(u);
  const result = await request({
    action: 'verify',
    challenge: issued.d.challenge,
    code: issued.code,
  });
  assert.equal(result.r.status, 200);
  return { ...issued, verified: result };
}
try {
  check(
    (await (await route.GET()).json()).emailAvailable === false,
    'Email availability is explicit before configuration',
  );
  let r = await request({ action: 'request', email: 'person@example.test' });
  check(
    r.r.status === 503 && r.d.code === 'email_unavailable' && !r.d.challenge,
    'Unconfigured sender never pretends to send a code',
  );
  check(
    (await request({ action: 'request', email: 'person@example.test' }, '', 'https://foreign.test'))
      .r.status === 403,
    'Foreign origins rejected',
  );
  environment.RESEND_API_KEY = 'test-only-not-a-real-key';
  environment.BMK_MAIL_FROM = 'club@example.test';
  check(
    (await (await route.GET()).json()).emailAvailable === true,
    'Configured sender enables the email flow',
  );
  check(
    (await request({ action: 'request', email: 'invalid' })).r.status === 400,
    'Invalid email rejected',
  );
  check(
    (await request({ action: 'request', email: 'a@example.test', role: 'owner' })).r.status === 400,
    'Unexpected request fields rejected',
  );
  const u = await account('reset-basic'),
    disabled = await account('reset-disabled', 0);
  let release;
  deliveryGate = new Promise((resolve) => (release = resolve));
  r = await request({ action: 'request', email: u.email.toUpperCase() });
  const issuedCode = outbox.at(-1).text.match(/kodun: (\d{6})/)[1];
  check(
    r.r.ok && /^[a-f0-9]{48}$/.test(r.d.challenge) && !('code' in r.d),
    'Random challenge returned without a code or identity',
  );
  check(
    !r.d.user && !r.d.email && r.d.expiresIn === 600 && r.d.retryAfter === 60,
    'Response exposes only challenge and timers',
  );
  let row = sqlite.prepare('SELECT * FROM club_password_resets WHERE user_id=?').get(u.id);
  check(
    row.challenge_hash !== r.d.challenge &&
      row.code_hash !== issuedCode &&
      row.code_hash.length === 64,
    'Nonce and OTP stored only as hashes',
  );
  check(
    (await request({ action: 'verify', challenge: r.d.challenge, code: issuedCode })).r.status ===
      400,
    'Code cannot be used before delivery is accepted',
  );
  release();
  deliveryGate = null;
  await flush();
  check(
    calls.at(-1).headers.Authorization.startsWith('Bearer ') &&
      calls.at(-1).headers['Idempotency-Key'].startsWith('recovery-code/'),
    'Provider authentication and idempotency headers included',
  );
  check(
    outbox.at(-1).from === 'SCÜ BMK <club@example.test>' && outbox.at(-1).html.includes(issuedCode),
    'Branded email contains the matching code',
  );
  const unknown = await request({ action: 'request', email: 'not-registered@example.test' }),
    inactive = await request({ action: 'request', email: disabled.email });
  await flush();
  check(
    unknown.r.status === r.r.status &&
      inactive.r.status === r.r.status &&
      Object.keys(unknown.d).join() === Object.keys(r.d).join(),
    'Unknown and inactive accounts receive identical response shapes',
  );
  check(
    !outbox.some(
      (m) => m.to.includes(disabled.email) || m.to.includes('not-registered@example.test'),
    ),
    'No mail sent to unknown or inactive accounts',
  );
  check(
    (await request({ action: 'reset', password: newPassword })).r.status === 401,
    'Reset requires a verified HttpOnly session',
  );
  const cooldown = await request({ action: 'request', email: u.email });
  check(
    cooldown.r.status === 429 && cooldown.d.retryAfter > 0 && cooldown.r.headers.has('Retry-After'),
    'Per-email resend cooldown applies across IP addresses',
  );
  const wrong = issuedCode === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await request({ action: 'verify', challenge: r.d.challenge, code: wrong })).r.status,
      400,
    );
  check(
    sqlite.prepare('SELECT attempts FROM club_password_resets WHERE user_id=?').get(u.id)
      .attempts === 5,
    'Every incorrect code attempt is counted atomically',
  );
  check(
    (await request({ action: 'verify', challenge: r.d.challenge, code: issuedCode })).r.status ===
      400,
    'Correct code is also rejected after five failed attempts',
  );
  now += 61000;
  const renewed = await issue(u);
  check(
    renewed.d.challenge !== r.d.challenge &&
      sqlite.prepare('SELECT COUNT(*) AS n FROM club_password_resets WHERE user_id=?').get(u.id)
        .n === 1,
    'Resending replaces the old challenge',
  );
  check(
    (await request({ action: 'verify', challenge: r.d.challenge, code: issuedCode })).r.status ===
      400,
    'Replaced code is unusable',
  );
  sqlite.prepare('UPDATE club_password_resets SET expires_at=? WHERE user_id=?').run(now - 1, u.id);
  check(
    (await request({ action: 'verify', challenge: renewed.d.challenge, code: renewed.code })).r
      .status === 400,
    'Expired OTP is rejected',
  );
  const active = await account('reset-concurrent'),
    a = await issue(active);
  const attempts = await Promise.all(
    [1, 2].map(() => request({ action: 'verify', challenge: a.d.challenge, code: a.code })),
  );
  check(
    attempts.filter((r) => r.r.status === 200).length === 1 &&
      attempts.filter((r) => r.r.status === 400).length === 1,
    'Concurrent code verification grants exactly one reset session',
  );
  const v = attempts.find((r) => r.r.ok),
    rawCookie = v.r.headers.getSetCookie()[0];
  check(
    /HttpOnly/.test(rawCookie) &&
      /SameSite=Strict/.test(rawCookie) &&
      /Secure/.test(rawCookie) &&
      /Path=\/api\/member\/recovery/.test(rawCookie),
    'Reset cookie is secure, HttpOnly, same-origin and scoped',
  );
  check(!v.d.token && v.d.expiresIn === 600, 'Reset bearer is never returned to JavaScript');
  check(
    (await request({ action: 'reset', password: newPassword, role: 'president' }, v.cookie)).r
      .status === 400,
    'Reset payload rejects privilege fields',
  );
  check(
    (await request({ action: 'reset', password: 'short' }, v.cookie)).r.status === 400,
    'Password policy enforced before reset',
  );
  for (let i = 0; i < 2; i++)
    sqlite
      .prepare(
        'INSERT INTO club_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',
      )
      .run('session-' + i, active.id, now + 1000000, now);
  const before = getAccount(active),
    resetResults = await Promise.all(
      [1, 2].map(() => request({ action: 'reset', password: newPassword }, v.cookie)),
    );
  await flush();
  check(
    resetResults.filter((r) => r.r.ok).length === 1 &&
      resetResults.filter((r) => r.r.status === 401).length === 1,
    'Concurrent password reset consumes its session exactly once',
  );
  const winner = resetResults.find((r) => r.r.ok),
    after = getAccount(active);
  check(
    (await bcrypt.compare(newPassword, after.password_hash)) &&
      !(await bcrypt.compare(oldPassword, after.password_hash)),
    'New password works and old password fails',
  );
  check(
    after.member_no === before.member_no &&
      after.card_code === before.card_code &&
      after.club_role === before.club_role,
    'Password reset preserves membership and card identity',
  );
  check(
    after.recovery_hash !== 'backup-original' && winner.d.recoveryCode?.length === 39,
    'Offline backup code rotates after email reset',
  );
  check(
    sqlite.prepare('SELECT COUNT(*) AS n FROM club_sessions WHERE user_id=?').get(active.id).n ===
      0,
    'All existing member sessions revoked',
  );
  check(
    sqlite.prepare('SELECT COUNT(*) AS n FROM club_password_resets WHERE user_id=?').get(active.id)
      .n === 0,
    'All outstanding reset challenges revoked',
  );
  check(
    winner.r.headers.getSetCookie().length === 2 &&
      winner.r.headers.getSetCookie().every((x) => x.includes('Max-Age=0')) &&
      !winner.d.user,
    'Reset clears cookies and requires a fresh normal login',
  );
  check(
    outbox.filter((m) => m.to[0] === active.email && m.subject.includes('Şifren yenilendi'))
      .length === 1,
    'One password-change notification queued',
  );
  check(
    outbox.every((m) => !m.html.includes(newPassword) && !m.text.includes(newPassword)),
    'Emails never contain passwords',
  );
  const stale = await account('reset-stale'),
    s = await verified(stale),
    newHash = await bcrypt.hash(testPasswords[2], 12);
  sqlite.prepare('UPDATE club_accounts SET password_hash=? WHERE id=?').run(newHash, stale.id);
  sqlite
    .prepare(
      'INSERT INTO club_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)',
    )
    .run('new-session', stale.id, now + 100000, now);
  check(
    (await request({ action: 'reset', password: newPassword }, s.verified.cookie)).r.status === 401,
    'An intervening password change invalidates a verified reset',
  );
  check(
    sqlite.prepare('SELECT COUNT(*) AS n FROM club_sessions WHERE user_id=?').get(stale.id).n === 1,
    'A stale reset cannot revoke newer sessions',
  );
  const expires = await account('reset-session-expired'),
    e = await verified(expires);
  sqlite
    .prepare('UPDATE club_password_resets SET verified_expires_at=? WHERE user_id=?')
    .run(now - 1, expires.id);
  check(
    (await request({ action: 'reset', password: newPassword }, e.verified.cookie)).r.status === 401,
    'Expired reset session cannot change the password',
  );
  const suspend = await account('reset-suspend'),
    sus = await issue(suspend);
  sqlite.prepare('UPDATE club_accounts SET active=0 WHERE id=?').run(suspend.id);
  check(
    (await request({ action: 'verify', challenge: sus.d.challenge, code: sus.code })).r.status ===
      400,
    'Suspended accounts cannot verify previously sent codes',
  );
  const broken = await account('reset-delivery-failure');
  failed = true;
  const originalError = console.error;
  console.error = () => {};
  const failure = await request({ action: 'request', email: broken.email });
  await flush();
  console.error = originalError;
  failed = false;
  const brokenRow = sqlite
    .prepare('SELECT * FROM club_password_resets WHERE user_id=?')
    .get(broken.id);
  check(
    failure.r.ok && brokenRow.delivery_status === 'failed' && brokenRow.code_hash === '',
    'Provider failures invalidate the OTP without disclosing account existence',
  );
  check(
    !sqlite.prepare("SELECT key FROM rate_limits WHERE key LIKE '%@%'").get(),
    'Per-address limits do not store plaintext emails',
  );
  const throttle = await account('reset-request-limits');
  for (let i = 0; i < 5; i++) {
    now += 61000;
    assert.equal((await request({ action: 'request', email: throttle.email })).r.status, 200);
    await flush();
  }
  now += 61000;
  check(
    (await request({ action: 'request', email: throttle.email })).r.status === 429,
    'Per-email request ceiling survives IP rotation',
  );
  const ipLimited = '198.51.100.5';
  for (let i = 0; i < 30; i++)
    await request(
      { action: 'verify', challenge: 'a'.repeat(48), code: '123456' },
      '',
      base,
      ipLimited,
    );
  check(
    (
      await request(
        { action: 'verify', challenge: 'a'.repeat(48), code: '123456' },
        '',
        base,
        ipLimited,
      )
    ).r.status === 429,
    'Verification also has an IP-level rate limit',
  );
  check(
    (await route.GET()).headers.get('Cache-Control') === 'no-store',
    'Recovery responses cannot be cached',
  );
  console.log(`Recovery suite: ${n} checks passed. All email transport was simulated locally.`);
} finally {
  Date.now = originalDateNow;
  sqlite.close();
}
