'use client';
import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { AppId, Bounds, Rect } from '../lab/desktop';
import {
  dragIcon,
  layoutIcons,
  moveIcon,
  type IconPositions,
  type Point,
} from '../lab/icon-layout';
import { DesktopIcon, appLabels } from './DesktopIcons';

type Drag = {
  app: AppId;
  id: number;
  origin: Point;
  start: Rect;
  position: Rect;
  scale: Point;
  moved: boolean;
  node: HTMLButtonElement;
};
function DesktopGrid({
  order,
  positions,
  bounds,
  editing,
  enabled,
  onPositions,
  onOpen,
}: {
  order: AppId[];
  positions: IconPositions;
  bounds: Bounds;
  editing: boolean;
  enabled: boolean;
  onPositions: (positions: IconPositions) => void;
  onOpen: (app: AppId) => void;
}) {
  const slots = useMemo(() => layoutIcons(order, positions, bounds), [order, positions, bounds]);
  const drag = useRef<Drag | null>(null),
    skip = useRef<AppId | null>(null),
    raf = useRef(0);
  const [announcement, setAnnouncement] = useState('');
  function cancelDrag() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    if (d.moved) skip.current = d.app;
    if (d.node.hasPointerCapture(d.id)) d.node.releasePointerCapture(d.id);
    d.node.style.transform = '';
    d.node.style.zIndex = '';
    delete d.node.dataset.dragging;
  }
  useEffect(() => {
    cancelDrag();
    return cancelDrag;
  }, [bounds.w, bounds.h, editing, enabled]);
  useEffect(() => {
    const cancel = () => cancelDrag();
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
      cancelDrag();
    };
  }, []);
  function down(e: PointerEvent<HTMLButtonElement>, app: AppId) {
    if (drag.current || !enabled || !e.isPrimary || e.button !== 0) return;
    skip.current = null;
    if (e.pointerType === 'touch' && !editing) return;
    e.preventDefault();
    const node = e.currentTarget,
      board = node.parentElement!,
      rect = board.getBoundingClientRect();
    node.focus({ preventScroll: true });
    node.setPointerCapture(e.pointerId);
    drag.current = {
      app,
      id: e.pointerId,
      origin: { x: e.clientX, y: e.clientY },
      start: slots[app],
      position: slots[app],
      scale: { x: rect.width / board.clientWidth, y: rect.height / board.clientHeight },
      moved: false,
      node,
    };
  }
  function update(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return null;
    if (!d.moved && Math.hypot(e.clientX - d.origin.x, e.clientY - d.origin.y) < 6) return d;
    d.moved = true;
    d.position = dragIcon(d.start, d.origin, { x: e.clientX, y: e.clientY }, d.scale, bounds);
    return d;
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = update(e);
    if (!d?.moved) return;
    e.preventDefault();
    if (!raf.current)
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const current = drag.current;
        if (!current) return;
        current.node.style.transform = `translate3d(${current.position.x - current.start.x}px,${current.position.y - current.start.y}px,0)`;
        current.node.style.zIndex = '4';
        current.node.dataset.dragging = 'true';
      });
  }
  function end(e: PointerEvent<HTMLButtonElement>) {
    const d = update(e);
    if (!d) return;
    if (d.moved) {
      onPositions(moveIcon(order, positions, d.app, d.position, bounds));
      setAnnouncement(appLabels[d.app] + ' yeni yerine taşındı.');
    }
    cancelDrag();
  }
  return (
    <div
      className="os-icons os-arrangeable-icons"
      data-editing={editing}
      aria-label="BMK masaüstü uygulamaları"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {order.map((app) => (
        <button
          id={'os-icon-' + app}
          data-icon-app={app}
          key={app}
          className="os-desktop-icon"
          style={{
            left: slots[app].x,
            top: slots[app].y,
            width: slots[app].w,
            height: slots[app].h,
          }}
          draggable={false}
          onPointerDown={(e) => down(e, app)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
          onClick={() => {
            if (skip.current === app) {
              skip.current = null;
              return;
            }
            if (!editing && enabled) onOpen(app);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && drag.current) {
              e.preventDefault();
              e.stopPropagation();
              cancelDrag();
              return;
            }
            if (e.key === 'Enter' || e.key === ' ') skip.current = null;
            if (
              !enabled ||
              !e.altKey ||
              !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
            )
              return;
            e.preventDefault();
            const step = e.shiftKey ? 1 : 10,
              dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
              dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
            onPositions(
              moveIcon(
                order,
                positions,
                app,
                { x: slots[app].x + dx, y: slots[app].y + dy },
                bounds,
              ),
            );
            setAnnouncement(appLabels[app] + ' taşındı.');
          }}
          aria-label={appLabels[app] + (editing ? ' simgesini taşı' : ' aç')}
          title={appLabels[app] + ' · Sürükle ve bırak · Alt + yön tuşlarıyla taşı'}
        >
          <DesktopIcon app={app} />
          <span>{appLabels[app]}</span>
        </button>
      ))}
    </div>
  );
}
export default memo(DesktopGrid);
