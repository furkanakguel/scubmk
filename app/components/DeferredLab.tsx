'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const Lab = lazy(() => import('./CuriosityLab'));
export default function DeferredLab() {
  const ref = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      id={visible ? undefined : 'laboratuvar'}
      className="deferred-lab graphics-placeholder"
    >
      {visible ? (
        <Suspense fallback={<div className="lab-loading mono">BMK ATÖLYESİ / HAZIRLANIYOR</div>}>
          <Lab />
        </Suspense>
      ) : (
        <div className="lab-loading mono">BMK ATÖLYESİ</div>
      )}
    </div>
  );
}
