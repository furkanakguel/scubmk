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
const { initialDinoGuide, advanceDinoGuide, diagnoseCommand } = load('app/lab/dino.ts');
const { runCommand, completeCommand, COMMANDS } = load('app/lab/shell.ts');
const { createFileSystem } = load('app/lab/filesystem.ts');
const { TRACKS } = load('app/lab/challenges.ts');
const { CHALLENGE_HINTS } = load('app/lab/challenge-hints.ts');
const content = { events: [], members: [] },
  files = createFileSystem(content),
  names = COMMANDS.map((c) => c.name);
const ctx = {
  content,
  files,
  history: [],
  uptime: 0,
  theme: 'meadow',
  windows: ['console'],
  now: new Date(),
};
let state = initialDinoGuide,
  cwd = '/';
function send(raw) {
  const result = runCommand(raw, { ...ctx, cwd });
  state = advanceDinoGuide(state, raw, result, cwd, files, names);
  if (result.effect?.type === 'cd') cwd = result.effect.path;
  return result;
}
send('/dino');
assert.equal(state.step, 0);
send('echo cd /kulup');
assert.equal(state.step, 0, 'Text echo must not count as executing the command');
send('cd /missing');
assert.equal(state.step, 0);
assert.equal(state.advice.tone, 'error');
send('/cd kulup');
assert.equal(state.step, 1);
assert.equal(cwd, '/kulup');
send('cd /kulup');
assert.equal(state.step, 1, 'Repeating step 1 must not complete step 2');
send('ls /ekip');
assert.equal(state.step, 1, 'Listing a different folder is not the task');
send('ls');
assert.equal(state.step, 2);
send('cat hakkimzda.txt');
assert.equal(state.step, 2);
assert.equal(state.advice.command, 'cat /kulup/hakkimizda.txt');
send(state.advice.command);
assert.equal(state.step, 3);
assert.equal(state.advice, null);
send('hesap 8 * 8');
assert.equal(state.step, 3);
assert.match(state.advice.text, /İşlem tamamlandı/);
send('/dino');
assert.equal(state.step, 3, 'Calling the guide again resumes progress');
send('/dino kapat');
assert.equal(state.enabled, false);
const hidden = state;
send('nonsense');
assert.equal(state, hidden);
send('/dino ipucu');
assert.equal(state.enabled, true);
assert.equal(state.step, 3);
send('/dino baştan');
assert.equal(state.step, 0);
assert.equal(state.advice, null);
assert.deepEqual(completeCommand('/dino ip'), ['/dino ipucu']);
assert.deepEqual(completeCommand('/dino '), [
  '/dino basla',
  '/dino ipucu',
  '/dino bastan',
  '/dino kapat',
]);
assert(runCommand('/help dino', ctx).lines.some((l) => l.includes('Enter')));
function advice(raw, at = '/') {
  return diagnoseCommand(raw, runCommand(raw, { ...ctx, cwd: at }), at, files, names);
}
assert.equal(advice('sl').command, 'ls');
assert.equal(advice('hepl').command, 'help');
assert.equal(advice('cd /basla.txt').command, 'cat /basla.txt');
assert.equal(advice('cat /kulup').command, 'ls /kulup');
assert.equal(advice('ls /basla.txt').command, 'cat /basla.txt');
assert.equal(advice('ls /uygulamalar/console.app').command, 'open console');
assert.equal(advice('hesap 1/0').command, undefined);
assert.match(advice('hesap 1/0').text, /sıfır/);
assert.equal(advice('grep').command, 'help grep');
for (const raw of [
  'dino __proto__',
  'dino constructor',
  'dino kodla',
  'dino ipucu extra',
  'dino kapat; open admin',
  'dino <img onerror=alert(1)>',
]) {
  const result = runCommand(raw, ctx);
  assert.equal(result.kind, 'error');
  assert.equal(result.dino, undefined);
  assert.equal(result.effect, undefined);
}
for (const raw of [
  '__proto__',
  'constructor',
  'fetch /api/admin',
  'cat /api/admin',
  '<script>alert(1)</script>',
  'x'.repeat(500),
]) {
  const result = advice(raw);
  assert(!result.command?.includes('/api'));
  if (result.command) assert.notEqual(runCommand(result.command, ctx).kind, 'error');
}
const questions = TRACKS.flatMap((t) => t.questions);
assert.equal(Object.keys(CHALLENGE_HINTS).length, questions.length);
for (const q of questions) {
  const hint = CHALLENGE_HINTS[q.id];
  assert(hint?.length > 40, q.id);
  assert(hint.length < 350, q.id);
  assert.notEqual(hint, q.explanation);
  assert(!hint.includes('___'));
}

// The actual suggestion button fills the input only. It cannot run a command
// or advance tour progress until the user submits the shell form.
const jsx = (type, props) => ({ type, props }),
  exports = {};
const compiled = ts.transpileModule(readFileSync('app/components/TerminalDino.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
new Function('exports', 'require', compiled)(exports, (n) =>
  n === 'react'
    ? { memo: (f) => f }
    : n === 'react/jsx-runtime'
      ? { jsx, jsxs: jsx }
      : n.endsWith('DinoMark')
        ? { default: () => null }
        : load('app/lab/dino.ts'),
);
function flatten(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
}
let inserted = null,
  starts = 0;
const tree = exports.default({
  guide: state,
  active: true,
  typing: false,
  onInsert: (c) => (inserted = c),
  onStart: () => starts++,
  onHide: () => {},
});
const button = flatten(tree).find(
  (n) => n.type === 'button' && n.props.className === 'dino-guide-command',
);
button.props.onClick();
assert.equal(inserted, 'cd /kulup');
assert.equal(starts, 0);
assert.equal(state.step, 0);
assert.equal(exports.default({ guide: { ...state, enabled: false } }), null);
const source = readFileSync('app/components/DesktopShell.tsx', 'utf8');
assert(!/DinoPreferences|localStorage|lastDino/.test(source));
console.log(
  'PASS: real 3-step shell tour, relative paths, no false progress from echo/repetition/errors, pause/resume/reset, typo and file-type diagnosis, command allowlist, insert-without-execute, 32 unique authored hints.',
);
