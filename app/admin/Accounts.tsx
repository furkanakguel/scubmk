'use client';
import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowLeft, Check, Copy, RefreshCw } from 'lucide-react';
import { clubRoles, effectiveStyle, type ClubRole, type ClubAccount } from '../membership-model';
import MemberCard from '../components/MemberCard';
export default function Accounts() {
  const [creating, setCreating] = useState(false),
    [createdLink, setCreatedLink] = useState(''),
    [q, setQ] = useState(''),
    [query, setQuery] = useState(''),
    [role, setRole] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [items, setItems] = useState<ClubAccount[]>([]),
    [total, setTotal] = useState(0),
    [selected, setSelected] = useState<ClubAccount | null>(null),
    [draftRole, setDraftRole] = useState<ClubRole>('member'),
    [draftActive, setDraftActive] = useState(true),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [resetLink, setResetLink] = useState(''),
    [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- The abortable request owns loading state; changing a filter must show loading before its response.
  useEffect(() => {
    const control = new AbortController();
    setLoading(true);
    fetch(
      '/api/admin/accounts?' + new URLSearchParams({ q: query, role, status, page: String(page) }),
      { signal: control.signal },
    )
      .then(async (r) => {
        const d = (await r.json()) as { error?: string; items: ClubAccount[]; total: number };
        if (r.status === 401) location.href = '/admin/giris';
        if (!r.ok) throw Error(d.error);
        setItems(d.items);
        setTotal(d.total);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!control.signal.aborted) setLoading(false);
      });
    return () => control.abort();
  }, [query, role, status, page, version]);
  function open(u: ClubAccount) {
    setSelected(u);
    setDraftRole(u.club_role);
    setDraftActive(!!u.active);
    setError('');
    setNotice('');
    setResetLink('');
    setConfirmReset(false);
  }
  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/admin/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        d = (await r.json()) as { error?: string; link?: string };
      if (r.status === 401) location.href = '/admin/giris';
      if (!r.ok) throw Error(d.error);
      setVersion((v) => v + 1);
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {creating && (
        <section className="a-panel">
          <h2>Üye hesabı oluştur</h2>
          <p className="a-muted">
            Üye kendi şifresini tek kullanımlık bağlantıyla belirler. Otomatik e-posta gönderilmez.
          </p>
          {createdLink ? (
            <>
              <label className="a-field">
                Şifre belirleme bağlantısı · 1 saat geçerli
                <input readOnly value={createdLink} onFocus={(e) => e.target.select()} />
              </label>
              <button
                className="a-button secondary"
                onClick={() => {
                  setCreating(false);
                  setCreatedLink('');
                }}
              >
                Tamam
              </button>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  d = await act({
                    action: 'create',
                    name: f.get('name'),
                    email: f.get('email'),
                    department: f.get('department'),
                  });
                if (d?.link) setCreatedLink(d.link);
              }}
            >
              <div className="ops-fields">
                <label className="a-field">
                  Ad soyad
                  <input name="name" minLength={2} maxLength={80} required />
                </label>
                <label className="a-field">
                  E-posta
                  <input name="email" type="email" maxLength={180} required />
                </label>
                <label className="a-field">
                  Bölüm
                  <input name="department" maxLength={100} />
                </label>
              </div>
              <div className="a-form-footer">
                <button
                  type="button"
                  className="a-button secondary"
                  onClick={() => setCreating(false)}
                >
                  Vazgeç
                </button>
                <button className="a-button" disabled={busy}>
                  Hesap oluştur
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="a-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="a-success">
          <Check size={16} />
          {notice}
        </p>
      )}
      {selected ? (
        <section className="a-panel">
          <button
            className="a-link"
            onClick={() => {
              setSelected(null);
              setError('');
            }}
          >
            <ArrowLeft size={15} /> Üye hesaplarına dön
          </button>
          <div className="account-admin-summary">
            <div>
              <h2>{selected.name}</h2>
              <p>
                {selected.email} · {selected.member_no}
              </p>
              <p>
                {selected.department || 'Bölüm belirtilmedi'} · Katılım:{' '}
                {new Date(selected.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act({
                  action: 'profile',
                  id: selected.id,
                  name: f.get('name'),
                  department: f.get('department'),
                  updatedAt: selected.updated_at,
                })
              ) {
                setSelected(null);
                setNotice('Üye bilgileri güncellendi.');
              }
            }}
          >
            <div className="ops-fields">
              <label className="a-field">
                Ad soyad
                <input
                  name="name"
                  defaultValue={selected.name}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
              <label className="a-field">
                Bölüm
                <input name="department" defaultValue={selected.department} maxLength={100} />
              </label>
            </div>
            <button className="a-button secondary" disabled={busy}>
              Bilgileri kaydet
            </button>
          </form>
          <div className="account-admin-preview">
            <MemberCard
              style={effectiveStyle({ ...selected, club_role: draftRole })}
              data={{
                name: selected.name,
                number: selected.member_no,
                role: draftRole,
                issued: new Date(selected.created_at).getFullYear(),
              }}
            />
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act({
                  action: 'update',
                  id: selected.id,
                  role: draftRole,
                  active: draftActive,
                  updatedAt: selected.updated_at,
                })
              ) {
                setSelected(null);
                setNotice('Üyelik güncellendi. Kart tasarımı hesaba otomatik uygulandı.');
              }
            }}
          >
            <div className="account-edit-row">
              <label className="a-field">
                Kulüp unvanı
                <select
                  value={draftRole}
                  onChange={(e) => setDraftRole(e.target.value as ClubRole)}
                >
                  {Object.entries(clubRoles).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <small>Yeni üyeler her zaman “Üye” olarak başlar.</small>
              </label>
              <label className="a-field">
                Üyelik durumu
                <select
                  value={draftActive ? 'active' : 'inactive'}
                  onChange={(e) => setDraftActive(e.target.value === 'active')}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Askıya alınmış</option>
                </select>
                <small>Askıya alındığında tüm oturumları kapanır, kartı doğrulanmaz.</small>
              </label>
            </div>
            <button
              type="button"
              className="a-button secondary"
              disabled={busy}
              onClick={async () => {
                if (await act({ action: 'revoke', id: selected.id })) {
                  setSelected(null);
                  setNotice('Üyenin tüm cihazlardaki oturumları kapatıldı.');
                }
              }}
            >
              Üyenin tüm oturumlarını kapat
            </button>
            <p className="account-admin-note">
              Kulüp unvanı yalnızca üyelik kartını belirler. Yönetim paneline erişim vermez. Panel
              erişimi “Yöneticiler” bölümünden ayrıca yönetilir.
            </p>
            <div className="a-form-footer">
              <button
                type="button"
                className="a-button secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Vazgeç
              </button>
              <button className="a-button" disabled={busy}>
                {busy ? 'Kaydediliyor…' : 'Unvanı ve durumu kaydet'}
                <Check size={16} />
              </button>
            </div>
          </form>
          {selected.active === 1 && (
            <div className="ticket-renew">
              <h3>Hesabına ulaşamayan üye</h3>
              <p className="a-muted">
                Önce kişinin kimliğini doğrula. Ardından oluşturduğun tek kullanımlık bağlantıyı
                yalnızca ona ilet. Kişi kendi şifresini belirler; e-posta otomatik gönderilmez.
              </p>
              {resetLink ? (
                <>
                  <label className="a-field">
                    Kurtarma bağlantısı · 1 saat geçerli
                    <input readOnly value={resetLink} onFocus={(e) => e.target.select()} />
                  </label>
                  <button
                    className="a-button secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(resetLink);
                        setNotice('Kurtarma bağlantısı kopyalandı.');
                      } catch {
                        setError('Bağlantıyı seçerek elle kopyalayabilirsin.');
                      }
                    }}
                  >
                    <Copy size={15} />
                    Kopyala
                  </button>
                </>
              ) : confirmReset ? (
                <div className="renew-confirm">
                  <p>
                    Üyenin kimliğini doğruladın mı? Yeni bağlantı oluşturmak, varsa önceki kurtarma
                    bağlantısını iptal eder.
                  </p>
                  <button
                    className="a-button"
                    disabled={busy}
                    onClick={async () => {
                      const d = await act({ action: 'reset-link', id: selected.id });
                      if (d?.link) {
                        setResetLink(d.link);
                        setConfirmReset(false);
                      }
                    }}
                  >
                    Evet, kurtarma bağlantısı oluştur
                  </button>
                  <button className="a-link" onClick={() => setConfirmReset(false)}>
                    Vazgeç
                  </button>
                </div>
              ) : (
                <button className="a-button secondary" onClick={() => setConfirmReset(true)}>
                  Kurtarma bağlantısı hazırla
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="a-panel">
          <div className="cms-toolbar">
            <button
              className="a-button"
              onClick={() => {
                setCreating(true);
                setCreatedLink('');
              }}
            >
              Üye hesabı ekle
            </button>
            <label className="a-search">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Üye hesaplarında ara"
                placeholder="Ad, e-posta veya üye numarası…"
              />
            </label>
            <select
              aria-label="Kulüp unvanı filtresi"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tüm unvanlar</option>
              {Object.entries(clubRoles).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              aria-label="Üyelik durumu filtresi"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Askıda</option>
            </select>
            <button
              className="a-icon"
              aria-label="Listeyi yenile"
              onClick={() => setVersion((v) => v + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {loading ? (
            <p className="a-loading" role="status">
              Üye hesapları yükleniyor…
            </p>
          ) : items.length ? (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>Üye</th>
                    <th>Üye numarası</th>
                    <th>Unvan</th>
                    <th>Durum</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </td>
                      <td>
                        <strong>{u.member_no}</strong>
                        <small>{new Date(u.created_at).toLocaleDateString('tr-TR')}</small>
                      </td>
                      <td>{clubRoles[u.club_role]}</td>
                      <td>
                        <span className={'a-badge ' + (u.active ? '' : 'draft')}>
                          {u.active ? 'Aktif' : 'Askıda'}
                        </span>
                      </td>
                      <td>
                        <button className="a-link" onClick={() => open(u)}>
                          Kart ve unvan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="a-empty">
              <h3>Üye hesabı bulunamadı</h3>
              <p>Üye ol sayfasında hesabını açan herkes burada listelenir.</p>
              <a href="/uye-ol" className="a-link" target="_blank" rel="noreferrer">
                Üyelik sayfasını aç ↗
              </a>
            </div>
          )}
          <div className="a-pagination">
            <span>
              {total} üye · Sayfa {page}
            </span>
            <button
              className="a-icon"
              aria-label="Önceki sayfa"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="a-icon"
              aria-label="Sonraki sayfa"
              disabled={page * 30 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <p className="account-admin-note">
            Üye hesapları kart ve giriş içindir. Ekip sayfasındaki biyografi ve fotoğraflar “Ekip
            profilleri” bölümünden yönetilir.
          </p>
        </section>
      )}
    </>
  );
}
