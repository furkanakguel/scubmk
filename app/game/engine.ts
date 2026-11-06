// Fixed-step, seeded simulation shared by the browser and server verification.
export const ENGINE_VERSION = 5,
  WIDTH = 880,
  PLAYER_X = 126,
  PLAYER_W = 46,
  PLAYER_H = 56;
export const HZ = 60,
  SHIELD_COST = 24,
  SHIELD_TICKS = 240,
  CHECKPOINT_TICKS = 1200,
  MAX_SEGMENT_TICKS = 2400;
export type Action = 0 | 1 | 2 | 3 | 4;
export type InputEvent = [number, Action];
export type Status = 'ready' | 'running' | 'paused' | 'over';
export type ObstacleKind =
  | 'block'
  | 'tower'
  | 'double'
  | 'triple'
  | 'drone'
  | 'roller'
  | 'tunnel'
  | 'crystal'
  | 'riser'
  | 'spikes'
  | 'log'
  | 'laser'
  | 'crusher'
  | 'bird'
  | 'bat'
  | 'storm'
  | 'mine';
export type Power = 'magnet' | 'jet' | 'prism' | 'armor' | 'slow';
export type PatternKind =
  | Exclude<ObstacleKind, 'bird' | 'bat' | 'storm' | 'mine'>
  | 'chicane'
  | 'switchback'
  | 'gauntlet'
  | 'vault'
  | 'bait'
  | 'sprint'
  | 'slalom'
  | 'sawmill'
  | 'ruins';
