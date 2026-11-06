'use client';
import { useEffect, useRef } from 'react';
import { TRACKS, type TerminalState, type TerminalAction } from '../lab/terminal';
import { PixelDino } from './DesktopIcons';
type Props = { s: TerminalState; dispatch: (action: TerminalAction) => void };
export function DesktopCrash({ s, dispatch }: Props) {
  const t = TRACKS[s.field],
    q = t.questions[s.question];
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    skip.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="os-blue-screen" data-phase={s.phase}>
      <div className="os-bsod-top">
        <span>BMK OS</span>
        <span>SİSTEM KURTARMA</span>
      </div>
      <div className="os-bsod-heading">
        <div className="os-crashed-dino">
          <PixelDino broken />
        </div>
        <div>
          <span>Bir şeyler ters gitti.</span>
          <h3>
            Son sağlam
            <br />
            satıra dönüyoruz.
          </h3>
        </div>
      </div>
      <div className="os-crash-code">
        <span>DURDURMA KODU</span>
        <strong>{t.error.code}</strong>
        <p>{t.error.message} Sorun yalnızca bu atölye oturumunda.</p>
        <dl>
          <div>
            <dt>Modül</dt>
            <dd>{t.error.module}</dd>
          </div>
          <div>
            <dt>Dosya</dt>
            <dd>{q.file}</dd>
          </div>
          <div>
            <dt>İfade</dt>
            <dd>{s.selected}</dd>
          </div>
        </dl>
      </div>
      <div className="os-repair-panel">
        <div>
          <span>
            {s.progress === 100
              ? 'Onarım tamamlandı.'
              : s.phase === 'crash'
                ? 'Hata kaydı oluşturuluyor…'
                : t.error.steps[Math.min(2, Math.floor(s.progress / 34))]}
          </span>
          <strong>
            {s.progress}
            <small>%</small>
          </strong>
        </div>
        <div
          className="os-repair-meter"
          role="progressbar"
          aria-label="Sistem onarımı"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={s.progress}
        >
          <span style={{ width: s.progress + '%' }} />
        </div>
        <p>Yanlış seçenek elendi. Aynı soru yeniden açılacak.</p>
      </div>
      <button
        ref={skip}
        className="os-recovery-skip"
        onClick={() => dispatch({ type: 'skip-recovery' })}
      >
        Animasyonu atla ve soruya dön ↵
      </button>
    </div>
  );
}
export function DesktopReboot({ s, dispatch }: Props) {
  const lines = [
    'Atölye durumu doğrulandı',
    'Masaüstü yerleşimi korundu',
    'Pencereler hazırlanıyor',
    'Kod atölyesi açılıyor',
  ];
  return (
    <div className="os-boot-screen os-reboot-v4">
      <header>
        <span>BMK OS</span>
        <span>OTURUMU GERİ YÜKLE</span>
      </header>
      <div className="os-reboot-center">
        <div className="os-boot-brand">
          <PixelDino />
          <span>
            bmk<span>os</span>
          </span>
        </div>
        <p>Bir hata geride kaldı.</p>
        <div className="os-reboot-meter">
          <span style={{ transform: `scaleX(${(s.frame + 1) / 4})` }} />
        </div>
        <ol>
          {lines.map((line, i) => (
            <li key={line} data-ready={i <= s.frame}>
              <span>{i < s.frame ? '✓' : i === s.frame ? '›' : '·'}</span>
              {line}
              <small>{i < s.frame ? 'OK' : i === s.frame ? '…' : ''}</small>
            </li>
          ))}
        </ol>
        <button className="os-recovery-skip" onClick={() => dispatch({ type: 'skip-recovery' })}>
          Atölyeye dön ↵
        </button>
      </div>
      <footer>
        <span>SCÜ Bilgisayar Mühendisliği Kulübü</span>
        <span>DESKTOP EDITION 4.0</span>
      </footer>
    </div>
  );
}
