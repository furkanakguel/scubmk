export const THEMES = [
  {
    name: 'Gece hattı',
    tag: '01 / ŞEHİR',
    sky: ['#0b1328', '#365369'],
    ridges: ['#192e41', '#274558', '#3c6170'],
    ground: '#101e2a',
    line: '#a2cfce',
    metal: '#6d929d',
    edge: '#c6e6db',
    accent: '#aedbd2',
    scene: 'city',
  },
  {
    name: 'Bakır kanyon',
    tag: '02 / ÇÖL',
    sky: ['#341a35', '#bb7560'],
    ridges: ['#59354b', '#85514e', '#aa6953'],
    ground: '#34252d',
    line: '#f3b484',
    metal: '#b67b5e',
    edge: '#ffdaa3',
    accent: '#ffd49c',
    scene: 'canyon',
  },
  {
    name: 'Kayıp orman',
    tag: '03 / ORMAN',
    sky: ['#0b2524', '#527c64'],
    ridges: ['#163d36', '#265b48', '#3c7555'],
    ground: '#122f2b',
    line: '#b1d29e',
    metal: '#789975',
    edge: '#d4e8a8',
    accent: '#c3e6a6',
    scene: 'forest',
  },
  {
    name: 'Buz yarığı',
    tag: '04 / KUTUP',
    sky: ['#122738', '#729baf'],
    ridges: ['#294f65', '#42758b', '#72a5b4'],
    ground: '#153b4c',
    line: '#bfe7ed',
    metal: '#85b7c7',
    edge: '#e8fcff',
    accent: '#cefbff',
    scene: 'ice',
  },
  {
    name: 'Kızıl krater',
    tag: '05 / VOLKAN',
    sky: ['#241624', '#9b4640'],
    ridges: ['#3c2737', '#60363e', '#83453e'],
    ground: '#2c202b',
    line: '#ffba81',
    metal: '#ae6953',
    edge: '#ffd097',
    accent: '#ffa97d',
    scene: 'volcano',
  },
  {
    name: 'Yörünge',
    tag: '06 / İSTASYON',
    sky: ['#151831', '#52567a'],
    ridges: ['#282b4a', '#3b4160', '#535c7d'],
    ground: '#1b223c',
    line: '#c6c6ed',
    metal: '#8b91b3',
    edge: '#e1deff',
    accent: '#c9c5ff',
    scene: 'orbit',
  },
  {
    name: 'Fırtına kıyısı',
    tag: '07 / OKYANUS',
    sky: ['#101d30', '#476579'],
    ridges: ['#203849', '#305267', '#437287'],
    ground: '#142e3f',
    line: '#b5dbe6',
    metal: '#719bac',
    edge: '#d3eff4',
    accent: '#addbe9',
    scene: 'coast',
  },
  {
    name: 'Bulut adaları',
    tag: '08 / GÖKYÜZÜ',
    sky: ['#495878', '#db9d91'],
    ridges: ['#6f6c8a', '#998197', '#b89aa6'],
    ground: '#3c3d59',
    line: '#f5d6bc',
    metal: '#b9a3b5',
    edge: '#ffe8d0',
    accent: '#ffe0c0',
    scene: 'clouds',
  },
];
// A seed-selected permutation visits all eight places, without immediate repeats.
export function themeIndex(seed: number, stage: number) {
  const n = Math.imul(seed ^ 0x45d9f3b, 2654435761) >>> 0;
  return ((n % 8) + Math.max(0, stage) * [3, 5, 7][(n >>> 8) % 3]) % 8;
}
export function environmentAt(tick: number, seed = 42) {
  const seconds = tick / 60,
    stage = Math.floor(seconds / 22),
    progress = Math.min(1, (seconds - stage * 22) / 5),
    mix = progress * progress * (3 - 2 * progress);
  return {
    from: themeIndex(seed, Math.max(0, stage - 1)),
    to: themeIndex(seed, stage),
    mix,
    stage,
  };
}
export function mixColor(a: string, b: string, t: number) {
  const n = parseInt(a.slice(1), 16),
    m = parseInt(b.slice(1), 16);
  return `rgb(${[16, 8, 0].map((s) => Math.round(((n >> s) & 255) * (1 - t) + ((m >> s) & 255) * t)).join(',')})`;
}
