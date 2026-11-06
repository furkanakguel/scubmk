'use client';
import { useSectionCopy, SectionTitle } from '../home/SectionCopy';
export default function HomePortals() {
  const copy = useSectionCopy();
  return (
    <section className="home-portals">
      <div className="portal-heading">
        <span className="mono">{copy?.eyebrow ?? 'AYNI MERAK. BAŞKA DÜNYALAR.'}</span>
        <h2>
          {copy ? (
            <SectionTitle text={copy.title} />
          ) : (
            <>
              KODUN
              <br />
              DIŞINA <em>ÇIK.</em>
            </>
          )}
        </h2>
      </div>
      <div className="portal-pair">
        <a href="/ekip" className="world-portal people-portal">
          <div className="portal-meta mono">
            <span>EKİBİMİZ</span>
            <span>EKİBİ TANI</span>
          </div>
          <div className="portal-people-art" aria-hidden="true">
            <i>✳</i>
            <i>◎</i>
            <i>⌘</i>
          </div>
          <div className="portal-description">
            <h3>
              İyi ki
              <br />
              <em>bir aradayız.</em>
            </h3>
          </div>
          <p>
            Fikirlerin arkasında insanlar var.
            <br />
            BMK’nin ekibini keşfet.
          </p>
        </a>
        <a href="/oyun" className="world-portal game-portal">
          <div className="portal-meta mono">
            <span>BMK RUN</span>
            <span>OYUNA BAŞLA</span>
          </div>
          <div className="portal-game-art" aria-hidden="true">
            <div className="portal-game-orbit" />
            <svg viewBox="0 0 19 19">
              <path
                fill="currentColor"
                d="M9 0h8v1h1v4h-5v1h3v1h-3v2h2v3h-1v-2h-1v4h-2v2h-1v2h2v1H9v-3H7v2h1v1H5v-4H4v-1H3v-1H2v-2H1V9H0V5h1v2h1v1h1v1h2V8h1V7h1V6h1V1h1z"
              />
              <path fill="#15251b" d="M11 2h1v1h-1z" />
            </svg>
            <div className="portal-game-track" />
          </div>
          <div className="portal-description">
            <h3>
              Biraz da
              <br />
              <em>rekor yaz.</em>
            </h3>
          </div>
          <p>
            BMK’ye özel bir dinozor. Sonsuz bir parkur.
            <br />
            Bir mola için iyi bir bahane.
          </p>
        </a>
      </div>
    </section>
  );
}
