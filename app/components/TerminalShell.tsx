'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { Brand } from './Brand';
import MemberCard from './MemberCard';

export default function TerminalShell({
  children,
  aside,
  command,
  scope = 'member',
  busy = false,
  error = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  command: string;
  scope?: 'member' | 'recovery' | 'admin';
  busy?: boolean;
  error?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore the browser-only animation preference without causing an SSR hydration mismatch.
  useEffect(() => {
    try {
      setPaused(sessionStorage.getItem('bmk.terminal.paused') === 'true');
    } catch {}
  }, []);
  function toggleMotion() {
    setPaused((value) => {
      const next = !value;
      try {
        sessionStorage.setItem('bmk.terminal.paused', String(next));
      } catch {}
      return next;
    });
  }
  const section =
    scope === 'admin' ? 'yönetim' : scope === 'recovery' ? 'hesap kurtarma' : 'üyelik';
  return (
    <div className={'auth-terminal terminal-' + scope} data-view={command} data-paused={paused}>
      <header className="terminal-page-header">
        <Brand light />
        <a href="/" className="terminal-home">
          <ArrowLeft size={16} />
          <span>Ana sayfaya dön</span>
        </a>
      </header>
      <div className="terminal-workspace">
        <div className="terminal-window" data-busy={busy} data-error={error}>
          <div className="terminal-titlebar">
            <div className="terminal-window-controls" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="terminal-path" aria-hidden="true">
              bmk — {section}
            </div>
            <button
              type="button"
              className="terminal-motion"
              aria-pressed={paused}
              aria-label={paused ? 'Animasyonları oynat' : 'Animasyonları durdur'}
              onClick={toggleMotion}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              <span>{paused ? 'Hareketi aç' : 'Hareketi durdur'}</span>
            </button>
          </div>
          <div className="terminal-body">
            <div className="terminal-session">
              <div className="terminal-session-content">
                <div className="terminal-command" aria-hidden="true">
                  <span className="terminal-host">bmk@scu</span>
                  <span className="terminal-directory">~</span>
                  <span className="terminal-prompt">$</span>
                  <span className="terminal-typed" key={command}>
                    {command}
                  </span>
                  <i className="terminal-caret" />
                </div>
                {children}
              </div>
            </div>
            {aside && <div className="terminal-aside">{aside}</div>}
          </div>
          <div className="terminal-statusbar">
            <span>BMK / {section}</span>
            <span>
              <kbd>Tab</kbd> Alan değiştir
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TerminalAside({ kind }: { kind: 'recovery' | 'admin' }) {
  return (
    <aside className="terminal-info">
      <div className="terminal-info-copy">
        <span className="terminal-section-label">SCÜ BMK</span>
        <h2>{kind === 'admin' ? 'Kulüp yönetimi.' : 'Kartın\nhesabında kalır.'}</h2>
        <p>
          {kind === 'admin'
            ? 'Etkinlikler, başvurular ve üyeler tek bir yerde.'
            : 'Şifreni yenilediğinde aynı üyelik kartını kullanmaya devam edebilirsin.'}
        </p>
      </div>
      {kind === 'recovery' ? (
        <MemberCard
          style="mono"
          data={{
            name: 'Adın Soyadın',
            number: 'BMK-26-XXXXXXXX',
            role: 'member',
            issued: 2026,
            sample: true,
          }}
        />
      ) : (
        <ul className="terminal-admin-guide">
          <li>
            <span>01</span>
            <div>
              <strong>Etkinlikler</strong>
              <p>Buluşmaları ve başvuru formlarını hazırla.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Başvurular</strong>
              <p>Katılımcıları ve QR biletleri takip et.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Üyeler</strong>
              <p>Üyelikleri ve ekip bilgilerini güncelle.</p>
            </div>
          </li>
        </ul>
      )}
    </aside>
  );
}
