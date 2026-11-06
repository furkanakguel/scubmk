import { inspectImage } from '../../../image-validation';
import { getOperations } from '../../../operations';
import { env } from 'cloudflare:workers';
import { getAdmin, canEdit, audit } from '../../../admin-auth';
import { db, json, sameOrigin, rate, body, requestFailure } from '../../../server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(user)) return json({ error: 'Görsel yükleme yetkin yok.' }, 403);
  if (!env.BUCKET) return json({ error: 'Görsel depolama şu anda kullanılamıyor.' }, 503);
  try {
    if (!/^multipart\/form-data\s*;.*boundary=/i.test(request.headers.get('content-type') || ''))
      return json({ error: 'Görseli dosya yükleme formuyla gönder.' }, 415);
    if (!(await rate(request, 'upload', 30)))
      return json({ error: 'Biraz sonra tekrar dene.' }, 429);
    const limit = (await getOperations()).settings.uploadMaxMB * 1024 * 1024;
    if (Number(request.headers.get('content-length') || 0) > limit + 65536)
      return json({ error: 'Görsel en fazla 8 MB olabilir.' }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Dosya bulunamadı.' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      length += r.value.length;
      if (length > limit + 65536) {
        await reader.cancel();
        return json({ error: 'Görsel en fazla 8 MB olabilir.' }, 413);
      }
      chunks.push(r.value);
    }
    let form: FormData;
    try {
      form = await new Response(new Blob(chunks.map((c) => new Uint8Array(c).buffer)), {
        headers: { 'Content-Type': request.headers.get('content-type') || '' },
      }).formData();
    } catch {
      return json({ error: 'Dosya gönderimi geçersiz. Yeniden seçip dene.' }, 400);
    }
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > limit)
      return json({ error: 'PNG, JPEG veya WebP görsel seç (en fazla 8 MB).' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspected = inspectImage(bytes);
    if (!inspected || inspected.type !== file.type)
      return json(
        {
          error:
            'Geçerli PNG, JPEG veya hareketsiz WebP yükle. En fazla 8.192 piksel ve 24 megapiksel.',
        },
        400,
      );
    const { type } = inspected;
    const id = crypto.randomUUID(),
      key = 'images/' + id,
      name = file.name.replace(/[\x00-\x1f]/g, '').slice(0, 150);
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: type } });
    try {
      await db()
        .prepare(
          'INSERT INTO media (id,key,name,type,size,created_at,uploaded_by) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(id, key, name, type, bytes.length, Date.now(), user.id)
        .run();
    } catch (e) {
      await env.BUCKET.delete(key);
      throw e;
    }
    await audit(user, 'Görsel yüklendi', name);
    return json({ ok: true, id, url: '/api/media/' + id, name }, 201);
  } catch {
    return json({ error: 'Görsel yüklenemedi. Daha küçük bir dosyayla yeniden dene.' }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(user)) return json({ error: 'Görsel yönetme yetkin yok.' }, 403);
  try {
    if (!(await rate(request, 'media-edit', 60))) return json({ error: 'Çok fazla işlem.' }, 429);
    const d = await body(request);
    if (
      typeof d.id !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(d.id) ||
      typeof d.archived !== 'boolean'
    )
      return json({ error: 'Geçersiz görsel.' }, 400);
    const result = await db()
      .prepare(
        "UPDATE media SET archived=? WHERE id=? AND (?=0 OR (NOT EXISTS(SELECT 1 FROM events WHERE image_id=media.id) AND NOT EXISTS(SELECT 1 FROM members WHERE photo_id=media.id) AND NOT EXISTS(SELECT 1 FROM settings WHERE key='site' AND json_extract(value,'$.heroImage')=media.id) AND NOT EXISTS(SELECT 1 FROM settings h,json_each(h.value,'$.draft.sections') s WHERE h.key='homepage' AND json_extract(s.value,'$.imageId')=media.id) AND NOT EXISTS(SELECT 1 FROM settings h,json_each(h.value,'$.published.sections') s WHERE h.key='homepage' AND json_extract(s.value,'$.imageId')=media.id)))",
      )
      .bind(+d.archived, d.id, +d.archived)
      .run();
    if (!result.meta.changes)
      return json(
        {
          error: 'Görsel bulunamadı veya bir içerikte kullanılıyor. Önce ilgili içerikten kaldır.',
        },
        409,
      );
    await audit(user, d.archived ? 'Görsel arşivlendi' : 'Görsel arşivden çıkarıldı', d.id);
    return json({ ok: true });
  } catch (e) {
    return requestFailure(e);
  }
}
