import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import type { Product, SiteSettings } from '@/types';

interface Props {
  products: Product[];
  content?: SiteSettings['homeContent'];
}

const CATEGORY_PRIORITY = ['earrings', 'bracelets', 'necklaces', 't-shirts', 'suits', 'shorts', 'sets'];

export function TrendingNow({ products, content }: Props) {
  const byCategory = CATEGORY_PRIORITY
    .map((category) => products.find((p) => p.category === category))
    .filter((p): p is Product => Boolean(p));
  const unique = Array.from(new Map([...byCategory, ...products].map((p) => [p.id, p])).values());
  const trending = unique.slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">{content?.trendingTitle || 'Trending Now'}</h2></Reveal>
        <Link href={content?.trendingViewAllUrl || '/products'} className="text-sm font-medium tracking-wide underline underline-offset-4 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          {content?.trendingViewAllLabel || 'View All'}
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {trending.map((product, i) => (
          <Reveal key={product.id} delayMs={i * 60}><ProductCard product={product} /></Reveal>
        ))}
      </div>
    </section>
  );
}
