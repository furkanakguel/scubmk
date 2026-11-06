import WorldShell from '../components/WorldShell';
import { getMembers } from '../content';
import Directory from './Directory';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ekibimiz · SCÜ BMK' };
export default async function Team() {
  return (
    <WorldShell>
      <main id="icerik" className="club-page">
        <div className="page-heading">
          <span className="small-label">SCÜ BMK / EKİBİMİZ</span>
          <h1>
            Kulübün arkasındaki
            <br />
            insanlar.
          </h1>
          <p>Etkinlikleri hazırlayan, fikirleri paylaşan, kulübe emek veren ekip.</p>
        </div>
        <Directory members={await getMembers()} />
        <div className="team-invitation">
          <h2>Sen de aramıza katıl.</h2>
          <p>Bir etkinlikte görev almak veya fikrini paylaşmak için bize ulaşabilirsin.</p>
          <a className="club-button" href="/uye-ol">
            Kulübe katıl
          </a>
        </div>
      </main>
    </WorldShell>
  );
}
