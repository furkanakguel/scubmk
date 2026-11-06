'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Users, ShieldCheck, Ticket } from 'lucide-react';
import { Brand } from '../components/Brand';
import { membership, ClubEvent, dateLabel } from '../data';
export default function Apply() {
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [interest, setInterest] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize the form from browser URL values after hydration.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const id = q.get('event') || 'membership';
    setInterest(q.get('interest') || '');
    fetch('/api/events')
      .then(async (r) => {
        if (!r.ok) throw Error('Başvuru bilgileri yüklenemedi.');
        return r.json() as Promise<{ events: ClubEvent[]; membershipOpen: boolean }>;
      })
      .then((d) =>
        setEvent(
          id === 'membership'
            ? d.membershipOpen
              ? membership
              : null
            : d.events.find(
                (e) =>
                  e.id === id &&
                  e.registration_open === 1 &&
                  new Date(e.date).getTime() > Date.now(),
              ) || null,
        ),
      )
      .catch(() => setError('Etkinlik yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event?.id,
          name: form.get('name'),
          email: form.get('email'),
          department: form.get('department'),
          year: form.get('year'),
          answer: form.get('answer') || '',
          consent: form.get('consent') === 'on',
          website: form.get('website') || '',
        }),
      });
      const d = (await r.json()) as { error?: string; token: string; title: string };
      if (!r.ok) throw Error(d.error);
      try {
        const saved = JSON.parse(localStorage.getItem('bmk-tickets') || '[]');
        localStorage.setItem(
          'bmk-tickets',
          JSON.stringify(
            [{ token: d.token, title: d.title, date: Date.now() }, ...saved].slice(0, 20),
          ),
        );
      } catch {}
      location.href = '/bilet#' + d.token;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu.');
      setBusy(false);
    }
  }
  return (
    <>
      <header className="app-header">
        <Brand />
        <a href="/#bulusmalar">
          <ArrowLeft size={16} /> Etkinliklere dön
        </a>
      </header>
      {loading ? (
        <div className="empty">Etkinlik yükleniyor…</div>
      ) : !event ? (
        <div className="empty">
          Şu anda bu başvuru açık değil. <a href="/">Ana sayfaya dön.</a>
        </div>
      ) : (
        <main className="flow-layout">
          <div className="flow-intro">
            <span className="eyebrow">SCÜ BMK / {event.category.toLocaleUpperCase('tr-TR')}</span>
            <h1>{event.title}</h1>
            <p>{event.description}</p>
            <div className="flow-details">
              {event.date && (
                <div>
                  <CalendarDays />
                  {dateLabel(event.date)} ·{' '}
                  {new Date(event.date).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Istanbul',
                  })}
                </div>
              )}
              <div>
                <MapPin />
                {event.location}
              </div>
              <div>
                <Users />
                {event.id === 'membership'
                  ? 'Kulüp üyelik başvurusu'
                  : event.capacity + ' kişilik kontenjan'}
              </div>
              <div>
                <Ticket />
                Kayıt sonunda kişisel QR bilet.
              </div>
            </div>
            <div className="flow-note">
              <ShieldCheck size={17} style={{ verticalAlign: 'middle', marginRight: 7 }} />
              Hesap oluşturman gerekmiyor. Bilet bağlantını sakla, görselini indir, etkinlik günü QR
              kodunu göster.
            </div>
            {event.demo && (
              <div className="notice">
                <strong>Tasarım önizlemesi</strong>
                <br />
                Bu form deneme kaydı oluşturur; resmî etkinlik veya üyelik başvurusu değildir.
                Lütfen örnek bilgiler kullan.
              </div>
            )}
          </div>
          <form className="form-panel" onSubmit={submit}>
            <div className="form-step mono">
              <span>01 / SENİ TANIYALIM</span>
              <span>02 / BİLETİN HAZIR</span>
            </div>
            <h2>Başvuru bilgilerin</h2>
            <p>Biletini oluşturmak için aşağıdaki alanları doldur.</p>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <label className="field">
              Ad soyad{' '}
              <input
                name="name"
                autoComplete="name"
                placeholder="Adın ve soyadın"
                required
                minLength={3}
                maxLength={100}
              />
            </label>
            <label className="field">
              E-posta adresi{' '}
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ornek@universite.edu.tr"
                required
                maxLength={180}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Bölümün{' '}
                <input
                  name="department"
                  placeholder="Bilgisayar Mühendisliği"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <label className="field">
                Sınıfın{' '}
                <select name="year" defaultValue="" required>
                  <option value="" disabled>
                    Seçimini yap
                  </option>
                  {[
                    'Hazırlık',
                    '1. sınıf',
                    '2. sınıf',
                    '3. sınıf',
                    '4. sınıf',
                    'Mezun',
                    'Diğer',
                  ].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
            </div>
            {event.question && (
              <label className="field">
                {event.question} <span style={{ color: '#89937d' }}>İsteğe bağlı</span>
                <textarea
                  name="answer"
                  maxLength={1500}
                  placeholder="Kısaca kendinden bahsedebilirsin…"
                  defaultValue={interest}
                />
              </label>
            )}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <label>
                Web siten
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="consent">
              <input type="checkbox" name="consent" required />
              <span>
                {event.demo
                  ? 'Deneme bilgilerimin bu önizlemenin veritabanına kaydedilmesini kabul ediyorum.'
                  : 'Bilgilerimin bu başvuruyu ve etkinlik girişini yönetmek amacıyla kaydedilmesini kabul ediyorum.'}{' '}
                Adım, e-posta adresim ve form yanıtlarım yalnızca yetkili yönetimde görünür.
              </span>
            </label>
            <button className="btn btn-dark form-submit" disabled={busy}>
              {busy
                ? 'Biletin hazırlanıyor…'
                : event.demo
                  ? 'Deneme biletimi oluştur'
                  : 'Başvur ve biletimi oluştur'}
            </button>
            <p className="flow-footer">
              Biletini kayıt sonrasında indirebilir veya bağlantısını saklayabilirsin.
            </p>
          </form>
        </main>
      )}
    </>
  );
}
