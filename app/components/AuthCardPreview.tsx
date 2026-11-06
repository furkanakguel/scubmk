'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Brand } from './Brand';
import { CardPresentation } from './MemberCard';
import { regularStyles, cardDesigns } from '../membership-model';
type RegularCardStyle = (typeof regularStyles)[number];

export default function AuthCardPreview({
  name = '',
  selectedStyle,
  onSelect,
  terminal = false,
  selectable = true,
}: {
  name?: string;
  selectedStyle?: RegularCardStyle;
  onSelect?: (style: RegularCardStyle) => void;
  terminal?: boolean;
  selectable?: boolean;
}) {
  const [local, setLocal] = useState<RegularCardStyle>('mono');
  const active = selectedStyle ?? local;
  return (
    <aside
      className={'member-auth-art auth-card-preview preview-' + active}
      aria-label="Üyelik kartı önizlemesi"
    >
      {!terminal && <Brand light />}
      <div className="auth-preview-heading">
        <span className="auth-preview-kicker">SCÜ BMK · DİJİTAL ÜYELİK</span>
        <h2>Üyelik kartın.</h2>
        <p>
          Hesabını oluşturduğunda sana özel hazırlanır.
          <br />
          Tasarımını istediğin zaman değiştirebilirsin.
        </p>
      </div>
      <div className="auth-preview-stage">
        <div className="auth-card-entrance" key={active}>
          <CardPresentation
            style={active}
            data={{
              name: name.trim() || 'Adın Soyadın',
              number: 'BMK-26-XXXXXXXX',
              role: 'member',
              issued: 2026,
              sample: true,
            }}
          />
        </div>
      </div>
      <div className="auth-preview-selection">
        <div className="auth-preview-label">
          <strong>{cardDesigns[active].name}</strong>
          <span>{cardDesigns[active].caption}</span>
        </div>
        {selectable && (
          <div className="auth-preview-options" role="group" aria-label="Kart tasarımlarını incele">
            {regularStyles.map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={active === s}
                onClick={() => {
                  setLocal(s);
                  onSelect?.(s);
                }}
              >
                <i className={'card-swatch swatch-' + s} />
                <span>{cardDesigns[s].name}</span>
                {active === s && <Check size={12} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <a className="auth-preview-all" href="/kartlar">
        Tüm kartları incele
      </a>
    </aside>
  );
}
