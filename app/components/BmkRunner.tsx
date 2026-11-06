'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Check,
  LoaderCircle,
  Flag,
  ChevronRight,
  Shield,
  Star,
  Magnet,
  Rocket,
  Sparkles,
  Timer,
  Diamond,
  Bird,
  Infinity as InfinityIcon,
} from 'lucide-react';
import {
  act,
  createRun,
  step,
  score,
  levelAt,
  powerNames,
  ENGINE_VERSION,
  SHIELD_COST,
  CHECKPOINT_TICKS,
  MAX_SEGMENT_TICKS,
  type Action,
  type InputEvent,
  type RunState,
  type Power,
} from '../game/engine';
import { createRenderer } from '../game/renderer';
import { createGameAudio } from '../game/audio';
import { THEMES, themeIndex } from '../game/themes';
type Mode = 'daily' | 'practice';
type Hud = Pick<
  RunState,
  | 'status'
  | 'bits'
  | 'chain'
  | 'multiplier'
  | 'speed'
  | 'tick'
  | 'cleared'
  | 'cause'
  | 'slide'
  | 'energy'
  | 'shield'
  | 'grace'
  | 'magnet'
  | 'jet'
  | 'prism'
  | 'nearMisses'
  | 'slow'
  | 'seed'
  | 'flight'
  | 'flightTicks'
  | 'diamonds'
> & { score: number; maxChain: number };
type Leader = { nickname: string; score: number; ticks: number; bits: number; chain: number };
type Board = {
  day: string;
  seed: number;
  leaders: Leader[];
  mine: { score: number; nickname: string } | null;
};
type Checkpoint = {
  action: 'checkpoint';
  runId: string;
  fromTick: number;
  tick: number;
  events: InputEvent[];
};
const snapshot = (s: RunState): Hud => ({
  status: s.status,
  score: score(s),
  bits: s.bits,
  chain: s.chain,
  maxChain: s.maxChain,
  multiplier: s.multiplier,
  speed: s.speed,
  tick: s.tick,
  cleared: s.cleared,
  cause: s.cause,
  slide: s.slide,
  energy: s.energy,
  shield: s.shield,
  grace: s.grace,
  magnet: s.magnet,
  jet: s.jet,
  prism: s.prism,
  nearMisses: s.nearMisses,
  slow: s.slow,
  seed: s.seed,
  flight: s.flight,
  flightTicks: s.flightTicks,
  diamonds: s.diamonds,
});
const fmt = (n: number) => Math.floor(n).toLocaleString('tr-TR');
const clock = (ticks: number) =>
  `${Math.floor(ticks / 3600)}:${String(Math.floor(ticks / 60) % 60).padStart(2, '0')}`;
