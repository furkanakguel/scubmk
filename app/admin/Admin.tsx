'use client';
import { useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import {
  PanelsTopLeft,
  LayoutDashboard,
  CalendarDays,
  Users,
  ClipboardList,
  ScanLine,
  Image,
  Settings,
  ShieldCheck,
  History,
  UserRound,
  Plus,
  ArrowUpRight,
  Search,
  LogOut,
  X,
  Menu,
  Download,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AdminUser } from '../admin-auth';
import { Brand } from '../components/Brand';
import { defaultSettings, parseList } from '../content-model';
import MediaPicker, { MediaLibrary } from './MediaPicker';
import Accounts from './Accounts';
import Operations from './Operations';
import HomeEditor from './HomeEditor';
import QrScanner from './QrScanner';
import { parseCheckinCode } from './checkin-qr';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Legacy CMS sections have heterogeneous payloads; all writes are validated with server schemas.
type Row = Record<string, any>;
const tabs = [
  ['overview', 'Genel bakış', LayoutDashboard],
  ['events', 'Etkinlikler', CalendarDays],
  ['members', 'Ekip profilleri', Users],
  ['accounts', 'Üye hesapları', UserRound],
  ['registrations', 'Başvurular', ClipboardList],
  ['checkin', 'Bilet kontrolü', ScanLine],
  ['media', 'Görsel arşivi', Image],
  ['home', 'Sayfa düzenleyici', PanelsTopLeft],
  ['settings', 'Site ayarları', Settings],
  ['admins', 'Yöneticiler', ShieldCheck],
  ['audit', 'İşlem geçmişi', History],
  ['operations', 'Sistem ve güvenlik', ShieldCheck],
  ['account', 'Hesabım', UserRound],
] as const;
const roles = { owner: 'Site sahibi', editor: 'İçerik yöneticisi', checkin: 'Giriş görevlisi' };
const date = (n: string | number) =>
  new Date(n).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
const inputDate = (n?: string) =>
  n ? new Date(new Date(n).getTime() + 10800000).toISOString().slice(0, 16) : '';
const slug = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
function Field({
  label,
  name,
  value = '',
  required = false,
  type = 'text',
  max = 180,
  hint,
}: {
  label: string;
  name: string;
  value?: string | number;
  required?: boolean;
  type?: string;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="a-field">
      {label}
      <input name={name} type={type} defaultValue={value} required={required} maxLength={max} />
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Area({
  label,
  name,
  value = '',
  max = 3000,
}: {
  label: string;
  name: string;
  value?: string;
  max?: number;
}) {
  return (
    <label className="a-field">
      {label}
      <textarea name={name} defaultValue={value} maxLength={max} rows={4} />
    </label>
  );
}
function Toggle({
  name,
  label,
  checked = false,
  hint,
}: {
  name: string;
  label: string;
  checked?: boolean;
  hint?: string;
}) {
  return (
    <label className="a-toggle">
      <input name={name} type="checkbox" defaultChecked={checked} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="a-empty">
      <ClipboardList size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = document.activeElement as HTMLElement,
      old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('button,input')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const all = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not([type="hidden"]):not(:disabled),select,textarea,a[href]',
          ) || [],
        ).filter((e) => e.offsetParent !== null);
        if (e.shiftKey && document.activeElement === all[0]) {
          e.preventDefault();
          all.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      removeEventListener('keydown', key);
      active?.focus();
    };
  }, [close]);
  return (
    <div className="a-modal-backdrop">
      <div className="a-modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="a-modal-head">
          <div>
            <span className="admin-eyebrow">SCÜ BMK / İÇERİK YÖNETİMİ</span>
            <h2>{title}</h2>
          </div>
          <button className="a-icon" aria-label="Pencereyi kapat" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function Admin({ user }: { user: AdminUser }) {
  const [tab, setTab] = useState(user.role === 'checkin' ? 'checkin' : 'overview'),
    [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [q, setQ] = useState(''),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState(''),
    [eventFilter, setEventFilter] = useState(''),
    [page, setPage] = useState(1),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<{ kind: string; row: Row } | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [scan, setScan] = useState(''),
    [scanResult, setScanResult] = useState<Row | null>(null),
    [inviteLink, setInviteLink] = useState(''),
    [ticketLink, setTicketLink] = useState(''),
    [confirmRenew, setConfirmRenew] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const homeDirty = useRef(false);
  const setHomeDirty = useCallback((v: boolean) => {
    homeDirty.current = v;
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const active = document.activeElement as HTMLElement,
      old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    navRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
      if (e.key === 'Tab') {
        const els = Array.from(
          navRef.current?.querySelectorAll<HTMLElement>('a,button') || [],
        ).filter((e) => e.offsetParent !== null);
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
        }
      }
    };
    addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      removeEventListener('keydown', key);
      active?.focus();
    };
  }, [mobile]);
  const allowed = tabs.filter(([id]) =>
    user.role === 'checkin'
      ? ['checkin', 'account'].includes(id)
      : user.role === 'editor'
        ? !['admins', 'audit', 'operations'].includes(id)
        : true,
  );
  const go = (id: string) => {
    if (
      id !== tab &&
      homeDirty.current &&
      !confirm('Kaydedilmemiş ana sayfa değişiklikleri var. Kaydetmeden çıkmak istiyor musun?')
    )
      return;
    setTab(id);
    setQ('');
    setQuery('');
    setFilter('');
    setEventFilter('');
    setPage(1);
    setError('');
    setNotice('');
    setData(null);
    setMobile(false);
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Import the QR query parameter after hydration, then remove it from the address bar.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('page') === 'home' && user.role !== 'checkin') setTab('home');
    if (params.get('page') === 'checkin') setTab('checkin');
    const value = params.get('scan');
    if (value) {
      setScan(value);
      setTab('checkin');
      history.replaceState(null, '', '/admin');
    }
  }, [user.role]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  const registrationQuery = new URLSearchParams({
    section: 'registrations',
    q: query,
    status: filter,
    event: eventFilter,
    page: String(page),
  }).toString();
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Each abortable section request resets its loading state before fetching.
  useEffect(() => {
    if (['checkin', 'account', 'media', 'accounts', 'operations', 'home'].includes(tab)) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(
      '/api/admin?' +
        (tab === 'registrations'
          ? registrationQuery
          : new URLSearchParams({
              section: tab,
              page: String(page),
              q: query,
              status: filter,
            }).toString()),
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (r.status === 401) {
          location.href = '/admin/giris';
          return null;
        }
        const d = (await r.json()) as Row;
        if (!r.ok) throw Error(d.error);
        return d;
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [tab, version, page, query, filter, registrationQuery]);
  async function action(payload: Row, endpoint = '/api/admin') {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as Row;
      if (r.status === 401) {
        location.href = '/admin/giris';
        throw Error('Oturumun sona erdi.');
      }
      if (!r.ok) throw Error(d.error || 'İşlem tamamlanamadı.');
      setVersion((v) => v + 1);
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function saveContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      v = (k: string) => String(f.get(k) || '');
    let payload: Row;
    if (modal?.kind === 'event') {
      payload = {
        action: 'event',
        event: {
          id: modal.row.id,
          updatedAt: modal.row.updated_at,
          title: v('title'),
          description: v('description'),
          details: v('details'),
          category: v('category'),
          date: new Date(v('date') + ':00+03:00').toISOString(),
          location: v('location'),
          capacity: Number(v('capacity')),
          question: v('question'),
          imageId: v('imageId'),
          imageAlt: v('imageAlt'),
          published: f.has('published'),
          registrationOpen: f.has('registrationOpen'),
        },
      };
    } else {
      const links = [1, 2, 3]
        .map((i) => ({ label: v('linkLabel' + i), url: v('linkUrl' + i) }))
        .filter((l) => l.url);
      payload = {
        action: 'member',
        member: {
          id: modal?.row.id,
          updatedAt: modal?.row.updated_at,
          name: v('name'),
          slug: v('slug') || slug(v('name')),
          role: v('role'),
          team: v('team'),
          email: v('email'),
          department: v('department'),
          year: v('year'),
          bio: v('bio'),
          photoId: v('photoId'),
          photoAlt: v('photoAlt'),
          skills: v('skills')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean),
          links,
          sortOrder: Number(v('sortOrder')),
          published: f.has('published'),
        },
      };
    }
    const d = await action(payload);
    if (d) {
      setModal(null);
      setNotice('Kaydedildi. Yayındaki içerikler sitede güncellendi.');
    }
  }
  const items = (data?.items || []) as Row[],
    filtered = items;
  const create = (kind: string) => {
    setError('');
    setModal({ kind, row: {} });
  };
  return (
    <div className={'cms ' + (tab === 'home' ? 'cms-editor-view' : '')}>
      <aside
        ref={navRef}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile || undefined}
        aria-label="Yönetim menüsü"
        className={'cms-sidebar ' + (mobile ? 'is-open' : '')}
      >
        <div className="cms-logo">
          <Brand />
          <button
            className="a-icon cms-close"
            aria-label="Menüyü kapat"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <span className="sidebar-caption">KULÜP YÖNETİMİ</span>
        <nav aria-label="Yönetim bölümleri">
          {allowed.map(([id, title, Icon]) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? 'active' : ''}
              onClick={() => go(id)}
            >
              <Icon size={17} />
              {title}
              {tab === id && <span />}
            </button>
          ))}
        </nav>
        <div className="cms-sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            Siteyi görüntüle <ArrowUpRight size={16} />
          </a>
          <div className="cms-user">
            <span>
              {user.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              {user.name}
              <small>{roles[user.role]}</small>
            </div>
            <button
              aria-label="Çıkış yap"
              title="Çıkış yap"
              onClick={async () => {
                if (await action({ action: 'logout' }, '/api/admin/auth'))
                  location.href = '/admin/giris';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button className="cms-scrim" onClick={() => setMobile(false)} aria-label="Menüyü kapat" />
      )}
      <div className="cms-main">
        <header className="cms-topbar">
          <button
            className="a-icon cms-menu-button"
            aria-label="Yönetim menüsünü aç"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>
          <span>
            SCÜ BMK <i>/</i> <b>{tabs.find((t) => t[0] === tab)?.[1]}</b>
          </span>
          <a href="/" target="_blank" rel="noreferrer">
            Siteyi aç <ArrowUpRight size={14} />
          </a>
        </header>
        <main className="cms-content">
          <div className="cms-page-title">
            <div>
              <span className="admin-eyebrow">
                {new Date().toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Europe/Istanbul',
                })}
              </span>
              <h1>{tab === 'overview' ? 'Genel bakış' : tabs.find((t) => t[0] === tab)?.[1]}</h1>
              <p>
                {
                  (
                    {
                      home: 'Ana sayfayı görerek düzenle. Bölümleri taşı, taslağını hazırla ve yayımla.',
                      operations:
                        'Kayıtları, erişimleri, oyun sıralamasını ve sistem durumunu yönet.',
                      overview: 'Kulübün güncel durumu ve son işlemler.',
                      events: 'Etkinlikleri, afişleri ve başvuru durumunu yönet.',
                      accounts:
                        'Kayıtlı üyelerin kartlarını, kulüp unvanlarını ve erişimlerini yönet.',
                      members: 'Ekipteki kişileri ve sitedeki profillerini düzenle.',
                      registrations: 'Başvuruları incele, filtrele ve dışa aktar.',
                      checkin: 'Bileti doğrula ve katılımcının girişini kaydet.',
                      media: 'Etkinlik afişleri ve ekip fotoğrafları.',
                      settings: 'İletişim bağlantıları ve üyelik başvuru ayarları.',
                      admins: 'Yönetici erişimlerini ve davetleri yönet.',
                      audit: 'Kim, ne zaman, hangi işlemi yaptı?',
                      account: 'Hesap bilgilerin ve şifre ayarların.',
                    } as Row
                  )[tab]
                }
              </p>
            </div>
            {['overview', 'events', 'members'].includes(tab) && (
              <button
                className="a-button"
                onClick={() => create(tab === 'members' ? 'member' : 'event')}
              >
                <Plus size={17} />
                {tab === 'members' ? 'Üye ekle' : 'Etkinlik ekle'}
              </button>
            )}
            {tab === 'admins' && (
              <button className="a-button" onClick={() => create('invite')}>
                <Plus size={17} />
                Yönetici davet et
              </button>
            )}
          </div>
          {error && !modal && (
            <div className="a-error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="a-success" role="status">
              <Check size={16} />
              {notice}
              <button onClick={() => setNotice('')} aria-label="Bildirimi kapat">
                <X size={14} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="a-loading" role="status">
              Veriler yükleniyor…
            </div>
          ) : (
            <>
              {tab === 'home' && <HomeEditor onDirty={setHomeDirty} />}
              {tab === 'accounts' && <Accounts />}
              {tab === 'operations' && <Operations />}
              {tab === 'overview' && data && (
                <>
                  <div className="cms-stats">
                    {[
                      [
                        data.events?.total || 0,
                        'Etkinlik',
                        'Arşiv dışındaki etkinlikler',
                        CalendarDays,
                      ],
                      [
                        data.registrations?.total || 0,
                        'Başvuru',
                        'Etkinlik ve üyelik formları',
                        ClipboardList,
                      ],
                      [
                        data.members?.total || 0,
                        'Ekip profili',
                        `${data.members?.published || 0} profil sitede yayında`,
                        Users,
                      ],
                      [
                        data.registrations?.checked || 0,
                        'Giriş yapan',
                        'QR bileti doğrulanan katılımcı',
                        ScanLine,
                      ],
                    ].map(([n, label, sub, Icon]) => {
                      const I = Icon as typeof Users;
                      return (
                        <div key={String(label)}>
                          <span>
                            {String(label)}
                            <I size={17} />
                          </span>
                          <strong>{String(n)}</strong>
                          <small>{String(sub)}</small>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cms-two">
                    <section className="a-panel">
                      <div className="a-panel-head">
                        <h2>Son başvurular</h2>
                        <button className="a-link" onClick={() => go('registrations')}>
                          Tümünü gör
                        </button>
                      </div>
                      {data.recent?.length ? (
                        <div className="recent-list">
                          {data.recent.map((r: Row) => (
                            <div key={r.id}>
                              <span className="tiny-avatar">{r.name[0]}</span>
                              <div>
                                <strong>{r.name}</strong>
                                <small>{r.event_title}</small>
                              </div>
                              <time>{date(r.created_at)}</time>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty
                          title="Henüz başvuru yok"
                          text="Etkinliğini yayımlayıp başvuruları açtığında kayıtlar burada görünür."
                        />
                      )}
                    </section>
                    <section className="a-panel">
                      <div className="a-panel-head">
                        <h2>Hızlı işlemler</h2>
                      </div>
                      <div className="quick-list">
                        {[
                          [
                            CalendarDays,
                            'Etkinlik oluştur',
                            'Afiş, tarih ve başvuru ayarları',
                            'event',
                          ],
                          [
                            Users,
                            'Ekibe üye ekle',
                            'Fotoğraf, görev ve profil bilgileri',
                            'member',
                          ],
                          [
                            PanelsTopLeft,
                            'Ana sayfayı düzenle',
                            'Anlık önizleme, bölüm sırası ve içerikler',
                            'home',
                          ],
                          [ScanLine, 'Bilet kontrolüne geç', 'QR ile katılımcı girişi', 'checkin'],
                        ].map(([Icon, title, desc, id]) => {
                          const I = Icon as typeof Users;
                          return (
                            <button
                              key={String(id)}
                              onClick={() =>
                                ['event', 'member'].includes(String(id))
                                  ? create(String(id))
                                  : go(String(id))
                              }
                            >
                              <I size={18} />
                              <div>
                                <strong>{String(title)}</strong>
                                <small>{String(desc)}</small>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                  <section className="a-panel">
                    <div className="a-panel-head">
                      <h2>Yaklaşan etkinlikler</h2>
                      <button className="a-link" onClick={() => go('events')}>
                        Etkinliklere git
                      </button>
                    </div>
                    {data.next?.length ? (
                      data.next.map((e: Row) => (
                        <div key={e.id} className="upcoming-row">
                          <CalendarDays size={19} />
                          <div>
                            <strong>{e.title}</strong>
                            <small>
                              {date(e.date)} · {e.location}
                            </small>
                          </div>
                          <span className={'a-badge ' + (e.published ? '' : 'draft')}>
                            {e.published ? 'Yayında' : 'Taslak'}
                          </span>
                          <button
                            className="a-link"
                            onClick={() => {
                              setError('');
                              fetch('/api/admin?section=events')
                                .then(async (r) => {
                                  const d = (await r.json()) as Row;
                                  if (!r.ok) throw Error(d.error);
                                  return d;
                                })
                                .then((d) =>
                                  setModal({
                                    kind: 'event',
                                    row: d.items.find((x: Row) => x.id === e.id),
                                  }),
                                )
                                .catch((e) => setError(e.message));
                            }}
                          >
                            Düzenle
                          </button>
                        </div>
                      ))
                    ) : (
                      <Empty
                        title="Yaklaşan etkinlik yok"
                        text="Yeni bir etkinlik ekleyerek takvimi hazırlayabilirsin."
                      />
                    )}
                  </section>
                </>
              )}
              {['events', 'members'].includes(tab) && (
                <section className="a-panel">
                  <div className="cms-toolbar">
                    <label className="a-search">
                      <Search size={16} />
                      <input
                        aria-label={tab === 'events' ? 'Etkinlik ara' : 'Üye ara'}
                        placeholder={tab === 'events' ? 'Etkinlik ara…' : 'İsim veya görev ara…'}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Yayın durumu"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tümü</option>
                      <option value="published">Yayında</option>
                      <option value="draft">Taslak</option>
                      <option value="archived">Arşiv</option>
                    </select>
                    <span>{filtered.length} kayıt</span>
                  </div>
                  {filtered.length ? (
                    <div className="a-table-wrap">
                      <table className="a-table">
                        <thead>
                          <tr>
                            <th>{tab === 'events' ? 'Etkinlik' : 'Üye'}</th>
                            <th>{tab === 'events' ? 'Tarih & yer' : 'Görev & ekip'}</th>
                            <th>{tab === 'events' ? 'Başvuru' : 'Profil'}</th>
                            <th>Durum</th>
                            <th>
                              <span className="sr-only">İşlemler</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <div className="table-person">
                                  {r.image_id || r.photo_id ? (
                                    <img src={'/api/media/' + (r.image_id || r.photo_id)} alt="" />
                                  ) : (
                                    <span className="table-image-placeholder">
                                      {tab === 'events' ? <CalendarDays size={19} /> : r.name?.[0]}
                                    </span>
                                  )}
                                  <div>
                                    <strong>{r.title || r.name}</strong>
                                    <small>
                                      {tab === 'events'
                                        ? r.category
                                        : r.email || 'E-posta eklenmedi'}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <strong>{tab === 'events' ? date(r.date) : r.role}</strong>
                                <small>{tab === 'events' ? r.location : r.team || '—'}</small>
                              </td>
                              <td>
                                {tab === 'events' ? (
                                  <>
                                    <strong>
                                      {r.count || 0} / {r.capacity}
                                    </strong>
                                    <small>
                                      {r.registration_open ? 'Kayıt açık' : 'Kayıt kapalı'}
                                    </small>
                                  </>
                                ) : r.published && !r.archived ? (
                                  <a
                                    className="a-link"
                                    href={'/ekip/' + r.slug}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Görüntüle ↗
                                  </a>
                                ) : (
                                  <span className="a-muted">Yayında değil</span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={
                                    'a-badge ' + (!r.published || r.archived ? 'draft' : '')
                                  }
                                >
                                  {r.archived ? 'Arşiv' : r.published ? 'Yayında' : 'Taslak'}
                                </span>
                              </td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    onClick={() => {
                                      setError('');
                                      setModal({
                                        kind: tab === 'events' ? 'event' : 'member',
                                        row: r,
                                      });
                                    }}
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={async () => {
                                      if (
                                        await action({
                                          action: 'archive',
                                          table: tab,
                                          id: r.id,
                                          archived: !r.archived,
                                        })
                                      )
                                        setNotice(
                                          r.archived
                                            ? 'Kayıt arşivden çıkarıldı.'
                                            : 'Arşive taşındı. Arşiv filtresinden geri alabilirsin.',
                                        );
                                    }}
                                  >
                                    {r.archived ? 'Geri al' : 'Arşivle'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title={
                        query || filter
                          ? 'Eşleşen kayıt yok'
                          : tab === 'events'
                            ? 'İlk etkinliğini ekle'
                            : 'Ekibini tanıtmaya başla'
                      }
                      text={
                        query || filter
                          ? 'Arama veya filtreyi değiştirmeyi deneyebilirsin.'
                          : tab === 'events'
                            ? 'Tarih, yer ve afiş ekle. Hazır olana kadar taslak olarak sakla.'
                            : 'Üyelerin fotoğraflarını ve bilgilerini buradan ekleyebilirsin.'
                      }
                      action={
                        !query &&
                        !filter && (
                          <button
                            className="a-button secondary"
                            onClick={() => create(tab === 'events' ? 'event' : 'member')}
                          >
                            <Plus size={16} />
                            Yeni kayıt
                          </button>
                        )
                      }
                    />
                  )}
                  <div className="a-pagination">
                    <span>
                      {data?.total || 0} kayıt · Sayfa {page}
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
                      disabled={page * 30 >= (data?.total || 0)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </section>
              )}
              {tab === 'registrations' && (
                <section className="a-panel">
                  <div className="cms-toolbar">
                    <label className="a-search">
                      <Search size={16} />
                      <input
                        aria-label="Başvurularda ara"
                        placeholder="Ad veya e-posta ara…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Etkinlik filtresi"
                      value={eventFilter}
                      onChange={(e) => {
                        setEventFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tüm başvurular</option>
                      <option value="membership">Kulüp üyeliği</option>
                      {data?.events?.map((e: Row) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Giriş durumu"
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Tüm durumlar</option>
                      <option value="waiting">Giriş bekleyen</option>
                      <option value="checked">Giriş yapan</option>
                    </select>
                    <a
                      className="a-button secondary"
                      href={'/api/admin?' + registrationQuery + '&format=csv'}
                    >
                      <Download size={15} />
                      CSV indir
                    </a>
                  </div>
                  {items.length ? (
                    <div className="a-table-wrap">
                      <table className="a-table">
                        <thead>
                          <tr>
                            <th>Katılımcı</th>
                            <th>Başvuru</th>
                            <th>Bölüm</th>
                            <th>Durum</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.name}</strong>
                                <small>{r.email}</small>
                              </td>
                              <td>
                                <strong>{r.event_title}</strong>
                                <small>{date(r.created_at)}</small>
                              </td>
                              <td>
                                <strong>{r.department}</strong>
                                <small>{r.year}</small>
                              </td>
                              <td>
                                <span className={'a-badge ' + (!r.checked_in_at ? 'draft' : '')}>
                                  {r.checked_in_at ? 'Giriş yaptı' : 'Bekliyor'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="a-link"
                                  onClick={() => {
                                    setDetail(r);
                                    setTicketLink('');
                                    setConfirmRenew(false);
                                  }}
                                >
                                  İncele
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title="Başvuru bulunamadı"
                      text="Yeni başvurular burada listelenir. Filtre kullanıyorsan seçimini değiştirebilirsin."
                    />
                  )}
                  <div className="a-pagination">
                    <span>
                      {data?.total || 0} başvuru · Sayfa {page}
                    </span>
                    <button
                      className="a-icon"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Önceki sayfa"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="a-icon"
                      disabled={page * 30 >= (data?.total || 0)}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Sonraki sayfa"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </section>
              )}
              {tab === 'checkin' && (
                <section className="a-panel checkin-panel">
                  <h2>QR bileti okut</h2>
                  <p>
                    Kamerayla tara veya biletin görselini seç. Okunan kodu onayladığında giriş
                    kaydedilir.
                  </p>
                  <QrScanner
                    disabled={busy}
                    onReset={() => {
                      setScan('');
                      setScanResult(null);
                      setError('');
                    }}
                    onRead={(code) => {
                      setScan(code);
                      setScanResult(null);
                      setError('');
                    }}
                  />
                  {scanResult && (
                    <div className="a-success" role="status">
                      <Check />
                      <div>
                        <strong>{scanResult.name}</strong>
                        <br />
                        {scanResult.eventTitle} · Giriş kaydedildi
                      </div>
                    </div>
                  )}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setScanResult(null);
                      const code = parseCheckinCode(scan, location.origin);
                      if (!code) {
                        setError('Geçerli bir bilet kodu veya bu siteye ait QR bağlantısını gir.');
                        return;
                      }
                      const d = await action({ action: 'checkin', token: code });
                      if (d) {
                        setScanResult(d.registration);
                        setScan('');
                      }
                    }}
                  >
                    <label className="a-field">
                      Bilet kodu veya QR bağlantısı
                      <input
                        maxLength={1024}
                        name="scan"
                        autoComplete="off"
                        placeholder="QR bağlantısını yapıştır"
                        value={scan}
                        onChange={(e) => setScan(e.target.value)}
                        required
                      />
                    </label>
                    <button className="a-button" disabled={busy}>
                      {busy ? 'Kontrol ediliyor…' : 'Bileti doğrula ve girişi kaydet'}
                      <Check size={16} />
                    </button>
                  </form>
                  <small>Aynı bilet yalnızca bir kez giriş yapabilir.</small>
                </section>
              )}
              {tab === 'media' && (
                <section className="a-panel">
                  <MediaLibrary />
                </section>
              )}
              {tab === 'settings' && data && (
                <section className="a-panel settings-panel">
                  <form
                    key={version}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget),
                        s: Row = {};
                      for (const key of Object.keys(defaultSettings))
                        s[key] =
                          key === 'membershipOpen'
                            ? f.has(key)
                            : ['instagram', 'contactEmail'].includes(key)
                              ? String(f.get(key) || '')
                              : data.settings[key];
                      if (await action({ action: 'settings', settings: s, version: data.version }))
                        setNotice('Site ayarları kaydedildi.');
                    }}
                  >
                    <h2>Ana sayfanın tasarımı</h2>
                    <p className="a-muted">
                      Metinleri, görselleri ve bölüm sırasını canlı önizlemeli düzenleyiciden yönet.
                    </p>
                    <button className="a-button secondary" type="button" onClick={() => go('home')}>
                      Sayfa düzenleyiciyi aç
                    </button>
                    <h2 className="form-section-title">İletişim</h2>
                    <Field
                      label="Instagram bağlantısı"
                      name="instagram"
                      value={data.settings.instagram}
                      type="url"
                      required
                      max={500}
                    />
                    <Field
                      label="İletişim e-posta adresi"
                      name="contactEmail"
                      value={data.settings.contactEmail}
                      type="email"
                    />
                    <h2 className="form-section-title">Üyelik başvuruları</h2>
                    <Toggle
                      name="membershipOpen"
                      label="Hesapsız üyelik başvuru formu açık"
                      checked={data.settings.membershipOpen}
                      hint="Bu eski başvuru formu içindir. Yeni Üye ol sayfası ve dijital kart hesapları ayrı çalışır."
                    />
                    <div className="a-form-footer">
                      <button className="a-button" disabled={busy}>
                        {busy ? 'Kaydediliyor…' : 'Ayarları kaydet'}
                        <Check size={16} />
                      </button>
                    </div>
                  </form>
                </section>
              )}
              {tab === 'admins' && data && (
                <>
                  <section className="a-panel">
                    <div className="a-panel-head">
                      <h2>Yetkili hesaplar</h2>
                      <span>{items.length} hesap</span>
                    </div>
                    <div className="a-table-wrap">
                      <table className="a-table">
                        <thead>
                          <tr>
                            <th>Yönetici</th>
                            <th>Yetki</th>
                            <th>Durum</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <strong>{a.name}</strong>
                                <small>{a.email}</small>
                              </td>
                              <td>{roles[a.role as keyof typeof roles]}</td>
                              <td>
                                <span className={'a-badge ' + (!a.active ? 'draft' : '')}>
                                  {a.active ? 'Aktif' : 'Erişim kapalı'}
                                </span>
                              </td>
                              <td>
                                {a.role !== 'owner' && (
                                  <button
                                    className="a-link"
                                    disabled={busy}
                                    onClick={async () => {
                                      if (
                                        await action({
                                          action: 'admin-status',
                                          id: a.id,
                                          active: !a.active,
                                        })
                                      )
                                        setNotice('Erişim güncellendi.');
                                    }}
                                  >
                                    {a.active ? 'Erişimi kapat' : 'Erişimi aç'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="a-panel">
                    <div className="a-panel-head">
                      <h2>Bekleyen davetler</h2>
                    </div>
                    {inviteLink && (
                      <div className="invite-link">
                        <label className="a-field">
                          Yeni davet bağlantısı
                          <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                        </label>
                        <button
                          className="a-button secondary"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(inviteLink);
                              setNotice('Davet bağlantısı kopyalandı.');
                            } catch {
                              setError('Bağlantıyı seçip elle kopyalayabilirsin.');
                            }
                          }}
                        >
                          <Copy size={16} />
                          Kopyala
                        </button>
                        <p>
                          Bu bağlantıyı davet ettiğin kişiye ilet. 72 saat geçerlidir; e-posta
                          otomatik gönderilmez.
                        </p>
                      </div>
                    )}
                    {data.invites?.length ? (
                      data.invites.map((i: Row) => (
                        <div className="upcoming-row" key={i.id}>
                          <div>
                            <strong>{i.name}</strong>
                            <small>
                              {i.email} · {roles[i.role as keyof typeof roles]} · Son:{' '}
                              {date(i.expires_at)}
                            </small>
                          </div>
                          <button
                            className="a-link"
                            disabled={busy}
                            onClick={() => action({ action: 'cancel-invite', id: i.id })}
                          >
                            İptal et
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="a-muted">Bekleyen davet yok.</p>
                    )}
                  </section>
                  <div className="a-role-note">
                    <strong>Yetkiler</strong>
                    <p>
                      İçerik yöneticisi: etkinlik, üye, görsel, başvuru ve site ayarları. Giriş
                      görevlisi: yalnızca bilet kontrolü. Yönetici davetlerini ve erişimleri site
                      sahibi yönetir.
                    </p>
                  </div>
                </>
              )}
              {tab === 'audit' && (
                <section className="a-panel">
                  {items.length ? (
                    <div className="audit-list">
                      {items.map((a, i) => (
                        <div key={i}>
                          <History size={16} />
                          <div>
                            <strong>{a.action}</strong>
                            <p>{a.target}</p>
                            <small>{a.actor_name}</small>
                          </div>
                          <time>{date(a.created_at)}</time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="a-muted">İşlem kaydı yok.</p>
                  )}
                  <div className="a-pagination">
                    <span>Sayfa {page}</span>
                    <button
                      className="a-icon"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      aria-label="Önceki sayfa"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="a-icon"
                      disabled={items.length < 30}
                      onClick={() => setPage((p) => p + 1)}
                      aria-label="Sonraki sayfa"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </section>
              )}
              {tab === 'account' && (
                <section className="a-panel settings-panel">
                  <h2>{user.name}</h2>
                  <p className="account-email">
                    {user.email} <span className="a-badge">{roles[user.role]}</span>
                  </p>
                  <h2 className="form-section-title">Şifre değiştir</h2>
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
                        await action(
                          {
                            action: 'password',
                            current: f.get('current'),
                            password: f.get('password'),
                          },
                          '/api/admin/auth',
                        )
                      ) {
                        form.reset();
                        setNotice('Şifren değiştirildi. Diğer cihazlardaki oturumların kapatıldı.');
                      }
                    }}
                  >
                    <label className="a-field">
                      Mevcut şifre
                      <input
                        type="password"
                        name="current"
                        autoComplete="current-password"
                        required
                        maxLength={72}
                      />
                    </label>
                    <label className="a-field">
                      Yeni şifre
                      <input
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                      />
                      <small>En az 12 karakter.</small>
                    </label>
                    <label className="a-field">
                      Yeni şifre tekrar
                      <input
                        type="password"
                        name="confirm"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={72}
                      />
                    </label>
                    <button className="a-button" disabled={busy}>
                      Şifreyi değiştir
                    </button>
                  </form>
                  <button
                    className="a-button secondary account-logout"
                    onClick={async () => {
                      if (await action({ action: 'logout' }, '/api/admin/auth'))
                        location.href = '/admin/giris';
                    }}
                  >
                    <LogOut size={16} />
                    Çıkış yap
                  </button>
                </section>
              )}
            </>
          )}
        </main>
      </div>
      {modal && (
        <Modal
          title={
            modal.kind === 'invite'
              ? 'Yönetici davet et'
              : modal.kind === 'event'
                ? modal.row.id
                  ? 'Etkinliği düzenle'
                  : 'Etkinlik ekle'
                : modal.row.id
                  ? 'Üyeyi düzenle'
                  : 'Üye ekle'
          }
          close={() => {
            if (!busy) {
              setModal(null);
              setError('');
            }
          }}
        >
          {error && (
            <div className="a-error" role="alert">
              {error}
            </div>
          )}
          {modal.kind === 'invite' ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const d = await action({
                  action: 'invite',
                  name: f.get('name'),
                  email: f.get('email'),
                  role: f.get('role'),
                });
                if (d) {
                  setInviteLink(d.link);
                  setModal(null);
                  setNotice('Davet bağlantısı hazır. Aşağıdan kopyalayıp paylaşabilirsin.');
                }
              }}
            >
              <Field label="Ad soyad" name="name" required max={80} />
              <Field label="E-posta" name="email" type="email" required />
              <label className="a-field">
                Yetki
                <select name="role">
                  <option value="editor">İçerik yöneticisi</option>
                  <option value="checkin">Giriş görevlisi</option>
                </select>
              </label>
              <p className="a-muted">
                Kişi, davet bağlantısını açarak kendi şifresini belirler. E-posta otomatik
                gönderilmez.
              </p>
              <div className="a-form-footer">
                <button className="a-button" disabled={busy}>
                  Davet bağlantısı oluştur
                </button>
              </div>
            </form>
          ) : (
            <form key={modal.kind + modal.row.id} onSubmit={saveContent}>
              {modal.kind === 'event' ? (
                <>
                  <div className="a-form-grid">
                    <div className="span-2">
                      <Field
                        label="Etkinlik adı"
                        name="title"
                        value={modal.row.title}
                        required
                        max={120}
                      />
                    </div>
                    <label className="a-field">
                      Kategori
                      <select name="category" defaultValue={modal.row.category || 'Buluşma'}>
                        {['Buluşma', 'Atölye', 'Hackathon', 'Söyleşi', 'Gezi', 'Diğer'].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label className="a-field">
                      Tarih ve saat (Türkiye)
                      <input
                        type="datetime-local"
                        name="date"
                        required
                        defaultValue={inputDate(modal.row.date)}
                      />
                    </label>
                    <Field
                      label="Yer"
                      name="location"
                      value={modal.row.location}
                      required
                      max={160}
                    />
                    <label className="a-field">
                      Kontenjan
                      <input
                        type="number"
                        name="capacity"
                        min={Math.max(1, modal.row.count || 0)}
                        max={10000}
                        required
                        defaultValue={modal.row.capacity || 50}
                      />
                      <small>Mevcut başvuru sayısından az olamaz.</small>
                    </label>
                  </div>
                  <Area
                    label="Kısa açıklama"
                    name="description"
                    value={modal.row.description}
                    max={800}
                  />
                  <Area
                    label="Etkinlik ayrıntıları ve program"
                    name="details"
                    value={modal.row.details}
                    max={5000}
                  />
                  <MediaPicker
                    name="imageId"
                    label="Etkinlik afişi / kapak görseli"
                    initial={modal.row.image_id}
                  />
                  <Field label="Görsel açıklaması" name="imageAlt" value={modal.row.image_alt} />
                  <Field
                    label="Başvuru formundaki ek soru (isteğe bağlı)"
                    name="question"
                    value={modal.row.question}
                    max={240}
                  />
                  <div className="a-publish-box">
                    <Toggle
                      name="published"
                      label="Etkinlik sitede yayımlansın"
                      checked={!!modal.row.published}
                      hint="Kapalıyken yalnızca yönetim panelinde görünür."
                    />
                    <Toggle
                      name="registrationOpen"
                      label="Başvurular açık"
                      checked={!!modal.row.registration_open}
                      hint="Yayındaki etkinliğin formunu ziyaretçilere açar."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="a-form-grid">
                    <Field label="Ad soyad" name="name" value={modal.row.name} required max={100} />
                    <Field label="Görevi" name="role" value={modal.row.role} required max={100} />
                    <Field label="Ekip / komite" name="team" value={modal.row.team} max={100} />
                    <Field
                      label="E-posta (yalnızca yönetimde)"
                      name="email"
                      value={modal.row.email}
                      type="email"
                    />
                    <Field label="Bölüm" name="department" value={modal.row.department} max={100} />
                    <Field label="Sınıf / mezuniyet" name="year" value={modal.row.year} max={50} />
                  </div>
                  <Area label="Hakkında" name="bio" value={modal.row.bio} />
                  <MediaPicker
                    name="photoId"
                    label="Profil fotoğrafı"
                    initial={modal.row.photo_id}
                  />
                  <Field label="Fotoğraf açıklaması" name="photoAlt" value={modal.row.photo_alt} />
                  <Field
                    label="İlgi alanları"
                    name="skills"
                    value={parseList<string>(modal.row.skills || '[]').join(', ')}
                    max={500}
                    hint="Virgülle ayır. Örnek: Web geliştirme, tasarım, robotik"
                  />
                  <h3 className="form-section-title">Profil bağlantıları</h3>
                  {[1, 2, 3].map((i) => {
                    const l = parseList<{ label: string; url: string }>(modal.row.links || '[]')[
                      i - 1
                    ];
                    return (
                      <div className="a-form-grid" key={i}>
                        <Field
                          label={'Bağlantı ' + i + ' adı'}
                          name={'linkLabel' + i}
                          value={l?.label}
                          max={40}
                        />
                        <Field
                          label="Bağlantı adresi"
                          name={'linkUrl' + i}
                          value={l?.url}
                          type="url"
                          max={500}
                        />
                      </div>
                    );
                  })}
                  <div className="a-form-grid">
                    <Field
                      label="Profil adresi"
                      name="slug"
                      value={modal.row.slug}
                      max={100}
                      hint="Boşsa isimden oluşturulur. Örnek: ad-soyad"
                    />
                    <label className="a-field">
                      Sıralama
                      <input
                        type="number"
                        name="sortOrder"
                        min={0}
                        max={9999}
                        defaultValue={modal.row.sort_order || 0}
                      />
                      <small>Küçük değerler önce görünür.</small>
                    </label>
                  </div>
                  <div className="a-publish-box">
                    <Toggle
                      name="published"
                      label="Profil ekip sayfasında yayımlansın"
                      checked={!!modal.row.published}
                      hint="Özel e-posta adresi profil sayfasında görünmez."
                    />
                  </div>
                </>
              )}
              <div className="a-form-footer">
                <button
                  type="button"
                  className="a-button secondary"
                  disabled={busy}
                  onClick={() => {
                    setModal(null);
                    setError('');
                  }}
                >
                  Vazgeç
                </button>
                <button className="a-button" disabled={busy}>
                  {busy ? 'Kaydediliyor…' : 'Kaydet'}
                  <Check size={16} />
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {detail && (
        <Modal title="Başvuru ayrıntısı" close={() => setDetail(null)}>
          <dl className="registration-detail">
            {[
              ['Ad soyad', detail.name],
              ['E-posta', detail.email],
              ['Başvuru', detail.event_title],
              ['Bölüm / sınıf', detail.department + ' · ' + detail.year],
              ['Yanıt', detail.answer || 'Yanıt verilmedi'],
              ['Başvuru zamanı', date(detail.created_at)],
              ['Giriş', detail.checked_in_at ? date(detail.checked_in_at) : 'Henüz giriş yapmadı'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="ticket-renew">
            <h3>Biletini kaybeden katılımcı</h3>
            <p className="a-muted">
              Katılımcının kimliğini doğruladıktan sonra yeni bir bağlantı oluşturabilirsin. Önceki
              bilet bağlantısı ve QR geçersiz olur. Daha önce yapılan giriş kaydı korunur.
            </p>
            {ticketLink ? (
              <>
                <label className="a-field">
                  Yeni bilet bağlantısı
                  <input readOnly value={ticketLink} onFocus={(e) => e.target.select()} />
                </label>
                <button
                  className="a-button secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(ticketLink);
                      setNotice('Bilet bağlantısı kopyalandı.');
                    } catch {
                      setError('Bağlantıyı seçerek elle kopyalayabilirsin.');
                    }
                  }}
                >
                  <Copy size={15} />
                  Bağlantıyı kopyala
                </button>
                <p className="a-muted">
                  Bağlantıyı yalnızca ilgili katılımcıyla paylaş. Otomatik mesaj gönderilmez.
                </p>
              </>
            ) : confirmRenew ? (
              <div className="renew-confirm">
                <p>Bu kişinin eski QR kodunu geçersiz kılmak istediğinden emin misin?</p>
                <button
                  className="a-button"
                  disabled={busy}
                  onClick={async () => {
                    const d = await action({ action: 'renew-ticket', id: detail.id });
                    if (d) {
                      setTicketLink(d.link);
                      setConfirmRenew(false);
                    }
                  }}
                >
                  Evet, yeni bilet oluştur
                </button>
                <button className="a-link" onClick={() => setConfirmRenew(false)}>
                  Vazgeç
                </button>
              </div>
            ) : (
              <button className="a-button secondary" onClick={() => setConfirmRenew(true)}>
                Bilet bağlantısını yenile
              </button>
            )}
            {error && (
              <p className="a-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
