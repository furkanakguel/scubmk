'use client';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { fitRect, frameRect, type AppId, type Frame, type Bounds, type Rect } from '../lab/desktop';
import { DesktopIcon, appLabels } from './DesktopIcons';
type Props = {
  app: AppId;
  frame: Frame;
  bounds: Bounds;
  active: boolean;
  minimized: boolean;
  locked: boolean;
  restoring: boolean;
  z: number;
  children: ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onFrame: (frame: Frame) => void;
  onSnap: (edge: 'left' | 'right' | 'full' | null) => void;
};
export default function DesktopWindow(p: Props) {
  const [entering, setEntering] = useState(true),
    [exiting, setExiting] = useState<'close' | 'minimize' | null>(null),
    [reframing, setReframing] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    reframeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const host = useRef<HTMLDivElement>(null),
    raf = useRef(0),
    gesture = useRef<null | {
      id: number;
      x: number;
      y: number;
      mode: 'move' | 'resize';
      start: Rect;
      next: Rect;
      moved: boolean;
      edge: 'left' | 'right' | 'full' | null;
      scaleX: number;
      scaleY: number;
      originLeft: number;
      originTop: number;
    }>(null);
  const rect = frameRect(p.frame, p.bounds);
  useEffect(() => {
    if (p.minimized) return;
    setEntering(true);
    const timer = setTimeout(() => setEntering(false), 240);
    return () => clearTimeout(timer);
  }, [p.minimized]);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      if (reframeTimer.current) clearTimeout(reframeTimer.current);
    },
    [],
  );
  function dismiss(mode: 'close' | 'minimize') {
    if (exiting || p.locked) return;
    if (
      host.current?.closest('[data-motion="reduced"]') ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('motion-quiet')
    ) {
      if (mode === 'close') p.onClose();
      else p.onMinimize();
      return;
    }
    setExiting(mode);
    exitTimer.current = setTimeout(() => {
      setExiting(null);
      if (mode === 'close') p.onClose();
      else p.onMinimize();
    }, 145);
  }
  function apply(r: Rect) {
    if (!host.current) return;
    Object.assign(host.current.style, {
      left: r.x + 'px',
      top: r.y + 'px',
      width: r.w + 'px',
      height: r.h + 'px',
    });
  }
  function begin(e: PointerEvent<HTMLElement>, mode: 'move' | 'resize') {
    if (
      p.locked ||
      e.button !== 0 ||
      (mode === 'move' && (e.target as HTMLElement).closest('button'))
    )
      return;
    const desktop = host.current?.parentElement?.getBoundingClientRect();
    if (!desktop) return;
    e.preventDefault();
    p.onFocus();
    e.currentTarget.setPointerCapture(e.pointerId);
    const sx = desktop.width / p.bounds.w,
      sy = desktop.height / p.bounds.h;
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      mode,
      start: rect,
      next: rect,
      moved: false,
      edge: null,
      scaleX: sx || 1,
      scaleY: sy || 1,
      originLeft: desktop.left,
      originTop: desktop.top,
    };
  }
  function move(e: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = (e.clientX - g.x) / g.scaleX,
      dy = (e.clientY - g.y) / g.scaleY;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    if (!g.moved && (p.frame.maximized || p.frame.snap) && g.mode === 'move') {
      const restored = fitRect(p.frame.rect, p.bounds);
      g.start = {
        ...restored,
        x: Math.min(
          p.bounds.w - restored.w - 6,
          Math.max(6, g.start.x + g.start.w * 0.5 - restored.w * 0.5),
        ),
        y: Math.max(6, g.start.y),
      };
      apply(g.start);
    }
    g.moved = true;
    g.next = fitRect(
      g.mode === 'move'
        ? { ...g.start, x: g.start.x + dx, y: g.start.y + dy }
        : { ...g.start, w: g.start.w + dx, h: g.start.h + dy },
      p.bounds,
    );
    let edge: typeof g.edge = null;
    if (g.mode === 'move') {
      const x = (e.clientX - g.originLeft) / g.scaleX,
        y = (e.clientY - g.originTop) / g.scaleY;
      edge =
        y < 14
          ? 'full'
          : p.bounds.w >= 760 && x < 20
            ? 'left'
            : p.bounds.w >= 760 && x > p.bounds.w - 20
              ? 'right'
              : null;
    }
    if (edge !== g.edge) {
      g.edge = edge;
      p.onSnap(edge);
    }
    if (!raf.current)
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const current = gesture.current;
        if (current) {
          host.current?.classList.add('is-moving');
          if (current.mode === 'move' && host.current)
            host.current.style.transform = `translate3d(${current.next.x - current.start.x}px,${current.next.y - current.start.y}px,0)`;
          else apply(current.next);
        }
      });
  }
  function end(e: PointerEvent<HTMLElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    host.current?.classList.remove('is-moving');
    if (host.current) host.current.style.transform = '';
    p.onSnap(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (cancel || !g.moved) {
      apply(rect);
      return;
    }
    apply(g.next);
    p.onFrame({
      rect: g.next,
      maximized: g.edge === 'full',
      snap: g.edge === 'left' || g.edge === 'right' ? g.edge : null,
    });
  }
  const pointer = {
    onPointerMove: move,
    onPointerUp: (e: PointerEvent<HTMLElement>) => end(e),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => end(e, true),
    onLostPointerCapture: (e: PointerEvent<HTMLElement>) => end(e, true),
  };
  function maximize() {
    setReframing(true);
    if (reframeTimer.current) clearTimeout(reframeTimer.current);
    reframeTimer.current = setTimeout(() => setReframing(false), 220);
    p.onFrame({ ...p.frame, maximized: !p.frame.maximized, snap: null });
  }
  function nudge(key: string, resize = false) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return false;
    const dx = key === 'ArrowLeft' ? -20 : key === 'ArrowRight' ? 20 : 0,
      dy = key === 'ArrowUp' ? -20 : key === 'ArrowDown' ? 20 : 0;
    p.onFrame({
      rect: fitRect(
        resize
          ? { ...rect, w: rect.w + dx, h: rect.h + dy }
          : { ...rect, x: rect.x + dx, y: rect.y + dy },
        p.bounds,
      ),
      maximized: false,
      snap: null,
    });
    return true;
  }
  return (
    <div
      ref={host}
      className={
        'os-window os-managed-window' +
        (entering ? ' is-entering' : '') +
        (p.frame.maximized ? ' is-maximized' : '') +
        (p.restoring ? ' is-restoring' : '') +
        (exiting ? ' is-exiting exit-' + exiting : '') +
        (reframing ? ' is-reframing' : '')
      }
      data-app={p.app}
      data-active={p.active}
      hidden={p.minimized}
      inert={p.locked || !!exiting}
      style={
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          right: 'auto',
          bottom: 'auto',
          zIndex: p.z,
        } as CSSProperties
      }
      onPointerDownCapture={() => {
        if (!p.active) p.onFocus();
      }}
      onFocusCapture={() => {
        if (!p.active) p.onFocus();
      }}
    >
      <div
        className="os-titlebar"
        tabIndex={0}
        aria-label={appLabels[p.app] + ' penceresi'}
        title="Sürükle: taşı · Çift tık: büyüt · Alt + yön tuşları: taşı"
        onPointerDown={(e) => begin(e, 'move')}
        {...pointer}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) maximize();
        }}
        onKeyDown={(e) => {
          if (e.altKey && nudge(e.key)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className="os-window-controls">
          <button
            onClick={() => dismiss('close')}
            title="Pencereyi kapat"
            aria-label="Pencereyi kapat"
          >
            ×
          </button>
          <button
            onClick={() => dismiss('minimize')}
            title="Pencereyi küçült"
            aria-label="Pencereyi küçült"
          >
            <span className="os-minimize-symbol" />
          </button>
          <button
            onClick={maximize}
            title={p.frame.maximized ? 'Pencereyi eski boyutuna getir' : 'Pencereyi büyüt'}
            aria-label={p.frame.maximized ? 'Pencereyi eski boyutuna getir' : 'Pencereyi büyüt'}
          >
            <span className={'os-maximize-symbol' + (p.frame.maximized ? ' restore' : '')} />
          </button>
        </div>
        <span className="os-title-text">
          <DesktopIcon app={p.app} />
          {appLabels[p.app]}
          <span>{p.app === 'console' ? ' — konuk@bmk' : ' — SCÜ BMK'}</span>
        </span>
        <span className="os-title-grip" aria-hidden="true" />
      </div>
      <div className="os-managed-body" inert={!p.active || p.locked}>
        {p.children}
      </div>
      {!p.frame.maximized && !p.frame.snap && (
        <button
          className="os-resize-handle"
          aria-label={appLabels[p.app] + ' boyutunu değiştir'}
          title="Sürükle veya yön tuşlarıyla boyutlandır"
          onPointerDown={(e) => begin(e, 'resize')}
          {...pointer}
          onKeyDown={(e) => {
            if (nudge(e.key, true)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <span />
        </button>
      )}
    </div>
  );
}
