'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import TerminalShell, { TerminalAside } from '../../components/TerminalShell';
type Status = {
  initialized: boolean;
  canSetup: boolean;
  canRecover: boolean;
  ownerEmail: string;
  user: unknown;
};
export default function Login() {
  const [status, setStatus] = useState<Status | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [invite, setInvite] = useState<{ name: string; email: string } | null>(null),
    [token, setToken] = useState(''),
    [recover, setRecover] = useState(false),
    [ready, setReady] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Read the invitation fragment only after hydration; fragments never reach the server.
  useEffect(() => {
    const t = new URLSearchParams(location.hash.slice(1)).get('davet') || '';
    setToken(t);
    Promise.all([
      fetch('/api/admin/auth').then(async (r) => {
        if (!r.ok) throw Error('Giriş ekranı yüklenemedi.');
        return r.json() as Promise<Status>;
      }),
      t
        ? fetch('/api/admin/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'invite-info', token: t }),
          }).then(async (r) => {
            const d = (await r.json()) as {
              invite: { name: string; email: string };
              error?: string;
            };
            if (!r.ok) throw Error(d.error);
            return d.invite;
          })
        : null,
    ])
      .then(([s, i]) => {
        setStatus(s);
        setInvite(i);
        if (s.user && !t)
          location.replace(
            '/admin' +
              (new URLSearchParams(location.search).has('scan')
                ? '?scan=' +
                  encodeURIComponent(new URLSearchParams(location.search).get('scan') || '')
                : ''),
          );
      })
      .catch((e) => setError(e.message))
      .finally(() => setReady(true));
  }, []);
  const setup = status && !status.initialized && status.canSetup,
    isNew = setup || !!token || recover;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (isNew && f.get('password') !== f.get('confirm')) {
      setError('Şifreler aynı olmalı.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: token ? 'accept-invite' : recover ? 'recover' : setup ? 'setup' : 'login',
          email: f.get('email'),
          name: f.get('name'),
          password: f.get('password'),
          token,
        }),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(d.error);
      location.replace(
        '/admin' +
          (new URLSearchParams(location.search).has('scan')
            ? '?scan=' + encodeURIComponent(new URLSearchParams(location.search).get('scan') || '')
            : ''),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş yapılamadı.');
      setBusy(false);
    }
  }
  return (
    <TerminalShell
      scope="admin"
      command={
        token
          ? 'daveti-kabul-et'
          : recover
            ? 'sifre-yenile'
            : setup
              ? 'ilk-yonetici'
              : 'yonetim-girisi'
      }
      busy={busy || !ready}
      error={!!error}
      aside={<TerminalAside kind="admin" />}
    >
      <main className="login-main">
        <div className="login-card">
          <div className="login-lock">
            <LockKeyhole size={22} />
          </div>
          <span className="admin-eyebrow">BİLGİSAYAR MÜHENDİSLİĞİ KULÜBÜ</span>
          <h1>
            {token
              ? 'Yönetici daveti'
              : recover
                ? 'Şifreni yenile'
                : setup
                  ? 'İlk hesabını oluştur'
                  : 'Yönetim girişi'}
          </h1>
          <p>
            {invite
              ? `${invite.name}, ${invite.email} adresi için şifreni belirle.`
              : recover
                ? 'Site sahibi kimliğin doğrulandı. Yeni şifren kaydedildiğinde eski oturumların kapanacak.'
                : setup
                  ? 'BMK için kullanacağın e-posta adresini ve şifreni belirle. Bu hesap site sahibi olacak.'
                  : 'BMK yönetici hesabınla devam et.'}
          </p>
          {error && (
            <div className="a-error" role="alert">
              {error}
            </div>
          )}
          {!ready ? (
            <p>Giriş ekranı yükleniyor…</p>
          ) : !status ? (
            <button className="a-button" onClick={() => location.reload()}>
              Yeniden dene
            </button>
          ) : token && !invite ? (
            <a href="/admin/giris">Giriş ekranına dön</a>
          ) : !status.initialized && !status.canSetup ? (
            <div className="login-restricted">
              <p>İlk yönetici hesabını yalnızca doğrulanmış site sahibi oluşturabilir.</p>
              <a
                className="a-button"
                href="/signin-with-chatgpt?return_to=%2Fadmin%2Fgiris"
                target="_top"
              >
                Site sahibi olarak doğrula <ArrowUpRight size={16} />
              </a>
            </div>
          ) : (
            <form onSubmit={submit} aria-busy={busy}>
              {setup && (
                <label className="a-field">
                  Ad soyad
                  <input name="name" required minLength={2} maxLength={80} autoComplete="name" />
                </label>
              )}
              {!token && !recover && (
                <label className="a-field">
                  BMK e-posta adresi
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="kulup@ornek.com"
                    required
                    maxLength={180}
                  />
                </label>
              )}
              <div className="a-field">
                <label htmlFor="admin-auth-password">{isNew ? 'Yeni şifre' : 'Şifre'}</label>
                <span className="password-input">
                  <input
                    id="admin-auth-password"
                    name="password"
                    type={show ? 'text' : 'password'}
                    autoComplete={isNew ? 'new-password' : 'current-password'}
                    minLength={isNew ? 12 : undefined}
                    maxLength={72}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                {isNew && <small>En az 12 karakter. Uzun bir şifre cümlesi kullanabilirsin.</small>}
              </div>
              {isNew && (
                <label className="a-field">
                  Şifreyi tekrar yaz
                  <input
                    name="confirm"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={12}
                    maxLength={72}
                  />
                </label>
              )}
              <button className="a-button login-submit" disabled={busy}>
                {busy
                  ? 'İşleniyor…'
                  : token
                    ? 'Daveti kabul et'
                    : recover
                      ? 'Şifreyi yenile'
                      : setup
                        ? 'Hesabı oluştur'
                        : 'Giriş yap'}
              </button>
              {status.canRecover && !token && (
                <button
                  type="button"
                  className="a-link"
                  onClick={() => {
                    setRecover(!recover);
                    setError('');
                  }}
                >
                  {recover ? 'Girişe dön' : 'Site sahibi hesabımı kurtar'}
                </button>
              )}
            </form>
          )}
          <div className="login-note">
            Bu alan yalnızca yetkili kulüp yöneticilerine açıktır.
            <br />
            Etkinlik başvurusu için yönetici hesabı gerekmez.
          </div>
          <a className="login-home" href="/">
            ← Ana sayfa
          </a>
        </div>
      </main>
    </TerminalShell>
  );
}
