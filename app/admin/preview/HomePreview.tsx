'use client';
import { useEffect, useRef, useState } from 'react';
import HomeExperience from '../../components/HomeExperience';
import { homeDocumentSchema, type HomeDocument } from '../../home/model';
import type { SiteSettings } from '../../content-model';
import type { ClubEvent } from '../../data';
import type { DesktopContent } from '../../lab/public-content';
export default function HomePreview({
  settings,
  initialDocument,
  events,
  desktopContent,
}: {
  settings: SiteSettings;
  initialDocument: HomeDocument;
  events: ClubEvent[];
  desktopContent: DesktopContent;
}) {
  const [documentValue, setDocument] = useState(initialDocument),
    [selected, setSelected] = useState('hero'),
    [interactive, setInteractive] = useState(false),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState('');
  const channel = useRef(''),
    container = useRef<HTMLDivElement>(null),
    lastFocus = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    channel.current = new URLSearchParams(location.search).get('channel') || '';
    if (!/^[a-f0-9-]{36}$/.test(channel.current) || parent === window) return;
    const message = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== parent ||
        event.data?.channel !== channel.current ||
        event.data?.type !== 'bmk-home-update'
      )
        return;
      const parsed = homeDocumentSchema.safeParse(event.data.document);
      if (!parsed.success) return;
      setDocument((previous) => ({
        ...parsed.data,
        sections: parsed.data.sections.map((section) => {
          const old = previous.sections.find((s) => s.id === section.id);
          return old && JSON.stringify(old) === JSON.stringify(section) ? old : section;
        }),
      }));
      setSelected(typeof event.data.selected === 'string' ? event.data.selected : '');
      setInteractive(event.data.interactive === true);
      setReady(true);
      if (Number.isSafeInteger(event.data.focus) && event.data.focus !== lastFocus.current) {
        lastFocus.current = event.data.focus;
        requestAnimationFrame(() => {
          const node = Array.from(
            container.current?.querySelectorAll<HTMLElement>('[data-home-section]') || [],
          ).find((n) => n.dataset.homeSection === event.data.selected);
          node?.scrollIntoView({ behavior: 'instant', block: 'start' });
        });
      }
    };
    addEventListener('message', message);
    parent.postMessage({ type: 'bmk-home-ready', channel: channel.current }, location.origin);
    return () => {
      removeEventListener('message', message);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    container.current
      ?.querySelectorAll<HTMLElement>('[data-home-section]')
      .forEach(
        (n) =>
          (n.dataset.homeSelected = String(!interactive && n.dataset.homeSection === selected)),
      );
  }, [selected, interactive, documentValue]);
  useEffect(() => {
    document.documentElement.classList.toggle('motion-quiet', !interactive);
    dispatchEvent(new Event('bmk-motion'));
    dispatchEvent(new CustomEvent('bmk-scene-settings', { detail: { reduced: !interactive } }));
    return () => document.documentElement.classList.remove('motion-quiet');
  }, [interactive]);
  function note() {
    setNotice('Bu bağlantıyı canlı sitede açabilirsin. Önizlemede sayfadan ayrılmıyoruz.');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 2600);
  }
  return (
    <div
      ref={container}
      className={'home-preview ' + (!interactive ? 'home-preview-static' : '')}
      onSubmitCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        note();
      }}
      onClickCapture={(e) => {
        const target = e.target as HTMLElement,
          section = target.closest<HTMLElement>('[data-home-section]');
        if (!interactive) {
          e.preventDefault();
          e.stopPropagation();
          if (section)
            parent.postMessage(
              {
                type: 'bmk-home-select',
                channel: channel.current,
                id: section.dataset.homeSection,
              },
              location.origin,
            );
        } else if (target.closest('a')) {
          e.preventDefault();
          e.stopPropagation();
          note();
        }
      }}
    >
      {ready ? (
        <HomeExperience
          settings={settings}
          initialEvents={events}
          desktopContent={desktopContent}
          document={documentValue}
          preview
        />
      ) : (
        <div className="a-loading">Düzenleyiciyle bağlantı kuruluyor…</div>
      )}
      {notice && (
        <div className="home-editor-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