export type Obstacle = {
  id: number;
  x: number;
  w: number;
  h: number;
  bottom: number;
  kind: ObstacleKind;
  passed: boolean;
  level: number;
  air?: boolean;
};
export type Pickup = {
  x: number;
  y: number;
  route: 'jump' | 'slide' | 'free';
  kind: 'star' | 'diamond' | Power;
  taken: boolean;
  missed: boolean;
  risk: boolean;
};
export type Pattern = {
  at: number;
  kind: PatternKind;
  width: number;
  offset: number;
  level: number;
  id: number;
};
export type RunState = {
  status: Status;
  tick: number;
  y: number;
  vy: number;
  distance: number;
  speed: number;
  bits: number;
  diamonds: number;
  chain: number;
  maxChain: number;
  multiplier: number;
  bonus: number;
  cleared: number;
  slide: boolean;
  jumpHeld: boolean;
  buffer: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  course: Pattern[];
  seed: number;
  rng: number;
  nextAt: number;
  sequence: number;
  previous: string;
  cause: string;
  flash: number;
  energy: number;
  shield: number;
  grace: number;
  shieldHits: number;
  shieldsUsed: number;
  magnet: number;
  jet: number;
  prism: number;
  slow: number;
  powerSerial: number;
  lastPower: Power | '';
  jumps: number;
  landings: number;
  slides: number;
  nearMisses: number;
  flight: 'ground' | 'jet' | 'bird' | 'release';
  flightTicks: number;
  flightAge: number;
  flightSerial: number;
  birdTrips: number;
  birdRelease: number;
  nextBird: number;
  nextAir: number;
  nextPower: number;
  lastAirLane: number;
  flips: number;
  flipTicks: number;
};
export const powerNames: Record<Power, string> = {
  magnet: 'Mıknatıs',
  jet: 'Jetpack',
  prism: 'Çift puan',
  armor: 'Zırh',
  slow: 'Ağır çekim',
};
export function levelAt(tick: number) {
  return 1 + Math.floor(tick / (HZ * 22));
}
export function dailySeed(day: string) {
  let n = 2166136261;
  for (const c of 'bmk-v5-' + day) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function challengeDay(now = Date.now()) {
  return new Date(now + 3 * 3600000).toISOString().slice(0, 10);
}
// About 2.14× at 22 s, 3.26× at 60 s, 5.08× at level 13; ceiling 5.22×.
export function speedAt(t: number) {
  return 360 + 1080 * (1 - Math.exp(-t / 46)) + Math.min(440, Math.max(0, t - 45) * 1.8);
}
export function distanceAt(t: number) {
  const ramp = Math.max(0, t - 45),
    cap = 440 / 1.8;
  return (
    360 * t +
    1080 * (t - 46 * (1 - Math.exp(-t / 46))) +
    (ramp <= cap ? 0.9 * ramp * ramp : 0.9 * cap * cap + 440 * (ramp - cap))
  );
}
const kinds: PatternKind[] = [
  'block',
  'roller',
  'double',
  'drone',
  'tower',
  'tunnel',
  'crystal',
  'spikes',
  'log',
  'laser',
  'riser',
  'triple',
  'crusher',
  'chicane',
  'switchback',
  'vault',
  'bait',
  'sprint',
  'slalom',
  'sawmill',
  'ruins',
  'gauntlet',
];
function random(s: RunState) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function nextPattern(s: RunState): Pattern {
  const level = levelAt(s.tick),
    pool = kinds.slice(0, level === 1 ? 11 : level === 2 ? 19 : kinds.length);
  let kind = pool[Math.floor(random(s) * pool.length)];
  if (kind === s.previous)
    kind = pool[(pool.indexOf(kind) + 1 + Math.floor(random(s) * (pool.length - 1))) % pool.length];
  s.previous = kind;
  const speed = speedAt(s.tick / HZ),
    offset = 42 + speed * (0.82 + random(s) * 0.14),
    compound = ['chicane', 'switchback', 'vault', 'sprint', 'slalom', 'sawmill', 'ruins'].includes(
      kind,
    ),
    three = kind === 'gauntlet';
  const width =
    kind === 'double'
      ? 90
      : kind === 'triple'
        ? 132
        : kind === 'tower'
          ? 45
          : kind === 'roller'
            ? 60
            : kind === 'drone'
              ? 112
              : kind === 'tunnel'
                ? 188
                : kind === 'crystal'
                  ? 78
                  : kind === 'riser'
                    ? 52
                    : kind === 'log'
                      ? 100
                      : kind === 'spikes'
                        ? 84
                        : kind === 'laser'
                          ? 138
                          : kind === 'crusher'
                            ? 84
                            : compound
                              ? offset + 138
                              : three
                                ? offset * 2 + 112
                                : 36;
  const p = { at: s.nextAt, kind, width, offset, level, id: s.sequence++ };
  // Distances follow actual speed, including slow motion and flight. No stale time-based spawns.
  s.nextAt += width + speed * (Math.max(0.68, 1.35 - (level - 1) * 0.075) + random(s) * 0.36);
  return p;
}
export function makeCourse(seed: number, count = 24) {
  const s = createRun(seed);
  return Array.from({ length: count }, () => nextPattern(s));
}
export function createRun(seed = 42): RunState {
  const s: RunState = {
    status: 'ready',
    tick: 0,
    y: 0,
    vy: 0,
    distance: 0,
    speed: 360,
    bits: 0,
    diamonds: 0,
    chain: 0,
    maxChain: 0,
    multiplier: 1,
    bonus: 0,
    cleared: 0,
    slide: false,
    jumpHeld: false,
    buffer: 0,
    obstacles: [],
    pickups: [],
    course: [],
    seed: seed >>> 0,
    rng: seed >>> 0,
    nextAt: 1330,
    sequence: 0,
    previous: '',
    cause: '',
    flash: 0,
    energy: 0,
    shield: 0,
    grace: 0,
    shieldHits: 0,
    shieldsUsed: 0,
    magnet: 0,
    jet: 0,
    prism: 0,
    slow: 0,
    powerSerial: 0,
    lastPower: '',
    jumps: 0,
    landings: 0,
    slides: 0,
    nearMisses: 0,
    flight: 'ground',
    flightTicks: 0,
    flightAge: 0,
    flightSerial: 0,
    birdTrips: 0,
    birdRelease: 0,
    nextBird: 0,
    nextAir: 0,
    nextPower: 0,
    lastAirLane: -1,
    flips: 0,
    flipTicks: 0,
  };
  s.nextBird = Math.floor((38 + random(s) * 15) * HZ);
  s.nextPower = Math.floor((8 + random(s) * 7) * HZ);
  s.nextAt += random(s) * 260;
  return s;
}
export function score(s: RunState) {
  return Math.floor(s.distance / 10) + s.bonus;
}
export const isFlying = (s: RunState) => s.flight === 'jet' || s.flight === 'bird';
export function act(s: RunState, a: Action) {
  if (s.status !== 'running') return false;
  if (a === 4) {
    if (s.energy < SHIELD_COST || s.shield > 0 || s.grace > 0) return false;
    s.energy -= SHIELD_COST;
    s.shield = SHIELD_TICKS;
    s.shieldsUsed++;
    return true;
  }
  if (a === 0) {
    if (s.flight === 'jet' && !s.jumpHeld && s.flipTicks === 0) {
      s.flipTicks = 30;
      s.flips++;
    }
    s.jumpHeld = true;
    s.buffer = 7;
    s.slide = false;
  }
  if (a === 1) {
    s.jumpHeld = false;
    if (!isFlying(s) && s.vy > 400) s.vy = 400;
  }
  if (a === 2) {
    if (!s.slide && !isFlying(s)) s.slides++;
    s.slide = true;
    s.jumpHeld = false;
    s.buffer = 0;
    if (s.y > 0 && s.flight === 'ground') s.vy = Math.min(s.vy, -650);
  }
  if (a === 3) s.slide = false;
  return true;
}
function pickup(
  s: RunState,
  x: number,
  y: number,
  kind: Pickup['kind'] = 'star',
  route: Pickup['route'] = 'free',
  risk = true,
) {
  s.pickups.push({ x, y, route, kind, taken: false, missed: false, risk });
}
function spawn(s: RunState, p: Pattern) {
  const x = p.at - s.distance;
  let part = 0;
  const hazard = (kind: ObstacleKind, dx = 0) => {
    const count = kind === 'double' ? 2 : kind === 'triple' ? 3 : 1,
      w =
        kind === 'double'
          ? 90
          : kind === 'triple'
            ? 132
            : kind === 'drone'
              ? 112
              : kind === 'tunnel'
                ? 188
                : kind === 'tower'
                  ? 45
                  : kind === 'roller'
                    ? 60
                    : kind === 'crystal'
                      ? 78
                      : kind === 'riser'
                        ? 52
                        : kind === 'spikes'
                          ? 84
                          : kind === 'log'
                            ? 100
                            : kind === 'laser'
                              ? 138
                              : kind === 'crusher'
                                ? 84
                                : 36;
    const gate = ['drone', 'tunnel', 'laser', 'crusher'].includes(kind),
      h =
        kind === 'tower'
          ? 66
          : kind === 'drone'
            ? 31
            : kind === 'tunnel'
              ? 102
              : kind === 'roller'
                ? 60
                : kind === 'crystal'
                  ? 48
                  : kind === 'riser'
                    ? 55
                    : kind === 'spikes'
                      ? 36
                      : kind === 'log'
                        ? 40
                        : kind === 'laser'
                          ? 18
                          : kind === 'crusher'
                            ? 123
                            : 43,
      id = p.id * 4 + part++;
    for (let i = 0; i < count; i++)
      s.obstacles.push({
        id,
        x: x + dx + (i * (w - 32)) / Math.max(1, count - 1),
        w: count > 1 ? 32 : w,
        h,
        bottom: gate ? 36 : 0,
        kind,
        passed: false,
        level: p.level,
      });
    // Mostly empty routes. A gold star is a decision, never a three-star toll booth.
    if (random(s) < 0.42)
      pickup(
        s,
        x + dx + w * 0.55,
        gate ? 14 : 110 + random(s) * 22,
        'star',
        gate ? 'slide' : 'jump',
      );
  };
  if (p.kind === 'chicane') {
    hazard('block');
    hazard('drone', p.offset);
  } else if (p.kind === 'switchback') {
    hazard('laser');
    hazard('roller', p.offset);
  } else if (p.kind === 'vault') {
    hazard('tower');
    hazard('crystal', p.offset);
  } else if (p.kind === 'gauntlet') {
    hazard('roller');
    hazard('drone', p.offset);
    hazard('double', p.offset * 2);
  } else if (p.kind === 'sprint') {
    hazard('double');
    hazard('spikes', p.offset);
  } else if (p.kind === 'slalom') {
    hazard('tunnel');
    hazard('tower', p.offset);
  } else if (p.kind === 'sawmill') {
    hazard('log');
    hazard('roller', p.offset);
  } else if (p.kind === 'ruins') {
    hazard('crusher');
    hazard('crystal', p.offset);
  } else hazard(p.kind === 'bait' ? 'riser' : p.kind);
  if (random(s) < 0.18) pickup(s, x - 120, random(s) < 0.5 ? 26 : 154, 'diamond');
  else if (random(s) < 0.24) pickup(s, x + p.width + 60, 24 + random(s) * 30);
  if (s.tick >= s.nextPower) {
    const powers: Power[] = ['magnet', 'prism', 'jet', 'armor', 'slow'];
    let power = powers[Math.floor(random(s) * powers.length)];
    if (power === s.lastPower) power = powers[(powers.indexOf(power) + 1) % powers.length];
    pickup(s, x + p.width + s.speed * 0.32, 32, power);
    s.nextPower = s.tick + Math.floor((14 + random(s) * 13) * HZ);
  }
}
function beginFlight(s: RunState, kind: 'jet' | 'bird') {
  s.flight = kind;
  s.flightTicks = kind === 'jet' ? 9 * HZ : (13 + Math.floor(random(s) * 4)) * HZ;
  s.flightAge = 0;
  s.flightSerial++;
  s.jet = kind === 'jet' ? s.flightTicks : 0;
  if (kind === 'bird') s.birdTrips++;
  s.grace = Math.max(s.grace, 66);
  s.buffer = 0;
  s.obstacles = [];
  s.pickups = [];
  s.course = [];
  s.nextAir = s.distance + WIDTH + 350;
  s.lastAirLane = -1;
}
function releaseFlight(s: RunState) {
  if (s.flight === 'bird') s.birdRelease = s.tick;
  s.flight = 'release';
  s.flightAge = 0;
  s.flightTicks = 0;
  s.jet = 0;
  s.vy = 75;
  s.grace = 105;
  s.obstacles = [];
  s.pickups = [];
  s.course = [];
  s.nextAt = s.distance + WIDTH + s.speed * 0.9;
  s.nextBird = s.tick + Math.floor((48 + random(s) * 30) * HZ);
}
function spawnAir(s: RunState) {
  const x = s.nextAir - s.distance,
    level = levelAt(s.tick);
  let lane = Math.floor(random(s) * 3);
  if (lane === s.lastAirLane && random(s) < 0.65) lane = (lane + 1 + Math.floor(random(s) * 2)) % 3;
  s.lastAirLane = lane;
  const kind = (['bird', 'bat', 'storm', 'mine'] as const)[Math.floor(random(s) * 4)],
    w = kind === 'storm' ? 76 : kind === 'mine' ? 38 : 62,
    h = kind === 'storm' ? 48 : kind === 'mine' ? 38 : 30,
    bottom = [45, 143, 241][lane];
  s.obstacles.push({
    id: s.sequence++ * 4,
    x,
    w,
    h,
    bottom,
    kind,
    passed: false,
    level,
    air: true,
  });
  if (random(s) < 0.48)
    pickup(s, x + 20, [210, 65, 140][lane], random(s) < 0.22 ? 'diamond' : 'star');
  // High-level pairs leave a 160px vertical corridor between them.
  if (level >= 5 && lane !== 1 && random(s) < 0.28)
    s.obstacles.push({
      id: s.sequence++ * 4,
      x: x + 10,
      w: 48,
      h: 30,
      bottom: lane === 0 ? 241 : 45,
      kind: 'bird',
      passed: false,
      level,
      air: true,
    });
  s.nextAir += s.speed * (Math.max(1.0, 1.7 - level * 0.055) + random(s) * 0.4) + 100;
}
export function circleTouchesRect(
  x: number,
  y: number,
  r: number,
  left: number,
  right: number,
  bottom: number,
  top: number,
) {
  const dx = x - Math.max(left, Math.min(x, right)),
    dy = y - Math.max(bottom, Math.min(y, top));
  return dx * dx + dy * dy <= r * r;
}
export function pickupTouchesPlayer(s: RunState, p: Pickup) {
  const grounded = s.y === 0,
    duck = s.slide && grounded;
  if (p.route === 'slide' && !duck) return false;
  if (p.route === 'jump' && grounded) return false;
  const radius =
    s.magnet > 0 && p.kind === 'star'
      ? 125
      : p.kind === 'star'
        ? 7
        : p.kind === 'diamond'
          ? 10
          : 17;
  return circleTouchesRect(
    p.x,
    p.y,
    radius,
    PLAYER_X + 8,
    PLAYER_X + PLAYER_W - 7,
    s.y + 5,
    s.y + (duck ? 25 : PLAYER_H) - 5,
  );
}
function collect(s: RunState, p: Pickup) {
  p.taken = true;
  if (p.kind === 'diamond') {
    s.diamonds++;
    s.bonus += 150 * (s.prism > 0 ? 2 : 1);
    s.flash = 15;
    return;
  }
  if (p.kind !== 'star') {
    s.powerSerial++;
    s.lastPower = p.kind;
    if (p.kind === 'armor') s.shield = SHIELD_TICKS;
    else if (p.kind === 'jet') beginFlight(s, 'jet');
    else s[p.kind] = p.kind === 'slow' ? 360 : 540;
    return;
  }
  s.bits++;
  s.energy = Math.min(SHIELD_COST, s.energy + 1);
  s.chain++;
  s.maxChain = Math.max(s.maxChain, s.chain);
  s.multiplier = 1 + Math.min(3, Math.floor(s.chain / 5));
  s.bonus += 30 * s.multiplier * (s.prism > 0 ? 2 : 1);
  s.flash = 10;
}
export function step(s: RunState) {
  if (s.status !== 'running') return;
  const flying = isFlying(s);
  if (s.buffer > 0 && s.flight === 'ground') {
    if (s.y === 0) {
      s.vy = s.jumpHeld ? 650 : 500;
      s.y = 0.01;
      s.slide = false;
      s.buffer = 0;
      s.jumps++;
    } else s.buffer--;
  }
  const oldY = s.y;
  s.tick++;
  s.speed =
    speedAt(s.tick / HZ) *
    (s.slow > 0 ? 1 - 0.33 * Math.min(1, s.slow / 90) : 1) *
    (flying ? 0.72 : 1);
  const travel = s.speed / HZ;
  s.distance += travel;
  for (const timer of ['flash', 'shield', 'grace', 'magnet', 'prism', 'slow', 'flipTicks'] as const)
    s[timer] = Math.max(0, s[timer] - 1);
  if (flying) {
    s.flightAge++;
    s.flightTicks--;
    s.jet = s.flight === 'jet' ? s.flightTicks : 0;
    s.buffer = 0;
    if (s.flightAge < 48) {
      s.y += (145 - s.y) * 0.09;
      s.vy = 0;
    } else {
      const target = s.jumpHeld ? 390 : s.slide ? -440 : -65;
      s.vy += (target - s.vy) * 0.18;
      s.y = Math.max(32, Math.min(214, s.y + s.vy / HZ));
    }
    if (s.flightTicks <= 0) releaseFlight(s);
  } else {
    s.vy -= 1800 / HZ;
    s.y = Math.max(0, s.y + s.vy / HZ);
    if (s.y === 0) {
      s.vy = 0;
      if (oldY > 0) s.landings++;
      if (s.flight === 'release') {
        s.flight = 'ground';
        s.flightAge = 0;
      }
    }
  }
  if (s.flight === 'ground' && s.tick >= s.nextBird) beginFlight(s, 'bird');
  for (const o of s.obstacles) o.x -= travel;
  for (const p of s.pickups) p.x -= travel;
  if (isFlying(s)) {
    if (s.nextAir - s.distance < WIDTH + 100 && s.flightTicks > 120) spawnAir(s);
  } else if (s.flight === 'ground') {
    if (!s.course.length) s.course.push(nextPattern(s));
    while (s.course.length && s.course[0].at - s.distance < WIDTH + 90) {
      spawn(s, s.course.shift()!);
      s.course.push(nextPattern(s));
    }
  }
  const duck = s.slide && s.y === 0,
    h = duck ? 25 : s.flight === 'bird' ? 87 : PLAYER_H,
    left = PLAYER_X + 8,
    right = PLAYER_X + PLAYER_W - 7,
    bottom = s.y + 5,
    top = s.y + h - 5;
  for (const o of s.obstacles) {
    const collision =
      o.kind === 'roller' || o.kind === 'mine'
        ? circleTouchesRect(
            o.x + o.w / 2,
            o.bottom + o.h / 2,
            o.w / 2 - 4,
            left,
            right,
            bottom,
            top,
          )
        : left < o.x + o.w - 4 &&
          right > o.x + 4 &&
          bottom < o.bottom + o.h - 3 &&
          top > o.bottom + 3;
    if (collision && s.grace === 0) {
      if (s.shield > 0) {
        s.shield = 0;
        s.grace = 42;
        s.shieldHits++;
        s.chain = 0;
        s.multiplier = 1;
      } else {
        s.status = 'over';
        s.cause = o.air
          ? 'Havada yukarıyı basılı tutarak yüksel, aşağıyla alçal. Taşıyan kuşla birlikte engellere çarpabilirsin.'
          : ['drone', 'tunnel', 'laser', 'crusher'].includes(o.kind)
            ? 'Alçak geçitlerde kaymayı basılı tut. Yıldız için güvenli rotadan çıkman gerekmiyor.'
            : 'Hız arttıkça daha erken karar ver. Her elması almak zorunda değilsin.';
        return;
      }
    }
    if (!o.passed && o.x + o.w < left) {
      o.passed = true;
      s.cleared++;
      s.bonus += 10;
      if (
        s.grace === 0 &&
        s.y > 0 &&
        Math.min(Math.abs(bottom - o.bottom - o.h), Math.abs(top - o.bottom)) < 22
      ) {
        s.nearMisses++;
        s.bonus += 25;
      }
    }
  }
  for (const p of s.pickups) {
    if (p.taken || p.missed) continue;
    if (pickupTouchesPlayer(s, p)) collect(s, p);
    else if (p.x + 10 < left) {
      p.missed = true;
      if (!p.risk && p.kind === 'star') {
        s.chain = 0;
        s.multiplier = 1;
      }
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.x + o.w > -30);
  s.pickups = s.pickups.filter((p) => p.x > -150);
}
export function replaySegment(
  initial: RunState,
  events: InputEvent[],
  endTick: number,
  terminal = false,
) {
  if (
    !Number.isSafeInteger(endTick) ||
    endTick <= initial.tick ||
    endTick - initial.tick > MAX_SEGMENT_TICKS ||
    events.length > 700
  )
    throw Error('Geçersiz koşu bölümü.');
  let last = initial.tick - 1,
    sameTick = 0;
  for (const e of events) {
    if (
      !Array.isArray(e) ||
      e.length !== 2 ||
      !Number.isSafeInteger(e[0]) ||
      e[0] < initial.tick ||
      e[0] >= endTick ||
      e[0] < last ||
      ![0, 1, 2, 3, 4].includes(e[1])
    )
      throw Error('Geçersiz hareketler.');
    sameTick = e[0] === last ? sameTick + 1 : 1;
    if (sameTick > 5) throw Error('Geçersiz hareket sıklığı.');
    last = e[0];
  }
  const s = JSON.parse(JSON.stringify(initial)) as RunState;
  s.status = 'running';
  let i = 0;
  while (s.tick < endTick && s.status === 'running') {
    while (i < events.length && events[i][0] === s.tick) act(s, events[i++][1]);
    step(s);
  }
  if (
    s.tick !== endTick ||
    i !== events.length ||
    (terminal ? (s as RunState).status !== 'over' : s.status !== 'running')
  )
    throw Error('Koşu bölümü doğrulanamadı.');
  return s;
}
export function replay(seed: number, events: InputEvent[], endTick: number) {
  return replaySegment(createRun(seed), events, endTick, true);
}
