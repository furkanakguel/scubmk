// A scanned QR is data, never a navigation target or executable command.
export function parseCheckinCode(value: string, origin: string): string | null {
  const raw = value.trim();
  if (/^[a-f0-9]{48}$/.test(raw)) return raw;
  if (raw.length > 1024) return null;
  try {
    const url = new URL(raw);
    const here = new URL(origin),
      ip = here.hostname.split('.').map(Number);
    const local =
      ip.length === 4 &&
      ip.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
      (ip[0] === 10 ||
        (ip[0] === 192 && ip[1] === 168) ||
        (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31));
    // The two explicit LAN test ports use the same database; hosted sites stay same-origin.
    const localPair =
      local &&
      url.hostname === here.hostname &&
      ((here.protocol === 'https:' &&
        here.port === '4443' &&
        url.protocol === 'http:' &&
        url.port === '4173') ||
        (here.protocol === 'http:' &&
          here.port === '4173' &&
          url.protocol === 'https:' &&
          url.port === '4443'));
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (url.origin !== origin && !localPair) ||
      url.username ||
      url.password ||
      url.hash ||
      !/^\/admin\/?$/.test(url.pathname)
    )
      return null;
    const codes = url.searchParams.getAll('scan');
    return codes.length === 1 && /^[a-f0-9]{48}$/.test(codes[0]) ? codes[0] : null;
  } catch {
    return null;
  }
}

let decoder: Promise<typeof import('jsqr').default> | undefined;
export function loadQrDecoder() {
  return (decoder ??= import('jsqr')
    .then((m) => m.default)
    .catch((e) => {
      decoder = undefined;
      throw e;
    }));
}
