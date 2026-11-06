import QRCode from 'qrcode';

// Keep the finder patterns and four-module quiet zone intact. The small centre
// mark is tested against the actual decoder, including reduced-size exports.
export function createTicketQrSvg(value: string) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'H' }),
    n = qr.modules.size,
    pad = 4,
    size = n + pad * 2;
  let modules = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.modules.get(y, x)) modules += `M${x + pad} ${y + pad}h1v1h-1z`;
  const badge = Math.min(11, Math.floor(n * 0.17) | 1),
    start = (size - badge) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 12}" height="${size * 12}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#fffef7"/><path d="${modules}" fill="#163824" shape-rendering="crispEdges"/><rect x="${start}" y="${start}" width="${badge}" height="${badge}" rx=".8" fill="#fffef7"/><svg x="${start + 1}" y="${start + 1}" width="${badge - 2}" height="${badge - 2}" viewBox="0 0 24 24"><g fill="#163824"><path d="M2 8h2v4h2v2h5v-2h2v6H8v-2H4v-2H2z"/><path d="M12 8h4v10h-3v2h-3v-3H8v1H6v-4h4v-2h2z"/><path d="M13 2h9v8h-7v2h-3V4h1zM14 12h5v2h-1v-1h-4zM6 17h2v5H5v-2h1zM11 17h2v4h1v1h-4v-2h1z"/></g><path d="M16 4h2v2h-2z" fill="#fffef7"/></svg></svg>`;
}

export async function createTicketQr(value: string) {
  const svg = createTicketQrSvg(value),
    image = new Image();
  image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const c = canvas.getContext('2d');
  if (!c) throw Error('QR görseli hazırlanamadı.');
  c.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}
