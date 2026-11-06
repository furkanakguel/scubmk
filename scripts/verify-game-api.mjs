import assert from 'node:assert/strict';
import { E, autoplay } from './verify-runner.mjs';
const base = process.env.BMK_GAME_TEST_URL || 'http://127.0.0.1:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base))
  throw Error('This test only writes to a local preview.');
const { step, score } = E;
const request = (data, cookie = '', origin = base) =>
  fetch(base + '/api/game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
    body: JSON.stringify(data),
  });
assert.equal((await request({ action: 'start' }, '', 'https://not-bmk.test')).status, 403);
const before = await (await fetch(base + '/api/game')).json();
assert(Array.isArray(before.leaders));
assert.equal(before.version, 5);
const startedAt = Date.now(),
  started = await request({ action: 'start' });
assert.equal(started.status, 200);
const cookie = started.headers.get('set-cookie').split(';')[0],
  run = await started.json();
const second = await request({ action: 'start' }, cookie);
const secondRun = await second.json();
assert.notEqual(run.seed, secondRun.seed, 'Each ranked attempt gets a fresh server seed');
const { s, tape } = autoplay(run.seed, 65 * 60);
assert.equal(s.status, 'running');
while (s.status === 'running') step(s);
const part = (from, to) => ({
  action: 'checkpoint',
  runId: run.runId,
  fromTick: from,
  tick: to,
  events: tape.filter((e) => e[0] >= from && e[0] < to),
});
assert.equal(
  (await request({ ...part(0, 1200), score: 999999 }, cookie)).status,
  400,
  'Client score rejected',
);
assert.equal((await request(part(0, 1200))).status, 401, 'Cookie ownership required');
assert.equal(
  (await request(part(0, 1200), cookie)).status,
  400,
  'Impossible wall-clock speed rejected',
);
assert.equal((await request(part(0, 2401), cookie)).status, 400, 'Bounded replay work per request');
const waitTo = async (tick) => {
  const wait = startedAt + (tick / 60) * 1000 + 100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
};
await waitTo(1200);
assert.equal(
  (await request({ ...part(0, 1200), action: 'finish', nickname: 'Runner QA' }, cookie)).status,
  400,
  'A live checkpoint cannot become a terminal score',
);
const pair = await Promise.all([request(part(0, 1200), cookie), request(part(0, 1200), cookie)]);
assert(pair.some((r) => r.status === 200));
assert(pair.every((r) => r.status === 200 || r.status === 409));
assert.equal(
  (await request(part(0, 1200), cookie)).status,
  200,
  'Lost response retry is idempotent',
);
assert.equal(
  (await request({ ...part(0, 1200), events: [] }, cookie)).status,
  409,
  'Conflicting checkpoint rejected',
);
console.log('First live checkpoint and replay protection verified.');
await waitTo(2400);
assert.equal(
  (await request(part(1200, 2400), cookie)).status,
  200,
  'Continuation preserves power-ups and generator state',
);
await waitTo(3600);
assert.equal(
  (await request(part(2400, 3600), cookie)).status,
  200,
  'Bird flight is server verified',
);
await waitTo(s.tick);
const payload = {
  action: 'finish',
  runId: run.runId,
  fromTick: 3600,
  nickname: 'Runner QA',
  tick: s.tick,
  events: tape.filter((e) => e[0] >= 3600),
};
const finish = await Promise.all([request(payload, cookie), request(payload, cookie)]);
assert.deepEqual(finish.map((r) => r.status).sort(), [200, 409]);
const result = await finish.find((r) => r.status === 200).json();
assert.equal(result.score, score(s));
const board = await (await fetch(base + '/api/game', { headers: { Cookie: cookie } })).json();
assert.equal(board.mine.score, score(s));
assert.equal(board.mine.nickname, 'Runner QA');
console.log(
  'Game API verified: server-issued ownership, real-time segmented replay, three checkpoints including bird flight, idempotent retry, bounded verification, concurrent one-use final score and persisted best.',
);
