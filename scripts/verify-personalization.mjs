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
  DEFAULT_APPEARANCE: D,
  PRESETS,
  readAppearance,
  matchingPreset,
  addRecoveryRecord,
  monthCells,
  istanbulDate,
  eventDay,
} = load('app/lab/personalization.ts');
const { THEMES, readPreferences } = load('app/lab/desktop.ts');
for (const raw of [null, '', 'null', 'false', '[]', '{', 'x'.repeat(4001)])
  assert.deepEqual(readAppearance(raw), D);
const bad = readAppearance(
  '{"accent":"url(https://evil.test)","ink":"__proto__","textSize":9000,"corners":"constructor","motion":"x","recovery":"never","branding":"false","__proto__":{"admin":true},"secret":"PRIVATE"}',
);
assert.deepEqual(bad, D);
assert(!JSON.stringify(bad).includes('PRIVATE'));
for (const p of PRESETS) {
  assert.deepEqual(readAppearance(JSON.stringify(p.appearance)), p.appearance);
  assert.equal(matchingPreset(p.theme, p.appearance), p.id);
  assert.equal(
    matchingPreset(p.theme, {
      ...p.appearance,
      motion: 'reduced',
      branding: false,
      textSize: 'large',
    }),
    p.id,
  );
}
for (const theme of THEMES)
  assert.equal(readPreferences(JSON.stringify({ version: 2, theme })).theme, theme);
let records = [];
for (let i = 0; i < 30; i++)
  records = addRecoveryRecord(records, {
    id: String(i),
    time: '13:40',
    track: 'Web',
    topic: 'Operators',
    code: 'CODE',
    file: 'test.js',
    choice: '||',
    status: 'recovered',
  });
assert.equal(records.length, 12);
assert.equal(records[0].id, '29');
records = addRecoveryRecord(records, { ...records[0], status: 'skipped' });
assert.equal(records.length, 12);
assert.equal(records[0].status, 'skipped');
assert.equal(monthCells(2024, 1).filter(Boolean).length, 29);
assert.equal(monthCells(2025, 1).filter(Boolean).length, 28);
assert.deepEqual(monthCells(2026, 10).slice(0, 7), [null, null, null, null, null, null, 1]);
for (let year = 2000; year <= 2100; year++)
  for (let month = 0; month < 12; month++) {
    const cells = monthCells(year, month),
      days = cells.filter(Boolean);
    assert(cells.length % 7 === 0);
    assert(cells.length >= 28 && cells.length <= 42);
    assert.equal(days[0], 1);
    assert.equal(days.at(-1), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    assert.equal(new Set(days).size, days.length);
  }
assert.equal(istanbulDate(new Date('2026-11-01T21:30:00Z')), '2026-11-02');
assert.equal(eventDay('2026-11-01T18:00'), '2026-11-01');
assert.equal(eventDay('2026-02-30'), null);
assert.equal(eventDay('not a date'), null);
const { initialTerminal, terminalReducer: R, terminalDelay, TRACKS } = load('app/lab/terminal.ts');
let s = R(initialTerminal, { type: 'reveal' });
s = R(s, {
  type: 'choose',
  value: TRACKS[0].questions[0].options.find((v) => v !== TRACKS[0].questions[0].correct),
});
const initial = s;
let cinematic = 0,
  quick = 0,
  blue = 0,
  steps = 0;
while (s.phase !== 'typing' && steps++ < 70) {
  cinematic += terminalDelay(s);
  quick += terminalDelay(s, 'quick');
  if (['crash', 'repair'].includes(s.phase)) blue += terminalDelay(s);
  const skipped = R(s, { type: 'skip-recovery' });
  assert.equal(skipped.phase, 'answer');
  assert(skipped.removed.includes(initial.selected));
  assert.equal(R(skipped, { type: 'tick', session: s.session }), skipped);
  s = R(s, { type: 'tick' });
}
assert.equal(s.phase, 'typing');
assert(blue >= 5000 && blue <= 8000);
assert(cinematic > quick * 1.5);
assert(cinematic < 15000);
let fast = initial;
steps = 0;
while (fast.phase !== 'typing' && steps++ < 15) fast = R(fast, { type: 'tick', instant: true });
assert.equal(fast.phase, 'typing');
for (const name of ['DesktopSettings', 'DesktopCenter', 'DesktopRecovery']) {
  const source = readFileSync(`app/components/${name}.tsx`, 'utf8');
  assert(!/dangerouslySetInnerHTML|eval\(|new Function|fetch\(|\/api\/admin/.test(source));
}
const { labIsActive } = load('app/lab/playback.ts');
assert(
  labIsActive(false, false, false, false, true, true),
  'Immersive OS stays active outside document flow',
);
assert(!labIsActive(false, false, false, false, false, true));
assert(!labIsActive(true, true, false, false, true, true));
assert(!labIsActive(true, false, true, false, true, true));
assert(!labIsActive(true, false, false, true, true, true));
assert(
  !labIsActive(true, false, false, false, true, false),
  'Background labs sleep while desktop is open',
);
const { runCommand, completeCommand } = load('app/lab/shell.ts');
const context = {
  content: { events: [], members: [] },
  history: [],
  uptime: 0,
  theme: 'meadow',
  windows: [],
  now: new Date(),
};
for (const [command, theme] of [
  ['kuzey', 'aurora'],
  ['plan', 'blueprint'],
  ['kum', 'dune'],
])
  assert.deepEqual(runCommand('/tema ' + command, context).effect, { type: 'theme', theme });
assert.deepEqual(completeCommand('tema pl'), ['tema plan']);
console.log(
  `PASS: appearance allowlists and malformed persistence; all ${THEMES.length} wallpapers and ${PRESETS.length} presets; bounded recovery journal; 1,212 calendar months; leap years and Istanbul midnight; scoped event dates; recovery ${cinematic}ms / quick ${quick}ms (blue screen ${blue}ms); skip at every recovery stage; reduced motion and stale timer protection; read-only UI boundary.`,
);
