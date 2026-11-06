'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cardSVG, CARD_QR_SIZE, CARD_EXPORT_SCALE, type CardData, type CardSide } from './card-art';
import { cardDesigns, type CardStyle } from '../membership-model';
export default function MemberCard({
  style,
  data,
  verification = '',
  id,
  side,
  loading = 'eager',
}: {
  style: CardStyle;
  data: CardData;
  verification?: string;
  id?: string;
  side?: CardSide;
  loading?: 'eager' | 'lazy';
}) {
  const [qrData, setQrData] = useState({ url: '', value: '' }),
    ref = useRef<HTMLDivElement>(null),
    hasBack = side !== undefined;
  const qr = qrData.url === verification ? qrData.value : '';
  const { name, number, role, issued, sample } = data;
  useEffect(() => {
    let alive = true;
    if (!verification || !hasBack) return;
    import('qrcode')
      .then((m) =>
        m.toDataURL(verification, {
          margin: 4,
          width: CARD_QR_SIZE * CARD_EXPORT_SCALE,
          errorCorrectionLevel: 'M',
          color: { dark: '#101715', light: '#ffffff' },
        }),
      )
      .then((v) => {
        if (alive) setQrData({ url: verification, value: v });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [verification, hasBack]);
  const front = useMemo(
    () => cardSVG(style, { name, number, role, issued, sample }),
    [style, name, number, role, issued, sample],
  );
  const back = useMemo(
    () => (!hasBack ? '' : cardSVG(style, { name, number, role, issued, sample }, qr, 'back')),
    [style, name, number, role, issued, sample, qr, hasBack],
  );
  const face = (svg: string, s: CardSide) => (
    <div className={'card-face card-face-' + s} aria-hidden={(side || 'front') !== s}>
      <img
        loading={loading}
        decoding="async"
        src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)}
        width={960}
        height={604}
        alt={`${cardDesigns[style].name} · ${data.name}, ${data.number} — ${s === 'front' ? 'ön yüz' : 'arka yüz'}`}
      />
      <span className="card-foil" aria-hidden="true" />
      <span className="card-glint" aria-hidden="true" />
      <span className="card-cut-edge" aria-hidden="true" />
    </div>
  );
  return (
    <div
      ref={ref}
      id={id}
      className={'member-card mc-' + style}
      data-side={side || 'front'}
      onPointerMove={(e) => {
        if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
        const r = e.currentTarget.getBoundingClientRect(),
          x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
          y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        e.currentTarget.style.setProperty('--rx', `${(y - 0.5) * -8}deg`);
        e.currentTarget.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
        e.currentTarget.style.setProperty('--light-x', `${x * 100}%`);
        e.currentTarget.style.setProperty('--light-y', `${y * 100}%`);
        e.currentTarget.style.setProperty('--light-angle', `${105 + x * 60}deg`);
        e.currentTarget.style.setProperty('--shine', `${x * 100}%`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty('--rx', '0deg');
        ref.current?.style.setProperty('--ry', '0deg');
        ref.current?.style.setProperty('--light-x', '38%');
        ref.current?.style.setProperty('--light-y', '22%');
        ref.current?.style.setProperty('--light-angle', '126deg');
      }}
    >
      <div className="card-faces">
        {face(front, 'front')}
        {side !== undefined && face(back, 'back')}
      </div>
    </div>
  );
}
export function CardPresentation({
  style,
  data,
  verification = '',
  side,
  onSideChange,
  loading = 'eager',
}: {
  style: CardStyle;
  data: CardData;
  verification?: string;
  side?: CardSide;
  onSideChange?: (side: CardSide) => void;
  loading?: 'eager' | 'lazy';
}) {
  const [local, setLocal] = useState<CardSide>('front'),
    active = side ?? local;
  const select = (s: CardSide) => {
    setLocal(s);
    onSideChange?.(s);
  };
  return (
    <div className="card-presentation">
      <MemberCard
        style={style}
        data={data}
        verification={verification}
        side={active}
        loading={loading}
      />
      <div
        className="card-face-controls"
        role="group"
        aria-label={cardDesigns[style].name + ' kartının yüzü'}
      >
        <button type="button" aria-pressed={active === 'front'} onClick={() => select('front')}>
          Ön yüz
        </button>
        <button type="button" aria-pressed={active === 'back'} onClick={() => select('back')}>
          Arka yüz
        </button>
      </div>
    </div>
  );
}
export async function downloadMemberCard(
  style: CardStyle,
  data: CardData,
  verification: string,
  side: CardSide = 'front',
) {
  const qr =
    side === 'back'
      ? (await import('qrcode')).toDataURL(verification, {
          margin: 4,
          width: CARD_QR_SIZE * CARD_EXPORT_SCALE,
          errorCorrectionLevel: 'M',
        })
      : Promise.resolve('');
  const svg = cardSVG(style, data, await qr, side),
    url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 960 * CARD_EXPORT_SCALE;
    canvas.height = 604 * CARD_EXPORT_SCALE;
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(Error('Kart indirilemedi.'))), 'image/png'),
    );
    const href = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = href;
    a.download = `SCU-BMK-${data.number}-${side === 'front' ? 'on' : 'arka'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function MemberQR({ url }: { url: string }) {
  const [image, setImage] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then((m) => m.toDataURL(url, { width: 560, margin: 4, errorCorrectionLevel: 'M' }))
      .then((v) => {
        if (alive) setImage(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <div className="member-qr-panel">
      {image ? (
        <img src={image} width={280} height={280} alt="Üyelik kartını doğrulamak için QR kodu" />
      ) : (
        <p role="status">QR hazırlanıyor…</p>
      )}
      <p>
        Telefon kamerasıyla okut.
        <br />
        Güncel üyelik durumun görüntülenir.
      </p>
      <a href={url} target="_blank" rel="noreferrer">
        Doğrulama sayfasını aç
      </a>
    </div>
  );
}
