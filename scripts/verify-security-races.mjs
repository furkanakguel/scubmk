import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 2 }, () => randomTestPassword());
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import ts from 'typescript';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
const sqlite = new DatabaseSync(':memory:');
for (const f of readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  sqlite.exec(readFileSync('drizzle/' + f, 'utf8'));
function prepared(sql, values = []) {
  return {
    sql,
    values,
    bind(...args) {
      return prepared(sql, args);
    },
    async first() {
      return sqlite.prepare(sql).get(...values) || null;
    },
    async all() {
      return { results: sqlite.prepare(sql).all(...values) };
    },
    async run() {
      const r = sqlite.prepare(sql).run(...values);
      return { meta: { changes: Number(r.changes) } };
    },
  };
}
const database = {
  prepare: prepared,
  async batch(items) {
    sqlite.exec('BEGIN');
    try {
      const results = items.map((i) => {
        const rows = sqlite.prepare(i.sql).all(...i.values);
        return {
          results: rows,
          meta: { changes: sqlite.prepare('SELECT changes() AS n').get().n },
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
  env = { DB: database },
  headers = {
    cookies: async () => ({
      get: (name) => {
        const value = context
          .getStore()
          ?.cookie?.split(';')
          .map((x) => x.trim())
          .find((x) => x.startsWith(name + '='))
          ?.slice(name.length + 1);
        return value ? { value } : undefined;
      },
    }),
  };
let compareGate = null;
const wrappedBcrypt = {
  ...bcrypt,
  compare: async (...args) => {
    const result = await bcrypt.compare(...args),
      gate = compareGate;
    if (gate) {
      compareGate = null;
      gate.arrived();
      await gate.wait;
    }
    return result;
  },
};
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('/chatgpt-auth.ts')) return { getChatGPTUser: async () => null };
  const exports = {};
  cache.set(file, exports);
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('exports', 'require', js)(exports, (name) => {
    if (name === 'cloudflare:workers') return { env, waitUntil: (p) => p.catch(() => {}) };
    if (name === 'next/headers') return headers;
    if (name === 'bcryptjs') return wrappedBcrypt;
    if (name === 'zod') return { z };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
    throw Error('Unexpected dependency ' + name);
  });
  return exports;
}
const server = load('app/server.ts'),
  admin = load('app/admin-auth.ts'),
  member = load('app/member-auth.ts'),
  adminRoute = load('app/api/admin/auth/route.ts'),
  memberRoute = load('app/api/member/route.ts'),
  image = load('app/image-validation.ts');
const password = testPasswords[0],
  nextPassword = testPasswords[1],
  pw = await bcrypt.hash(password, 12),
  now = Date.now();
sqlite
  .prepare(
    "INSERT INTO admin_users(id,email,name,password_hash,role,active,created_at) VALUES('owner','owner@example.test','Test Owner',?,'owner',1,?)",
  )
  .run(pw, now);
sqlite
  .prepare(
    "INSERT INTO club_accounts(id,email,name,password_hash,member_no,card_code,recovery_hash,created_at,updated_at) VALUES('member','member@example.test','Test Member',?,'BMK-TEST','card','recovery',?,?)",
  )
  .run(pw, now, now);
let n = 0;
const check = (v, label) => {
  assert.ok(v, label);
  console.log('PASS ' + ++n + ' ' + label);
};
const base = 'https://bmk.test';
let ip = 0;
async function req(route, data, cookie = '') {
  const r = await context.run({ cookie }, () =>
    route.POST(
      new Request(base + '/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: base,
          'cf-connecting-ip': 'local-test-' + ++ip,
        },
        body: JSON.stringify(data),
      }),
    ),
  );
  return { r, d: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] || '' };
}
function gate() {
  let arrived, release;
  const ready = new Promise((r) => (arrived = r)),
    wait = new Promise((r) => (release = r));
  compareGate = { arrived, wait };
  return { ready, release };
}
for (const [route, table, email] of [
  [adminRoute, 'admin_users', 'owner@example.test'],
  [memberRoute, 'club_accounts', 'member@example.test'],
]) {
  const original = await req(route, { action: 'login', email, password });
  check(original.r.ok, table + ' baseline login');
  const g = gate(),
    attempt = req(route, { action: 'login', email, password });
  await g.ready;
  sqlite.prepare(`UPDATE ${table} SET auth_version=auth_version+1`).run();
  g.release();
  const raced = await attempt;
  check(
    raced.r.status === 409 && !raced.cookie,
    table + ' stale in-flight login cannot create a session after revocation',
  );
  const get = table === 'admin_users' ? admin.getAdmin : member.getMember;
  check(
    (await context.run({ cookie: original.cookie }, get)) === null,
    table + ' old session rejected without relying on cookie deletion',
  );
  const again = await req(route, { action: 'login', email, password }),
    g2 = gate(),
    change = req(
      route,
      { action: 'password', current: password, password: nextPassword },
      again.cookie,
    );
  await g2.ready;
  sqlite.prepare(`UPDATE ${table} SET auth_version=auth_version+1`).run();
  g2.release();
  check(
    (await change).r.status === 409,
    table + ' password-change race cannot overwrite intervening security change',
  );
  check(
    await bcrypt.compare(
      password,
      sqlite.prepare(`SELECT password_hash FROM ${table}`).get().password_hash,
    ),
    table + ' losing password change preserves stored credential',
  );
}
const limits = await Promise.all(
  Array.from({ length: 40 }, () => server.rateKey('race-limit', 'same-account', 10)),
);
check(
  limits.filter(Boolean).length === 10,
  'Atomic rate limiter permits exactly ten concurrent attempts',
);
sqlite.prepare('UPDATE rate_limits SET expires_at=0').run();
check(await server.rateKey('race-limit', 'same-account', 10), 'Expired rate window can recover');
for (const [raw, type, status] of [
  ['{', 'application/json', 400],
  ['null', 'application/json', 400],
  ['[]', 'application/json', 400],
  ['{}', 'text/plain', 415],
  ['{"x":"' + 'ğ'.repeat(9000) + '"}', 'application/json', 413],
]) {
  try {
    await server.body(
      new Request(base, { method: 'POST', headers: { 'content-type': type }, body: raw }),
    );
    assert.fail('Expected rejection');
  } catch (e) {
    check(
      e.status === status,
      'Bounded parser rejects ' + type + ' / ' + raw.length + ' chars with ' + status,
    );
  }
}
const chunks = new ReadableStream({
  start(c) {
    c.enqueue(new Uint8Array(10000));
    c.enqueue(new Uint8Array(10000));
    c.close();
  },
});
try {
  await server.readBounded(new Request(base, { method: 'POST', body: chunks, duplex: 'half' }));
  assert.fail();
} catch (e) {
  check(e.status === 413, 'Streaming body with no Content-Length is bounded');
}
check(
  image.inspectImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])) === null,
  'Signature-only PNG rejected',
);
check(
  image.inspectImage(new TextEncoder().encode('<svg onload="alert(1)"></svg>')) === null,
  'Active SVG upload rejected',
);
const png = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/R7sAAAAASUVORK5CYII=',
    'base64',
  ),
);
check(image.inspectImage(png)?.width === 1, 'Valid raster header accepted');
const oversized = png.slice();
new DataView(oversized.buffer).setUint32(16, 50000);
check(!image.inspectImage(oversized), 'Image decompression dimensions bounded');
check(!image.inspectImage(png.slice(0, -4)), 'Truncated PNG container rejected');
console.log(
  `Security race suite: ${n} checks passed; real SQL transactions and password hashing, isolated in-memory database.`,
);
sqlite.close();