const powerIcons = { magnet: Magnet, jet: Rocket, prism: Sparkles, armor: Shield, slow: Timer };
function MoveButton({
  action,
  input,
  focusCanvas,
  disabled,
  label,
}: {
  action: 0 | 2;
  input: (a: Action) => void;
  focusCanvas: () => void;
  disabled: boolean;
  label: string;
}) {
  const release = () => input((action + 1) as Action);
  return (
    <button
      className={action === 0 ? 'run-jump' : 'run-slide'}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        focusCanvas();
        input(action);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if ([' ', 'Enter'].includes(e.key)) {
          e.preventDefault();
          if (!e.repeat) input(action);
        }
      }}
      onKeyUp={(e) => {
        if ([' ', 'Enter'].includes(e.key)) {
          e.preventDefault();
          release();
        }
      }}
    >
      {action === 0 ? <ArrowUp size={19} /> : <ArrowDown size={19} />}
      <span>{label}</span>
    </button>
  );
}
export default function BmkRunner({
  embedded = false,
  active = true,
}: { embedded?: boolean; active?: boolean } = {}) {
  const initial = useMemo(() => createRun(), []);
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    game = useRef(initial),
    events = useRef<InputEvent[]>([]),
    wake = useRef<(reset?: boolean) => void>(() => {}),
    runId = useRef(''),
    runMode = useRef<Mode>('daily'),
    mounted = useRef(true),
    held = useRef(new Set<number>()),
    bestCache = useRef<Record<string, number>>({}),
    day = useRef('');
  const soundWanted = useRef(true),
    activeRef = useRef(active);
  const audio = useRef<ReturnType<typeof createGameAudio> | null>(null),
    startAbort = useRef<AbortController | null>(null),
    syncAbort = useRef<AbortController | null>(null),
    verified = useRef(0),
    pending = useRef<Checkpoint | null>(null),
    syncTask = useRef<Promise<void> | null>(null),
    syncFailed = useRef(false);
  const [mode, setMode] = useState<Mode>('daily'),
    [hud, setHud] = useState(snapshot(initial)),
    [board, setBoard] = useState<Board | null>(null),
    [boardError, setBoardError] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [best, setBest] = useState(0),
    [nickname, setNickname] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(''),
    [focus, setFocus] = useState(false),
    [sound, setSound] = useState(true),
    [audioReady, setAudioReady] = useState(false),
    [audioMessage, setAudioMessage] = useState(''),
    [syncStatus, setSyncStatus] = useState<'ok' | 'saving' | 'error'>('ok');
  const update = useCallback(() => setHud(snapshot(game.current)), []);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/game');
      const d = (await r.json()) as Board & { error?: string };
      if (!r.ok) throw Error(d.error);
      if (mounted.current) {
        setBoard(d);
        setBoardError('');
        if (game.current.status === 'ready' && runMode.current === 'daily')
          setBest(bestCache.current[d.day] || 0);
      }
    } catch (e) {
      if (mounted.current) setBoardError(e instanceof Error ? e.message : 'Sıralama yüklenemedi.');
    }
  }, []);
  const ensureSound = useCallback(async (restart = false) => {
    if (!soundWanted.current) return false;
    if (!restart && audio.current?.isRunning()) return true;
    try {
      audio.current ??= createGameAudio(undefined, (running) => {
        if (mounted.current) setAudioReady(running);
      });
      const ready = await (restart ? audio.current.restart() : audio.current.setEnabled(true));
      const available = !!(ready || audio.current?.isRunning());
      if (mounted.current && soundWanted.current)
        setAudioMessage(available ? '' : 'Sesi açmak için hoparlör düğmesine dokun.');
      return available;
    } catch {
      if (audio.current?.isRunning()) return true;
      if (mounted.current && soundWanted.current)
        setAudioMessage('Ses başlatılamadı. Sesi aç düğmesine tekrar dokun.');
      return false;
    }
  }, []);
  const input = useCallback(
    (a: Action) => {
      const s = game.current;
      if (s.status !== 'running') return;
      if ((a === 0 || a === 2 || a === 4) && soundWanted.current && !audio.current?.isRunning())
        void ensureSound();
      if (a === 4) {
        if (act(s, a)) {
          events.current.push([s.tick, a]);
          audio.current?.play('shield');
        }
        return;
      }
      const key = a < 2 ? 0 : 2;
      if (a % 2 === 0) {
        if (held.current.has(key)) return;
        held.current.add(key);
      } else {
        if (!held.current.has(key)) return;
        held.current.delete(key);
      }
      events.current.push([s.tick, a]);
      act(s, a);
    },
    [ensureSound],
  );
  const pause = useCallback(() => {
    const s = game.current;
    if (s.status === 'running') {
      input(1);
      input(3);
      s.status = 'paused';
      audio.current?.stop();
      audio.current?.play('pause');
    } else if (s.status === 'paused') {
      if (syncFailed.current || !activeRef.current) return;
      void ensureSound();
      s.status = 'running';
      canvas.current?.focus({ preventScroll: true });
    } else return;
    update();
    wake.current(true);
  }, [input, update, ensureSound]);
  const halt = useCallback(() => {
    if (game.current.status === 'running') pause();
  }, [pause]);
  const checkpoint = useCallback(() => {
    if (syncTask.current) return syncTask.current;
    if (runMode.current !== 'daily' || !runId.current) return Promise.resolve();
    const s = game.current;
    if (!pending.current) {
      if (s.tick <= verified.current || s.status === 'over') return Promise.resolve();
      pending.current = {
        action: 'checkpoint',
        runId: runId.current,
        fromTick: verified.current,
        tick: s.tick,
        events: events.current.filter((e) => e[0] < s.tick),
      };
    }
    const payload = pending.current,
      id = payload.runId;
    const controller = new AbortController();
    syncAbort.current = controller;
    setSyncStatus('saving');
    // Bounded request time: pause safely and retry the same payload after a network interruption.
    const timeout = setTimeout(() => controller.abort(), 8000);
    const task = (async () => {
      try {
        const r = await fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const d = (await r.json()) as { error?: string };
        if (!r.ok) throw Error(d.error || 'Bağlantı kurulamadı.');
        if (!mounted.current || runId.current !== id) return;
        verified.current = payload.tick;
        events.current = events.current.filter((e) => e[0] >= payload.tick);
        pending.current = null;
        syncFailed.current = false;
        setSyncStatus('ok');
        setError('');
      } catch (e) {
        if (!mounted.current || runId.current !== id) return;
        syncFailed.current = true;
        setSyncStatus('error');
        halt();
        setError(
          'Koşu kaydını korumak için duraklattık. Bağlantını kontrol edip kaydı yeniden dene.',
        );
        throw e;
      } finally {
        clearTimeout(timeout);
        if (runId.current === id) syncTask.current = null;
      }
    })();
    syncTask.current = task;
    return task;
  }, [halt]);
  async function toggleSound() {
    const next = !soundWanted.current || !audio.current?.isRunning();
    soundWanted.current = next;
    setSound(next);
    setAudioMessage('');
    try {
      localStorage.setItem('bmk-run-sound', next ? 'on' : 'off');
    } catch {}
    if (next) {
      if (await ensureSound()) audio.current?.play('start');
    } else await audio.current?.setEnabled(false);
    if (game.current.status === 'running') canvas.current?.focus({ preventScroll: true });
  }
  async function start() {
    if (loading || !activeRef.current) return;
    const soundReady = ensureSound();
    audio.current?.stop();
    setLoading(true);
    setError('');
    setSaved('');
    startAbort.current?.abort();
    const controller = new AbortController();
    startAbort.current = controller;
    try {
      let seed = crypto.getRandomValues(new Uint32Array(1))[0],
        id = '',
        challenge = '';
      if (mode === 'daily') {
        const r = await fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
          signal: controller.signal,
        });
        const d = (await r.json()) as {
          error?: string;
          version: number;
          seed: number;
          runId: string;
          day: string;
        };
        if (!r.ok) throw Error(d.error);
        if (d.version !== ENGINE_VERSION)
          throw Error('Yeni oyun sürümü hazır. Sayfayı yenileyip tekrar dene.');
        seed = d.seed;
        id = d.runId;
        challenge = d.day;
        if (board?.day !== d.day) void refresh();
      }
      await soundReady;
      if (!mounted.current || !activeRef.current) return;
      syncAbort.current?.abort();
      runId.current = id;
      runMode.current = mode;
      day.current = challenge;
      verified.current = 0;
      pending.current = null;
      syncTask.current = null;
      syncFailed.current = false;
      setSyncStatus('ok');
      game.current = createRun(seed);
      game.current.status = 'running';
      events.current = [];
      held.current.clear();
      setBest(bestCache.current[mode === 'daily' ? challenge : 'practice'] || 0);
      update();
      audio.current?.play('start');
      if (!embedded) host.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      wake.current(true);
      canvas.current?.focus({ preventScroll: true });
    } catch (e) {
      if (mounted.current && !(e instanceof Error && e.name === 'AbortError'))
        setError(e instanceof Error ? e.message : 'Koşu başlatılamadı.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  async function submitScore(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || saved) return;
    setSaving(true);
    setError('');
    try {
      if (syncTask.current) await syncTask.current;
      if (pending.current) await checkpoint();
      const r = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finish',
          runId: runId.current,
          fromTick: verified.current,
          nickname: nickname.trim(),
          tick: game.current.tick,
          events: events.current,
        }),
      });
      const d = (await r.json()) as { error?: string; score: number; best: number };
      if (!r.ok) throw Error(d.error);
      setSaved(
        d.best > d.score
          ? `Kaydedildi. Günlük en iyi skorun ${fmt(d.best)}.`
          : 'Skorun günlük tabloya eklendi.',
      );
      try {
        localStorage.setItem('bmk-run-nickname', nickname.trim());
      } catch {}
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Skor kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }
  function choose(next: Mode) {
    if (['running', 'paused'].includes(game.current.status) || loading || saving) return;
    setMode(next);
    setError('');
    setSaved('');
    game.current = createRun();
    runMode.current = next;
    setBest(bestCache.current[next === 'daily' ? board?.day || '' : 'practice'] || 0);
    update();
    wake.current(true);
  }
  useEffect(() => {
    activeRef.current = active;
    if (!active) halt();
  }, [active, halt]);
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => {
      if (!mounted.current) return;
      void refresh();
      try {
        const enabled = localStorage.getItem('bmk-run-sound') !== 'off';
        soundWanted.current = enabled;
        setSound(enabled);
      } catch {}
      try {
        const stored = JSON.parse(localStorage.getItem('bmk-run-v5-best') || '{}');
        if (stored && typeof stored === 'object')
          bestCache.current = Object.fromEntries(
            Object.entries(stored).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)),
          ) as Record<string, number>;
        setNickname(localStorage.getItem('bmk-run-nickname') || '');
      } catch {}
    });
    const el = canvas.current;
    if (!el) return;
    const renderer = createRenderer(el),
      motion = matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setReduced(motion.matches);
    let raf = 0,
      prev = 0,
      acc = 0,
      lastHud = 0,
      disposed = false,
      lastFoot = 0,
      lastSlides = 0,
      lastFlap = 0,
      lastFlips = 0;
    const remember = () => {
      const s = game.current,
        key = runMode.current === 'daily' ? day.current : 'practice',
        points = score(s);
      if (points > (bestCache.current[key] || 0)) {
        bestCache.current[key] = points;
        setBest(points);
        try {
          localStorage.setItem(
            'bmk-run-v5-best',
            JSON.stringify(Object.fromEntries(Object.entries(bestCache.current).slice(-20))),
          );
        } catch {}
      }
    };
    function tick(now: number) {
      raf = 0;
      if (disposed) return;
      const s = game.current,
        elapsed = prev ? (now - prev) / 1000 : 0;
      prev = now;
      if (s.status === 'running' && elapsed > 0.25) {
        halt();
        renderer.draw(s);
        return;
      }
      const dt = Math.min(elapsed, 0.1);
      if (s.status === 'running') {
        const oldBits = s.bits,
          oldJumps = s.jumps,
          oldLand = s.landings,
          oldPower = s.powerSerial,
          oldHits = s.shieldHits,
          oldCombo = s.multiplier,
          oldLevel = levelAt(s.tick),
          oldNear = s.nearMisses,
          oldDiamonds = s.diamonds,
          oldFlight = s.flightSerial,
          oldRelease = s.birdRelease,
          oldBird = s.nextBird - s.tick;
        acc += dt;
        let steps = 0;
        while (acc >= 1 / 60 && steps < 6 && s.status === 'running') {
          step(s);
          acc -= 1 / 60;
          steps++;
        }
        const a = audio.current;
        if (s.diamonds > oldDiamonds) a?.play('diamond');
        if (s.flightSerial > oldFlight) a?.play('flight');
        if (s.flips > lastFlips) a?.play('flip');
        lastFlips = s.flips;
        if (s.birdRelease > oldRelease) a?.play('release');
        if (oldBird > 180 && s.nextBird - s.tick <= 180) a?.play('warning');
        if (s.flight === 'bird' && now - lastFlap > 470) {
          lastFlap = now;
          a?.play('flap');
        }
        if (s.bits > oldBits) a?.play('star', s.multiplier);
        if (s.jumps > oldJumps) a?.play('jump');
        if (s.landings > oldLand) a?.play('land');
        if (s.slides > lastSlides) a?.play('slide');
        lastSlides = s.slides;
        if (s.powerSerial > oldPower) a?.play('power');
        if (s.shieldHits > oldHits) a?.play('break');
        if (s.multiplier > oldCombo) a?.play('combo');
        if (levelAt(s.tick) > oldLevel) a?.play('level');
        if (s.nearMisses > oldNear) a?.play('near');
        if (s.y === 0 && !s.slide && now - lastFoot > Math.max(110, 240 - s.speed * 0.13)) {
          lastFoot = now;
          a?.play('step');
        }
        if ((s as RunState).status === 'over') {
          remember();
          a?.play('over');
          update();
        } else if (now - lastHud > 100) {
          lastHud = now;
          update();
        }
        if (
          runMode.current === 'daily' &&
          s.status === 'running' &&
          s.tick - verified.current >= CHECKPOINT_TICKS &&
          !syncTask.current &&
          !syncFailed.current
        )
          void checkpoint().catch(() => {});
        if (runMode.current === 'daily' && s.tick - verified.current >= MAX_SEGMENT_TICKS - 120)
          halt();
        if (runMode.current === 'practice' && events.current.length > 700) events.current = [];
      }
      const settling = renderer.draw(s, dt);
      if (s.status === 'running' || settling) raf = requestAnimationFrame(tick);
    }
    function request(reset = false) {
      if (reset) {
        prev = 0;
        acc = 0;
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    wake.current = request;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const resize = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!disposed) {
          renderer.resize();
          request();
        }
      }, 70);
    });
    resize.observe(el);
    const visibility = () => {
      if (document.hidden) halt();
    };
    const overlay = (e: Event) => {
      if ((e as CustomEvent).detail) halt();
    };
    const changeMotion = () => {
      renderer.setReduced(motion.matches);
      request();
    };
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio < 0.12) halt();
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        !host.current?.contains(target) ||
        target.closest('input,textarea,select,a,button') ||
        document.body.dataset.menuOpen
      )
        return;
      const down = e.type === 'keydown';
      if (down && !e.repeat && e.code === 'KeyE' && game.current.status === 'running') {
        e.preventDefault();
        input(4);
      }
      if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS'].includes(e.code)) {
        if (game.current.status !== 'running') return;
        e.preventDefault();
        if (e.repeat) return;
        const slide = ['ArrowDown', 'KeyS'].includes(e.code);
        input(((slide ? 2 : 0) + (down ? 0 : 1)) as Action);
      }
      if (down && !e.repeat && ['KeyP', 'Escape'].includes(e.code)) {
        e.preventDefault();
        if (e.code === 'KeyP') pause();
        else halt();
      }
    };
    addEventListener('keydown', key);
    addEventListener('keyup', key);
    addEventListener('blur', halt);
    document.addEventListener('visibilitychange', visibility);
    addEventListener('bmk-overlay', overlay);
    motion.addEventListener('change', changeMotion);
    return () => {
      mounted.current = false;
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      resize.disconnect();
      observer.disconnect();
      renderer.destroy();
      motion.removeEventListener('change', changeMotion);
      removeEventListener('keydown', key);
      removeEventListener('keyup', key);
      removeEventListener('blur', halt);
      document.removeEventListener('visibilitychange', visibility);
      removeEventListener('bmk-overlay', overlay);
      startAbort.current?.abort();
      syncAbort.current?.abort();
      audio.current?.destroy();
      audio.current = null;
      wake.current = () => {};
    };
  }, [update, refresh, halt, input, pause, checkpoint]);

  useEffect(() => {
    if (!focus) return;
    const old = document.body.style.overflow,
      previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        halt();
        setFocus(false);
      } else if (e.key === 'Tab') {
        const items = [
          ...(host.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),a[href],canvas[tabindex]',
          ) || []),
        ].filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key, true);
      previous?.focus({ preventScroll: true });
    };
  }, [focus, halt]);
  const running = hud.status === 'running',
    ended = hud.status === 'over',
    level = levelAt(hud.tick),
    activePowers = (['magnet', 'jet', 'prism', 'armor', 'slow'] as Power[]).map((kind) => ({
      kind,
      ticks: kind === 'armor' ? hud.shield : hud[kind],
    }));
  const focusCanvas = useCallback(() => canvas.current?.focus({ preventScroll: true }), []);
  const flying = hud.flight === 'bird' || hud.flight === 'jet',
    currentMap = THEMES[themeIndex(hud.seed, level - 1)];
  return (
    <div
      className={'overclock' + (focus ? ' is-focused' : '')}
      ref={host}
      role={focus ? 'dialog' : undefined}
      aria-modal={focus ? true : undefined}
      aria-label={focus ? 'BMK Run odak görünümü' : undefined}
    >
      <div className="run-toolbar">
        <div className="run-mode" role="group" aria-label="Oyun modu">
          <button
            aria-pressed={mode === 'daily'}
            disabled={running || hud.status === 'paused' || loading || saving}
            onClick={() => choose('daily')}
          >
            <Flag size={14} />
            Sıralamalı
          </button>
          <button
            aria-pressed={mode === 'practice'}
            disabled={running || hud.status === 'paused' || loading || saving}
            onClick={() => choose('practice')}
          >
            Antrenman
          </button>
        </div>
        <span className="run-endless">
          <InfinityIcon size={17} />
          Her koşu başka
        </span>
        <div className="run-utilities">
          <button
            className="run-sound"
            onClick={toggleSound}
            aria-label={sound && audioReady ? 'Sesi kapat' : 'Sesi aç'}
            aria-pressed={sound && audioReady}
          >
            {sound && audioReady ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <span>{sound && audioReady ? 'Ses açık' : sound ? 'Sesi aç' : 'Ses kapalı'}</span>
          </button>
          <button
            className="run-repair-sound"
            onClick={() => {
              soundWanted.current = true;
              setSound(true);
              try {
                localStorage.setItem('bmk-run-sound', 'on');
              } catch {}
              void ensureSound(true).then((ok) => {
                if (ok) audio.current?.play('start');
                if (game.current.status === 'running')
                  canvas.current?.focus({ preventScroll: true });
              });
            }}
            aria-label="Sesi yenile ve dene"
            title="Sesi yenile ve dene"
          >
            <RotateCcw size={14} />
            <span>Sesi yenile</span>
          </button>
          {!embedded && (
            <button
              onClick={() => {
                setFocus(!focus);
                halt();
              }}
              aria-label={focus ? 'Odak görünümünden çık' : 'Oyunu büyüt'}
            >
              {focus ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span className="run-focus-label">{focus ? 'Küçült' : 'Ekranı kapla'}</span>
            </button>
          )}
        </div>
      </div>
      <div className="run-layout">
        <section className="run-machine" aria-label="BMK Run oyunu">
          <div className="run-hud">
            <div className="run-main-score">
              <span>SKOR</span>
              <strong>{String(hud.score).padStart(5, '0')}</strong>
            </div>
            <div>
              <span>ÇARPAN</span>
              <strong className={hud.multiplier > 1 ? 'active-combo' : ''}>
                ×{hud.multiplier * (hud.prism > 0 ? 2 : 1)}
              </strong>
            </div>
            <div>
              <span>SEVİYE</span>
              <strong>{String(level).padStart(2, '0')}</strong>
            </div>
            <div className="run-duration">
              <span>SÜRE</span>
              <strong>{clock(hud.tick)}</strong>
            </div>
            <button
              onClick={pause}
              disabled={!running && hud.status !== 'paused'}
              aria-label={running ? 'Oyunu duraklat' : 'Oyuna devam et'}
            >
              {running ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
          <div className="run-stage">
            <canvas
              ref={canvas}
              tabIndex={0}
              aria-label="BMK Run. Boşluk veya yukarı ok: zıpla; uçuşta yüksel. Aşağı ok: kay; uçuşta alçal. E: kalkan. P: duraklat. Mobilde alttaki düğmeleri kullan."
            />
            {!running && (
              <div className={'run-overlay ' + (hud.status === 'ready' ? 'intro' : '')}>
                {hud.status === 'ready' ? (
                  <>
                    <span className="run-eyebrow">KOŞ. UÇ. TEKRAR DENE.</span>
                    <h2>
                      Yerden
                      <br />
                      <em>gökyüzüne.</em>
                    </h2>
                    <p>
                      Sekiz dünya. Her seferinde yeni bir yol.
                      <br />
                      Bu kez sadece ayaklarına güvenme.
                    </p>
                    <button className="run-primary" onClick={start} disabled={loading}>
                      {loading ? 'Parkur hazırlanıyor…' : 'Koşuya başla'}
                      {loading ? (
                        <LoaderCircle className="run-spin" size={18} />
                      ) : (
                        <Play size={17} />
                      )}
                    </button>
                    <span className="run-intro-tip">↑ Zıpla / yüksel &nbsp; ↓ Kay / alçal</span>
                  </>
                ) : hud.status === 'paused' ? (
                  <>
                    <span className="run-eyebrow">OYUN DURAKLATILDI</span>
                    <h2>
                      Nefes
                      <br />
                      <em>molası.</em>
                    </h2>
                    <p>
                      {syncStatus === 'error'
                        ? 'Bağlantı geri geldiğinde koşuna devam edebilirsin.'
                        : 'Parkur burada. Hazır olduğunda devam et.'}
                    </p>
                    {syncStatus === 'error' ? (
                      <button
                        className="run-primary"
                        onClick={() => {
                          void checkpoint().catch(() => {});
                        }}
                      >
                        Kaydı yeniden dene
                        <RotateCcw size={17} />
                      </button>
                    ) : (
                      <button className="run-primary" onClick={pause}>
                        Devam et
                        <Play size={18} />
                      </button>
                    )}
                    <button
                      className="run-quiet"
                      onClick={() => {
                        runId.current = '';
                        syncAbort.current?.abort();
                        pending.current = null;
                        syncTask.current = null;
                        syncFailed.current = false;
                        setSyncStatus('ok');
                        setError('');
                        game.current = createRun();
                        held.current.clear();
                        update();
                        wake.current(true);
                      }}
                    >
                      Koşudan çık
                    </button>
                  </>
                ) : (
                  <>
                    <span className="run-eyebrow">
                      SEVİYE {level} · {fmt(hud.cleared)} ENGEL
                    </span>
                    <div className="run-result-score">
                      {fmt(hud.score)}
                      <span>puan</span>
                    </div>
                    <p>{hud.cause}</p>
                    <div className="run-result-facts">
                      <span>
                        <Star size={13} />
                        {hud.bits}
                      </span>
                      <span>
                        <Diamond size={13} />
                        {hud.diamonds}
                      </span>
                      <span>{clock(hud.tick)}</span>
                    </div>
                    <button className="run-primary" onClick={start} disabled={loading || saving}>
                      {loading ? 'Hazırlanıyor…' : 'Bir tur daha'}
                      <RotateCcw size={17} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="run-pace">
            <span>
              {flying ? <Bird size={14} /> : <i />}
              {flying
                ? hud.flight === 'bird'
                  ? 'Kuşun kontrolü sende'
                  : 'Jetpack uçuşu'
                : currentMap.name}
            </span>
            <div aria-label={`Hız: ${(hud.speed / 360).toFixed(2)} kat`}>
              <div>
                <i style={{ width: `${Math.min(100, ((hud.speed - 360) / 1520) * 100)}%` }} />
              </div>
              <b>{(hud.speed / 360).toFixed(2)}×</b>
            </div>
          </div>
          <div className="run-loadout" aria-label="Toplanabilen güçler">
            {activePowers.map(({ kind, ticks }) => {
              const Icon = powerIcons[kind];
              return (
                <div key={kind} className={'run-ability ' + kind + (ticks > 0 ? ' active' : '')}>
                  <Icon size={14} />
                  <span>{powerNames[kind]}</span>
                  <b>{ticks > 0 ? `${Math.ceil(ticks / 60)}s` : '—'}</b>
                  {ticks > 0 && (
                    <i
                      style={{
                        transform: `scaleX(${Math.min(1, ticks / (kind === 'armor' ? 240 : kind === 'slow' ? 360 : 540))})`,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="run-power" role="group" aria-label="Yıldız enerjisi">
            <div>
              <Star size={18} />
              <div>
                <strong>
                  {hud.shield > 0
                    ? 'Kalkan aktif'
                    : hud.grace > 0
                      ? 'Kısa koruma'
                      : hud.energy >= SHIELD_COST
                        ? 'Kalkan hazır'
                        : 'Kalkan enerjisi'}
                </strong>
                <span>24 altın yıldız · tek darbelik koruma</span>
              </div>
            </div>
            <div className="run-energy" aria-label={`${hud.energy} / ${SHIELD_COST} yıldız`}>
              <div>
                <i style={{ width: `${(hud.energy / SHIELD_COST) * 100}%` }} />
              </div>
              <b>
                {hud.energy}/{SHIELD_COST}
              </b>
            </div>
            <button
              disabled={!running || hud.energy < SHIELD_COST || hud.shield > 0 || hud.grace > 0}
              onClick={() => {
                input(4);
                update();
                canvas.current?.focus({ preventScroll: true });
              }}
            >
              <Shield size={17} />
              <span>Kullan</span>
              <kbd>E</kbd>
            </button>
          </div>
          <div className={'run-inputs' + (flying ? ' in-flight' : '')}>
            <p>
              <span>
                {flying
                  ? 'Yukarıyı basılı tutarak yüksel.'
                  : 'Kısa dokun, kısa zıpla. Basılı tut, daha uzağa git.'}
              </span>
              <small>
                {flying
                  ? 'Aşağıyla alçal. Havada da çarpabilirsin.'
                  : 'Kaymak için aşağıyı basılı tut. P ile duraklat.'}
              </small>
            </p>
            <div>
              <MoveButton
                action={2}
                input={input}
                focusCanvas={focusCanvas}
                disabled={!running}
                label={flying ? 'Alçal' : 'Kay'}
              />
              <MoveButton
                action={0}
                input={input}
                focusCanvas={focusCanvas}
                disabled={!running}
                label={flying ? 'Yüksel' : 'Zıpla'}
              />
            </div>
          </div>
          {audioMessage && (
            <p className="run-audio-message" role="status">
              {audioMessage}
            </p>
          )}
          {error && (
            <p className="run-error" role="alert">
              {error}
            </p>
          )}
          {ended && mode === 'daily' && (
            <div className="run-submit">
              {saved ? (
                <p role="status">
                  <Check size={18} />
                  {saved}
                </p>
              ) : (
                <form onSubmit={submitScore}>
                  <label htmlFor="runner-nickname">
                    Tabloda hangi isim görünsün?
                    <input
                      id="runner-nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Takma adın"
                      minLength={2}
                      maxLength={20}
                      required
                      disabled={saving}
                      autoComplete="off"
                    />
                  </label>
                  <button className="run-primary" disabled={saving}>
                    {saving ? 'Doğrulanıyor…' : 'Skoru tabloya ekle'}
                    {saving ? (
                      <LoaderCircle className="run-spin" size={17} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                  <small>Takma adın ve skorun ziyaretçilere görünür. Hesap gerekmez.</small>
                </form>
              )}
            </div>
          )}
        </section>
        <aside className="run-board">
          <div className="run-board-title">
            <Trophy size={18} />
            <span>GÜNLÜK SIRALAMA</span>
          </div>
          <h2>
            İsmini
            <br />
            buraya bırak.
          </h2>
          <p>
            {board ? board.day.split('-').reverse().join('.') : 'Bugün'} · Her koşu rastgele. Rekor
            senin.
          </p>
          {boardError ? (
            <div className="run-board-empty">
              <p>{boardError}</p>
              <button onClick={refresh}>Yeniden dene</button>
            </div>
          ) : !board ? (
            <p className="run-board-loading">Sıralama yükleniyor…</p>
          ) : board.leaders.length ? (
            <ol>
              {board.leaders.map((r, i) => (
                <li key={i}>
                  <span className={'run-rank rank-' + i}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{r.nickname}</strong>
                    <span>
                      {clock(r.ticks)} · {r.bits} yıldız
                    </span>
                  </div>
                  <b>{fmt(r.score)}</b>
                </li>
              ))}
            </ol>
          ) : (
            <div className="run-board-empty">
              <span>01</span>
              <h3>Bu yer senin olabilir.</h3>
              <p>Koşuyu bitir, skorunu kaydet.</p>
            </div>
          )}
          <div className="run-mine">
            <span>{mode === 'practice' ? 'Antrenman rekorun' : 'Senin günlük rekorun'}</span>
            <strong>{fmt(mode === 'practice' ? best : board?.mine?.score || best)}</strong>
          </div>
          <div className="run-loot-legend">
            <div>
              <Star size={18} />
              <p>
                <strong>Altın yıldız</strong>
                <span>+1 enerji · 30 × çarpan puan</span>
              </p>
            </div>
            <div>
              <Diamond size={18} />
              <p>
                <strong>Buz elması</strong>
                <span>+150 puan · enerji vermez</span>
              </p>
            </div>
            <small>
              5 yıldızda bir çarpanın artar. Elmaslar riskli yerlerde olabilir; kaçırmak serini
              bozmaz.
            </small>
          </div>
        </aside>
      </div>
      <div className="run-field-notes">
        <div>
          <span>YOLDA BULDUKLARIN</span>
          <h3>
            Biraz avantaj.
            <br /> Biraz cesaret.
          </h3>
        </div>
        <div className="run-power-guide">
          {(['magnet', 'jet', 'prism', 'armor', 'slow'] as Power[]).map((kind) => {
            const Icon = powerIcons[kind];
            return (
              <div key={kind} className={kind}>
                <Icon size={20} />
                <p>
                  <strong>{powerNames[kind]}</strong>
                  <span>
                    {kind === 'magnet'
                      ? '9 sn · Yakındaki altın yıldızları çeker.'
                      : kind === 'jet'
                        ? '9 sn · Yukarı / aşağı ile uç. Tekrar yükselirken takla at.'
                        : kind === 'prism'
                          ? '9 sn · Yıldız ve elmas puanını ikiye katlar.'
                          : kind === 'slow'
                            ? '6 sn · Hızı üçte bir azaltır.'
                            : '4 sn · İlk çarpmayı karşılar.'}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {ended
          ? `Koşu bitti. ${hud.score} puan.`
          : hud.status === 'paused'
            ? 'Oyun duraklatıldı.'
            : running
              ? flying
                ? 'Uçuş başladı. Yukarıyla yüksel, aşağıyla alçal.'
                : 'Koşu başladı.'
              : ''}
      </p>
    </div>
  );
}
