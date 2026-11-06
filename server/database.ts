import { env } from 'cloudflare:workers';
export function db() {
  if (!env.DB) throw Error('Veritabanı bağlantısı hazır değil.');
  return env.DB;
}
