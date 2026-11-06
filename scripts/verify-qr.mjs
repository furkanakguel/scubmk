import { localTestCredentials } from './test-support/credentials.mjs';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { createTicketQrSvg } from '../app/bilet/ticket-qr.ts';
import { parseCheckinCode, loadQrDecoder } from '../app/admin/checkin-qr.ts';

let count = 0;
function check(value, label) {
  assert.ok(value, label);
  console.log('PASS ' + ++count + ' ' + label);
}
const origin = 'http://192.168.1.48:4173',
  code = 'abcdef0123456789'.repeat(3),
  link = origin + '/admin?scan=' + code;
check(parseCheckinCode(code, origin) === code, 'Raw check-in token accepted');
check(parseCheckinCode('  ' + link + '  ', origin) === code, 'Current-site QR link accepted');
check(
  parseCheckinCode(origin + '/admin/?scan=' + code, origin) === code,
  'Admin trailing slash accepted',
);
check(
  parseCheckinCode(link, 'https://192.168.1.48:4443') === code,
  'Local HTTPS scanner accepts existing HTTP test ticket',
);
check(
  parseCheckinCode(link, 'https://192.168.1.49:4443') === null,
  'Different local server rejected',
);
check(
  parseCheckinCode(link, 'https://bmk.example') === null,
  'Local ticket never accepted on production origin',
);
check(
  parseCheckinCode('http://192.168.1.48:9000/admin?scan=' + code, 'https://192.168.1.48:4443') ===
    null,
  'Unexpected LAN port rejected',
);
for (const input of [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'https://evil.example/admin?scan=' + code,
  origin + '.evil.example/admin?scan=' + code,
  'http://u:p@192.168.1.48:4173/admin?scan=' + code,
  origin + '/bilet#' + code,
  origin + '/admin?scan=' + code + '&scan=' + code,
  origin + '/admin?scan=' + code + '#other',
  origin + '/admin?scan=' + code.slice(0, 47),
  origin + '/admin?scan=' + code + '0',
  origin + '/admin?scan=' + 'g'.repeat(48),
  'a'.repeat(1025),
  '',
  origin + '/admin/giris?scan=' + code,
])
  check(parseCheckinCode(input, origin) === null, 'Malformed, foreign or non-ticket QR rejected');

const decode = await loadQrDecoder();
const png = PNG.sync.read(
  await QRCode.toBuffer(link, {
    width: 480,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#163824', light: '#fffef7' },
  }),
);
function read(data, width = png.width, height = png.height) {
  return decode(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'attemptBoth' })
    ?.data;
}
check(read(png.data) === link, 'Real ticket colors decode');
const rotated = Buffer.alloc(png.data.length),
  inverted = Buffer.from(png.data);
for (let y = 0; y < png.height; y++)
  for (let x = 0; x < png.width; x++) {
    const from = (y * png.width + x) * 4,
      to = (x * png.width + png.width - 1 - y) * 4;
    for (let c = 0; c < 4; c++) {
      rotated[to + c] = png.data[from + c];
      if (c < 3) inverted[from + c] = 255 - inverted[from + c];
    }
  }
check(read(rotated) === link, 'Rotated QR photo decodes');
check(read(inverted) === link, 'Inverted-color QR decodes');
check(!read(Buffer.alloc(640 * 480 * 4, 255), 640, 480), 'Blank photo produces no ticket');
const arbitrary = PNG.sync.read(
  await QRCode.toBuffer('https://evil.example/?scan=' + code, { width: 480 }),
);
check(
  parseCheckinCode(read(arbitrary.data, arbitrary.width, arbitrary.height), origin) === null,
  'Foreign QR is decoded but never accepted/navigated',
);

