import AtlasNav from './AtlasNav';
export default function WorldShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={'club-site ' + className}>
      <a className="skip" href="#icerik">
        İçeriğe geç
      </a>
      <AtlasNav />
      {children}
      <footer className="club-footer">
        <div>
          <a href="/" className="footer-wordmark">
            SCÜ BMK
          </a>
          <p>
            Sivas Cumhuriyet Üniversitesi
            <br />
            Bilgisayar Mühendisliği Kulübü
          </p>
        </div>
        <div className="footer-links">
          <a href="/etkinlikler">Etkinlikler</a>
          <a href="/ekip">Ekibimiz</a>
          <a href="/oyun">BMK Run</a>
          <a href="/kartlar">Dijital kartlar</a>
          <a href="/kartim">Üyelik kartım</a>
          <a href="https://www.instagram.com/cumhuriyetbmk/" target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
          <a href="/admin">Yönetim</a>
        </div>
        <div className="footer-line">
          <span>Sivas, Türkiye</span>
          <span>Bilgisayar başında. Kampüste. Birlikte.</span>
          <a href="#">Yukarı ↑</a>
        </div>
      </footer>
    </div>
  );
}
