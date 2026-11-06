import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw Error('Editor fixtures run locally only.');
const password = qa.password,
  stamp = Date.now(),
  ip = '127.17.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200);
let cookie = '',
  n = 0;
async function request(path, data, session = cookie, extra = {}) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      'cf-connecting-ip': ip,
      ...(session ? { Cookie: session } : {}),
      ...extra,
    },
    body: data ? JSON.stringify(data) : undefined,
    redirect: 'manual',
  });
  return {
    r,
    data: r.headers.get('content-type')?.includes('application/json')
      ? await r.json()
      : await r.text(),
  };
}
function check(value, label) {
  assert.ok(value, label);
  console.log('PASS ' + ++n + ' ' + label);
}
const login = await request('/api/admin/auth', { action: 'login', email: qa.email, password }, '');
assert.equal(login.r.status, 200);
cookie = login.r.headers.get('set-cookie').split(';')[0];
let state = (await request('/api/admin/home')).data;
const original = structuredClone(state),
  originalLive = state.published || state.draft,
  staff = [];
async function save(document, action = 'draft', revision = state.revision, session = cookie) {
  const result = await request('/api/admin/home', { action, document, revision }, session);
  if (result.r.ok && session === cookie) state = result.data;
  return result;
}
try {
  check(
    (await request('/api/admin/home', null, '')).r.status === 401,
    'Draft API requires an authenticated administrator',
  );
  check(
    (await request('/admin/preview?channel=' + crypto.randomUUID(), null, '')).r.status === 307,
    'Preview page refuses anonymous access',
  );
  check(
    (
      await request(
        '/api/admin/home',
        { action: 'draft', document: state.draft, revision: state.revision },
        cookie,
        { Origin: 'https://foreign.test' },
      )
    ).r.status === 403,
    'Foreign-origin save denied',
  );
  check(
    (await request('/admin/preview?channel=' + crypto.randomUUID())).r.ok,
    'Authenticated actual-site preview renders',
  );
  let doc = structuredClone(state.draft);
  doc.sections[0].title = 'Yerel editör ' + stamp;
  check((await save(doc)).r.ok, 'Draft saved');
  check(
    (await request('/api/admin/home')).data.draft.sections[0].title === doc.sections[0].title,
    'Draft survives reload',
  );
  check(
    !(await (await fetch(base)).text()).includes(doc.sections[0].title),
    'Unpublished draft is absent from public HTML and hydration data',
  );
  let incomplete = structuredClone(doc);
  incomplete.sections[0].title = '';
  check((await save(incomplete)).r.ok, 'Incomplete draft can be saved');
  check(
    (await save(incomplete, 'publish')).r.status === 400,
    'Incomplete draft cannot be published',
  );
  const block = {
    ...doc.sections[1],
    id: 'block-' + crypto.randomUUID(),
    kind: 'story',
    label: 'Yerel görsel bölümü',
    title: 'YENI-BLOK-' + stamp,
    text: 'Yerel test açıklaması',
    tone: 'paper',
  };
  doc.sections.splice(2, 0, block);
  const hidden = doc.sections.find((s) => s.kind === 'lab');
  hidden.visible = false;
  hidden.title = 'HIDDEN-COPY-' + stamp;
  const eventIndex = doc.sections.findIndex((s) => s.kind === 'events'),
    [event] = doc.sections.splice(eventIndex, 1);
  doc.sections.splice(1, 0, event);
  check(
    (await save(doc, 'publish')).r.ok,
    'New block, hidden section and reordered events publish atomically',
  );
  let html = await (await fetch(base)).text();
  check(
    html.includes(block.title) && html.includes(doc.sections[0].title),
    'Published text reaches actual homepage',
  );
  check(
    html.indexOf('data-home-section="events"') < html.indexOf('data-home-section="about"'),
    'Published section order is used by homepage',
  );
  check(
    !html.includes(hidden.title) && !html.includes('data-home-section="lab"'),
    'Hidden section copy stays out of public response',
  );
  check(state.history.length > 0, 'Previous published/default layout retained for rollback');
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>',
    '//evil.test',
    '/\\evil.test',
    'https://user:password@evil.test',
  ]) {
    const bad = structuredClone(doc);
    bad.sections[1].buttonHref = url;
    check((await save(bad)).r.status === 400, 'Unsafe link rejected: ' + url.split(':')[0]);
  }
  for (const mutation of [
    (d) => d.sections.push({ ...d.sections[1] }),
    (d) => (d.sections[0].visible = false),
    (d) => (d.sections[1].kind = 'html'),
    (d) => (d.sections[1].html = '<script>alert(1)</script>'),
    (d) => (d.sections[1].text = 'x'.repeat(2401)),
    (d) => d.sections.shift(),
  ]) {
    const bad = structuredClone(doc);
    mutation(bad);
    check((await save(bad)).r.status === 400, 'Malformed layout/unknown field rejected');
  }
  const raw = await fetch(base + '/api/admin/home', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: 'x'.repeat(180001),
  });
  check(raw.status === 413, 'Oversized streamed body rejected');
  const form = new FormData();
  form.append(
    'file',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/R7sAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'editor-qa.png',
  );
  const uploaded = await fetch(base + '/api/admin/media', {
      method: 'POST',
      headers: { Origin: base, Cookie: cookie },
      body: form,
    }),
    image = await uploaded.json();
  assert.equal(uploaded.status, 201);
  doc.sections.find((s) => s.id === block.id).imageId = image.id;
  check((await save(doc)).r.ok, 'Uploaded image can be selected in a draft');
  check((await fetch(base + image.url)).status === 404, 'Draft-only image remains private');
  const archive = () =>
    fetch(base + '/api/admin/media', {
      method: 'PATCH',
      headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: image.id, archived: true }),
    });
  check((await archive()).status === 409, 'Draft-referenced media cannot be archived');
  check((await save(doc, 'publish')).r.ok, 'Image publishes with page');
  check(
    (await fetch(base + image.url)).status === 200,
    'Visible published homepage image is public',
  );
  const noImage = structuredClone(doc);
  noImage.sections.find((s) => s.id === block.id).imageId = '';
  await save(noImage);
  check(
    (await archive()).status === 409,
    'Live image remains protected when removed only from draft',
  );
  await save(noImage, 'publish');
  check((await fetch(base + image.url)).status === 404, 'Removed live media becomes private');
  check((await archive()).status === 200, 'Unused media can be archived');
  check(
    (await save(doc)).r.status === 409,
    'Archived image cannot be reintroduced from old history',
  );
  doc = noImage;
  const raceVersion = state.revision,
    race = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const candidate = structuredClone(doc);
        candidate.announcement = 'race-' + stamp + '-' + i;
        return request('/api/admin/home', {
          action: 'draft',
          document: candidate,
          revision: raceVersion,
        });
      }),
    );
  check(
    race.filter((x) => x.r.status === 200).length === 1 &&
      race.filter((x) => x.r.status === 409).length === 7,
    'Eight simultaneous writes: exactly one wins, seven conflicts',
  );
  state = (await request('/api/admin/home')).data;
  const audit = (await request('/api/admin?section=audit')).data.items;
  check(
    audit.filter(
      (a) => a.created_at === state.revision && a.action === 'Ana sayfa taslağı kaydedildi',
    ).length === 1,
    'Only successful concurrent write creates an audit entry',
  );
  for (const role of ['checkin', 'editor']) {
    const invite = await request('/api/admin', {
      action: 'invite',
      email: 'home-' + role + '-' + stamp + '@bmk.test',
      name: 'Yerel sayfa testi',
      role,
    });
    assert.ok(invite.r.ok);
    const token = new URLSearchParams(new URL(invite.data.link).hash.slice(1)).get('davet'),
      accepted = await request('/api/admin/auth', { action: 'accept-invite', token, password }, '');
    assert.ok(accepted.r.ok);
    staff.push(accepted.data.user.id);
    const session = accepted.r.headers.get('set-cookie').split(';')[0];
    check(
      (await request('/api/admin/home', null, session)).r.status ===
        (role === 'editor' ? 200 : 403),
      role + ' read scope enforced',
    );
    const write = await save(doc, 'draft', state.revision, session);
    check(write.r.status === (role === 'editor' ? 200 : 403), role + ' write scope enforced');
    if (role === 'editor') state = (await request('/api/admin/home')).data;
    else
      check(
        (await request('/admin/preview?channel=' + crypto.randomUUID(), null, session)).r.status ===
          307,
        'Check-in role cannot open private preview',
      );
  }
  for (let i = 0; i < 7; i++) {
    doc.announcement = 'History ' + i;
    assert.ok((await save(doc, 'publish')).r.ok);
  }
  check(state.history.length === 5, 'History bounded to five revisions');
  const old = state.history[1].document;
  assert.ok((await save(old)).r.ok);
  check(state.published.announcement !== old.announcement, 'Restoring history changes draft only');
  assert.ok((await save(old, 'publish')).r.ok);
  check(
    (await (await fetch(base)).text()).includes(old.announcement),
    'Restored version becomes live only after publishing',
  );
  const escaped = structuredClone(doc);
  escaped.sections.find((s) => s.id === block.id).title = '<img src=x onerror=alert(1)> & test';
  assert.ok((await save(escaped, 'publish')).r.ok);
  html = (await (await fetch(base)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  check(
    !html.includes('<img src=x onerror=alert(1)>') && html.includes('&lt;img'),
    'Content is rendered as escaped text, never HTML',
  );
  console.log(`${n} homepage editor integration/security checks passed.`);
} finally {
  state = (await request('/api/admin/home')).data;
  await save(originalLive, 'publish');
  await save(original.draft);
  for (const id of staff)
    await request('/api/admin', { action: 'admin-status', id, active: false });
}
