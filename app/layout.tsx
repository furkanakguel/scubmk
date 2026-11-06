import type { Metadata } from 'next';
import './globals.css';
import './game.css';
import './club.css';
import './experience.css';
import './motion.css';
import './world.css';
import './membership.css';
import './admin/admin.css';
import './terminal-auth.css';
import './workshop.css';
import './desktop.css';
import './desktop-personalization.css';
import './terminal-dino.css';
import './home/home.css';
import './admin/home-editor.css';
import './mobile-layout.css';
export const metadata: Metadata = {
  title: 'SCÜ BMK · Bilgisayar Mühendisliği Kulübü',
  description:
    'Sivas Cumhuriyet Üniversitesi Bilgisayar Mühendisliği Kulübü. Etkinlikler, atölyeler ve kulüp ekibi.',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
