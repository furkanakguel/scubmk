import { requestFailure, db, json, sameOrigin, body, hash, rate } from '../../server';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Geçersiz istek.' }, 403);
  try {
    if (!(await rate(request, 'ticket', 40)))
      return json({ error: 'Lütfen biraz sonra tekrar dene.' }, 429);
    const data = await body(request);
    if (typeof data.token !== 'string' || !/^[a-f0-9]{48}$/.test(data.token))
      return json({ error: 'Bilet bağlantısı geçerli değil.' }, 400);
    const ticket = await db()
      .prepare(
        'SELECT r.id,COALESCE(e.title,r.event_title) AS title,COALESCE(e.date,r.event_date) AS date,COALESCE(e.location,r.event_location) AS location,r.name,r.demo,r.created_at AS createdAt,r.checked_in_at AS checkedInAt FROM registrations r LEFT JOIN events e ON e.id=r.event_id WHERE r.token_hash=?',
      )
      .bind(await hash(data.token))
      .first();
    if (!ticket) return json({ error: 'Bu bağlantıya ait bilet bulunamadı.' }, 404);
    return json({ ticket, checkin: (await hash('checkin:' + data.token)).slice(0, 48) });
  } catch (e) {
    return requestFailure(e, 'Bilet şu anda yüklenemiyor.');
  }
}
