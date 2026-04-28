import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import type { Product, SiteSettings } from '@/types';

interface Props {
  products: Product[];
  content?: SiteSettings['homeContent'];
}

export function SaleBanner({ products, content }: Props) {
  const visible = products.filter((product) => product.visible && product.images.length > 0);
  const saleLead =
    visible.find((product) => product.tags.includes('bestseller')) ??
    visible.find((product) => (product.comparePrice ?? 0) > product.price) ??
    visible.find((product) => product.tags.includes('sale')) ??
    visible[0];

  if (!saleLead) return null;

  return (
    <section className="bg-[#F8F6F3] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal><p className="text-xs tracking-widest uppercase text-[#C8A882] mb-3">{content?.saleBannerBadgeText || 'Member Offer'}</p></Reveal>
            <Reveal delayMs={70}><h2 className="font-serif text-5xl md:text-6xl font-light text-[#0A0A0A] mb-6 leading-tight">
              {content?.saleBannerHeading || 'Sign Up to get upto 60% off'}
            </h2></Reveal>
            <Reveal delayMs={110}><p className="text-[#6B6B6B] mb-4">
              {content?.saleBannerBody || 'Create your account and unlock exclusive offers on curated jewellery and category favorites.'}
            </p></Reveal>
            <Reveal delayMs={170}><Link href={content?.saleBannerCtaUrl || '/contact-us'} className="btn-primary inline-block">
              {content?.saleBannerCtaLabel || 'Sign Up Now'}
            </Link></Reveal>
          </div>
          <Reveal className="relative h-[420px] md:h-[520px] overflow-hidden bg-[#EDE9E3]">
            <Image
              src={saleLead.images[0]}
              alt={saleLead.name}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
