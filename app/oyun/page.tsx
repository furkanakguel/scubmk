import WorldShell from '../components/WorldShell';
import BmkRunner from '../components/BmkRunner';
import { THEMES } from '../game/themes';
export const metadata = {
  title: 'BMK Run — Yerden Gökyüzüne · SCÜ BMK',
  description:
    'Sekiz dünya, değişken parkurlar, jetpack ve kuş uçuşu. BMK Run’da hızlanan sonsuz yolun günlük rekorunu kır.',
};
function MapArt({ index }: { index: number }) {
  const t = THEMES[index];
  return (
    <svg viewBox="0 0 200 100" aria-hidden="true">
      <rect width="200" height="100" fill={t.sky[1]} />
      <circle cx="155" cy="25" r="13" fill={t.edge} opacity=".7" />
      {index === 0 ? (
        <g fill={t.ridges[0]}>
          {[15, 45, 80, 115, 158].map((x, i) => (
            <rect key={x} x={x} y={40 + (i % 3) * 10} width="20" height="60" />
          ))}
        </g>
      ) : index === 2 ? (
        <g fill={t.ridges[0]}>
          {[0, 38, 80, 123, 165].map((x) => (
            <path key={x} d={`M${x} 90l22-65 22 65z`} />
          ))}
        </g>
      ) : index === 7 ? (
        <g fill={t.ridges[0]}>
          <path d="M10 55h65L44 90zM110 70h75l-40 27z" />
          <ellipse cx="52" cy="40" rx="34" ry="10" fill={t.edge} opacity=".4" />
        </g>
      ) : index === 5 ? (
        <g stroke={t.ridges[0]} strokeWidth="8" fill="none">
          <path d="M30 100V58a25 25 0 0 1 50 0v42M130 100V70a25 25 0 0 1 50 0v30" />
        </g>
      ) : (
        <path d="M0 100V72l30-20 20 12 45-52 30 4 35 48 40-15v51z" fill={t.ridges[0]} />
      )}
      <path d="M0 100V85l35-10 45 8 35-7 45 13 40-6v17z" fill={t.ground} />
      {index === 4 && (
        <path d="M98 22l12 18-13 12 24 24" stroke={t.edge} strokeWidth="3" fill="none" />
      )}
      {index === 3 && <path d="M95 12L70 42l19-6 12 9 10-15 14-14z" fill={t.edge} opacity=".65" />}
      {index === 6 && <path d="M0 62h52m15 7h63m-114 7h70m64-17h50" stroke={t.edge} opacity=".4" />}
    </svg>
  );
}
export default function Game() {
  return (
    <WorldShell className="run-world">
      <main id="icerik" className="run-page">
        <header className="run-page-heading">
          <div>
            <span className="run-edition">
              BMK ARCADE <i /> VOL. 02
            </span>
            <h1>
              BMK RUN<span>YERDEN GÖKYÜZÜNE</span>
            </h1>
          </div>
          <div className="run-heading-note">
            <span>01 — ∞</span>
            <p>
              Yol değişir.
              <br />
              Reflekslerin kalır.
            </p>
          </div>
        </header>
        <BmkRunner />
        <section className="run-atlas" aria-labelledby="run-atlas-title">
          <div className="run-section-heading">
            <div>
              <span>PARKUR ATLASI</span>
              <h2 id="run-atlas-title">Tek bir yola alışma.</h2>
            </div>
            <p>
              Her 22 saniyede seviye yükselir.
              <br />
              Dünyalar yavaşça değişir; sıraları her koşuda yenilenir.
            </p>
          </div>
          <div className="run-map-grid">
            {THEMES.map((t, i) => (
              <article key={t.name}>
                <MapArt index={i} />
                <div>
                  <span>{t.tag}</span>
                  <h3>{t.name}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="run-guide" aria-label="Nasıl oynanır">
          <div>
            <span>01 / YERDE</span>
            <h2>Bir adım önden düşün.</h2>
            <p>
              Kısa ve uzun zıplamayı kullan. Testereleri, kütükleri ve dikenleri aş; lazerlerin ve
              preslerin altından kay. Hız 5 katın üzerine kadar çıkar.
            </p>
          </div>
          <div>
            <span>02 / HAVADA</span>
            <h2>Kanatlar sende.</h2>
            <p>
              Bir kuş seni kaptığında yukarıyı basılı tutarak yüksel, aşağıyla alçal. Sürüleri,
              mayınları ve fırtınaları geç. Kuş bırakınca koşuya devam et.
            </p>
          </div>
          <div>
            <span>03 / REKORDA</span>
            <h2>Riskini kendin seç.</h2>
            <p>
              24 altın yıldız bir kalkan eder. Elmaslar puan getirir ama her biri güvenli değildir.
              Süre sınırı yok; koşu sonunda ismini günlük tabloya yaz.
            </p>
          </div>
        </section>
      </main>
    </WorldShell>
  );
}
