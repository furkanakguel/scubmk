import { defaultSettings, SiteSettings, Member } from './content-model';
export * from './content-model';
import { db } from './server';
export async function getSettings(): Promise<SiteSettings> {
  const row = await db()
    .prepare("SELECT value FROM settings WHERE key='site'")
    .first<{ value: string }>();
  try {
    return { ...defaultSettings, ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return defaultSettings;
  }
}
export async function getMembers() {
  return (
    await db()
      .prepare(
        'SELECT id,name,slug,role,team,department,year,bio,photo_id,photo_alt,links,skills,sort_order,published,archived FROM members WHERE published=1 AND archived=0 ORDER BY sort_order,name',
      )
      .all<Member>()
  ).results;
}
