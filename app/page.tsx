import { publicHome } from './home/model';
import { getPublishedHome } from './home/store';
import { db } from './server';
import { getSettings, getMembers } from './content';
import { publicDesktopContent } from './lab/public-content';
import HomeExperience from './components/HomeExperience';
import type { ClubEvent } from './data';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [settings, members, desktopEvents, events, home] = await Promise.all([
    getSettings(),
    getMembers(),
    db()
      .prepare(
        'SELECT id,title,description,category,date,location,image_id,image_alt,published,archived FROM events WHERE published=1 AND archived=0 ORDER BY date DESC LIMIT 50',
      )
      .all<ClubEvent>(),
    db()
      .prepare(
        'SELECT e.*,(SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS count FROM events e WHERE published=1 AND archived=0 AND julianday(date)>julianday(?) ORDER BY date LIMIT 6',
      )
      .bind(new Date().toISOString())
      .all<ClubEvent>(),
    getPublishedHome(),
  ]);
  return (
    <HomeExperience
      document={home ? publicHome(home) : undefined}
      settings={
        settings.heroTitle === 'Kampüste buluşalım.'
          ? { ...settings, heroTitle: 'Birlikte üretelim.' }
          : settings
      }
      initialEvents={events.results}
      desktopContent={publicDesktopContent(members, desktopEvents.results)}
    />
  );
}
