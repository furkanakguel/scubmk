import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 4 }, () => randomTestPassword());
import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5174';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw Error('Local isolated tests only');
let cookie = '',
  n = 0,
  ip = 0;
const prefix = '127.51.' + Math.floor(Math.random() * 200) + '.';
const check = (v, l) => {
  assert.ok(v, l);
  console.log('PASS ' + ++n + ' ' + l);
};
async function req(path, data, session = cookie, headers = {}) {
  const r = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      'cf-connecting-ip': prefix + (++ip % 250),
      ...(data ? { 'Content-Type': 'application/json', Origin: base } : {}),
      Cookie: session,
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return { r, d: await r.json() };
}
const login = await req(
  '/api/admin/auth',
  { action: 'login', email: qa.email, password: qa.password },
  '',
);
assert.equal(login.r.status, 200);
cookie = login.r.headers.get('set-cookie').split(';')[0];
check(
  (await req('/api/admin/operations', null, '')).r.status === 401,
  'Anonymous operational controls denied',
);
let current = await req('/api/admin/operations'),
  original = current.d.settings;
check(
  current.r.ok && current.d.health.database && current.d.health.storage,
  'Database and R2 health probes succeed',
);
check(current.d.health.email === false, 'Missing email service is reported honestly');
async function settings(delta) {
  const { d } = await req('/api/admin/operations');
  return req('/api/admin/operations', {
    action: 'settings',
    settings: { ...d.settings, ...delta },
    version: d.version,
  });
}
try {
  const version = current.d.version;
  check((await settings({ signupOpen: false })).r.ok, 'Owner closes new account signup');
  check(
    (
      await req(
        '/api/member',
        {
          action: 'signup',
          name: 'Forbidden Signup',
          email: 'closed@example.test',
          password: testPasswords[0],
          style: 'forest',
          consent: true,
        },
        '',
      )
    ).r.status === 503,
    'Closed signup enforced by backend',
  );
  check(
    (await req('/api/admin/operations', { action: 'settings', settings: original, version })).r
      .status === 409,
    'Stale settings cannot overwrite another edit',
  );
  check(
    (await settings({ signupOpen: true, gameOpen: false, leaderboardVisible: false })).r.ok,
    'Owner controls game and leaderboard',
  );
  check(
    (await req('/api/game', { action: 'start' }, '')).r.status === 503,
    'New ranked games disabled on server',
  );
  check(
    (await req('/api/game', null, '')).d.hidden === true,
    'Public leaderboard respects visibility switch',
  );
  check(
    (await settings({ adminSessionHours: 0 })).r.status === 400,
    'Unsafe session lifetime rejected',
  );
  const suffix = crypto.randomUUID(),
    created = await req('/api/admin/accounts', {
      action: 'create',
      name: 'Operations Member',
      email: suffix + '@example.test',
      department: 'Bilgisayar',
    });
  check(
    created.r.status === 201 && created.d.link,
    'Admin creates member without knowing their password',
  );
  check(
    (
      await req('/api/admin/accounts', {
        action: 'create',
        name: 'Operations Member',
        email: suffix + '@example.test',
        department: '',
      })
    ).r.status === 409,
    'Duplicate account rejected',
  );
  const activate = await req(
    '/api/member',
    { action: 'recover', token: created.d.link.split('#kurtar=')[1], password: testPasswords[1] },
    '',
  );
  check(activate.r.ok, 'New member sets own password using one-use link');
  let memberCookie = activate.r.headers.get('set-cookie').split(';')[0];
  check(
    (
      await req(
        '/api/member',
        {
          action: 'recover',
          token: created.d.link.split('#kurtar=')[1],
          password: testPasswords[2],
        },
        '',
      )
    ).r.status === 400,
    'Activation link cannot be reused',
  );
  const account = (await req('/api/admin/accounts?q=' + encodeURIComponent(suffix))).d.items[0];
  const races = await Promise.all(
    ['First Name', 'Second Name'].map((name) =>
      req('/api/admin/accounts', {
        action: 'profile',
        id: account.id,
        name,
        department: 'Test',
        updatedAt: account.updated_at,
      }),
    ),
  );
  check(
    races
      .map((x) => x.r.status)
      .sort()
      .join(',') === '200,409',
    'Concurrent profile edits cannot silently overwrite each other',
  );
  check(
    (await req('/api/admin/accounts', { action: 'revoke', id: account.id })).r.ok,
    'Admin revokes member sessions',
  );
  check(
    (await req('/api/member', null, memberCookie)).d.user === null,
    'Revoked member session no longer works',
  );
  for (const role of ['editor', 'checkin']) {
    const invite = await req('/api/admin', {
        action: 'invite',
        email: role + '-' + suffix + '@example.test',
        name: 'Test ' + role,
        role,
      }),
      accepted = await req(
        '/api/admin/auth',
        {
          action: 'accept-invite',
          token: invite.d.link.split('#davet=')[1],
          password: testPasswords[3],
        },
        '',
      );
    assert.equal(accepted.r.status, 200);
    const c = accepted.r.headers.get('set-cookie').split(';')[0];
    check(
      (await req('/api/admin/operations', null, c)).r.status === 403,
      role + ' cannot read owner operations',
    );
    check(
      (await req('/api/admin/operations', { action: 'cleanup' }, c)).r.status === 403,
      role + ' cannot mutate owner operations',
    );
    if (role === 'checkin') {
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
        'private.png',
      );
      const upload = await fetch(base + '/api/admin/media', {
          method: 'POST',
          headers: { Origin: base, Cookie: cookie },
          body: form,
        }),
        m = await upload.json();
      assert.equal(upload.status, 201);
      check(
        (await fetch(base + m.url, { headers: { Cookie: c } })).status === 404,
        'Check-in role cannot read unpublished media',
      );
      check(
        (
          await fetch(base + '/api/admin/media', {
            method: 'PATCH',
            headers: { Cookie: c, Origin: base, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: m.id, archived: true }),
          })
        ).status === 403,
        'Check-in role cannot archive media',
      );
      const archive = await fetch(base + '/api/admin/media', {
        method: 'PATCH',
        headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, archived: true }),
      });
      check(archive.ok, 'Unused media can be archived');
      check(
        (await req('/api/admin?section=media&archived=1')).d.items.some((x) => x.id === m.id),
        'Archived media can be found again',
      );
    }
    const user = accepted.d.user;
    check(
      (
        await req('/api/admin/operations', {
          action: 'admin-role',
          id: user.id,
          role: role === 'editor' ? 'checkin' : 'editor',
        })
      ).r.ok,
      'Owner changes ' + role + ' permissions',
    );
    check(
      (await req('/api/admin?section=me', null, c)).r.status === 401,
      'Permission change invalidates existing ' + role + ' sessions',
    );
  }
  check(
    (await req('/api/admin/operations', { action: 'admin-role', id: 'owner', role: 'checkin' })).r
      .status === 409,
    'Owner cannot demote themselves',
  );
  const exported = await req('/api/admin/operations?section=export&collection=club_accounts');
  check(exported.r.ok && exported.d.items.length > 0, 'Paginated member export works');
  check(
    !/password_hash|recovery_hash|reset_hash|token_hash|card_code/.test(JSON.stringify(exported.d)),
    'Export excludes passwords and bearer credentials',
  );
  check(
    (await req('/api/admin/operations?section=export&collection=admin_sessions')).r.status === 400,
    'Sensitive session table cannot be exported',
  );
  check(
    (await req('/api/admin/accounts?q=' + encodeURIComponent("' OR 1=1 --"))).d.items.length === 0,
    'SQL injection payload treated as a search value',
  );
  for (const [payload, type, expected] of [
    ['{', 'application/json', 400],
    ['[]', 'application/json', 400],
    ['null', 'application/json', 400],
    ['{}', 'text/plain', 415],
    ['{"x":"' + 'x'.repeat(20000) + '"}', 'application/json', 413],
  ]) {
    const r = await fetch(base + '/api/member', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': type },
      body: payload,
    });
    check(r.status === expected, 'HTTP parser returns ' + expected + ' for invalid payload');
  }
  const forged = await req('/api/admin/accounts', null, 'bmk_admin=' + 'f'.repeat(48), {
    'oai-authenticated-user-email': qa.email,
  });
  check(forged.r.status === 401, 'Forged cookie and identity header do not grant CMS access');
  const malformed = new FormData();
  malformed.append(
    'file',
    new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }),
    'spoof.png',
  );
  check(
    (
      await fetch(base + '/api/admin/media', {
        method: 'POST',
        headers: { Origin: base, Cookie: cookie },
        body: malformed,
      })
    ).status === 400,
    'Signature-only image rejected over HTTP',
  );
  const response = await fetch(base + '/api/admin/operations', { headers: { Cookie: cookie } });
  check(
    response.headers.get('cache-control')?.includes('no-store'),
    'Operational responses never cached',
  );
  check(
    response.headers.get('x-content-type-options') === 'nosniff',
    'MIME-sniffing protection present',
  );
  console.log(`Operations/security HTTP suite: ${n} checks passed.`);
} finally {
  await settings(original);
}
