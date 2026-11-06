'use client';
import { useState } from 'react';
import { THEMES, themeLabels, type DesktopTheme } from '../lab/desktop';
import {
  ACCENTS,
  INKS,
  SIZES,
  DEFAULT_APPEARANCE,
  PRESETS,
  accentLabels,
  inkLabels,
  sizeLabels,
  matchingPreset,
  type Appearance,
} from '../lab/personalization';
import { DesktopIcon, PixelDino } from './DesktopIcons';
type Props = {
  theme: DesktopTheme;
  onTheme: (t: DesktopTheme) => void;
  appearance: Appearance;
  onAppearance: (a: Appearance) => void;
  onLayout: (mode: 'tile' | 'cascade' | 'reset') => void;
  editing: boolean;
  onEditing: (v: boolean) => void;
  saved: boolean;
  compact: boolean;
  quiet: boolean;
};
function Toggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button className="os-setting-toggle" role="switch" aria-checked={checked} onClick={onChange}>
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <i aria-hidden="true">
        <b />
      </i>
    </button>
  );
}
export default function DesktopSettings(p: Props) {
  const [tab, setTab] = useState<'look' | 'behavior' | 'desktop'>('look');
  const selected = matchingPreset(p.theme, p.appearance);
  function set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    p.onAppearance({ ...p.appearance, [key]: value });
  }
  return (
    <div className="os-settings-v4">
      <header className="os-settings-header">
        <DesktopIcon app="settings" />
        <div>
          <span>DENETİM MASASI / GÖRÜNÜM</span>
          <h3>Masaüstünü kişiselleştir.</h3>
          <p>Görünümü seç, hareketleri ve okunurluğu ayarla.</p>
        </div>
      </header>
      <div className="os-settings-tabs" role="tablist" aria-label="Masaüstü ayarları">
        {(
          [
            ['look', 'Görünüm'],
            ['behavior', 'Hareket & okuma'],
            ['desktop', 'Masaüstü'],
          ] as const
        ).map(([id, label], i) => (
          <button
            key={id}
            id={'os-pref-tab-' + id}
            role="tab"
            aria-selected={tab === id}
            aria-controls="os-pref-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              const ids = ['look', 'behavior', 'desktop'] as const;
              const next =
                e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : -1;
              if (next < 0) return;
              e.preventDefault();
              setTab(ids[next]);
              document.getElementById('os-pref-tab-' + ids[next])?.focus();
            }}
          >
            <span>0{i + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div
        className="os-settings-scroll"
        role="tabpanel"
        aria-labelledby={'os-pref-tab-' + tab}
        id="os-pref-panel"
        key={tab}
      >
        {tab === 'look' && (
          <>
            <div
              className="os-style-preview"
              data-theme={p.theme}
              aria-label="Seçili masaüstünün canlı önizlemesi"
            >
              <div className="os-preview-icons">
                <DesktopIcon app="files" />
                <DesktopIcon app="console" />
              </div>
              <div className="os-preview-window">
                <div className="os-preview-bar">
                  <i />
                  <i />
                  <i />
                  <span>bmk-shell</span>
                </div>
                <div className="os-preview-terminal">
                  <PixelDino />
                  <span>
                    konuk@bmk ~<br />
                    <strong>$ burası benim.</strong>
                    <i />
                  </span>
                </div>
              </div>
              <div className="os-preview-taskbar">
                <span>▸ başlat</span>
                <span>
                  {themeLabels[p.theme]} · {accentLabels[p.appearance.accent]}
                </span>
              </div>
              <span className="os-preview-live">CANLI ÖNİZLEME</span>
            </div>
            <div className="os-setting-title">
              <h4>Hazır stiller</h4>
              <span>Bir tıkla değiştir; sonra ince ayar yap.</span>
            </div>
            <div className="os-style-presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  aria-pressed={selected === preset.id}
                  onClick={() => {
                    p.onTheme(preset.theme);
                    p.onAppearance({
                      ...preset.appearance,
                      motion: p.appearance.motion,
                      recovery: p.appearance.recovery,
                      textSize: p.appearance.textSize,
                      branding: p.appearance.branding,
                    });
                  }}
                >
                  <span className="os-preset-swatch" data-theme={preset.theme} />
                  <strong>{preset.name}</strong>
                  <small>{preset.note}</small>
                  {selected === preset.id && <b>✓</b>}
                </button>
              ))}
            </div>
            <div className="os-setting-title">
              <h4>Duvar kâğıdı</h4>
              <span>{themeLabels[p.theme]}</span>
            </div>
            <div className="os-wallpaper-picker">
              {THEMES.map((t) => (
                <button key={t} aria-pressed={p.theme === t} onClick={() => p.onTheme(t)}>
                  <span data-theme={t} />
                  <strong>{themeLabels[t]}</strong>
                  <b>{p.theme === t ? '✓' : '+'}</b>
                </button>
              ))}
            </div>
            <div className="os-setting-title">
              <h4>Pencere rengi</h4>
              <span>Arka plandan bağımsız.</span>
            </div>
            <div className="os-accent-picker">
              {ACCENTS.map((a) => (
                <button
                  key={a}
                  data-color={a}
                  aria-pressed={p.appearance.accent === a}
                  onClick={() => set('accent', a)}
                >
                  <i>{p.appearance.accent === a ? '✓' : ''}</i>
                  <span>{accentLabels[a]}</span>
                </button>
              ))}
            </div>
            <div className="os-setting-title">
              <h4>Terminal ışığı</h4>
            </div>
            <div className="os-ink-picker">
              {INKS.map((ink) => (
                <button
                  key={ink}
                  data-color={ink}
                  aria-pressed={p.appearance.ink === ink}
                  onClick={() => set('ink', ink)}
                >
                  <code>&gt;_</code>
                  <span>{inkLabels[ink]}</span>
                  <small>{p.appearance.ink === ink ? 'Seçili' : 'Uygula'}</small>
                </button>
              ))}
            </div>
            <div className="os-setting-title">
              <h4>Pencere köşeleri</h4>
            </div>
            <div className="os-setting-segment">
              {(['classic', 'soft'] as const).map((c) => (
                <button
                  key={c}
                  aria-pressed={p.appearance.corners === c}
                  onClick={() => set('corners', c)}
                >
                  {c === 'classic' ? 'Klasik · köşeli' : 'Yumuşak · yuvarlak'}
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'behavior' && (
          <>
            <div className="os-setting-feature">
              <span>
                Aa<span>_</span>
              </span>
              <div>
                <h4>Ritmi sen belirle.</h4>
                <p>Terminalin okunurluğunu ve masaüstünün hareketini ayrı ayrı ayarla.</p>
              </div>
            </div>
            <div className="os-setting-title">
              <h4>Terminal yazı boyutu</h4>
            </div>
            <div className="os-setting-segment">
              {SIZES.map((size) => (
                <button
                  key={size}
                  aria-pressed={p.appearance.textSize === size}
                  onClick={() => set('textSize', size)}
                >
                  {sizeLabels[size]}
                </button>
              ))}
            </div>
            <div className="os-type-sample">
              <span>konuk@bmk ~</span>
              <code>$ merak.et();</code>
              <p>Bir satırla başlar.</p>
            </div>
            <Toggle
              label="Arayüz animasyonları"
              note="Pencere, menü ve içerik geçişleri."
              checked={p.appearance.motion === 'full'}
              onChange={() => set('motion', p.appearance.motion === 'full' ? 'reduced' : 'full')}
            />
            {p.quiet && (
              <p className="os-setting-note">
                Cihazındaki veya sitenin genelindeki hareket azaltma tercihi önceliklidir.
              </p>
            )}
            <div className="os-setting-title">
              <h4>Kurtarma sahnesi</h4>
              <span>Her zaman atlanabilir.</span>
            </div>
            <div className="os-recovery-options">
              <button
                aria-pressed={p.appearance.recovery === 'cinematic'}
                onClick={() => set('recovery', 'cinematic')}
              >
                <span>◴</span>
                <strong>Tadını çıkar</strong>
                <small>Mavi ekranı ve onarım adımlarını izleyerek dön.</small>
              </button>
              <button
                aria-pressed={p.appearance.recovery === 'quick'}
                onClick={() => set('recovery', 'quick')}
              >
                <span>»</span>
                <strong>Hızlı dön</strong>
                <small>Kısa geçişlerle soruya devam et.</small>
              </button>
            </div>
            <p className="os-setting-note">
              Arka plandaki oyun, yazım ve animasyonlar görünür olmadıklarında duraklatılır.
            </p>
          </>
        )}
        {tab === 'desktop' && (
          <>
            <div className="os-setting-feature">
              <DesktopIcon app="files" />
              <div>
                <h4>Her şey yerli yerinde.</h4>
                <p>Pencereler, simgeler ve görünüm tercihleri bu tarayıcıda hatırlanır.</p>
              </div>
            </div>
            <Toggle
              label="BMK masaüstü amblemi"
              note="Duvar kâğıdındaki BMK OS imzasını göster."
              checked={p.appearance.branding}
              onChange={() => set('branding', !p.appearance.branding)}
            />
            <div className="os-setting-title">
              <h4>Pencereleri düzenle</h4>
            </div>
            <div className="os-layout-picker">
              <button onClick={() => p.onLayout('tile')}>
                <span className="layout-tile">
                  <i />
                  <i />
                </span>
                <strong>{p.compact ? 'Ekrana sığdır' : 'Yan yana'}</strong>
              </button>
              <button onClick={() => p.onLayout('cascade')}>
                <span className="layout-cascade">
                  <i />
                  <i />
                </span>
                <strong>Üst üste</strong>
              </button>
            </div>
            <div className="os-setting-title">
              <h4>Masaüstü simgeleri</h4>
            </div>
            <p className="os-setting-note">
              Simgeleri istediğin boşluğa bırak. Telefonda önce düzenlemeyi aç. Alt + yön tuşlarıyla
              taşı; Shift ile ince ayar yap. Telefon ve bilgisayar düzenleri ayrı saklanır.
            </p>
            <div className="os-pref-actions">
              <button
                className="os-button"
                aria-pressed={p.editing}
                onClick={() => p.onEditing(!p.editing)}
              >
                {p.editing ? 'Düzenlemeyi bitir' : 'Simgeleri düzenle'}
              </button>
              <button className="os-button" onClick={() => p.onLayout('reset')}>
                Yerleşimi sıfırla
              </button>
            </div>
            <div className="os-setting-reset">
              <div>
                <strong>Başlangıç görünümüne dön</strong>
                <p>
                  Renkleri, arka planı ve hareket tercihlerini sıfırlar. Notların ve pencere
                  yerleşimin korunur.
                </p>
              </div>
              <button
                className="os-button"
                onClick={() => {
                  p.onTheme('meadow');
                  p.onAppearance({ ...DEFAULT_APPEARANCE });
                }}
              >
                Görünümü sıfırla
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="os-settings-footer">
        <span>{p.saved ? '✓ Bu tarayıcıda saklanır' : '! Yalnızca bu oturumda geçerli'}</span>
        <span>BMK OS / 4.0</span>
      </footer>
    </div>
  );
}
