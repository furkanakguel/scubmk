import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 2 }, () => randomTestPassword());
import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL;
if (base !== 'http://127.0.0.1:5175')
  throw Error('Only isolated production preview on port 5175 is allowed');
let count = 0,
  ip = 0;
const check = (v, l) => {
  assert.ok(v, l);
  console.log('PASS ' + ++count + ' ' + l);
};
async function post(path, data, cookie = '', origin = base) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: cookie,
      'cf-connecting-ip': '127.71.' + Math.floor(++ip / 250) + '.' + (ip % 250),
    },
    body: JSON.stringify(data),
  });
  return { r, d: await r.json() };
}
const login = await post('/api/admin/auth', {
  action: 'login',
  email: qa.email,
  password: qa.password,
});
assert.equal(login.r.status, 200);
const cookie = login.r.headers.get('set-cookie').split(';')[0];
for (const path of [
  '/api/admin',
  '/api/admin/accounts',
  '/api/admin/operations',
  '/api/admin/media',
  '/api/member',
  '/api/member/recovery',
  '/api/register',
  '/api/ticket',
  '/api/game',
])
  check(
    (await post(path, { action: 'cleanup' }, cookie, 'https://attacker.invalid')).r.status === 403,
    'CSRF denied: ' + path,
  );
const headers = await fetch(base + '/api/events');
check(headers.headers.get('x-request-id')?.length === 36, 'Request correlation ID available');
check(
  headers.headers.get('permissions-policy')?.includes('microphone=()'),
  'Unneeded browser capabilities disabled',
);
check(
  headers.headers.get('referrer-policy') === 'no-referrer',
  'Bearer links excluded from referrer headers',
);
for (const path of [
  '/.env',
  '/.dev.vars',
  '/package.json',
  '/db/schema.ts',
  '/outputs/v21-stress-report.json',
])
  check((await fetch(base + path)).status === 404, 'Private source/artifact not served: ' + path);
const suffix = crypto.randomUUID(),
  hostile = '</script><svg onload=alert(1)>',
  event = {
    title: hostile,
    description: 'Security test: <script>alert(1)</script>',
    category: 'Atölye',
    date: new Date(Date.now() + 86400000).toISOString(),
    location: 'Test salonu',
    capacity: 5,
    published: true,
    registrationOpen: true,
  };
const created = await post('/api/admin', { action: 'event', event }, cookie);
assert.equal(created.r.status, 200);
const html = await (await fetch(base + '/etkinlik/' + created.d.id)).text();
const renderedMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
check(
  !renderedMarkup.includes('<svg onload=alert(1)>') && renderedMarkup.includes('&lt;svg'),
  'Stored event content is escaped outside serialized RSC scripts',
);
const latest = await (
    await fetch(base + '/api/admin?section=events&q=' + encodeURIComponent(hostile), {
      headers: { Cookie: cookie },
    })
  ).json(),
  row = latest.items.find((x) => x.id === created.d.id);
assert(row);
const edits = await Promise.all(
  ['First edit', 'Second edit'].map((title) =>
    post(
      '/api/admin',
      { action: 'event', event: { ...event, id: row.id, updatedAt: row.updated_at, title } },
      cookie,
    ),
  ),
);
check(
  edits
    .map((x) => x.r.status)
    .sort()
    .join(',') === '200,409',
  'Event edit version prevents lost updates',
);
const reg = await post('/api/register', {
  eventId: row.id,
  name: '  =HYPERLINK("https://example.test")',
  email: suffix + '@example.test',
  department: 'Test',
  year: '1. sınıf',
  answer: '\t=1+1',
  website: '',
  consent: true,
});
assert.equal(reg.r.status, 201);
const csv = await (
  await fetch(base + '/api/admin?section=registrations&format=csv&event=' + row.id, {
    headers: { Cookie: cookie },
  })
).text();
check(
  csv.includes("'=") && csv.includes("'=HYPERLINK"),
  'CSV neutralizes formulas including whitespace prefixes',
);
check(
  (
    await post(
      '/api/admin',
      {
        action: 'member',
        member: {
          name: 'Test',
          slug: 'test-' + suffix,
          role: 'Test',
          links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
        },
      },
      cookie,
    )
  ).r.status === 400,
  'Executable profile URLs rejected',
);
check(
  (
    await post(
      '/api/member',
      {
        action: 'signup',
        name: 'Role escalation',
        email: suffix + '@example.test',
        password: testPasswords[0],
        consent: true,
        club_role: 'president',
      },
      '',
    )
  ).r.status === 400,
  'Mass-assigned elevated role rejected',
);
check(
  (await post('/api/admin/auth', { action: 'recover', password: testPasswords[0] }, '')).r
    .status === 403,
  'Owner recovery requires trusted platform identity',
);
const unknown = 'limit-' + suffix + '@example.test';
let responses = [];
for (let i = 0; i < 42; i++)
  responses.push(
    await post('/api/member', { action: 'login', email: unknown, password: testPasswords[1] }),
  );
check(
  responses.slice(0, 40).every((x) => x.r.status === 401) &&
    responses.slice(40).every((x) => x.r.status === 429),
  'Account throttling survives 42 different IP addresses',
);
check(
  responses.at(-1).r.headers.get('retry-after') === '600',
  'Throttled clients receive retry guidance',
);
const malformed = await fetch(base + '/api/member', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: '{"broken":',
});
const error = await malformed.text();
check(
  malformed.status === 400 && !/stack|SELECT |password_hash|node_modules|Error:/.test(error),
  'Malformed requests do not expose internals',
);
console.log(`Adversarial production HTTP suite: ${count} checks passed.`);
