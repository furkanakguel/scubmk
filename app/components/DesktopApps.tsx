'use client';
import { memo } from 'react';
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { AppId } from '../lab/terminal';
import {
  desktopPath,
  memberGroup,
  type DesktopContent,
  type DesktopMember,
} from '../lab/public-content';
import { HELP_QUESTIONS } from '../lab/help';
import { DesktopIcon, PixelDino, appLabels } from './DesktopIcons';
import { CardPresentation } from './MemberCard';
import { cardDesigns, regularStyles, type CardStyle } from '../membership-model';
const Runner = lazy(() => import('./BmkRunner'));
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="os-empty">
        <p>Bu pencere yüklenemedi. Sayfayı yenileyip tekrar deneyebilirsin.</p>
        <a href="/oyun">BMK Run sayfasını aç</a>
      </div>
    ) : (
      this.props.children
    );
  }
}
const groups = [
  ['all', 'Herkes'],
  ['board', 'Yönetim'],
  ['core', 'Asil üyeler'],
  ['advisor', 'Danışman'],
  ['team', 'Ekip'],
] as const;
function Person({ person, onBack }: { person: DesktopMember; onBack: () => void }) {
  return (
    <div className="os-person">
      <button className="os-button" onClick={onBack}>
        ← Ekibe dön
      </button>
      <div className="os-person-main">
        {person.photoId ? (
          <img
            src={desktopPath.photo(person.photoId)}
            alt={person.photoAlt || person.name}
            width={240}
            height={280}
          />
        ) : (
          <div className="os-person-placeholder">
            <DesktopIcon app="team" />
          </div>
        )}
        <div>
          <span className="os-kicker">{person.team || 'SCÜ BMK'}</span>
          <h3>{person.name}</h3>
          <strong>{person.role}</strong>
          <p>{person.department}</p>
          <p className="os-bio">{person.bio || 'Bu üyenin tanıtımı henüz eklenmedi.'}</p>
          <a className="os-button" href={desktopPath.member(person.slug)}>
            Profil sayfasını aç
          </a>
        </div>
      </div>
    </div>
  );
}
function Team({ content }: { content: DesktopContent }) {
  const [group, setGroup] = useState('all'),
    [query, setQuery] = useState(''),
    [selected, setSelected] = useState<DesktopMember | null>(null);
  const people = content.members.filter(
    (m) =>
      (group === 'all' || memberGroup(m) === group) &&
      (m.name + ' ' + m.role + ' ' + m.team)
        .toLocaleLowerCase('tr-TR')
        .includes(query.toLocaleLowerCase('tr-TR')),
  );
  return selected ? (
    <Person person={selected} onBack={() => setSelected(null)} />
  ) : (
    <>
      <div className="os-folder-intro">
        <DesktopIcon app="team" />
        <div>
          <h3>İsimlerin arkasındaki ekip.</h3>
          <p>Birlikte öğrenen, üreten ve kulübü büyüten insanlar.</p>
        </div>
      </div>
      <div className="os-folder-tools">
        <div role="group" aria-label="Ekip grubu">
          {groups.map(([id, label]) => (
            <button
              key={id}
              className="os-button"
              aria-pressed={group === id}
              onClick={() => setGroup(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="os-search">
          İsim ara
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ad veya görev"
            maxLength={80}
          />
        </label>
      </div>
      <div className="os-member-grid">
        {people.map((m) => (
          <button className="os-member" key={m.id} onClick={() => setSelected(m)}>
            {m.photoId ? (
              <img
                loading="lazy"
                decoding="async"
                src={desktopPath.photo(m.photoId)}
                alt=""
                width={70}
                height={78}
              />
            ) : (
              <DesktopIcon app="team" />
            )}
            <span>
              <strong>{m.name}</strong>
              <small>{m.role}</small>
              <span>{m.team}</span>
            </span>
          </button>
        ))}
      </div>
      {!people.length && (
        <div className="os-empty">
          <DesktopIcon app="team" />
          <p>
            {content.members.length
              ? 'Bu aramaya uygun profil bulunamadı.'
              : 'Ekip profilleri yayımlandığında burada görünecek.'}
          </p>
          <a href="/ekip">Ekip sayfasına git</a>
        </div>
      )}
    </>
  );
}
function Events({ content }: { content: DesktopContent }) {
  const [query, setQuery] = useState('');
  const events = content.events.filter((e) =>
    (e.title + ' ' + e.category)
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR')),
  );
  return (
    <>
      <div className="os-folder-intro">
        <DesktopIcon app="events" />
        <div>
          <h3>Takvimde buluşalım.</h3>
          <p>Atölyeler, sohbetler ve birlikte geçireceğimiz zaman.</p>
        </div>
      </div>
      <div className="os-folder-tools">
        <a className="os-button" href="/etkinlikler">
          Etkinlik takvimini aç
        </a>
        <label className="os-search">
          Etkinlik ara
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Etkinlik veya kategori"
            maxLength={80}
          />
        </label>
      </div>
      <div className="os-events">
        {events.map((e) => (
          <a href={desktopPath.event(e.id)} className="os-event" key={e.id}>
            {e.imageId ? (
              <img
                src={desktopPath.photo(e.imageId)}
                alt={e.imageAlt || ''}
                width={220}
                height={140}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="os-event-placeholder">
                <DesktopIcon app="events" />
              </div>
            )}
            <div>
              <span className="os-kicker">{e.category}</span>
              <h4>{e.title}</h4>
              <p>{e.description}</p>
              <span className="os-event-date">
                {Number.isFinite(Date.parse(e.date))
                  ? new Date(e.date).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Europe/Istanbul',
                    })
                  : 'Tarih duyurulacak'}{' '}
                · {e.location}
              </span>
            </div>
          </a>
        ))}
      </div>
      {!events.length && (
        <div className="os-empty">
          <DesktopIcon app="events" />
          <p>
            {content.events.length
              ? 'Bu aramaya uygun etkinlik bulunamadı.'
              : 'Yeni etkinlikler yayımlandığında burada görünecek.'}
          </p>
        </div>
      )}
    </>
  );
}
function Help({ openTerminal }: { openTerminal: () => void }) {
  const [selected, setSelected] = useState(0);
  const q = HELP_QUESTIONS[selected];
  return (
    <div className="os-help">
      <nav aria-label="Masaüstü sık sorulan sorular">
        <span>Yardım konuları</span>
        {HELP_QUESTIONS.map((q, i) => (
          <button key={q.id} aria-pressed={i === selected} onClick={() => setSelected(i)}>
            <DesktopIcon app="faq" />
            {q.q}
          </button>
        ))}
      </nav>
      <article>
        <span className="os-kicker">BMK YARDIM / {String(selected + 1).padStart(2, '0')}</span>
        <h3>{q.q}</h3>
        <p>{q.a}</p>
        {q.href === '#kesfet' ? (
          <button className="os-button" onClick={openTerminal}>
            {q.label}
          </button>
        ) : q.href === 'instagram' ? (
          <a
            className="os-button"
            href="https://www.instagram.com/cumhuriyetbmk/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {q.label}
          </a>
        ) : (
          <a className="os-button" href={q.href}>
            {q.label}
          </a>
        )}
      </article>
    </div>
  );
}
function Cards() {
  const [style, setStyle] = useState<CardStyle>('mono');
  return (
    <>
      <div className="os-folder-intro">
        <DesktopIcon app="cards" />
        <div>
          <h3>Cebindeki kulüp.</h3>
          <p>Dört yüz. Aynı topluluk. Bunlar örnek tasarımlar.</p>
        </div>
      </div>
      <div className="os-card-view">
        <div className="os-card-tabs" role="group" aria-label="Örnek kart tasarımı">
          {regularStyles.map((s) => (
            <button
              className="os-button"
              aria-pressed={style === s}
              onClick={() => setStyle(s)}
              key={s}
            >
              {cardDesigns[s].name}
            </button>
          ))}
        </div>
        <CardPresentation
          style={style}
          data={{
            name: 'SCÜ BMK',
            number: 'BMK · ÖRNEK',
            role: 'member',
            issued: Date.UTC(2026, 0, 1),
            sample: true,
          }}
        />
        <p>{cardDesigns[style].caption}</p>
        <a href="/kartlar" className="os-button">
          Kart koleksiyonunu aç
        </a>
      </div>
    </>
  );
}
function Game({ active }: { active: boolean }) {
  const [playing, setPlaying] = useState(false);
  return playing ? (
    <div className="os-embedded-game">
      <div className="os-game-notice">
        <span>Başka pencereye geçtiğinde oyun duraklar.</span>
        <a href="/oyun">Oyun sayfasında aç</a>
      </div>
      <AppBoundary>
        <Suspense
          fallback={
            <p className="os-empty" role="status">
              BMK Run yükleniyor…
            </p>
          }
        >
          <Runner embedded active={active} />
        </Suspense>
      </AppBoundary>
    </div>
  ) : (
    <div className="os-game-launch">
      <div className="os-game-sky">
        <PixelDino />
        <span className="os-game-star">✦</span>
        <span className="os-game-track" />
      </div>
      <span className="os-kicker">BMK RUN.EXE</span>
      <h3>Bir tur daha?</h3>
      <p>
        Zıpla, kay ve uç. Parkur her koşuda değişir.
        <br />
        Günlük sıralamada yerini al.
      </p>
      <button className="os-button" onClick={() => setPlaying(true)}>
        ▶ Pencerede oyna
      </button>
      <a href="/oyun">Oyun sayfasını aç</a>
      <div className="os-game-keys">
        <span>
          <kbd>↑</kbd> Zıpla
        </span>
        <span>
          <kbd>↓</kbd> Kay
        </span>
        <span>
          <kbd>E</kbd> Kalkan
        </span>
      </div>
    </div>
  );
}
function DesktopApps({
  app,
  content,
  openTerminal,
  active,
}: {
  app: Exclude<AppId, 'terminal' | 'console' | 'notes' | 'settings'>;
  content: DesktopContent;
  openTerminal: () => void;
  active: boolean;
}) {
  return (
    <div className={'os-folder-body os-folder-' + app} aria-label={appLabels[app]}>
      {app === 'events' ? (
        <Events content={content} />
      ) : app === 'team' ? (
        <Team content={content} />
      ) : app === 'faq' ? (
        <Help openTerminal={openTerminal} />
      ) : app === 'cards' ? (
        <Cards />
      ) : (
        <Game active={active} />
      )}
    </div>
  );
}

export default memo(DesktopApps);
