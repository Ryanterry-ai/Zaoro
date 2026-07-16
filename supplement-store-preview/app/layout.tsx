import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata: Metadata = {
  title: 'NutriMart',
  description: 'NutriMart — built with Build Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <GlobalFooter />
      </body>
    </html>
  );
}
