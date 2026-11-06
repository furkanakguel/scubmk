import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
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
  TRACKS,
  QUESTION_COUNT,
  initialTerminal,
  terminalReducer: R,
  terminalDelay,
  APPS,
  recovering,
} = load('app/lab/terminal.ts');
const { publicDesktopContent, desktopPath, memberGroup } = load('app/lab/public-content.ts');
assert.equal(QUESTION_COUNT, 32);
const ids = new Set();
let flows = 0,
  codes = 0;
async function runJS(code) {
  const outputs = [];
  const ctx = vm.createContext({
    console: { log: (...args) => outputs.push(args.map(String).join(' ')) },
    URL,
    queueMicrotask,
  });
  vm.runInContext(code, ctx, { timeout: 500 });
  await new Promise((resolve) => setImmediate(resolve));
  return outputs.join('\n');
}
for (let f = 0; f < TRACKS.length; f++)
  for (let qi = 0; qi < TRACKS[f].questions.length; qi++) {
    const q = TRACKS[f].questions[qi];
    assert(!ids.has(q.id));
    ids.add(q.id);
    assert.equal(q.code.split('___').length, 2);
    assert.equal(new Set(q.options).size, 3);
    assert(q.options.includes(q.correct));
    let s = R(R(initialTerminal, { type: 'field', index: f }), { type: 'question', index: qi });
    assert.equal(R(s, { type: 'choose', value: q.correct }), s);
    let ticks = 0;
    while (s.phase !== 'answer' && ticks++ < 2000) {
      assert(terminalDelay(s) > 0);
      s = R(s, { type: 'tick' });
    }
    assert.equal(s.phase, 'answer');
    assert.equal(s.chars, q.code.length);
    for (const wrong of q.options.filter((o) => o !== q.correct)) {
      s = R(s, { type: 'choose', value: wrong });
      assert.equal(s.phase, 'warnings');
      assert(s.removed.includes(wrong));
      for (const action of [
        { type: 'choose', value: q.correct },
        { type: 'open', app: 'team' },
        { type: 'close' },
        { type: 'field', index: 2 },
      ])
        assert.equal(R(s, action), s, 'Recovery is not interruptible by stale interactions');
      const phases = [],
        progress = [];
      let steps = 0;
      while (s.phase !== 'typing' && steps++ < 70) {
        if (!phases.includes(s.phase)) phases.push(s.phase);
        if (s.phase === 'repair') progress.push(s.progress);
        s = R(s, { type: 'tick', session: s.session });
      }
      assert.deepEqual(phases, [
        'warnings',
        'crash',
        'repair',
        'reboot',
        'desktop-return',
        'restore',
      ]);
      assert.equal(progress.at(-1), 100);
      assert(progress.every((p, i) => p >= 0 && p <= 100 && (!i || p >= progress[i - 1])));
      assert.equal(s.chars, 0);
      assert.equal(s.question, qi);
      assert.equal(s.field, f);
      assert.equal(s.app, 'terminal');
      s = R(s, { type: 'reveal' });
      assert.equal(R(s, { type: 'choose', value: wrong }), s);
    }
    assert.deepEqual(
      q.options.filter((o) => !s.removed.includes(o)),
      [q.correct],
    );
    s = R(s, { type: 'choose', value: q.correct });
    assert.equal(s.phase, 'success');
    assert.equal(s.attempt, 2);
    assert(s.solved.includes(q.id));
    s = R(s, { type: 'next' });
    assert.equal(s.question, (qi + 1) % 8);
    assert.deepEqual(s.removed, []);
    flows++;
    if (q.language === 'JavaScript') {
      assert.equal(await runJS(q.code.replace('___', q.correct)), q.expected, q.id);
    } else if (q.language === 'Python') {
      const p = spawnSync('python3', ['-c', q.code.replace('___', q.correct)], {
        encoding: 'utf8',
        timeout: 1500,
      });
      assert.equal(p.status, 0, p.stderr);
      assert.equal(p.stdout.trim(), q.expected, q.id);
    } else {
      const db = new DatabaseSync(':memory:');
      if (q.id === 'atomic-ticket') {
        db.exec(
          "CREATE TABLE tickets(id TEXT PRIMARY KEY,used INTEGER);INSERT INTO tickets VALUES('ticket',0),('other',0)",
        );
        const stmt = db.prepare(q.code.replace('___', q.correct));
        assert.equal(stmt.all('ticket').length, 1);
        assert.equal(stmt.all('ticket').length, 0);
        assert.equal(db.prepare("SELECT used FROM tickets WHERE id='other'").get().used, 0);
      } else {
        db.exec(
          "CREATE TABLE users(id TEXT,email TEXT);INSERT INTO users VALUES('ece','ece@example.test')",
        );
        const stmt = db.prepare(q.code.replace('___', q.correct));
        assert.equal(stmt.get('ece@example.test').id, q.expected);
        assert.equal(stmt.get("' OR 1=1 --"), undefined);
      }
      db.close();
    }
    codes++;
  }
let s = R(initialTerminal, { type: 'tick' });
const chars = s.chars,
  frame = s.frame;
