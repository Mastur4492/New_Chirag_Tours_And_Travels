import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { COMPANY_BRANDING } from '@/lib/branding';

export const metadata: Metadata = {
  title: `${COMPANY_BRANDING.name} — Customized Holidays & Tour Packages`,
  description: `Discover handcrafted holiday packages, verified hotels, and dedicated transport with ${COMPANY_BRANDING.name}. Managed by ${COMPANY_BRANDING.owner}, Ahmedabad.`,
  keywords: 'travel agency ahmedabad, tour packages kashmir kerala goa himachal, new chirag tours and travels, faisal bikanerwala',
  icons: {
    icon: [
      { url: '/branding/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/branding/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/branding/apple-touch-icon.png" />
      </head>
      <body>
        <Header />
        <main style={{ minHeight: 'calc(100vh - 160px)' }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
