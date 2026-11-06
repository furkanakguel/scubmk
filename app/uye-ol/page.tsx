import { redirect } from 'next/navigation';
import { getMember } from '../member-auth';
import MemberAuth from '../giris/MemberAuth';
export const dynamic = 'force-dynamic';
export default async function Signup() {
  if (await getMember()) redirect('/kartim');
  return <MemberAuth initial="signup" />;
}
