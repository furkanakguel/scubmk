'use client';
import type { HomeSection } from './model';
import { SectionTitle } from './SectionCopy';
export default function CustomSection({ section: s }: { section: HomeSection }) {
  return (
    <section
      className={`home-custom home-custom-${s.kind} tone-${s.tone} align-${s.align} space-${s.spacing} image-${s.imageSide}`}
    >
      {s.kind === 'story' && s.imageId && (
        <figure>
          <img src={'/api/media/' + s.imageId} alt={s.imageAlt} loading="lazy" />
        </figure>
      )}
      <div className="home-custom-copy">
        {s.eyebrow && <span className="mono">{s.eyebrow}</span>}
        <h2>
          <SectionTitle text={s.title} />
        </h2>
        {s.text && <p>{s.text}</p>}
        {s.buttonLabel && s.buttonHref && (
          <a className="home-custom-button" href={s.buttonHref}>
            {s.buttonLabel}
          </a>
        )}
      </div>
      {s.kind === 'links' && (
        <div className="home-link-cards">
          {s.items.map((i, n) => (
            <a href={i.href || undefined} key={n}>
              <span className="mono">0{n + 1}</span>
              <h3>{i.title}</h3>
              <p>{i.text}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