// Decode the exact production dinosaur artwork, not a clean substitute QR.
for (const base of [
  'http://172.20.10.3:4173',
  'https://172.20.10.3:4443',
  'https://scubmk-lab.furkanakgul06.chatgpt.site',
]) {
  const brandedLink = base + '/admin?scan=' + code,
    svg = Buffer.from(createTicketQrSvg(brandedLink));
  for (const width of [200, 240, 276, 550]) {
    const branded = await sharp(svg).resize(width, width).ensureAlpha().raw().toBuffer();
    check(
      read(branded, width, width) === brandedLink,
      `Dinosaur QR decodes at ${width}px (${new URL(base).protocol})`,
    );
  }
  const photo = await sharp(svg)
    .resize(350)
    .rotate(17, { background: '#fffef7' })
    .blur(0.35)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  check(
    read(photo.data, photo.info.width, photo.info.height) === brandedLink,
    'Branded QR survives a tilted, softened photo',
  );
}

// Optional real API exercise; it uses a separate disposable event, never the user's ticket.
if (process.env.BMK_QR_INTEGRATION === '1') {
  const qa = localTestCredentials();
  const base = process.env.BMK_TEST_URL || 'http://127.0.0.1:5173';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
    throw Error('Integration fixtures are local only.');
  const stamp = Date.now();
  let cookie = '',
    eventId = '';
  async function request(path, data, session = cookie) {
    const r = await fetch(base + path, {
      method: data ? 'POST' : 'GET',
      headers: {
        Origin: base,
        'Content-Type': 'application/json',
        ...(session ? { Cookie: session } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return { r, data: await r.json() };
  }
  const login = await request(
    '/api/admin/auth',
    { action: 'login', email: qa.email, password: qa.password },
    '',
  );
  assert.ok(login.r.ok);
  cookie = login.r.headers.get('set-cookie').split(';')[0];
  try {
    const event = await request('/api/admin', {
      action: 'event',
      event: {
        title: 'QR okuyucu otomatik test ' + stamp,
        description: 'Geçici yerel test.',
        details: '',
        category: 'Atölye',
        date: new Date(stamp + 86400000).toISOString(),
        location: 'Yerel test',
        capacity: 2,
        question: '',
        imageId: '',
        imageAlt: '',
        published: true,
        registrationOpen: true,
      },
    });
    assert.ok(event.r.ok);
    eventId = event.data.id;
    const registered = await request(
      '/api/register',
      {
        eventId,
        name: 'QR Test Katılımcısı',
        email: 'qr-' + stamp + '@bmk.test',
        department: 'Test',
        year: 'Diğer',
        answer: '',
        consent: true,
        website: '',
      },
      '',
    );
    check(registered.r.status === 201, 'Separate QR integration ticket created');
    const ticket = await request('/api/ticket', { token: registered.data.token }, '');
    check(
      ticket.data.checkin === registered.data.checkin,
      'Server supplies matching QR token for HTTP clients',
    );
    const image = PNG.sync.read(
      await QRCode.toBuffer(base + '/admin?scan=' + ticket.data.checkin, { width: 480 }),
    );
    const scanned = parseCheckinCode(read(image.data, image.width, image.height), base);
    check(scanned === ticket.data.checkin, 'Actual API ticket decodes through scanner parser');
    check(
      (await request('/api/admin', { action: 'checkin', token: scanned }, '')).r.status === 401,
      'Anonymous scanner cannot check in',
    );
    check(
      (await request('/api/admin', { action: 'checkin', token: scanned })).r.status === 200,
      'Authenticated admin confirms scanned ticket',
    );
    check(
      (await request('/api/admin', { action: 'checkin', token: scanned })).r.status === 409,
      'Repeated scan cannot enter twice',
    );
    check(
      !!(await request('/api/ticket', { token: registered.data.token }, '')).data.ticket
        .checkedInAt,
      'Entry persists on ticket',
    );
    check(
      (await request('/api/ticket', { token: scanned }, '')).r.status === 404,
      'Gate QR cannot access private ticket',
    );
  } finally {
    if (eventId)
      await request('/api/admin', {
        action: 'archive',
        table: 'events',
        id: eventId,
        archived: true,
      });
  }
}
console.log(count + ' QR checks passed.');
