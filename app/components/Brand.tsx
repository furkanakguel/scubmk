export function Brand({ light = false }: { light?: boolean }) {
  return (
    <a href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="SCÜ BMK ana sayfa">
      <span className="brand-mark">
        <img src="/assets/bmk-logo-web.webp" alt="BMK dinozor logosu" />
      </span>
      <span className="brand-type">
        SCÜ<span>BMK</span>
        <small>BİLGİSAYAR MÜHENDİSLİĞİ KULÜBÜ</small>
      </span>
    </a>
  );
}
