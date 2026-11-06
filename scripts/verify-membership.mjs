import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 2 }, () => randomTestPassword());
import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error('Membership tests must run locally.');
const suffix = Date.now(),
  password = testPasswords[0],
  email = `member-${suffix}@bmk.test`,
  ip = '127.2.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
let n = 0;
function check(v, m) {
  assert.ok(v, m);
  console.log('PASS ' + ++n + ' ' + m);
}
async function req(path, data, cookie = '', headers = {}) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      'cf-connecting-ip': ip,
      ...(data ? { Origin: base, 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const d = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
  return { r, d, cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
let admin = await req('/api/admin/auth', {
  action: 'login',
  email: qa.email,
  password: qa.password,
});
check(admin.r.ok, 'Local admin login');
const ac = admin.cookie;
check((await req('/api/member')).d.user === null, 'Anonymous member session is empty');
check(
  (await req('/api/admin/accounts')).r.status === 401,
  'Account directory requires admin authentication',
);
const signup = {
  action: 'signup',
  name: 'Yerel Kart Testi',
  email,
  password,
  department: 'Bilgisayar Mühendisliği',
  style: 'forest',
  consent: true,
  website: '',
};
check(
  (await req('/api/member', { ...signup, club_role: 'president' })).r.status === 400,
  'Self-signup cannot assign a club title',
);
check(
  (await req('/api/member', { ...signup, style: 'advisor' })).r.status === 400,
  'Privileged design cannot be selected during signup',
);
check(
  (await req('/api/member', signup, '', { Origin: 'https://foreign.test' })).r.status === 403,
  'Signup rejects foreign origins',
);
let a = await req('/api/member', signup);
check(a.r.ok && a.d.created, 'Account created');
let mc = a.cookie,
  u = a.d.user,
  initialCode = a.d.recoveryCode;
check(
  u.club_role === 'member' && u.member_no.startsWith('BMK-') && u.card_code.length === 32,
  'Automatic member card issued with a random identifier',
);
check(a.d.recoveryCode.length === 39, 'One-time recovery code supplied');
check(
  !('password_hash' in u) && !('recovery_hash' in u),
  'Credentials excluded from account response',
);
check(
  /HttpOnly/.test(a.r.headers.get('set-cookie')) &&
    /SameSite=Strict/.test(a.r.headers.get('set-cookie')),
  'Member cookie is HttpOnly and SameSite',
);
check(
  (await req('/api/member', { ...signup, email: email.toUpperCase() })).r.status === 409,
  'Email uniqueness is case-insensitive',
);
check((await req('/api/admin', null, mc)).r.status === 401, 'Member session cannot access CMS');
check(
  (
    await req(
      '/api/admin/accounts',
      { action: 'update', id: u.id, role: 'president', active: true, updatedAt: u.updated_at },
      mc,
    )
  ).r.status === 401,
  'Member cannot grant self a title',
);
check(
  (
    await req(
      '/api/member',
      { action: 'profile', name: 'A', department: '', club_role: 'advisor' },
      mc,
    )
  ).r.status === 400,
  'Profile mass assignment rejected',
);
check(
  (await req('/api/member', { action: 'style', style: 'advisor' }, mc)).r.status === 400,
  'Privileged design cannot be self-selected',
);
for (const style of ['forest', 'cobalt', 'copper', 'mono']) {
  check(
    (await req('/api/member', { action: 'style', style }, mc)).r.ok,
    'Ordinary design selectable: ' + style,
  );
  check(
    (await req('/api/member', null, mc)).d.user.card_style === style,
    'Design persisted: ' + style,
  );
}
check(
  (
    await req(
      '/api/member',
      { action: 'profile', name: 'Yerel Kart Üyesi', department: 'Yazılım' },
      mc,
    )
  ).r.ok,
  'Profile updates persist',
);
let page = await fetch(base + '/kart/dogrula/' + u.card_code),
  html = await page.text();
check(
  page.ok &&
    html.includes('Yerel Kart Üyesi') &&
    !html.includes(email) &&
    !html.includes(initialCode),
  'QR verification displays membership but never email or recovery code',
);
check(/no-store/.test(page.headers.get('cache-control')), 'Card verification is not cached');
let row = async () => {
  let d = await req('/api/admin/accounts?q=' + encodeURIComponent(email), null, ac);
  return d.d.items.find((v) => v.id === u.id);
};
const prev = await row();
for (const role of ['core', 'president', 'vice_president', 'advisor']) {
  const current = await row();
  let edit = await req(
    '/api/admin/accounts',
    { action: 'update', id: u.id, role, active: true, updatedAt: current.updated_at },
    ac,
  );
  check(edit.r.ok, 'Admin assigns ' + role);
  check(
    (await req('/api/member', null, mc)).d.user.club_role === role,
    'Existing session immediately sees ' + role,
  );
}
check(
  (
    await req(
      '/api/admin/accounts',
      { action: 'update', id: u.id, role: 'member', active: true, updatedAt: prev.updated_at },
      ac,
    )
  ).r.status === 409,
  'Stale admin changes are rejected',
);
check(
  (await req('/api/member', { action: 'style', style: 'forest' }, mc)).r.status === 403,
  'Special title locks the matching card design',
);
check(
  (await req('/api/admin', null, mc)).r.status === 401,
  'Advisor title does not confer CMS permissions',
);
const inv = await req(
    '/api/admin',
    {
      action: 'invite',
      name: 'Kart Test Kapı Görevlisi',
      email: `card-checkin-${suffix}@bmk.test`,
      role: 'checkin',
    },
    ac,
  ),
  invite = new URLSearchParams(new URL(inv.d.link).hash.slice(1)).get('davet');
const ci = await req('/api/admin/auth', { action: 'accept-invite', token: invite, password });
check(
  (await req('/api/admin/accounts', null, ci.cookie)).r.status === 403,
  'Check-in staff cannot list member accounts',
);
check(
  (await req('/api/admin/accounts', { action: 'reset-link', id: u.id }, ci.cookie)).r.status ===
    403,
  'Check-in staff cannot reset member credentials',
);
const r1 = await req('/api/member', {
  action: 'recover',
  email,
  code: initialCode,
  password: testPasswords[1],
});
check(r1.r.ok && r1.d.recoveryCode !== initialCode, 'Recovery code rotates on use');
mc = r1.cookie;
check(
  (await req('/api/member', { action: 'recover', email, code: initialCode, password })).r.status ===
    400,
  'Recovery code cannot be reused',
);
check(
  (await req('/api/member', { action: 'login', email, password })).r.status === 401,
  'Old password rejected after recovery',
);
let session2 = await req('/api/member', { action: 'login', email, password: testPasswords[1] });
check(session2.r.ok, 'Password recovery survives a fresh login');
check(
  (await req('/api/member', { action: 'password', current: 'wrong', password }, mc)).r.status ===
    400,
  'Password change requires the existing password',
);
let changed = await req(
  '/api/member',
  { action: 'password', current: testPasswords[1], password },
  mc,
);
check(changed.r.ok, 'Password changes successfully');
mc = changed.cookie;
check(
  (await req('/api/member', null, session2.cookie)).d.user === null,
  'Password change revokes other sessions',
);
let lost = await req('/api/admin/accounts', { action: 'reset-link', id: u.id }, ac);
check(lost.r.ok, 'Administrator can issue a one-use recovery link');
let reset = new URLSearchParams(new URL(lost.d.link).hash.slice(1)).get('kurtar');
let recover = await req('/api/member', { action: 'recover', token: reset, password });
check(recover.r.ok, 'Admin recovery link lets the member choose a password');
mc = recover.cookie;
check(
  (await req('/api/member', { action: 'recover', token: reset, password })).r.status === 400,
  'Admin recovery link cannot be reused',
);
let current = await row();
check(
  (
    await req(
      '/api/admin/accounts',
      { action: 'update', id: u.id, role: 'advisor', active: false, updatedAt: current.updated_at },
      ac,
    )
  ).r.ok,
  'Admin suspends member',
);
check(
  (await req('/api/member', null, mc)).d.user === null,
  'Suspension closes existing member sessions',
);
html = await (await fetch(base + '/kart/dogrula/' + u.card_code)).text();
check(
  html.includes('Kart doğrulanamadı.') && !html.includes('Yerel Kart Üyesi'),
  'Suspended card is not validated or disclosed',
);
check(
  (await req('/api/member', { action: 'login', email, password })).r.status === 401,
  'Suspended account cannot sign in',
);
current = await row();
check(
  (
    await req(
      '/api/admin/accounts',
      { action: 'update', id: u.id, role: 'member', active: true, updatedAt: current.updated_at },
      ac,
    )
  ).r.ok,
  'Admin restores account as ordinary member',
);
let relogin = await req('/api/member', { action: 'login', email, password });
check(
  relogin.r.ok && relogin.d.user.member_no === u.member_no && relogin.d.user.card_style === 'mono',
  'Member number and ordinary style survive title changes and suspension',
);
mc = relogin.cookie;
check((await req('/api/member', { action: 'logout' }, mc)).r.ok, 'Logout succeeds');
check((await req('/api/member', null, mc)).d.user === null, 'Logged-out session cannot be reused');
const concurrentEmail = `concurrent-${suffix}@bmk.test`;
const created = await Promise.all(
  [1, 2].map(() =>
    req('/api/member', { ...signup, email: concurrentEmail }, '', {
      'cf-connecting-ip': '127.99.1.1',
    }),
  ),
);
check(
  created.filter((a) => a.r.ok).length === 1 &&
    created.filter((a) => a.r.status === 409).length === 1,
  'Concurrent duplicate signup creates exactly one account',
);
console.log(`Membership suite: ${n} checks passed.`);
