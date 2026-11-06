import { env } from 'cloudflare:workers';
import { db } from '../../../server';
import { getAdmin, canEdit } from '../../../admin-auth';
import { getPublishedHome } from '../../../home/store';
import { homeMediaIds } from '../../../home/model';
import { getSettings } from '../../../content';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id) || !env.BUCKET) return new Response(null, { status: 404 });
  const media = await db()
    .prepare('SELECT key,type FROM media WHERE id=?')
    .bind(id)
    .first<{ key: string; type: string }>();
  if (!media) return new Response(null, { status: 404 });
  const visible = await db()
    .prepare(
      'SELECT id FROM events WHERE image_id=? AND published=1 AND archived=0 UNION ALL SELECT id FROM members WHERE photo_id=? AND published=1 AND archived=0 LIMIT 1',
    )
    .bind(id, id)
    .first();
  const home = await getPublishedHome();
  const isPublic =
    !!visible ||
    (await getSettings()).heroImage === id ||
    (!!home && homeMediaIds(home, true).includes(id));
  if (!isPublic) {
    const admin = await getAdmin();
    if (!admin || !canEdit(admin)) return new Response(null, { status: 404 });
  }
  const object = await env.BUCKET.get(media.key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': media.type,
      'Content-Length': String(object.size),
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, no-store',
    },
  });
}
