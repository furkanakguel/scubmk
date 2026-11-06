export type Member = {
  id: string;
  name: string;
  slug: string;
  role: string;
  team: string;
  department: string;
  year: string;
  bio: string;
  photo_id: string;
  photo_alt: string;
  links: string;
  skills: string;
  sort_order: number;
  published: number;
  archived: number;
  email?: string;
};
export type SiteSettings = {
  heroTitle: string;
  heroText: string;
  aboutText: string;
  heroImage: string;
  heroImageAlt: string;
  announcement: string;
  instagram: string;
  contactEmail: string;
  membershipOpen: boolean;
};
export const defaultSettings: SiteSettings = {
  heroTitle: 'Kampüste buluşalım.',
  heroText:
    'Sivas Cumhuriyet Üniversitesi Bilgisayar Mühendisliği Kulübü. Yazılıma ilgi duyan öğrencileri atölyelerde, etkinliklerde ve ortak projelerde bir araya getiriyoruz.',
  aboutText:
    'Ders dışında da birlikte öğrenmek için buradayız. Bir konuyu yeni öğreniyor veya üzerinde çalıştığın projeye ekip arkadaşı arıyor olabilirsin. Etkinliklerimizi takip et, bir sonraki buluşmada tanışalım.',
  heroImage: '',
  heroImageAlt: '',
  announcement: '',
  instagram: 'https://www.instagram.com/cumhuriyetbmk/',
  contactEmail: '',
  membershipOpen: false,
};
export function parseList<T>(text: string): T[] {
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
export function imageUrl(id: string) {
  return id ? '/api/media/' + encodeURIComponent(id) : '';
}
