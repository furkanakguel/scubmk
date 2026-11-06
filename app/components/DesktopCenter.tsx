'use client';
import { useEffect, useRef, useState } from 'react';
import {
  monthCells,
  istanbulDate,
  eventDay,
  type RecoveryRecord,
  type Appearance,
} from '../lab/personalization';
import { desktopPath, type DesktopContent } from '../lab/public-content';
type Props = {
  content: DesktopContent;
  records: RecoveryRecord[];
  appearance: Appearance;
  onAppearance: (a: Appearance) => void;
  onSettings: () => void;
  onClose: () => void;
};
export default function DesktopCenter(p: Props) {
  const [today, setToday] = useState(() => istanbulDate(new Date())),
    [tab, setTab] = useState<'calendar' | 'activity'>('calendar');
  const [y, m] = today.split('-').map(Number),
    [month, setMonth] = useState({ year: y, month: m - 1 }),
    [selected, setSelected] = useState(today);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setInterval(() => setToday(istanbulDate(new Date())), 60000);
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus({ preventScroll: true });
    return () => {
      clearInterval(timer);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const title = new Date(Date.UTC(month.year, month.month, 1)).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    cells = monthCells(month.year, month.month),
    events = p.content.events.filter((e) => eventDay(e.date) === selected);
  function move(delta: number) {
    const d = new Date(Date.UTC(month.year, month.month + delta, 1));
    if (d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return;
    setMonth({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }
  return (
    <div
      className="os-center-shade"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="os-control-center"
        role="dialog"
        aria-modal="true"
        aria-label="Takvim ve sistem merkezi"
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            e.preventDefault();
            p.onClose();
          }
          if (e.key === 'Tab') {
            const nodes = [
              ...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') ||
                []),
            ];
            if (
              e.shiftKey &&
              (document.activeElement === nodes[0] || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <header>
          <span>BMK OS / MASAÜSTÜ</span>
          <button onClick={p.onClose} aria-label="Sistem merkezini kapat">
            ×
          </button>
        </header>
        <div className="os-center-date">
          <strong>
            {new Date(today + 'T12:00:00Z').toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            })}
          </strong>
          <span>
            {new Date(today + 'T12:00:00Z').toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}{' '}
            · İstanbul
          </span>
        </div>
        <div className="os-center-tabs">
          <button aria-pressed={tab === 'calendar'} onClick={() => setTab('calendar')}>
            Takvim
          </button>
          <button aria-pressed={tab === 'activity'} onClick={() => setTab('activity')}>
            Kurtarma kaydı <span>{p.records.length}</span>
          </button>
        </div>
        <div className="os-center-content" key={tab}>
          {tab === 'calendar' ? (
            <>
              <div className="os-calendar-heading">
                <strong>{title}</strong>
                <button
                  onClick={() => {
                    setMonth({ year: y, month: m - 1 });
                    setSelected(today);
                  }}
                >
                  Bugün
                </button>
                <button aria-label="Önceki ay" onClick={() => move(-1)}>
                  ‹
                </button>
                <button aria-label="Sonraki ay" onClick={() => move(1)}>
                  ›
                </button>
              </div>
              <div className="os-calendar-week" aria-hidden="true">
                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="os-calendar-days">
                {cells.map((day, i) => {
                  if (!day) return <span key={i} />;
                  const key = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    count = p.content.events.filter((e) => eventDay(e.date) === key).length;
                  return (
                    <button
                      key={i}
                      aria-label={`${day} ${title}${count ? ', ' + count + ' etkinlik' : ''}`}
                      aria-pressed={selected === key}
                      aria-current={key === today ? 'date' : undefined}
                      onClick={() => setSelected(key)}
                    >
                      {day}
                      {!!count && <i />}
                    </button>
                  );
                })}
              </div>
              <div className="os-calendar-events">
                <span>
                  {new Date(selected + 'T12:00:00Z').toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'UTC',
                  })}{' '}
                  / ETKİNLİKLER
                </span>
                {events.length ? (
                  events.map((e) => (
                    <a key={e.id} href={desktopPath.event(e.id)}>
                      <strong>{e.title}</strong>
                      <small>{e.location}</small>
                    </a>
                  ))
                ) : (
                  <p>Bu gün için yayımlanmış bir etkinlik yok.</p>
                )}
              </div>
            </>
          ) : (
            <div className="os-recovery-journal">
              <p>Bu masaüstü oturumundaki son 12 kurtarma. Sayfa yenilendiğinde temizlenir.</p>
              {p.records.length ? (
                p.records.map((r) => (
                  <article key={r.id}>
                    <div>
                      <span>✓ {r.track}</span>
                      <time>{r.time}</time>
                    </div>
                    <h4>{r.topic}</h4>
                    <code>{r.code}</code>
                    <p>
                      <span>{r.file}</span> · Elenen: <b>{r.choice}</b>
                    </p>
                    <small>
                      {r.status === 'skipped'
                        ? 'Geçiş atlandı, aynı soru açıldı.'
                        : 'Onarım tamamlandı, çalışma alanı korundu.'}
                    </small>
                  </article>
                ))
              ) : (
                <div className="os-journal-empty">
                  <span>✓</span>
                  <strong>Henüz bir kurtarma yok.</strong>
                  <p>Atölyedeki yanlış cevaplardan sonra buraya bir kayıt düşer.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <footer>
          <button
            aria-pressed={p.appearance.motion === 'full'}
            onClick={() =>
              p.onAppearance({
                ...p.appearance,
                motion: p.appearance.motion === 'full' ? 'reduced' : 'full',
              })
            }
          >
            <span>{p.appearance.motion === 'full' ? '◉' : '○'}</span>Animasyonlar{' '}
            {p.appearance.motion === 'full' ? 'açık' : 'kapalı'}
          </button>
          <button onClick={p.onSettings}>
            Kişiselleştir <span>›</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
