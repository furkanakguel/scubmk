'use client';
import { memo } from 'react';
import { useSectionCopy, SectionTitle } from '../home/SectionCopy';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Syntax } from './LabPrimitives';
const silhouette = [
  '00000000011111111000',
  '00000000111111111100',
  '00000000110111111100',
  '00000000111111111100',
  '00000000111111111100',
  '00000000111110000000',
  '00000000111111110000',
  '00000000111110000000',
  '10000001111110000000',
  '11000011111110000000',
  '11100111111111100000',
  '11111111111100100000',
  '01111111111100000000',
  '00111111111100000000',
  '00011111111000000000',
  '00001111110000000000',
  '00000110110000000000',
  '00000110011000000000',
  '00000111001110000000',
];
const dinoPoints = silhouette.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === '1' ? [{ x: (x - 9) / 8, y: (y - 9) / 8 }] : [])),
);
const forms = ['Dinozor', 'Yörünge', 'Sarmal', 'Dalga'];
const descriptions = [
  'Logomuzdaki dinozor, yüzlerce küçük noktadan oluşuyor. Bir noktayı hareket ettir; bütünün nasıl değiştiğine bak.',
  'Aynı noktalar bu kez bir kürenin yüzeyinde. Değişen, noktaların sayısı değil; onları yerleştiren matematik.',
  'Bir açı ve bir yükseklik. İki basit değişken, noktaları bir sarmala dönüştürüyor.',
  'Sinüs ve kosinüs, düz bir ızgaraya hareket katıyor. Şiddeti artırıp dalganın değişimini izle.',
];
function CuriosityLab() {
  const copy = useSectionCopy();
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLElement>(null);
  const modeRef = useRef(0);
  const powerRef = useRef(0.55);
  const pausedRef = useRef(false);
  const wake = useRef<() => void>(() => {});
  const [mode, setMode] = useState(0);
  const [energy, setEnergy] = useState(55);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    modeRef.current = mode;
    wake.current();
  }, [mode]);
  useEffect(() => {
    powerRef.current = energy / 100;
    wake.current();
  }, [energy]);
  useEffect(() => {
    pausedRef.current = paused;
    wake.current();
  }, [paused]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let width = 1,
      height = 1,
      dpr = 1,
      raf = 0,
      last = 0,
      time = 0,
      visible = false,
      overlayOpen = false,
      desktopOpen = !!document.body.dataset.bmkDesktop,
      settle = 70,
      quiet =
        matchMedia('(prefers-reduced-motion:reduce)').matches ||
        document.documentElement.classList.contains('motion-quiet');
    let mx = -1000,
      my = -1000,
      pressed = false;
    const count = innerWidth < 700 ? 500 : 900;
    const points = Array.from({ length: count }, (_, i) => ({
      x: 0,
      y: 0,
      z: 0,
      dx: 0,
      dy: 0,
      a: i * 2.399963,
      t: i / count,
    }));
    const projected = Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0, s: 1 }));
    const sorted = [...projected];
    let rect: DOMRect,
      rectDirty = true;
    const locate = () => {
      rect = el.getBoundingClientRect();
      rectDirty = false;
    };
    const movedPage = () => {
      rectDirty = true;
    };
    const resize = new ResizeObserver(() => {
      locate();
      const b = rect;
      width = b.width;
      height = b.height;
      dpr = Math.min(devicePixelRatio, 1.5);
      el.width = width * dpr;
      el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      request();
    });
    resize.observe(el);
    const observer = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          last = 0;
          request();
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
          el!.dataset.renderState = 'suspended';
        }
      },
      { rootMargin: '100px' },
    );
    observer.observe(el);
    function request(dirty = true) {
      if (dirty) settle = 70;
      if (!raf && visible && !document.hidden && !overlayOpen && !desktopOpen) {
        if (el!.dataset.renderState !== 'rendering') el!.dataset.renderState = 'rendering';
        raf = requestAnimationFrame(draw);
      }
    }
    wake.current = () => request();
    const visibility = () => {
      if (document.hidden || overlayOpen || desktopOpen) {
        cancelAnimationFrame(raf);
        raf = 0;
        el!.dataset.renderState = 'suspended';
      } else {
        last = 0;
        request();
      }
    };
    const overlay = (e: Event) => {
      overlayOpen = (e as CustomEvent).detail;
      visibility();
    };
    const desktopFocus = (e: Event) => {
      desktopOpen = Boolean((e as CustomEvent).detail);
      visibility();
    };
    const pointer = (e: PointerEvent) => {
      request();
      if (!rect || rectDirty) locate();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };
    const leave = () => {
      mx = -1000;
      my = -1000;
      pressed = false;
      request();
    };
    const down = (e: PointerEvent) => {
      pointer(e);
      pressed = true;
      request();
    };
    const up = () => {
      pressed = false;
      request();
    };
    const motion = (e: Event) => {
      quiet = (e as CustomEvent).detail;
      request();
    };
    el.addEventListener('pointerenter', locate);
    addEventListener('scroll', movedPage, { passive: true });
    el.addEventListener('pointermove', pointer);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointercancel', leave);
    addEventListener('pointerup', up);
    addEventListener('bmk-motion', motion);
    function draw(now: number) {
      raf = 0;
      if (!visible || document.hidden || overlayOpen || desktopOpen) return;
      if (now - last < 32.8) {
        request(false);
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000) || 0.025;
      last = now;
      if (!quiet && !pausedRef.current) time += dt * (0.3 + powerRef.current * 0.6);
      ctx!.clearRect(0, 0, width, height);
      const cx = width * 0.5,
        cy = height * 0.5,
        scale = Math.min(width, height) * 0.32,
        rotation = modeRef.current === 0 ? Math.sin(time * 0.4) * 0.16 : time * 0.22;
      const sin = Math.sin(rotation),
        cos = Math.cos(rotation);
      const gradient = ctx!.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.5);
      gradient.addColorStop(0, 'rgba(153,255,87,.09)');
      gradient.addColorStop(1, 'rgba(153,255,87,0)');
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, width, height);
      ctx!.strokeStyle = 'rgba(181,224,156,.07)';
      ctx!.lineWidth = 0.5;
      for (let i = -3; modeRef.current !== 0 && i <= 3; i++) {
        ctx!.beginPath();
        ctx!.ellipse(
          cx,
          cy,
          scale * (1.4 + i * 0.025),
          scale * 0.3,
          -0.3 + i * 0.05,
          0,
          Math.PI * 2,
        );
        ctx!.stroke();
      }

      for (let i = 0; i < count; i++) {
        const p = points[i];
        let tx = 0,
          ty = 0,
          tz = 0;
        const angle = p.t * Math.PI * 2;
        if (modeRef.current === 0) {
          const d = dinoPoints[i % dinoPoints.length];
          tx = d.x + Math.sin(i * 8.7) * 0.025;
          ty = d.y + Math.cos(i * 3.4) * 0.025;
          tz = Math.sin(i * 7.3) * 0.14;
          ty += Math.sin(time * 2 + i * 0.002) * 0.035 * powerRef.current;
        } else if (modeRef.current === 1) {
          const phi = Math.acos(1 - 2 * p.t),
            r = 1 + 0.1 * Math.sin(p.a * 3 + time * 2) * powerRef.current;
          tx = Math.sin(phi) * Math.cos(p.a) * r;
          ty = Math.cos(phi) * r;
          tz = Math.sin(phi) * Math.sin(p.a) * r;
        } else if (modeRef.current === 2) {
          const a = p.t * Math.PI * 12;
          const side = i % 2 ? 1 : -1;
          tx = Math.cos(a + time * 0.4) * 0.7 * side;
          ty = (p.t - 0.5) * 2.6;
          tz = Math.sin(a + time * 0.4) * 0.7 * side;
        } else {
          const row = Math.floor(i / 40),
            col = i % 40;
          tx = (col / 39 - 0.5) * 2.7;
          tz = (row / (count / 40) - 0.5) * 2.1;
          ty = Math.sin(tx * 3 + time * 2) * Math.cos(tz * 3 + time) * 0.4 * powerRef.current;
        }
        const ease = quiet ? 1 : 0.065;
        p.x += (tx - p.x) * ease;
        p.y += (ty - p.y) * ease;
        p.z += (tz - p.z) * ease;
        const x = p.x * cos - p.z * sin,
          z = p.x * sin + p.z * cos,
          y = p.y * 0.94 - z * 0.12;
        const perspective = 3.7 / (3.7 - z);
        let sx = cx + x * scale * perspective,
          sy = cy + y * scale * perspective;
        const dx = sx - mx,
          dy = sy - my,
          d = Math.hypot(dx, dy);
        const radius = pressed ? 180 : 115;
        const force =
          !quiet && d < radius ? (1 - d / radius) * (pressed ? 95 : 35) * powerRef.current : 0;
        p.dx += ((dx / (d || 1)) * force - p.dx) * 0.13;
        p.dy += ((dy / (d || 1)) * force - p.dy) * 0.13;
        sx += p.dx;
        sy += p.dy;
        const out = projected[i];
        out.x = sx;
        out.y = sy;
        out.z = z;
        out.s = perspective;
      }
      sorted.sort((a, b) => a.z - b.z);
      for (let i = 0; i < sorted.length; i++) {
        const p = sorted[i],
          alpha = 0.24 + ((p.z + 1.5) / 3) * 0.7;
        ctx!.fillStyle = i % 11 === 0 ? `rgba(208,255,105,${alpha})` : `rgba(202,223,211,${alpha})`;
        const size = (modeRef.current === 0 ? 2.6 : i % 11 === 0 ? 2.3 : 1.3) * p.s;
        ctx!.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        if (i % 13 === 0) {
          ctx!.strokeStyle = `rgba(169,222,140,${alpha * 0.12})`;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - 7 * p.s, p.y + 3 * p.s);
          ctx!.stroke();
        }
      }
      settle--;
      if (!quiet && (!pausedRef.current || settle > 0)) request(false);
      else el!.dataset.renderState = 'settled';
    }
    document.addEventListener('visibilitychange', visibility);
    addEventListener('bmk-overlay', overlay);
    addEventListener('bmk-desktop-focus', desktopFocus);
    request();
    return () => {
      cancelAnimationFrame(raf);
      wake.current = () => {};
      document.removeEventListener('visibilitychange', visibility);
      removeEventListener('bmk-overlay', overlay);
      removeEventListener('bmk-desktop-focus', desktopFocus);
      removeEventListener('scroll', movedPage);
      el.removeEventListener('pointerenter', locate);
      resize.disconnect();
      observer.disconnect();
      el.removeEventListener('pointermove', pointer);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointercancel', leave);
      removeEventListener('pointerup', up);
      removeEventListener('bmk-motion', motion);
    };
  }, []);
  return (
    <section
      ref={host}
      id="laboratuvar"
      className="graphics-workshop"
      aria-labelledby="graphics-workshop-title"
    >
      <div className="graphics-intro">
        <span className="workshop-eyebrow">{copy?.eyebrow ?? 'BMK ATÖLYESİ / 01'}</span>
        <h2 id="graphics-workshop-title">
          {copy ? (
            <SectionTitle text={copy.title} />
          ) : (
            <>
              Bir pikselden
              <br />
              <em>BMK’ye.</em>
            </>
          )}
        </h2>
        <p>
          {copy?.text ?? (
            <>
              Logodaki dinozor nasıl çizilir?
              <br />
              Biraz kod, biraz matematik.
              <br />
              Bir de senin dokunuşun.
            </>
          )}
        </p>
        <a href="#kesfet">
          Sonra bir satır da sen yaz <span aria-hidden="true">↓</span>
        </a>
      </div>
      <div className="graphics-window">
        <div className="graphics-window-bar">
          <span>dinozor.canvas</span>
          <span>canlı önizleme</span>
          <button
            aria-label="Grafik ayarlarını sıfırla"
            onClick={() => {
              setMode(0);
              setEnergy(55);
              setPaused(false);
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
        <div className="graphics-preview">
          <canvas
            ref={canvas}
            aria-label="BMK dinozorunu ve matematiksel biçimleri oluşturan etkileşimli parçacıklar"
          />
          <span className="graphics-preview-note">
            {mode === 0
              ? 'BMK / NOKTALARDAN DOĞAN BİR DİNOZOR'
              : forms[mode].toLocaleUpperCase('tr-TR') + ' / AYNI NOKTALAR, YENİ BİR DÜZEN'}
          </span>
          <span className="graphics-touch-note">Üzerinde gezin veya dokun.</span>
        </div>
        <div className="graphics-settings">
          <div className="graphics-form-tabs" role="group" aria-label="Çizilecek biçim">
            {forms.map((name, i) => (
              <button key={name} aria-pressed={mode === i} onClick={() => setMode(i)}>
                {name}
              </button>
            ))}
          </div>
          <div className="graphics-live-source">
            <pre>
              <Syntax
                text={
                  'const sahne = {\n  biçim: "' +
                  forms[mode].toLocaleLowerCase('tr-TR') +
                  '",\n  hareket: ' +
                  energy +
                  ',\n  oynat: ' +
                  !paused +
                  '\n};'
                }
              />
            </pre>
            <p>{descriptions[mode]}</p>
          </div>
          <div className="graphics-controls">
            <label>
              <span>
                Hareket şiddeti <b>{energy}%</b>
              </span>
              <input
                aria-label="Hareket şiddeti"
                type="range"
                min="10"
                max="100"
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
              />
            </label>
            <button
              onClick={() => setPaused(!paused)}
              aria-pressed={paused}
              aria-label={paused ? 'Parçacık animasyonunu oynat' : 'Parçacık animasyonunu duraklat'}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(CuriosityLab);
