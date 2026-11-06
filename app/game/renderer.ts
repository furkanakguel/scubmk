import { WIDTH, PLAYER_X, PLAYER_H, levelAt, type RunState } from './engine';
import { gameViewport } from './viewport';
import { terrainNodes } from './scenery';
import { THEMES, environmentAt, mixColor, themeIndex } from './themes';
const shape = [
  '00000000111111110',
  '00000001111111111',
  '00000001101111111',
  '00000001111111111',
  '00000001111100000',
  '00000001111111000',
  '10000011111000000',
  '11000111111000000',
  '11111111111110000',
  '01111111111010000',
  '00111111111000000',
  '00011111110000000',
  '00001111100000000',
];
const TAU = Math.PI * 2;
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};
function spriteCanvas(w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!);
  return c;
}
export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let height = 420,
    viewLeft = 0,
    viewWidth = WIDTH,
    reduced = false,
    low = false,
    deathAge = 1,
    landAge = 1;
  const particles: Particle[] = [];
  let lastBits = 0,
    lastTick = 0,
    lastStatus = 'ready',
    lastShieldHits = 0,
    lastPower = 0,
    lastLand = 0;
  let backdrops: HTMLCanvasElement[] = [];
  const palettes = ['#d9edb0', '#eac4ff', '#a8e3f2', '#ffdba5', '#c3edf0'];
  const dinos = palettes.map((color) =>
    Array.from({ length: 8 }, (_, f) =>
      spriteCanvas(72, 70, (c) => {
        c.fillStyle = color;
        const bob = f % 4 === 1 ? 1 : 0;
        for (let y = 0; y < shape.length; y++)
          for (let x = 0; x < shape[y].length; x++)
            if (shape[y][x] === '1') c.fillRect(x * 3.25 + 4, y * 3.25 + 4 + bob, 3.5, 3.5);
        // Eight distinct strides: feet and knees swing in opposite phases.
        for (let leg = 0; leg < 2; leg++) {
          const a = (f * Math.PI) / 4 + leg * Math.PI,
            hip = 23 + leg * 9,
            knee = hip + Math.sin(a) * 4,
            foot = hip + Math.sin(a) * 8;
          c.fillStyle = leg ? '#91aa80' : color;
          c.fillRect(hip, 42, 5, 7);
          c.fillRect(knee, 47, 5, 6);
          c.fillRect(foot, 52 + Math.min(0, Math.cos(a)) * 3, 9, 4);
        }
        c.fillStyle = '#1c2622';
        c.fillRect(32, 10 + bob, 3.5, 4);
        c.fillStyle = '#f3b968';
        c.fillRect(32, 7 + bob, 22, 3);
        c.fillStyle = '#61877d';
        c.fillRect(24, 26 + bob, 12, 8);
        c.fillStyle = '#f2ffe6';
        c.font = 'bold 7px monospace';
        c.fillText('B', 28, 33 + bob);
      }),
    ),
  );
  const glows = ['#f1d38c', '#9fe6e6', '#d5adff', '#b8e5ff'].map((color) =>
    spriteCanvas(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, color + '66');
      g.addColorStop(1, color + '00');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }),
  );
  function cacheBackdrop() {
    backdrops = THEMES.map((theme, index) =>
      spriteCanvas(WIDTH, Math.ceil(height), (c) => {
        const sky = c.createLinearGradient(0, 0, 0, height);
        sky.addColorStop(0, theme.sky[0]);
        sky.addColorStop(1, theme.sky[1]);
        c.fillStyle = sky;
        c.fillRect(0, 0, WIDTH, height);
        for (let i = 0; i < 64; i++) {
          const x = (i * 167 + 43) % 877,
            y = (((i * 91 + 27) % 311) / 311) * height * 0.57;
          c.fillStyle = index === 1 ? '#f6dfb23b' : i % 5 === 0 ? '#e6e8e897' : '#b4d7e950';
          c.fillRect(x, y, i % 5 === 0 ? 1.8 : 1, 1.3);
        }
        const mx = WIDTH * 0.8,
          my = height * 0.25,
          r = index === 1 ? 38 : 31;
        const glow = c.createRadialGradient(mx, my, r * 0.4, mx, my, r * 3.5);
        glow.addColorStop(0, theme.accent + '25');
        glow.addColorStop(1, theme.accent + '00');
        c.fillStyle = glow;
        c.fillRect(mx - r * 4, my - r * 4, r * 8, r * 8);
        c.fillStyle = index === 1 ? '#ffc894' : index === 2 ? '#d1d5fa' : '#d7e6d6';
        c.beginPath();
        c.arc(mx, my, r, 0, TAU);
        c.fill();
        if (index !== 1) {
          c.fillStyle = theme.sky[1] + '30';
          for (let i = 0; i < 7; i++) {
            c.beginPath();
            c.arc(
              mx + Math.sin(i * 6) * r * 0.65,
              my + Math.cos(i * 3) * r * 0.65,
              3 + (i % 3) * 2,
              0,
              TAU,
            );
            c.fill();
          }
        }
        const horizon = height * 0.69;
        const polygon = (points: number[][], color: string) => {
          c.fillStyle = color;
          c.beginPath();
          points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
          c.closePath();
          c.fill();
        };
        const scene = theme.scene;
        if (scene === 'city')
          for (let i = 0; i < 14; i++) {
            const x = i * 73 - 20,
              h = 38 + ((i * 41) % 103);
            c.fillStyle = theme.ridges[0];
            c.fillRect(x, horizon - h, 46, h);
            c.fillRect(x + 8, horizon - h - 10, 27, 11);
            for (let j = 0; j < 4; j++)
              for (let k = 0; k < 3; k++) {
                c.fillStyle = (j + k + i) % 3 ? '#d4d7a324' : '#c5dfcb64';
                c.fillRect(x + 9 + k * 11, horizon - h + 12 + j * 17, 3, 5);
              }
          }
        if (scene === 'canyon')
          for (let i = 0; i < 6; i++) {
            const x = i * 177 - 45,
              h = 65 + ((i * 41) % 90);
            polygon(
              [
                [x, horizon],
                [x + 20, horizon - h * 0.8],
                [x + 38, horizon - h * 0.8],
                [x + 40, horizon - h],
                [x + 115, horizon - h],
                [x + 120, horizon - h * 0.5],
                [x + 155, horizon],
              ],
              theme.ridges[i % 2],
            );
            c.fillStyle = '#f4b28a35';
            c.fillRect(x + 41, horizon - h + 10, 71, 3);
            c.fillRect(x + 30, horizon - h * 0.6, 93, 2);
          }
        if (scene === 'forest')
          for (let i = 0; i < 16; i++) {
            const x = i * 62,
              h = 85 + ((i * 37) % 105);
            c.fillStyle = theme.ridges[0];
            c.fillRect(x + 15, horizon - h, 9, h);
            for (let j = 0; j < 3; j++) {
              const y = horizon - h + j * 37;
              polygon(
                [
                  [x + 19, y - 28],
                  [x - 18 - j * 5, y + 49],
                  [x + 56 + j * 5, y + 49],
                ],
                j % 2 ? theme.ridges[0] : theme.ridges[1],
              );
            }
          }
        if (scene === 'ice')
          for (let i = 0; i < 8; i++) {
            const x = i * 133 - 70,
              h = 65 + ((i * 33) % 140);
            polygon(
              [
                [x, horizon],
                [x + 60, horizon - h],
                [x + 135, horizon],
              ],
              theme.ridges[0],
            );
            polygon(
              [
                [x + 60, horizon - h],
                [x + 89, horizon - h * 0.6],
                [x + 70, horizon - h * 0.65],
                [x + 55, horizon - h * 0.45],
                [x + 44, horizon - h * 0.72],
              ],
              '#d7edf09a',
            );
            polygon(
              [
                [x + 60, horizon - h],
                [x + 135, horizon],
                [x + 80, horizon],
              ],
              theme.ridges[1],
            );
          }
        if (scene === 'volcano') {
          polygon(
            [
              [0, horizon],
              [180, horizon - 45],
              [350, horizon - 190],
              [408, horizon - 190],
              [600, horizon],
              [880, horizon],
            ],
            theme.ridges[0],
          );
          polygon(
            [
              [280, horizon - 105],
              [350, horizon - 190],
              [408, horizon - 190],
              [465, horizon - 105],
              [407, horizon - 146],
              [379, horizon - 135],
              [347, horizon - 150],
            ],
            '#ed9564',
          );
          c.strokeStyle = '#e89a6550';
          c.lineWidth = 9;
          c.beginPath();
          c.moveTo(379, horizon - 160);
          c.lineTo(402, horizon - 91);
          c.lineTo(376, horizon - 64);
          c.lineTo(409, horizon);
          c.stroke();
          for (let i = 0; i < 7; i++) {
            c.fillStyle = '#e8b09b12';
            c.beginPath();
            c.ellipse(
              378 + Math.sin(i * 2) * 27,
              horizon - 211 - i * 13,
              45 + i * 7,
              20 + i * 3,
              0,
              0,
              TAU,
            );
            c.fill();
          }
        }
        if (scene === 'orbit') {
          c.strokeStyle = '#c1c1e855';
          c.lineWidth = 8;
          c.beginPath();
          c.ellipse(mx, my, 65, 15, -0.35, 0, TAU);
          c.stroke();
          for (let i = 0; i < 5; i++) {
            const x = i * 220 + 40;
            c.fillStyle = theme.ridges[0];
            c.fillRect(x, horizon - 110, 16, 110);
            c.fillRect(x - 15, horizon - 113, 85, 8);
            c.strokeStyle = theme.ridges[1];
            c.lineWidth = 5;
            c.beginPath();
            c.arc(x + 30, horizon - 105, 45, Math.PI, 0);
            c.stroke();
            for (let j = 0; j < 3; j++) c.fillRect(x + 20 + j * 16, horizon - 98, 8, 36);
          }
        }
        if (scene === 'coast') {
          c.fillStyle = '#a3cbd320';
          c.fillRect(0, horizon - 35, 880, 60);
          for (let i = 0; i < 8; i++) {
            c.fillStyle = '#bdd9e437';
            c.fillRect(i * 140 + 23, horizon - 27 + (i % 3) * 14, 95, 1);
          }
          polygon(
            [
              [590, horizon],
              [620, horizon - 60],
              [700, horizon - 70],
              [785, horizon],
              [880, horizon],
            ],
            theme.ridges[0],
          );
          c.fillStyle = '#c4d8d7aa';
          c.fillRect(673, horizon - 139, 15, 72);
          c.fillStyle = '#ddeacc';
          c.fillRect(669, horizon - 148, 23, 11);
          polygon(
            [
              [667, horizon - 149],
              [680, horizon - 160],
              [693, horizon - 149],
            ],
            theme.ridges[0],
          );
          polygon(
            [
              [680, horizon - 145],
              [430, horizon - 175],
              [430, horizon - 105],
            ],
            '#e7ebc612',
          );
        }
        if (scene === 'clouds')
          for (let i = 0; i < 7; i++) {
            const x = i * 164 - 30,
              y = height * 0.3 + (i % 3) * 34;
            c.fillStyle = '#f4d6cc33';
            for (let j = 0; j < 3; j++) {
              c.beginPath();
              c.ellipse(x + j * 24, y + Math.sin(j) * 8, 34 + j * 8, 14 + j * 5, 0, 0, TAU);
              c.fill();
            }
            polygon(
              [
                [x - 15, y + 60],
                [x + 85, y + 60],
                [x + 38, y + 104],
              ],
              theme.ridges[0],
            );
            c.fillStyle = theme.ridges[1];
            c.fillRect(x - 15, y + 53, 100, 7);
          }
      }),
    );
  }
  function burst(x: number, y: number, color: string, count: number, force = 1) {
    if (reduced) return;
    const cap = low ? 30 : 64;
    for (let i = 0; i < count && particles.length < cap; i++)
      particles.push({
        x,
        y,
        vx: (-40 - Math.random() * 130) * force,
        vy: (Math.random() - 0.5) * 180 * force,
        life: 0.35 + Math.random() * 0.35,
        color,
        size: 2 + Math.random() * 2,
      });
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    low = rect.width < 600;
    const dpr = Math.min(devicePixelRatio, low ? 1.5 : 1.75);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const view = gameViewport(rect.width, rect.height);
    height = view.worldHeight;
    viewLeft = view.left;
    viewWidth = view.worldWidth;
    const scale = canvas.width / view.worldWidth;
    ctx.setTransform(scale, 0, 0, scale, -view.left * scale, 0);
    ctx.imageSmoothingEnabled = true;
    cacheBackdrop();
  }
  function poly(points: number[][], fill: string) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i) ctx.lineTo(points[i][0], points[i][1]);
      else ctx.moveTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }
  function line(x: number, y: number, x2: number, y2: number, color: string, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function bird(x: number, y: number, size: number, phase: number, color: string, hostile = false) {
    const c = ctx,
      wing = Math.sin(phase) * 0.8;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    poly(
      [
        [-28, -3],
        [-8, 1],
        [9, 3],
        [24, -3],
        [31, 0],
        [24, 6],
        [5, 11],
        [-15, 7],
      ],
      color,
    );
    poly(
      [
        [-7, 3],
        [-28, -17 - wing * 20],
        [-42, -22 - wing * 23],
        [-25, 1],
        [-8, 9],
      ],
      color,
    );
    poly(
      [
        [0, 4],
        [21, -15 - wing * 20],
        [31, -19 - wing * 19],
        [20, 5],
        [6, 10],
      ],
      color,
    );
    poly(
      [
        [26, 1],
        [39, 5],
        [26, 8],
      ],
      hostile ? '#efad7e' : '#f8d08c',
    );
    c.fillStyle = hostile ? '#ffceab' : '#f9f0d9';
    c.fillRect(20, -1, 4, 4);
    c.fillStyle = '#20232f';
    c.fillRect(22, 0, 2, 2);
    line(-3, 10, -6, 21, '#efc58c', 2);
    line(-6, 21, 0, 24, '#efc58c', 2);
    line(9, 10, 8, 21, '#efc58c', 2);
    line(8, 21, 14, 24, '#efc58c', 2);
    c.restore();
  }
  function draw(s: RunState, dt = 0) {
    const c = ctx,
      floor = height * 0.77,
      time = reduced ? 0 : s.tick / 60,
      env = environmentAt(s.tick, s.seed),
      a = THEMES[env.from],
      b = THEMES[env.to],
      accent = mixColor(a.accent, b.accent, env.mix);
    if (s.tick < lastTick) {
      particles.length = 0;
      lastBits = 0;
      lastShieldHits = 0;
      lastLand = 0;
      lastPower = 0;
      deathAge = 1;
    }
    if (backdrops.length) {
      c.globalAlpha = 1;
      c.drawImage(backdrops[env.from], 0, 0);
      if (env.from !== env.to) {
        c.globalAlpha = env.mix;
        c.drawImage(backdrops[env.to], 0, 0);
        c.globalAlpha = 1;
      }
    }
    for (let layer = 0; layer < 3; layer++) {
      const nodes = terrainNodes(
        reduced ? 0 : s.distance * [0.035, 0.065, 0.11][layer],
        layer,
        floor,
      );
      c.fillStyle = mixColor(a.ridges[layer], b.ridges[layer], env.mix);
      c.beginPath();
      c.moveTo(nodes[0].x, floor + 3);
      for (const n of nodes) c.lineTo(n.x, n.y);
      c.lineTo(nodes[nodes.length - 1].x, floor + 3);
      c.closePath();
      c.fill();
      c.globalAlpha = 0.14;
      c.strokeStyle = accent;
      c.lineWidth = 1;
      c.stroke();
      c.globalAlpha = 1;
    }
    if (!reduced && b.scene === 'coast') {
      c.globalAlpha = 0.13;
      for (let i = 0; i < (low ? 12 : 24); i++) {
        const x = (i * 53 + time * 100) % WIDTH,
          y = (i * 97 + time * 190) % (floor - 20);
        line(x, y, x - 5, y + 14, b.accent, 0.7);
      }
      c.globalAlpha = 1;
    }
    // Atmospheric details translate with fixed world IDs, never resize when wrapped.
    for (let i = 0; i < (low ? 9 : 18); i++) {
      const x = ((((i * 137 - s.distance * 0.18) % 1100) + 1100) % 1100) - 80,
        y = 35 + ((i * 53) % Math.max(80, floor - 80));
      c.globalAlpha = 0.1 + (Math.sin(time + i) + 1) * 0.05;
      c.fillStyle = accent;
      c.fillRect(x, y, 2, 2);
    }
    c.globalAlpha = 1;
    c.fillStyle = mixColor(a.ground, b.ground, env.mix);
    c.fillRect(0, floor, WIDTH, height - floor);
    c.fillStyle = accent;
    c.fillRect(0, floor, WIDTH, 1.5);
    for (let i = -1; i < 10; i++) {
      const x = i * 130 - ((s.distance * 0.7) % 130);
      line(x, floor + 3, x - 65, height, accent, 0.4);
      c.globalAlpha = 0.28;
      c.fillStyle = accent;
      c.fillRect(x + 14, floor + 20, 28, 2);
      c.globalAlpha = 1;
    }
    c.fillStyle = accent;
    c.globalAlpha = 0.45;
    c.font = '10px monospace';
    c.fillText('BMK / OVERCLOCK', viewLeft + 22, height - 20);
    c.textAlign = 'right';
    c.fillText(
      `${Math.floor(s.distance / 10)
        .toString()
        .padStart(4, '0')} M`,
      viewLeft + viewWidth - 22,
      height - 20,
    );
    c.textAlign = 'left';
    c.globalAlpha = 1;
    // Level transitions fade in place. No camera cut, flash or geometry swap.
    const since = (s.tick / 60) % 22;
    if (s.tick > 60 && since < 4 && env.stage > 0) {
      c.globalAlpha = Math.sin((since / 4) * Math.PI) * 0.8;
      c.fillStyle = b.accent;
      c.font = '12px monospace';
      c.fillText(
        `SEVİYE ${levelAt(s.tick)}  /  ${b.name.toLocaleUpperCase('tr')}`,
        viewLeft + 24,
        31,
      );
      c.globalAlpha = 1;
    }
    for (const o of s.obstacles) {
      if (o.x > WIDTH + 30 || o.x + o.w < 0) continue;
      const y = floor - o.bottom - o.h,
        t = THEMES[themeIndex(s.seed, o.level - 1)];
      if (o.kind === 'bird' || o.kind === 'bat') {
        bird(
          o.x + o.w / 2,
          y + o.h / 2,
          0.83,
          o.kind === 'bat' ? time * 16 : time * 11,
          o.kind === 'bat' ? '#d2aac7' : t.edge,
          true,
        );
      } else if (o.kind === 'storm') {
        c.fillStyle = '#65788e';
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(o.x + 14 + k * 22, y + 14 + (k === 1 ? -7 : 0), 20, 17, 0, 0, TAU);
          c.fill();
        }
        poly(
          [
            [o.x + 39, y + 14],
            [o.x + 21, y + 34],
            [o.x + 35, y + 32],
            [o.x + 24, y + 49],
            [o.x + 54, y + 25],
            [o.x + 39, y + 28],
          ],
          '#f4d49c',
        );
      } else if (o.kind === 'mine') {
        c.save();
        c.translate(o.x + 19, y + 19);
        c.rotate(reduced ? 0 : time * 2);
        c.fillStyle = '#586877';
        c.beginPath();
        c.arc(0, 0, 17, 0, TAU);
        c.fill();
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8;
          line(Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * 23, Math.sin(a) * 23, t.edge, 3);
        }
        c.fillStyle = '#f49b84';
        c.beginPath();
        c.arc(0, 0, 6, 0, TAU);
        c.fill();
        c.restore();
      } else if (o.kind === 'spikes') {
        for (let k = 0; k < 4; k++) {
          const x = o.x + k * 21;
          poly(
            [
              [x, floor],
              [x + 10, y],
              [x + 21, floor],
            ],
            t.edge,
          );
          poly(
            [
              [x + 10, y],
              [x + 21, floor],
              [x + 12, floor],
            ],
            t.metal,
          );
        }
        c.fillStyle = t.metal;
        c.fillRect(o.x, floor - 4, o.w, 4);
      } else if (o.kind === 'log') {
        c.fillStyle = t.metal;
        c.beginPath();
        c.roundRect(o.x, y, o.w, o.h, 18);
        c.fill();
        c.strokeStyle = t.edge;
        c.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(o.x + o.w - 18, y + 20, 5 + k * 5, 5 + k * 5, 0, 0, TAU);
          c.stroke();
        }
        for (let k = 0; k < 3; k++)
          line(o.x + 9, y + 10 + k * 10, o.x + o.w - 37, y + 8 + k * 11, t.ground, 1.5);
      } else if (o.kind === 'laser') {
        c.fillStyle = t.metal;
        c.fillRect(o.x, y - 9, 12, 34);
        c.fillRect(o.x + o.w - 12, y - 9, 12, 34);
        c.fillStyle = '#fb9a91';
        c.globalAlpha = 0.12;
        c.fillRect(o.x + 12, y - 7, o.w - 24, 32);
        c.globalAlpha = 1;
        c.fillStyle = '#ffd7c4';
        c.fillRect(o.x + 12, y + 5, o.w - 24, 4);
        c.fillStyle = '#ed9287';
        c.fillRect(o.x + 12, y + 2, o.w - 24, 2);
        c.fillRect(o.x + 12, y + 11, o.w - 24, 2);
      } else if (o.kind === 'crusher') {
        c.fillStyle = t.ground;
        c.fillRect(o.x + 25, 0, 34, y + 4);
        c.fillStyle = t.metal;
        c.fillRect(o.x, y, o.w, o.h);
        c.fillStyle = t.edge;
        c.fillRect(o.x + 4, y + o.h - 8, o.w - 8, 5);
        for (let k = 0; k < 5; k++) {
          c.fillStyle = t.edge;
          c.globalAlpha = 0.25;
          c.fillRect(o.x + 8, y + 9 + k * 20, o.w - 16, 8);
        }
        c.globalAlpha = 1;
        poly(
          [
            [o.x + o.w / 2 - 7, y + o.h - 29],
            [o.x + o.w / 2 + 7, y + o.h - 29],
            [o.x + o.w / 2, y + o.h - 18],
          ],
          t.edge,
        );
      } else if (o.kind === 'roller') {
        c.save();
        c.translate(o.x + 30, floor - 30);
        c.rotate(reduced ? 0 : -time * (4 + o.level * 0.18));
        c.fillStyle = t.edge;
        c.beginPath();
        const teeth = 12 + (o.level % 3) * 2;
        for (let i = 0; i < teeth * 2; i++) {
          const angle = (i * Math.PI) / teeth,
            r = i % 2 === 0 ? 31 : 25;
          if (i) c.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          else c.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        c.closePath();
        c.fill();
        c.fillStyle = t.ground;
        c.beginPath();
        c.arc(0, 0, 22, 0, TAU);
        c.fill();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          line(
            Math.cos(angle) * 8,
            Math.sin(angle) * 8,
            Math.cos(angle) * 20,
            Math.sin(angle) * 20,
            t.metal,
            2,
          );
        }
        c.fillStyle = t.edge;
        c.beginPath();
        c.arc(0, 0, 6, 0, TAU);
        c.fill();
        c.restore();
      } else if (o.kind === 'tunnel') {
        poly(
          [
            [o.x, y + 13],
            [o.x + 13, y],
            [o.x + o.w - 13, y],
            [o.x + o.w, y + 13],
            [o.x + o.w, y + o.h],
            [o.x, y + o.h],
          ],
          t.metal,
        );
        c.fillStyle = t.ground;
        c.fillRect(o.x + 10, y + 16, o.w - 20, o.h - 27);
        for (let k = 0; k < 5; k++) {
          const x = o.x + 22 + k * 36;
          line(x, y + 21, x + 13, y + o.h - 16, t.line, 1);
          c.fillStyle = t.edge;
          c.globalAlpha = 0.45 + 0.3 * Math.sin(time * 3 - k);
          c.fillRect(x, y + 7, 17, 3);
        }
        c.globalAlpha = 1;
        c.fillStyle = t.edge;
        c.fillRect(o.x + 4, y + o.h - 5, o.w - 8, 3);
        for (let k = 0; k < 3; k++) {
          const x = o.x + 32 + (k * (o.w - 64)) / 2;
          line(x - 5, y + o.h - 20, x, y + o.h - 15, t.edge, 2);
          line(x, y + o.h - 15, x + 5, y + o.h - 20, t.edge, 2);
        }
      } else if (o.kind === 'drone') {
        c.fillStyle = t.metal;
        c.fillRect(o.x - 3, y + 5, o.w + 6, o.h - 9);
        poly(
          [
            [o.x, y + 5],
            [o.x + 12, y - 4],
            [o.x + o.w - 12, y - 4],
            [o.x + o.w, y + 5],
          ],
          t.edge,
        );
        c.fillStyle = t.ground;
        c.fillRect(o.x + 14, y + 8, o.w - 28, 8);
        c.fillStyle = t.edge;
        c.fillRect(o.x + 9, y + o.h - 9, o.w - 18, 3);
        for (let k = 0; k < 4; k++) {
          c.globalAlpha = 0.5 + 0.5 * Math.sin(time * 7 + k);
          c.fillRect(o.x + 24 + k * 19, y + 10, 7, 3);
        }
        c.globalAlpha = 1;
        for (const dx of [12, o.w - 12]) {
          line(o.x + dx - 13, y - 8, o.x + dx + 13, y - 8, t.line, 2);
          line(o.x + dx, y - 13, o.x + dx, y, t.metal, 2);
        }
        line(o.x + o.w / 2 - 5, y - 24, o.x + o.w / 2, y - 18, t.edge, 2);
        line(o.x + o.w / 2, y - 18, o.x + o.w / 2 + 5, y - 24, t.edge, 2);
      } else if (o.kind === 'crystal') {
        for (let k = 0; k < 3; k++) {
          const x = o.x + k * 25,
            h = o.h - (k === 1 ? 0 : 12);
          poly(
            [
              [x, floor],
              [x + 1, floor - h + 12],
              [x + 12, floor - h],
              [x + 25, floor - h + 12],
              [x + 25, floor],
            ],
            t.metal,
          );
          poly(
            [
              [x + 12, floor - h],
              [x + 25, floor - h + 12],
              [x + 25, floor],
              [x + 12, floor - 5],
            ],
            t.line,
          );
          line(x + 12, floor - h + 4, x + 12, floor - 8, t.edge, 1.5);
        }
      } else {
        const bevel = o.level % 2 === 0 ? 9 : 5;
        poly(
          [
            [o.x, y + bevel],
            [o.x + bevel, y],
            [o.x + o.w - bevel, y],
            [o.x + o.w, y + bevel],
            [o.x + o.w, floor],
            [o.x, floor],
          ],
          t.metal,
        );
        poly(
          [
            [o.x + o.w, y + bevel],
            [o.x + o.w + 5, y],
            [o.x + o.w + 5, floor - 5],
            [o.x + o.w, floor],
          ],
          t.ground,
        );
        c.fillStyle = t.edge;
        c.fillRect(o.x + 5, y + 5, o.w - 10, 3);
        c.strokeStyle = t.line;
        c.lineWidth = 1;
        c.strokeRect(o.x + 7, y + 15, o.w - 14, Math.max(7, o.h - 31));
        if (o.kind === 'riser') {
          for (let k = 0; k < 3; k++) {
            const yy = y + 13 + k * 11;
            line(o.x + 9, yy, o.x + o.w - 9, yy, t.edge, 2);
          }
          c.fillStyle = '#f1ad7f';
          c.globalAlpha = 0.65 + Math.sin(time * 9) * 0.25;
          c.fillRect(o.x + o.w / 2 - 3, y - 6, 6, 4);
          c.globalAlpha = 1;
        } else
          for (let k = 0; k < o.w / 13; k++)
            poly(
              [
                [o.x + k * 13, floor - 10],
                [o.x + k * 13 + 5, floor - 10],
                [o.x + k * 13 + 10, floor - 2],
                [o.x + k * 13 + 5, floor - 2],
              ],
              t.ground,
            );
      }
    }
    for (const p of s.pickups) {
      if (p.taken || p.missed || p.x > WIDTH + 30) continue;
      const y = floor - p.y,
        bob = reduced ? 0 : Math.sin(time * 4 + p.x * 0.014) * 2;
      if (p.kind === 'star') {
        const gold = '#f4d997';
        c.drawImage(glows[0], p.x - 20, y - 20, 40, 40);
        const points: number[][] = [];
        const spin = reduced ? 1 : 0.65 + Math.abs(Math.cos(time * 2 + p.x * 0.01)) * 0.35;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 2,
            r = i % 2 === 0 ? 8 : 3;
          points.push([p.x + Math.cos(angle) * r * spin, y + Math.sin(angle) * r]);
        }
        poly(points, gold);
      } else if (p.kind === 'diamond') {
        c.drawImage(glows[1], p.x - 26, y - 26, 52, 52);
        poly(
          [
            [p.x, y - 12],
            [p.x + 10, y - 3],
            [p.x + 7, y + 7],
            [p.x, y + 14],
            [p.x - 10, y - 3],
          ],
          '#b9f1f6',
        );
        poly(
          [
            [p.x, y - 12],
            [p.x + 10, y - 3],
            [p.x, y + 14],
            [p.x - 2, y - 2],
          ],
          '#63bccf',
        );
        line(p.x - 9, y - 3, p.x + 9, y - 3, '#e4ffff', 1);
      } else {
        c.save();
        c.translate(p.x, y + bob);
        c.drawImage(glows[2], -31, -31, 62, 62);
        c.fillStyle = '#192c38';
        c.strokeStyle =
          p.kind === 'jet'
            ? '#a6dfff'
            : p.kind === 'magnet'
              ? '#e0b0ff'
              : p.kind === 'prism'
                ? '#ffe3a7'
                : '#baf4e9';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(-17, -19, 34, 38, 8);
        c.fill();
        c.stroke();
        c.fillStyle = c.strokeStyle;
        c.font = 'bold 18px monospace';
        c.textAlign = 'center';
        c.fillText(
          p.kind === 'magnet'
            ? '∩'
            : p.kind === 'jet'
              ? '↑'
              : p.kind === 'prism'
                ? '×2'
                : p.kind === 'slow'
                  ? '◷'
                  : '◇',
          0,
          6,
        );
        c.textAlign = 'left';
        c.restore();
      }
    }
    const duck = s.slide && s.y === 0,
      jet = s.flight === 'jet',
      carried = s.flight === 'bird',
      form = jet ? 2 : s.magnet > 0 ? 1 : s.prism > 0 ? 3 : s.shield > 0 ? 4 : 0,
      cx = PLAYER_X + 27,
      cy = floor - s.y - (duck ? 14 : 27);
    c.fillStyle = '#0005';
    c.beginPath();
    c.ellipse(cx, floor + 7, Math.max(9, 29 - s.y * 0.09), 4, 0, 0, TAU);
    c.fill();
    if (s.powerSerial > lastPower) burst(cx, cy, palettes[form], 22, 1.4);
    if (s.landings > lastLand) {
      landAge = 0;
      burst(cx - 8, floor - 3, accent, 8, 0.65);
    }
    landAge += dt;
    if (s.shieldHits > lastShieldHits) burst(cx, cy, '#bff5f4', 26, 1.5);
    if (s.bits > lastBits)
      burst(cx, cy, s.prism > 0 ? '#ffe2a2' : '#d7f1b8', Math.min(12, (s.bits - lastBits) * 4));
    if (s.status === 'over' && lastStatus !== 'over') {
      deathAge = 0;
      burst(cx, cy, '#edb17e', 24, 1.5);
    }
    if (s.status === 'over') deathAge += dt;
    if (s.shield > 0) {
      c.strokeStyle = '#b5edf4';
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(cx, cy, 39, duck ? 25 : 44, 0, 0, TAU);
      c.stroke();
      c.globalAlpha = 0.12;
      c.fill();
      c.globalAlpha = 1;
      for (let k = 0; k < 3; k++) {
        const angle = time * 2 + (k * TAU) / 3;
        c.fillStyle = '#d7ffff';
        c.fillRect(
          cx + Math.cos(angle) * 39 - 2,
          cy + Math.sin(angle) * (duck ? 25 : 44) - 2,
          4,
          4,
        );
      }
    }
    if (s.magnet > 0) {
      c.strokeStyle = '#deacfa';
      c.globalAlpha = 0.25;
      for (let k = 0; k < 2; k++) {
        const r = 45 + ((time * 24 + k * 24) % 48);
        c.beginPath();
        c.arc(cx, cy, r, -0.7, 0.7);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (s.prism > 0) {
      for (let k = 0; k < 3; k++) {
        const angle = time * 3 + (k * TAU) / 3;
        poly(
          [
            [cx + Math.cos(angle) * 43, cy + Math.sin(angle) * 38 - 4],
            [cx + Math.cos(angle) * 43 + 4, cy + Math.sin(angle) * 38],
            [cx + Math.cos(angle) * 43, cy + Math.sin(angle) * 38 + 4],
            [cx + Math.cos(angle) * 43 - 4, cy + Math.sin(angle) * 38],
          ],
          '#ffe0a0',
        );
      }
    }
    c.save();
    if (s.grace > 0 && !jet) c.globalAlpha = 0.5 + (reduced ? 0 : Math.sin(time * 30) * 0.25);
    c.translate(PLAYER_X - 4, floor - s.y - (duck ? 30 : PLAYER_H + 2));
    if (s.status === 'over' && !reduced) {
      c.translate(25, 35);
      c.rotate(Math.min(0.65, deathAge * 2));
      c.translate(-25, -35);
    } else if (duck) {
      c.translate(-2, 3);
      c.scale(1.24, 0.48);
    } else if (!reduced) {
      const squash = Math.max(0, 1 - landAge / 0.13);
      c.translate(0, squash * 7);
      c.scale(1 + squash * 0.13, 1 - squash * 0.13);
      if (s.y > 0) {
        c.translate(25, 25);
        c.rotate(
          jet && s.flipTicks > 0
            ? TAU * (1 - s.flipTicks / 30)
            : carried
              ? Math.sin(time * 8) * 0.06
              : jet
                ? -0.1
                : s.vy > 0
                  ? -0.07
                  : 0.09,
        );
        c.translate(-25, -25);
      } else c.translate(0, Math.sin(time * (s.speed / 32)) * 0.9);
    }
    const stride = carried
      ? Math.floor(time * 14) % 8
      : s.y > 0
        ? 3
        : Math.floor(time * (s.speed / 36)) % 8;
    c.drawImage(dinos[form][stride], 0, 0);
    if (carried) {
      c.fillStyle = '#ffffe6';
      c.fillRect(30, 8, 7, 8);
      c.fillStyle = '#242b31';
      c.fillRect(33, 9, 3, 5);
      c.fillRect(44, 20, 9, 6);
      c.fillStyle = '#e6b396';
      c.fillRect(46, 23, 5, 3);
      line(30, 5, 37, 3, '#364537', 2);
      if (!reduced) {
        c.fillStyle = '#bbecf0';
        c.fillRect(41, 4 + Math.sin(time * 9) * 3, 2, 4);
      }
    }
    if (Math.floor(time * 60) % 240 > 230 && !jet && !carried) {
      c.fillStyle = palettes[form];
      c.fillRect(32, 10, 4, 3);
      c.fillStyle = '#20312b';
      c.fillRect(32, 12, 4, 1);
    }
    if (jet) {
      c.fillStyle = '#526e8a';
      c.fillRect(8, 22, 10, 19);
      c.fillStyle = '#c4f2ff';
      c.fillRect(8, 22, 10, 4);
      poly(
        [
          [8, 42],
          [18, 42],
          [15, 56 + (reduced ? 0 : Math.sin(time * 50) * 6)],
          [12, 63],
          [9, 54],
        ],
        '#9de9ff',
      );
      poly(
        [
          [10, 42],
          [16, 42],
          [13, 55],
        ],
        '#f2ffff',
      );
    }
    if (s.magnet > 0) {
      c.strokeStyle = '#dea9f5';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(20, 17, 8, Math.PI, TAU);
      c.stroke();
      line(12, 17, 12, 24, '#eec8ff', 3);
      line(28, 17, 28, 24, '#eec8ff', 3);
    }
    if (s.shield > 0) {
      c.fillStyle = '#b2d6dc';
      c.fillRect(20, 29, 14, 9);
      c.fillStyle = '#6e969e';
      c.fillRect(21, 33, 12, 2);
    }
    c.restore();
    if (carried) {
      const approach = Math.max(0, 1 - s.flightAge / 48),
        bx = cx + approach * approach * 380,
        by = floor - s.y - 82 - approach * 100;
      bird(bx, by, 1.15, time * 12, '#dfc9a4');
    }
    if (s.birdRelease > 0 && s.tick - s.birdRelease < 90) {
      const age = (s.tick - s.birdRelease) / 60;
      bird(cx + age * 430, floor - 180 - age * 150, 1.15, time * 12, '#dfc9a4');
    }
    if (s.flight === 'jet' || carried) {
      c.fillStyle = '#e7efdf';
      c.globalAlpha = s.flightAge < 150 ? 0.85 : 0.35;
      c.font = '11px monospace';
      c.textAlign = 'right';
      c.fillText(
        carried ? 'KUŞU KONTROL ET   ↑ YÜKSEL / ↓ ALÇAL' : 'JETPACK   ↑ YÜKSEL / ↓ ALÇAL',
        viewLeft + viewWidth - 24,
        32,
      );
      c.textAlign = 'left';
      c.globalAlpha = 1;
    } else if (s.nextBird - s.tick < 180 && s.nextBird > s.tick && s.status === 'running') {
      c.fillStyle = '#ecd4a4';
      c.font = '11px monospace';
      c.fillText('KANAT SESLERİ YAKLAŞIYOR…', viewLeft + 24, 53);
    }
    if (s.slow > 0) {
      c.strokeStyle = '#b8d1ff';
      c.globalAlpha = 0.2;
      c.strokeRect(viewLeft + 4, 4, viewWidth - 8, floor - 6);
      c.globalAlpha = 1;
    }
    if (s.status === 'running' && !reduced && s.tick !== lastTick && s.tick % 5 === 0) {
      if (jet) burst(PLAYER_X + 5, cy + 15, '#95e3ff', 2);
      else if (s.y === 0) burst(PLAYER_X + 7, floor - 3, accent, duck ? 2 : 1, 0.6);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      c.globalAlpha = Math.min(1, p.life * 2);
      c.fillStyle = p.color;
      c.fillRect(p.x, p.y, p.size, p.size);
    }
    c.globalAlpha = 1;
    lastBits = s.bits;
    lastTick = s.tick;
    lastStatus = s.status;
    lastShieldHits = s.shieldHits;
    lastPower = s.powerSerial;
    lastLand = s.landings;
    return !reduced && (particles.length > 0 || (s.status === 'over' && deathAge < 0.7));
  }
  return {
    resize,
    draw,
    setReduced: (v: boolean) => {
      reduced = v;
    },
    destroy: () => {
      particles.length = 0;
      backdrops = [];
    },
  };
}
