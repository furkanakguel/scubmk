import { db } from '../../../server';
import WorldShell from '../../../components/WorldShell';
import { clubRoles, type ClubRole } from '../../../membership-model';
import { ShieldCheck, ShieldX } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Verify({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const u = /^[a-f0-9]{32}$/.test(code)
    ? await db()
        .prepare(
          'SELECT name,club_role,member_no,created_at FROM club_accounts WHERE card_code=? AND active=1',
        )
        .bind(code)
        .first<{ name: string; club_role: ClubRole; member_no: string; created_at: number }>()
    : null;
  return (
    <WorldShell className="membership-world">
      <main id="icerik" className="card-verification">
        <span className="m-eyebrow">SCÜ BMK / KART DOĞRULAMA</span>
        {u ? (
          <>
            <ShieldCheck size={56} />
            <span className="verified-label">AKTİF KULÜP ÜYELİĞİ</span>
            <h1>{u.name}</h1>
            <p>{clubRoles[u.club_role]}</p>
            <dl>
              <div>
                <dt>Üye numarası</dt>
                <dd>{u.member_no}</dd>
              </div>
              <div>
                <dt>Katılım yılı</dt>
                <dd>{new Date(u.created_at).getFullYear()}</dd>
              </div>
            </dl>
            <small>
              Bu bilgiler kulübün güncel üyelik kaydından alınır.
              <br />
              Kulüp kartı, üniversite öğrenci kimliği veya etkinlik bileti değildir.
            </small>
          </>
        ) : (
          <>
            <ShieldX size={56} />
            <h1>Kart doğrulanamadı.</h1>
            <p>
              Bu kart bulunamadı veya üyeliğin erişimi kapalı.
              <br />
              Kulüp yönetimine ulaşabilirsin.
            </p>
          </>
        )}
        <a href="/" className="m-button outline">
          SCÜ BMK’ye git
        </a>
      </main>
    </WorldShell>
  );
}
