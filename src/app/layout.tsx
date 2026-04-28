import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { getNavigation, getSettings } from '@/lib/data-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.seo.title,
    description: settings.seo.description,
    keywords: settings.seo.keywords,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, navigation] = await Promise.all([getSettings(), getNavigation()]);
  return (
    <html lang="en">
      <body>
        <AnnouncementBar settings={settings.announcementBar} />
        <Header navigation={navigation} />
        <CartDrawer />
        <main>{children}</main>
        <Footer settings={settings} navigation={navigation} />
      </body>
    </html>
  );
}
