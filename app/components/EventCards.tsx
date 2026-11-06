import { CalendarDays } from 'lucide-react';
import { ClubEvent, dateLabel } from '../data';
import { imageUrl } from '../content-model';
export default function EventCards({ events }: { events: ClubEvent[] }) {
  return (
    <div className="club-event-grid">
      {events.map((e, i) => {
        const past = new Date(e.date).getTime() < Date.now();
        return (
          <a className="club-event" href={'/etkinlik/' + e.id} key={e.id}>
            <div className={'event-poster poster-' + (i % 3)}>
              {e.image_id ? (
                <img src={imageUrl(e.image_id)} alt={e.image_alt || e.title} loading="lazy" />
              ) : (
                <>
                  <span>SCÜ BMK / {e.category}</span>
                  <strong>{e.title}</strong>
                  <span>{dateLabel(e.date)}</span>
                </>
              )}
              <span className="event-state">
                {past ? 'Geride kalan' : e.registration_open ? 'Başvurular açık' : 'Yakında'}
              </span>
            </div>
            <div className="event-meta">
              <span>
                <CalendarDays size={13} />
                {dateLabel(e.date)}
              </span>
              <span>{e.category}</span>
            </div>
            <h3>{e.title}</h3>
            <p>{e.location}</p>
          </a>
        );
      })}
    </div>
  );
}
