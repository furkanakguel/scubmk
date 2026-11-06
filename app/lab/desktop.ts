export const APPS = [
  'console',
  'terminal',
  'events',
  'team',
  'game',
  'cards',
  'faq',
  'notes',
  'settings',
  'files',
  'tasks',
] as const;
export type AppId = (typeof APPS)[number];
export const appLabels: Record<AppId, string> = {
  console: 'BMK Terminal',
  terminal: 'Kod atölyesi',
  events: 'Etkinlikler',
  game: 'BMK Run',
  team: 'Kulüp ekibi',
  faq: 'Yardım masası',
  cards: 'Üyelik kartları',
  notes: 'Not defteri',
  settings: 'Sistem ayarları',
  files: 'Dosya gezgini',
  tasks: 'Görev yöneticisi',
};
export const THEMES = ['meadow', 'night', 'amber', 'aurora', 'blueprint', 'dune'] as const;
export type DesktopTheme = (typeof THEMES)[number];
export const themeLabels: Record<DesktopTheme, string> = {
  meadow: 'Çayır',
  night: 'Gece',
  amber: 'Gün batımı',
  aurora: 'Kuzey ışıkları',
  blueprint: 'Plan defteri',
  dune: 'Kum tepeleri',
};
export type Bounds = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Frame = { rect: Rect; maximized: boolean; snap: 'left' | 'right' | null };
export type DesktopState = {
  open: AppId[];
  order: AppId[];
  minimized: AppId[];
  focus: AppId | null;
  frames: Partial<Record<AppId, Frame>>;
};
export const initialDesktop: DesktopState = {
  open: ['console'],
  order: ['console'],
  minimized: [],
  focus: 'console',
  frames: {},
};
export const validApp = (v: unknown): v is AppId =>
  typeof v === 'string' && (APPS as readonly string[]).includes(v);
const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(min, max), Math.max(min, v));
export function fitRect(r: Rect, b: Bounds): Rect {
  const maxW = Math.max(1, b.w - 12),
    maxH = Math.max(1, b.h - 58),
    w = clamp(Number.isFinite(r.w) ? r.w : 700, Math.min(350, maxW), maxW),
    h = clamp(Number.isFinite(r.h) ? r.h : 530, Math.min(360, maxH), maxH);
  return {
    x: clamp(Number.isFinite(r.x) ? r.x : 6, 6, b.w - w - 6),
    y: clamp(Number.isFinite(r.y) ? r.y : 6, 6, b.h - h - 52),
    w,
    h,
  };
}
export function defaultRect(app: AppId, b: Bounds, index = 0): Rect {
  const narrow = b.w < 640,
    w =
      app === 'game'
        ? 1000
        : app === 'terminal'
          ? 910
          : app === 'console'
            ? 790
            : app === 'settings'
              ? 790
              : 680;
  return fitRect(
    {
      x: narrow ? 6 : 190 + (index % 4) * 26,
      y: narrow ? 15 : 30 + (index % 4) * 26,
      w: narrow ? b.w - 12 : Math.min(w, b.w - 230),
      h: narrow ? b.h - 74 : Math.min(app === 'game' || app === 'terminal' ? 700 : 590, b.h - 104),
    },
    b,
  );
}
export function frameRect(frame: Frame, b: Bounds): Rect {
  if (frame.maximized) return { x: 0, y: 0, w: b.w, h: b.h - 46 };
  if (frame.snap && b.w >= 760) {
    const w = (b.w - 18) / 2;
    return { x: frame.snap === 'left' ? 6 : w + 12, y: 6, w, h: b.h - 58 };
  }
  return fitRect(frame.rect, b);
}
export type DesktopAction =
  | { type: 'open' | 'focus'; app: AppId }
  | { type: 'close' | 'minimize'; app: AppId }
  | { type: 'desktop' }
  | { type: 'frame'; app: AppId; frame: Frame }
  | { type: 'reset' };
