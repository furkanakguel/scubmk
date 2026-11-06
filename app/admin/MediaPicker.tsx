'use client';
import { useEffect, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
export function MediaLibrary({ onSelect }: { onSelect?: (id: string) => void }) {
  const [archived, setArchived] = useState(false),
    [items, setItems] = useState<{ id: string; name: string; size: number }[]>([]),
    [error, setError] = useState(''),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    fetch('/api/admin?section=media&page=' + page + '&archived=' + (archived ? '1' : '0'))
      .then(async (r) => {
        const d = (await r.json()) as { items: typeof items; error?: string };
        if (!r.ok) throw Error(d.error);
        if (active) {
          setItems((v) => (page === 1 ? d.items : [...v, ...d.items]));
          setMore(d.items.length === 60);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [page, version, archived]);
  async function upload(file?: File) {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error('PNG, JPEG veya WebP seç. En fazla 8 MB.');
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 50000000) {
        bitmap.close();
        throw Error('Görsel çok büyük. Daha küçük bir boyut kullan.');
      }
      const canvas = document.createElement('canvas'),
        ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * ratio);
      canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error('Görsel hazırlanamadı.'))),
          'image/webp',
          0.88,
        ),
      );
      const form = new FormData();
      form.append('file', blob, file.name.replace(/\.[^.]+$/, '') + '.webp');
      const r = await fetch('/api/admin/media', { method: 'POST', body: form });
      const data = (await r.json()) as { id: string; error?: string };
      if (!r.ok) throw Error(data.error);
      if (onSelect) onSelect(data.id);
      else {
        setPage(1);
        setVersion((v) => v + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yüklenemedi.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="media-library">
      {!onSelect && (
        <div className="media-archive">
          <label className="a-toggle">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(1);
              }}
            />
            <span>Arşivlenen görselleri göster</span>
          </label>
        </div>
      )}
      <label className={'media-upload ' + (busy ? 'is-busy' : '')}>
        <Upload size={22} />
        <strong>{busy ? 'Görsel yükleniyor…' : 'Bilgisayardan görsel yükle'}</strong>
        <span>
          PNG, JPEG, WebP · En fazla 8 MB
          <br />
          Büyük fotoğraflar otomatik küçültülür.
        </span>
        <input
          aria-label="Görsel yükle"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p className="a-error" role="alert">
          {error}
        </p>
      )}
      <div className="media-grid">
        {items.map((i) => (
          <div className="media-item" key={i.id}>
            <button
              type="button"
              onClick={() => onSelect?.(i.id)}
              disabled={!onSelect}
              title={i.name}
            >
              <img src={'/api/media/' + i.id} alt={i.name} loading="lazy" />
              <span>{i.name}</span>
              <small>{Math.round(i.size / 1024)} KB</small>
            </button>
            {!onSelect && (
              <button
                type="button"
                className="a-link"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const r = await fetch('/api/admin/media', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: i.id, archived: !archived }),
                      }),
                      d = (await r.json()) as { error?: string };
                    if (!r.ok) throw Error(d.error);
                    setPage(1);
                    setVersion((v) => v + 1);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {archived ? 'Arşivden çıkar' : 'Arşivle'}
              </button>
            )}
          </div>
        ))}
      </div>
      {!items.length && !busy && <p className="a-muted">Henüz görsel yüklenmedi.</p>}
      {more && (
        <button type="button" className="a-button secondary" onClick={() => setPage((p) => p + 1)}>
          Daha fazla göster
        </button>
      )}
    </div>
  );
}
export default function MediaPicker({
  name,
  initial = '',
  label = 'Görsel',
  value: controlled,
  onChange,
}: {
  name: string;
  initial?: string;
  label?: string;
  value?: string;
  onChange?: (id: string) => void;
}) {
  const [localValue, setLocalValue] = useState(initial),
    [open, setOpen] = useState(false);
  const value = controlled ?? localValue;
  const setValue = (id: string) => {
    setLocalValue(id);
    onChange?.(id);
  };
  return (
    <div className="a-media-picker">
      <span className="a-field-label">{label}</span>
      <input type="hidden" name={name} value={value} />
      {value ? (
        <div className="picked-image">
          <img src={'/api/media/' + value} alt="Seçilen görsel" />
          <button type="button" onClick={() => setValue('')} aria-label="Görseli kaldır">
            <X size={16} />
          </button>
        </div>
      ) : null}
      <button type="button" className="a-button secondary" onClick={() => setOpen(!open)}>
        <ImagePlus size={16} />
        {value ? 'Görseli değiştir' : 'Görsel seç veya yükle'}
      </button>
      {open && (
        <div className="inline-library">
          <MediaLibrary
            onSelect={(id) => {
              setValue(id);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
