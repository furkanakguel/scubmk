import { type DesktopTheme } from './desktop';
export const ACCENTS = ['classic', 'moss', 'violet', 'copper', 'graphite'] as const;
export const INKS = ['sage', 'amber', 'ice'] as const;
export const SIZES = ['compact', 'comfortable', 'large'] as const;
export type Appearance = {
  accent: (typeof ACCENTS)[number];
  ink: (typeof INKS)[number];
  textSize: (typeof SIZES)[number];
  corners: 'classic' | 'soft';
  motion: 'full' | 'reduced';
  recovery: 'cinematic' | 'quick';
  branding: boolean;
};
export const DEFAULT_APPEARANCE: Appearance = {
  accent: 'classic',
  ink: 'sage',
  textSize: 'comfortable',
  corners: 'classic',
  motion: 'full',
  recovery: 'cinematic',
  branding: true,
};
export const accentLabels = {
  classic: 'Kobalt',
  moss: 'Orman',
  violet: 'İris',
  copper: 'Bakır',
  graphite: 'Grafit',
};
export const inkLabels = { sage: 'Fosfor', amber: 'Kehribar', ice: 'Buz' };
export const sizeLabels = { compact: 'Küçük', comfortable: 'Standart', large: 'Büyük' };
export const PRESETS: {
  id: string;
  name: string;
  note: string;
  theme: DesktopTheme;
  appearance: Appearance;
}[] = [
  {
    id: 'original',
    name: 'Klasik BMK',
    note: 'İlk bilgisayarının hissi.',
    theme: 'meadow',
    appearance: { ...DEFAULT_APPEARANCE },
  },
  {
    id: 'afterhours',
    name: 'Gece mesaisi',
    note: 'Koyu cam, soğuk ışık.',
    theme: 'night',
    appearance: { ...DEFAULT_APPEARANCE, accent: 'graphite', ink: 'ice', corners: 'soft' },
  },
  {
    id: 'northern',
    name: 'Kuzey',
    note: 'Yeşil ufuk, sakin tonlar.',
    theme: 'aurora',
    appearance: { ...DEFAULT_APPEARANCE, accent: 'moss', ink: 'sage', corners: 'soft' },
  },
  {
    id: 'archive',
    name: 'Analog',
    note: 'Bakır ve kehribar.',
    theme: 'dune',
    appearance: { ...DEFAULT_APPEARANCE, accent: 'copper', ink: 'amber' },
  },
];
function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}
export function readAppearance(raw: string | null): Appearance {
  if (!raw || raw.length > 4000) return { ...DEFAULT_APPEARANCE };
  try {
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || Array.isArray(p)) return { ...DEFAULT_APPEARANCE };
    return {
      accent: pick(p.accent, ACCENTS, 'classic'),
      ink: pick(p.ink, INKS, 'sage'),
      textSize: pick(p.textSize, SIZES, 'comfortable'),
      corners: pick(p.corners, ['classic', 'soft'], 'classic'),
      motion: pick(p.motion, ['full', 'reduced'], 'full'),
      recovery: pick(p.recovery, ['cinematic', 'quick'], 'cinematic'),
      branding: typeof p.branding === 'boolean' ? p.branding : true,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}
export function matchingPreset(theme: DesktopTheme, appearance: Appearance) {
  return (
    PRESETS.find(
      (p) =>
        p.theme === theme &&
        (['accent', 'ink', 'corners'] as const).every(
          (k) => p.appearance[k as keyof Appearance] === appearance[k as keyof Appearance],
        ),
    )?.id ?? null
  );
}
export type RecoveryRecord = {
  id: string;
  time: string;
  track: string;
  topic: string;
  file: string;
  code: string;
  choice: string;
  status: 'recovered' | 'skipped';
};
export function addRecoveryRecord(records: RecoveryRecord[], record: RecoveryRecord) {
  return [record, ...records.filter((r) => r.id !== record.id)].slice(0, 12);
}
export function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1)),
    offset = (first.getUTCDay() + 6) % 7,
    days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) =>
    i >= offset && i < offset + days ? i - offset + 1 : null,
  );
}
export function istanbulDate(date: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function eventDay(date: string) {
  const match = date.match(/^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  if (!match) return null;
  const parsed = new Date(match[1] + 'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === match[1]
    ? match[1]
    : null;
}
