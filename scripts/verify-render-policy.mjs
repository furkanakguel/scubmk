import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const exports = {};
const js = ts.transpileModule(readFileSync('app/lab/render-policy.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports', js)(exports);
const { voxelFrameChanged, settle, frameDue } = exports;
for (const logo of [0, 1]) {
  let previous = null,
    uploads = 0;
  for (let i = 0; i < 600; i++) {
    const next = { explode: 0, logo, burst: 0, clock: i / 60 };
    if (voxelFrameChanged(previous, next)) {
      uploads++;
      previous = next;
    }
  }
  assert.equal(uploads, 1, 'A settled dino or BMK mark must reuse its instance matrices.');
}
for (const shape of [
  { explode: 1, logo: 0, burst: 0 },
  { explode: 0, logo: 1, burst: 1 },
]) {
  assert(
    voxelFrameChanged({ ...shape, clock: 1 }, { ...shape, clock: 2 }),
    'Orbit and burst animation must remain live.',
  );
}
for (const key of ['explode', 'logo', 'burst']) {
  const previous = { explode: 0, logo: 0, burst: 0, clock: 1 };
  assert(
    voxelFrameChanged(previous, { ...previous, [key]: 0.1 }),
    'Every shape change must upload new geometry.',
  );
}
let value = 1,
  previous = { explode: 1, logo: 0, burst: 0, clock: 0 },
  lastUpdate = 0;
for (let i = 1; i < 600; i++) {
  value = settle(value * 0.9, 0);
  const next = { explode: value, logo: 0, burst: 0, clock: i / 60 };
  if (voxelFrameChanged(previous, next)) {
    previous = next;
    lastUpdate = i;
  }
}
assert.equal(value, 0);
assert.equal(previous.explode, 0);
assert(lastUpdate < 100);
for (const hz of [60, 120, 144, 240])
  for (const mobile of [false, true]) {
    let last = 0,
      renders = 0;
    for (let frame = 1; frame <= hz; frame++) {
      const now = (frame * 1000) / hz;
      if (frameDue(now, last, mobile)) {
        renders++;
        last = now;
      }
    }
    assert(renders <= (mobile ? 31 : 61), `Unexpected draw count on ${hz} Hz: ${renders}`);
    assert(renders >= (mobile ? 27 : 48), `Animation cadence too low on ${hz} Hz: ${renders}`);
  }
const before = new RoundedBoxGeometry(0.222, 0.222, 0.222, 2, 0.025);
const after = new RoundedBoxGeometry(0.222, 0.222, 0.222, 1, 0.025);
assert.equal(after.attributes.position.count, 324);
assert.equal(before.attributes.position.count, 900);
before.dispose();
after.dispose();
console.log(
  'PASS: settled shapes reuse buffers for 600 frames; orbit/burst/shape changes stay live; animation settles without drift; desktop/mobile draw caps at 60–240 Hz; cube vertices 900 → 324.',
);
