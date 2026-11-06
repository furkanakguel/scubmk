'use client';
import { memo } from 'react';
import { useSectionCopy, SectionTitle } from '../home/SectionCopy';
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  DINO,
  TRACKS,
  QUESTION_COUNT,
  APPS,
  initialTerminal,
  terminalReducer,
  terminalDelay,
  recovering,
  type AppId,
  type TerminalState,
  type TerminalAction,
} from '../lab/terminal';
import type { DesktopContent } from '../lab/public-content';
import { Syntax, useLabPlayback } from './LabPrimitives';
import { DesktopIcon, PixelDino, appLabels } from './DesktopIcons';
import {
  desktopReducer,
  initialDesktop,
  defaultRect,
  fitRect,
  readPreferences,
  type Bounds,
  type DesktopTheme,
  type Frame,
} from '../lab/desktop';
import type { ShellEffect } from '../lab/shell';
import DesktopWindow from './DesktopWindow';
import DesktopGrid from './DesktopGrid';
import {
  emptyIconLayouts,
  iconProfile,
  readIconLayouts,
  type IconLayouts,
  type IconPositions,
} from '../lab/icon-layout';
import { createFileSystem } from '../lab/filesystem';
import DesktopTasks from './DesktopTasks';
import DesktopLauncher from './DesktopLauncher';
const DesktopFiles = lazy(() => import('./DesktopFiles'));
import DesktopShell from './DesktopShell';
import DinoMark from './DinoMark';
import { CHALLENGE_HINTS } from '../lab/challenge-hints';
import { DesktopNotes } from './DesktopUtilities';
import DesktopSettings from './DesktopSettings';
import { DesktopCrash, DesktopReboot } from './DesktopRecovery';
import DesktopCenter from './DesktopCenter';
import {
  DEFAULT_APPEARANCE,
  readAppearance,
  addRecoveryRecord,
  type Appearance,
  type RecoveryRecord,
} from '../lab/personalization';
const DesktopApps = lazy(() => import('./DesktopApps'));
class FolderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="os-empty">
        <p>Pencere yüklenemedi. Sayfayı yenileyip tekrar deneyebilirsin.</p>
        <a href="/etkinlikler">Etkinlikler</a>
        <a href="/ekip">Kulüp ekibi</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
