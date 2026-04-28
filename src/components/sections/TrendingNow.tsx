import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

export function TrendingNow({ products }: Props) {
  const trending = products.filter((p) => p.tags.includes('trending')).slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Trending Now</h2></Reveal>
        <Link href="/products" className="text-sm font-medium tracking-wide underline underline-offset-4 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          View All
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
