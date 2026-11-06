import { db } from '../../../server/database';
import { getSettings } from '../../../app/content';
import { toPublicChatbotContext } from '../public-context';

// Server-only dependency boundary. No route is exposed until the chatbot team
// implements provider, request limits, timeouts and the checks in the README.
export async function getPublicChatbotContext() {
  const [settings, events, team] = await Promise.all([
    getSettings(),
    db()
      .prepare(
        'SELECT id,title,description,date,location,published,archived FROM events WHERE published=1 AND archived=0 ORDER BY date DESC LIMIT 30',
      )
      .all<{
        id: string;
        title: string;
        description: string;
        date: string;
        location: string;
        published: number;
        archived: number;
      }>(),
    db()
      .prepare(
        'SELECT name,role,slug,published,archived FROM members WHERE published=1 AND archived=0 ORDER BY sort_order,name LIMIT 50',
      )
      .all<{ name: string; role: string; slug: string; published: number; archived: number }>(),
  ]);
  return toPublicChatbotContext(settings.aboutText, events.results, team.results);
}
