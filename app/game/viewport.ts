// Camera changes are presentation-only; scoring/replay use the same world units.
export function gameViewport(width: number, height: number) {
  const compact = width <= 600 && height / width >= 0.66,
    worldWidth = compact ? 700 : 880;
  return { worldWidth, worldHeight: (worldWidth * height) / width, left: compact ? 60 : 0 };
}
