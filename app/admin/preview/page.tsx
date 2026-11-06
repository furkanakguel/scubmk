import { redirect } from 'next/navigation';
import { getAdmin, canEdit } from '../../admin-auth';
import { getSettings, getMembers } from '../../content';
import { db } from '../../server';
import { getHomeState } from '../../home/store';
import { publicDesktopContent } from '../../lab/public-content';
import type { ClubEvent } from '../../data';
import HomePreview from './HomePreview';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Ana sayfa önizlemesi · BMK',
  robots: { index: false, follow: false },
};
export default async function PreviewPage() {
  const user = await getAdmin();
  if (!user || !canEdit(user)) redirect('/admin/giris');
  const [settings, members, events, state] = await Promise.all([
    getSettings(),
    getMembers(),
    db()
      .prepare(
        'SELECT id,title,description,category,date,location,image_id,image_alt,published,archived,registration_open FROM events WHERE published=1 AND archived=0 ORDER BY date DESC LIMIT 50',
      )
      .all<ClubEvent>(),
    getHomeState(),
  ]);
  const now = new Date().getTime();
  return (
    <HomePreview
      settings={settings}
      initialDocument={state.draft}
      events={events.results
        .filter((e) => new Date(e.date).getTime() > now)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6)}
      desktopContent={publicDesktopContent(members, events.results)}
    />
  );
}
