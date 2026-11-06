import { z } from 'zod';
import type { SiteSettings } from '../content-model';

export const builtins = [
  'hero',
  'about',
  'marquee',
  'events',
  'lab',
  'desktop',
  'portals',
  'membership',
  'faq',
  'join',
] as const;
export const sectionNames = {
  hero: 'Açılış',
  about: 'Kulüp hakkında',
  marquee: 'Kayan yazı',
  events: 'Etkinlikler',
  lab: 'Piksel atölyesi',
  desktop: 'BMK masaüstü',
  portals: 'Ekip ve oyun',
  membership: 'Üyelik kartları',
  faq: 'Sık sorulan sorular',
  join: 'Katılım çağrısı',
  story: 'Metin & görsel',
  callout: 'Duyuru bandı',
  links: 'Bağlantı kartları',
} as const;
export const customKinds = ['story', 'callout', 'links'] as const;
export type SectionKind = keyof typeof sectionNames;
export function safeHomeLink(value: string) {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (/^\/[a-zA-Z0-9/#?&=._%+~-]*$/.test(value) && !value.startsWith('//')) return true;
  if (/^#[a-zA-Z0-9_-]+$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
const link = z
  .string()
  .max(500)
  .refine(safeHomeLink, 'Geçerli bir site yolu veya https:// bağlantısı kullan.');
export const homeSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,55}$/),
    kind: z.enum([...builtins, ...customKinds]),
    visible: z.boolean(),
    label: z.string().trim().min(1).max(60),
    eyebrow: z.string().max(100),
    title: z.string().max(160),
    text: z.string().max(2400),
    buttonLabel: z.string().max(60),
    buttonHref: link,
    imageId: z.union([z.literal(''), z.string().uuid()]),
    imageAlt: z.string().max(180),
    tone: z.enum(['ink', 'paper', 'green']),
    align: z.enum(['left', 'center']),
    imageSide: z.enum(['left', 'right']),
    spacing: z.enum(['compact', 'normal', 'spacious']),
    eventCount: z.number().int().min(1).max(6),
    showFilters: z.boolean(),
    items: z
      .array(
        z.object({ title: z.string().max(70), text: z.string().max(240), href: link }).strict(),
      )
      .max(4),
  })
  .strict();
export type HomeSection = z.infer<typeof homeSectionSchema>;
export const homeDocumentSchema = z
  .object({
    schema: z.literal(1),
    announcement: z.string().max(200),
    sections: z.array(homeSectionSchema).min(10).max(24),
  })
  .strict()
  .superRefine((d, ctx) => {
    const ids = new Set<string>();
    for (const s of d.sections) {
      if (ids.has(s.id))
        ctx.addIssue({ code: 'custom', message: 'Bölüm kimlikleri benzersiz olmalı.' });
      ids.add(s.id);
      if ((builtins as readonly string[]).includes(s.kind) && s.id !== s.kind)
        ctx.addIssue({ code: 'custom', message: 'Sabit bölüm kimliği değiştirilemez.' });
    }
    for (const kind of builtins)
      if (d.sections.filter((s) => s.kind === kind).length !== 1)
        ctx.addIssue({
          code: 'custom',
          message: 'Hazır bölümler silinemez; görünürlüğünü kapatabilirsin.',
        });
    if (d.sections[0]?.kind !== 'hero' || !d.sections[0]?.visible)
      ctx.addIssue({ code: 'custom', message: 'Açılış bölümü ilk sırada ve görünür olmalı.' });
  });
