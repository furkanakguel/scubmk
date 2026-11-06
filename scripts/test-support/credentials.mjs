// Integration tests use an explicitly configured, isolated local account.
// Unit tests never call this helper and need no credentials.
export function localTestCredentials() {
  const email = process.env.BMK_TEST_ADMIN_EMAIL;
  const password = process.env.BMK_TEST_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      'Set BMK_TEST_ADMIN_EMAIL and BMK_TEST_ADMIN_PASSWORD for your isolated local test database. See docs/TESTING.md.',
    );
  }
  return { email, password };
}

export function randomTestPassword() {
  return 'Test-' + crypto.randomUUID() + '!';
}
