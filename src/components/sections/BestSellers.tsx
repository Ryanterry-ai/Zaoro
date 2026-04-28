'use client';
import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { Reveal } from '@/components/ui/Reveal';
import type { Product } from '@/types';

const tabs = [
  { label: 'All', filter: null },
  { label: 'Women', filter: 'women' },
  { label: 'New Arrivals', filter: 'new-arrivals' },
  { label: 'Sale', filter: 'sale' },
];

interface Props {
  products: Product[];
}

export function BestSellers({ products }: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const allProducts = useMemo(() => products.filter((p) => p.tags.includes('bestseller')), [products]);

  const filtered = activeTab ? allProducts.filter((p) => p.tags.includes(activeTab)) : allProducts;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
        <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Best Sellers</h2></Reveal>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.filter)}
              className={`px-4 py-2 text-xs font-medium tracking-wide uppercase transition-colors border ${
                activeTab === tab.filter
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'bg-white text-[#6B6B6B] border-[#D4D4D4] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {filtered.slice(0, 5).map((product, i) => (
          <Reveal key={product.id} delayMs={i * 60}><ProductCard product={product} /></Reveal>
        ))}
      </div>
    </section>
  );
}
