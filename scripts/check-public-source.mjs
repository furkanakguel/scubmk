import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
// Only the publishable Git tree is inspected; ignored local files are never read.
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean),
  ),
];
const bad = [];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,
];
for (const file of files) {
  if (!statSync(file, { throwIfNoEntry: false })?.isFile()) continue;
  const protectedPath =
    /(^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.wrangler|outputs|work|node_modules|\.sites-runtime)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|sqlite3|db|mobileconfig|cer)$/.test(
      file,
    );
  if (protectedPath && file !== '.env.example') {
    bad.push(file + ': private/generated path');
    continue;
  }
  if (statSync(file).size > 2_000_000) continue;
  const text = readFileSync(file, 'utf8');
  if (secretPatterns.some((pattern) => pattern.test(text)))
    bad.push(file + ': credential-like content');
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(
  'Public source check passed for ' +
    files.length +
    ' paths. No private runtime files or recognized secret patterns. This is not a complete secret-detection audit.',
);
