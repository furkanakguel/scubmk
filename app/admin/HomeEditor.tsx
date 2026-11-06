'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Copy,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  History,
  Layers,
  Maximize2,
  Minimize2,
  Monitor,
  MousePointer2,
  Plus,
  Redo2,
  Save,
  Send,
  Settings2,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  builtins,
  customKinds,
  homeDocumentSchema,
  newHomeSection,
  publishDocumentSchema,
  sectionNames,
  type HomeDocument,
  type HomeEditorState,
  type HomeSection,
} from '../home/model';
import MediaPicker from './MediaPicker';
const time = (n: number) =>
  n
    ? new Date(n).toLocaleString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul',
      })
    : 'Henüz yayımlanmadı';
const isCustom = (s: HomeSection) => !(builtins as readonly string[]).includes(s.kind);
function Dialog({
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
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const nodes = [
          ...ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a'),
        ];
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
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
    <div className="he-dialog-backdrop">
      <div className="he-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header>
          <h2>{title}</h2>
          <button className="a-icon" aria-label="Pencereyi kapat" onClick={close}>
            <X size={17} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
function TextField({
  label,
  value,
  onChange,
  max = 160,
  area = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  max?: number;
  area?: boolean;
  hint?: string;
}) {
  return (
    <label className="he-field">
      <span>
        {label}
        <small>
          {value.length}/{max}
        </small>
      </span>
      {area ? (
        <textarea
          value={value}
          maxLength={max}
          rows={max > 500 ? 5 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      )}{' '}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export default function HomeEditor({ onDirty }: { onDirty: (v: boolean) => void }) {
  const [state, setState] = useState<HomeEditorState | null>(null),
    [doc, setDoc] = useState<HomeDocument | null>(null),
    [saved, setSaved] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const [selected, setSelected] = useState('hero'),
    [panel, setPanel] = useState<'content' | 'sections' | 'history'>('sections'),
    [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop'),
    [mode, setMode] = useState(false),
    [full, setFull] = useState(false),
    [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit'),
    [ready, setReady] = useState(false),
    [previewHandshake, setPreviewHandshake] = useState(0),
    [previewError, setPreviewError] = useState(false),
    [reload, setReload] = useState(0),
    [channel, setChannel] = useState(''),
    [focus, setFocus] = useState(0);
  const [adding, setAdding] = useState(false),
    [insertAfter, setInsertAfter] = useState('hero'),
    [publishOpen, setPublishOpen] = useState(false),
    [past, setPast] = useState<HomeDocument[]>([]),
    [future, setFuture] = useState<HomeDocument[]>([]),
    [dragging, setDragging] = useState(''),
    [dropTarget, setDropTarget] = useState(''),
    [size, setSize] = useState({ width: 600, height: 650 });
  const frame = useRef<HTMLIFrameElement>(null),
    stage = useRef<HTMLDivElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    current = useRef(doc),
    lastEdit = useRef(0),
    busyRef = useRef(false);
  useEffect(() => {
    current.current = doc;
  }, [doc]);
  const hasDocument = !!doc;
  const dirty = !!doc && JSON.stringify(doc) !== saved,
    active = doc?.sections.find((s) => s.id === selected) || doc?.sections[0];
  const closePublish = useCallback(() => setPublishOpen(false), []),
    closeAdd = useCallback(() => setAdding(false), []);
  const load = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/home', { cache: 'no-store' });
      const d = (await r.json()) as HomeEditorState & { error?: string };
      if (!r.ok) throw Error(d.error || 'Düzenleyici yüklenemedi.');
      setState(d);
      setDoc(d.draft);
      setSaved(JSON.stringify(d.draft));
      setPast([]);
      setFuture([]);
      setConflict(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bağlantı kurulamadı.');
    } finally {
      setBusy(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch the authenticated editor state and establish a per-mount preview channel after hydration.
  useEffect(() => {
    void load();
    setChannel(crypto.randomUUID());
    if (matchMedia('(max-width:680px)').matches) setDevice('mobile');
  }, [load]);
  useEffect(() => {
    onDirty(dirty);
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    addEventListener('beforeunload', leave);
    return () => {
      removeEventListener('beforeunload', leave);
      onDirty(false);
    };
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [hasDocument, mobileView, full]);
  useEffect(() => {
    if (!channel) return;
    const receive = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow ||
        e.data?.channel !== channel
      )
        return;
      if (e.data.type === 'bmk-home-ready') {
        setReady(true);
        setPreviewHandshake((v) => v + 1);
        setPreviewError(false);
      }
      if (
        e.data.type === 'bmk-home-select' &&
        current.current?.sections.some((s) => s.id === e.data.id)
      ) {
        setSelected(e.data.id);
        setPanel('content');
      }
    };
    addEventListener('message', receive);
    return () => removeEventListener('message', receive);
  }, [channel]);
  useEffect(() => {
    if (!ready || !doc) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'bmk-home-update', channel, document: doc, selected, interactive: mode, focus },
      location.origin,
    );
  }, [doc, selected, mode, focus, ready, channel, previewHandshake]);
  useEffect(() => {
    if (!channel || ready) return;
    const t = setTimeout(() => setPreviewError(true), 16000);
    return () => clearTimeout(t);
  }, [channel, ready, reload]);
  // eslint-disable-next-line react-hooks/purity -- This event handler timestamps edits to group successive keystrokes in undo history; it never runs during render.
  function update(next: HomeDocument, group = false) {
    const prev = current.current;
    if (!prev || JSON.stringify(prev) === JSON.stringify(next)) return;
    const now = Date.now();
    if (!group || now - lastEdit.current > 750) setPast((p) => [...p.slice(-39), prev]);
    lastEdit.current = now;
    setFuture([]);
    setDoc(next);
    setNotice('');
  }
  function patch(value: Partial<HomeSection>) {
    if (doc && active)
      update(
        {
          ...doc,
          sections: doc.sections.map((s) => (s.id === active.id ? { ...s, ...value } : s)),
        },
        true,
      );
  }
  function select(id: string, edit = false) {
    setSelected(id);
    setFocus((v) => v + 1);
    if (edit) setPanel('content');
  }
  function move(id: string, to: number) {
    if (!doc || id === 'hero') return;
    const sections = [...doc.sections],
      from = sections.findIndex((s) => s.id === id);
    if (from < 0) return;
    const [s] = sections.splice(from, 1);
    sections.splice(Math.max(1, Math.min(to, sections.length)), 0, s);
    update({ ...doc, sections });
    setNotice(s.label + ' yeni yerine taşındı.');
    setFocus((v) => v + 1);
  }
  function undo() {
    if (!doc || !past.length) return;
    setFuture((f) => [doc, ...f]);
    setDoc(past.at(-1)!);
    setPast((p) => p.slice(0, -1));
    lastEdit.current = 0;
  }
  function redo() {
    if (!doc || !future.length) return;
    setPast((p) => [...p, doc]);
    setDoc(future[0]);
    setFuture((f) => f.slice(1));
    lastEdit.current = 0;
  }
  async function save(action: 'draft' | 'publish') {
    if (!doc || !state || busyRef.current) return;
    const valid = (action === 'publish' ? publishDocumentSchema : homeDocumentSchema).safeParse(
      doc,
    );
    if (!valid.success) {
      setError(valid.error.issues[0].message);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/admin/home', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, revision: state.revision, document: doc }),
        }),
        d = (await r.json()) as HomeEditorState & { error?: string };
      if (!r.ok) {
        if (r.status === 409) setConflict(true);
        throw Error(d.error || 'Kaydedilemedi.');
      }
      setState(d);
      setSaved(JSON.stringify(d.draft));
      setNotice(
        action === 'publish'
          ? 'Ana sayfa yayımlandı. Ziyaretçiler artık bu sürümü görüyor.'
          : 'Taslak kaydedildi. Canlı site değişmedi.',
      );
      setPublishOpen(false);
      setConflict(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Bağlantı kesildi. Değişikliklerin bu ekranda duruyor; yeniden deneyebilirsin.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveRef.current('draft');
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, []);
  function download() {
    if (!doc) return;
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
      ),
      a = document.createElement('a');
    a.href = url;
    a.download = 'bmk-anasayfa-taslak.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 180000) throw Error('Dosya en fazla 180 KB olabilir.');
      const parsed = homeDocumentSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw Error('Bu dosya geçerli bir BMK ana sayfa taslağı değil.');
      update(parsed.data);
      setSelected('hero');
      setNotice('Dosya taslağa alındı. Canlı site henüz değişmedi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı.');
    }
  }
  if (!doc || !state)
    return (
      <div className="a-panel">
        {error ? (
          <>
            <p className="a-error" role="alert">
              {error}
            </p>
            <button className="a-button" onClick={load}>
              Yeniden dene
            </button>
          </>
        ) : (
          <div className="a-loading" role="status">
            Sayfa düzenleyici açılıyor…
          </div>
        )}
      </div>
    );
  const width = device === 'desktop' ? 1440 : device === 'tablet' ? 820 : 390,
    scale = Math.min(1, Math.max(0.1, (size.width - 32) / width)),
    frameHeight = Math.max(500, (size.height - 34) / scale),
    position = doc.sections.findIndex((s) => s.id === active?.id);
  const changed = state.published
    ? doc.sections.filter(
        (s, i) => JSON.stringify(s) !== JSON.stringify(state.published!.sections[i]),
      ).length
    : doc.sections.length;
  const custom = !!active && isCustom(active),
    hasButton =
      !!active &&
      ['about', 'events', 'membership', 'join', 'story', 'callout'].includes(active.kind);
  return (
    <div
      className={'home-editor ' + (full ? 'he-fullscreen' : '')}
      data-mobile-view={mobileView}
      aria-label="Ana sayfa düzenleyici"
    >
      <header className="he-top">
        <div className="he-page-name">
          <span className="he-page-icon">
            <Layers size={20} />
          </span>
          <div>
            <strong>Ana sayfa</strong>
            <small>
              {dirty
                ? 'Kaydedilmemiş değişiklikler'
                : state.revision
                  ? 'Taslak kaydedildi'
                  : 'Mevcut tasarımdan başlıyoruz'}
              <span> · {doc.sections.filter((s) => s.visible).length} bölüm görünür</span>
            </small>
          </div>
        </div>
        <div className="he-actions">
          <button
            className="a-icon"
            disabled={!past.length || busy}
            onClick={undo}
            title="Geri al"
            aria-label="Son düzenlemeyi geri al"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="a-icon"
            disabled={!future.length || busy}
            onClick={redo}
            title="Yinele"
            aria-label="Son düzenlemeyi yinele"
          >
            <Redo2 size={16} />
          </button>
          <button
            className="a-button secondary"
            disabled={busy || conflict || (!dirty && !!state.revision)}
            onClick={() => save('draft')}
          >
            <Save size={15} />
            <span>Taslağı kaydet</span>
          </button>
          <button
            className="a-button"
            disabled={busy || conflict}
            onClick={() => {
              setError('');
              const v = publishDocumentSchema.safeParse(doc);
              if (v.success) setPublishOpen(true);
              else setError(v.error.issues[0].message);
            }}
          >
            <Send size={15} />
            <span>Yayımla</span>
          </button>
          <button
            className="a-icon"
            title={full ? 'Tam ekrandan çık' : 'Çalışma alanını genişlet'}
            aria-label={full ? 'Tam ekrandan çık' : 'Çalışma alanını genişlet'}
            onClick={() => setFull(!full)}
          >
            {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>
      {error && (
        <div className="he-message a-error" role="alert">
          {error}
          {conflict && (
            <div>
              <button className="a-button secondary" onClick={download}>
                Taslağımı indir
              </button>
              <button
                className="a-button secondary"
                onClick={() => {
                  if (
                    confirm(
                      'Bu ekrandaki kaydedilmemiş değişikliklerin yerine sunucudaki güncel kayıt yüklenecek. Devam edilsin mi?',
                    )
                  )
                    void load();
                }}
              >
                Güncel kaydı yükle
              </button>
            </div>
          )}
        </div>
      )}
      {notice && (
        <div className="he-message he-notice" role="status">
          <Check size={14} />
          {notice}
        </div>
      )}
      <div className="he-mobile-switch">
        <button aria-pressed={mobileView === 'edit'} onClick={() => setMobileView('edit')}>
          <Settings2 size={16} />
          Düzenle
        </button>
        <button aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>
          <Eye size={16} />
          Önizleme
        </button>
      </div>
      <div className="he-workspace">
        <aside className="he-controls">
          <nav className="he-tabs" aria-label="Düzenleyici araçları">
            {(
              [
                ['sections', 'Bölümler', Layers],
                ['content', 'İçerik', Settings2],
                ['history', 'Geçmiş', History],
              ] as const
            ).map(([key, label, Icon]) => (
              <button key={key} aria-pressed={panel === key} onClick={() => setPanel(key)}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
          <div className="he-control-scroll">
            <fieldset disabled={busy} className="he-fieldset">
              {panel === 'sections' && (
                <>
                  <div className="he-pane-heading">
                    <h2>Sayfanın akışı</h2>
                    <button
                      className="a-icon"
                      disabled={doc.sections.length >= 24}
                      aria-label="Yeni bölüm ekle"
                      onClick={() => {
                        setInsertAfter(selected);
                        setAdding(true);
                      }}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  <p className="he-hint">
                    Sürükleyerek sırala. Telefonda okları kullan. Bölüm adına dokunarak içeriğini
                    düzenle.
                  </p>
                  <ol className="he-section-list">
                    {doc.sections.map((s, i) => (
                      <li
                        key={s.id}
                        className={
                          (selected === s.id ? 'is-selected ' : '') +
                          (!s.visible ? 'is-hidden ' : '') +
                          (dropTarget === s.id ? 'is-drop' : '')
                        }
                        onDragOver={(e) => {
                          if (dragging && s.id !== 'hero') {
                            e.preventDefault();
                            setDropTarget(s.id);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragging && dragging !== s.id && s.id !== 'hero') {
                            move(dragging, i);
                            select(dragging);
                          }
                          setDragging('');
                          setDropTarget('');
                        }}
                      >
                        <button
                          draggable={s.id !== 'hero'}
                          className="he-grip"
                          disabled={s.id === 'hero'}
                          aria-label={s.label + ' bölümünü sürükle'}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', s.id);
                            setDragging(s.id);
                          }}
                          onDragEnd={() => {
                            setDragging('');
                            setDropTarget('');
                          }}
                        >
                          <GripVertical size={15} />
                        </button>
                        <button
                          className="he-section-name"
                          aria-label={s.label + ' bölümünü düzenle'}
                          onClick={() => select(s.id, true)}
                        >
                          <small>
                            {String(i + 1).padStart(2, '0')} /{' '}
                            {isCustom(s) ? 'ÖZEL BÖLÜM' : 'HAZIR BÖLÜM'}
                          </small>
                          <strong>{s.label}</strong>
                        </button>
                        <div className="he-row-actions">
                          <button
                            disabled={i < 2}
                            aria-label={s.label + ' yukarı taşı'}
                            title="Yukarı taşı"
                            onClick={() => move(s.id, i - 1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            disabled={i === 0 || i === doc.sections.length - 1}
                            aria-label={s.label + ' aşağı taşı'}
                            title="Aşağı taşı"
                            onClick={() => move(s.id, i + 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            disabled={s.kind === 'hero'}
                            aria-label={s.label + (s.visible ? ' gizle' : ' göster')}
                            title={s.visible ? 'Gizle' : 'Göster'}
                            onClick={() =>
                              update({
                                ...doc,
                                sections: doc.sections.map((v) =>
                                  v.id === s.id ? { ...v, visible: !v.visible } : v,
                                ),
                              })
                            }
                          >
                            {s.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <button
                    className="he-add-section"
                    disabled={doc.sections.length >= 24}
                    onClick={() => {
                      setInsertAfter(doc.sections.at(-1)!.id);
                      setAdding(true);
                    }}
                  >
                    <Plus size={17} />
                    Yeni bölüm ekle
                  </button>
                  <div className="he-separator" />
                  <TextField
                    label="Üst duyuru şeridi"
                    value={doc.announcement}
                    onChange={(announcement) => update({ ...doc, announcement }, true)}
                    max={200}
                    hint="Boş bırakırsan görünmez."
                  />
                  <div className="he-file-actions">
                    <button onClick={download}>
                      <Download size={14} />
                      Taslağı indir
                    </button>
                    <button onClick={() => importInput.current?.click()}>
                      <Upload size={14} />
                      Dosyadan yükle
                    </button>
                    <input
                      ref={importInput}
                      type="file"
                      accept="application/json,.json"
                      hidden
                      onChange={(e) => {
                        void importFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </>
              )}
              {panel === 'content' && active && (
                <>
                  <div className="he-pane-heading">
                    <button className="he-back" onClick={() => setPanel('sections')}>
                      <ChevronLeft size={16} />
                      Bölümler
                    </button>
                    <span className="he-kind">{custom ? 'Özel içerik' : 'Hazır bölüm'}</span>
                  </div>
                  <h2 className="he-active-title">{active.label}</h2>
                  <div className="he-section-state">
                    <label>
                      <input
                        type="checkbox"
                        checked={active.visible}
                        disabled={active.kind === 'hero'}
                        onChange={(e) => patch({ visible: e.target.checked })}
                      />
                      Sitede göster
                    </label>
                    <button
                      className="a-link"
                      onClick={() => {
                        setFocus((v) => v + 1);
                        setMobileView('preview');
                      }}
                    >
                      Önizlemede bul
                    </button>
                  </div>
                  {!active.visible && (
                    <p className="he-hint">
                      Bu bölüm gizli. Yeniden açana kadar ziyaretçiler görmez.
                    </p>
                  )}
                  <TextField
                    label="Paneldeki bölüm adı"
                    value={active.label}
                    max={60}
                    onChange={(label) => patch({ label })}
                  />
                  {active.kind !== 'hero' && (
                    <label className="he-field">
                      <span>Sayfadaki konumu</span>
                      <select
                        value={position}
                        onChange={(e) => move(active.id, Number(e.target.value))}
                      >
                        {doc.sections.map(
                          (s, i) =>
                            i > 0 && (
                              <option key={s.id} value={i}>
                                {i + 1}. sıra{' '}
                                {s.id === active.id ? '(şu an)' : `— ${s.label} yerinde`}
                              </option>
                            ),
                        )}
                      </select>
                    </label>
                  )}
                  <div className="he-separator" />
                  {active.kind !== 'hero' && active.kind !== 'marquee' && (
                    <TextField
                      label="Üst etiket"
                      value={active.eyebrow}
                      max={100}
                      onChange={(eyebrow) => patch({ eyebrow })}
                    />
                  )}
                  <TextField
                    label={active.kind === 'marquee' ? 'Kayan yazı' : 'Başlık'}
                    value={active.title}
                    max={active.kind === 'hero' ? 65 : 160}
                    area
                    onChange={(title) => patch({ title })}
                    hint="Enter ile satır ayırabilirsin."
                  />
                  {!['marquee', 'portals'].includes(active.kind) && (
                    <TextField
                      label="Açıklama"
                      value={active.text}
                      max={2400}
                      area
                      onChange={(text) => patch({ text })}
                    />
                  )}
                  {hasButton && (
                    <>
                      <div className="he-separator" />
                      <h3 className="he-subtitle">Buton</h3>
                      <TextField
                        label="Buton yazısı"
                        value={active.buttonLabel}
                        max={60}
                        onChange={(buttonLabel) => patch({ buttonLabel })}
                      />
                      <TextField
                        label="Buton bağlantısı"
                        value={active.buttonHref}
                        max={500}
                        onChange={(buttonHref) => patch({ buttonHref })}
                        hint="Örnek: /etkinlikler, /uye-ol veya https://…"
                      />
                      <div className="he-link-presets">
                        {[
                          ['Etkinlikler', '/etkinlikler'],
                          ['Üyelik', '/uye-ol'],
                          ['Ekip', '/ekip'],
                          ['Kartlar', '/kartlar'],
                        ].map(([label, href]) => (
                          <button key={href} onClick={() => patch({ buttonHref: href })}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {['hero', 'story'].includes(active.kind) && (
                    <>
                      <div className="he-separator" />
                      <MediaPicker
                        key={active.id}
                        name="homeImage"
                        label={
                          active.kind === 'hero' ? 'Açılış görseli (isteğe bağlı)' : 'Bölüm görseli'
                        }
                        value={active.imageId}
                        onChange={(imageId) => patch({ imageId })}
                      />
                      {active.imageId && (
                        <TextField
                          label="Görsel açıklaması"
                          value={active.imageAlt}
                          max={180}
                          onChange={(imageAlt) => patch({ imageAlt })}
                          hint="Ekran okuyucular için görseli tarif et."
                        />
                      )}
                    </>
                  )}
                  {active.kind === 'events' && (
                    <>
                      <div className="he-separator" />
                      <label className="he-field">
                        <span>Görünecek etkinlik sayısı</span>
                        <select
                          value={active.eventCount}
                          onChange={(e) => patch({ eventCount: Number(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>
                              {n} etkinlik
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="he-checkbox">
                        <input
                          type="checkbox"
                          checked={active.showFilters}
                          onChange={(e) => patch({ showFilters: e.target.checked })}
                        />
                        Kategori filtrelerini göster
                      </label>
                      <p className="he-hint">
                        Yayındaki yaklaşan etkinlikler otomatik gelir. İçerikleri “Etkinlikler”
                        bölümünden yönet.
                      </p>
                    </>
                  )}
                  {active.kind === 'links' && (
                    <>
                      <div className="he-separator" />
                      <h3 className="he-subtitle">Bağlantı kartları</h3>
                      {active.items.map((item, i) => (
                        <div className="he-link-item" key={i}>
                          <header>
                            <b>Kart {i + 1}</b>
                            <button
                              className="a-icon"
                              aria-label={'Kart ' + (i + 1) + ' kaldır'}
                              onClick={() =>
                                patch({ items: active.items.filter((_, n) => i !== n) })
                              }
                            >
                              <X size={13} />
                            </button>
                          </header>
                          {(['title', 'text', 'href'] as const).map((key) => (
                            <TextField
                              key={key}
                              label={
                                { title: 'Kart başlığı', text: 'Kısa açıklama', href: 'Bağlantı' }[
                                  key
                                ]
                              }
                              value={item[key]}
                              max={{ title: 70, text: 240, href: 500 }[key]}
                              onChange={(value) =>
                                patch({
                                  items: active.items.map((v, n) =>
                                    i === n ? { ...v, [key]: value } : v,
                                  ),
                                })
                              }
                            />
                          ))}
                        </div>
                      ))}
                      <button
                        className="a-button secondary"
                        disabled={active.items.length >= 4}
                        onClick={() =>
                          patch({
                            items: [
                              ...active.items,
                              { title: 'Yeni bağlantı', text: '', href: '/etkinlikler' },
                            ],
                          })
                        }
                      >
                        <Plus size={15} />
                        Kart ekle
                      </button>
                    </>
                  )}
                  {custom && (
                    <>
                      <div className="he-separator" />
                      <h3 className="he-subtitle">Görünüm</h3>
                      <label className="he-field">
                        <span>Renk paleti</span>
                        <select
                          value={active.tone}
                          onChange={(e) => patch({ tone: e.target.value as HomeSection['tone'] })}
                        >
                          <option value="ink">Gece yeşili</option>
                          <option value="paper">Kırık beyaz</option>
                          <option value="green">Fıstık yeşili</option>
                        </select>
                      </label>
                      <div className="he-field-pair">
                        <label className="he-field">
                          <span>Metin hizası</span>
                          <select
                            value={active.align}
                            onChange={(e) =>
                              patch({ align: e.target.value as HomeSection['align'] })
                            }
                          >
                            <option value="left">Sol</option>
                            <option value="center">Orta</option>
                          </select>
                        </label>
                        <label className="he-field">
                          <span>Dikey boşluk</span>
                          <select
                            value={active.spacing}
                            onChange={(e) =>
                              patch({ spacing: e.target.value as HomeSection['spacing'] })
                            }
                          >
                            <option value="compact">Dar</option>
                            <option value="normal">Normal</option>
                            <option value="spacious">Geniş</option>
                          </select>
                        </label>
                      </div>
                      {active.kind === 'story' && active.imageId && (
                        <label className="he-field">
                          <span>Görselin yeri</span>
                          <select
                            value={active.imageSide}
                            onChange={(e) =>
                              patch({ imageSide: e.target.value as HomeSection['imageSide'] })
                            }
                          >
                            <option value="left">Solda</option>
                            <option value="right">Sağda</option>
                          </select>
                        </label>
                      )}
                      <div className="he-section-tools">
                        <button
                          disabled={doc.sections.length >= 24}
                          onClick={() => {
                            const s = {
                                ...active,
                                id: 'block-' + crypto.randomUUID(),
                                label: (active.label + ' kopyası').slice(0, 60),
                              },
                              sections = [...doc.sections];
                            sections.splice(position + 1, 0, s);
                            update({ ...doc, sections });
                            select(s.id, true);
                          }}
                        >
                          <Copy size={14} />
                          Çoğalt
                        </button>
                        <button
                          className="he-danger"
                          onClick={() => {
                            update({
                              ...doc,
                              sections: doc.sections.filter((s) => s.id !== active.id),
                            });
                            select(doc.sections[Math.max(0, position - 1)].id);
                            setPanel('sections');
                            setNotice('Bölüm kaldırıldı. Geri al ile yeniden getirebilirsin.');
                          }}
                        >
                          <Trash2 size={14} />
                          Bölümü kaldır
                        </button>
                      </div>
                    </>
                  )}
                  <button
                    className="he-add-section"
                    disabled={doc.sections.length >= 24}
                    onClick={() => {
                      setInsertAfter(active.id);
                      setAdding(true);
                    }}
                  >
                    <Plus size={16} />
                    Bu bölümün arkasına ekle
                  </button>
                </>
              )}
              {panel === 'history' && (
                <>
                  <div className="he-pane-heading">
                    <h2>Yayın geçmişi</h2>
                  </div>
                  <div className="he-live-version">
                    <span className="he-kind">ŞU AN YAYINDA</span>
                    <h3>{time(state.publishedAt)}</h3>
                    <p>{state.publishedBy || 'Sitenin mevcut tasarımı'}</p>
                    {state.published && (
                      <button
                        className="a-button secondary"
                        onClick={() => {
                          update(state.published!);
                          setNotice('Yayındaki sürüm taslağa alındı.');
                        }}
                      >
                        Yayındaki sürümü taslağa al
                      </button>
                    )}
                  </div>
                  <p className="he-hint">
                    Son beş yayın saklanır. Eski bir sürümü taslağa alıp inceleyebilir, ardından
                    yayımlayabilirsin.
                  </p>
                  {state.history.length ? (
                    state.history.map((item, i) => (
                      <div className="he-history-item" key={item.id}>
                        <span>0{i + 1}</span>
                        <div>
                          <strong>{time(item.at)}</strong>
                          <p>
                            {item.by} · {item.document.sections.filter((s) => s.visible).length}{' '}
                            bölüm
                          </p>
                          <button
                            className="a-link"
                            onClick={() => {
                              update(item.document);
                              setSelected('hero');
                              setFocus((v) => v + 1);
                              setNotice('Önceki sürüm taslağa alındı. Henüz yayımlanmadı.');
                            }}
                          >
                            Bu sürümü taslağa al
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="he-empty">
                      İlk değişikliği yayımladığında önceki sürüm burada görünecek.
                    </div>
                  )}
                </>
              )}
            </fieldset>
          </div>
          <div className="he-control-foot">
            <span>{dirty ? '● Değişiklik var' : '✓ Kayıt güncel'}</span>
            <span>⌘ / Ctrl + S</span>
          </div>
        </aside>
        <section className="he-preview-pane" aria-label="Canlı sayfa önizlemesi">
          <header className="he-preview-toolbar">
            <div className="he-devices" role="group" aria-label="Önizleme ekranı">
              {(
                [
                  ['desktop', Monitor, 'Masaüstü'],
                  ['tablet', Tablet, 'Tablet'],
                  ['mobile', Smartphone, 'Telefon'],
                ] as const
              ).map(([key, Icon, title]) => (
                <button
                  key={key}
                  aria-label={title + ' önizleme'}
                  title={title}
                  aria-pressed={device === key}
                  onClick={() => setDevice(key)}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
            <span className="he-preview-dimensions">
              {width} px · %{Math.round(scale * 100)}
            </span>
            <button
              className={'he-preview-mode ' + (mode ? 'active' : '')}
              aria-pressed={mode}
              onClick={() => setMode(!mode)}
            >
              {mode ? <Eye size={15} /> : <MousePointer2 size={15} />}
              <span>{mode ? 'Etkileşim açık' : 'Seçerek düzenle'}</span>
            </button>
          </header>
          <div className="he-preview-url">
            <span />
            scubmk / ana sayfa <small>TASLAK ÖNİZLEMESİ</small>
          </div>
          <div className="he-preview-stage" ref={stage}>
            {channel && (
              <div
                className={'he-frame-shell device-' + device}
                style={{ width: width * scale, height: frameHeight * scale }}
              >
                <iframe
                  key={reload}
                  ref={frame}
                  src={'/admin/preview?channel=' + channel}
                  title="BMK ana sayfa canlı önizlemesi"
                  sandbox="allow-scripts allow-same-origin"
                  style={{ width, height: frameHeight, transform: `scale(${scale})` }}
                />
              </div>
            )}
            {!ready && (
              <div className="he-preview-loading" role="status">
                {previewError ? (
                  <>
                    <strong>Önizleme bağlanamadı.</strong>
                    <p>Oturumunu ve bağlantını kontrol edip tekrar dene.</p>
                    <button
                      className="a-button secondary"
                      onClick={() => {
                        setPreviewError(false);
                        setReady(false);
                        setReload((v) => v + 1);
                      }}
                    >
                      Önizlemeyi yeniden aç
                    </button>
                  </>
                ) : (
                  <>Sitenin önizlemesi hazırlanıyor…</>
                )}
              </div>
            )}
          </div>
          <footer className="he-preview-foot">
            <span>
              {mode
                ? 'Menüleri ve etkileşimleri deneyebilirsin. Bağlantılar bu pencereden ayrılmaz.'
                : 'Düzenlemek istediğin bölüme tıkla. Yazdıkların anında burada görünür.'}
            </span>
            <small>Yayımlayana kadar yalnızca sen görürsün.</small>
          </footer>
        </section>
      </div>
      {adding && (
        <Dialog title="Yeni bölüm ekle" close={closeAdd}>
          <p>İçerik türünü ve sayfada görüneceği yeri seç.</p>
          <label className="he-field">
            <span>Ekleneceği yer</span>
            <select value={insertAfter} onChange={(e) => setInsertAfter(e.target.value)}>
              {doc.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} bölümünden sonra
                </option>
              ))}
            </select>
          </label>
          <div className="he-block-choices">
            {customKinds.map((kind) => (
              <button
                key={kind}
                disabled={doc.sections.length >= 24}
                onClick={() => {
                  const s = newHomeSection(kind),
                    sections = [...doc.sections],
                    at = Math.max(
                      0,
                      sections.findIndex((v) => v.id === insertAfter),
                    );
                  sections.splice(at + 1, 0, s);
                  update({ ...doc, sections });
                  select(s.id, true);
                  setAdding(false);
                }}
              >
                <span className={'he-block-art art-' + kind}>
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{sectionNames[kind]}</strong>
                <small>
                  {
                    {
                      story: 'Fotoğraf, başlık, metin ve buton',
                      callout: 'Yeni bir çağrı veya kısa duyuru',
                      links: '2–4 içerik için bağlantı kartları',
                    }[kind]
                  }
                </small>
                <Plus size={17} />
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {publishOpen && (
        <Dialog title="Ana sayfayı yayımla" close={closePublish}>
          <div className="he-publish-summary">
            <Check size={22} />
            <div>
              <strong>
                {doc.sections.filter((s) => s.visible).length} bölüm ziyaretçilere görünecek.
              </strong>
              <p>
                {changed} bölümde içerik veya sıra farkı var.{' '}
                {doc.sections.filter((s) => !s.visible).length} bölüm gizli.
              </p>
            </div>
          </div>
          <p>Bu taslak canlı ana sayfanın yerini alacak. Önceki yayın, geçmişte saklanacak.</p>
          <div className="he-dialog-actions">
            <button className="a-button secondary" disabled={busy} onClick={closePublish}>
              Düzenlemeye dön
            </button>
            <button className="a-button" disabled={busy} onClick={() => save('publish')}>
              <Send size={15} />
              {busy ? 'Yayımlanıyor…' : 'Değişiklikleri yayımla'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
