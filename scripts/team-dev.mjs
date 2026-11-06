import { spawn } from 'node:child_process';
import path from 'node:path';
// Shared by local migrations and the team's dev server; isolated from phone QA.
const state = path.resolve('outputs/team-state');
const child = spawn(
  process.execPath,
  ['scripts/run-framework.mjs', 'dev', '--host', '127.0.0.1', '--port', '5174', '--strictPort'],
  {
    stdio: 'inherit',
    env: { ...process.env, BMK_QA_STATE: state },
  },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => process.exit(code ?? 1));
