export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !!origin && origin === new URL(request.url).origin;
}
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readBounded(request: Request, limit = 16384) {
  const length = request.headers.get('content-length');
  if (length && Number(length) > limit) throw new RequestError(413, 'İstek çok büyük.');
  if (!request.body) throw new RequestError(400, 'İstek boş.');
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestError(413, 'İstek çok büyük.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const part of chunks) {
    bytes.set(part, at);
    at += part.length;
  }
  return bytes;
}
export async function body(request: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))
    throw new RequestError(415, 'JSON biçiminde bir istek gerekli.');
  const bytes = await readBounded(request);
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError(400, 'İstek biçimi geçersiz.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RequestError(400, 'İstek bir nesne olmalı.');
  return value;
}
export function requestFailure(
  error: unknown,
  message = 'İşlem tamamlanamadı. Yeniden deneyebilirsin.',
) {
  return error instanceof RequestError
    ? json({ error: error.message }, error.status)
    : json({ error: message }, 500);
}
