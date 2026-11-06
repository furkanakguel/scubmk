'use client';
import { useEffect, useRef, useState } from 'react';
import { X, UserRound, CreditCard } from 'lucide-react';
import { Brand } from './Brand';
const chapters = [
  { title: 'Başlangıç', sub: 'Her şey bir merakla.', url: '/', word: 'MERAK', glyph: '✳' },
  {
    title: 'Buluşmalar',
    sub: 'Ekrandan kampüse.',
    url: '/#bulusmalar',
    word: 'BİRLİKTE',
    glyph: '◌',
  },
  {
    title: 'Biz kimiz?',
    sub: 'Fikrin arkasındaki insanlar.',
    url: '/ekip',
    word: 'İNSAN',
    glyph: '◎',
  },
  {
    title: 'Dijital kartlar',
    sub: 'Aynı kulüp. Senin kartın.',
    url: '/kartlar',
    word: 'SENİN',
    glyph: '◇',
  },
  {
    title: 'BMK Run',
    sub: 'Küçük bir oyun. Büyük bir kaçış.',
    url: '/oyun',
    word: 'OYNA',
    glyph: '⌁',
  },
];
export default function AtlasNav({ eventsVisible = true }: { eventsVisible?: boolean }) {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch('/api/member', { signal: c.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => setSignedIn(!!(d && typeof d === 'object' && 'user' in d && d.user)))
      .catch(() => {});
    return () => c.abort();
  }, []);
  const panel = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnFocus = trigger.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.dataset.menuOpen = 'true';
    dispatchEvent(new CustomEvent('bmk-overlay', { detail: true }));
    const backgrounds = Array.from(document.querySelectorAll<HTMLElement>('main,footer'));
    const saved = backgrounds.map((el) => el.inert);
    backgrounds.forEach((el) => (el.inert = true));
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key !== 'Tab') return;
      const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('a,button') || []),
        first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      delete document.body.dataset.menuOpen;
      backgrounds.forEach((el, i) => (el.inert = saved[i]));
      dispatchEvent(new CustomEvent('bmk-overlay', { detail: false }));
      removeEventListener('keydown', key);
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <>
      <header className="atlas-header">
        <Brand light />
        <nav aria-label="Ana gezinme">
          <a href={eventsVisible ? '/#bulusmalar' : '/etkinlikler'}>Buluşmalar</a>
          <a href="/ekip">Biz kimiz?</a>
          <a href="/oyun">BMK Run</a>
        </nav>
        <div className="atlas-header-end">
          <a href="/kartim" className="atlas-ticket" aria-label="Üyelik kartım / Giriş yap">
            {signedIn ? <CreditCard size={19} /> : <UserRound size={19} />}
          </a>
          <a href={signedIn ? '/kartim' : '/uye-ol'} className="atlas-join">
            {signedIn ? 'Üyelik kartım' : 'Aramıza katıl'}
          </a>
          <button
            ref={trigger}
            className="atlas-trigger"
            aria-label="Menüyü aç"
            aria-expanded={open}
            aria-controls="bmk-atlas"
            onClick={() => setOpen(true)}
          >
            <span>KEŞFET</span>
            <i />
            <i />
            <i />
          </button>
        </div>
      </header>
      {open && (
        <div
          ref={panel}
          id="bmk-atlas"
          className="atlas-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="atlas-label"
        >
          <div className="atlas-top">
            <span id="atlas-label" className="mono">
              SCÜ BMK
            </span>
            <button
              className="atlas-close"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
            >
              <span>KAPAT</span>
              <X size={22} />
            </button>
          </div>
          <div className="atlas-body">
            <div className={'atlas-art atlas-art-' + active} aria-hidden="true">
              <div className="atlas-art-grid" />
              <div className="atlas-reticle">
                <i />
                <i />
                <i />
                <div key={active} className="atlas-glyph">
                  {chapters[active].glyph}
                </div>
              </div>
              <span className="atlas-art-top mono">NEREYE GİTMEK İSTERSİN?</span>
              <span className="atlas-art-index mono">0{active + 1} / 05</span>
              <div className="atlas-art-word" key={chapters[active].word}>
                {chapters[active].word}
                <small>SCÜ BİLGİSAYAR MÜHENDİSLİĞİ KULÜBÜ.</small>
              </div>
            </div>
            <nav className="atlas-chapters" aria-label="Tüm sayfalar">
              {chapters.map((c, i) => (
                <a
                  href={c.url === '/#bulusmalar' && !eventsVisible ? '/etkinlikler' : c.url}
                  key={c.url}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setOpen(false)}
                  className={active === i ? 'active' : ''}
                  style={{ '--order': i } as React.CSSProperties}
                >
                  <span className="atlas-number mono">0{i + 1}</span>
                  <span className="atlas-link-title">
                    {c.title}
                    <small>{c.sub}</small>
                  </span>
                </a>
              ))}
            </nav>
          </div>
          <div className="atlas-bottom">
            <a href="/uye-ol">Üye ol, kartını al</a>
            <div>
              <a href="/kartim">Kartım / Giriş</a>
              <a href="/bilet">Biletim</a>
              <a href="https://www.instagram.com/cumhuriyetbmk/" target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
              <a href="/admin">Yönetim</a>
            </div>
            <span className="mono">KAMPÜSTE GÖRÜŞÜRÜZ.</span>
          </div>
        </div>
      )}
    </>
  );
}
