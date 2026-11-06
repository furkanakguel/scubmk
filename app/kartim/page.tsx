import { redirect } from 'next/navigation';
import { getMember } from '../member-auth';
import WorldShell from '../components/WorldShell';
import MyCard from './MyCard';
export const dynamic = 'force-dynamic';
export default async function Card() {
  const user = await getMember();
  if (!user) redirect('/giris');
  return (
    <WorldShell className="membership-world">
      <main id="icerik">
        <MyCard initial={user} />
      </main>
    </WorldShell>
  );
}
