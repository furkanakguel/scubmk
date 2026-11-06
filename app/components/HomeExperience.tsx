'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDown } from 'lucide-react';
import { Brand } from './Brand';
import CinematicScene from './CinematicScene';
import MotionStudio, { SceneConsole, KineticMarquee } from './MotionStudio';
import DeferredLab from './DeferredLab';
import AtlasNav from './AtlasNav';
import HomePortals from './HomePortals';
import type { DesktopContent } from '../lab/public-content';
import CodeWorkshop from './CodeWorkshop';
import TerminalQuestions from './TerminalQuestions';
import { dateLabel, ClubEvent } from '../data';
import type { SiteSettings } from '../content-model';
import MemberCard from './MemberCard';
import { defaultHome, type HomeDocument, type HomeSection } from '../home/model';
import { SectionCopy, SectionTitle } from '../home/SectionCopy';
import CustomSection from '../home/CustomSection';
export default function HomeExperience({
  settings,
  initialEvents,
  desktopContent,
  document: homeDocument,
  preview = false,
}: {
  settings: SiteSettings;
  initialEvents: ClubEvent[];
  desktopContent: DesktopContent;
  document?: HomeDocument;
  preview?: boolean;
}) {
  const [filter, setFilter] = useState('Tümü');
  const events = initialEvents;
  const home = homeDocument || defaultHome(settings);
  const layoutKey = home.sections.map((s) => s.id + ':' + s.visible).join(',');
  const [sceneMode, setSceneMode] = useState(0);
  const [rootReady, setRootReady] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Enable the entrance scene only after the DOM and motion listeners are ready.
  useEffect(() => {
    setRootReady(true);
    const root = main.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('seen');
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    nodes.forEach((n) => obs.observe(n));
    const title = root.querySelector<HTMLElement>('.cinema-title'),
      bar = root.querySelector<HTMLElement>('.reading-progress'),
      line = root.querySelector<HTMLElement>('.manifesto-statement'),
      words = [...(line?.querySelectorAll<HTMLElement>('span') || [])];
    let raf = 0,
      lastHero = -1,
      lastProgress = -1,
      lastWords = -1;
    function update() {
      raf = 0;
      if (document.hidden || document.body.dataset.bmkDesktop) return;
      const y = scrollY,
        h = innerHeight,
        scrollHeight = document.documentElement.scrollHeight,
        lineTop = line?.getBoundingClientRect().top ?? 0;
      const hero = Math.min(y / h, 2),
        progress = y / Math.max(1, scrollHeight - h),
        p = document.documentElement.classList.contains('motion-quiet')
          ? 1
          : Math.min(1, Math.max(0, (h - lineTop) / (h * 0.8)));
      if (hero !== lastHero) {
        title?.style.setProperty('--bmk-scroll', String(hero));
        root!.classList.toggle('past-hero', y > h * 0.82);
        lastHero = hero;
      }
      if (Math.abs(progress - lastProgress) > 0.0001) {
        bar?.style.setProperty('--bmk-progress', String(progress));
        lastProgress = progress;
      }
      if (Math.abs(p - lastWords) > 0.002) {
        words.forEach(
          (w, i) =>
            (w.style.opacity = String(
              0.16 + 0.84 * Math.min(1, Math.max(0, (p - (i / words.length) * 0.7) * 5)),
            )),
        );
        lastWords = p;
      }
    }
    const scroll = () => {
      if (!raf && !document.hidden && !document.body.dataset.bmkDesktop)
        raf = requestAnimationFrame(update);
    };
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('resize', scroll);
    addEventListener('bmk-motion', scroll);
    update();
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      removeEventListener('scroll', scroll);
      removeEventListener('resize', scroll);
      removeEventListener('bmk-motion', scroll);
    };
  }, [layoutKey]);

  function changeMode(next: number) {
    setSceneMode(next);
    dispatchEvent(
      new CustomEvent('bmk-scene-mode', {
        detail: next === 1 ? 'explode' : next === 2 ? 'mark' : 'solid',
      }),
    );
  }
  function toggle() {
    changeMode((sceneMode + 1) % 3);
  }
  const eventSection = home.sections.find((s) => s.kind === 'events')!;
  const shown = events
    .filter((e) => !eventSection.showFilters || filter === 'Tümü' || e.category === filter)
    .slice(0, eventSection.eventCount);
  function renderSection(s: HomeSection) {
    switch (s.kind) {
      case 'hero':
        return (
          <section className="cinema-hero">
            {s.imageId && (
              <img className="home-hero-photo" src={'/api/media/' + s.imageId} alt={s.imageAlt} />
            )}
            <div className={'cinema-title ' + (s.title.length > 28 ? 'long-title' : '')}>
              <h1>
                <span className="title-line">
                  <span>
                    {s.title.split(' ').slice(0, -1).join(' ').toLocaleUpperCase('tr-TR')}
                  </span>
                </span>
                <span className="title-line accent">
                  <span>{s.title.split(' ').at(-1)?.toLocaleUpperCase('tr-TR')}</span>
                </span>
              </h1>
              <div className="title-caption">
                <span className="vertical-stroke" />
                <p>{s.text}</p>
              </div>
            </div>
            <SceneConsole mode={sceneMode} onMode={changeMode} />
            <div className="hero-bottomline">
              <a
                href={
                  '#home-section-' +
                  (home.sections.find((s) => s.visible && s.kind !== 'hero')?.id || 'hero')
                }
                className="scroll-cue"
              >
                <span className="scroll-line" />
                <span className="mono">HİKÂYEYİ KAYDIR</span>
                <ArrowDown size={15} />
              </a>
              <button
                className={'scatter-button ' + (sceneMode ? 'active' : '')}
                onClick={toggle}
                aria-label={
                  sceneMode === 1
                    ? 'Pikselleri BMK harflerine dönüştür'
                    : sceneMode === 2
                      ? 'Dinozoru geri getir'
                      : 'Dinozoru parçalarına ayır'
                }
              >
                <span className="scatter-icon">✳</span>
                <span>
                  {sceneMode === 1
                    ? 'İmzaya dönüştür.'
                    : sceneMode === 2
                      ? 'Dinozoru geri getir.'
                      : 'Biraz kurcala.'}
                  <small>
                    {sceneMode === 1
                      ? 'BMK HARFLERİNİ OLUŞTUR'
                      : sceneMode === 2
                        ? 'HER ŞEY AYNI PİKSELLERDEN.'
                        : 'PİKSELLERİ SERBEST BIRAK'}
                  </small>
                </span>
              </button>
            </div>
          </section>
        );
      case 'about':
        return (
          <section id="manifesto" className="manifesto-chapter">
            <div className="chapter-meta mono">
              <span>{s.eyebrow}</span>
            </div>
            <p className="manifesto-statement">
              {s.title.split(' ').map((w, i) => (
                <span key={i}>{w} </span>
              ))}
            </p>
            <div className="manifesto-bottom" data-reveal>
              <span className="manifesto-asterisk">✳</span>
              <p>{s.text}</p>
              {s.buttonLabel && (
                <a href={s.buttonHref} className="manifesto-join">
                  {s.buttonLabel}
                </a>
              )}
            </div>
          </section>
        );
      case 'marquee':
        return <KineticMarquee text={s.title} />;
      case 'events':
        return (
          <section id="bulusmalar" className="gatherings">
            <div className="chapter-meta mono">
              <span>{s.eyebrow}</span>
            </div>
            <div className="gatherings-heading" data-reveal>
              <h2>
                <SectionTitle text={s.title} />
              </h2>
              <div>
                <p>{s.text}</p>
              </div>
            </div>
            <div className="gatherings-toolbar">
              <span className="mono">
                YAKLAŞAN BULUŞMALAR <b>({String(shown.length).padStart(2, '0')})</b>
              </span>
              {s.showFilters && (
                <div className="exp-filters">
                  {['Tümü', 'Buluşma', 'Atölye', 'Hackathon'].map((f) => (
                    <button
                      key={f}
                      aria-pressed={filter === f}
                      className={f === filter ? 'active' : ''}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="editorial-events">
              {shown.map((e, i) => (
                <a
                  key={e.id}
                  href={'/etkinlik/' + e.id}
                  className={'editorial-event event-style-' + (i % 3)}
                >
                  <div className="editorial-art">
                    {e.image_id && (
                      <img
                        className="editorial-poster-image"
                        src={'/api/media/' + e.image_id}
                        alt={e.image_alt || e.title}
                      />
                    )}
                    <div className="art-grid" />
                    <span className="poster-id mono">
                      SCÜ BMK / {String(i + 1).padStart(3, '0')}
                    </span>
                    <span className="poster-tag mono">{e.category.toLocaleUpperCase('tr-TR')}</span>
                    {i % 3 === 0 ? (
                      <>
                        <div className="poster-orbit">
                          <i />
                          <i />
                          <i />
                          <span>✳</span>
                        </div>
                        <div className="poster-title">
                          BİR
                          <br />
                          <span>ARADA.</span>
                        </div>
                        <div className="poster-fineprint mono">
                          GÜZEL ŞEYLER
                          <br />
                          BİR KARŞILAŞMAYLA BAŞLAR.
                        </div>
                      </>
                    ) : i % 3 === 1 ? (
                      <>
                        <div className="code-sculpture">
                          <span>〈</span>
                          <span>/</span>
                          <span>〉</span>
                        </div>
                        <div className="poster-title small">
                          BİRLİKTE
                          <br />
                          <span>DENE.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pixel-monolith">
                          {Array.from({ length: 21 }, (_, j) => (
                            <i key={j} />
                          ))}
                        </div>
                        <div className="poster-title small">
                          EKİBİNİ
                          <br />
                          <span>BUL.</span>
                        </div>
                      </>
                    )}
                    <div className="poster-bottom mono">
                      <span>{dateLabel(e.date)}</span>
                      <span>{e.registration_open ? 'BAŞVURU AÇIK' : 'BAŞVURU KAPALI'}</span>
                    </div>
                    <span className="event-detail-label">Etkinliği incele</span>
                  </div>
                  <div className="editorial-event-info">
                    <span className="event-info-number mono">
                      /{String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{e.title}</h3>
                      <p>{e.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {!shown.length && (
              <p className="empty">Bu kategorinin yeni buluşmasını yakında burada paylaşacağız.</p>
            )}
            {s.buttonLabel && (
              <a className="home-all-events" href={s.buttonHref}>
                {s.buttonLabel}
              </a>
            )}
          </section>
        );
      case 'lab':
        return <DeferredLab />;
      case 'desktop':
        return <CodeWorkshop content={desktopContent} />;
      case 'portals':
        return <HomePortals />;
      case 'membership':
        return (
          <section className="home-membership">
            <div data-reveal>
              <span className="mono">{s.eyebrow}</span>
              <h2>
                <SectionTitle text={s.title} />
              </h2>
              <p>{s.text}</p>
              {s.buttonLabel && (
                <a className="exp-solid-button" href={s.buttonHref}>
                  {s.buttonLabel}
                </a>
              )}
              <a className="pass-existing" href="/giris">
                Zaten üyeyim
              </a>
            </div>
            <a
              href="/kartlar"
              className="home-card-spread"
              aria-label="Dijital üyelik kartlarını keşfet"
            >
              <div>
                <MemberCard
                  style="copper"
                  data={{
                    name: 'Adın Soyadın',
                    number: 'BMK-26-XXXXXXXX',
                    role: 'member',
                    issued: 2026,
                    sample: true,
                  }}
                />
              </div>
              <div>
                <MemberCard
                  style="forest"
                  data={{
                    name: 'Adın Soyadın',
                    number: 'BMK-26-XXXXXXXX',
                    role: 'member',
                    issued: 2026,
                    sample: true,
                  }}
                />
              </div>
            </a>
          </section>
        );
      case 'faq':
        return <TerminalQuestions instagram={settings.instagram} />;
      case 'join':
        return (
          <section className="last-call">
            <div className="last-call-top mono">
              <span>{s.eyebrow}</span>
              <span>BU HİKÂYEDE SANA DA YER VAR.</span>
            </div>
            <a href={s.buttonHref || '/uye-ol'} aria-label={s.buttonLabel || s.title}>
              <span>
                <SectionTitle text={s.title} />
              </span>
              <span className="last-call-arrow">
                <ArrowUpRight />
              </span>
            </a>
            <div className="last-call-bottom">
              <span>{s.text}</span>
              <span className="mono">KAMPÜSTE GÖRÜŞÜRÜZ.</span>
            </div>
          </section>
        );
      default:
        return <CustomSection section={s} />;
    }
  }
  return (
    <div id="top" ref={main} className={'experience ' + (rootReady ? 'is-ready' : '')}>
      <a className="skip" href="#home-content">
        İçeriğe geç
      </a>
      <div className="reading-progress" />
      <CinematicScene />
      {!preview && <MotionStudio />}
      <AtlasNav eventsVisible={home.sections.some((s) => s.kind === 'events' && s.visible)} />
      {home.announcement && <div className="home-announcement">{home.announcement}</div>}
      <main id="home-content">
        {home.sections
          .filter((s) => s.visible)
          .map((s) => (
            <div
              key={s.id}
              id={'home-section-' + s.id}
              className="home-section"
              data-home-section={s.id}
              data-home-label={s.label}
            >
              <SectionCopy.Provider value={s}>{renderSection(s)}</SectionCopy.Provider>
            </div>
          ))}
      </main>
      <footer className="exp-footer">
        <div className="footer-top">
          <Brand light />
          <p>
            Sivas Cumhuriyet Üniversitesi
            <br />
            Bilgisayar Mühendisliği Kulübü
          </p>
          <div>
            <a href={settings.instagram} target="_blank" rel="noreferrer">
              Instagram <ArrowUpRight size={16} />
            </a>
            <a href="/admin">Yönetim</a>
            <a href="/bilet">Biletim</a>
            <a href="/kartim">Üyelik kartım</a>
          </div>
        </div>
        <div className="footer-word" aria-hidden="true">
          BMK
        </div>
        <div className="footer-bottom mono">
          <span>© {new Date().getFullYear()} SCÜ BMK</span>
          <span>SİVAS CUMHURİYET ÜNİVERSİTESİ</span>
          <a href="#top">BAŞA DÖN ↑</a>
        </div>
      </footer>
    </div>
  );
}
