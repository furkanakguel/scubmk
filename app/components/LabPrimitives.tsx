'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { labIsActive } from '../lab/playback';

export function useLabPlayback(desktopOwner = false) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false),
    [hidden, setHidden] = useState(false),
    [quiet, setQuiet] = useState(false),
    [paused, setPaused] = useState(false),
    [overlay, setOverlay] = useState(false),
    [desktopOpen, setDesktopOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () =>
      setQuiet(media.matches || document.documentElement.classList.contains('motion-quiet'));
    const visibility = () => setHidden(document.hidden);
    const modal = (e: Event) => setOverlay(Boolean((e as CustomEvent).detail));
    const desktop = () => setDesktopOpen(!!document.body.dataset.bmkDesktop);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.08,
    });
    observer.observe(el);
    preference();
    visibility();
    desktop();
    media.addEventListener('change', preference);
    window.addEventListener('bmk-motion', preference);
    window.addEventListener('bmk-overlay', modal);
    window.addEventListener('bmk-desktop-focus', desktop);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', preference);
      window.removeEventListener('bmk-motion', preference);
      window.removeEventListener('bmk-overlay', modal);
      window.removeEventListener('bmk-desktop-focus', desktop);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return {
    ref,
    quiet,
    paused,
    setPaused,
    active: labIsActive(visible, hidden, paused, overlay, desktopOpen, desktopOwner),
  };
}
export function WindowBar({
  title,
  paused,
  onPause,
}: {
  title: string;
  paused: boolean;
  onPause: () => void;
}) {
  return (
    <div className="bmk-window-bar">
      <div className="bmk-window-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span>{title}</span>
      <button
        onClick={onPause}
        aria-label={paused ? 'Terminal animasyonunu sürdür' : 'Terminal animasyonunu duraklat'}
        aria-pressed={paused}
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}
export function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="bmk-prompt">
      <span>bmk@scu</span>
      <span>~</span>
      <b>$</b>
      <code>{children}</code>
    </div>
  );
}
export function Syntax({ text }: { text: string }) {
  return (
    <>
      {text
        .split(
          /("[^"\n]*"|'[^'\n]*'|\/\/[^\n]*|#[^\n]*|\b(?:const|let|if|function|false|true|print|sum|len|console|document)\b|\b\d+(?:\.\d+)?\b|___)/g,
        )
        .map((part, i) => (
          <span
            key={i}
            className={
              part === '___'
                ? 'bmk-code-hole'
                : /^\/\/|^#/.test(part)
                  ? 'bmk-code-comment'
                  : /^['"]/.test(part)
                    ? 'bmk-code-string'
                    : /^(const|let|if|function|false|true)$/.test(part)
                      ? 'bmk-code-keyword'
                      : /^\d/.test(part)
                        ? 'bmk-code-number'
                        : ''
            }
          >
            {part === '___'
              ? ' ? '
              : part.includes('___')
                ? part.split('___').map((piece, j) => (
                    <span key={j}>
                      {j > 0 && <span className="bmk-code-hole"> ? </span>}
                      {piece}
                    </span>
                  ))
                : part}
          </span>
        ))}
    </>
  );
}
