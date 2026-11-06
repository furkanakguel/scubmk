import { recoveryMailConfigured } from '../recovery-mail';
import MemberRecovery from './MemberRecovery';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Şifremi unuttum · SCÜ BMK',
  robots: { index: false, follow: false },
};
export default function Recovery() {
  return <MemberRecovery emailAvailable={recoveryMailConfigured()} />;
}
