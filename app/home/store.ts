import { db } from '../server';
import { getSettings } from '../content';
import {
  defaultHome,
  homeDocumentSchema,
  type HomeDocument,
  type HomeEditorState,
  type HomeEnvelope,
  type HomeRevision,
} from './model';
export async function getHomeState(): Promise<HomeEditorState> {
  const row = await db()
    .prepare("SELECT value,updated_at FROM settings WHERE key='homepage'")
    .first<{ value: string; updated_at: number }>();
  if (row) {
    try {
      const raw = JSON.parse(row.value) as HomeEnvelope;
      const draft = homeDocumentSchema.parse(raw.draft),
        published = raw.published ? homeDocumentSchema.parse(raw.published) : null;
      const history = (Array.isArray(raw.history) ? raw.history : [])
        .slice(0, 5)
        .filter(
          (h: HomeRevision) =>
            typeof h.id === 'string' &&
            typeof h.by === 'string' &&
            typeof h.at === 'number' &&
            homeDocumentSchema.safeParse(h.document).success,
        );
      return {
        draft,
        published,
        history,
        revision: row.updated_at,
        publishedAt: Number(raw.publishedAt) || 0,
        publishedBy: typeof raw.publishedBy === 'string' ? raw.publishedBy : '',
      };
    } catch {
      throw Error('Ana sayfa kaydı okunamadı.');
    }
  }
  return {
    draft: defaultHome(await getSettings()),
    published: null,
    history: [],
    revision: 0,
    publishedAt: 0,
    publishedBy: '',
  };
}
export async function getPublishedHome(): Promise<HomeDocument | null> {
  const row = await db()
    .prepare(
      "SELECT json_extract(value,'$.published') AS document FROM settings WHERE key='homepage'",
    )
    .first<{ document: string | null }>();
  if (!row?.document) return null;
  const result = homeDocumentSchema.safeParse(JSON.parse(row.document));
  return result.success ? result.data : null;
}
