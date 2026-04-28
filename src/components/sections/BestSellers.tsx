'use client';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

export function BestSellers({ products }: Props) {
  const jewellery = products
    .filter((product) => ['earrings', 'bracelets', 'necklaces'].includes(product.category))
    .slice(0, 5);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
        <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Jewellery</h2></Reveal>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 animate-[fadeInUp_420ms_ease-out]">
        {jewellery.map((product, i) => (
          <Reveal key={product.id} delayMs={i * 60}><ProductCard product={product} /></Reveal>
        ))}
      </div>
    </section>
  );
}

