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
const {
  APPS,
  initialDesktop,
  desktopReducer: R,
  fitRect,
  frameRect,
  defaultRect,
  iconSlots,
  reorderIcons,
  readPreferences,
} = load('app/lab/desktop.ts');
const { COMMANDS, runCommand, calculate, completeCommand } = load('app/lab/shell.ts');
let s = initialDesktop;
for (const app of APPS) {
  s = R(s, { type: 'open', app });
  s = R(s, { type: 'open', app });
  assert.equal(s.focus, app);
  assert.equal(s.open.filter((a) => a === app).length, 1);
  assert.equal(s.order.at(-1), app);
}
assert.equal(R(s, { type: 'open', app: 'admin' }), s);
s = R(s, { type: 'open', app: 'settings' });
s = R(s, { type: 'minimize', app: 'settings' });
assert.equal(s.focus, 'tasks');
assert(s.minimized.includes('settings'));
s = R(s, { type: 'open', app: 'settings' });
assert.equal(s.focus, 'settings');
assert(!s.minimized.includes('settings'));
s = R(s, { type: 'close', app: 'settings' });
assert.equal(s.focus, 'tasks');
assert(!s.open.includes('settings'));
s = R(s, { type: 'desktop' });
assert.equal(s.focus, null);
assert.deepEqual(s.minimized, s.open);
s = R(s, { type: 'open', app: 'console' });
assert.equal(s.focus, 'console');
assert.equal(s.minimized.length, s.open.length - 1);
let geometries = 0;
for (const b of [
  { w: 320, h: 620 },
  { w: 390, h: 700 },
  { w: 768, h: 680 },
  { w: 1440, h: 900 },
  { w: 2200, h: 1100 },
]) {
  for (const app of APPS) {
    const r = defaultRect(app, b, 6);
    assert(r.x >= 0 && r.y >= 0 && r.x + r.w <= b.w && r.y + r.h <= b.h - 46);
    geometries++;
  }
  for (const r of [
    { x: -9999, y: 9999, w: 9999, h: -10 },
    { x: NaN, y: Infinity, w: NaN, h: Infinity },
    { x: 100, y: 50, w: 520, h: 430 },
  ]) {
    const f = fitRect(r, b);
    assert(Object.values(f).every(Number.isFinite));
    assert(f.x >= 0 && f.y >= 0 && f.x + f.w <= b.w && f.y + f.h <= b.h - 46);
    geometries++;
  }
  const full = frameRect({ rect: { x: 0, y: 0, w: 1, h: 1 }, maximized: true, snap: null }, b);
  assert.equal(full.w, b.w);
  assert.equal(full.h, b.h - 46);
  const slots = iconSlots(b);
  assert.equal(slots.length, APPS.length);
  assert.equal(new Set(slots.map((p) => p.x + ',' + p.y)).size, APPS.length);
  assert(slots.every((p) => p.x >= 0 && p.y >= 0 && p.x + p.w <= b.w && p.y + p.h < b.h - 46));
}
const b = { w: 1440, h: 900 },
  f = { rect: defaultRect('console', b), maximized: false, snap: 'left' };
const left = frameRect(f, b),
  right = frameRect({ ...f, snap: 'right' }, b);
assert(left.x + left.w < right.x);
assert.equal(left.w, right.w);
s = R(s, { type: 'frame', app: 'console', frame: f });
s = R(R(s, { type: 'minimize', app: 'console' }), { type: 'open', app: 'console' });
assert.deepEqual(s.frames.console, f);
assert.deepEqual(R(s, { type: 'reset' }).frames, {});
const reordered = reorderIcons([...APPS], 'console', APPS.length - 1);
assert.equal(reordered.at(-1), 'console');
assert.equal(new Set(reordered).size, APPS.length);
assert.deepEqual(reorderIcons([...APPS], 'admin', 0), APPS);
assert.deepEqual(reorderIcons([...APPS], 'console', -1), APPS);
for (const raw of [null, 'null', 'false', '{', '[]', '{"version":1}', 'x'.repeat(21000)])
  assert.deepEqual(readPreferences(raw), {
    version: 2,
    theme: 'meadow',
    icons: [...APPS],
    frames: {},
  });
