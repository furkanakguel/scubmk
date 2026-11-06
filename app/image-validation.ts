// Inspect container structure and dimensions before storing a raster upload.
// This is not a malware scanner or a full pixel decoder.
export function inspectImage(
  bytes: Uint8Array,
): { type: string; width: number; height: number } | null {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      text = (at: number, n: number) => new TextDecoder().decode(bytes.subarray(at, at + n));
    let type = '',
      width = 0,
      height = 0;
    if (bytes.length >= 33 && [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => bytes[i] === x)) {
      if (v.getUint32(8) !== 13 || text(12, 4) !== 'IHDR') return null;
      width = v.getUint32(16);
      height = v.getUint32(20);
      let at = 8,
        data = false,
        end = false;
      while (at + 12 <= bytes.length) {
        const len = v.getUint32(at),
          kind = text(at + 4, 4);
        if (len > bytes.length - at - 12) return null;
        if (kind === 'IDAT' && len) data = true;
        if (kind === 'IEND') {
          end = len === 0 && at + 12 === bytes.length;
          break;
        }
        at += len + 12;
      }
      if (!data || !end) return null;
      type = 'image/png';
    } else if (
      bytes.length > 20 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes.at(-2) === 255 &&
      bytes.at(-1) === 217
    ) {
      let at = 2;
      while (at + 4 < bytes.length) {
        if (bytes[at++] !== 255) return null;
        while (bytes[at] === 255) at++;
        const marker = bytes[at++];
        if (marker === 218) break;
        if (marker === 1 || (marker >= 208 && marker <= 217)) continue;
        const len = v.getUint16(at);
        if (len < 2 || at + len > bytes.length) return null;
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          if (len < 8) return null;
          height = v.getUint16(at + 3);
          width = v.getUint16(at + 5);
        }
        at += len;
      }
      type = 'image/jpeg';
    } else if (
      bytes.length >= 26 &&
      text(0, 4) === 'RIFF' &&
      text(8, 4) === 'WEBP' &&
      v.getUint32(4, true) + 8 === bytes.length
    ) {
      let at = 12,
        found = false;
      while (at + 8 <= bytes.length) {
        const kind = text(at, 4),
          len = v.getUint32(at + 4, true),
          data = at + 8;
        if (data + len > bytes.length) return null;
        if (
          kind === 'VP8 ' &&
          len >= 10 &&
          bytes[data + 3] === 157 &&
          bytes[data + 4] === 1 &&
          bytes[data + 5] === 42
        ) {
          width = v.getUint16(data + 6, true) & 16383;
          height = v.getUint16(data + 8, true) & 16383;
          found = true;
        }
        if (kind === 'VP8L' && len >= 5 && bytes[data] === 47) {
          const b = v.getUint32(data + 1, true);
          width = (b & 16383) + 1;
          height = ((b >>> 14) & 16383) + 1;
          found = true;
        }
        if (kind === 'ANIM' || kind === 'ANMF') return null;
        at = data + len + (len % 2);
      }
      if (!found || at !== bytes.length) return null;
      type = 'image/webp';
    }
    return type &&
      width > 0 &&
      height > 0 &&
      width <= 8192 &&
      height <= 8192 &&
      width * height <= 24000000
      ? { type, width, height }
      : null;
  } catch {
    return null;
  }
}
