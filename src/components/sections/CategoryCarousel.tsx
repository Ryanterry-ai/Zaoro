'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { Collection, Product } from '@/types';

interface Props {
  collections: Collection[];
  products: Product[];
}

const CATEGORY_HANDLES = ['t-shirts', 'suits', 'shorts', 'leggings', 'sets'];

export function CategoryCarousel({ collections, products }: Props) {
  const categoryCollections = useMemo(
    () => collections.filter((c) => CATEGORY_HANDLES.includes(c.handle)),
    [collections]
  );
  const [active, setActive] = useState(categoryCollections[0]?.handle ?? 't-shirts');
  const [start, setStart] = useState(0);

  const activeCollection = categoryCollections.find((c) => c.handle === active);
  const activeProducts = useMemo(() => {
    if (!activeCollection) return [];
    const ids = new Set(activeCollection.products);
    return products.filter((p) => ids.has(p.id));
  }, [activeCollection, products]);

  const visible = activeProducts.slice(start, start + 4);
  const canPrev = start > 0;
  const canNext = start + 4 < activeProducts.length;

  const onChangeCategory = (handle: string) => {
    setActive(handle);
    setStart(0);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Shop by Category</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => canPrev && setStart((v) => Math.max(0, v - 1))}
            disabled={!canPrev}
            className="w-9 h-9 border border-[#D4D4D4] disabled:opacity-40 flex items-center justify-center hover:border-[#0A0A0A] transition-colors"
            aria-label="Previous products"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => canNext && setStart((v) => v + 1)}
            disabled={!canNext}
            className="w-9 h-9 border border-[#D4D4D4] disabled:opacity-40 flex items-center justify-center hover:border-[#0A0A0A] transition-colors"
            aria-label="Next products"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categoryCollections.map((c) => (
          <button
            key={c.id}
            onClick={() => onChangeCategory(c.handle)}
            className={`px-4 py-2 text-xs font-medium tracking-wide uppercase border transition-colors ${
              c.handle === active ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white text-[#6B6B6B] border-[#D4D4D4] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div key={`${active}-${start}`} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-[fadeInUp_420ms_ease-out]">
        {visible.map((product) => (
          <Link key={product.id} href={`/products/${product.handle}`} className="group motion-card block">
            <div className="relative aspect-[4/5] bg-[#F8F6F3] overflow-hidden">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-[#0A0A0A] leading-snug">{product.name}</p>
              <p className="text-sm text-[#0A0A0A] mt-1">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
