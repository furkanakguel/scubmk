// Absolute world IDs keep every ridge identical when it crosses a viewport boundary.
export function terrainHeight(id: number, layer: number) {
  let n = Math.imul(id ^ ((layer + 1) * 73856093), 19349663);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return 24 + (((n ^ (n >>> 16)) >>> 0) % 105);
}
export function terrainNodes(offset: number, layer: number, floor: number, width = 880) {
  const stride = [230, 185, 150][layer],
    first = Math.floor(offset / stride) - 1;
  return Array.from({ length: Math.ceil(width / stride) + 4 }, (_, i) => {
    const id = first + i;
    return {
      id,
      x: id * stride - offset,
      y: floor - 15 - layer * 3 - terrainHeight(id, layer) * [1, 0.7, 0.42][layer],
    };
  });
}
