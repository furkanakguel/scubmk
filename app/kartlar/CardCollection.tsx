'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { CardPresentation } from '../components/MemberCard';
import { cardDesigns, type CardStyle, type ClubRole } from '../membership-model';
const styles = Object.keys(cardDesigns) as CardStyle[];
const roleFor = (s: CardStyle): ClubRole =>
  s === 'advisor'
    ? 'advisor'
    : s === 'assembly'
      ? 'core'
      : s === 'executive'
        ? 'president'
        : 'member';
export default function CardCollection() {
  const [selected, setSelected] = useState<CardStyle>('mono');
  return (
    <>
      <section className="collection-hero">
        <div className="collection-heading">
          <span className="m-eyebrow">DİJİTAL ÜYELİK</span>
          <h1>
            Aynı kulüp.
            <br />
            <em>Senin kartın.</em>
          </h1>
          <p>
            Sana ait bir kart. Her zaman yanında. <br />
            Üye ol, kendine en yakın tasarımı seç.
          </p>
          <a className="m-button" href="/uye-ol">
            Üye ol, kartını al
          </a>
        </div>
        <div className="collection-display">
          <CardPresentation
            style={selected}
            data={{
              name: selected === 'advisor' ? 'Danışmanımızın adı' : 'Adın Soyadın',
              number: 'BMK-26-XXXXXXXX',
              role: roleFor(selected),
              issued: 2026,
              sample: true,
            }}
          />
          <div className="collection-caption">
            <span>{cardDesigns[selected].name}</span>
            <span>{cardDesigns[selected].edition}</span>
          </div>
        </div>
        <div className="collection-select" aria-label="Kart koleksiyonu">
          {styles.map((s) => (
            <button key={s} aria-pressed={selected === s} onClick={() => setSelected(s)}>
              <span className={'card-swatch swatch-' + s} />
              <span>{cardDesigns[s].name}</span>
              {selected === s && <Check size={13} />}
            </button>
          ))}
        </div>
      </section>
      <section className="collection-grid-section">
        <div className="collection-section-heading">
          <div>
            <span className="m-eyebrow">ÜYE KARTLARI</span>
            <h2>
              Dört tasarım.
              <br />
              Bir tanesi senin.
            </h2>
          </div>
          <p>
            Yeni üyeler bu dört tasarımdan birini seçer.
            <br />
            Dilediğin zaman hesabından değiştirebilirsin.
          </p>
        </div>
        <div className="collection-grid">
          {styles.slice(0, 4).map((s) => (
            <article key={s}>
              <CardPresentation
                loading="lazy"
                style={s}
                data={{
                  name: 'Adın Soyadın',
                  number: 'BMK-26-XXXXXXXX',
                  role: 'member',
                  issued: 2026,
                  sample: true,
                }}
              />
              <div className="card-spec">
                <div>
                  <h3>{cardDesigns[s].name}</h3>
                  <p>{cardDesigns[s].caption}</p>
                </div>
                <a href={'/uye-ol?kart=' + s} aria-label={cardDesigns[s].name + ' kartını seç'}>
                  Seç
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="collection-grid-section collection-special">
        <div className="collection-section-heading">
          <div>
            <span className="m-eyebrow">ASİL ÜYELER VE YÖNETİM</span>
            <h2>
              Birlikte çalışmanın
              <br />
              <em>başka bir izi.</em>
            </h2>
          </div>
          <p>
            Asil üye, yönetim ve danışman kartları.
            <br />
            Kulüp yönetimi unvanını atadığında
            <br />
            kartın kendiliğinden değişir.
          </p>
        </div>
        <div className="collection-grid">
          {(['assembly', 'executive'] as CardStyle[]).map((s) => (
            <article key={s}>
              <CardPresentation
                loading="lazy"
                style={s}
                data={{
                  name: 'Adın Soyadın',
                  number: 'BMK-26-XXXXXXXX',
                  role: roleFor(s),
                  issued: 2026,
                  sample: true,
                }}
              />
              <div className="card-spec">
                <div>
                  <h3>{cardDesigns[s].name}</h3>
                  <p>{cardDesigns[s].caption}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <article className="advisor-showcase">
          <div>
            <span className="m-eyebrow">AKADEMİK DANIŞMAN</span>
            <h3>{cardDesigns.advisor.name}.</h3>
            <p>
              Vaktini ayıran, yol gösteren,
              <br />
              yaptığımız işe inanan hocamıza.
            </p>
            <span className="advisor-signature">Saygıyla, SCÜ BMK.</span>
          </div>
          <CardPresentation
            loading="lazy"
            style="advisor"
            data={{
              name: 'Danışmanımızın adı',
              number: 'BMK-26-XXXXXXXX',
              role: 'advisor',
              issued: 2026,
              sample: true,
            }}
          />
        </article>
      </section>
      <section className="membership-bottom">
        <span className="m-eyebrow">KARTIN İÇİN HAZIR MISIN?</span>
        <a href="/uye-ol">Aramıza katıl.</a>
        <p>
          Zaten hesabın var mı? <a href="/giris">Giriş yap</a>
        </p>
      </section>
    </>
  );
}
