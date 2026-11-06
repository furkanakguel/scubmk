'use client';
import { useEffect, useState } from 'react';
import { Download, LogOut, Check, Copy, Settings, ArrowLeft } from 'lucide-react';
import MemberCard, {
  CardPresentation,
  downloadMemberCard,
  MemberQR,
} from '../components/MemberCard';
import type { CardSide } from '../components/card-art';
import {
  effectiveStyle,
  regularStyles,
  cardDesigns,
  clubRoles,
  type ClubAccount,
} from '../membership-model';
export default function MyCard({ initial }: { initial: ClubAccount }) {
  const [user, setUser] = useState(initial),
    [origin, setOrigin] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [settings, setSettings] = useState(false),
    [qrOpen, setQrOpen] = useState(false),
    [side, setSide] = useState<CardSide>('front');
  async function refresh() {
    const r = await fetch('/api/member');
    if (!r.ok) throw Error('Hesap bilgilerin yenilenemedi.');
    const d = (await r.json()) as { user: ClubAccount | null };
    if (!d.user) {
      location.assign('/giris');
      return;
    }
    setUser(d.user);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Use the browser origin for downloadable card links only after hydration.
  useEffect(() => {
    setOrigin(location.origin);
    const focus = () => refresh().catch(() => {});
    addEventListener('focus', focus);
    return () => removeEventListener('focus', focus);
  }, []);
  async function action(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        d = (await r.json()) as { error?: string };
      if (r.status === 401) location.assign('/giris');
      if (!r.ok) throw Error(d.error);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const style = effectiveStyle(user),
    link = origin + '/kart/dogrula/' + user.card_code,
    data = {
      name: user.name,
      number: user.member_no,
      role: user.club_role,
      issued: new Date(user.created_at).getFullYear(),
    };
  return (
    <section className="my-membership">
      <header className="my-membership-title">
        <div>
          <span className="m-eyebrow">SCÜ BMK / ÜYE ALANI</span>
          <h1>{settings ? 'Hesabın.' : 'Merhaba, ' + user.name.split(' ')[0] + '.'}</h1>
          <p>
            {settings
              ? 'Bilgilerini ve şifreni buradan güncelleyebilirsin.'
              : 'İyi ki buradasın. Bu da sana ait kartın.'}
          </p>
        </div>
        <button className="m-button outline" onClick={() => setSettings(!settings)}>
          {settings ? <ArrowLeft size={16} /> : <Settings size={16} />}{' '}
          {settings ? 'Kartıma dön' : 'Hesap ayarları'}
        </button>
      </header>
      {error && (
        <p className="m-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="m-success" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      {settings ? (
        <div className="member-settings">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await action({
                  action: 'profile',
                  name: f.get('name'),
                  department: f.get('department'),
                })
              )
                setNotice('Bilgilerin ve kartın güncellendi.');
            }}
          >
            <span className="m-eyebrow">01 / BİLGİLERİN</span>
            <h2>Seni tanıyalım.</h2>
            <label className="m-field">
              Ad soyad
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={80} />
            </label>
            <label className="m-field">
              Bölüm
              <input name="department" defaultValue={user.department} maxLength={100} />
            </label>
            <label className="m-field">
              E-posta
              <input value={user.email} readOnly />
              <small>E-posta değişikliği için kulüp yönetimine ulaş.</small>
            </label>
            <button className="m-button" disabled={busy}>
              Bilgileri kaydet <Check size={16} />
            </button>
          </form>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              if (f.get('password') !== f.get('confirm')) {
                setError('Yeni şifreler aynı olmalı.');
                return;
              }
              if (
                await action({
                  action: 'password',
                  current: f.get('current'),
                  password: f.get('password'),
                })
              ) {
                form.reset();
                setNotice('Şifren değiştirildi. Diğer oturumların kapatıldı.');
              }
            }}
          >
            <span className="m-eyebrow">02 / GÜVENLİK</span>
            <h2>Şifreni değiştir.</h2>
            <label className="m-field">
              Mevcut şifre
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
              />
            </label>
            <label className="m-field">
              Yeni şifre
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
              />
              <small>En az 12 karakter.</small>
            </label>
            <label className="m-field">
              Yeni şifre tekrar
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
              />
            </label>
            <button className="m-button" disabled={busy}>
              Şifreyi değiştir <Check size={16} />
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="my-card-layout">
            <div className="my-card-stage">
              <CardPresentation
                style={style}
                data={data}
                verification={origin ? link : ''}
                side={side}
                onSideChange={setSide}
              />
              <div className="my-card-caption">
                <span>
                  {cardDesigns[style].name} / {cardDesigns[style].edition}
                </span>
                <span>DİJİTAL ÜYELİK KARTI</span>
              </div>
            </div>
            <div className="my-card-detail">
              <span className="m-eyebrow">KULÜP ÜYELİĞİN</span>
              <h2>{clubRoles[user.club_role]}</h2>
              <dl>
                <div>
                  <dt>Üye numarası</dt>
                  <dd>{user.member_no}</dd>
                </div>
                <div>
                  <dt>Katılım</dt>
                  <dd>
                    {new Date(user.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div>
                  <dt>Durum</dt>
                  <dd className="member-active">
                    <i /> Aktif
                  </dd>
                </div>
              </dl>
              <button
                className="m-button"
                disabled={busy || !origin}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await downloadMemberCard(style, data, link, side);
                    setNotice('Kartın indirildi. Galerine kaydedebilirsin.');
                  } catch {
                    setError('İndirme tamamlanamadı. Yeniden deneyebilirsin.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Download size={17} />
                {busy
                  ? 'Hazırlanıyor…'
                  : side === 'front'
                    ? 'Ön yüzü PNG olarak indir'
                    : 'Arka yüzü PNG olarak indir'}
              </button>
              <button
                className="m-button outline"
                disabled={!origin}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setNotice('Kart doğrulama bağlantısı kopyalandı.');
                  } catch {
                    setError('Bağlantı kopyalanamadı. Kartındaki QR kodunu kullanabilirsin.');
                  }
                }}
              >
                <Copy size={16} />
                Doğrulama bağlantısını kopyala
              </button>
              <button
                className="m-button outline"
                disabled={!origin}
                aria-expanded={qrOpen}
                onClick={() => setQrOpen(!qrOpen)}
              >
                {qrOpen ? 'QR kodunu kapat' : 'QR kodunu büyüt'}
              </button>
              {qrOpen && <MemberQR url={link} />}
              <p className="m-muted">
                Kartın hesabında saklanır. QR kodu üyeliğini doğrular; etkinlik bileti yerine
                geçmez.
              </p>
            </div>
          </div>
          {user.club_role === 'member' ? (
            <div className="member-style-picker">
              <div>
                <span className="m-eyebrow">SANA GÖRE BİR KART</span>
                <h2>Bugün hangisi?</h2>
                <p>Numaran aynı kalır. Tarzın değişebilir.</p>
              </div>
              <div className="member-style-options">
                {regularStyles.map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    aria-pressed={user.card_style === s}
                    onClick={async () => {
                      if (await action({ action: 'style', style: s }))
                        setNotice('Kart tasarımın kaydedildi.');
                    }}
                  >
                    <MemberCard style={s} data={data} />
                    <span>
                      {cardDesigns[s].name}
                      {user.card_style === s && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="member-role-note">
              <span className="m-eyebrow">GÖREVİNE ÖZEL</span>
              <p>{cardDesigns[style].caption} Unvanın kulüp yönetimi tarafından atanmıştır.</p>
            </div>
          )}
        </>
      )}
      <div className="member-bottom-actions">
        <a href="/etkinlikler">Buluşmalara göz at</a>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch('/api/member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' }),
              });
              if (!r.ok) throw Error();
              location.assign('/giris');
            } catch {
              setError('Çıkış yapılamadı. Tekrar dene.');
              setBusy(false);
            }
          }}
        >
          <LogOut size={16} />
          Çıkış yap
        </button>
      </div>
    </section>
  );
}
