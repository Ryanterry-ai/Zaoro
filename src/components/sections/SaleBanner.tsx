import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import type { Product, SiteSettings } from '@/types';

interface Props {
  products: Product[];
  content?: SiteSettings['homeContent'];
}

const categoryLabel = (value: string) =>
  value
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

export function SaleBanner({ products, content }: Props) {
  const visible = products.filter((product) => product.visible && product.images.length > 0);
  const saleLead =
    visible.find((product) => product.tags.includes('bestseller')) ??
    visible.find((product) => (product.comparePrice ?? 0) > product.price) ??
    visible.find((product) => product.tags.includes('sale')) ??
    visible[0];

  if (!saleLead) return null;

  const sidePick =
    visible.find((product) => product.id !== saleLead.id && product.category !== saleLead.category) ??
    visible.find((product) => product.id !== saleLead.id);

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
            <Reveal delayMs={190}>
              <p className="text-sm text-[#6B6B6B] mt-5">
                {content?.saleBannerPromoText || 'Limited-time member savings on best sellers.'}
              </p>
            </Reveal>
          </div>
          <Reveal className="relative h-[420px] md:h-[480px]">
            <div
              className="absolute inset-0 bg-white/70"
              style={{
                clipPath:
                  'polygon(7% 24%, 23% 8%, 45% 4%, 64% 11%, 82% 22%, 92% 40%, 88% 61%, 77% 78%, 57% 90%, 35% 96%, 16% 88%, 6% 69%, 4% 47%)',
              }}
            >
              <Image
                src={saleLead.images[0]}
                alt={saleLead.name}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div
              className="absolute inset-0 border-4 border-[#F2BE22]"
              style={{
                clipPath:
                  'polygon(7% 24%, 23% 8%, 45% 4%, 64% 11%, 82% 22%, 92% 40%, 88% 61%, 77% 78%, 57% 90%, 35% 96%, 16% 88%, 6% 69%, 4% 47%)',
              }}
            />
            {sidePick ? (
              <Link
                href={`/products/${sidePick.handle}`}
                className="absolute right-0 bottom-0 bg-white/95 backdrop-blur px-4 py-3 shadow-md max-w-[260px] hover:-translate-y-1 transition-transform"
              >
                <p className="text-xs uppercase tracking-widest text-[#6B6B6B] mb-1">{categoryLabel(sidePick.category)}</p>
                <p className="text-sm text-[#0A0A0A] font-medium leading-snug">{sidePick.name}</p>
              </Link>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
