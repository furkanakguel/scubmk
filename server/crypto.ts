export async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
