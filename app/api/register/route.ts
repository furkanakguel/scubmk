import { getOperations } from '../../operations';
import { requestFailure, db, json, sameOrigin, body, hash, token, rate } from '../../server';
import { membership, ClubEvent } from '../../data';
import { z } from 'zod';
import { getSettings } from '../../content';
const schema = z.object({
  eventId: z.string().max(80),
  name: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(180),
  department: z.string().trim().min(2).max(100),
  year: z.enum(['Hazırlık', '1. sınıf', '2. sınıf', '3. sınıf', '4. sınıf', 'Mezun', 'Diğer']),
  answer: z.string().trim().max(1500),
  consent: z.literal(true),
  website: z.string().max(0),
});
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz istek.' }, 403);
  try {
    if (!(await rate(request, 'register', 10)))
      return json(
        { error: 'Çok fazla deneme yaptın. Birkaç dakika sonra tekrar deneyebilirsin.' },
        429,
      );
    const result = schema.safeParse(await body(request));
    if (!result.success)
      return json({ error: 'Lütfen formdaki bilgileri ve onay alanını kontrol et.' }, 400);
    const ops = (await getOperations()).settings;
    if (!ops.registrationsOpen) return json({ error: ops.closedMessage }, 503);
    const data = result.data;
    let event: ClubEvent | null =
      data.eventId === 'membership' && (await getSettings()).membershipOpen ? membership : null;
    if (!event)
      event = await db()
        .prepare(
          'SELECT * FROM events WHERE id=? AND published=1 AND archived=0 AND registration_open=1',
        )
        .bind(data.eventId)
        .first<ClubEvent>();
    if (!event) return json({ error: 'Bu etkinlik kayıt almıyor.' }, 404);
    if (event.date && new Date(event.date).getTime() < Date.now())
      return json({ error: 'Bu etkinliğin kayıt süresi sona erdi.' }, 409);
    const access = token(),
      checkin = (await hash('checkin:' + access)).slice(0, 48),
      id = crypto.randomUUID();
    const email = data.email.toLowerCase();
    const resultDb = await db()
      .prepare(
        `INSERT INTO registrations (id,event_id,event_title,event_date,event_location,name,email,department,year,answer,token_hash,checkin_hash,demo,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM registrations WHERE event_id=?) < CASE WHEN ?='membership' THEN COALESCE((SELECT json_extract(value,'$.membershipCapacity') FROM settings WHERE key='operations'),10000) ELSE (SELECT capacity FROM events WHERE id=? AND published=1 AND archived=0 AND registration_open=1 AND julianday(date)>julianday(?)) END AND COALESCE((SELECT json_extract(value,'$.registrationsOpen') FROM settings WHERE key='operations'),1)=1 AND (?!='membership' OR EXISTS(SELECT 1 FROM settings WHERE key='site' AND json_extract(value,'$.membershipOpen')=1))`,
      )
      .bind(
        id,
        event.id,
        event.title,
        event.date,
        event.location,
        data.name,
        email,
        data.department,
        data.year,
        data.answer,
        await hash(access),
        await hash(checkin),
        event.demo ? 1 : 0,
        Date.now(),
        event.id,
        event.id,
        event.id,
        new Date().toISOString(),
        event.id,
      )
      .run();
    if (!resultDb.meta.changes)
      return json({ error: 'Kontenjan doldu veya başvurular kapatıldı.' }, 409);
    return json({ token: access, checkin, title: event.title }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return json(
        {
          error:
            'Bu bilgilerle mevcut bir başvuru var. “Biletim” bölümündeki kayıtlı biletini kullanabilirsin.',
        },
        409,
      );
    return requestFailure(e, 'Başvurun kaydedilemedi. Lütfen biraz sonra tekrar dene.');
  }
}
