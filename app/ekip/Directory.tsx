'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Member, imageUrl } from '../content-model';
export default function Directory({ members }: { members: Member[] }) {
  const [q, setQ] = useState(''),
    [team, setTeam] = useState('');
  const groups = Array.from(new Set(members.map((m) => m.team).filter(Boolean)));
  const filtered = members.filter(
    (m) =>
      (!team || m.team === team) &&
      `${m.name} ${m.role} ${m.department}`
        .toLocaleLowerCase('tr-TR')
        .includes(q.toLocaleLowerCase('tr-TR')),
  );
  if (!members.length)
    return (
      <div className="quiet-empty">
        <h2>Ekip sayfamızı hazırlıyoruz.</h2>
        <p>Ekibimizle ilgili güncel duyuruları Instagram’da bulabilirsin.</p>
        <a href="https://www.instagram.com/cumhuriyetbmk/" target="_blank" rel="noreferrer">
          @cumhuriyetbmk ↗
        </a>
      </div>
    );
  return (
    <>
      <div className="directory-tools">
        <label>
          <Search size={17} />
          <input
            placeholder="İsim veya görev ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Ekipte ara"
          />
        </label>
        {groups.length > 1 && (
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            aria-label="Ekibe göre filtrele"
          >
            <option value="">Tüm ekipler</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        )}
        <span>{filtered.length} kişi</span>
      </div>
      <div className="member-directory">
        {filtered.map((m) => (
          <a className="person-card" key={m.id} href={'/ekip/' + m.slug}>
            {m.photo_id ? (
              <img src={imageUrl(m.photo_id)} alt={m.photo_alt || m.name} loading="lazy" />
            ) : (
              <div className="member-initials">
                {m.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            <div>
              <h2>{m.name}</h2>
              <p>{m.role}</p>
              <span>{m.department}</span>
            </div>
          </a>
        ))}
      </div>
      {!filtered.length && <p className="quiet-empty">Bu aramayla eşleşen bir kişi yok.</p>}
    </>
  );
}
