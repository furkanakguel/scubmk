import { APPS, type AppId, type Bounds, type Rect } from './desktop';

export type Point = { x: number; y: number };
export type IconPositions = Partial<Record<AppId, Point>>;
export type IconLayouts = { wide: IconPositions; compact: IconPositions };
export const emptyIconLayouts = (): IconLayouts => ({ wide: {}, compact: {} });
export const iconProfile = (bounds: Bounds): keyof IconLayouts =>
  bounds.w < 640 ? 'compact' : 'wide';
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(Math.max(min, max), Number.isFinite(value) ? value : min));

// Coordinates describe the available travel area, not a particular screen size.
export function iconArea(b: Bounds) {
  const w = Math.max(1, Math.min(88, b.w - 16));
  const columns = Math.max(1, Math.floor((b.w - 16) / (w + 6))),
    rows = Math.ceil(APPS.length / columns);
  const h = Math.max(1, Math.min(85, Math.max(44, (b.h - 70) / rows - 6), b.h - 62));
  return {
    w,
    h,
    minX: 8,
    minY: 8,
    maxX: Math.max(8, b.w - w - 8),
    maxY: Math.max(8, b.h - h - 54),
  };
}
export function fitIcon(point: Point, b: Bounds): Rect {
  const a = iconArea(b);
  return { x: clamp(point.x, a.minX, a.maxX), y: clamp(point.y, a.minY, a.maxY), w: a.w, h: a.h };
}
export function encodeIcon(point: Point, b: Bounds): Point {
  const a = iconArea(b),
    p = fitIcon(point, b);
  return { x: (p.x - a.minX) / (a.maxX - a.minX || 1), y: (p.y - a.minY) / (a.maxY - a.minY || 1) };
}
function decodeIcon(point: Point, b: Bounds): Rect {
  const a = iconArea(b);
  return fitIcon(
    { x: a.minX + point.x * (a.maxX - a.minX), y: a.minY + point.y * (a.maxY - a.minY) },
    b,
  );
}
export const iconsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 4 && a.x + a.w + 4 > b.x && a.y < b.y + b.h + 4 && a.y + a.h + 4 > b.y;

// Free drops retain their exact position. Only occupied targets are nudged.
export function vacantIcon(point: Point, occupied: Rect[], b: Bounds): Rect {
  const desired = fitIcon(point, b);
  if (!occupied.some((r) => iconsOverlap(desired, r))) return desired;
  const a = iconArea(b),
    xs = new Set([desired.x, a.minX, a.maxX]),
    ys = new Set([desired.y, a.minY, a.maxY]);
  for (const r of occupied) {
    xs.add(clamp(r.x - a.w - 4, a.minX, a.maxX));
    xs.add(clamp(r.x + r.w + 4, a.minX, a.maxX));
    ys.add(clamp(r.y - a.h - 4, a.minY, a.maxY));
    ys.add(clamp(r.y + r.h + 4, a.minY, a.maxY));
  }
  for (let x = a.minX; x <= a.maxX; x += a.w + 4) xs.add(x);
  for (let y = a.minY; y <= a.maxY; y += a.h + 4) ys.add(y);
  let best = desired,
    distance = Infinity;
  for (const x of xs)
    for (const y of ys) {
      const r = { x, y, w: a.w, h: a.h },
        d = (x - desired.x) ** 2 + (y - desired.y) ** 2;
      if (d < distance && !occupied.some((o) => iconsOverlap(r, o))) {
        best = r;
        distance = d;
      }
    }
  return best;
}
export function layoutIcons(order: AppId[], saved: IconPositions, b: Bounds): Record<AppId, Rect> {
  const a = iconArea(b),
    rows = Math.max(1, Math.floor((a.maxY - a.minY) / (a.h + 6)) + 1);
  const result = {} as Record<AppId, Rect>,
    occupied: Rect[] = [];
  for (const app of [...order.filter((id) => saved[id]), ...order.filter((id) => !saved[id])]) {
    const i = order.indexOf(app),
      compact = b.w < 640,
      cols = Math.max(1, Math.min(3, Math.floor((b.w - 16) / (a.w + 4))));
    const point = saved[app]
      ? decodeIcon(saved[app]!, b)
      : {
          x: compact
            ? a.minX + ((i % cols) * (a.maxX - a.minX)) / Math.max(1, cols - 1)
            : a.minX + Math.floor(i / rows) * (a.w + 6),
          y: a.minY + (compact ? Math.floor(i / cols) : i % rows) * (a.h + 6),
        };
    const r = vacantIcon(point, occupied, b);
    result[app] = r;
    occupied.push(r);
  }
  return result;
}
export function moveIcon(
  order: AppId[],
  saved: IconPositions,
  app: AppId,
  point: Point,
  b: Bounds,
): IconPositions {
  if (!order.includes(app)) return saved;
  const current = layoutIcons(order, saved, b),
    target = vacantIcon(
      point,
      order.filter((id) => id !== app).map((id) => current[id]),
      b,
    );
  return Object.fromEntries(
    order.map((id) => [id, encodeIcon(id === app ? target : current[id], b)]),
  );
}
export function dragIcon(
  start: Point,
  origin: Point,
  pointer: Point,
  scale: Point,
  b: Bounds,
): Rect {
  return fitIcon(
    {
      x: start.x + (pointer.x - origin.x) / (scale.x > 0 ? scale.x : 1),
      y: start.y + (pointer.y - origin.y) / (scale.y > 0 ? scale.y : 1),
    },
    b,
  );
}
export function readIconLayouts(raw: string | null): IconLayouts {
  const layouts = emptyIconLayouts();
  if (!raw || raw.length > 12000) return layouts;
  try {
    const p = JSON.parse(raw);
    if (p?.version !== 1) return layouts;
    for (const profile of ['wide', 'compact'] as const)
      for (const app of APPS) {
        const value = p.layouts?.[profile]?.[app];
        if (
          value &&
          typeof value.x === 'number' &&
          Number.isFinite(value.x) &&
          value.x >= 0 &&
          value.x <= 1 &&
          typeof value.y === 'number' &&
          Number.isFinite(value.y) &&
          value.y >= 0 &&
          value.y <= 1
        )
          layouts[profile][app] = { x: value.x, y: value.y };
      }
  } catch {}
  return layouts;
}
