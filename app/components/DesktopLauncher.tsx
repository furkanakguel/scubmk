'use client';
import { useEffect, useRef, useState } from 'react';
import { APPS, appLabels, type AppId } from '../lab/desktop';
import { COMMANDS, runCommand, type ShellContext, type ShellEffect } from '../lab/shell';
import { DesktopIcon } from './DesktopIcons';
export default function DesktopLauncher({
  context,
  onEffect,
  onClose,
  onOpen,
}: {
  context: ShellContext;
  onEffect: (effect: ShellEffect) => void;
  onClose: () => void;
  onOpen: (app: AppId) => void;
}) {
  const [query, setQuery] = useState(''),
    [output, setOutput] = useState(''),
    [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const matches = APPS.filter((app) =>
    (appLabels[app] + ' ' + app)
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR')),
  );
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector('input')?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, []);
  function run() {
    const text = query.trim();
    if (!text) return;
    if (matches.length === 1) {
      onOpen(matches[0]);
      onClose();
      return;
    }
    const first = text.replace(/^\//, '').split(/\s/)[0],
      result = runCommand(COMMANDS.some((c) => c.name === first) ? text : 'open ' + text, {
        ...context,
        now: new Date(),
      });
    setError(result.kind === 'error');
    setOutput(result.lines.join('\n'));
    if (result.effect) {
      if (result.effect.type === 'cd') {
        setOutput('Klasör değiştirmek için BMK Terminal’i aç.');
        return;
      }
      onEffect(result.effect);
      onClose();
    }
  }
  return (
    <div
      className="os-launcher-shade"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="os-launcher-title"
        className="os-launcher"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
          if (e.key === 'Tab') {
            const nodes = [
              ...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input') || []),
            ];
            if (e.shiftKey && document.activeElement === nodes[0]) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <div className="os-launcher-title">
          <DesktopIcon app="console" />
          <strong id="os-launcher-title">Çalıştır</strong>
          <button aria-label="Çalıştır penceresini kapat" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label htmlFor="os-launch-input">Bir uygulama veya BMK komutu yaz.</label>
          <div>
            <span>›</span>
            <input
              id="os-launch-input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOutput('');
              }}
              maxLength={256}
              placeholder="dosyalar, terminal, /help…"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="os-button">
              Çalıştır ↵
            </button>
          </div>
        </form>
        <div className="os-launch-results">
          {matches.map((app, i) => (
            <button
              style={{ '--item': i } as React.CSSProperties}
              key={app}
              onClick={() => {
                onOpen(app);
                onClose();
              }}
            >
              <DesktopIcon app={app} />
              <span>
                {appLabels[app]}
                <small>{app}.app</small>
              </span>
              <b>↵</b>
            </button>
          ))}
        </div>
        {output && (
          <pre className={error ? 'is-error' : ''} role="status">
            {output}
          </pre>
        )}
        <footer>
          <kbd>Ctrl</kbd> + <kbd>Boşluk</kbd>
          <span>BMK OS · Uygulamalar ve komutlar</span>
        </footer>
      </div>
    </div>
  );
}
