import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error('CMS fixtures are restricted to a local server.');
const password = qa.password,
  email = qa.email;
let cookie = '';
const ip = '127.1.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
async function req(path, data, session = cookie, extra = {}) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      'cf-connecting-ip': ip,
      ...(data ? { 'Content-Type': 'application/json', Origin: base } : {}),
      ...(session ? { Cookie: session } : {}),
      ...extra,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
  return { r, body };
}
let n = 0;
function check(value, message) {
  assert.ok(value, message);
  console.log('PASS ' + ++n + ' ' + message);
}
check((await req('/api/admin', null, '')).r.status === 401, 'Anonymous admin API denied');
const localOwner = await fetch(base + '/signin-with-chatgpt?return_to=/admin', {
  redirect: 'manual',
});
const platformCookie = localOwner.headers
  .getSetCookie()
  .map((v) => v.split(';')[0])
  .join('; ');
let status = await req('/api/admin/auth', null, platformCookie);
if (!status.body.initialized) {
  const s = await req(
    '/api/admin/auth',
    { action: 'setup', email, password, name: 'BMK Yerel Test' },
    platformCookie,
  );
  check(s.r.ok, 'Owner bootstrap account created locally');
}
let login = await req('/api/admin/auth', { action: 'login', email, password }, '');
check(login.r.ok, 'Email and password login');
cookie = login.r.headers.get('set-cookie').split(';')[0];
check(
  /HttpOnly/.test(login.r.headers.get('set-cookie')) &&
    /SameSite=Strict/.test(login.r.headers.get('set-cookie')),
  'Session cookie uses HttpOnly and SameSite',
);
check(
  (
    await req(
      '/api/admin/auth',
      { action: 'setup', email: 'other@bmk.test', password, name: 'Other' },
      platformCookie,
    )
  ).r.status === 409,
  'Bootstrap cannot be reused',
);
check(
  (await req('/api/admin/auth', { action: 'login', email, password: 'wrong' }, '')).r.status ===
    401,
  'Wrong password rejected',
);
check(
  (
    await req('/api/admin', { action: 'settings', settings: {} }, cookie, {
      Origin: 'https://foreign.test',
    })
  ).r.status === 403,
  'Cross-origin mutation blocked',
);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/R7sAAAAASUVORK5CYII=',
  'base64',
);
const form = new FormData();
form.append('file', new Blob([png], { type: 'image/png' }), 'qa-pixel.png');
let uploaded = await fetch(base + '/api/admin/media', {
  method: 'POST',
  headers: { Origin: base, Cookie: cookie },
  body: form,
});
let media = await uploaded.json();
check(uploaded.status === 201 && media.id, 'Image saved to R2 and indexed');
check((await fetch(base + media.url)).status === 404, 'Unpublished image is private');
const bad = new FormData();
bad.append(
  'file',
  new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/svg+xml' }),
  'bad.svg',
);
check(
  (
    await fetch(base + '/api/admin/media', {
      method: 'POST',
      headers: { Origin: base, Cookie: cookie },
      body: bad,
    })
  ).status === 400,
  'SVG uploads rejected',
);
const suffix = Date.now();
const event = {
  title: 'QA Etkinlik ' + suffix,
  description: 'Yerel test etkinliği. Üretime taşınmaz.',
  details: 'Program ayrıntıları\nİkinci satır',
  category: 'Atölye',
  date: new Date(Date.now() + 86400000 * 10).toISOString(),
  location: 'Yerel test salonu',
  capacity: 1,
  question: 'Test sorusu',
  imageId: media.id,
  imageAlt: 'Yerel test görseli',
  published: false,
  registrationOpen: true,
};
let made = await req('/api/admin', { action: 'event', event });
check(made.r.ok, 'Event created as draft');
const id = made.body.id;
event.id = id;
check(
  !(await req('/api/events', null, '')).body.events.find((e) => e.id === id),
  'Draft event hidden from visitors',
);
const reg = {
  eventId: id,
  name: 'QA Katılımcı',
  email: 'qa-' + suffix + '@bmk.test',
  department: 'Test Bölümü',
  year: '1. sınıf',
  answer: 'Test yanıtı',
  website: '',
  consent: true,
};
check((await req('/api/register', reg, '')).r.status === 404, 'Draft event registration denied');
event.published = true;
check((await req('/api/admin', { action: 'event', event })).r.ok, 'Event publishes with image');
check((await fetch(base + media.url)).status === 200, 'Published event image serves to visitors');
check((await fetch(base + '/etkinlik/' + id)).status === 200, 'Public event detail renders');
let r = await req('/api/register', reg, '');
check(r.r.status === 201, 'Guest registers without an account');
const ticket = r.body;
check(
  (await req('/api/register', { ...reg, email: 'second-' + suffix + '@bmk.test' }, '')).r.status ===
    409,
  'Capacity enforced on server',
);
check(
  (await req('/api/ticket', { token: ticket.token }, '')).body.ticket.name === reg.name,
  'Private ticket retrieved',
);
event.title += ' güncel';
check((await req('/api/admin', { action: 'event', event })).r.ok, 'Event edits persist');
check(
  (await req('/api/ticket', { token: ticket.token }, '')).body.ticket.title === event.title,
  'Existing ticket reflects event update',
);
const member = {
  name: 'Yerel Test Üyesi',
  slug: 'qa-uye-' + suffix,
  role: 'Test görevi',
  team: 'Yerel test',
  email: 'private-' + suffix + '@bmk.test',
  department: 'Bilgisayar Mühendisliği',
  year: '3. sınıf',
  bio: 'Yalnızca yerel işlev testi.',
  photoId: media.id,
  photoAlt: 'Test görseli',
  links: [{ label: 'GitHub', url: 'https://github.com/' }],
  skills: ['Web'],
  sortOrder: 0,
  published: true,
};
made = await req('/api/admin', { action: 'member', member });
check(made.r.ok, 'Member created through CMS');
member.id = made.body.id;
let page = await fetch(base + '/ekip/' + member.slug);
let html = await page.text();
check(
  page.ok && html.includes(member.name) && !html.includes(member.email),
  'Public profile excludes private email',
);
check(
  (
    await req('/api/admin', {
      action: 'member',
      member: { ...member, links: [{ label: 'Bad', url: 'javascript:alert(1)' }] },
    })
  ).r.status === 400,
  'Unsafe profile URL rejected',
);
check(
  (await req('/api/admin', { action: 'archive', table: 'members', id: member.id, archived: true }))
    .r.ok,
  'Member archived without deletion',
);
check((await fetch(base + '/ekip/' + member.slug)).status === 404, 'Archived profile hidden');
check(
  (await req('/api/admin', { action: 'archive', table: 'members', id: member.id, archived: false }))
    .r.ok,
  'Member restored',
);
const inv = await req('/api/admin', {
  action: 'invite',
  name: 'Yerel Kapı Görevlisi',
  email: 'checkin-' + suffix + '@bmk.test',
  role: 'checkin',
});
check(inv.r.ok, 'Scoped admin invite created');
const t = new URLSearchParams(new URL(inv.body.link).hash.slice(1)).get('davet');
let accepted = await req('/api/admin/auth', { action: 'accept-invite', token: t, password }, '');
check(accepted.r.ok, 'Invite accepted once with chosen password');
const scanCookie = accepted.r.headers.get('set-cookie').split(';')[0];
check(
  !(await req('/api/admin/auth', { action: 'accept-invite', token: t, password }, '')).r.ok,
  'Invite cannot be reused',
);
check(
  (await req('/api/admin?section=members', null, scanCookie)).r.status === 403,
  'Check-in staff cannot read members',
);
check(
  (await req('/api/admin', { action: 'member', member }, scanCookie)).r.status === 403,
  'Check-in staff cannot edit content',
);
check(
  (await req('/api/admin', { action: 'checkin', token: ticket.checkin }, scanCookie)).r.ok,
  'Check-in staff validates QR',
);
check(
  (await req('/api/admin', { action: 'checkin', token: ticket.checkin }, scanCookie)).r.status ===
    409,
  'Used QR cannot enter twice',
);
check(
  (await req('/api/admin', { action: 'admin-status', id: accepted.body.user.id, active: false })).r
    .ok,
  'Owner revokes admin',
);
check(
  (await req('/api/admin', { action: 'checkin', token: ticket.checkin }, scanCookie)).r.status ===
    401,
  'Revoked sessions immediately fail',
);
const regs = await req('/api/admin?section=registrations&event=' + id);
check(
  regs.body.total === 1 && regs.body.items[0].checked_in_at,
  'Filtered paginated registrations reflect check-in',
);
const csv = await req('/api/admin?section=registrations&event=' + id + '&format=csv');
check(
  csv.r.headers.get('content-type').includes('text/csv') && csv.body.includes(reg.email),
  'CSV exports selected registrations',
);
const settings = (await req('/api/admin?section=settings')).body.settings;
check(
  (
    await req('/api/admin', {
      action: 'settings',
      settings: { ...settings, membershipOpen: false },
    })
  ).r.ok,
  'Site settings persist',
);
check(
  (await req('/api/register', { ...reg, eventId: 'membership' }, '')).r.status === 404,
  'Closed membership form enforced',
);
check((await req('/api/admin/auth', { action: 'logout' })).r.ok, 'Logout succeeds');
check((await req('/api/admin', null, cookie)).r.status === 401, 'Logged-out session invalidated');
// Leave only archived local fixtures; never touch production.
login = await req('/api/admin/auth', { action: 'login', email, password }, '');
cookie = login.r.headers.get('set-cookie').split(';')[0];
for (const [table, id] of [
  ['events', event.id],
  ['members', member.id],
])
  await req('/api/admin', { action: 'archive', table, id, archived: true });
console.log(
  `${n} CMS checks passed. Local QA account and archived fixtures remain for UI verification.`,
);
