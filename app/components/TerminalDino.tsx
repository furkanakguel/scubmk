'use client';
import { memo } from 'react';
import { DINO_STEPS, type DinoGuide } from '../lab/dino';
import DinoMark from './DinoMark';

type Props = {
  guide: DinoGuide;
  active: boolean;
  typing: boolean;
  onInsert: (command: string) => void;
  onStart: () => void;
  onHide: () => void;
};
function TerminalDino({ guide, active, typing, onInsert, onStart, onHide }: Props) {
  if (!guide.enabled) return null;
  const step = guide.step === null ? null : DINO_STEPS[guide.step],
    finished = guide.step === 3 && !guide.advice,
    error = guide.advice?.tone === 'error';
  const advice = guide.advice;
  const command = error
    ? advice?.command
    : (step?.command ?? (finished ? 'atolye web' : advice?.command));
  const title = error
    ? 'Şunu kontrol edelim.'
    : (step?.title ??
      (finished
        ? 'Artık yolunu biliyorsun.'
        : advice
          ? 'Bir sonraki satır.'
          : 'Terminale birlikte bakalım.'));
  const text = error
    ? advice?.text
    : (step?.text ??
      (finished
        ? 'Klasöre girdin, dosyayı buldun ve okudun. Şimdi bu bilgiyi kod atölyesinde kullanabilirsin.'
        : (advice?.text ??
          'Üç kısa adımda kulübün dosyalarını terminalden aç. Komutları sen yaz; ben yol göstereyim.')));
  const reaction = typing ? 'read' : finished ? 'success' : (advice?.tone ?? 'watch');
  return (
    <aside
      className="dino-guide"
      data-tone={error ? 'error' : 'normal'}
      aria-label="Dino komut rehberi"
    >
      <div className="dino-guide-character">
        <DinoMark key={guide.turn} reaction={reaction} active={active} />
        <span>DINO</span>
      </div>
      <div className="dino-guide-content">
        <div className="dino-guide-heading">
          <span>
            {finished
              ? 'TERMİNAL TURU / TAMAMLANDI'
              : guide.step === null || guide.step === 3
                ? 'BMK / KOMUT REHBERİ'
                : 'TERMİNAL TURU / ' + String(guide.step + 1).padStart(2, '0') + ' / 03'}
          </span>
          <button
            className="dino-guide-dismiss"
            onClick={onHide}
            aria-label="Dino rehberini gizle"
            title="/dino ile tekrar aç"
          >
            ×
          </button>
        </div>
        <div className="dino-guide-copy" aria-live="polite" aria-atomic="true">
          <strong>{title}</strong>
          <p>{text}</p>
        </div>
        <div className="dino-guide-bottom">
          {guide.step !== null && (
            <ol className="dino-guide-steps" aria-label="Terminal turu ilerlemesi">
              {['Gir', 'Listele', 'Oku'].map((label, i) => (
                <li
                  key={label}
                  data-done={guide.step! > i}
                  aria-current={guide.step === i ? 'step' : undefined}
                >
                  <i aria-hidden="true">{guide.step! > i ? '✓' : i + 1}</i>
                  <span>{label}</span>
                  <span className="sr-only">{guide.step! > i ? ' tamamlandı' : ''}</span>
                </li>
              ))}
            </ol>
          )}
          {command ? (
            <button
              className="dino-guide-command"
              onClick={() => onInsert(command)}
              aria-label={'Komut satırına yerleştir: ' + command}
            >
              <code>{command}</code>
              <span>Satıra al</span>
            </button>
          ) : guide.step === null && !advice ? (
            <button className="dino-guide-start" onClick={onStart}>
              Terminal turuna başla <span>3 adım</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
export default memo(TerminalDino);
