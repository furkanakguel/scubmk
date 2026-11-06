'use client';
import { useEffect, useRef, useState } from 'react';
import { Command, Pause, Play, X, Search, RotateCcw, MoveHorizontal } from 'lucide-react';
export function SceneConsole({ mode, onMode }: { mode: number; onMode: (n: number) => void }) {
  const [wire, setWire] = useState(false);
  const [tone, setTone] = useState('lime');
  function setting(value: Record<string, unknown>) {
    dispatchEvent(new CustomEvent('bmk-scene-settings', { detail: value }));
  }
  return (
    <>
      <div
        className="scene-drag-zone"
        data-scene-drag
        tabIndex={0}
        role="group"
        aria-label="3B dinozor: sürükle veya yön tuşlarıyla döndür"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setting({ rotate: e.key === 'ArrowLeft' ? -0.25 : 0.25 });
          }
        }}
      >
        <span>
          <MoveHorizontal size={12} /> SÜRÜKLEYEREK DÖNDÜR
        </span>
      </div>
      <div className="scene-console">
        <div className="console-modes" aria-label="3B model biçimi">
          {['Heykel', 'Yörünge', 'İmza'].map((name, i) => (
            <button key={name} aria-pressed={mode === i} onClick={() => onMode(i)}>
              {name}
            </button>
          ))}
        </div>
        <div className="console-bottom">
          <button
            aria-pressed={wire}
            onClick={() => {
              setWire(!wire);
              setting({ wire: !wire });
            }}
          >
            {wire ? '●' : '○'} İskelet
          </button>
          <div className="console-tones" aria-label="Işık rengi">
            {['lime', 'ice', 'amber'].map((t) => (
              <button
                key={t}
                data-tone={t}
                className={tone === t ? 'active' : ''}
                aria-label={t === 'lime' ? 'Yeşil ışık' : t === 'ice' ? 'Mavi ışık' : 'Altın ışık'}
                aria-pressed={tone === t}
                onClick={() => {
                  setTone(t);
                  setting({ tone: t });
                }}
              />
            ))}
          </div>
          <button aria-label="Model açısını sıfırla" onClick={() => setting({ reset: true })}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </>
  );
}
const shortcuts = [
  ['Ekip', 'Fikrin arkasındaki insanlar', '/ekip'],
  ['BMK Run', 'Bir mola, bir rekor', '/oyun'],
  ['Manifesto', 'Birlikte neden buradayız?', '/#manifesto'],
  ['Buluşmalar', 'Sıradaki etkinliğini bul', '/#bulusmalar'],
  ['Grafik atölyesi', 'BMK dinozorunu kurcala', '/#laboratuvar'],
  ['İlgi alanları', 'Kendi yolunu seç', '/#kesfet'],
  ['Biletim', 'Biletine yeniden ulaş', '/bilet'],
  ['Üyelik kartım', 'Dijital kartını aç', '/kartim'],
  ['Üye ol', 'Hesabını oluştur', '/uye-ol'],
];
export default function MotionStudio() {
  const [quiet, setQuiet] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Respect the browser motion preference and the saved local preference after hydration.
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion:reduce)');
    let stored = false;
    try {
      stored = localStorage.getItem('bmk-motion') === 'quiet';
    } catch {}
    setQuiet(media.matches || stored);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('motion-quiet', quiet);
    dispatchEvent(new CustomEvent('bmk-scene-settings', { detail: { reduced: quiet } }));
    dispatchEvent(new CustomEvent('bmk-motion', { detail: quiet }));
    return () => document.documentElement.classList.remove('motion-quiet');
  }, [quiet]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.body.dataset.menuOpen || document.body.dataset.bmkDesktop) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        e.key.toLowerCase() === 'k' &&
        (e.metaKey || e.ctrlKey || !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag))
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        '.experience main>section:not(.bmk-os-section),.kinetic-ribbon,.exp-footer',
      ),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting);
      },
      { rootMargin: '60px' },
    );
    nodes.forEach((node) => {
      node.dataset.motionVisible = 'false';
      observer.observe(node);
    });
    const visibility = () => {
      document.documentElement.dataset.pageHidden = String(document.hidden);
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      nodes.forEach((node) => delete node.dataset.motionVisible);
      delete document.documentElement.dataset.pageHidden;
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    dispatchEvent(new CustomEvent('bmk-overlay', { detail: true }));
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const input = dialog.current?.querySelector('input');
    input?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>('button,a,input') || [],
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = old;
      dispatchEvent(new CustomEvent('bmk-overlay', { detail: false }));
      removeEventListener('keydown', trap);
      trigger.current?.focus();
    };
  }, [open]);
  const matches = shortcuts.filter((s) =>
    s.join(' ').toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
  );
  return (
    <>
      <div className="experience-tools">
        <button
          onClick={() => {
            const q = !quiet;
            setQuiet(q);
            try {
              localStorage.setItem('bmk-motion', q ? 'quiet' : 'full');
            } catch {}
          }}
          aria-pressed={quiet}
          aria-label={quiet ? 'Tam hareketi aç' : 'Hareketi azalt'}
        >
          {quiet ? <Play size={12} /> : <Pause size={12} />}
          <span>{quiet ? 'SAKİN MOD' : 'HAREKET AÇIK'}</span>
        </button>
        <button ref={trigger} onClick={() => setOpen(true)} aria-label="Hızlı gezinmeyi aç">
          <Command size={12} />
          <span>K</span>
        </button>
      </div>
      {open && (
        <div
          className="command-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialog}
            className="command-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-title"
          >
            <div className="command-heading">
              <span id="command-title">Nereye gitmek istersin?</span>
              <button aria-label="Hızlı gezinmeyi kapat" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="command-search">
              <Search size={18} />
              <input
                placeholder="Bir bölüm ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Bölüm ara"
              />
            </label>
            <div className="command-results">
              {matches.map(([title, desc, url], i) => (
                <a href={url} key={url} onClick={() => setOpen(false)}>
                  <small>0{i + 1}</small>
                  <span>
                    {title}
                    <em>{desc}</em>
                  </span>
                </a>
              ))}
              {!matches.length && (
                <p className="command-empty">Bu isimde bir bölüm yok. Başka bir kelime dene.</p>
              )}
            </div>
            <div className="command-foot">
              MERAK ETTİĞİN YERDEN BAŞLA.<span>ESC / KAPAT</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export function KineticMarquee({ text }: { text?: string }) {
  return (
    <div className="kinetic-ribbon" aria-hidden="true">
      <div>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i}>
            {text || (
              <>
                MERAK ET <i>✳</i> BOZ. YENİDEN YAP. <i>✳</i> BİRLİKTE ÜRET <i>✳</i>
              </>
            )}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
export function FlipPass({ children }: { children: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className={'flip-pass-wrap ' + (flipped ? 'flipped' : '')}>
      <div className="flip-pass-inner">
        <div className="flip-pass-front" aria-hidden={flipped}>
          {children}
        </div>
        <div className="flip-pass-back" aria-hidden={!flipped}>
          <span className="mono">SCÜ BMK / ACCESS PASS</span>
          <div className="pass-back-emblem">✳</div>
          <h3>
            BİR SONRAKİ
            <br />
            İHTİMAL
            <br />
            <em>SENSİN.</em>
          </h3>
          <div className="pass-back-bars" />
          <p>
            Merakını getir.
            <br />
            Gerisini birlikte buluruz.
          </p>
          <span className="mono">ÖRNEK BİLET / 2026–27</span>
        </div>
      </div>
      <button
        className="flip-pass-control"
        onClick={() => setFlipped(!flipped)}
        aria-pressed={flipped}
      >
        <RotateCcw size={14} />
        {flipped ? 'Ön yüzü gör' : 'Bileti çevir'}
      </button>
    </div>
  );
}
