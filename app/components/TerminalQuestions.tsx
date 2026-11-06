'use client';
import { memo } from 'react';
import { useSectionCopy, SectionTitle } from '../home/SectionCopy';
import { useEffect, useState } from 'react';
import { CornerDownLeft, Check } from 'lucide-react';
import { Prompt, WindowBar, useLabPlayback } from './LabPrimitives';
import { HELP_QUESTIONS as questions } from '../lab/help';
function TerminalQuestions({ instagram }: { instagram: string }) {
  const copy = useSectionCopy();
  const [selected, setSelected] = useState(0),
    [chars, setChars] = useState(0);
  const playback = useLabPlayback();
  const q = questions[selected],
    command = 'bmk help ' + q.id,
    full = command + '\n' + q.a,
    done = chars >= full.length;
  useEffect(() => {
    if (!playback.active || done) return;
    const timer = setTimeout(
      () =>
        setChars((n) =>
          playback.quiet ? full.length : Math.min(full.length, n + (n < command.length ? 1 : 3)),
        ),
      chars < command.length ? 35 : 22,
    );
    return () => clearTimeout(timer);
  }, [chars, command.length, done, full.length, playback.active, playback.quiet]);
  return (
    <section
      ref={playback.ref}
      id="sorular"
      className="terminal-questions"
      data-paused={playback.paused}
      aria-labelledby="terminal-questions-title"
    >
      <div className="workshop-heading">
        <div>
          <span className="workshop-eyebrow">{copy?.eyebrow ?? 'BMK / YARDIM MASASI'}</span>
          <h2 id="terminal-questions-title">
            {copy ? (
              <SectionTitle text={copy.title} />
            ) : (
              <>
                Önce bir <em>soru.</em>
              </>
            )}
          </h2>
        </div>
        <p>
          {copy?.text ?? (
            <>
              Komut ezberlemene gerek yok.
              <br />
              Merak ettiğin soruya dokun.
            </>
          )}
        </p>
      </div>
      <div className="bmk-help-window">
        <WindowBar
          title="bmk-cli / help"
          paused={playback.paused}
          onPause={() => playback.setPaused(!playback.paused)}
        />
        <div className="bmk-help-layout">
          <nav aria-label="Sık sorulan sorular">
            <span className="bmk-help-nav-title">$ bmk help --list</span>
            {questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => {
                  if (selected !== i) {
                    setSelected(i);
                    setChars(0);
                  }
                }}
                aria-pressed={selected === i}
                aria-controls="bmk-help-answer"
              >
                <span>0{i + 1}</span>
                {item.q}
                <CornerDownLeft size={14} />
              </button>
            ))}
          </nav>
          <div id="bmk-help-answer" className="bmk-help-answer">
            <Prompt>
              {command.slice(0, chars)}
              {chars <= command.length && <i className="bmk-block-caret" />}
            </Prompt>
            <div className="bmk-help-response" aria-hidden="true">
              <span className="bmk-help-response-label">
                {chars > command.length ? 'BMK / yanıt' : 'BMK / dinliyor…'}
              </span>
              <p>
                {chars > command.length ? q.a.slice(0, chars - command.length - 1) : ''}
                {chars > command.length && !done && <i className="bmk-block-caret" />}
              </p>
            </div>
            <p className="sr-only" role="status">
              {q.a}
            </p>
            <div className="bmk-help-action">
              {done ? (
                <>
                  <span>
                    <Check size={13} /> Yanıt tamamlandı.
                  </span>
                  <a
                    href={q.href === 'instagram' ? instagram : q.href}
                    {...(q.href === 'instagram' ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    {q.label}
                    <CornerDownLeft size={14} />
                  </a>
                </>
              ) : (
                <button onClick={() => setChars(full.length)}>Yanıtın tamamını göster</button>
              )}
            </div>
          </div>
        </div>
        <div className="bmk-window-status">
          <span>
            help <span className="bmk-status-divider">/</span>{' '}
            {playback.paused
              ? 'duraklatıldı'
              : done
                ? 'başka bir sorun var mı?'
                : 'yanıt yazılıyor…'}
          </span>
          <span>SCÜ BMK</span>
        </div>
      </div>
    </section>
  );
}

export default memo(TerminalQuestions);
