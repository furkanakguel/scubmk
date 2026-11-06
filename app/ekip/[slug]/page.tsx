import { notFound } from 'next/navigation';
import WorldShell from '../../components/WorldShell';
import { getMembers, parseList, imageUrl } from '../../content';
import { ArrowUpRight } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Profile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await getMembers(),
    m = all.find((m) => m.slug === slug);
  if (!m) notFound();
  const links = parseList<{ label: string; url: string }>(m.links),
    skills = parseList<string>(m.skills);
  return (
    <WorldShell>
      <main id="icerik" className="club-page">
        <a className="back-link" href="/ekip">
          ← Ekibimiz
        </a>
        <article className="person-profile">
          <div>
            {m.photo_id ? (
              <img
                className="profile-photo"
                src={imageUrl(m.photo_id)}
                alt={m.photo_alt || m.name}
              />
            ) : (
              <div className="member-initials profile-initials">
                {m.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            <span className="profile-photo-label">SCÜ BMK {m.team ? ' / ' + m.team : ''}</span>
          </div>
          <div>
            <span className="small-label">{m.role}</span>
            <h1>{m.name}</h1>
            {(m.department || m.year) && (
              <p className="profile-department">
                {[m.department, m.year].filter(Boolean).join(' · ')}
              </p>
            )}
            {m.bio && (
              <div className="profile-bio">
                <h2>Hakkında</h2>
                <p>{m.bio}</p>
              </div>
            )}
            {skills.length > 0 && (
              <div className="profile-skills">
                <h2>İlgi alanları</h2>
                <div>
                  {skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {links.length > 0 && (
              <div className="profile-links">
                {links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                    {l.label}
                    <ArrowUpRight size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>
      </main>
    </WorldShell>
  );
}
