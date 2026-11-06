import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import './sites-env.mjs';
// No --remote option exists here. Production migrations belong to the hosting workflow.
if (process.argv.length > 2)
  throw Error('This command takes no arguments and only migrates outputs/team-state.');
const source = path.resolve('dist/server/wrangler.json');
let config;
try {
  config = JSON.parse(await readFile(source, 'utf8'));
} catch {
  throw Error('Run npm run build before npm run db:migrate:local.');
}
const directory = path.resolve('outputs/team-tools');
await mkdir(directory, { recursive: true });
const bindings = config.d1_databases?.map((binding) => ({
  ...binding,
  migrations_dir: path.resolve('drizzle'),
}));
if (!bindings?.some((binding) => binding.binding === 'DB'))
  throw Error('The build must declare the DB binding.');
// Only the binding settings are needed for migrations. Do not copy runtime secrets.
const filename = path.join(directory, 'wrangler.json');
await writeFile(
  filename,
  JSON.stringify(
    {
      name: 'scubmk-local-migrations',
      compatibility_date: config.compatibility_date,
      d1_databases: bindings,
    },
    null,
    2,
  ),
);
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    filename,
    '--persist-to',
    path.resolve('outputs/team-state'),
  ],
  { stdio: 'inherit', env: { ...process.env, CI: 'true' } },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
