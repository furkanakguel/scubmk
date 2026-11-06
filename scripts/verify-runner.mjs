import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
const compile = async (name) =>
  'data:text/javascript;base64,' +
  Buffer.from(
    ts.transpileModule(
      await fs.readFile(new URL('../app/game/' + name + '.ts', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
  ).toString('base64');
export const E = await import(await compile('engine'));
const {
  createRun,
  act,
  step,
  score,
  replay,
  replaySegment,
  makeCourse,
  challengeDay,
  PLAYER_X,
  PLAYER_W,
  pickupTouchesPlayer,
  SHIELD_COST,
  CHECKPOINT_TICKS,
  speedAt,
  isFlying,
} = E;
export function autoplay(seed, ticks = 180 * 60, useShield = false, avoidPowers = false) {
  const s = createRun(seed);
  s.status = 'running';
  const tape = [],
    played = new Set(),
    seen = new Set(),
    powers = new Set();
  let maxObjects = 0,
    maxQueue = 0;
  const input = (a) => {
    tape.push([s.tick, a]);
    act(s, a);
  };
  while (s.status === 'running' && s.tick < ticks) {
    if (isFlying(s) && s.flightAge >= 48) {
      const ahead = s.obstacles
          .filter((o) => o.air && o.x + o.w > PLAYER_X + 4)
          .sort((a, b) => a.x - b.x),
        next = ahead[0],
        group = next ? ahead.filter((o) => o.x < next.x + 100) : [];
      const h = s.flight === 'bird' ? 87 : 56,
        candidates = [];
      for (let y = 34; y <= 212; y += 2) {
        if (group.every((o) => y + 5 > o.bottom + o.h + 7 || y + h - 5 < o.bottom - 7))
          candidates.push(y);
      }
      const target = candidates.length
        ? candidates.reduce((a, b) => (Math.abs(a - s.y) < Math.abs(b - s.y) ? a : b))
        : 140;
      if (s.y < target - 8) {
        if (!s.jumpHeld) input(0);
      } else if (s.y > target + 12) {
        if (!s.slide) input(2);
      } else {
        if (s.jumpHeld) input(1);
        if (s.slide) input(3);
      }
    } else if (s.flight === 'ground') {
      const next = s.obstacles.find((o) => o.x + o.w > PLAYER_X + 8),
        gate = next && ['drone', 'tunnel', 'laser', 'crusher'].includes(next.kind);
      if (next && !played.has(next.id) && next.x < PLAYER_X + PLAYER_W + s.speed * 0.2) {
        if (gate) {
          played.add(next.id);
          if (!s.slide) input(2);
        } else if (s.y === 0) {
          played.add(next.id);
          if (s.slide) input(3);
          input(0);
        }
      }
      if (s.slide && !gate) input(3);
      if (s.jumpHeld && s.vy < 0) input(1);
    }
    if (useShield && s.energy === SHIELD_COST && s.shield === 0 && s.grace === 0) input(4);
    if (avoidPowers) s.pickups = s.pickups.filter((p) => p.kind === 'star' || p.kind === 'diamond');
    step(s);
    for (const o of s.obstacles) seen.add(o.kind);
    if (s.lastPower) powers.add(s.lastPower);
    maxObjects = Math.max(maxObjects, s.obstacles.length + s.pickups.length);
    maxQueue = Math.max(maxQueue, s.course.length);
  }
  return { s, tape, maxObjects, maxQueue, seen, powers };
}
export function verify() {
  assert.equal(challengeDay(Date.parse('2026-10-24T20:59:59Z')), '2026-10-24');
  assert.equal(challengeDay(Date.parse('2026-10-24T21:00:00Z')), '2026-10-25');
  assert.deepEqual(makeCourse(42), makeCourse(42));
  assert.notDeepEqual(makeCourse(42), makeCourse(43));
  assert(
    new Set(Array.from({ length: 40 }, (_, i) => makeCourse(i)[0].kind)).size >= 8,
    'Opening is randomized, not a fixed tutorial sequence',
  );
  assert(
    speedAt(22) / 360 > 2 &&
      speedAt(60) / 360 > 3 &&
      speedAt(264) / 360 > 5 &&
      speedAt(3600) / 360 <= 5.23,
    'Early acceleration and substantially higher late ceiling',
  );
  assert.equal(SHIELD_COST, 24);
  const jump = createRun();
  jump.status = 'running';
  act(jump, 0);
  for (let i = 0; i < 15; i++) step(jump);
  assert(jump.y > 90);
  const oldVy = jump.vy;
  act(jump, 0);
  step(jump);
  assert(jump.vy < oldVy, 'No double jump');
  const paused = createRun();
  paused.status = 'paused';
  paused.jet = 100;
  const before = JSON.stringify(paused);
  for (let i = 0; i < 100; i++) step(paused);
  assert.equal(JSON.stringify(paused), before);
  const drone = {
    id: 0,
    x: PLAYER_X + 10,
    w: 112,
    h: 31,
    bottom: 36,
    kind: 'drone',
    passed: false,
    level: 1,
  };
  const standing = createRun();
  standing.status = 'running';
  standing.obstacles = [{ ...drone }];
  step(standing);
  assert.equal(standing.status, 'over');
  const sliding = createRun();
  sliding.status = 'running';
  sliding.obstacles = [{ ...drone }];
  act(sliding, 2);
  step(sliding);
  assert.equal(sliding.status, 'running');
  act(sliding, 3);
  step(sliding);
  assert.equal(sliding.status, 'over');
  const star = {
    x: PLAYER_X + 22,
    y: 14,
    route: 'slide',
    kind: 'star',
    taken: false,
    missed: false,
    risk: false,
  };
  for (const y of [0.001, 8, 35, 90, 130, 178]) {
    const air = createRun();
    air.y = y;
    air.slide = true;
    air.shield = 100;
    air.magnet = 100;
    assert(
      !pickupTouchesPlayer(air, star),
      'Gate stars cannot be collected from above, even with magnet',
    );
  }
  const upright = createRun();
  assert(!pickupTouchesPlayer(upright, star));
  upright.slide = true;
  assert(pickupTouchesPlayer(upright, star));
  assert(!pickupTouchesPlayer(upright, { ...star, x: PLAYER_X + PLAYER_W + 40 }));
  const combo = createRun();
  combo.status = 'running';
  combo.chain = 14;
  combo.slide = true;
  combo.prism = 100;
  combo.pickups = [{ ...star }];
  step(combo);
  assert.equal(combo.multiplier, 4);
  assert.equal(combo.bonus, 240);
  assert.equal(combo.energy, 1);
  const diamond = createRun();
  diamond.status = 'running';
  diamond.pickups = [{ ...star, y: 30, route: 'free', kind: 'diamond' }];
  step(diamond);
  assert.equal(diamond.energy, 0);
  assert.equal(diamond.bonus, 150);
  assert.equal(diamond.diamonds, 1);
  const shield = createRun();
  shield.status = 'running';
  shield.energy = 23;
  assert(!act(shield, 4));
  shield.energy = 24;
  assert(act(shield, 4));
  assert.equal(shield.energy, 0);
  shield.obstacles = [{ ...drone }];
  step(shield);
  assert.equal(shield.status, 'running');
  assert.equal(shield.shieldHits, 1);
  for (let i = 0; i < 43; i++) step(shield);
  shield.obstacles = [{ ...drone }];
  step(shield);
  assert.equal(shield.status, 'over');
  for (const power of ['magnet', 'prism', 'jet', 'armor', 'slow']) {
    const s = createRun();
    s.status = 'running';
    s.pickups = [{ ...star, y: 30, route: 'free', kind: power }];
    step(s);
    assert.equal(s.lastPower, power);
    assert.equal(s.powerSerial, 1);
    assert(s[power === 'armor' ? 'shield' : power] > 0);
  }
  const flight = createRun();
  flight.status = 'running';
  flight.flight = 'jet';
  flight.flightAge = 60;
  flight.flightTicks = 120;
  flight.y = 140;
  act(flight, 0);
  for (let i = 0; i < 12; i++) step(flight);
  assert(flight.y > 180);
  assert.equal(flight.flips, 1);
  act(flight, 2);
  for (let i = 0; i < 18; i++) step(flight);
  assert(flight.y < 150);
  flight.flightTicks = 1;
  step(flight);
  assert.equal(flight.flight, 'release');
  assert(flight.grace >= 100);
  const airHit = createRun();
  airHit.status = 'running';
  airHit.flight = 'jet';
  airHit.flightTicks = 200;
  airHit.flightAge = 70;
  airHit.y = 140;
  airHit.obstacles = [{ ...drone, bottom: 140, kind: 'bird', air: true }];
  step(airHit);
  assert.equal(airHit.status, 'over', 'Flight does not grant permanent invulnerability');
  const carrier = createRun();
  carrier.status = 'running';
  carrier.nextBird = 1;
  step(carrier);
  assert.equal(carrier.flight, 'bird');
  assert.equal(carrier.birdTrips, 1);
  carrier.flightTicks = 1;
  step(carrier);
  assert.equal(carrier.birdRelease, carrier.tick);
  assert.equal(carrier.flight, 'release');
  assert(carrier.nextAt > carrier.distance + 880, 'Safe release corridor');
  const idle = createRun();
  idle.status = 'running';
  while (idle.status === 'running') step(idle);
  assert.equal(replay(42, [], idle.tick).status, 'over');
  assert.throws(() => replay(42, [], idle.tick - 1));
  assert.throws(() =>
    replay(
      42,
      [
        [5, 0],
        [2, 1],
      ],
      200,
    ),
  );
  assert.throws(() => replaySegment(createRun(), [], 2401));
  let maxEntities = 0,
    maxStars = 0,
    survivors = 0;
  const seen = new Set(),
    powers = new Set(),
    failures = [];
  for (let seed = 1; seed <= 150; seed++) {
    const { s, tape, maxObjects, maxQueue, seen: types, powers: got } = autoplay(seed, 180 * 60);
    if (s.status === 'running') survivors++;
    else
      failures.push({
        seed,
        tick: s.tick,
        flight: s.flight,
        y: s.y,
        obs: s.obstacles.filter((o) => o.x < 230),
      });
    assert(maxObjects < 50 && maxQueue <= 1, 'Bounded world');
    maxEntities = Math.max(maxEntities, maxObjects);
    types.forEach((k) => seen.add(k));
    got.forEach((k) => powers.add(k));
    maxStars = Math.max(maxStars, s.bits);
    let verified = createRun(seed);
    for (let tick = CHECKPOINT_TICKS; tick < s.tick; tick += CHECKPOINT_TICKS)
      verified = replaySegment(
        verified,
        tape.filter((e) => e[0] >= verified.tick && e[0] < tick),
        tick,
      );
    verified = replaySegment(
      verified,
      tape.filter((e) => e[0] >= verified.tick && e[0] < s.tick),
      s.tick,
      s.status === 'over',
    );
    assert.deepEqual(
      verified,
      s,
      'Server replay parity, including random powers and controlled bird segments',
    );
  }
  if (survivors !== 150) {
    console.log(JSON.stringify(failures.slice(0, 8), null, 2));
    throw Error(`Only ${survivors}/150 automated pilots survived. Inspect reaction windows.`);
  }
  assert(seen.size >= 17);
  assert.equal(powers.size, 5);
  assert(maxStars < 100, 'No more three stars for every obstacle');
  const marathon = autoplay(42, 60 * 60 * 20, true);
  assert.equal(marathon.s.tick, 60 * 60 * 20);
  assert(marathon.maxObjects < 50);
  assert(marathon.s.birdTrips > 5);
  console.log(
    `Verified ${survivors}/150 three-minute pilots, ${seen.size} obstacle types, five powers, 20-minute endless flight/ground run, max ${maxEntities} entities, max ${maxStars} collected stars/3min; server replay parity, flight collisions, safe release, shield cost and gate-star regression.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verify();
  const { gameViewport } = await import(await compile('viewport'));
  for (const [width, height] of [
    [304, 313],
    [374, 385],
    [412, 424],
    [574, 591],
    [390, 400],
    [596, 396],
    [470, 253],
  ]) {
    const view = gameViewport(width, height);
    assert(
      ((PLAYER_X - view.left) * width) / view.worldWidth > 25,
      'Mobile runner stays inside the visible field',
    );
    assert(
      view.worldHeight * 0.77 > 214 + 82 + 45,
      'Maximum flight altitude includes the bird wings on portrait and landscape screens',
    );
    assert(view.left + view.worldWidth <= 880, 'Camera never displays space beyond the course');
  }
  console.log(
    'Seven mobile camera sizes preserve visible runner, flight headroom and course bounds.',
  );

  const { terrainNodes } = await import(await compile('scenery'));
  for (let layer = 0; layer < 3; layer++)
    for (const x of [150, 185, 230, 880, 10000]) {
      const before = terrainNodes(x - 0.01, layer, 400),
        after = terrainNodes(x + 0.01, layer, 400);
      for (const a of before) {
        const b = after.find((p) => p.id === a.id);
        if (b) {
          assert.equal(a.y, b.y);
          assert(Math.abs(a.x - b.x - 0.02) < 0.000001);
        }
      }
    }
  const { environmentAt, themeIndex, mixColor } = await import(await compile('themes'));
  for (let seed = 0; seed < 50; seed++) {
    assert.equal(new Set(Array.from({ length: 8 }, (_, i) => themeIndex(seed, i))).size, 8);
    for (const tick of [1320, 2640, 3960, 5280, 10560]) {
      const a = environmentAt(tick - 1, seed),
        b = environmentAt(tick, seed);
      assert.equal(a.to, b.from);
      assert.equal(b.mix, 0);
    }
  }
  assert.equal(mixColor('#000000', '#ffffff', 0.5), 'rgb(128,128,128)');
  console.log('Eight-map permutations, smooth transitions and stable world geometry verified.');
}