s = R(s, { type: 'minimize' });
assert.equal(s.app, null);
assert(s.openApps.includes('terminal'));
assert.equal(R(s, { type: 'tick' }), s, 'Minimized typing pauses');
s = R(s, { type: 'open', app: 'terminal' });
assert.equal(s.chars, chars);
assert.equal(s.frame, frame);
s = R(s, { type: 'maximize' });
assert(s.maximized);
s = R(s, { type: 'maximize' });
assert(!s.maximized);
for (const app of APPS) {
  s = R(s, { type: 'open', app });
  s = R(s, { type: 'open', app });
  assert.equal(s.app, app);
  assert.equal(s.openApps.filter((a) => a === app).length, 1);
}
s = R(s, { type: 'close' });
assert.equal(s.app, null);
assert(!s.openApps.includes(APPS.at(-1)));
assert.equal(R(s, { type: 'open', app: 'admin' }), s);
s = R(s, { type: 'field', index: 1 });
assert.equal(R(s, { type: 'tick', session: s.session - 1 }), s);
assert.equal(R(s, { type: 'question', index: 99 }), s);
s = R(s, { type: 'reveal' });
const wrong = TRACKS[1].questions[0].options.find((o) => o !== TRACKS[1].questions[0].correct);
s = R(s, { type: 'choose', value: wrong });
s = R(s, { type: 'skip-recovery' });
assert.equal(s.phase, 'answer');
assert(s.removed.includes(wrong));
assert.equal(s.question, 0);
let fast = initialTerminal;
let turns = 0;
while (fast.phase !== 'answer' && turns++ < 15) fast = R(fast, { type: 'tick', instant: true });
assert.equal(fast.phase, 'answer');
assert.equal(fast.chars, TRACKS[0].questions[0].code.length);
const secret = {
  email: 'private@example.test',
  password_hash: 'private-hash',
  card_code: 'secret-card',
  admin: 'private-admin',
  recovery_hash: 'private-recovery',
};
const member = {
  id: 'public-member',
  name: 'Public Name',
  slug: 'public-name',
  role: 'Başkan yardımcısı',
  team: 'Yönetim',
  department: 'Bilgisayar',
  bio: '</script><img onerror="alert(1)">',
  photo_id: 'public-photo',
  photo_alt: 'Public',
  published: 1,
  archived: 0,
  ...secret,
};
const event = {
  id: 'event',
  title: 'Public event',
  description: 'Public',
  category: 'Atölye',
  date: '2026-11-20',
  location: 'SCÜ',
  image_id: 'photo',
  image_alt: '',
  published: 1,
  archived: 0,
  ...secret,
};
const result = publicDesktopContent(
  [member, { ...member, published: 0 }, { ...member, archived: 1 }],
  [event, { ...event, published: 0 }, { ...event, archived: 1 }],
);
assert.equal(result.members.length, 1);
assert.equal(result.events.length, 1);
assert.equal(memberGroup(result.members[0]), 'board');
for (const value of Object.values(secret)) assert(!JSON.stringify(result).includes(value));
assert.deepEqual(
  Object.keys(result.members[0]).sort(),
  ['id', 'name', 'slug', 'role', 'team', 'department', 'bio', 'photoId', 'photoAlt'].sort(),
);
assert.deepEqual(
  Object.keys(result.events[0]).sort(),
  ['id', 'title', 'description', 'category', 'date', 'location', 'imageId', 'imageAlt'].sort(),
);
for (const [kind, prefix] of [
  ['event', '/etkinlik/'],
  ['member', '/ekip/'],
  ['photo', '/api/media/'],
]) {
  const p = desktopPath[kind]('//evil.test/?token=<script>');
  assert(p.startsWith(prefix));
  assert(!p.slice(prefix.length).includes('/'));
  assert(!p.includes('<'));
}
const publicUI = readFileSync('app/components/DesktopApps.tsx', 'utf8');
assert(!/dangerouslySetInnerHTML|eval\(|new Function|\/api\/admin|club_accounts/.test(publicUI));
const cli = readFileSync('app/components/CodeWorkshop.tsx', 'utf8');
assert(!/dangerouslySetInnerHTML|eval\(|new Function/.test(cli));
assert.match(
  cli,
  /className="os-desktop-surface"\s+inert=\{locked\s*\|\|\s*launcher\s*\|\|\s*center\}/,
);
assert.match(cli, /locked=\{locked\s*\|\|\s*launcher\s*\|\|\s*center\}/);
const home = readFileSync('app/page.tsx', 'utf8');
assert.match(home, /publicDesktopContent\(members,\s*desktopEvents\.results\)/);
assert(home.includes('WHERE published=1 AND archived=0'));
assert(!home.includes('club_accounts'));
console.log(
  `PASS: ${flows} complete quiz/recovery flows; ${codes} executed correct code samples; 32 unique questions; both wrong options removed per question; 100% repair → boot → desktop → same question; minimize/close/maximize/taskbar restoration; stale timers; reduced motion; app allowlist; public DTO privacy and encoded links.`,
);