export function desktopReducer(s: DesktopState, a: DesktopAction): DesktopState {
  if (a.type === 'desktop') return { ...s, minimized: [...s.open], focus: null };
  if (a.type === 'reset') return { ...s, frames: {} };
  if (!validApp(a.app)) return s;
  if (a.type === 'frame') return { ...s, frames: { ...s.frames, [a.app]: a.frame } };
  if (a.type === 'open' || a.type === 'focus') {
    if (a.type === 'focus' && !s.open.includes(a.app)) return s;
    if (s.focus === a.app && !s.minimized.includes(a.app)) return s;
    return {
      ...s,
      open: s.open.includes(a.app) ? s.open : [...s.open, a.app],
      order: [...s.order.filter((id) => id !== a.app), a.app],
      minimized: s.minimized.filter((id) => id !== a.app),
      focus: a.app,
    };
  }
  const open = a.type === 'close' ? s.open.filter((id) => id !== a.app) : s.open,
    order = a.type === 'close' ? s.order.filter((id) => id !== a.app) : s.order,
    minimized =
      a.type === 'minimize'
        ? [...new Set([...s.minimized, a.app])]
        : s.minimized.filter((id) => id !== a.app);
  return {
    ...s,
    open,
    order,
    minimized,
    focus:
      s.focus === a.app
        ? ([...order].reverse().find((id) => !minimized.includes(id)) ?? null)
        : s.focus,
  };
}
export function iconSlots(b: Bounds, count: number = APPS.length) {
  const mobile = b.w < 640,
    cols = mobile ? 3 : Math.max(1, Math.ceil(count / Math.max(1, Math.floor((b.h - 76) / 91)))),
    rows = mobile ? Math.ceil(count / cols) : Math.ceil(count / cols),
    cellW = mobile ? (b.w - 16) / cols : 88;
  return Array.from({ length: count }, (_, i) => ({
    x: 8 + (mobile ? i % cols : Math.floor(i / rows)) * cellW,
    y: 12 + (mobile ? Math.floor(i / cols) : i % rows) * 91,
    w: cellW,
    h: 85,
  }));
}
export function reorderIcons(order: AppId[], from: AppId, to: number) {
  if (!validApp(from) || !Number.isInteger(to) || to < 0 || to >= order.length) return order;
  const next = order.filter((a) => a !== from);
  next.splice(to, 0, from);
  return next;
}
export type Preferences = {
  version: 2;
  theme: DesktopTheme;
  icons: AppId[];
  frames: Partial<Record<AppId, Frame>>;
};
export function readPreferences(raw: string | null): Preferences {
  const fallback: Preferences = { version: 2, theme: 'meadow', icons: [...APPS], frames: {} };
  if (!raw || raw.length > 20000) return fallback;
  try {
    const p = JSON.parse(raw);
    if (p.version !== 2) return fallback;
    const icons: Array<AppId> = Array.isArray(p.icons) ? p.icons.filter(validApp) : [];
    const frames: Preferences['frames'] = {};
    for (const app of APPS) {
      const f = p.frames?.[app];
      if (
        f &&
        f.rect &&
        ['x', 'y', 'w', 'h'].every(
          (k) =>
            typeof f.rect[k] === 'number' &&
            Number.isFinite(f.rect[k]) &&
            Math.abs(f.rect[k]) <= 10000,
        )
      )
        frames[app] = {
          rect: { x: f.rect.x, y: f.rect.y, w: f.rect.w, h: f.rect.h },
          maximized: f.maximized === true,
          snap: f.snap === 'left' || f.snap === 'right' ? f.snap : null,
        };
    }
    return {
      version: 2,
      theme: THEMES.includes(p.theme) ? p.theme : 'meadow',
      icons: [...new Set([...icons, ...APPS])],
      frames,
    };
  } catch {
    return fallback;
  }
}
