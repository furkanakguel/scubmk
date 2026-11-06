// Compatibility entry point for existing route imports. New infrastructure
// belongs in server/ so HTTP, cryptography and storage stay independently testable.
export { db } from '../server/database';
export { hash, token } from '../server/crypto';
export { json, sameOrigin, RequestError, readBounded, body, requestFailure } from '../server/http';
export { rateKey, rate } from '../server/rate-limit';
export async function isAdmin() {
  const { getAdmin } = await import('./admin-auth');
  return !!(await getAdmin());
}
