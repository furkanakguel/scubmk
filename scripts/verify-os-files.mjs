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
const { createFileSystem, findFile, listFiles, resolvePath, treeLines } =
  load('app/lab/filesystem.ts');
const { runCommand, completeCommand } = load('app/lab/shell.ts');
const content = {
  events: [
    {
      title: 'BMK Atölyesi',
      category: 'Atölye',
      date: '2026-11-15',
      location: 'Sivas',
      description: 'Kod yazalım.',
      email: 'PRIVATE_EMAIL',
      token: 'PRIVATE_TOKEN',
    },
  ],
  members: [
    {
      name: 'Test Üyesi',
      role: 'Asil üye',
      team: 'Teknik ekip',
      department: 'Bilgisayar Mühendisliği',
      bio: 'Birlikte üretelim.',
      password: 'PRIVATE_PASSWORD',
      phone: 'PRIVATE_PHONE',
    },
  ],
};
const files = createFileSystem(content),
  ctx = {
    content,
    files,
    history: [],
    uptime: 120,
    theme: 'meadow',
    windows: ['console', 'files', 'notes'],
    minimized: ['notes'],
    focus: 'console',
    now: new Date('2026-11-01T10:00:00Z'),
    cwd: '/',
  };
assert.equal(new Set(files.map((f) => f.path)).size, files.length);
assert(!JSON.stringify(files).includes('PRIVATE_'));
assert.equal(listFiles(files, '/etkinlikler').length, 1);
assert.equal(listFiles(files, '/ekip').length, 1);
let cwd = '/';
for (const [command, expected] of [
  ['cd kulup', '/kulup'],
  ['cd ../rehber', '/rehber'],
  ['cd ../../../../', '/'],
  ['cd /etkinlikler', '/etkinlikler'],
  ['cd', '/'],
]) {
  const r = runCommand(command, { ...ctx, cwd });
  assert.equal(r.effect?.type, 'cd');
  cwd = r.effect.path;
  assert.equal(cwd, expected);
}
assert.deepEqual(
  runCommand('cat hakkimizda.txt', { ...ctx, cwd: '/kulup' }).lines,
  findFile(files, '/kulup/hakkimizda.txt').text.split('\n'),
);
assert(runCommand('tree /', ctx).lines.some((l) => l.includes('001-profil.txt')));
assert(
  runCommand('grep "Birlikte" /ekip/001-profil.txt', ctx).lines.some((l) =>
    l.includes('Birlikte üretelim.'),
  ),
);
assert(runCommand('grep "[.*]" /basla.txt', ctx).lines.includes('Eşleşen satır yok.'));
assert(runCommand('wc /basla.txt', ctx).lines[0].includes('kelime'));
assert.deepEqual(runCommand('find profil', ctx).lines, ['/ekip/001-profil.txt']);
assert(runCommand('ps', ctx).lines.some((l) => l.includes('küçültüldü') && l.includes('notes')));
assert.deepEqual(runCommand('close notlar', ctx).effect, { type: 'close', app: 'notes' });
for (const command of [
  'cat /api/admin',
  'cat /etc/passwd',
  'cd /api',
  'cat ../../api/admin',
  'open __proto__',
  'open constructor',
  'open javascript:alert(1)',
  'cat https://example.com/file',
  'cat /basla.txt; whoami',
  'cat /basla.txt | fetch /api/admin',
  'grep "x" /api/admin',
  'close admin',
  'close game',
  'cd ' + 'x'.repeat(257),
])
  assert.equal(runCommand(command, ctx).kind, 'error', command);
for (const bad of [
  'https://example.com',
  'x\\y',
  'x\u0000y',
  '/api?key=1',
  '/x#y',
  'x'.repeat(257),
])
  assert.equal(resolvePath(bad), null);
assert.deepEqual(completeCommand('cat hak', files, '/kulup'), ['cat hakkimizda.txt']);
assert.deepEqual(completeCommand('cd /reh', files), ['cd /rehber/']);
assert.deepEqual(completeCommand('cat /rehber/kis', files), ['cat /rehber/kisayollar.txt']);
const large = createFileSystem({
  members: Array.from({ length: 500 }, () => ({ ...content.members[0], bio: 'x'.repeat(40000) })),
  events: Array.from({ length: 500 }, () => ({
    ...content.events[0],
    description: 'x'.repeat(40000),
  })),
});
assert.equal(listFiles(large, '/ekip').length, 200);
assert.equal(listFiles(large, '/etkinlikler').length, 200);
assert(treeLines(large).length <= 500);
assert(large.every((f) => (f.text?.length || 0) <= 32000));
for (const name of [
  'app/lab/filesystem.ts',
  'app/lab/shell.ts',
  'app/components/DesktopFiles.tsx',
  'app/components/DesktopLauncher.tsx',
  'app/components/DesktopTasks.tsx',
]) {
  const source = readFileSync(name, 'utf8');
  assert(
    !/dangerouslySetInnerHTML|\beval\s*\(|new Function|fetch\s*\(|\/api\/admin|club_accounts/.test(
      source,
    ),
    name,
  );
}
console.log(
  'PASS: shell/explorer shared filesystem, relative/absolute navigation, literal text search, completion, public-only field projection, 200-record/32KB limits, no host/API access, injection and prototype-key rejection, window-only process management.',
);
