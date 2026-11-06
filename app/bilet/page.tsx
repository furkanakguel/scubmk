'use client';
import { useEffect, useRef, useState } from 'react';
import { createTicketQr } from './ticket-qr';
import DinoMark from '../components/DinoMark';
import './ticket.css';
import {
  ArrowLeft,
  Download,
  Link,
  Check,
  Share2,
  Ticket,
  Printer,
  CalendarDays,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Brand } from '../components/Brand';
import { ticketDate } from './ticket-format';
import { copyText } from '../components/copy-text';
import { createTicketImage } from './ticket-image';
type Saved = { token: string; title: string; date: number };
type T = {
  id: string;
  title: string;
  date: string;
  location: string;
  name: string;
  demo: number;
  checkedInAt: number | null;
};
export default function Tickets() {
  const [ticket, setTicket] = useState<T | null>(null);
  const [access, setAccess] = useState('');
  const [qr, setQr] = useState('');
  const [saved, setSaved] = useState<Saved[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  function notify(t: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  }
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      requestId.current++;
    },
    [],
  );
  useEffect(() => {
    if (!ticket || !qr) return;
    let disposed = false,
      url = '';
    setImageError(false);
    createTicketImage(ticket, qr)
      .then((blob) => {
        if (disposed) return;
        url = URL.createObjectURL(blob);
        setImageUrl(url);
        setImageFile(new File([blob], 'SCU-BMK-bilet.png', { type: 'image/png' }));
      })
      .catch(() => {
        if (!disposed) setImageError(true);
      });
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ticket, qr]);
  async function load(token: string) {
    const current = ++requestId.current;
    setImageUrl('');
    setImageFile(null);
    setImageError(false);
    setManualCopy(false);
    setError('');
    setLoading(true);
    setTicket(null);
    setQr('');
    try {
      const r = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = (await r.json()) as { error?: string; ticket: T; checkin: string };
      if (current !== requestId.current) return;
      if (!r.ok) throw Error(d.error);
      if (!/^[a-f0-9]{48}$/.test(d.checkin))
        throw Error('Bilet QR kodu hazırlanamadı. Lütfen tekrar dene.');
      const qrUrl = await createTicketQr(location.origin + '/admin?scan=' + d.checkin);
      if (current !== requestId.current) return;
      setQr(qrUrl);
      setTicket(d.ticket);
      setAccess(token);
    } catch (e) {
      if (current === requestId.current)
        setError(e instanceof Error ? e.message : 'Bilet yüklenemedi.');
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore device-local ticket links after hydration; never read localStorage during SSR.
  useEffect(() => {
    try {
      const items = JSON.parse(localStorage.getItem('bmk-tickets') || '[]');
      if (Array.isArray(items))
        setSaved(
          items
            .filter(
              (s) =>
                s &&
                /^[a-f0-9]{48}$/.test(s.token) &&
                typeof s.title === 'string' &&
                Number.isFinite(s.date),
            )
            .slice(-30),
        );
    } catch {}
    const update = () => {
      const token = location.hash.slice(1);
      if (token) load(token);
      else {
        requestId.current++;
        setTicket(null);
        setQr('');
        setLoading(false);
        setError('');
      }
    };
    update();
    addEventListener('hashchange', update);
    return () => removeEventListener('hashchange', update);
  }, []);
  async function copy() {
    const ok = await copyText(location.origin + '/bilet#' + access);
    if (ok) {
      setManualCopy(false);
      notify('Özel bilet bağlantın kopyalandı.');
    } else {
      setManualCopy(true);
      notify(
        'Tarayıcı panoya izin vermedi. Aşağıdaki seçili bağlantıya basılı tutup Kopyala’ya dokun.',
      );
    }
  }
  async function share() {
    if (sharing) return;
    if (!navigator.share) {
      await copy();
      return;
    }
    setSharing(true);
    try {
      const url = location.origin + '/bilet#' + access;
      if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
        await navigator.share({ title: 'SCÜ BMK biletim', files: [imageFile] });
      } else {
        await navigator.share({ title: 'SCÜ BMK biletim', url });
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        notify('Paylaşım açılamadı. Bileti indirebilir veya bağlantısını kopyalayabilirsin.');
      }
    } finally {
      setSharing(false);
    }
  }
  return (
    <>
      <header className="app-header">
        <Brand />
        <a href="/">
          <ArrowLeft size={16} /> Ana sayfa
        </a>
      </header>
      <main className="ticket-page ticket-edition">
        {loading ? (
          <div className="ticket-loading" role="status">
            <Ticket size={32} />
            <h1>Biletin hazırlanıyor.</h1>
            <p>Birazdan burada.</p>
          </div>
        ) : ticket ? (
          <>
            <div className="ticket-welcome">
              <span className="ticket-kicker">SCÜ BMK · BULUŞMALAR</span>
              <h1>
                {ticket.checkedInAt
                  ? 'İyi ki geldin.'
                  : ticket.demo
                    ? 'Deneme biletin hazır.'
                    : 'Yerini ayırdık.'}
              </h1>
              <p>
                {ticket.checkedInAt
                  ? 'Bu biletin giriş kaydı tamamlandı.'
                  : 'Girişte aşağıdaki QR kodunu göstermen yeterli.'}
              </p>
            </div>
            <article className="admission-ticket" aria-label="SCÜ BMK etkinlik bileti">
              <section className="admission-main">
                <div className="admission-brand">
                  <span>
                    <DinoMark />
                    SCÜ BMK
                  </span>
                  <span>ETKİNLİK BİLETİ</span>
                </div>
                <div className="admission-title">
                  <span>BİRLİKTE, AYNI YERDE.</span>
                  <h2>{ticket.title}</h2>
                </div>
                <dl className="admission-details">
                  <div>
                    <dt>
                      <CalendarDays size={15} />
                      Tarih ve saat
                    </dt>
                    <dd>{ticketDate(ticket.date)}</dd>
                  </div>
                  <div>
                    <dt>
                      <MapPin size={15} />
                      Buluşma yeri
                    </dt>
                    <dd>{ticket.location}</dd>
                  </div>
                </dl>
                <div className="admission-holder">
                  <div>
                    <span>KATILIMCI</span>
                    <strong>{ticket.name}</strong>
                  </div>
                  <span className="admission-dino">
                    <DinoMark />
                  </span>
                </div>
                <div className="admission-fineprint">
                  <span>Sivas Cumhuriyet Üniversitesi</span>
                  <span>Bilgisayar Mühendisliği Kulübü</span>
                </div>
              </section>
              <section className="admission-stub" aria-label="Giriş kodu">
                <div className={'admission-status' + (ticket.checkedInAt ? ' is-used' : '')}>
                  <Check size={14} />
                  {ticket.checkedInAt
                    ? 'Giriş yapıldı'
                    : ticket.demo
                      ? 'Deneme bileti'
                      : 'Girişe hazır'}
                </div>
                {qr && (
                  <img
                    className="admission-qr"
                    src={qr}
                    width="276"
                    height="276"
                    alt="Ortasında BMK dinozoru bulunan kişisel giriş QR kodun"
                  />
                )}
                <strong>Kapıda görüşürüz.</strong>
                <p>
                  QR kodunu görevliye göster.
                  <br />
                  Her bilet tek giriş için geçerli.
                </p>
                <div className="admission-serial">
                  <span>BİLET NO</span>
                  <b>BMK–{ticket.id.slice(0, 8).toUpperCase()}</b>
                </div>
              </section>
            </article>
            <div className="ticket-actions">
              {imageUrl ? (
                <a
                  className="btn btn-dark"
                  href={imageUrl}
                  download="SCU-BMK-bilet.png"
                  onClick={() => notify('Bilet görselinin indirilmesi başlatıldı.')}
                >
                  <Download size={16} /> Bileti indir
                </a>
              ) : (
                <button className="btn btn-dark" disabled>
                  <Download size={16} />
                  {imageError ? 'Görsel hazırlanamadı' : 'Bilet hazırlanıyor…'}
                </button>
              )}
              <button className="btn btn-outline" onClick={copy}>
                <Link size={16} /> Bağlantıyı kopyala
              </button>
              <button className="btn btn-outline" onClick={share} disabled={sharing}>
                <Share2 size={16} /> Paylaş
              </button>
              <button className="btn btn-outline" onClick={() => window.print()}>
                <Printer size={16} /> Yazdır
              </button>
            </div>
            {manualCopy && (
              <div className="notice" role="group" aria-label="Bilet bağlantısını elle kopyala">
                <label className="field">
                  Özel bilet bağlantın
                  <input
                    readOnly
                    value={
                      typeof location !== 'undefined' ? location.origin + '/bilet#' + access : ''
                    }
                    ref={(el) => {
                      if (el) {
                        el.focus();
                        el.select();
                      }
                    }}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </label>
                <p>Seçili bağlantıya basılı tutup Kopyala’ya dokun.</p>
                <button className="btn btn-outline" onClick={() => setManualCopy(false)}>
                  Kapat
                </button>
              </div>
            )}
            {imageError && (
              <div className="notice">
                Bilet görseli hazırlanamadı. QR’nin ekran görüntüsünü alabilir veya Yazdır
                seçeneğini kullanabilirsin.
              </div>
            )}
            <div className="ticket-keep">
              <ShieldCheck size={22} />
              <div>
                <strong>Biletin hep yanında olsun.</strong>
                <p>
                  Görselini telefonuna indir; internet olmasa da kapıda gösterebilirsin. Biletin ve
                  özel bağlantın sana ait, başkalarıyla paylaşma.
                </p>
              </div>
            </div>
            {ticket.demo && (
              <p className="sample-note">
                Bu bilet, deneme akışını göstermek içindir. Resmî etkinliğe katılım hakkı sağlamaz.
              </p>
            )}
            <a href="/bilet" className="underlink ticket-back">
              Kayıtlı biletlerime dön
            </a>
          </>
        ) : (
          <>
            <span className="eyebrow">SCÜ BMK / BİLETLERİM</span>
            <h1 style={{ marginTop: 20 }}>Biletlerim</h1>
            <p>
              Bu tarayıcıda kaydettiğin son biletler burada. Başka bir cihaz için özel bilet
              bağlantını kullanabilirsin.
            </p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {saved.length ? (
              saved.map((s) => (
                <a className="recent-ticket" href={'#' + s.token} key={s.token}>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{new Date(s.date).toLocaleDateString('tr-TR')} tarihinde oluşturuldu</p>
                  </div>
                </a>
              ))
            ) : (
              <div className="form-panel empty">
                <Ticket size={32} style={{ marginBottom: 15 }} />
                <p>Bu tarayıcıda henüz kayıtlı bilet yok.</p>
                <a href="/#bulusmalar" className="underlink">
                  Etkinlikleri keşfet
                </a>
              </div>
            )}
            <form
              className="ticket-recovery"
              onSubmit={(e) => {
                e.preventDefault();
                const raw = String(new FormData(e.currentTarget).get('link') || '').trim();
                const token = raw.includes('#') ? raw.split('#').pop()! : raw;
                if (/^[a-f0-9]{48}$/.test(token)) {
                  if (location.hash.slice(1) === token) load(token);
                  else location.hash = token;
                } else setError('Geçerli bilet bağlantını veya 48 karakterli erişim kodunu gir.');
              }}
            >
              <h2>Bilet bağlantısıyla aç</h2>
              <p>
                Kayıt sonunda aldığın bağlantıyı buraya yapıştır. Tarayıcı verileri silinirse bu
                listedeki biletler kaybolabilir; indirdiğin görsel ve kaydettiğin bağlantı
                kullanılmaya devam eder.
              </p>
              <label className="field">
                Özel bilet bağlantısı veya erişim kodu
                <input
                  name="link"
                  placeholder="Bilet bağlantını yapıştır"
                  required
                  autoComplete="off"
                />
              </label>
              <button className="btn btn-dark">Biletimi aç</button>
            </form>
          </>
        )}
      </main>
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
    </>
  );
}
