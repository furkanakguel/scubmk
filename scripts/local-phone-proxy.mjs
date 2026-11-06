// LAN access to the app only. Wrangler's local database/explorer endpoints stay on loopback.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((a) => a && a.family === 'IPv4' && !a.internal)
  .map((a) => a.address);
const host = process.argv[2];
if (!host || !addresses.includes(host)) throw Error("Pass this computer's LAN IPv4 address.");
const secure = process.argv.includes('--https'),
  port = secure ? 4443 : 4173,
  authority = host + ':' + port,
  origin = (secure ? 'https://' : 'http://') + authority,
  root = path.resolve('dist/client'),
  assets = new Set();
const tlsRoot = path.resolve('outputs/phone-test/tls');
function files(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith('.')) continue;
    const file = path.join(dir, f.name);
    if (f.isDirectory()) files(file);
    else if (f.isFile()) assets.add('/' + path.relative(root, file).split(path.sep).join('/'));
  }
}
files(root);
const pages =
  /^\/(?:admin(?:\/(?:giris|preview))?|giris|uye-ol|sifremi-unuttum|kartim|kartlar|bilet|basvuru|oyun|ekip(?:\/[a-zA-Z0-9_-]+)?|etkinlikler|etkinlik\/[a-zA-Z0-9_-]+|kart\/dogrula\/[a-f0-9]{32})?\/?$/;
const api =
  /^\/api\/(?:admin(?:\/(?:auth|accounts|media|operations|home))?|member(?:\/recovery)?|register|ticket|events|game|media\/[a-f0-9-]{36})$/;
const handler = (req, res) => {
  const fail = (status, message) => {
    res.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(message);
  };
  if (req.headers.host !== authority)
    return fail(403, 'Bu test sunucusunun yerel ağ adresini kullan.');
  if (req.headers.origin && req.headers.origin !== origin) return fail(403, 'Geçersiz kaynak.');
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, origin).pathname);
  } catch {
    return fail(400, 'Geçersiz adres.');
  }
  if (pathname === '/__local-test/bmk.mobileconfig' && ['GET', 'HEAD'].includes(req.method)) {
    const file = path.join(tlsRoot, 'bmk-local-test.mobileconfig');
    if (!fs.existsSync(file)) return fail(404, 'Test sertifikası hazırlanmamış.');
    res.writeHead(200, {
      'Content-Type': 'application/x-apple-aspen-config',
      'Content-Disposition': 'attachment; filename="BMK-Yerel-Test.mobileconfig"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file).pipe(res);
  }
  if (!pages.test(pathname) && !api.test(pathname) && !assets.has(pathname))
    return fail(404, 'Sayfa bulunamadı.');
  if (!['GET', 'HEAD', 'POST', 'PATCH'].includes(req.method))
    return fail(405, 'Yöntem desteklenmiyor.');
  if (
    !['GET', 'HEAD'].includes(req.method) &&
    (!api.test(pathname) || req.headers.origin !== origin)
  )
    return fail(403, 'Geçersiz kaynak.');
  const headers = { ...req.headers };
  for (const key of Object.keys(headers))
    if (/^(?:cf-|x-forwarded-|oai-|x-openai-)/i.test(key)) delete headers[key];
  headers['cf-connecting-ip'] = req.socket.remoteAddress || host;
  if (secure) {
    headers.host = '127.0.0.1:5173';
    if (headers.origin) headers.origin = 'http://127.0.0.1:5173';
  }
  const upstream = http.request(
    { hostname: '127.0.0.1', port: 5173, path: req.url, method: req.method, headers },
    (response) => {
      const outgoing = {
        ...response.headers,
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
      };
      if (secure) {
        if (outgoing['set-cookie'])
          outgoing['set-cookie'] = outgoing['set-cookie'].map((c) =>
            /;\s*Secure\b/i.test(c) ? c : c + '; Secure',
          );
        if (outgoing.location) {
          const u = new URL(outgoing.location, 'http://127.0.0.1:5173');
          if (u.origin === 'http://127.0.0.1:5173')
            outgoing.location = origin + u.pathname + u.search + u.hash;
        }
      }
      res.writeHead(response.statusCode || 502, outgoing);
      response.pipe(res);
    },
  );
  let length = 0;
  req.on('data', (chunk) => {
    length += chunk.length;
    if (length > 9 * 1024 * 1024) {
      upstream.destroy();
      if (!res.headersSent) fail(413, 'Dosya çok büyük.');
      req.destroy();
    }
  });
  upstream.on('error', () => {
    if (!res.headersSent) fail(502, 'Yerel site sunucusu henüz hazır değil.');
    else res.destroy();
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
};
const server = secure
  ? https.createServer(
      {
        key: fs.readFileSync(path.join(tlsRoot, 'server-key.pem')),
        cert: fs.readFileSync(path.join(tlsRoot, 'server.pem')),
        minVersion: 'TLSv1.2',
      },
      handler,
    )
  : http.createServer(handler);
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.listen(port, host, () =>
  console.log('BMK phone test: ' + origin + ' (app routes only; no public tunnel)'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
