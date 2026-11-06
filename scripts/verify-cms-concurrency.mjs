import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 1 }, () => randomTestPassword());
import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5173',
  password = qa.password,
  email = qa.email;
let cookie = '',
  n = 0;
const stamp = Date.now(),
  ip = '127.0.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
async function req(path, data, session = cookie) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
      ...(session ? { Cookie: session } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { r, d: await r.json() };
}
const ok = (condition, label) => {
  assert.ok(condition, label);
  console.log('PASS ' + ++n + ' ' + label);
};
const login = await req('/api/admin/auth', { action: 'login', email, password });
assert.ok(login.r.ok);
cookie = login.r.headers.get('set-cookie').split(';')[0];
let e = {
  title: 'Yerel arayüz doğrulaması',
  description: 'Yalnızca yerel test içeriği. Canlı siteye aktarılmaz.',
  category: 'Atölye',
  date: '2027-12-01T15:00:00.000Z',
  location: 'Yerel test',
  capacity: 1,
  question: 'Yerel test yanıtı',
  published: true,
  registrationOpen: true,
};
let made = await req('/api/admin', { action: 'event', event: e });
assert.ok(made.r.ok);
e.id = made.d.id;
const registration = {
  eventId: e.id,
  name: 'Eşzamanlı Test',
  email: 'parallel-' + stamp + '@bmk.test',
  department: 'Test',
  year: '2. sınıf',
  answer: '',
  consent: true,
  website: '',
};
const race = await Promise.all([
  req('/api/register', registration, ''),
  req('/api/register', { ...registration, email: 'parallel2-' + stamp + '@bmk.test' }, ''),
]);
ok(
  race
    .map((x) => x.r.status)
    .sort()
    .join(',') === '201,409',
  'Concurrent registrations cannot overbook',
);
const t = race.find((x) => x.r.status === 201).d;
ok(
  (await req('/api/ticket', { token: t.checkin }, '')).r.status === 404,
  'Gate token cannot open private ticket',
);
const gates = await Promise.all([
  req('/api/admin', { action: 'checkin', token: t.checkin }),
  req('/api/admin', { action: 'checkin', token: t.checkin }),
]);
ok(
  gates
    .map((x) => x.r.status)
    .sort()
    .join(',') === '200,409',
  'Concurrent QR scans record entry exactly once',
);
e.capacity = 3;
e.registrationOpen = false;
await req('/api/admin', { action: 'event', event: e });
ok(
  (await req('/api/register', { ...registration, email: 'closed-' + stamp + '@bmk.test' }, '')).r
    .status === 404,
  'Closed registration rejected despite published event',
);
const regList = await req('/api/admin?section=registrations&event=' + e.id);
const renewed = await req('/api/admin', { action: 'renew-ticket', id: regList.d.items[0].id });
ok(renewed.r.ok, 'Owner can replace a lost ticket');
const replacement = new URL(renewed.d.link).hash.slice(1);
ok(
  (await req('/api/ticket', { token: t.token }, '')).r.status === 404,
  'Old access link invalidated after renewal',
);
ok(
  (await req('/api/admin', { action: 'checkin', token: t.checkin })).r.status === 409,
  'Old gate QR invalidated after renewal',
);
const restored = await req('/api/ticket', { token: replacement }, '');
ok(restored.r.ok && restored.d.ticket.checkedInAt, 'Replacement retains previous check-in status');
const inv = await req('/api/admin', {
  action: 'invite',
  email: 'editor-' + stamp + '@bmk.test',
  name: 'Yerel Editör',
  role: 'editor',
});
const token = new URLSearchParams(new URL(inv.d.link).hash.slice(1)).get('davet');
const accepted = await req('/api/admin/auth', { action: 'accept-invite', token, password }, '');
const editor = accepted.r.headers.get('set-cookie').split(';')[0];
ok((await req('/api/admin?section=members', null, editor)).r.ok, 'Editor can read club content');
ok(
  (await req('/api/admin?section=admins', null, editor)).r.status === 403,
  'Editor cannot read admin accounts',
);
ok(
  (
    await req(
      '/api/admin',
      { action: 'invite', email: 'never@bmk.test', name: 'Test', role: 'editor' },
      editor,
    )
  ).r.status === 403,
  'Editor cannot invite administrators',
);
ok(
  (
    await req(
      '/api/admin/auth',
      { action: 'password', current: 'wrong', password: testPasswords[0] },
      editor,
    )
  ).r.status === 400,
  'Password change requires current password',
);
const changed = await req(
  '/api/admin/auth',
  { action: 'password', current: password, password: testPasswords[0] },
  editor,
);
ok(changed.r.ok, 'Password can be changed');
ok(
  (await req('/api/admin?section=members', null, editor)).r.status === 401,
  'Password change revokes previous sessions',
);
ok(
  (await req('/api/admin', { action: 'admin-status', id: 'owner', active: false })).r.status ===
    400,
  'Owner cannot disable own account',
);
let settings = (await req('/api/admin?section=settings')).d.settings;
await req('/api/admin', { action: 'settings', settings: { ...settings, membershipOpen: true } });
const member = await req(
  '/api/register',
  { ...registration, eventId: 'membership', email: 'membership-' + stamp + '@bmk.test' },
  '',
);
ok(member.r.status === 201, 'Open membership form accepts a real registration');
await req('/api/admin', { action: 'settings', settings });
await req('/api/admin', { action: 'admin-status', id: accepted.d.user.id, active: false });
// Keep this local event open for a browser form check; it is never seeded in a migration.
e.capacity = 5;
e.registrationOpen = true;
await req('/api/admin', { action: 'event', event: e });
console.log(JSON.stringify({ checks: n, eventId: e.id, url: base + '/etkinlik/' + e.id }));
