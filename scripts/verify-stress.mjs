import { randomTestPassword } from './test-support/credentials.mjs';
const testPasswords = Array.from({ length: 1 }, () => randomTestPassword());
import { localTestCredentials } from './test-support/credentials.mjs';
const qa = localTestCredentials();
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
const base = process.env.BMK_STRESS_URL;
if (base !== 'http://127.0.0.1:5175' || !existsSync('outputs/stress-state-v21/LOCAL-QA-ONLY'))
  throw Error('Requires the named isolated local stress environment on port 5175.');
let ip = 0;
const headers = (cookie = '') => ({
  'Content-Type': 'application/json',
  Origin: base,
  Cookie: cookie,
  'cf-connecting-ip': '127.70.' + Math.floor(++ip / 250) + '.' + (ip % 250),
});
async function post(path, data, cookie = '') {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: headers(cookie),
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
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
const report = {
  environment:
    'Compiled production Worker, isolated local D1 and R2; not a hosted capacity guarantee',
  createdAt: new Date().toISOString(),
  fixtures: { events: 1000, accounts: 10000, registrations: 30000, profiles: 1000 },
  stages: [],
};
const paths = [
  '/api/events',
  '/api/admin?section=events&page=2',
  '/api/admin/accounts?page=10',
  '/api/admin?section=registrations&page=50',
  '/api/admin?section=members&page=3',
  '/api/game',
];
for (const path of paths) {
  const r = await fetch(base + path, { headers: { Cookie: cookie } });
  assert.equal(r.status, 200);
  await r.arrayBuffer();
}
function summarize(label, concurrency, times, errors, start) {
  times.sort((a, b) => a - b);
  const elapsed = performance.now() - start;
  const row = {
    label,
    concurrency,
    requests: times.length,
    errors,
    durationMs: Math.round(elapsed),
    requestsPerSecond: Math.round(times.length / (elapsed / 1000)),
    p50Ms: Math.round(times[Math.floor(times.length * 0.5)]),
    p95Ms: Math.round(times[Math.floor(times.length * 0.95)]),
    p99Ms: Math.round(times[Math.floor(times.length * 0.99)]),
    maxMs: Math.round(times.at(-1)),
  };
  report.stages.push(row);
  console.log(JSON.stringify(row));
}
for (const [concurrency, count] of [
  [1, 100],
  [10, 400],
  [25, 750],
  [50, 1000],
  [100, 1000],
]) {
  let index = 0,
    errors = 0;
  const times = [],
    start = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const i = index++;
        if (i >= count) return;
        const t = performance.now();
        try {
          const r = await fetch(base + paths[i % paths.length], {
              headers: { Cookie: cookie },
              signal: AbortSignal.timeout(15000),
            }),
            d = await r.json();
          if (r.status !== 200) errors++;
          if (d.items && d.items.length > 30) errors++;
        } catch {
          errors++;
        }
        times.push(performance.now() - t);
      }
    }),
  );
  summarize('mixed-read', concurrency, times, errors, start);
  assert.equal(errors, 0);
}
{
  let index = 0,
    errors = 0;
  const times = [],
    start = performance.now(),
    duration = 15000;
  await Promise.all(
    Array.from({ length: 15 }, async () => {
      while (performance.now() - start < duration && index < 15000) {
        const i = index++,
          t = performance.now();
        try {
          const r = await fetch(base + paths[i % paths.length], {
            headers: { Cookie: cookie },
            signal: AbortSignal.timeout(15000),
          });
          if (r.status !== 200) errors++;
          await r.arrayBuffer();
        } catch {
          errors++;
        }
        times.push(performance.now() - t);
      }
    }),
  );
  summarize('sustained-15s', 15, times, errors, start);
  assert.equal(errors, 0);
}
const title = 'Stress capacity ' + Date.now(),
  event = await post(
    '/api/admin',
    {
      action: 'event',
      event: {
        title,
        description: 'Synthetic capacity race, isolated local database only.',
        category: 'Atölye',
        date: new Date(Date.now() + 86400000).toISOString(),
        location: 'Yerel test',
        capacity: 50,
        published: true,
        registrationOpen: true,
      },
    },
    cookie,
  );
assert.equal(event.r.status, 200);
let index = 0;
const accepted = [],
  rejected = [],
  unexpected = [],
  start = performance.now();
await Promise.all(
  Array.from({ length: 25 }, async () => {
    while (true) {
      const i = index++;
      if (i >= 200) return;
      const result = await post('/api/register', {
        eventId: event.d.id,
        name: 'Stress Participant ' + i,
        email: 'race-' + i + '@example.test',
        department: 'Test',
        year: '1. sınıf',
        answer: '',
        website: '',
        consent: true,
      });
      if (result.r.status === 201) accepted.push(result.d);
      else if (result.r.status === 409) rejected.push(i);
      else unexpected.push(result.r.status);
    }
  }),
);
assert.equal(accepted.length, 50);
assert.equal(rejected.length, 150);
assert.equal(unexpected.length, 0);
report.capacityRace = {
  concurrency: 25,
  attempts: 200,
  accepted: accepted.length,
  rejected: rejected.length,
  unexpected: unexpected.length,
  durationMs: Math.round(performance.now() - start),
};
console.log('Capacity race', JSON.stringify(report.capacityRace));
const checkins = await Promise.all(
  Array.from({ length: 25 }, () =>
    post('/api/admin', { action: 'checkin', token: accepted[0].checkin }, cookie),
  ),
);
assert.equal(checkins.filter((x) => x.r.status === 200).length, 1);
assert.equal(checkins.filter((x) => x.r.status === 409).length, 24);
report.qrRace = { attempts: 25, accepted: 1, rejected: 24 };
// Bounded bcrypt burst: unrelated nonexistent identities, no actual account is locked.
const authStart = performance.now(),
  auth = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      post('/api/member', {
        action: 'login',
        email: 'nonexistent-stress-' + i + '@example.test',
        password: testPasswords[0],
      }),
    ),
  );
assert(auth.every((x) => x.r.status === 401));
report.authenticationBurst = {
  requests: 12,
  concurrency: 12,
  durationMs: Math.round(performance.now() - authStart),
  unexpected: 0,
};
const final = await fetch(base + '/api/admin?section=registrations&event=' + event.d.id, {
  headers: { Cookie: cookie },
});
const finalData = await final.json();
assert.equal(finalData.total, 50);
report.invariants = {
  noCapacityOverflow: true,
  singleUseCheckin: true,
  boundedPagination: true,
  serviceRecovered: true,
};
writeFileSync('outputs/v21-stress-report.json', JSON.stringify(report, null, 2) + '\n');
console.log('Stress and integrity tests passed.');
