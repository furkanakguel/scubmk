import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
// Native 32px PNG cursors work in Safari as well as Chromium. One image replaces
// the system pointer: there is no DOM follower, animation loop or pointer lag.
const shapes = {
  text: [
    '######  ######',
    ' #WW#    #WW#',
    '  #W#    #W#',
    '   #W####W#',
    '    #WWWW#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #W##W#',
    '    #WWWW#',
    '   #W####W#',
    '  #W#    #W#',
    ' #WW#    #WW#',
    '######  ######',
  ],
  blocked: [
    '     #######',
    '   ##WWWWWWW##',
    '  #WWWWWWWWWWW#',
    ' #WWW#######WWW#',
    '#WWW##WWWWWWW#WW#',
    '#WWW#W#WWWWWW#WW#',
    '#WW#WW#WWWWW#WWW#',
    '#WW#WWW#WWWW#WWW#',
    '#WW#WWWW#WWW#WWW#',
    '#WW#WWWWW#WW#WWW#',
    '#WW#WWWWWW#W#WWW#',
    '#WWW#WWWWWW#WWW#',
    ' #WWW#######WWW#',
    '  #WWWWWWWWWWW#',
    '   ##WWWWWWW##',
    '     #######',
  ],
  arrow: [
    '#',
    '##',
    '#W#',
    '#WW#',
    '#WWW#',
    '#WWWW#',
    '#WWWWW#',
    '#WWWWWW#',
    '#WWWWWWW#',
    '#WWWWWWWW#',
    '#WWWWWWWWW#',
    '#WWWWWWWWWW#',
    '#WWWWWWWWWWW#',
    '#WWWWWW#######',
    '#WWWW#G#',
    '#WWW#GW#',
    '#WW# #GW#',
    '#W#  #GW#',
    '##    #GW#',
    '#      #GW#',
    '        ##',
  ],
  hand: [
    '       ###',
    '      #WWW#',
    '      #WWW#',
    '      #WWW#',
    '      #WWW#',
    '      #WWW####',
    '      #WWW#WWW###',
    '      #WWW#WWW#WW##',
    '      #WWWWWWWWWWWW#',
    '  ### #WWWWWWWWWWWW#',
    ' #WWW##WWWWWWWWWWWW#',
    ' #WWWW#WWWWWWWWWWWW#',
    '  #WWWWWWWWWWWWWWWW#',
    '   #WWWWWWWWWWWWWWW#',
    '    #WWWWWWWWWWWWWW#',
    '     #WWWWWWWWWWWW#',
    '      #WWWWWWWWWWW#',
    '       #GGGGGGGGG#',
    '       #WWWWWWWWW#',
    '        #########',
  ],
  grab: [
    '      ##  ##',
    '   ###WW##WW#',
    '  #WW#WW#WWW# ##',
    '  #WW#WW#WWW##WW#',
    '  #WWWWWWWWWW#WW#',
    '   #WWWWWWWWWWWW#',
    '   #WWWWWWWWWWWW#',
    '### #WWWWWWWWWWW#',
    '#WW##WWWWWWWWWWW#',
    '#WWWWWWWWWWWWWWW#',
    ' #WWWWWWWWWWWWWW#',
    '  #WWWWWWWWWWWWW#',
    '   #WWWWWWWWWWW#',
    '    #WWWWWWWWWW#',
    '     #GGGGGGGG#',
    '     #WWWWWWWW#',
    '      ########',
  ],
  grabbing: [
    '     ############',
    '    #WWWWWWWWWWWW#',
    '   #WW#WW#WW#WWWWW#',
    '   #WWWWWWWWWWWWWW#',
    ' ###WWWWWWWWWWWWWW#',
    '#WWW#WWWWWWWWWWWWW#',
    '#WWWWWWWWWWWWWWWWW#',
    ' #WWWWWWWWWWWWWWWW#',
    '  #WWWWWWWWWWWWWW#',
    '   #WWWWWWWWWWWWW#',
    '    #WWWWWWWWWWW#',
    '     #GGGGGGGGG#',
    '     #WWWWWWWWW#',
    '      #########',
  ],
  resize: [
    '########',
    '#WWWWW#',
    '#WWWW#',
    '#WWWGW#',
    '#WW#WGW#',
    '#W# #WGW#',
    '##   #WGW#',
    '      #WGW#',
    '       #WGW#',
    '        #WGW#',
    '         #WGW#   ##',
    '          #WGW# #W#',
    '           #WGW#WW#',
    '            #WGWWW#',
    '             #WWWW#',
    '            #WWWWW#',
    '           ########',
  ],
};
const palette = { '#': [22, 38, 28, 255], W: [248, 250, 235, 255], G: [166, 199, 110, 255] };
let table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([name, data])), data.length + 8);
  return out;
}
mkdirSync('public/assets/cursors', { recursive: true });
for (const [name, rows] of Object.entries(shapes)) {
  const pixels = Buffer.alloc(32 * (1 + 32 * 4));
  const offset = name === 'arrow' ? 1 : 4;
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const color = palette[c];
      if (color) Buffer.from(color).copy(pixels, (y + offset) * 129 + 1 + (x + offset) * 4);
    }),
  );
  const header = Buffer.alloc(13);
  header.writeUInt32BE(32);
  header.writeUInt32BE(32, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    'public/assets/cursors/bmk-' + name + '.png',
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(pixels)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
console.log('Built seven native BMK pixel cursors.');
