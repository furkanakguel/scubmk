import WorldShell from '../components/WorldShell';
import EventCards from '../components/EventCards';
import { db } from '../server';
import { ClubEvent } from '../data';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Etkinlikler · SCÜ BMK' };
export default async function Events() {
  const events = (
      await db()
        .prepare('SELECT * FROM events WHERE published=1 AND archived=0 ORDER BY date')
        .all<ClubEvent>()
    ).results,
    now = Date.now(),
    next = events.filter((e) => new Date(e.date).getTime() >= now),
    past = events.filter((e) => new Date(e.date).getTime() < now).reverse();
  return (
    <WorldShell>
      <main className="club-page" id="icerik">
        <div className="page-heading">
          <span className="small-label">SCÜ BMK / TAKVİM</span>
          <h1>Etkinlikler</h1>
          <p>Atölyeler, söyleşiler ve kampüs buluşmaları.</p>
        </div>
        <h2 className="list-heading">
          Yaklaşan etkinlikler <span>{next.length}</span>
        </h2>
        {next.length ? (
          <EventCards events={next} />
        ) : (
          <div className="quiet-empty">
            <h3>Şu anda duyurulmuş bir etkinlik yok.</h3>
            <p>Yeni programı burada ve Instagram hesabımızda paylaşacağız.</p>
            <a href="https://www.instagram.com/cumhuriyetbmk/" target="_blank" rel="noreferrer">
              Instagram’a git ↗
            </a>
          </div>
        )}
        {past.length > 0 && (
          <>
            <h2 className="list-heading">
              Geride kalanlar <span>{past.length}</span>
            </h2>
            <EventCards events={past} />
          </>
        )}
      </main>
    </WorldShell>
  );
}
