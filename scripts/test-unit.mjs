import { spawnSync } from 'node:child_process';
const suites = [
  'verify-runner',
  'verify-game-audio',
  'verify-workshop',
  'verify-desktop',
  'verify-os-files',
  'verify-personalization',
  'verify-icon-placement',
  'verify-terminal-dino',
  'verify-render-policy',
  'verify-card-art',
  'verify-security-races',
  'verify-recovery',
  'verify-qr',
  'verify-chatbot',
];
for (const suite of suites) {
  console.log('\nRunning ' + suite);
  const result = spawnSync(process.execPath, ['scripts/' + suite + '.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, BMK_QR_INTEGRATION: '0' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  '\nAll ' +
    suites.length +
    ' local suites passed. No running server or production credentials were used.',
);