const safe = readPreferences(
  JSON.stringify({
    version: 2,
    theme: 'javascript:evil',
    icons: ['notes', 'notes', 'admin', '__proto__'],
    frames: {
      console: {
        rect: { x: 90, y: 20, w: 650, h: 500, secret: 'hidden' },
        maximized: true,
        snap: 'left',
        secret: 'hidden',
      },
      game: { rect: { x: 0, y: 0, w: 1e9, h: 500 } },
    },
    secret: 'hidden',
  }),
);
assert.equal(safe.theme, 'meadow');
assert.equal(safe.icons[0], 'notes');
assert.equal(safe.icons.length, APPS.length);
assert.deepEqual(Object.keys(safe.frames), ['console']);
assert(!JSON.stringify(safe).includes('hidden'));
const ctx = {
  content: { events: [], members: [] },
  history: ['/ls', '/dino'],
  uptime: 61,
  theme: 'meadow',
  windows: ['console'],
  now: new Date('2026-11-01T10:00:00Z'),
};
assert.equal(COMMANDS.length, 34);
assert.equal(new Set(COMMANDS.map((c) => c.name)).size, 34);
for (const command of COMMANDS) {
  const args = {
    cd: '/kulup',
    cat: '/basla.txt',
    grep: '"BMK" /basla.txt',
    wc: '/basla.txt',
    find: 'basla',
    close: 'console',
    open: 'notlar',
    atolye: 'web',
    tema: 'gece',
    duzen: 'yan-yana',
    hesap: '(24 + 8) * 3',
    echo: 'merhaba',
  };
  const result = runCommand('/' + command.name + ' ' + (args[command.name] || ''), ctx);
  assert.notEqual(result.kind, 'error', command.name);
  assert(Array.isArray(result.lines));
}
assert.deepEqual(runCommand('/open terminal', ctx).effect, { type: 'open', app: 'console' });
assert.deepEqual(runCommand('/atölye güvenlik', ctx).effect, { type: 'quiz', field: 2 });
assert.deepEqual(runCommand('/tema günbatımı', ctx).effect, { type: 'theme', theme: 'amber' });
for (const raw of [
  '/open https://evil.test',
  '/open javascript:alert(1)',
  '/open __proto__',
  '/open constructor',
  '/open admin',
  '/atolye 9',
  '/tema injected',
  '/open run; rm -rf /',
  '/fetch /api/admin',
  '/echo ' + 'x'.repeat(257),
]) {
  const result = runCommand(raw, ctx);
  assert.equal(result.kind, 'error', raw);
  assert.equal(result.effect, undefined);
}
const payload = '<img src=x onerror=alert(1)><script>alert(1)</script>';
assert.deepEqual(runCommand('/echo ' + payload, ctx).lines, [payload]);
for (const [source, value] of [
  ['(24 + 8) * 3', 96],
  ['-2 * (3 + 4)', -14],
  ['.5+1.25', 1.75],
  ['7%3', 1],
  ['0.1+0.2', 0.3],
  ['2--3', 5],
  ['20 / 4 * 2', 10],
])
  assert.equal(calculate(source), value);
for (const source of [
  '',
  '1/0',
  '1%0',
  '2(3)',
  '(3+2',
  '2+3)',
  '1e9',
  'globalThis',
  'process.exit()',
  '2**3',
  '[]+{}',
  '1..2',
  '1;alert(1)',
  '('.repeat(20) + '1' + ')'.repeat(20),
  '1+'.repeat(40) + '1',
])
  assert.throws(() => calculate(source), source);
assert.deepEqual(completeCommand('/ne'), ['/neofetch']);
assert.deepEqual(completeCommand('/open n'), ['/open notlar', '/open notes']);
assert.deepEqual(completeCommand('/constructor'), []);
for (const file of [
  'app/lab/shell.ts',
  'app/components/DesktopShell.tsx',
  'app/components/DesktopUtilities.tsx',
  'app/components/DesktopGrid.tsx',
]) {
  const source = readFileSync(file, 'utf8');
  assert(
    !/dangerouslySetInnerHTML|\beval\s*\(|new Function|fetch\s*\(|\/api\/admin|club_accounts/.test(
      source,
    ),
    file,
  );
}
console.log(
  `PASS: ${geometries} window geometry cases; focus/z-order, minimize/restore, layout, icon ordering and validated persistence; all 34 shell commands; denied routes/prototype keys/injections; bounded calculator; plain-text rendering boundaries.`,
);
