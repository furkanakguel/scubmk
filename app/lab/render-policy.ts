// A settled voxel shape is transformed by its parent group, not rebuilt each frame.
export type VoxelFrame = { explode: number; logo: number; burst: number; clock: number };
export function voxelFrameChanged(previous: VoxelFrame | null, next: VoxelFrame) {
  if (!previous) return true;
  if (
    previous.explode !== next.explode ||
    previous.logo !== next.logo ||
    previous.burst !== next.burst
  )
    return true;
  return (next.explode !== 0 || next.burst !== 0) && previous.clock !== next.clock;
}
export function settle(value: number, target: number, epsilon = 0.001) {
  return Math.abs(value - target) < epsilon ? target : value;
}
export function frameDue(now: number, last: number, mobile: boolean) {
  return !last || now - last >= 1000 / (mobile ? 30 : 60) - 0.5;
}
