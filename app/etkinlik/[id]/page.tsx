import { notFound } from 'next/navigation';
import WorldShell from '../../components/WorldShell';
import { db } from '../../server';
import { ClubEvent, dateLabel } from '../../data';
import { imageUrl } from '../../content';
import { CalendarDays, MapPin, Users } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Event({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await db()
    .prepare(
      'SELECT e.*,(SELECT COUNT(*) FROM registrations WHERE event_id=e.id) AS count FROM events e WHERE id=? AND published=1 AND archived=0',
    )
    .bind(id)
    .first<ClubEvent>();
  if (!e) notFound();
  const past = new Date(e.date).getTime() < Date.now(),
    full = (e.count || 0) >= e.capacity;
  return (
    <WorldShell>
      <main id="icerik" className="club-page">
        <a className="back-link" href="/etkinlikler">
          ← Etkinlikler
        </a>
        <div className="event-detail">
          <div>
            {e.image_id ? (
              <img
                className="event-detail-image"
                src={imageUrl(e.image_id)}
                alt={e.image_alt || e.title}
              />
            ) : (
              <div className="event-detail-placeholder">
                <span>SCÜ BMK</span>
                <strong>{e.title}</strong>
                <span>
                  {e.category} / {dateLabel(e.date)}
                </span>
              </div>
            )}
          </div>
          <article>
            <span className="small-label">{e.category}</span>
            <h1>{e.title}</h1>
            <p className="event-lead">{e.description}</p>
            <dl className="event-facts">
              <div>
                <dt>
                  <CalendarDays />
                  Tarih
                </dt>
                <dd>
                  {dateLabel(e.date)} ·{' '}
                  {new Date(e.date).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Istanbul',
                  })}
                </dd>
              </div>
              <div>
                <dt>
                  <MapPin />
                  Yer
                </dt>
                <dd>{e.location}</dd>
              </div>
              <div>
                <dt>
                  <Users />
                  Kontenjan
                </dt>
                <dd>
                  {e.capacity} kişi{' '}
                  {!past && e.registration_open
                    ? `· ${Math.max(0, e.capacity - (e.count || 0))} yer kaldı`
                    : ''}
                </dd>
              </div>
            </dl>
            {!past && e.registration_open && !full ? (
              <a className="club-button" href={'/basvuru?event=' + e.id}>
                Etkinliğe başvur
              </a>
            ) : (
              <p className="registration-closed">
                {past
                  ? 'Bu etkinlik sona erdi.'
                  : full
                    ? 'Kontenjan doldu.'
                    : 'Başvurular şu anda kapalı.'}
              </p>
            )}
            {e.details && (
              <div className="event-description">
                <h2>Etkinlik hakkında</h2>
                <p>{e.details}</p>
              </div>
            )}
          </article>
        </div>
      </main>
    </WorldShell>
  );
}
