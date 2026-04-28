import Link from 'next/link';
import type { NavigationData, SiteSettings } from '@/types';

interface Props {
  settings: SiteSettings;
  nav: NavigationData;
}

export function Footer({ settings, nav }: Props) {
  return (
    <footer>
      <div className="bg-[#0A0A0A] text-white py-8 overflow-hidden">
        <div className="flex whitespace-nowrap">
          <div className="animate-marquee flex gap-16 pr-16 items-center">
            {[0, 1, 2].map((i) => (
              <span key={i} className="text-4xl md:text-5xl font-serif italic font-light">
                ## {settings.footerTagline}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#0A0A0A] text-white border-t border-[#222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2">
              <Link href="/" className="font-serif text-2xl font-semibold tracking-wider text-white block mb-4">
                ZARO
              </Link>
              <p className="text-[#6B6B6B] text-sm leading-relaxed max-w-xs">{settings.description}</p>
              <div className="mt-6 flex gap-0">
                <input
                  type="email"
                  placeholder="Subscribe"
                  className="bg-[#1A1A1A] border border-[#333] text-white text-sm px-4 py-3 flex-1 outline-none placeholder:text-[#555] focus:border-[#555]"
                />
                <button className="bg-white text-[#0A0A0A] px-5 py-3 text-sm font-medium hover:bg-[#EDE9E3] transition-colors">{'->'}</button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold tracking-widest uppercase mb-5 text-white">Quick Link</h4>
              <ul className="space-y-3">
                {nav.footer.quickLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.url} className="text-sm text-[#6B6B6B] hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold tracking-widest uppercase mb-5 text-white">Collections</h4>
              <ul className="space-y-3">
                {nav.footer.collections.map((link, i) => (
                  <li key={i}>
                    <Link href={link.url} className="text-sm text-[#6B6B6B] hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold tracking-widest uppercase mb-5 text-white">Legal</h4>
              <ul className="space-y-3">
                {nav.footer.legal.map((link, i) => (
                  <li key={i}>
                    <Link href={link.url} className="text-sm text-[#6B6B6B] hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-[#222] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#6B6B6B]">(c) Copyright 2026 {settings.siteName}. All Rights Reserved.</p>
            <div className="flex items-center gap-4">
              <a href={settings.socialLinks.instagram} className="text-[#6B6B6B] hover:text-white transition-colors text-xs tracking-wide">IG</a>
              <a href={settings.socialLinks.facebook} className="text-[#6B6B6B] hover:text-white transition-colors text-xs tracking-wide">FB</a>
              <a href={settings.socialLinks.twitter} className="text-[#6B6B6B] hover:text-white transition-colors text-xs tracking-wide">X</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

