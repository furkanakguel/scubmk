'use client';
import { useEffect, useState, type InputHTMLAttributes } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  CornerDownLeft,
} from 'lucide-react';
import AuthCardPreview from '../components/AuthCardPreview';
import { CardPresentation } from '../components/MemberCard';
import TerminalShell, { TerminalAside } from '../components/TerminalShell';
import { regularStyles, cardDesigns } from '../membership-model';

type Mode = 'login' | 'signup' | 'recover';
function PromptInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="terminal-input">
      <span className="terminal-input-prompt" aria-hidden="true">
        &gt;
      </span>
      <input {...props} />
    </span>
  );
}
export default function MemberAuth({ initial }: { initial: Mode }) {
  const [mode, setMode] = useState<Mode>(initial),
    [style, setStyle] = useState<(typeof regularStyles)[number]>('mono');
  const [name, setName] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [previewOpen, setPreviewOpen] = useState(false);
  const [visible, setVisible] = useState(false),
    [recovery, setRecovery] = useState(''),
    [reset, setReset] = useState(''),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Recovery navigation and one-use fragments are initialized after hydration.
    if (search.get('kurtarma') === 'kodu') setMode('recover');
    const q = search.get('kart');
    if (regularStyles.includes(q as typeof style)) setStyle(q as typeof style);
    const raw = new URLSearchParams(location.hash.slice(1)).get('kurtar');
    if (raw && /^[a-f0-9]{48}$/.test(raw)) {
      setReset(raw);
      setMode('recover');
      history.replaceState(null, '', location.pathname);
    }
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || '');
    if (mode !== 'login' && v('password') !== v('confirm')) {
      setError('Şifreler eşleşmiyor. İki alana da aynı şifreyi yaz.');
      return;
    }
    setBusy(true);
    const payload =
      mode === 'signup'
        ? {
            action: 'signup',
            name: v('name'),
            email: v('email'),
            password: v('password'),
            department: v('department'),
            style,
            consent: f.has('consent'),
            website: v('website'),
          }
        : mode === 'recover'
          ? {
              action: 'recover',
              email: v('email'),
              code: v('code'),
              token: reset,
              password: v('password'),
            }
          : { action: 'login', email: v('email'), password: v('password') };
    try {
      const r = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { error?: string; recoveryCode?: string };
      if (!r.ok) throw Error(d.error || 'İşlem tamamlanamadı. Tekrar dene.');
      if (d.recoveryCode) setRecovery(d.recoveryCode);
      else location.href = '/kartim';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bağlantı kurulamadı. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  }
  function swap(m: Mode) {
    setMode(m);
    setError('');
    setVisible(false);
    setPreviewOpen(false);
    setReset('');
    history.replaceState(null, '', m === 'signup' ? '/uye-ol' : '/giris');
  }
  function downloadRecovery() {
    const url = URL.createObjectURL(
      new Blob(
        [
          'SCÜ BMK hesap kurtarma kodu\n' +
            recovery +
            '\n\nBu kodu gizli tut. Şifreni unuttuğunda /giris sayfasında kullanabilirsin.',
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bmk-kurtarma-kodu.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const previewData = {
    name: name.trim() || 'Adın Soyadın',
    number: 'BMK-26-XXXXXXXX',
    role: 'member' as const,
    issued: 2026,
    sample: true,
  };
  return (
    <TerminalShell
      scope={mode === 'recover' ? 'recovery' : 'member'}
      command={
        recovery
          ? 'hesap-hazir'
          : mode === 'signup'
            ? 'uye-ol'
            : mode === 'recover'
              ? 'sifre-yenile'
              : 'giris'
      }
      busy={busy}
      error={!!error}
      aside={
        mode === 'recover' ? (
          <TerminalAside kind="recovery" />
        ) : (
          <AuthCardPreview
            terminal
            name={name}
            selectedStyle={mode === 'signup' ? style : undefined}
            selectable={mode !== 'signup'}
          />
        )
      }
    >
      <main className={'member-auth-form auth-mode-' + mode}>
        {recovery ? (
          <section className="member-recovery" aria-labelledby="auth-title">
            <div className="recovery-check">
              <Check size={26} />
            </div>
            <h1 id="auth-title">{mode === 'recover' ? 'Şifren yenilendi.' : 'Hesabın hazır.'}</h1>
            <p>
              {mode === 'recover'
                ? 'Yeni kurtarma kodunu kaydet. Önceki kurtarma kodun artık geçerli değil.'
                : 'Son bir adım: kurtarma kodunu kaydet. Şifreni unutursan hesabına bu kodla ulaşabilirsin.'}
            </p>
            <div className="auth-backup-label">Hesap kurtarma kodun</div>
            <code>{recovery}</code>
            <div className="m-actions">
              <button
                type="button"
                className="m-button light"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(recovery);
                    setCopied(true);
                  } catch {
                    setError('Kodu seçerek kopyalayabilirsin.');
                  }
                }}
              >
                <Copy size={16} />
                {copied ? 'Kopyalandı' : 'Kodu kopyala'}
              </button>
              <button type="button" className="m-button light" onClick={downloadRecovery}>
                <Download size={16} />
                Dosya olarak indir
              </button>
            </div>
            <p className="m-muted">
              Bu kod yalnızca şimdi gösterilir. Güvenli bir yere kaydet ve kimseyle paylaşma.
            </p>
            {error && (
              <p role="alert" className="m-error">
                {error}
              </p>
            )}
            <a className="m-button auth-submit" href="/kartim">
              Kaydettim, kartıma git
              <ArrowRight size={18} />
            </a>
          </section>
        ) : (
          <>
            {mode !== 'recover' && (
              <div className="auth-tabs" role="group" aria-label="Hesap işlemleri">
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={mode === 'login'}
                  onClick={() => swap('login')}
                >
                  <span aria-hidden="true">[</span> Giriş yap <span aria-hidden="true">]</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={mode === 'signup'}
                  onClick={() => swap('signup')}
                >
                  <span aria-hidden="true">[</span> Üye ol <span aria-hidden="true">]</span>
                </button>
              </div>
            )}
            <div className="auth-form-heading">
              <h1 id="auth-title">
                {mode === 'signup'
                  ? 'Hesabını oluştur.'
                  : mode === 'recover'
                    ? reset
                      ? 'Yeni şifreni belirle.'
                      : 'Hesabını kurtar.'
                    : 'Giriş yap.'}
              </h1>
              <p>
                {mode === 'signup'
                  ? 'Bilgilerini gir, kartını seç. Üyelik kartın otomatik hazırlansın.'
                  : mode === 'recover'
                    ? reset
                      ? 'Yeni şifreni iki alana da yazarak kaydet.'
                      : 'Üye olurken kaydettiğin kurtarma koduyla yeni bir şifre belirle.'
                    : 'BMK hesabına giriş yap, dijital kartına ve üyelik bilgilerine ulaş.'}
              </p>
            </div>
            <form onSubmit={submit} key={mode} aria-labelledby="auth-title" aria-busy={busy}>
              {error && (
                <p role="alert" className="m-error">
                  <CircleAlert size={18} />
                  <span>{error}</span>
                </p>
              )}
              {mode === 'signup' && (
                <label className="m-field">
                  Ad soyad
                  <PromptInput
                    name="name"
                    autoComplete="name"
                    placeholder="Adın ve soyadın"
                    required
                    maxLength={80}
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                  />
                </label>
              )}
              {!reset && (
                <label className="m-field">
                  E-posta adresin
                  <PromptInput
                    name="email"
                    type="email"
                    autoComplete={mode === 'login' ? 'username' : 'email'}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="ornek@eposta.com"
                    required
                    maxLength={180}
                    disabled={busy}
                  />
                </label>
              )}
              {mode === 'recover' && !reset && (
                <label className="m-field">
                  Kurtarma kodun
                  <PromptInput
                    name="code"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    placeholder="Kaydettiğin kurtarma kodu"
                    maxLength={50}
                    disabled={busy}
                  />
                </label>
              )}
              <div className={mode === 'signup' ? 'auth-password-pair' : ''}>
                <div className="m-field">
                  <div className="auth-field-heading">
                    <label htmlFor="member-auth-password">
                      {mode === 'recover' ? 'Yeni şifre' : 'Şifre'}
                    </label>
                    {mode === 'login' && <a href="/sifremi-unuttum">Şifremi unuttum</a>}
                  </div>
                  <div className="password-input">
                    <span className="terminal-input-prompt" aria-hidden="true">
                      &gt;
                    </span>
                    <input
                      id="member-auth-password"
                      name="password"
                      type={visible ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={mode === 'login' ? 1 : 12}
                      maxLength={72}
                      placeholder={mode === 'login' ? 'Şifreni gir' : 'En az 12 karakter'}
                      aria-describedby={mode !== 'login' ? 'auth-password-help' : undefined}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      onClick={() => setVisible(!visible)}
                      disabled={busy}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {mode !== 'login' && (
                  <label className="m-field">
                    Şifre tekrar
                    <PromptInput
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Şifreni tekrar yaz"
                      required
                      minLength={12}
                      maxLength={72}
                      disabled={busy}
                    />
                  </label>
                )}
              </div>
              {mode !== 'login' && (
                <p id="auth-password-help" className="auth-field-help">
                  En az 12 karakter kullan. Birkaç kelimelik bir şifre seçebilirsin.
                </p>
              )}
              {mode === 'signup' && (
                <>
                  <fieldset className="signup-styles" disabled={busy}>
                    <legend>Kart tasarımın</legend>
                    {regularStyles.map((s) => (
                      <label key={s}>
                        <input
                          type="radio"
                          name="cardStyle"
                          value={s}
                          checked={style === s}
                          onChange={() => setStyle(s)}
                        />
                        <span className={'card-swatch swatch-' + s} />
                        <span>{cardDesigns[s].name}</span>
                        <Check className="signup-style-check" size={13} aria-hidden="true" />
                      </label>
                    ))}
                  </fieldset>
                  <details
                    className="auth-mobile-preview"
                    onToggle={(e) => setPreviewOpen(e.currentTarget.open)}
                  >
                    <summary>
                      Kartını önizle
                      <span>
                        {cardDesigns[style].name}
                        <ChevronDown size={15} />
                      </span>
                    </summary>
                    {previewOpen && (
                      <CardPresentation style={style} data={previewData} loading="lazy" />
                    )}
                  </details>
                  <details className="auth-optional">
                    <summary>
                      Bölüm bilgisi ekle{' '}
                      <span>
                        İsteğe bağlı
                        <ChevronDown size={14} />
                      </span>
                    </summary>
                    <label className="m-field">
                      Bölümün
                      <PromptInput
                        name="department"
                        placeholder="Okuduğun bölüm"
                        maxLength={100}
                        disabled={busy}
                      />
                    </label>
                  </details>
                  <div className="member-honey" aria-hidden="true">
                    <label>
                      Website
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </label>
                  </div>
                  <label className="m-consent">
                    <input name="consent" type="checkbox" required disabled={busy} />
                    <span>
                      Adımın, e-postamın ve üyelik bilgilerimin hesabım için saklanmasını kabul
                      ediyorum. Kartımı paylaşırsam adım, unvanım ve üyelik durumum QR üzerinden
                      görülebilir.
                    </span>
                  </label>
                </>
              )}
              <button className="m-button auth-submit" disabled={busy}>
                <span>
                  {busy
                    ? mode === 'login'
                      ? 'Giriş yapılıyor…'
                      : mode === 'signup'
                        ? 'Hesabın oluşturuluyor…'
                        : 'Şifren kaydediliyor…'
                    : mode === 'signup'
                      ? 'Hesabımı oluştur'
                      : mode === 'recover'
                        ? 'Yeni şifreyi kaydet'
                        : 'Giriş yap'}
                </span>
                {busy ? (
                  <LoaderCircle className="auth-loading" size={18} />
                ) : (
                  <span className="terminal-enter" aria-hidden="true">
                    enter <CornerDownLeft size={15} />
                  </span>
                )}
              </button>
              {mode === 'recover' && (
                <>
                  <p className="m-muted">
                    Kurtarma kodun yoksa{' '}
                    <a href="/sifremi-unuttum">diğer kurtarma seçeneklerine bak</a>.
                  </p>
                  <button type="button" className="auth-text-button" onClick={() => swap('login')}>
                    Girişe dön
                  </button>
                </>
              )}
            </form>
            {mode === 'login' && (
              <p className="auth-create-link">
                Henüz hesabın yok mu?{' '}
                <button type="button" disabled={busy} onClick={() => swap('signup')}>
                  Üye ol
                </button>
              </p>
            )}
            <div className="auth-footnote">
              <Info size={16} />
              <p>
                {mode === 'recover' ? (
                  <>
                    Kurtarma kodunu kimseyle paylaşma. Yeni şifren kaydedildiğinde önceki kod
                    geçersiz olur.
                  </>
                ) : (
                  <>
                    Yalnızca etkinliğe başvuracaksan hesap açmana gerek yok.{' '}
                    <a href="/etkinlikler">Etkinlikleri gör</a>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </main>
    </TerminalShell>
  );
}