export const publishDocumentSchema = homeDocumentSchema.superRefine((d, ctx) => {
  for (const s of d.sections) {
    if (s.visible && s.kind !== 'marquee' && !s.title.trim())
      ctx.addIssue({ code: 'custom', message: s.label + ': başlık yaz.' });
    if (s.visible && s.buttonLabel && !s.buttonHref)
      ctx.addIssue({ code: 'custom', message: s.label + ': buton bağlantısı seç.' });
    if (s.kind === 'hero' && s.title.length > 65)
      ctx.addIssue({ code: 'custom', message: 'Açılış başlığı en fazla 65 karakter olabilir.' });
    if (
      s.kind === 'links' &&
      s.visible &&
      (!s.items.length || s.items.some((i) => !i.title.trim() || !i.href))
    )
      ctx.addIssue({ code: 'custom', message: 'Bağlantı kartlarına başlık ve adres ekle.' });
  }
});
export type HomeDocument = z.infer<typeof homeDocumentSchema>;
export type HomeRevision = { id: string; at: number; by: string; document: HomeDocument };
export type HomeEnvelope = {
  draft: HomeDocument;
  published: HomeDocument | null;
  history: HomeRevision[];
  publishedAt: number;
  publishedBy: string;
  writeId?: string;
};
export type HomeEditorState = HomeEnvelope & { revision: number };
export function section(kind: SectionKind, copy: Partial<HomeSection> = {}): HomeSection {
  return {
    id: kind,
    kind,
    label: sectionNames[kind],
    visible: true,
    eyebrow: '',
    title: sectionNames[kind],
    text: '',
    buttonLabel: '',
    buttonHref: '',
    imageId: '',
    imageAlt: '',
    tone: 'ink',
    align: 'left',
    imageSide: 'right',
    spacing: 'normal',
    eventCount: 6,
    showFilters: true,
    items: [],
    ...copy,
  };
}
export function defaultHome(settings: SiteSettings): HomeDocument {
  return {
    schema: 1,
    announcement: settings.announcement,
    sections: [
      section('hero', {
        title:
          settings.heroTitle === 'Kampüste buluşalım.' ? 'Birlikte üretelim.' : settings.heroTitle,
        text: settings.heroText,
      }),
      section('about', {
        eyebrow: 'KULÜP HAKKINDA',
        title: 'Ders çıkışında da konuşacak, deneyecek, birlikte yapacak çok şey var.',
        text: settings.aboutText,
        buttonLabel: 'Üye ol',
        buttonHref: '/uye-ol',
      }),
      section('marquee', { title: 'MERAK ET ✳ BOZ. YENİDEN YAP. ✳ BİRLİKTE ÜRET ✳' }),
      section('events', {
        eyebrow: 'ETKİNLİKLER',
        title: 'EKRANDAN\nKAMPÜSE.',
        text: 'Atölyeler, söyleşiler, buluşmalar.\nSıradaki etkinlikte görüşürüz.',
        buttonLabel: 'Tüm etkinlikler',
        buttonHref: '/etkinlikler',
      }),
      section('lab', {
        eyebrow: 'BMK ATÖLYESİ / 01',
        title: 'Bir pikselden\nBMK’ye.',
        text: 'Logodaki dinozor nasıl çizilir?\nBiraz kod, biraz matematik.\nBir de senin dokunuşun.',
      }),
      section('desktop', {
        eyebrow: 'BMK ATÖLYESİ / 02',
        title: 'Tek bir yol yok.',
        text: 'Bu masaüstünde merakına yer var.\nBir komut yaz. Bir pencere aç. Kendine göre yerleştir.',
      }),
      section('portals', { eyebrow: 'AYNI MERAK. BAŞKA DÜNYALAR.', title: 'KODUN\nDIŞINA ÇIK.' }),
      section('membership', {
        eyebrow: 'DİJİTAL ÜYELİK',
        title: 'KULÜBÜN.\nKARTIN.',
        text: 'Hesabını aç. Dört tasarımdan birini seç.\nSana ait üyelik kartı, her zaman yanında.',
        buttonLabel: 'Kartları keşfet',
        buttonHref: '/kartlar',
      }),
      section('faq', {
        eyebrow: 'BMK / YARDIM MASASI',
        title: 'Önce bir soru.',
        text: 'Komut ezberlemene gerek yok.\nMerak ettiğin soruya dokun.',
      }),
      section('join', {
        eyebrow: 'MERAK EDENLERE, DENEMEK İSTEYENLERE.',
        title: 'SIRA\nSENDE.',
        text: 'Birlikte yazılacak çok şey var.',
        buttonLabel: 'Aramıza katıl',
        buttonHref: '/uye-ol',
      }),
    ],
  };
}
export function newHomeSection(kind: (typeof customKinds)[number]): HomeSection {
  return section(kind, {
    id: 'block-' + crypto.randomUUID(),
    title:
      kind === 'story'
        ? 'Birlikte yeni bir şey başlatalım.'
        : kind === 'callout'
          ? 'Bir sonraki buluşmada görüşelim.'
          : 'BMK’de keşfet',
    text:
      kind === 'links'
        ? 'İlgini çeken yerden devam et.'
        : 'Bu alanı kulübün hikâyesi, bir duyuru veya yeni bir proje için kullanabilirsin.',
    buttonLabel: kind === 'links' ? '' : 'Etkinlikleri gör',
    buttonHref: kind === 'links' ? '' : '/etkinlikler',
    items:
      kind === 'links'
        ? [
            { title: 'Etkinlikler', text: 'Takvimde neler var?', href: '/etkinlikler' },
            { title: 'Kulüp ekibi', text: 'Birlikte ürettiğimiz insanlar.', href: '/ekip' },
          ]
        : [],
  });
}
export function homeMediaIds(document: HomeDocument, visibleOnly = false) {
  return [
    ...new Set(
      document.sections
        .filter((s) => !visibleOnly || s.visible)
        .map((s) => s.imageId)
        .filter(Boolean),
    ),
  ];
}

// Hidden sections retain their identity for layout, but their unpublished copy/media never reach visitors.
export function publicHome(document: HomeDocument): HomeDocument {
  return {
    ...document,
    sections: document.sections.map((s) =>
      s.visible ? s : section(s.kind, { id: s.id, visible: false, title: '' }),
    ),
  };
}
