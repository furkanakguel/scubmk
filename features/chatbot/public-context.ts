import { publicContextSchema, type PublicChatbotContext } from './contracts';

type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  published: number;
  archived: number;
};
type TeamRow = { name: string; role: string; slug: string; published: number; archived: number };

// Construct a fresh object with an explicit allowlist. Never spread database
// rows here: records may gain private columns as the application evolves.
export function toPublicChatbotContext(
  about: string,
  events: EventRow[],
  team: TeamRow[],
): PublicChatbotContext {
  return publicContextSchema.parse({
    club: { name: 'SCÜ Bilgisayar Mühendisliği Kulübü', about: about.slice(0, 2400) },
    events: events
      .filter((row) => row.published === 1 && row.archived === 0)
      .slice(0, 30)
      .map((row) => ({
        id: row.id,
        title: row.title.slice(0, 160),
        description: row.description.slice(0, 2400),
        date: row.date,
        location: row.location.slice(0, 240),
        href: '/etkinlik/' + encodeURIComponent(row.id),
      })),
    team: team
      .filter((row) => row.published === 1 && row.archived === 0)
      .slice(0, 50)
      .map((row) => ({
        name: row.name.slice(0, 120),
        role: row.role.slice(0, 160),
        href: '/ekip/' + encodeURIComponent(row.slug),
      })),
  });
}
