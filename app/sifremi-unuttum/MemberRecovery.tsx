'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Copy, Eye, EyeOff, Info, Mail, RotateCcw } from 'lucide-react';
import TerminalShell, { TerminalAside } from '../components/TerminalShell';

type Stage = 'email' | 'code' | 'password' | 'done';
type Result = {
  error?: string;
  code?: string;
  challenge?: string;
  retryAfter?: number;
  expiresIn?: number;
  recoveryCode?: string;
};
const steps = ['E-posta', 'Kod', 'Yeni şifre'];
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
export default function MemberRecovery({ emailAvailable }: { emailAvailable: boolean }) {
  const [stage, setStage] = useState<Stage>('email'),
    [email, setEmail] = useState(''),
    [challenge, setChallenge] = useState(''),
    [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [unavailable, setUnavailable] = useState(!emailAvailable),
    [resendAt, setResendAt] = useState(0),
    [expiresAt, setExpiresAt] = useState(0),
    [now, setNow] = useState(() => Date.now()),
    [recovery, setRecovery] = useState(''),
    [copied, setCopied] = useState(false),
    [announcement, setAnnouncement] = useState('');
  const codeInput = useRef<HTMLInputElement>(null),
    passwordInput = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  const step = stage === 'email' ? 0 : stage === 'code' ? 1 : 2,
    remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000)),
    cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (stage === 'code') codeInput.current?.focus();
    if (stage === 'password') passwordInput.current?.focus();
    if (stage !== 'code' && stage !== 'password' && resendAt <= Date.now()) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (stage === 'email' && Date.now() >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, resendAt]);
  async function call(payload: Record<string, string>) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const response = await fetch('/api/member/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abort.signal,
    });
    const result = (await response.json()) as Result;
    if (!response.ok) {
      if (result.code === 'email_unavailable') setUnavailable(true);
      if (result.retryAfter) {
        setResendAt(Date.now() + result.retryAfter * 1000);
        setNow(Date.now());
      }
      if (result.code === 'reset_expired') {
        setStage('email');
        setPassword('');
        setConfirm('');
        setChallenge('');
      }
      throw Error(result.error || 'İşlem tamamlanamadı. Biraz sonra tekrar dene.');
    }
    return result;
  }
  async function requestCode() {
    setBusy(true);
    setError('');
    setAnnouncement('');
    try {
      const result = await call({ action: 'request', email: email.trim() });
      if (!result.challenge) throw Error('Kod isteği tamamlanamadı. Tekrar dene.');
      const start = Date.now();
      setChallenge(result.challenge);
      setCode('');
      setPassword('');
      setConfirm('');
      setNow(start);
      setResendAt(start + (result.retryAfter || 60) * 1000);
      setExpiresAt(start + (result.expiresIn || 600) * 1000);
      setStage('code');
      setAnnouncement('Adresin kayıtlıysa doğrulama kodun e-postana ulaşacak.');
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setError(e instanceof Error ? e.message : 'Bağlantı kurulamadı.');
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage === 'email') {
      await requestCode();
      return;
    }
    setError('');
    setAnnouncement('');
    if (stage === 'password' && password !== confirm) {
      setError('İki alana da aynı şifreyi yaz.');
      return;
    }
    if (
      stage === 'password' &&
      (password.length < 12 || new TextEncoder().encode(password).length > 72)
    ) {
      setError('Şifren en az 12 karakter olmalı. Çok uzunsa biraz kısaltıp tekrar dene.');
      return;
    }
    setBusy(true);
    try {
      if (stage === 'code') {
        const result = await call({ action: 'verify', challenge, code });
        setCode('');
        setStage('password');
        setVisible(false);
        setExpiresAt(Date.now() + (result.expiresIn || 600) * 1000);
        setNow(Date.now());
      } else {
        const result = await call({ action: 'reset', password });
        setRecovery(result.recoveryCode || '');
        setPassword('');
        setConfirm('');
        setChallenge('');
        setVisible(false);
        setStage('done');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setError(e instanceof Error ? e.message : 'Bağlantı kurulamadı.');
    } finally {
      setBusy(false);
    }
  }
  function changeEmail() {
    setStage('email');
    setError('');
    setAnnouncement('');
    setChallenge('');
    setCode('');
    setPassword('');
    setConfirm('');
    setVisible(false);
  }
  return (
    <TerminalShell
      scope="recovery"
      command={
        stage === 'email'
          ? 'sifre-yenile'
          : stage === 'code'
            ? 'kodu-dogrula'
            : stage === 'password'
              ? 'yeni-sifre'
              : 'sifre-yenilendi'
      }
      busy={busy}
      error={!!error}
      aside={<TerminalAside kind="recovery" />}
    >
      <main className="member-auth-form recovery-form">
        <a href="/giris" className="m-back">
          <ArrowLeft size={16} />
          Girişe dön
        </a>
        {stage === 'done' ? (
          <section className="recovery-done" aria-labelledby="recovery-title">
            <div className="recovery-check">
              <Check size={26} />
            </div>
            <h1 id="recovery-title">Şifren yenilendi.</h1>
            <p>
              Açık oturumların kapatıldı.
              <br />
              Yeni şifrenle hesabına giriş yapabilirsin.
            </p>
            <a className="m-button" href="/giris">
              Giriş yap
            </a>
            {recovery && (
              <details className="recovery-backup">
                <summary>Yeni yedek kurtarma kodun</summary>
                <p>
                  Önceki kurtarma kodunun yerine geçer. Bu kod yalnızca şimdi gösterilir. Güvenli
                  bir yere kaydet ve kimseyle paylaşma.
                </p>
                <code>{recovery}</code>
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
                  <Copy size={14} />
                  {copied ? 'Kopyalandı' : 'Kodu kopyala'}
                </button>
                <span role="status">{copied ? 'Kurtarma kodu kopyalandı.' : ''}</span>
              </details>
            )}
            {error && (
              <p role="alert" className="m-error">
                {error}
              </p>
            )}
          </section>
        ) : (
          <>
            <ol className="recovery-steps" aria-label="Şifre yenileme adımları">
              {steps.map((label, i) => (
                <li
                  key={label}
                  className={i < step ? 'complete' : i === step ? 'current' : ''}
                  aria-current={i === step ? 'step' : undefined}
                >
                  <span aria-hidden="true">{i < step ? <Check size={12} /> : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <div className="recovery-heading">
              <h1 id="recovery-title">
                {stage === 'email'
                  ? 'Şifreni yenile.'
                  : stage === 'code'
                    ? 'Kodunu gir.'
                    : 'Yeni şifreni belirle.'}
              </h1>
              <p>
                {stage === 'email'
                  ? 'Üye olurken kullandığın e-posta adresini yaz.'
                  : stage === 'code'
                    ? 'Adresin kayıtlıysa altı haneli doğrulama kodunu birkaç dakika içinde alacaksın.'
                    : 'Hesabın için en az 12 karakterlik bir şifre seç.'}
              </p>
            </div>
            {stage === 'email' && unavailable && (
              <div className="recovery-availability" role="status">
                <Info size={19} />
                <div>
                  <strong>E-posta ile kurtarma henüz açık değil.</strong>
                  <p>
                    Şimdilik kurtarma kodunla devam edebilir veya kulüp yönetimine ulaşabilirsin.
                  </p>
                </div>
              </div>
            )}
            {stage === 'code' && (
              <div className="recovery-address">
                <Mail size={16} />
                <span>{email.trim()}</span>
                <button type="button" disabled={busy} onClick={changeEmail}>
                  Değiştir
                </button>
              </div>
            )}
            <form onSubmit={submit} aria-labelledby="recovery-title" aria-busy={busy}>
              {error && (
                <p role="alert" className="m-error">
                  {error}
                </p>
              )}
              <p className="recovery-sr" role="status">
                {announcement}
              </p>
              {stage === 'email' && (
                <label className="m-field">
                  E-posta
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="ad@ornek.com"
                    required
                    maxLength={180}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                </label>
              )}
              {stage === 'code' && (
                <>
                  <label className="m-field recovery-code-label">
                    Doğrulama kodu
                    <input
                      ref={codeInput}
                      className="recovery-code-input"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      required
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={busy}
                      aria-describedby="code-help"
                    />
                  </label>
                  <div className="recovery-code-meta" id="code-help">
                    <span>{remaining > 0 ? 'Kodun geçerlilik süresi' : 'Kodun süresi doldu.'}</span>
                    {remaining > 0 && <time>{time(remaining)}</time>}
                  </div>
                </>
              )}
              {stage === 'password' && (
                <>
                  <div className="m-field">
                    <label htmlFor="recovery-password">Yeni şifre</label>
                    <div className="password-input">
                      <input
                        id="recovery-password"
                        ref={passwordInput}
                        name="password"
                        type={visible ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                        aria-describedby="password-help"
                      />
                      <button
                        type="button"
                        aria-label={visible ? 'Şifreleri gizle' : 'Şifreleri göster'}
                        onClick={() => setVisible(!visible)}
                        disabled={busy}
                      >
                        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    <small id="password-help">
                      Birkaç kelimeden oluşan, daha önce kullanmadığın bir şifre seçebilirsin.
                    </small>
                  </div>
                  <label className="m-field">
                    Yeni şifre tekrar
                    <input
                      name="confirm"
                      type={visible ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={72}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <div className="recovery-password-checks">
                    <span className={password.length >= 12 ? 'valid' : ''}>
                      <Check size={12} />
                      En az 12 karakter
                    </span>
                    <span className={!!confirm && password === confirm ? 'valid' : ''}>
                      <Check size={12} />
                      Şifreler eşleşiyor
                    </span>
                  </div>
                  {remaining === 0 && (
                    <p className="m-error" role="alert">
                      Şifre yenileme oturumunun süresi doldu. Yeniden kod iste.
                    </p>
                  )}
                </>
              )}
              <button
                className="m-button auth-submit"
                disabled={
                  busy ||
                  (stage === 'email' && (unavailable || cooldown > 0)) ||
                  (stage === 'code' && (code.length !== 6 || remaining === 0)) ||
                  (stage === 'password' && remaining === 0)
                }
              >
                {busy
                  ? 'Bir saniye…'
                  : stage === 'email'
                    ? cooldown > 0
                      ? `Yeni kod için ${cooldown} sn bekle`
                      : 'Doğrulama kodu gönder'
                    : stage === 'code'
                      ? 'Kodu doğrula'
                      : 'Yeni şifreyi kaydet'}
              </button>
              {stage === 'code' && (
                <div className="recovery-resend">
                  <p>
                    Kod gelmediyse gereksiz posta klasörüne de bak. Yeniden istediğinde önceki kod
                    geçersiz olur.
                  </p>
                  <button
                    type="button"
                    className="auth-text-button"
                    disabled={busy || cooldown > 0}
                    onClick={requestCode}
                  >
                    <RotateCcw size={13} />
                    {cooldown > 0 ? `Yeni kod için ${cooldown} sn bekle` : 'Yeni kod gönder'}
                  </button>
                </div>
              )}
              {stage === 'password' && remaining === 0 && (
                <button type="button" className="auth-text-button" onClick={changeEmail}>
                  Yeniden kod iste
                </button>
              )}
            </form>
            {stage === 'email' && (
              <div className="recovery-alternatives">
                <a href="/giris?kurtarma=kodu">Kurtarma kodum var</a>
                <a href="https://www.instagram.com/cumhuriyetbmk/" target="_blank" rel="noreferrer">
                  Kulüp yönetimine ulaş
                </a>
              </div>
            )}
            {stage === 'password' && (
              <p className="recovery-footnote">
                Şifren yenilendiğinde tüm açık oturumların kapanır. Üyelik kartın ve bilgilerin
                hesabında kalır.
              </p>
            )}
          </>
        )}
      </main>
    </TerminalShell>
  );
}
