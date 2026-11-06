'use client';
import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Check, Download, Database, Image, Mail } from 'lucide-react';
import type { Operations as Settings } from '../operations-model';
type Status = {
  settings: Settings;
  version: number;
  health: {
    database: boolean;
    storage: boolean;
    databaseMs: number;
    email: boolean;
    checkedAt: number;
  };
  admins: {
    id: string;
    name: string;
    email: string;
    role: string;
    sessions: number;
    lastLogin: number | null;
  }[];
  memberSessions: number;
  expiredLimits: number;
};
type Score = { id: string; nickname: string; score: number; version: number; hidden: number };
export default function Operations() {
  const [data, setData] = useState<Status | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [section, setSection] = useState('settings'),
    [scores, setScores] = useState<Score[]>([]),
    [day, setDay] = useState(
      new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }),
    ),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [collection, setCollection] = useState('events'),
    [exportPage, setExportPage] = useState(1);
  useEffect(() => {
    const control = new AbortController();
    fetch('/api/admin/operations', { signal: control.signal })
      .then(async (r) => {
        const d = (await r.json()) as Status & { error?: string };
        if (r.status === 401) location.href = '/admin/giris';
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => control.abort();
  }, [refresh]);
  useEffect(() => {
    if (section !== 'scores') return;
    const control = new AbortController();
    fetch(
      '/api/admin/operations?' +
        new URLSearchParams({ section: 'scores', day, page: String(page) }),
      { signal: control.signal },
    )
      .then(async (r) => {
        const d = (await r.json()) as { error?: string; items: Score[]; total: number };
        if (!r.ok) throw Error(d.error);
        setScores(d.items);
        setTotal(d.total);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => control.abort();
  }, [section, day, page, refresh]);
  async function act(payload: unknown) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fetch('/api/admin/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        d = (await r.json()) as { error?: string; removed?: number };
      if (r.status === 401) location.href = '/admin/giris';
      if (!r.ok) throw Error(d.error);
      setRefresh((v) => v + 1);
      setNotice('İşlem tamamlandı.');
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ops">
      {error && (
        <p className="a-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="a-success" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      <div className="ops-tabs" aria-label="Sistem bölümleri">
        {[
          ['settings', 'İşletim ayarları'],
          ['access', 'Erişim ve oturumlar'],
          ['scores', 'Oyun sıralaması'],
          ['data', 'Veri ve bakım'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
            aria-pressed={section === id}
          >
            {label}
          </button>
        ))}
      </div>
      {!data ? (
        <p role="status" className="a-loading">
          Sistem durumu kontrol ediliyor…
        </p>
      ) : (
        <>
          <div className="ops-health">
            {[
              [
                Database,
                'Veritabanı',
                data.health.database,
                data.health.databaseMs + ' ms · son kontrol',
              ],
              [Image, 'Görsel deposu', data.health.storage, 'Dosya deposuna erişim'],
              [
                Mail,
                'E-posta',
                data.health.email,
                data.health.email ? 'Gönderici yapılandırılmış' : 'Gönderici henüz bağlanmadı',
              ],
            ].map(([Icon, label, ok, detail], i) => {
              const I = Icon as typeof Activity;
              return (
                <div key={i}>
                  <I size={20} />
                  <span>
                    <strong>{String(label)}</strong>
                    <small>{String(detail)}</small>
                  </span>
                  <b className={ok ? 'ops-ok' : 'ops-warn'}>{ok ? 'Hazır' : 'Bağlı değil'}</b>
                </div>
              );
            })}
          </div>
          <div className="ops-checked">
            <span>
              Son kontrol: {new Date(data.health.checkedAt).toLocaleTimeString('tr-TR')} · E-posta
              durumu ayar kontrolüdür; gönderim testi değildir.
            </span>
            <button className="a-link" onClick={() => setRefresh((v) => v + 1)}>
              <RefreshCw size={14} />
              Yenile
            </button>
          </div>
          {section === 'settings' && (
            <form
              className="a-panel"
              key={data.version}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const settings = { ...data.settings };
                for (const k of [
                  'signupOpen',
                  'registrationsOpen',
                  'gameOpen',
                  'leaderboardVisible',
                ] as const)
                  settings[k] = f.has(k);
                for (const k of [
                  'membershipCapacity',
                  'adminSessionHours',
                  'memberSessionDays',
                  'uploadMaxMB',
                ] as const)
                  settings[k] = Number(f.get(k));
                settings.closedMessage = String(f.get('closedMessage') || '');
                await act({ action: 'settings', version: data.version, settings });
              }}
            >
              <h2>Kayıtlar ve oyun</h2>
              <p className="a-muted">
                Kapatılan alanlar mevcut hesapları ve kayıtları silmez. Devam eden oyunlar
                tamamlanabilir.
              </p>
              <div className="ops-switches">
                {[
                  [
                    'signupOpen',
                    'Yeni üye hesapları',
                    'Üye ol sayfasından hesap açılmasına izin ver.',
                  ],
                  [
                    'registrationsOpen',
                    'Başvuru formları',
                    'Etkinlik ve hesapsız kulüp başvurularını kabul et.',
                  ],
                  ['gameOpen', 'Yeni oyunlar', 'Yeni sıralamalı koşu başlatılmasına izin ver.'],
                  [
                    'leaderboardVisible',
                    'Oyun sıralaması',
                    'Ziyaretçilere günlük sıralamayı göster.',
                  ],
                ].map(([key, label, hint]) => (
                  <label className="a-toggle" key={key}>
                    <input
                      name={key}
                      type="checkbox"
                      defaultChecked={data.settings[key as keyof Settings] as boolean}
                    />
                    <span>
                      {label}
                      <small>{hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              <label className="a-field">
                Kayıtlar kapalıyken gösterilecek mesaj
                <textarea
                  name="closedMessage"
                  defaultValue={data.settings.closedMessage}
                  minLength={5}
                  maxLength={240}
                  required
                  rows={2}
                />
              </label>
              <div className="ops-fields">
                <label className="a-field">
                  Hesapsız üyelik başvurusu kontenjanı
                  <input
                    name="membershipCapacity"
                    type="number"
                    min={1}
                    max={100000}
                    defaultValue={data.settings.membershipCapacity}
                    required
                  />
                  <small>Etkinlik kontenjanları her etkinliğin kendi ekranında yönetilir.</small>
                </label>
                <label className="a-field">
                  Görsel yükleme sınırı (MB)
                  <input
                    name="uploadMaxMB"
                    type="number"
                    min={1}
                    max={8}
                    defaultValue={data.settings.uploadMaxMB}
                    required
                  />
                  <small>Sunucuda da uygulanır. Üst sınır 8 MB.</small>
                </label>
              </div>
              <h2 className="form-section-title">Oturum süreleri</h2>
              <p className="a-muted">
                Yeni açılan oturumlara uygulanır. Mevcut oturumları erişim bölümünden
                kapatabilirsin.
              </p>
              <div className="ops-fields">
                <label className="a-field">
                  Yönetici oturumu (saat)
                  <input
                    name="adminSessionHours"
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={data.settings.adminSessionHours}
                    required
                  />
                </label>
                <label className="a-field">
                  Üye oturumu (gün)
                  <input
                    name="memberSessionDays"
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={data.settings.memberSessionDays}
                    required
                  />
                </label>
              </div>
              <div className="a-form-footer">
                <button className="a-button" disabled={busy}>
                  {busy ? 'Kaydediliyor…' : 'Ayarları kaydet'}
                </button>
              </div>
            </form>
          )}
          {section === 'access' && (
            <section className="a-panel">
              <h2>Yönetici erişimleri</h2>
              <p className="a-muted">
                Yetki değiştirildiğinde yöneticinin açık oturumları geçersiz olur. Site sahibinin
                yetkisi düşürülemez.
              </p>
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>Hesap</th>
                      <th>Yetki</th>
                      <th>Açık oturum</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.admins.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          <small>{a.email}</small>
                        </td>
                        <td>
                          {a.role === 'owner' ? (
                            'Site sahibi'
                          ) : (
                            <select
                              aria-label={a.name + ' yetkisi'}
                              value={a.role}
                              disabled={busy}
                              onChange={(e) =>
                                act({ action: 'admin-role', id: a.id, role: e.target.value })
                              }
                            >
                              <option value="editor">İçerik yöneticisi</option>
                              <option value="checkin">Giriş görevlisi</option>
                            </select>
                          )}
                        </td>
                        <td>{a.sessions}</td>
                        <td>
                          <button
                            className="a-link"
                            disabled={busy || !a.sessions}
                            onClick={() => act({ action: 'revoke-admin', id: a.id })}
                          >
                            Oturumları kapat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="account-admin-note">
                Kendi hesabında bu işlem diğer cihazları kapatır ve bu cihazın oturumunu yeniler.
                Üyelerin toplam {data.memberSessions} açık oturumu var; kişi bazında “Üye hesapları”
                bölümünden kapatabilirsin.
              </p>
            </section>
          )}
          {section === 'scores' && (
            <section className="a-panel">
              <div className="a-panel-head">
                <div>
                  <h2>Günlük sıralama</h2>
                  <p className="a-muted">
                    Uygunsuz takma adları sıralamadan gizleyebilir, sonra geri alabilirsin.
                  </p>
                </div>
                <label className="a-field">
                  Gün
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => {
                      setDay(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
              <div className="a-table-wrap">
                <table className="a-table">
                  <thead>
                    <tr>
                      <th>Oyuncu</th>
                      <th>Puan</th>
                      <th>Sürüm</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s) => (
                      <tr key={s.id}>
                        <td>{s.nickname}</td>
                        <td>{s.score.toLocaleString('tr-TR')}</td>
                        <td>{s.version}</td>
                        <td>{s.hidden ? 'Gizli' : 'Görünür'}</td>
                        <td>
                          <button
                            className="a-link"
                            disabled={busy}
                            onClick={() =>
                              act({ action: 'score-visibility', id: s.id, hidden: !s.hidden })
                            }
                          >
                            {s.hidden ? 'Göster' : 'Gizle'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!scores.length && <p className="a-muted">Bu gün için kaydedilmiş skor yok.</p>}
              <div className="a-pagination">
                <span>
                  {total} skor · Sayfa {page}
                </span>
                <button
                  className="a-button secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </button>
                <button
                  className="a-button secondary"
                  disabled={page * 30 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </button>
              </div>
            </section>
          )}
          {section === 'data' && (
            <>
              <section className="a-panel">
                <h2>Verileri dışa aktar</h2>
                <p className="a-muted">
                  Her dosya en fazla 500 kayıt içerir. Dosyadaki toplam kayıt sayısına göre sonraki
                  sayfaları da indir. Şifreler, oturumlar ve QR erişim anahtarları dahil edilmez; bu
                  dosyalar tam sistem yedeği değildir.
                </p>
                <div className="ops-fields">
                  <label className="a-field">
                    Veri grubu
                    <select
                      value={collection}
                      onChange={(e) => {
                        setCollection(e.target.value);
                        setExportPage(1);
                      }}
                    >
                      {[
                        ['events', 'Etkinlikler'],
                        ['members', 'Ekip profilleri'],
                        ['club_accounts', 'Üye hesapları'],
                        ['registrations', 'Başvurular'],
                        ['media', 'Görsel bilgileri'],
                        ['audit_log', 'İşlem geçmişi'],
                      ].map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="a-field">
                    Sayfa
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={exportPage}
                      onChange={(e) => setExportPage(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </label>
                </div>
                <a
                  className="a-button secondary"
                  href={
                    '/api/admin/operations?' +
                    new URLSearchParams({ section: 'export', collection, page: String(exportPage) })
                  }
                >
                  <Download size={16} />
                  JSON dosyasını indir
                </a>
                <p className="account-admin-note">
                  Üye ve başvuru dosyaları kişisel bilgi içerir. Yalnızca yetkili kişilerle paylaş.
                </p>
              </section>
              <section className="a-panel">
                <h2>Geçici kayıtları temizle</h2>
                <p className="a-muted">
                  Süresi dolmuş oturumları, davetleri, oyun oturumlarını ve hız sınırlama
                  kayıtlarını temizler. Üyeler, başvurular, skorlar, görseller ve işlem geçmişi
                  korunur.
                </p>
                <p>{data.expiredLimits} süresi dolmuş hız sınırlama kaydı.</p>
                <button
                  className="a-button secondary"
                  disabled={busy}
                  onClick={async () => {
                    const result = await act({ action: 'cleanup' });
                    if (result)
                      setNotice(
                        `${result.removed} geçici kayıt temizlendi. Büyük birikmelerde işlemi tekrar çalıştırabilirsin.`,
                      );
                  }}
                >
                  Süresi dolan kayıtları temizle
                </button>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
