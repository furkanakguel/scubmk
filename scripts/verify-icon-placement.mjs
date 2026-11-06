import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, (name) =>
    load(path.resolve(path.dirname(file), name + '.ts')),
  );
  return exports;
}
const { APPS } = load('app/lab/desktop.ts');
const {
  emptyIconLayouts,
  readIconLayouts,
  iconProfile,
  iconArea,
  layoutIcons,
  moveIcon,
  dragIcon,
  iconsOverlap,
} = load('app/lab/icon-layout.ts');
const close = (a, b) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function same(a, b) {
  close(a.x, b.x);
  close(a.y, b.y);
}
function valid(positions, b) {
  const rs = Object.values(positions);
  assert.equal(rs.length, APPS.length);
  for (const r of rs) {
    assert(r.x >= 0 && r.y >= 0 && r.x + r.w <= b.w && r.y + r.h <= b.h - 46);
  }
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++)
      assert(!iconsOverlap(rs[i], rs[j]), `overlap ${i}/${j} at ${b.w}x${b.h}`);
}
const desktop = { w: 1440, h: 790 },
  original = layoutIcons(APPS, {}, desktop);
let saved = moveIcon(APPS, {}, 'console', { x: 731.5, y: 417.25 }, desktop);
let placed = layoutIcons(APPS, saved, desktop);
same(placed.console, { x: 731.5, y: 417.25 });
for (const app of APPS.filter((a) => a !== 'console')) same(placed[app], original[app]);
const before = placed;
saved = moveIcon(APPS, saved, 'console', placed.events, desktop);
placed = layoutIcons(APPS, saved, desktop);
valid(placed, desktop);
for (const app of APPS.filter((a) => a !== 'console')) same(before[app], placed[app]);
const profiles = {
  wide: saved,
  compact: moveIcon(APPS, {}, 'game', { x: 193, y: 497 }, { w: 392, h: 740 }),
};
const stored = readIconLayouts(JSON.stringify({ version: 1, layouts: profiles }));
assert.deepEqual(stored, profiles);
assert.equal(iconProfile(desktop), 'wide');
assert.equal(iconProfile({ w: 392, h: 740 }), 'compact');
for (const raw of [null, 'null', 'false', '{', '[]', '{"version":2}', 'x'.repeat(12001)])
  assert.deepEqual(readIconLayouts(raw), emptyIconLayouts());
const bad = readIconLayouts(
  '{"version":1,"layouts":{"wide":{"console":{"x":0.4,"y":0.6,"secret":"private"},"admin":{"x":0,"y":0},"__proto__":{"admin":true},"terminal":{"x":"0","y":0},"game":{"x":2,"y":-1}},"compact":{"notes":{"x":null,"y":0}}}}',
);
assert.deepEqual(bad, { wide: { console: { x: 0.4, y: 0.6 } }, compact: {} });
assert(!JSON.stringify(bad).includes('private'));
let moves = 0;
for (const b of [
  { w: 320, h: 620 },
  { w: 392, h: 740 },
  { w: 639, h: 620 },
  { w: 768, h: 580 },
  { w: 844, h: 300 },
  { w: 1180, h: 790 },
  { w: 1440, h: 900 },
]) {
  let layout = {};
  valid(layoutIcons(APPS, layout, b), b);
  for (let i = 0; i < 90; i++) {
    const target = { x: ((i * 137.73) % (b.w + 500)) - 150, y: ((i * 191.31) % (b.h + 400)) - 100 };
    layout = moveIcon(APPS, layout, APPS[i % APPS.length], target, b);
    const result = layoutIcons(APPS, layout, b);
    valid(result, b);
    const reloaded = readIconLayouts(
      JSON.stringify({ version: 1, layouts: { wide: layout, compact: {} } }),
    ).wide;
    assert.deepEqual(layoutIcons(APPS, reloaded, b), result);
    moves++;
  }
  for (const resized of [
    { w: b.w * 0.8, h: b.h * 0.9 },
    { w: b.w * 1.2, h: b.h * 1.1 },
  ]) {
    const r = layoutIcons(APPS, layout, resized);
    for (const box of Object.values(r))
      assert(box.x + box.w <= resized.w && box.y + box.h <= resized.h - 46);
  }
}
for (const scale of [
  { x: 1, y: 1 },
  { x: 0.75, y: 0.75 },
  { x: 2, y: 1.5 },
])
  same(
    dragIcon(
      { x: 8, y: 8 },
      { x: 100, y: 50 },
      { x: 100 + 403 * scale.x, y: 50 + 217 * scale.y },
      scale,
      desktop,
    ),
    { x: 411, y: 225 },
  );
