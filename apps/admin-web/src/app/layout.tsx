import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AdminLayout } from '@/components/AdminLayout';

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'New Chirag Tours & Travels — Booking & Quotation Portal',
  description: 'Official Tour Booking, CRM & Quotation Platform — New Chirag Tours & Travels (Faisal Bikanerwala)',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NC Admin',
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f766e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NC Admin" />
        <link rel="icon" type="image/png" sizes="32x32" href="/branding/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/branding/favicon-16x16.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/branding/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
