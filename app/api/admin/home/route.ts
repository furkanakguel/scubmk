import { z } from 'zod';
import { getAdmin, canEdit } from '../../../admin-auth';
import {
  db,
  json,
  sameOrigin,
  rateKey,
  readBounded,
  RequestError,
  requestFailure,
} from '../../../server';
import { homeDocumentSchema, publishDocumentSchema, type HomeEnvelope } from '../../../home/model';
import { getSettings } from '../../../content';
import { defaultHome } from '../../../home/model';
import { getHomeState } from '../../../home/store';
const command = z
  .object({
    action: z.enum(['draft', 'publish']),
    revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    document: homeDocumentSchema,
  })
  .strict();
export async function GET() {
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(user)) return json({ error: 'Sayfa düzenleme yetkin yok.' }, 403);
  try {
    return json(await getHomeState());
  } catch (e) {
    return requestFailure(e);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz kaynak.' }, 403);
  const user = await getAdmin();
  if (!user) return json({ error: 'Yönetici girişi gerekiyor.' }, 401);
  if (!canEdit(user)) return json({ error: 'Sayfa düzenleme yetkin yok.' }, 403);
  try {
    if (!(await rateKey('home-editor', user.id, 90)))
      return json({ error: 'Çok sık kayıt yapıldı. Biraz sonra yeniden dene.' }, 429);
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))
      throw new RequestError(415, 'JSON biçimi gerekli.');
    let raw: unknown;
    try {
      raw = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(await readBounded(request, 180000)),
      );
    } catch (e) {
      if (e instanceof RequestError) throw e;
      throw new RequestError(400, 'İstek biçimi geçersiz.');
    }
    const parsed = command.safeParse(raw);
    if (!parsed.success)
      return json({ error: parsed.error.issues[0]?.message || 'Alanları kontrol et.' }, 400);
    const { action, revision, document } = parsed.data;
    if (action === 'publish') {
      const valid = publishDocumentSchema.safeParse(document);
      if (!valid.success) return json({ error: valid.error.issues[0].message }, 400);
    }
    const state = await getHomeState();
    if (state.revision !== revision)
      return json(
        {
          error:
            'Başka bir yönetici bu sayfayı değiştirdi. Taslağını indirdikten sonra güncel kaydı yükleyebilirsin.',
          conflict: true,
        },
        409,
      );
    const now = Math.max(Date.now(), revision + 1),
      history = [...state.history];
    const previous =
      state.published || (action === 'publish' ? defaultHome(await getSettings()) : null);
    if (action === 'publish' && previous && JSON.stringify(previous) !== JSON.stringify(document))
      history.unshift({
        id: crypto.randomUUID(),
        at: state.publishedAt || now,
        by: state.publishedBy || 'Mevcut tasarım',
        document: previous,
      });
    const envelope: HomeEnvelope = {
      writeId: crypto.randomUUID(),
      draft: document,
      published: action === 'publish' ? document : state.published,
      history: history.slice(0, 5),
      publishedAt: action === 'publish' ? now : state.publishedAt,
      publishedBy: action === 'publish' ? user.name : state.publishedBy,
    };
    // CAS and media validation share one statement, so concurrent edits/archives cannot slip between checks.
    const result = await db().batch([
      db()
        .prepare(
          `INSERT INTO settings(key,value,updated_at) SELECT 'homepage',?,? WHERE NOT EXISTS(SELECT 1 FROM json_each(?,'$.sections') s WHERE json_extract(s.value,'$.imageId')<>'' AND NOT EXISTS(SELECT 1 FROM media m WHERE m.id=json_extract(s.value,'$.imageId') AND m.archived=0)) AND (?=0 OR EXISTS(SELECT 1 FROM settings WHERE key='homepage' AND updated_at=?)) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE settings.updated_at=? RETURNING updated_at`,
        )
        .bind(
          JSON.stringify(envelope),
          now,
          JSON.stringify(document),
          revision,
          revision,
          revision,
        ),
      db()
        .prepare(
          "INSERT INTO audit_log(id,actor_id,actor_name,action,target,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM settings WHERE key='homepage' AND json_extract(value,'$.writeId')=?)",
        )
        .bind(
          crypto.randomUUID(),
          user.id,
          user.name,
          action === 'publish' ? 'Ana sayfa yayımlandı' : 'Ana sayfa taslağı kaydedildi',
          'Ana sayfa · ' + document.sections.filter((s) => s.visible).length + ' görünür bölüm',
          now,
          envelope.writeId!,
        ),
    ]);
    if (!result[0].results.length)
      return json(
        {
          error:
            'Kayıt değişti veya seçilen görsel arşivlendi. Güncel kaydı yükleyip görselleri kontrol et.',
          conflict: true,
        },
        409,
      );
    return json({ ...envelope, revision: now });
  } catch (e) {
    return requestFailure(e);
  }
}