const edge = dragIcon(
    { x: 10, y: 10 },
    { x: 0, y: 0 },
    { x: 1e6, y: 1e6 },
    { x: 1, y: 1 },
    desktop,
  ),
  area = iconArea(desktop);
same(edge, { x: area.maxX, y: area.maxY });

// Unit-test the real component's pointer handlers, independent of any browser runtime.
const callbacks = new Map();
let nextFrame = 0;
globalThis.requestAnimationFrame = (cb) => {
  callbacks.set(++nextFrame, cb);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => callbacks.delete(id);
const jsx = (type, props) => ({ type, props });
const mockReact = {
  memo: (f) => f,
  useRef: (v) => ({ current: v }),
  useState: (v) => [v, () => {}],
  useMemo: (f) => f(),
  useEffect: () => {},
};
const component = {};
const compiled = ts.transpileModule(readFileSync('app/components/DesktopGrid.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
new Function('exports', 'require', compiled)(component, (name) =>
  name === 'react'
    ? mockReact
    : name === 'react/jsx-runtime'
      ? { jsx, jsxs: jsx }
      : name.endsWith('icon-layout')
        ? load('app/lab/icon-layout.ts')
        : name.endsWith('DesktopIcons')
          ? { DesktopIcon: () => null, appLabels: Object.fromEntries(APPS.map((a) => [a, a])) }
          : load('app/lab/desktop.ts'),
);
function fixture(editing = false) {
  let result = null,
    opened = 0;
  const tree = component.default({
    order: APPS,
    positions: {},
    bounds: desktop,
    editing,
    enabled: true,
    onPositions: (p) => (result = p),
    onOpen: () => opened++,
  });
  const button = tree.props.children[1][0].props;
  const captures = new Set(),
    node = {
      parentElement: {
        clientWidth: 1440,
        clientHeight: 744,
        getBoundingClientRect: () => ({ width: 1080, height: 558 }),
      },
      focus() {},
      setPointerCapture: (id) => captures.add(id),
      hasPointerCapture: (id) => captures.has(id),
      releasePointerCapture: (id) => captures.delete(id),
      style: {},
      dataset: {},
    };
  const event = (x, y, extra = {}) => ({
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    isPrimary: true,
    pointerType: 'mouse',
    currentTarget: node,
    preventDefault() {},
    ...extra,
  });
  return {
    button,
    node,
    event,
    get result() {
      return result;
    },
    get opened() {
      return opened;
    },
  };
}
let f = fixture();
f.button.onPointerDown(f.event(100, 100));
f.button.onPointerMove(f.event(400, 250));
for (const cb of callbacks.values()) cb();
callbacks.clear();
assert(f.node.style.transform.includes('400px'));
f.button.onPointerUp(f.event(625, 400));
f.button.onClick();
assert.equal(f.opened, 0);
same(layoutIcons(APPS, f.result, desktop).console, { x: 708, y: 408 });
assert.equal(f.node.style.transform, '');
f = fixture();
f.button.onPointerDown(f.event(100, 100));
f.button.onPointerMove(f.event(500, 300));
f.button.onPointerCancel();
f.button.onClick();
assert.equal(f.result, null);
assert.equal(f.opened, 0);
assert.equal(callbacks.size, 0);
f = fixture();
f.button.onPointerDown(f.event(100, 100));
f.button.onPointerUp(f.event(102, 101));
f.button.onClick();
assert.equal(f.result, null);
assert.equal(f.opened, 1);
f = fixture(true);
f.button.onPointerDown(f.event(100, 100, { pointerType: 'touch' }));
f.button.onPointerUp(f.event(625, 400, { pointerType: 'touch' }));
assert(f.result);
f.button.onClick();
assert.equal(f.opened, 0);
f = fixture();
f.button.onPointerDown(f.event(100, 100, { pointerType: 'touch' }));
f.button.onPointerUp(f.event(100, 100, { pointerType: 'touch' }));
f.button.onClick();
assert.equal(f.opened, 1);
assert.equal(f.result, null);
f = fixture();
f.button.onPointerDown(f.event(100, 100));
f.button.onPointerMove(f.event(500, 300));
f.button.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
assert.equal(f.result, null);
assert.equal(callbacks.size, 0);
console.log(
  `PASS: ${moves} free drops; exact off-grid positions; collision avoidance; scaled drag and final release coordinates; cancel/Escape cleanup; click/drag separation; touch edit mode; profile persistence and input validation; viewport bounds.`,
);
