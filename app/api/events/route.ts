import { getOperations } from '../../operations';
import { db, json } from '../../server';
import { getSettings } from '../../content';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const ops = (await getOperations()).settings;
    return json({
      registrationsOpen: ops.registrationsOpen,
      closedMessage: ops.closedMessage,
      events: (
        await db()
          .prepare(
            'SELECT e.*,(SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS count FROM events e WHERE published=1 AND archived=0 ORDER BY date',
          )
          .all()
      ).results.map((e) => (ops.registrationsOpen ? e : { ...e, registration_open: 0 })),
      membershipOpen: ops.registrationsOpen && (await getSettings()).membershipOpen,
    });
  } catch {
    return json({ error: 'Etkinlikler yüklenemedi.' }, 500);
  }
}
