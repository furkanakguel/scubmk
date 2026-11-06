import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../app/game/audio.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createGameAudio } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
class Param {
  value = 0;
  peaks = [];
  setValueAtTime(v) {
    this.value = v;
  }
  linearRampToValueAtTime(v) {
    this.peaks.push(v);
  }
  exponentialRampToValueAtTime(v) {
    this.value = v;
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  attack = new Param();
  release = new Param();
  connect() {}
  disconnect() {
    this.disconnected = true;
  }
}
class Source extends Node {
  started = false;
  ended = false;
  start() {
    this.started = true;
  }
  stop(at) {
    if (at === undefined) {
      this.ended = true; /* Simulate lost onended during OS audio interruptions. */
    }
  }
}
class Context {
  state = 'suspended';
  currentTime = 1;
  sampleRate = 44100;
  destination = new Node();
  sources = [];
  gains = [];
  resumes = 0;
  compressors = [];
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createDynamicsCompressor() {
    const n = new Node();
    this.compressors.push(n);
    return n;
  }
  createBuffer(ch, n) {
    return { getChannelData: () => new Float32Array(n) };
  }
  createBiquadFilter() {
    return new Node();
  }
  createOscillator() {
    const n = new Source();
    this.sources.push(n);
    return n;
  }
  createBufferSource() {
    return this.createOscillator();
  }
  resume() {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}
const contexts = [],
  audio = createGameAudio(() => {
    const c = new Context();
    contexts.push(c);
    return c;
  });
audio.play('start');
assert.equal(contexts.length, 0, 'No audio before interaction');
const enable = audio.setEnabled(true);
assert.equal(contexts[0].resumes, 1, 'Resume happens inside the user gesture');
assert.equal(await enable, true);
let context = contexts[0];
audio.play('start');
assert.equal(context.sources.length, 4);
assert(context.gains.some((n) => n.gain.peaks.some((v) => v >= 0.14)));
for (let i = 0; i < 100; i++) audio.play('power');
assert(
  context.sources.filter((n) => n.started && !n.disconnected).length <= 18,
  'Bounded polyphony',
);
audio.stop();
assert(
  context.sources.every((n) => n.disconnected),
  'Immediate cleanup must not depend on onended',
);
let before = context.sources.length;
audio.play('jump');
assert(context.sources.length > before, 'No permanently exhausted voice counter');
context.currentTime += 10;
before = context.sources.length;
audio.play('power');
assert(context.sources.length > before, 'Expired voices are reaped even without ended callbacks');
await audio.setEnabled(false);
before = context.sources.length;
audio.play('jump');
assert.equal(context.sources.length, before);
assert(!audio.isRunning());
await audio.setEnabled(true);
assert.equal(contexts.length, 1, 'Normal mute/unmute reuses context');
context.state = 'interrupted';
await audio.resume();
assert.equal(context.resumes, 2);
for (let i = 0; i < 30; i++) {
  const old = context,
    task = audio.restart();
  context = contexts.at(-1);
  assert.equal(context.resumes, 1, 'Fresh run immediately resumes its own audio context');
  assert.equal(old.state, 'closed');
  assert.equal(await task, true);
  audio.play('star');
  audio.play('start');
  assert(context.sources.length >= 6, 'Fresh context resets star throttling and produces output');
}
assert.equal(
  contexts.filter((c) => c.state === 'running').length,
  1,
  'Only one live output graph after repeated retries',
);
context.state = 'closed';
assert.equal(await audio.resume(), true, 'Closed context is recoverable');
context = contexts.at(-1);
audio.play('star');
assert(context.sources.length > 0, 'Closed-context recovery clears old clocks and voices');
const deferred = new Context();
let release;
deferred.resume = () =>
  new Promise((r) => {
    release = () => {
      deferred.state = 'running';
      r();
    };
  });
const other = createGameAudio(() => deferred),
  pending = other.setEnabled(true);
await other.setEnabled(false);
release();
assert.equal(await pending, false, 'Late resume cannot undo mute');
other.play('jump');
assert.equal(deferred.sources.length, 0);
const blocked = new Context();
blocked.resume = () => Promise.reject(Error('blocked'));
const retry = createGameAudio(() => blocked);
await assert.rejects(retry.setEnabled(true));
assert(!retry.isRunning());
blocked.resume = Context.prototype.resume;
assert.equal(await retry.resume(), true);
const pendingOld = new Context(),
  newer = new Context();
let completeOld;
pendingOld.resume = () =>
  new Promise((r) => {
    completeOld = () => r();
  });
let made = 0;
const race = createGameAudio(() => (made++ === 0 ? pendingOld : newer));
const oldTask = race.setEnabled(true);
assert.equal(await race.restart(), true);
completeOld();
assert.equal(await oldTask, false, 'Superseded resume cannot mark old graph ready');
assert(race.isRunning());
for (const sound of [
  'start',
  'jump',
  'land',
  'slide',
  'step',
  'star',
  'diamond',
  'combo',
  'power',
  'shield',
  'break',
  'level',
  'near',
  'over',
  'pause',
  'flight',
  'flap',
  'flip',
  'release',
  'warning',
]) {
  context.currentTime += 2;
  before = context.sources.length;
  audio.play(sound);
  assert(context.sources.length > before, `${sound} produces sources`);
}
// iOS uses an ambient session by default. Claim playback only on interaction,
// restore it on mute/unmount, and propagate actual OS interruption state.
const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const session = { type: 'auto' };
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { audioSession: session },
});
const changes = [],
  mobileContext = new Context(),
  mobile = createGameAudio(
    () => mobileContext,
    (ready) => changes.push(ready),
  );
assert.equal(session.type, 'auto');
await mobile.setEnabled(true);
assert.equal(session.type, 'playback');
assert.equal(changes.at(-1), true);
mobileContext.state = 'interrupted';
mobileContext.onstatechange();
assert.equal(changes.at(-1), false, 'OS interruption updates sound UI');
await mobile.resume();
assert.equal(changes.at(-1), true);
for (let i = 0; i < 30; i++) {
  mobile.stop();
  await mobile.setEnabled(true);
  mobile.play('start');
  mobileContext.currentTime += 2;
}
assert.equal(mobileContext.resumes, 2, 'Normal run restarts reuse the resumed output');
const second = createGameAudio(() => new Context());
await second.setEnabled(true);
await mobile.setEnabled(false);
assert.equal(session.type, 'playback', 'Another game still owns playback');
second.destroy();
assert.equal(session.type, 'auto', 'Last owner restores audio session');
await mobile.setEnabled(true);
mobile.destroy();
assert.equal(session.type, 'auto');
assert.equal(changes.at(-1), false);
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    audioSession: {
      get type() {
        return 'auto';
      },
      set type(v) {
        throw Error('Unsupported');
      },
    },
  },
});
const unsupported = createGameAudio(() => new Context());
assert(await unsupported.setEnabled(true));
unsupported.destroy();
if (nav) Object.defineProperty(globalThis, 'navigator', nav);
else delete globalThis.navigator;
retry.destroy();
other.destroy();
race.destroy();
audio.destroy();
assert.equal(context.state, 'closed');
assert.equal(await audio.setEnabled(true), false);
console.log(
  'Audio verified: iOS playback session, interruption UI, 30 reused-context runs, 30 forced repairs, lost ended callbacks, voice-cap recovery, timed reaping, interrupted/blocked output, mute races, superseded resumes, one live context, and all 20 effects.',
);
