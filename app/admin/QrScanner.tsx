'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, ScanLine, Square, X } from 'lucide-react';
import { loadQrDecoder, parseCheckinCode } from './checkin-qr';

type Mode = 'idle' | 'opening' | 'live' | 'reading';
export default function QrScanner({
  onRead,
  onReset,
  disabled = false,
}: {
  onRead: (code: string) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('idle'),
    [canLive, setCanLive] = useState<boolean | null>(null);
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [found, setFound] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    photo = useRef<HTMLInputElement>(null),
    gallery = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);

  // Also invalidate asynchronous permission/decoder requests when leaving the screen.
  const release = useCallback(() => {
    generation.current++;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
  }, []);
  const stop = useCallback(() => {
    release();
    setMode('idle');
  }, [release]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser capability is unavailable during SSR.
    setCanLive(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia);
    const hide = () => {
      if (document.hidden) {
        stop();
        setMessage('Tarama duraklatıldı. Devam etmek için kamerayı yeniden aç.');
      }
    };
    const pageHide = () => stop();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', pageHide);
    return () => {
      release();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', pageHide);
    };
  }, [release, stop]);

  function accept(value: string) {
    const code = parseCheckinCode(value, location.origin);
    if (!code) {
      setError(
        'Bu QR, bu siteye ait bir giriş bileti değil. Katılımcının etkinlik biletindeki QR’yi okut.',
      );
      return false;
    }
    release();
    setMode('idle');
    setError('');
    setFound(true);
    setMessage('QR okundu. Girişi kaydetmek için aşağıdaki onay düğmesine bas.');
    onRead(code);
    return true;
  }

  async function start() {
    if (disabled || mode !== 'idle') return;
    release();
    onReset();
    const session = generation.current;
    setFound(false);
    setMessage('');
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        'Bu yerel bağlantıda canlı kamera açılamıyor. “Fotoğraf çek” ile QR’yi okutabilirsin.',
      );
      return;
    }
    setMode('opening');
    try {
      const decode = await loadQrDecoder();
      if (session !== generation.current) return;
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (session !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const el = video.current;
      if (!el) throw Error('VIDEO_UNAVAILABLE');
      el.srcObject = media;
      await el.play();
      if (session !== generation.current) return;
      setMode('live');
      setMessage('Biletin QR kodunu çerçeveye getir.');
      const canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw Error('CANVAS_UNAVAILABLE');
      const tick = () => {
        if (session !== generation.current) return;
        try {
          if (el.readyState >= 2 && el.videoWidth > 0 && el.videoHeight > 0) {
            const scale = Math.min(1, 640 / Math.max(el.videoWidth, el.videoHeight));
            canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
              result = decode(pixels.data, pixels.width, pixels.height, {
                inversionAttempts: 'dontInvert',
              });
            if (result && accept(result.data)) return;
          }
          // Bounded resolution and ~6 scans/second keep mobile CPU usage down.
          timer.current = setTimeout(tick, 160);
        } catch {
          stop();
          setError('Kamera görüntüsü okunamadı. Fotoğraf çekerek tekrar deneyebilirsin.');
        }
      };
      media.getVideoTracks().forEach((track) =>
        track.addEventListener(
          'ended',
          () => {
            if (session === generation.current) {
              stop();
              setError('Kamera bağlantısı kesildi. Kamerayı yeniden açabilirsin.');
            }
          },
          { once: true },
        ),
      );
      tick();
    } catch (e) {
      if (session !== generation.current) return;
      stop();
      const name = e instanceof Error ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verebilir veya bir QR fotoğrafı seçebilirsin.'
          : name === 'NotFoundError'
            ? 'Bu cihazda kamera bulunamadı. QR görseli seçebilirsin.'
            : name === 'NotReadableError'
              ? 'Kamera başka bir uygulama tarafından kullanılıyor. Diğer uygulamayı kapatıp tekrar dene.'
              : 'Kamera açılamadı. Fotoğraf çekerek veya galeriden seçerek devam edebilirsin.',
      );
    }
  }

  async function readPhoto(file?: File) {
    if (!file || disabled) return;
    release();
    onReset();
    const session = generation.current;
    setFound(false);
    setError('');
    setMessage('');
    if (file.size > 20 * 1024 * 1024) {
      setError('Fotoğraf 20 MB’tan küçük olmalı. QR’ye yakından yeni bir fotoğraf çek.');
      setMode('idle');
      return;
    }
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) {
      setError('JPG, PNG, WebP veya telefonun çektiği bir fotoğrafı seç.');
      setMode('idle');
      return;
    }
    setMode('reading');
    const url = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      image.src = url;
      await image.decode();
      if (session !== generation.current) return;
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 50000000
      )
        throw Error('IMAGE_TOO_LARGE');
      const decode = await loadQrDecoder();
      if (session !== generation.current) return;
      const canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw Error('CANVAS_UNAVAILABLE');
      for (const edge of [960, 1600]) {
        const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height),
          result = decode(pixels.data, pixels.width, pixels.height, {
            inversionAttempts: 'attemptBoth',
          });
        if (result) {
          accept(result.data);
          return;
        }
      }
      setError(
        'Fotoğrafta QR okunamadı. QR’nin tamamı görünsün; biraz yaklaşarak, net ve yansımasız bir fotoğraf çek.',
      );
    } catch {
      if (session === generation.current)
        setError(
          'Fotoğraf okunamadı. QR’nin ekran görüntüsünü veya JPG/PNG görselini deneyebilirsin.',
        );
    } finally {
      URL.revokeObjectURL(url);
      if (session === generation.current) setMode('idle');
    }
  }

  const active = mode === 'live' || mode === 'opening',
    working = mode !== 'idle';
  return (
    <div className="qr-reader">
      <div className={'qr-view ' + (active ? 'is-live' : '')}>
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="QR tarama kamerası"
          hidden={!active}
        />
        {active ? (
          <>
            <div className="qr-frame" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="qr-live-label">
              {mode === 'opening' ? 'Kamera açılıyor…' : 'QR’yi çerçeveye getir'}
            </span>
            <button
              type="button"
              className="qr-camera-close"
              onClick={() => {
                stop();
                setMessage('Kamera kapatıldı.');
              }}
              aria-label="Kamerayı kapat"
            >
              <X size={20} />
            </button>
          </>
        ) : (
          <div className="qr-placeholder">
            {found ? <Check size={36} /> : <ScanLine size={40} />}
            <strong>
              {found
                ? 'Bilet kodu hazır'
                : mode === 'reading'
                  ? 'QR okunuyor…'
                  : 'Bileti kameraya göster'}
            </strong>
            <p>
              {found ? 'Son adım: girişi onayla.' : 'QR’yi okut, katılımcının girişini kaydet.'}
            </p>
          </div>
        )}
      </div>
      <div className="qr-reader-actions">
        {canLive &&
          (active ? (
            <button
              type="button"
              className="a-button secondary"
              onClick={() => {
                stop();
                setMessage('Kamera kapatıldı.');
              }}
            >
              <Square size={16} />
              Kamerayı kapat
            </button>
          ) : (
            <button
              type="button"
              className="a-button"
              disabled={disabled || working}
              onClick={start}
            >
              <Camera size={18} />
              Kamerayı aç
            </button>
          ))}
        <button
          type="button"
          className={'a-button ' + (canLive ? 'secondary' : '')}
          disabled={disabled || working}
          onClick={() => photo.current?.click()}
        >
          <Camera size={18} />
          Fotoğraf çek
        </button>
        <button
          type="button"
          className="a-button secondary"
          disabled={disabled || working}
          onClick={() => gallery.current?.click()}
        >
          <ImagePlus size={18} />
          Galeriden seç
        </button>
        {mode === 'reading' && (
          <button type="button" className="a-link" onClick={stop}>
            İptal et
          </button>
        )}
      </div>
      <input
        ref={photo}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="QR fotoğrafı çek"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          void readPhoto(f);
        }}
      />
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        hidden
        aria-label="QR görseli seç"
        onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          e.currentTarget.value = '';
          void readPhoto(f);
        }}
      />
      {canLive === false && (
        <p className="qr-local-note">
          Bu yerel bağlantıda “Fotoğraf çek” düğmesini kullan. QR’nin fotoğrafını çekip
          onayladığında bilet kodu otomatik okunur.
        </p>
      )}
      {message && (
        <p className={'qr-feedback ' + (found ? 'success' : '')} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="qr-feedback error" role="alert">
          {error}
        </p>
      )}
      <p className="qr-privacy">Görüntüler yalnızca cihazında okunur, sunucuya gönderilmez.</p>
    </div>
  );
}
