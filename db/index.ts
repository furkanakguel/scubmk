import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Check the DB binding in vite.config.ts and start the app through the configured Vite or Wrangler server.',
    );
  }

  return drizzle(env.DB, { schema });
}