const desktopOrder: AppId[] = [...APPS];
type Dispatch = (action: TerminalAction) => void;
function Terminal({
  s,
  dispatch,
  paused,
  choices,
  success,
}: {
  s: TerminalState;
  dispatch: Dispatch;
  paused: boolean;
  choices: React.RefObject<HTMLDivElement | null>;
  success: React.RefObject<HTMLDivElement | null>;
}) {
  const track = TRACKS[s.field],
    q = track.questions[s.question];
  const waiting = ['boot', 'typing'].includes(s.phase);
  const code =
    s.phase === 'success'
      ? q.code.replace('___', q.correct)
      : s.phase === 'boot'
        ? ''
        : q.code.slice(0, s.chars);
  return (
    <div className="os-terminal">
      <div className="os-terminal-tabs" role="tablist" aria-label="Atölye kategorisi">
        {TRACKS.map((t, i) => (
          <button
            key={t.id}
            id={'os-tab-' + i}
            role="tab"
            aria-selected={s.field === i}
            aria-controls="os-terminal-pane"
            tabIndex={s.field === i ? 0 : -1}
            onClick={() => dispatch({ type: 'field', index: i })}
            onKeyDown={(e) => {
              const next =
                e.key === 'ArrowRight'
                  ? (i + 1) % 4
                  : e.key === 'ArrowLeft'
                    ? (i + 3) % 4
                    : e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? 3
                        : -1;
              if (next < 0) return;
              e.preventDefault();
              dispatch({ type: 'field', index: next });
              document.getElementById('os-tab-' + next)?.focus();
            }}
          >
            <span>0{i + 1}</span>
            {t.short}
          </button>
        ))}
      </div>
      <div className="os-terminal-toolbar">
        <label>
          Soru{' '}
          <select
            aria-label="Atölye sorusu"
            value={s.question}
            onChange={(e) => dispatch({ type: 'question', index: Number(e.target.value) })}
          >
            {track.questions.map((item, i) => (
              <option key={item.id} value={i}>
                {i + 1}. {item.topic} · {item.level}
              </option>
            ))}
          </select>
        </label>
        <span>
          {s.solved.length}/{QUESTION_COUNT} çözüldü
        </span>
      </div>
      <div
        className="os-terminal-scroll"
        id="os-terminal-pane"
        role="tabpanel"
        aria-labelledby={'os-tab-' + s.field}
      >
        <div className="os-cli-brand">
          <pre aria-hidden="true">
            {s.phase === 'boot'
              ? DINO.split('\n')
                  .slice(0, s.frame + 1)
                  .join('\n')
              : DINO}
          </pre>
          <div>
            <span className="os-cli-wordmark">
              bmk<span>_</span>
            </span>
            <p>Bir satırla başlar.</p>
            <span>
              CLI 2.0 <b> / </b> {track.title}
            </span>
          </div>
          <span className="os-cli-edition">
            SCÜ
            <br />
            BMK
          </span>
        </div>
        <div className="os-command">
          <span>konuk@bmk</span>
          <b>~</b>
          <code>$ bmk challenge --alan {track.id}</code>
        </div>
        <div className="os-code-file">
          <span>{q.file}</span>
          <span>
            {q.language} <b>·</b> {q.level}
          </span>
        </div>
        <div className="os-code-block" aria-hidden="true">
          {code.split('\n').map((line, i, lines) => (
            <div className="os-code-line" key={i}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <code>
                <Syntax text={line} />
                {s.phase === 'typing' && i === lines.length - 1 && <i className="os-caret" />}
              </code>
            </div>
          ))}
          {s.phase === 'boot' && (
            <span className="os-boot-log">
              {s.frame < 4
                ? 'BMK CLI başlatılıyor…'
                : s.frame < 8
                  ? 'Çalışma alanı hazırlanıyor…'
                  : 'Soru dosyası açılıyor…'}
              <i className="os-caret" />
            </span>
          )}
        </div>
        <pre className="sr-only">
          {q.code.replace('___', s.phase === 'success' ? q.correct : '[boşluk]')}
        </pre>
        {waiting && (
          <div className="os-writing">
            <span>
              {paused
                ? 'Yazım duraklatıldı.'
                : s.phase === 'boot'
                  ? 'Bağlantı kuruldu.'
                  : 'Kod yazılıyor…'}
            </span>
            <button onClick={() => dispatch({ type: 'reveal' })}>Yazımı tamamla ↵</button>
          </div>
        )}
        {(s.phase === 'answer' || s.phase === 'warnings') && (
          <div className="os-question">
            <div className="os-question-heading">
              <span>?</span>
              <h3>{q.prompt}</h3>
            </div>
            {s.phase === 'answer' && (
              <details className="dino-hint" key={q.id}>
                <summary>
                  <DinoMark />
                  Dino’dan ipucu al
                  <span aria-hidden="true" />
                </summary>
                <p>{CHALLENGE_HINTS[q.id]}</p>
              </details>
            )}
            <div className="os-choices" ref={choices}>
              {q.options
                .filter((o) => !s.removed.includes(o))
                .map((o, i) => (
                  <button
                    key={o}
                    onClick={() => dispatch({ type: 'choose', value: o })}
                    disabled={s.phase !== 'answer'}
                  >
                    <kbd>{i + 1}</kbd>
                    <code>{o}</code>
                    <span aria-hidden="true">↵</span>
                  </button>
                ))}
            </div>
            {!!s.removed.length && (
              <p className="os-eliminated">
                Elenen: <code>{s.removed.join(' · ')}</code>. Aynı soru, yeni deneme.
              </p>
            )}
          </div>
        )}
        {s.phase === 'success' && (
          <div className="os-success" ref={success} tabIndex={-1}>
            <div>
              <span>✓ TEST BAŞARILI</span>
              <span>exit 0</span>
            </div>
            <pre>{q.expected}</pre>
            <p>{q.explanation}</p>
            <button onClick={() => dispatch({ type: 'next' })}>
              {s.question === track.questions.length - 1
                ? 'Bu alanı yeniden başlat'
                : 'Sonraki soruya geç'}{' '}
              <span>↵</span>
            </button>
          </div>
        )}
      </div>
      <div className="os-terminal-status">
        <span>
          {s.phase === 'success'
            ? '✓ Tamamlandı'
            : s.phase === 'answer'
              ? 'Boşluğu doldurmak için bir seçenek seç.'
              : s.phase === 'boot'
                ? 'Başlatılıyor…'
                : 'BMK CLI / ' + track.id}
        </span>
        <span>
          {s.question + 1} / {track.questions.length}
        </span>
      </div>
    </div>
  );
}
function Warnings({ s, dispatch }: { s: TerminalState; dispatch: Dispatch }) {
  const t = TRACKS[s.field];
  const messages = [
    { title: t.error.title, text: t.error.message },
    { title: t.error.module, text: 'İşlem durduruldu. Seçilen ifade doğrulanamadı.' },
    {
      title: 'BMK OS · Sistem kurtarma',
      text: 'Uygulama güvenli biçimde yeniden başlatılacak. Çalışma alanın korunuyor.',
    },
  ];
  return (
    <div className="os-error-stack" aria-label="Atölye hata pencereleri">
      {messages.slice(0, s.frame + 1).map((m, i) => (
        <div
          key={m.title}
          className="os-error-dialog"
          style={{ '--stack': i } as CSSProperties}
          inert={i < s.frame}
        >
          <div className="os-error-title">
            <span>{m.title}</span>
            <button onClick={() => dispatch({ type: 'tick' })} aria-label="Hata bildirimini kapat">
              ×
            </button>
          </div>
          <div className="os-error-message">
            <span className="os-error-symbol">×</span>
            <div>
              <p>{m.text}</p>
              {i === 0 && <code>{s.selected}</code>}
            </div>
          </div>
          <div className="os-error-actions">
            <span>{i === 2 ? 'Kurtarma başlatılıyor…' : 'BMK OS / ' + t.short}</span>
            <button className="os-button" onClick={() => dispatch({ type: 'tick' })}>
              Tamam
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
function CodeWorkshop({ content }: { content: DesktopContent }) {
  const copy = useSectionCopy();
  const [s, dispatch] = useReducer(terminalReducer, initialTerminal),
    [wm, desktopDispatch] = useReducer(desktopReducer, initialDesktop);
  const [iconLayouts, setIconLayouts] = useState<IconLayouts>(emptyIconLayouts);
  const [appearance, setAppearance] = useState<Appearance>({ ...DEFAULT_APPEARANCE }),
    [center, setCenter] = useState(false),
    [records, setRecords] = useState<RecoveryRecord[]>([]);
  const pendingRecovery = useRef<RecoveryRecord | null>(null);
  const [launcher, setLauncher] = useState(false),
    [startMenu, setStartMenu] = useState(false),
    [time, setTime] = useState('—:—'),
    [theme, setTheme] = useState<DesktopTheme>('meadow'),
    [icons, setIcons] = useState<AppId[]>([...APPS]),
    [editing, setEditing] = useState(false),
    [immersive, setImmersive] = useState(false),
    [preferencesReady, setPreferencesReady] = useState(false),
    [storageAvailable, setStorageAvailable] = useState(true),
    [bounds, setBounds] = useState<Bounds>({ w: 1180, h: 790 }),
    [snap, setSnap] = useState<'left' | 'right' | 'full' | null>(null),
    [contextMenu, setContextMenu] = useState<{ x: number; y: number; app?: AppId } | null>(null);
  const playback = useLabPlayback(true),
    choices = useRef<HTMLDivElement>(null),
    success = useRef<HTMLDivElement>(null),
    monitor = useRef<HTMLDivElement>(null),
    desktop = useRef<HTMLDivElement>(null),
    restoreFocus = useRef(false),
    started = useRef(0),
    restoreElement = useRef<HTMLElement | null>(null);
  const quiet = playback.quiet || appearance.motion === 'reduced';
  const locked = recovering(s),
    blue = s.phase === 'crash' || s.phase === 'repair',
    booting = s.phase === 'reboot',
    desktopReturn = s.phase === 'desktop-return';
  useEffect(() => {
    started.current = Date.now();
    try {
      const p = readPreferences(localStorage.getItem('bmk-os-desktop-v2'));
      setTheme(p.theme);
      setIcons(p.icons);
      setIconLayouts(readIconLayouts(localStorage.getItem('bmk-os-icon-positions-v1')));
      setAppearance(readAppearance(localStorage.getItem('bmk-os-appearance-v1')));
      for (const app of APPS)
        if (p.frames[app]) desktopDispatch({ type: 'frame', app, frame: p.frames[app]! });
    } catch {
      setStorageAvailable(false);
    }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          'bmk-os-desktop-v2',
          JSON.stringify({ version: 2, theme, icons, frames: wm.frames }),
        );
        localStorage.setItem('bmk-os-appearance-v1', JSON.stringify(appearance));
        localStorage.setItem(
          'bmk-os-icon-positions-v1',
          JSON.stringify({ version: 1, layouts: iconLayouts }),
        );
        setStorageAvailable(true);
      } catch {
        setStorageAvailable(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [preferencesReady, theme, icons, wm.frames, appearance, iconLayouts]);
  useEffect(() => {
    const node = desktop.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width),
        h = Math.round(entry.contentRect.height);
      if (w && h) setBounds((old) => (old.w === w && old.h === h ? old : { w, h }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Istanbul',
        }),
      );
    update();
    if (!playback.active) return;
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [playback.active]);
  useEffect(() => {
    if (locked) return;
    if (wm.focus) dispatch({ type: 'open', app: wm.focus });
    else dispatch({ type: 'minimize' });
  }, [wm.focus, locked]);
  useEffect(() => {
    if (
      launcher ||
      center ||
      !playback.active ||
      (!locked && wm.focus !== 'terminal') ||
      ['answer', 'success'].includes(s.phase)
    )
      return;
    const timer = setTimeout(
      () => dispatch({ type: 'tick', instant: quiet, session: s.session }),
      quiet
        ? Math.min(100, terminalDelay(s, appearance.recovery))
        : terminalDelay(s, appearance.recovery),
    );
    return () => clearTimeout(timer);
  }, [s, locked, wm.focus, launcher, center, playback.active, quiet, appearance.recovery]);
  useEffect(() => {
    if (s.phase === 'warnings') {
      setCenter(false);
      setLauncher(false);
      restoreFocus.current = true;
      setStartMenu(false);
      setContextMenu(null);
    }
    if (s.phase === 'restore') desktopDispatch({ type: 'open', app: 'terminal' });
    if (s.phase === 'answer') {
      const pane = choices.current?.closest<HTMLElement>('.os-terminal-scroll');
      if (pane && choices.current) {
        const overflow =
          choices.current.getBoundingClientRect().bottom - pane.getBoundingClientRect().bottom;
        if (overflow > 0) pane.scrollTop += overflow + 18;
      }
      if (restoreFocus.current) {
        choices.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        restoreFocus.current = false;
      }
    }
    if (s.phase === 'success') success.current?.focus({ preventScroll: true });
  }, [s.phase]);
  useEffect(() => {
    if (s.phase === 'warnings') {
      const t = TRACKS[s.field],
        q = t.questions[s.question];
      pendingRecovery.current = {
        id: `${s.session}-${q.id}-${s.attempt}`,
        time: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Istanbul',
        }),
        track: t.short,
        topic: q.topic,
        file: q.file,
        code: t.error.code,
        choice: s.selected ?? '',
        status: 'recovered',
      };
    }
    if ((s.phase === 'desktop-return' || s.phase === 'answer') && pendingRecovery.current) {
      const record = {
        ...pendingRecovery.current,
        status: s.phase === 'answer' ? ('skipped' as const) : ('recovered' as const),
      };
      setRecords((old) => addRecoveryRecord(old, record));
      pendingRecovery.current = null;
    }
  }, [s.phase, s.session, s.attempt]);
  useEffect(() => {
    if (!immersive) return;
    const old = document.body.style.overflow;
    restoreElement.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    document.body.dataset.bmkDesktop = 'open';
    dispatchEvent(new CustomEvent('bmk-desktop-focus', { detail: true }));
    monitor.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = old;
      delete document.body.dataset.bmkDesktop;
      dispatchEvent(new CustomEvent('bmk-desktop-focus', { detail: false }));
      restoreElement.current?.focus({ preventScroll: true });
    };
  }, [immersive]);
  const open = useCallback(
    (app: AppId) => {
      if (locked) return;
      setCenter(false);
      setLauncher(false);
      setStartMenu(false);
      setContextMenu(null);
      setEditing(false);
      desktopDispatch({ type: 'open', app });
      requestAnimationFrame(() =>
        monitor.current
          ?.querySelector<HTMLElement>(`.os-window[data-app="${app}"] .os-titlebar`)
          ?.focus({ preventScroll: true }),
      );
    },
    [locked],
  );
  const hide = useCallback(
    (app: AppId, close = false) => {
      if (locked) return;
      desktopDispatch({ type: close ? 'close' : 'minimize', app });
      requestAnimationFrame(() =>
        document.getElementById('os-icon-' + app)?.focus({ preventScroll: true }),
      );
    },
    [locked],
  );
  const closeApp = useCallback((app: AppId) => hide(app, true), [hide]);
  const minimizeApp = useCallback((app: AppId) => hide(app), [hide]);
  const closeLauncher = useCallback(() => setLauncher(false), []);
  const showDesktop = useCallback(() => {
    if (locked) return;
    setStartMenu(false);
    setContextMenu(null);
    desktopDispatch({ type: 'desktop' });
  }, [locked]);
  const editIcons = useCallback(
    (value: boolean) => {
      if (locked) return;
      setEditing(value);
      if (value) showDesktop();
    },
    [locked, showDesktop],
  );
  const profile = iconProfile(bounds);
  const placeIcons = useCallback(
    (positions: IconPositions) => setIconLayouts((old) => ({ ...old, [profile]: positions })),
    [profile],
  );
  const alignIcons = useCallback(() => {
    setIconLayouts((old) => ({ ...old, [profile]: {} }));
    setContextMenu(null);
  }, [profile]);
  function frameFor(app: AppId): Frame {
    return (
      wm.frames[app] ?? {
        rect: defaultRect(app, bounds, wm.open.indexOf(app)),
        maximized: false,
        snap: null,
      }
    );
  }
  const layout = useCallback(
    (mode: 'tile' | 'cascade' | 'reset') => {
      setContextMenu(null);
      if (mode === 'reset') {
        desktopDispatch({ type: 'reset' });
        setIcons([...APPS]);
        setIconLayouts(emptyIconLayouts());
        return;
      }
      if (mode === 'tile' && bounds.w < 760) {
        const app = wm.focus ?? wm.order.at(-1);
        if (!app) return;
        for (const id of wm.open) if (id !== app) desktopDispatch({ type: 'minimize', app: id });
        desktopDispatch({
          type: 'frame',
          app,
          frame: { ...frameFor(app), maximized: true, snap: null },
        });
        return;
      }
      if (mode === 'tile') {
        const ids = wm.order.filter((a) => !wm.minimized.includes(a)).slice(-2);
        if (!ids.length) return;
        for (const app of wm.open)
          if (!ids.includes(app)) desktopDispatch({ type: 'minimize', app });
        ids.forEach((app, i) => {
          const w = bounds.w >= 760 ? (bounds.w - 18) / ids.length : bounds.w - 12,
            h = bounds.w >= 760 ? bounds.h - 58 : (bounds.h - 64) / ids.length;
          desktopDispatch({
            type: 'frame',
            app,
            frame: {
              rect: fitRect(
                {
                  x: 6 + i * (bounds.w >= 760 ? w + 6 : 0),
                  y: 6 + i * (bounds.w >= 760 ? 0 : h + 6),
                  w,
                  h,
                },
                bounds,
              ),
              maximized: false,
              snap: null,
            },
          });
        });
        return;
      }
      wm.order.forEach((app, i) =>
        desktopDispatch({
          type: 'frame',
          app,
          frame: { rect: defaultRect(app, bounds, i), maximized: false, snap: null },
        }),
      );
    },
    [wm, bounds],
  );
  const shellEffect = useCallback(
    (effect: ShellEffect) => {
      if (effect.type === 'open') open(effect.app);
      else if (effect.type === 'close') hide(effect.app, true);
      else if (effect.type === 'quiz') {
        open('terminal');
        dispatch({ type: 'field', index: effect.field });
      } else if (effect.type === 'theme') setTheme(effect.theme);
      else if (effect.type === 'layout') layout(effect.mode);
      else if (effect.type === 'desktop') showDesktop();
    },
    [open, hide, layout, showDesktop],
  );
  const files = useMemo(() => createFileSystem(content), [content]);
  const shellContext = useMemo(
    () => ({
      content,
      files,
      minimized: wm.minimized,
      focus: wm.focus,
      history: [],
      uptime: started.current ? (Date.now() - started.current) / 1000 : 0,
      theme,
      windows: wm.open,
      now: new Date(),
    }),
    [content, files, theme, wm.open, wm.minimized, wm.focus],
  );
  const openTerminal = useCallback(() => open('terminal'), [open]);
  const phaseText = blue
    ? 'Hata onarılıyor'
    : booting
      ? 'BMK OS açılıyor'
      : desktopReturn
        ? 'Masaüstü geri yüklendi'
        : s.phase === 'restore'
          ? 'Atölye geri yükleniyor'
          : wm.focus
            ? appLabels[wm.focus]
            : 'Masaüstü';
  return (
    <section
      ref={playback.ref}
      id="kesfet"
      className="code-workshop bmk-os-section"
      data-paused={!playback.active}
      data-quiet={quiet}
      aria-labelledby="code-workshop-title"
    >
      <div className="workshop-heading">
        <div>
          <span className="workshop-eyebrow">{copy?.eyebrow ?? 'BMK ATÖLYESİ / 02'}</span>
          <h2 id="code-workshop-title">
            {copy ? (
              <SectionTitle text={copy.title} />
            ) : (
              <>
                Tek bir yol <em>yok.</em>
              </>
            )}
          </h2>
        </div>
        <p>
          {copy?.text ?? (
            <>
              Bu masaüstünde merakına yer var.
              <br />
              Bir komut yaz. Bir pencere aç. Kendine göre yerleştir.
            </>
          )}
        </p>
      </div>
      <div
        ref={monitor}
        tabIndex={-1}
        role={immersive ? 'dialog' : undefined}
        aria-modal={immersive ? true : undefined}
        aria-label={immersive ? 'BMK OS masaüstü' : undefined}
        data-sleeping={!playback.active}
        data-accent={appearance.accent}
        data-ink={appearance.ink}
        data-text-size={appearance.textSize}
        data-corners={appearance.corners}
        data-motion={quiet ? 'reduced' : 'full'}
        data-branding={appearance.branding}
        className={'os-monitor os-v2' + (immersive ? ' os-immersive' : '')}
        onKeyDown={(e) => {
          if (!locked && e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            setCenter(false);
            setLauncher((v) => !v);
            return;
          }
          if (!locked && e.altKey && e.code === 'Backquote') {
            e.preventDefault();
            const windows = wm.open;
            if (windows.length) open(windows[(windows.indexOf(wm.focus!) + 1) % windows.length]);
            return;
          }
          if (e.key === 'Escape') {
            if (center) {
              e.preventDefault();
              setCenter(false);
            } else if (launcher) {
              e.preventDefault();
              setLauncher(false);
            } else if (contextMenu) {
              e.preventDefault();
              setContextMenu(null);
            } else if (startMenu) {
              e.preventDefault();
              setStartMenu(false);
              document.getElementById('os-start')?.focus();
            } else if (immersive) {
              e.preventDefault();
              setImmersive(false);
            }
          }
          if (immersive && e.key === 'Tab') {
            const nodes = [
              ...(monitor.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
              ) || []),
            ].filter((el) => !el.closest('[inert]') && el.getClientRects().length);
            const first = nodes[0],
              last = nodes.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === monitor.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="os-monitor-label">
          <span>
            <PixelDino /> BMK OS <b>/</b> <span>DESKTOP EDITION 4.0</span>
          </span>
          <div className="os-monitor-tools">
            <button
              disabled={locked}
              onClick={() => {
                setCenter(false);
                setLauncher(true);
              }}
              aria-label="Çalıştır penceresini aç"
              title="Çalıştır · Ctrl + Boşluk"
            >
              ⌕ <span>Çalıştır</span>
            </button>
            <button
              disabled={locked}
              onClick={() => editIcons(!editing)}
              aria-pressed={editing}
              title="Simgeleri düzenle"
            >
              {editing ? '✓ Tamam' : '▦ Simgeler'}
            </button>
            {editing && (
              <button disabled={locked} onClick={alignIcons} title="Simgeleri yeniden hizala">
                Hizala
              </button>
            )}
            <button
              onClick={() => playback.setPaused(!playback.paused)}
              aria-label={playback.paused ? 'Animasyonları sürdür' : 'Animasyonları duraklat'}
              aria-pressed={playback.paused}
            >
              {playback.paused ? '▶' : 'Ⅱ'}
            </button>
            <button
              onClick={() => setImmersive(!immersive)}
              aria-label={immersive ? 'Masaüstü odak görünümünden çık' : 'Masaüstünü büyüt'}
            >
              {immersive ? '⤡ Küçült' : '⤢ Büyüt'}
            </button>
          </div>
        </div>
        <div
          ref={desktop}
          className="os-desktop"
          data-phase={s.phase}
          data-theme={theme}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('[data-start]')) setStartMenu(false);
            if (!(e.target as HTMLElement).closest('.os-context-menu')) setContextMenu(null);
          }}
          onContextMenu={(e) => {
            if (locked || (e.target as HTMLElement).closest('.os-window,.os-taskbar')) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect(),
              app = (e.target as HTMLElement).closest<HTMLElement>('[data-icon-app]')?.dataset
                .iconApp as AppId | undefined;
            setContextMenu({
              x: Math.max(4, Math.min(bounds.w - 220, e.clientX - r.left)),
              y: Math.max(4, Math.min(bounds.h - 350, e.clientY - r.top)),
              app,
            });
          }}
        >
          <div className="os-desktop-surface" inert={locked || launcher || center}>
            <DesktopGrid
              order={icons}
              positions={iconLayouts[profile]}
              bounds={bounds}
              editing={editing}
              enabled={!locked && !launcher && !center}
              onPositions={placeIcons}
              onOpen={open}
            />
            <div className="os-wallpaper-brand" aria-hidden="true">
              <PixelDino />
              <span>
                bmk<span>os</span>
              </span>
              <small>Bilgisayar Mühendisliği Kulübü</small>
            </div>
            {!wm.focus && !locked && !Object.keys(iconLayouts[profile]).length && (
              <div className="os-desktop-tip">
                <span>{editing ? 'Bir simgeyi tut, yerini değiştir.' : 'Masaüstü senin.'}</span>
                <p>
                  {editing
                    ? 'İstediğin boşluğa bırak. Yerleri otomatik saklanır.'
                    : 'Bir pencere aç veya terminalde /help yaz.'}
                  <br />
                  {editing
                    ? 'Hizala ile başlangıç düzenine dönebilirsin.'
                    : 'Pencerelerini başlığından tutup taşıyabilirsin.'}
                </p>
              </div>
            )}
          </div>
          {snap && !locked && <div className={'os-snap-preview snap-' + snap} />}
          {wm.open.map((app) => {
            const hidden = wm.minimized.includes(app) || blue || booting || desktopReturn;
            const active = wm.focus === app && !locked && !hidden && !launcher && !center;
            return (
              <DesktopWindow
                key={app}
                app={app}
                frame={frameFor(app)}
                bounds={bounds}
                active={active}
                minimized={hidden}
                locked={locked || launcher || center}
                restoring={s.phase === 'restore' && app === 'terminal'}
                z={10 + wm.order.indexOf(app)}
                onFocus={() => {
                  if (!locked) desktopDispatch({ type: 'focus', app });
                }}
                onClose={() => hide(app, true)}
                onMinimize={() => hide(app)}
                onFrame={(frame) => desktopDispatch({ type: 'frame', app, frame })}
                onSnap={setSnap}
              >
                {app === 'terminal' ? (
                  <Terminal
                    s={s}
                    dispatch={dispatch}
                    paused={playback.paused}
                    choices={choices}
                    success={success}
                  />
                ) : app === 'console' ? (
                  <DesktopShell
                    active={active && playback.active}
                    context={shellContext}
                    onEffect={shellEffect}
                  />
                ) : app === 'files' ? (
                  <Suspense fallback={<div className="os-empty">Disk açılıyor…</div>}>
                    <DesktopFiles files={files} onOpen={open} />
                  </Suspense>
                ) : app === 'tasks' ? (
                  <DesktopTasks
                    desktop={wm}
                    onOpen={open}
                    onClose={closeApp}
                    onMinimize={minimizeApp}
                  />
                ) : app === 'notes' ? (
                  <DesktopNotes />
                ) : app === 'settings' ? (
                  <DesktopSettings
                    appearance={appearance}
                    onAppearance={setAppearance}
                    quiet={playback.quiet}
                    theme={theme}
                    onTheme={setTheme}
                    onLayout={layout}
                    editing={editing}
                    onEditing={editIcons}
                    saved={storageAvailable}
                    compact={bounds.w < 760}
                  />
                ) : (
                  <>
                    <div className="os-explorer-address">
                      <button
                        onClick={showDesktop}
                        title="Masaüstüne dön"
                        aria-label="Masaüstüne dön"
                      >
                        ←
                      </button>
                      <span>Adres</span>
                      <code>Masaüstü / {appLabels[app]}</code>
                    </div>
                    <FolderBoundary>
                      <Suspense
                        fallback={
                          <div className="os-empty" role="status">
                            Klasör açılıyor…
                          </div>
                        }
                      >
                        <DesktopApps
                          app={app}
                          content={content}
                          active={active && playback.active}
                          openTerminal={openTerminal}
                        />
                      </Suspense>
                    </FolderBoundary>
                    <div className="os-folder-status">
                      <span>
                        {app === 'team'
                          ? content.members.length + ' yayımlanmış profil'
                          : app === 'events'
                            ? content.events.length + ' yayımlanmış etkinlik'
                            : appLabels[app]}
                      </span>
                      <span>SCÜ BMK</span>
                    </div>
                  </>
                )}
              </DesktopWindow>
            );
          })}
          {contextMenu && !locked && (
            <div
              className="os-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              aria-label="Masaüstü menüsü"
            >
              {contextMenu.app && (
                <button onClick={() => open(contextMenu.app!)}>
                  Aç · {appLabels[contextMenu.app]}
                </button>
              )}
              <button onClick={() => open('console')}>Terminali aç</button>
              <button
                onClick={() => {
                  editIcons(!editing);
                  setContextMenu(null);
                }}
              >
                {editing ? 'Düzenlemeyi bitir' : 'Simgeleri düzenle'}
              </button>
              <button onClick={alignIcons}>Simgeleri hizala</button>
              <button onClick={() => layout('cascade')}>Pencereleri topla</button>
              <button onClick={() => open('files')}>Dosya gezgini</button>
              <button onClick={() => open('tasks')}>Görev yöneticisi</button>
              <button
                onClick={() => {
                  setContextMenu(null);
                  setCenter(false);
                  setLauncher(true);
                }}
              >
                Çalıştır…
              </button>
              <button onClick={() => open('settings')}>Masaüstünü kişiselleştir</button>
            </div>
          )}
          <div className="os-taskbar" inert={locked || launcher || center}>
            <div data-start>
              <button
                id="os-start"
                className="os-start"
                aria-expanded={startMenu}
                aria-controls="os-start-menu"
                onClick={() => setStartMenu(!startMenu)}
              >
                <PixelDino />
                <span>başlat</span>
              </button>
              {startMenu && (
                <div id="os-start-menu" className="os-start-menu">
                  <div className="os-start-profile">
                    <PixelDino />
                    <div>
                      <strong>Hoş geldin, konuk.</strong>
                      <span>BMK OS 4.0</span>
                    </div>
                  </div>
                  <div className="os-start-apps">
                    {desktopOrder.map((app) => (
                      <button key={app} onClick={() => open(app)}>
                        <DesktopIcon app={app} />
                        {appLabels[app]}
                      </button>
                    ))}
                  </div>
                  <button
                    className="os-show-desktop"
                    onClick={() => {
                      setStartMenu(false);
                      setLauncher(true);
                    }}
                  >
                    Çalıştır… <kbd>Ctrl + Boşluk</kbd>
                  </button>
                  <button className="os-show-desktop" onClick={showDesktop}>
                    Masaüstünü göster
                  </button>
                </div>
              )}
            </div>
            <button
              className="os-desktop-toggle"
              onClick={showDesktop}
              title="Masaüstünü göster"
              aria-label="Masaüstünü göster"
            >
              <span>▤</span>
            </button>
            <div className="os-task-items">
              {wm.open.map((app) => (
                <button
                  key={app}
                  aria-pressed={wm.focus === app}
                  onClick={() => (wm.focus === app ? hide(app) : open(app))}
                  title={appLabels[app]}
                >
                  <DesktopIcon app={app} />
                  <span>{appLabels[app]}</span>
                </button>
              ))}
            </div>
            <button
              className="os-clock"
              aria-label="Takvim ve sistem merkezini aç"
              aria-expanded={center}
              onClick={() => {
                setStartMenu(false);
                setContextMenu(null);
                setLauncher(false);
                setCenter((v) => !v);
              }}
            >
              <span aria-hidden="true">▥</span>
              <time>{time}</time>
            </button>
          </div>
          {center && !locked && (
            <DesktopCenter
              content={content}
              records={records}
              appearance={appearance}
              onAppearance={setAppearance}
              onSettings={() => open('settings')}
              onClose={() => setCenter(false)}
            />
          )}
          {launcher && !locked && (
            <DesktopLauncher
              context={shellContext}
              onEffect={shellEffect}
              onOpen={open}
              onClose={closeLauncher}
            />
          )}
          {s.phase === 'warnings' && <Warnings s={s} dispatch={dispatch} />}
          {blue && <DesktopCrash s={s} dispatch={dispatch} />}
          {booting && <DesktopReboot s={s} dispatch={dispatch} />}
          {desktopReturn && (
            <div className="os-desktop-toast">
              <DesktopIcon app="terminal" />
              <div>
                <strong>Masaüstü hazır.</strong>
                <span>Atölye kaldığın yerden açılıyor…</span>
              </div>
            </div>
          )}
        </div>
        <div className="os-monitor-footer">
          <span>{phaseText}</span>
          <span>
            {editing
              ? 'Sürükle, bırak · Otomatik kaydedilir'
              : 'Başlığı sürükle · Kenara bırak, yerleşsin'}
          </span>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {s.phase === 'answer'
          ? TRACKS[s.field].questions[s.question].prompt
          : s.phase === 'success'
            ? TRACKS[s.field].questions[s.question].explanation
            : s.phase === 'warnings'
              ? 'Yanlış cevap. ' +
                TRACKS[s.field].error.title +
                '. Sistem onarılıp aynı soru yeniden açılacak.'
              : desktopReturn
                ? 'Onarım tamamlandı. Masaüstü açıldı. Atölye geri yükleniyor.'
                : ''}
      </p>
    </section>
  );
}

export default memo(CodeWorkshop);
