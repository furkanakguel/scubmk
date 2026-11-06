import type { Member } from '../content-model';
import type { ClubEvent } from '../data';
export type DesktopMember = {
  id: string;
  name: string;
  slug: string;
  role: string;
  team: string;
  department: string;
  bio: string;
  photoId: string;
  photoAlt: string;
};
export type DesktopEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  location: string;
  imageId: string;
  imageAlt: string;
};
export type DesktopContent = { members: DesktopMember[]; events: DesktopEvent[] };
// Explicit public DTOs: never spread a database row into the desktop client props.
export function publicDesktopContent(members: Member[], events: ClubEvent[]): DesktopContent {
  return {
    members: members
      .filter((m) => m.published === 1 && m.archived === 0)
      .map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        role: m.role,
        team: m.team,
        department: m.department,
        bio: m.bio,
        photoId: m.photo_id,
        photoAlt: m.photo_alt,
      })),
    events: events
      .filter((e) => e.published === 1 && e.archived === 0)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        date: e.date,
        location: e.location,
        imageId: e.image_id || '',
        imageAlt: e.image_alt || '',
      })),
  };
}
export function memberGroup(m: DesktopMember) {
  const role = (m.role + ' ' + m.team).toLocaleLowerCase('tr-TR');
  if (/danışman|danisman|advisor/.test(role)) return 'advisor';
  if (/başkan|baskan|president/.test(role)) return 'board';
  if (/asil|assembly/.test(role)) return 'core';
  return 'team';
}
export const desktopPath = {
  event: (id: string) => '/etkinlik/' + encodeURIComponent(id),
  member: (slug: string) => '/ekip/' + encodeURIComponent(slug),
  photo: (id: string) => '/api/media/' + encodeURIComponent(id),
};
