import { cardDesigns, clubRoles, type CardStyle, type ClubRole } from '../membership-model';
import { cardLettering } from './card-lettering';
export type CardSide = 'front' | 'back';
export const CARD_QR_SIZE = 188;
export const CARD_EXPORT_SCALE = 2;
export type CardData = {
  name: string;
  number: string;
  role: ClubRole;
  issued: number;
  sample?: boolean;
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const dino =
  'M9 0h8v1h1v4h-5v1h3v1h-3v2h2v3h-1v-2h-1v4h-2v2h-1v2h2v1H9v-3H7v2h1v1H5v-4H4v-1H3v-1H2v-2H1V9H0V5h1v2h1v1h2V8h1V7h1V6h1V1h1z';
type Metal = {
  base: string;
  end: string;
  ink: string;
  muted: string;
  metal: string[];
  light?: boolean;
  grain: number;
  angle: number;
};
const metals: Record<CardStyle, Metal> = {
  forest: {
    base: '#174238',
    end: '#041b16',
    ink: '#e3ecdf',
    muted: '#a7bbae',
    metal: ['#153d32', '#6d9b7d', '#e0edcd', '#759c7c', '#214d3b', '#b6cfaa', '#2b5a44'],
    grain: 0.055,
    angle: 0,
  },
  cobalt: {
    base: '#152b47',
    end: '#070e1e',
    ink: '#e0e9f5',
    muted: '#9caec6',
    metal: ['#1c365a', '#7599c3', '#edf8ff', '#819cbe', '#263f65', '#c4d9f0', '#304a70'],
    grain: 0.045,
    angle: 90,
  },
  copper: {
    base: '#90634c',
    end: '#34231e',
    ink: '#f9e5cf',
    muted: '#e1bda3',
    metal: ['#4a2b20', '#b57e52', '#ffe7c7', '#cf986b', '#623824', '#eac19a', '#6b402e'],
    grain: 0.055,
    angle: -28,
  },
  mono: {
    base: '#24292b',
    end: '#0a0c0e',
    ink: '#e6e9e5',
    muted: '#a6b0b0',
    metal: ['#282f34', '#8b999e', '#f7faf3', '#7c898d', '#303a40', '#c9d1d1', '#465159'],
    grain: 0.06,
    angle: 90,
  },
  assembly: {
    base: '#c5ced0',
    end: '#7c8e95',
    ink: '#22343a',
    muted: '#3d555e',
    metal: ['#455d67', '#a4bbc1', '#fcfff8', '#b0c7cc', '#536e7a', '#e2ece9', '#708e98'],
    light: true,
    grain: 0.045,
    angle: 0,
  },
  executive: {
    base: '#14201e',
    end: '#060b0b',
    ink: '#e3e7dc',
    muted: '#a6ad98',
    metal: ['#343426', '#8d8765', '#eee7cb', '#afa57d', '#464638', '#d8cda7', '#77775e'],
    grain: 0.055,
    angle: 90,
  },
  advisor: {
    base: '#f3efe5',
    end: '#d8ceb7',
    ink: '#55442d',
    muted: '#7c6747',
    metal: ['#6e5029', '#b99457', '#fff0c6', '#d6b87a', '#84612d', '#eddaad', '#98743d'],
    light: true,
    grain: 0.035,
    angle: 18,
  },
};
const many = (n: number, f: (i: number) => string) =>
  Array.from({ length: n }, (_, i) => f(i)).join('');
const year = (n: number) => (Number.isFinite(n) ? String(n) : '');
const rootTrace = 'M0 158V-124M0-28-112-93V-147M0 48 112-17V-91M0 108-112 43V3M0-78 112-143V-172';
const goldA =
  'M12 284H-58V272H-40L55-8H86L184 272H206V284H103V272H128L105 204H21L-2 272H12ZM28 183H98L63 76Z';
function mark(x: number, y: number, size: number, color: string) {
  return `<path d="${dino}" transform="translate(${x} ${y}) scale(${size / 19})" fill="${color}"/>`;
}
function lettering(style: CardStyle, x: number, y: number, width: number, fill: string) {
  const a = cardLettering[style];
  return `<path d="${a.path}" transform="translate(${x} ${y}) scale(${width / a.width} ${-width / a.width})" fill="${fill}"/>`;
}
function defs(p: Metal) {
  const stops = p.metal
    .map((c, i) => `<stop offset="${i / (p.metal.length - 1)}" stop-color="${c}"/>`)
    .join('');
  return `<defs>
 <linearGradient id="body" x1="0" y1="1" x2=".95" y2="0"><stop stop-color="${p.end}"/><stop offset=".44" stop-color="${p.base}"/><stop offset="1" stop-color="${p.end}"/></linearGradient>
 <linearGradient id="alloy" x1="0" y1="0" x2=".85" y2="1">${stops}</linearGradient>
 <linearGradient id="polish" x1=".8" y1="0" x2="0" y2="1">${stops}</linearGradient>
 <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.metal[3]}"/><stop offset=".24" stop-color="${p.metal[2]}"/><stop offset=".43" stop-color="${p.metal[0]}"/><stop offset=".73" stop-color="${p.metal[4]}"/><stop offset=".89" stop-color="${p.metal[2]}"/><stop offset="1" stop-color="${p.metal[1]}"/></linearGradient>
 <linearGradient id="ink-foil" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="${p.ink}"/><stop offset=".48" stop-color="${p.ink}"/><stop offset="1" stop-color="${p.light ? p.muted : p.metal[1]}"/></linearGradient>
 <linearGradient id="studio" x1=".12" y1="0" x2=".85" y2="1"><stop stop-color="#fff" stop-opacity=".08"/><stop offset=".27" stop-color="#fff" stop-opacity="0"/><stop offset=".51" stop-color="#fff" stop-opacity="${p.light ? '.08' : '.025'}"/><stop offset=".57" stop-color="#fff" stop-opacity="${p.light ? '.22' : '.09'}"/><stop offset=".64" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".04"/></linearGradient>
 <radialGradient id="pool" cx=".78" cy=".34" r=".7"><stop stop-color="${p.metal[1]}" stop-opacity="${p.light ? '.08' : '.18'}"/><stop offset=".85" stop-color="${p.end}" stop-opacity="0"/></radialGradient>
 <filter id="satin" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".68 .18" numOctaves="2" stitchTiles="stitch" seed="23"/><feColorMatrix type="saturate" values="0"/></filter>
 <filter id="cast" x="-30%" y="-25%" width="165%" height="170%"><feDropShadow dx="2" dy="13" stdDeviation="11" flood-color="#000" flood-opacity="${p.light ? '.2' : '.65'}"/></filter>
 <pattern id="hairline" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(${p.angle})"><path d="M0 .7H6M1 3.8H5" stroke="${p.ink}" stroke-opacity=".05" stroke-width=".45"/></pattern>
 <pattern id="engine" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M-11 11a22 22 0 0 1 44 0M-11 12.5a22 22 0 0 1 44 0" fill="none" stroke="${p.metal[1]}" stroke-width=".6" stroke-opacity=".3"/></pattern>
 <clipPath id="card"><rect width="960" height="604" rx="30"/></clipPath><clipPath id="engraving-zone"><path d="M0 123H610V604H0Z"/></clipPath>
 <linearGradient id="engraving-fade" x1="0" y1="1" x2=".3" y2="0"><stop stop-color="#fff"/><stop offset=".58" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="engraving-mask"><rect width="610" height="604" fill="url(#engraving-fade)"/></mask>
 </defs>`;
}
function shell(p: Metal, side: CardSide, inside: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="604" viewBox="0 0 960 604" data-face="${side}">${defs(p)}<g clip-path="url(#card)" font-family="Arial, Helvetica, sans-serif"><rect width="960" height="604" fill="url(#body)"/><rect width="960" height="604" fill="url(#pool)"/><rect width="960" height="604" fill="url(#hairline)"/><rect width="960" height="604" filter="url(#satin)" opacity="${p.grain}"/><rect width="960" height="604" fill="url(#studio)"/>${inside}<rect x="1.4" y="1.4" width="957.2" height="601.2" rx="28.6" fill="none" stroke="url(#rim)" stroke-width="2.8"/><rect x="5" y="5" width="950" height="594" rx="25" fill="none" stroke="${p.ink}" stroke-opacity=".13" stroke-width=".55"/><path d="M31 8H929" stroke="${p.metal[2]}" stroke-opacity=".16" stroke-width=".7"/></g></svg>`;
}
function rootInlay(p: Metal) {
  const terminals = [
    [-112, -147],
    [0, -124],
    [112, -172],
    [112, -91],
    [-112, 3],
  ];
  return `<g transform="translate(729 264) scale(.91) rotate(-16)">
 <g fill="none" stroke="${p.metal[1]}" stroke-width=".6" opacity=".2">${many(10, (i) => `<path d="${rootTrace}" transform="translate(${i * 2.4 - 18} ${i * 2.4 - 18})"/>`)}</g>
 <path d="${rootTrace}" fill="none" stroke="#020807" stroke-width="19" stroke-linejoin="round" stroke-linecap="round" transform="translate(2 3)"/>
 <path d="${rootTrace}" fill="none" stroke="url(#alloy)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
 <path d="${rootTrace}" fill="none" stroke="${p.metal[2]}" stroke-width=".8" stroke-opacity=".85" stroke-linejoin="round" stroke-linecap="round" transform="translate(-2 -2)"/>
 ${terminals.map(([x, y]) => `<g transform="translate(${x} ${y})"><rect x="-14" y="-14" width="28" height="28" rx="5" fill="#020807" transform="translate(1 3)"/><rect x="-14" y="-14" width="28" height="28" rx="5" fill="url(#polish)"/><rect x="-7" y="-7" width="14" height="14" rx="2" fill="${p.end}"/><path d="M-13 8V-8Q-13-13-8-13H8" fill="none" stroke="${p.metal[2]}" stroke-width=".7" stroke-opacity=".75"/></g>`).join('')}
 <path d="M-21 158H21" stroke="url(#polish)" stroke-width="12" stroke-linecap="round"/><path d="M-20 154H20" stroke="${p.metal[2]}" stroke-width=".6"/>
 </g>`;
}
function frontSculpture(style: CardStyle, p: Metal) {
  if (style === 'forest')
    return `<g transform="translate(719 265) rotate(-24)"><g opacity=".16" fill="none" stroke="${p.metal[1]}" stroke-width=".6">${many(12, (i) => `<rect x="${-180 - i * 4}" y="${-180 - i * 4}" width="${360 + i * 8}" height="${360 + i * 8}" rx="${54 + i * 4}"/>`)}</g><g filter="url(#cast)"><rect x="-145" y="-145" width="290" height="290" rx="44" fill="none" stroke="#061811" stroke-width="37" transform="translate(4 7)"/><rect x="-145" y="-145" width="290" height="290" rx="44" fill="none" stroke="url(#alloy)" stroke-width="34"/><rect x="-90" y="-90" width="180" height="180" rx="26" fill="none" stroke="url(#polish)" stroke-width="23"/><rect x="-38" y="-38" width="76" height="76" rx="15" fill="url(#alloy)"/></g><rect x="-161" y="-161" width="322" height="322" rx="60" fill="none" stroke="${p.metal[2]}" stroke-opacity=".65" stroke-width=".8"/><rect x="-128" y="-128" width="256" height="256" rx="29" fill="none" stroke="#0e2a1d" stroke-width="1.3"/><rect x="-78" y="-78" width="156" height="156" rx="15" fill="none" stroke="${p.metal[2]}" stroke-opacity=".6" stroke-width=".7"/>${mark(-16, -18, 33, p.end)}</g>`;
  if (style === 'cobalt')
    return `<g transform="translate(725 267) rotate(-26)"><g fill="none" stroke="${p.metal[1]}" stroke-width=".65" opacity=".2">${many(9, (i) => `<ellipse cy="${8 + i * 4}" rx="${200 + i * 5}" ry="${136 + i * 4}"/>`)}</g><g filter="url(#cast)"><path d="M-179-5A179 111 0 0 0 179-5V28A179 111 0 0 1-179 28Z" fill="url(#polish)"/><path d="M-179-5a179 111 0 1 0 358 0a179 111 0 1 0-358 0M-109-5a109 63 0 1 0 218 0a109 63 0 1 0-218 0" fill-rule="evenodd" fill="url(#alloy)"/></g><ellipse cy="-5" rx="179" ry="111" fill="none" stroke="${p.metal[2]}" stroke-width="1.25"/><ellipse cy="-5" rx="109" ry="63" fill="none" stroke="#142b46" stroke-width="5"/><ellipse cy="-7" rx="111" ry="65" fill="none" stroke="${p.metal[2]}" stroke-opacity=".9" stroke-width=".7"/><g fill="none" stroke="${p.ink}" stroke-opacity=".19" stroke-width=".6">${many(13, (i) => `<ellipse cy="-5" rx="${115 + i * 4.4}" ry="${68 + i * 3.15}"/>`)}</g><path d="M-148 28Q0 134 147 28" fill="none" stroke="${p.metal[2]}" stroke-opacity=".42" stroke-width=".8"/></g>`;
  if (style === 'copper')
    return `<g transform="translate(718 265)"><g opacity=".14" fill="none" stroke="${p.metal[2]}" stroke-width=".6">${many(12, (i) => `<path d="M${-207 - i * 4} ${-152 - i * 4} 0 ${220 + i * 5} ${207 + i * 4} ${-152 - i * 4}"/>`)}</g><g filter="url(#cast)"><path d="M-172-152-92-152 0 27 94-152H174L0 177Z" fill="#382017" transform="translate(5 10)"/><path d="M-172-152-92-152 0 27 0 164Z" fill="url(#polish)"/><path d="M0 27 94-152H174L0 164Z" fill="url(#alloy)"/><path d="M-172-152 0 164 174-152 0 177Z" fill="${p.metal[0]}"/></g><path d="M-171-152-92-152 0 27 94-152H174M-171-152 0 164 174-152M0 27V164" fill="none" stroke="${p.metal[2]}" stroke-opacity=".85" stroke-width="1.2"/><g stroke="${p.metal[0]}" stroke-opacity=".22" stroke-width=".7">${many(21, (i) => `<path d="M${-165 + i * 3} -150 ${-3 + i * 0.13} ${146 - i * 5.4}"/>`)}</g></g>`;
  if (style === 'mono')
    return `<g transform="translate(566 163)"><g opacity=".13" fill="none" stroke="${p.metal[1]}" stroke-width=".65">${many(14, (i) => `<path d="M${-30 - i * 4} ${-55 - i * 4} ${190 + i * 4} 94 ${-30 - i * 4} ${244 + i * 4}"/>`)}</g><g filter="url(#cast)"><path d="M0 0 98 94 0 188 34 222 166 94 34-34Z" fill="#030506" transform="translate(5 8)"/><path d="M0 0 98 94 0 188 34 222 166 94 34-34Z" fill="url(#alloy)"/><path d="M34-34 166 94 34 222 34 230 174 98 41-31Z" fill="url(#polish)"/><path d="M198 190H316V222H198Z" fill="url(#alloy)"/><path d="M198 222H316V230H198Z" fill="#303b40"/></g><path d="M0 0 98 94 0 188M34-34 166 94 34 222M198 190H316" fill="none" stroke="${p.metal[2]}" stroke-opacity=".8" stroke-width=".9"/><path d="M198 194H316" stroke="${p.metal[0]}" stroke-opacity=".55" stroke-width=".7"/></g>`;
  if (style === 'assembly')
    return `<g transform="translate(719 253) rotate(-29)"><g opacity=".18" fill="none" stroke="${p.metal[0]}" stroke-width=".7">${many(9, (i) => `<rect x="${-184 - i * 5}" y="${-167 - i * 5}" width="${380 + i * 10}" height="${386 + i * 10}" rx="${111 + i * 5}"/>`)}</g><g filter="url(#cast)"><rect x="-147" y="-142" width="194" height="249" rx="91" fill="none" stroke="url(#alloy)" stroke-width="39"/><rect x="-48" y="-62" width="194" height="249" rx="91" fill="none" stroke="url(#polish)" stroke-width="39"/><path d="M-94 107H-44Q47 107 47 16V-53" fill="none" stroke="url(#alloy)" stroke-width="39"/></g><rect x="-167" y="-162" width="234" height="289" rx="111" fill="none" stroke="${p.metal[2]}" stroke-width=".8"/><rect x="-28" y="-42" width="154" height="209" rx="71" fill="none" stroke="${p.metal[2]}" stroke-width=".8"/><path d="M-94 107H-44Q47 107 47 16V-53" fill="none" stroke="${p.metal[2]}" stroke-opacity=".5" stroke-width=".65"/></g>`;
  if (style === 'executive') return rootInlay(p);
  return `<g transform="translate(692 144)"><g fill="none" stroke="url(#alloy)" stroke-width=".65" opacity=".46">${many(
    32,
    (i) => {
      const r = 163 + i * 1.4;
      return `<ellipse cx="66" cy="136" rx="${r}" ry="${r * 1.11}" transform="rotate(${i * 3.5} 66 136)"/>`;
    },
  )}</g><g filter="url(#cast)"><path d="${goldA}" fill="url(#alloy)" fill-rule="evenodd"/></g><path d="M-58 284H12V272M21 204H105M28 183 63 76 98 183M86-8 184 272H206V284H103" stroke="${p.metal[2]}" stroke-width="1.1" stroke-opacity=".85" fill="none"/><path d="M55-8-40 272H-58" stroke="${p.metal[0]}" stroke-width=".8" fill="none"/></g>`;
}
function front(style: CardStyle, data: CardData, p: Metal) {
  const widths: Record<CardStyle, number> = {
    forest: 287,
    cobalt: 337,
    copper: 272,
    mono: 367,
    assembly: 354,
    executive: 259,
    advisor: 261,
  };
  const nameSize = Math.min(27, 670 / (Math.max(1, data.name.length) * 0.66));
  const special = style === 'executive' || style === 'advisor';
  return shell(
    p,
    'front',
    `${style === 'advisor' ? '<rect x="18" y="18" width="924" height="568" rx="18" fill="none" stroke="url(#alloy)" stroke-opacity=".58" stroke-width=".7"/>' : ''}
 ${frontSculpture(style, p)}<g fill="${p.ink}"><text x="56" y="82" font-size="29" font-weight="700" letter-spacing="-1.4">BMK</text><path d="M139 62V82" stroke="${p.muted}" stroke-width=".65"/><text x="157" y="79" font-size="11" letter-spacing="2.7">SCÜ</text></g>${mark(870, 55, 29, p.muted)}
 ${lettering(style, 55, 292.5, widths[style], p.light ? '#ffffff60' : '#000000a0')}${lettering(style, 55, 291, widths[style], 'url(#ink-foil)')}
 <path d="M58 327H91" stroke="url(#alloy)" stroke-width="1.6"/>
 <text x="58" y="357" fill="${p.muted}" font-size="10.5" letter-spacing="1.3">${special ? escape(cardDesigns[style].edition) : 'BİLGİSAYAR MÜHENDİSLİĞİ KULÜBÜ'}</text>
 <text x="57" y="457" fill="${p.muted}" font-size="10" letter-spacing="1.8">${escape(clubRoles[data.role].toLocaleUpperCase('tr-TR'))}${data.sample ? ' / ÖRNEK KART' : ''}</text>
 <text x="56" y="499" font-size="${nameSize}" fill="${p.ink}" letter-spacing=".25">${escape(data.name)}</text>
 <text x="57" y="540" fill="${p.muted}" font-family="Courier New, monospace" font-size="13.5" letter-spacing="1.8">${escape(data.number)}</text>
 <text x="903" y="514" fill="${p.muted}" text-anchor="end" font-size="8" letter-spacing="1.8">KATILIM</text><text x="904" y="540" fill="${p.ink}" text-anchor="end" font-family="Courier New, monospace" font-size="15" letter-spacing="2">${year(data.issued)}</text>
 <path d="M57 570H903" stroke="${p.ink}" stroke-opacity=".13" stroke-width=".5"/>`,
  );
}
function guilloche(cx: number, cy: number, rx: number, ry: number) {
  // Rotated ellipses form an engine-turned rosette; native curves stay smooth at every size.
  return `<g transform="translate(${cx} ${cy}) scale(1 ${ry / rx})">${many(38, (i) => `<ellipse rx="${rx}" ry="${rx * 0.36}" transform="rotate(${(i * 180) / 38})"/>`)}</g>`;
}
const engravingCache: Partial<Record<CardStyle, string>> = {};
function reverseEngraving(style: CardStyle, p: Metal) {
  if (engravingCache[style]) return engravingCache[style]!;
  let shape = '';
  if (style === 'forest')
    shape = many(24, (i) => {
      const a = 140 + i * 4.9;
      return `<rect x="${310 - a}" y="${444 - a * 0.62}" width="${a * 2}" height="${a * 1.24}" rx="${42 + i * 2.4}" transform="rotate(-24 310 444)"/>`;
    });
  if (style === 'cobalt')
    shape = many(
      37,
      (i) =>
        `<path d="M-80 ${350 + i * 7}C104 ${195 + i * 6} 350 ${679 - i * 5} 620 ${323 + i * 5}"/>`,
    );
  if (style === 'copper')
    shape = many(
      31,
      (i) =>
        `<path d="M${30 + i * 5.3} ${322 + i * 3.1} 314 ${591 - i * 5} ${598 - i * 5.3} ${322 + i * 3.1}"/>`,
    );
  if (style === 'mono')
    shape = many(
      27,
      (i) =>
        `<path d="M${53 + i * 4.1} ${340 + i * 2.1} ${279 + i * 4.1} 449 ${53 + i * 4.1} ${558 - i * 2.1}M${337 + i * 3.8} ${557 - i * 2.1}H${473 + i * 3.8}"/>`,
    );
  if (style === 'assembly')
    shape = many(
      26,
      (i) =>
        `<rect x="${55 + i * 3.2}" y="${322 + i * 2.7}" width="${340 - i * 6.4}" height="${254 - i * 5.4}" rx="${100 - i * 2.5}"/><rect x="${232 + i * 3.2}" y="${322 + i * 2.7}" width="${340 - i * 6.4}" height="${254 - i * 5.4}" rx="${100 - i * 2.5}"/>`,
    );
  if (style === 'executive')
    shape = `<g transform="translate(328 439) scale(.88 .6)">${many(13, (i) => `<path d="${rootTrace}" transform="translate(${i * 2.3 - 14} ${i * 2.3 - 14})"/>`)}</g>`;
  if (style === 'advisor') shape = guilloche(284, 459, 213, 112);
  return (engravingCache[style] =
    `<g clip-path="url(#engraving-zone)" mask="url(#engraving-mask)" fill="none" stroke="url(#alloy)" stroke-width="${style === 'advisor' ? '.65' : '.8'}" opacity="${p.light ? '.58' : '.48'}">${shape}</g>`);
}
function qrPlate(style: CardStyle, data: CardData, p: Metal, qr: string) {
  const base = `<rect x="664" y="185" width="240" height="240" rx="17" fill="${p.end}" fill-opacity=".4" stroke="url(#alloy)" stroke-width=".8"/><path d="M680 185H888Q904 185 904 202V408" fill="none" stroke="${p.metal[2]}" stroke-opacity=".5" stroke-width=".6"/>`;
  if (qr)
    return (
      base +
      `<rect x="678" y="199" width="212" height="212" rx="7" fill="#fff"/><image x="690" y="211" width="${CARD_QR_SIZE}" height="${CARD_QR_SIZE}" href="${escape(qr)}"/><text x="784" y="454" fill="${p.ink}" text-anchor="middle" font-size="10" letter-spacing="2">ÜYELİĞİ DOĞRULA</text><text x="784" y="479" fill="${p.muted}" text-anchor="middle" font-size="10">Telefon kamerasıyla okut.</text>`
    );
  return (
    base +
    `<g fill="none" stroke="url(#alloy)" stroke-width=".65" opacity=".65">${many(8, (i) => `<circle cx="784" cy="305" r="${58 + i * 4}"/>`)}</g><circle cx="784" cy="305" r="54" fill="${p.base}" stroke="url(#alloy)" stroke-width=".8"/>${mark(762, 281, 47, p.light ? p.metal[0] : p.metal[2])}<text x="784" y="454" fill="${p.ink}" text-anchor="middle" font-size="10" letter-spacing="1.5">${data.sample ? 'QR ÜYELİKLE OLUŞUR' : 'QR HAZIRLANIYOR'}</text><text x="784" y="479" fill="${p.muted}" text-anchor="middle" font-size="10">${data.sample ? 'Örnek kart' : 'Üyelik doğrulama kodun.'}</text>`
  );
}
function back(style: CardStyle, data: CardData, p: Metal, qr: string) {
  const nameSize = Math.min(29, 550 / (Math.max(1, data.name.length) * 0.63));
  return shell(
    p,
    'back',
    `${reverseEngraving(style, p)}${style === 'advisor' ? '<rect x="18" y="18" width="924" height="568" rx="18" fill="none" stroke="url(#alloy)" stroke-opacity=".58" stroke-width=".7"/>' : ''}
 <text x="56" y="80" fill="${p.ink}" font-size="29" font-weight="700" letter-spacing="-1.4">BMK</text><text x="148" y="78" fill="${p.muted}" font-size="10" letter-spacing="2">SCÜ</text>
 ${lettering(style, style === 'mono' ? 752 : style === 'assembly' ? 751 : 776, 82, style === 'mono' || style === 'assembly' ? 152 : 128, 'url(#ink-foil)')}
 <path d="M56 117H904" stroke="${p.ink}" stroke-opacity=".17" stroke-width=".6"/>
 <text x="56" y="180" fill="${p.muted}" font-size="9" letter-spacing="2">KART SAHİBİ</text><text x="55" y="224" fill="${p.ink}" font-size="${nameSize}" letter-spacing=".1">${escape(data.name)}</text>
 <text x="57" y="259" fill="${p.muted}" font-size="10" letter-spacing="1.6">${escape(clubRoles[data.role].toLocaleUpperCase('tr-TR'))}</text>
 <text x="57" y="309" fill="${p.ink}" font-family="Courier New, monospace" font-size="17" letter-spacing="2.1">${escape(data.number)}</text>
 <text x="57" y="506" fill="${p.ink}" font-size="15" letter-spacing=".2">Bilgisayar Mühendisliği Kulübü</text><text x="57" y="532" fill="${p.muted}" font-size="11" letter-spacing=".5">Sivas Cumhuriyet Üniversitesi</text>
 ${qrPlate(style, data, p, qr)}<path d="M57 557H903" stroke="${p.ink}" stroke-opacity=".15" stroke-width=".6"/>
 <text x="57" y="579" fill="${p.muted}" font-size="8" letter-spacing="1">${style === 'advisor' ? 'Akademik danışmanımıza, saygıyla.' : 'SCÜ BMK / DİJİTAL ÜYELİK'}</text><text x="903" y="579" text-anchor="end" fill="${p.muted}" font-size="8" letter-spacing="1.3">${data.sample ? 'ÖRNEK KART / ' : ''}${year(data.issued)}</text>`,
  );
}
export function cardSVG(style: CardStyle, data: CardData, qr = '', side: CardSide = 'front') {
  return side === 'back' ? back(style, data, metals[style], qr) : front(style, data, metals[style]);
}
