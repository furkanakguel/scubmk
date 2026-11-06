import { redirect } from 'next/navigation';
import { getAdmin } from '../admin-auth';
import Admin from './Admin';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Yönetim · SCÜ BMK', robots: { index: false, follow: false } };
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string }>;
}) {
  const scan = (await searchParams).scan;
  const user = await getAdmin();
  if (!user)
    redirect('/admin/giris' + (scan && /^[a-f0-9]{48}$/.test(scan) ? '?scan=' + scan : ''));
  return <Admin user={user} />;
}
