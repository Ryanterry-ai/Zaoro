'use client';
import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/types';

interface Props {
  title: string;
  subtitle?: string;
  products: Product[];
}

const FILTER_OPTIONS = [
  { key: 't-shirts', label: 'T Shirts' },
  { key: 'suits', label: 'Suits' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'leggings', label: 'Leggings' },
  { key: 'sets', label: 'Set' },
  { key: 'earrings', label: 'Earrings' },
  { key: 'bracelets', label: 'Bracelets' },
  { key: 'necklaces', label: 'Necklaces' },
];

export function ProductListingClient({ title, subtitle, products }: Props) {
  const minPrice = useMemo(() => (products.length ? Math.min(...products.map((p) => p.price)) : 0), [products]);
  const maxPrice = useMemo(() => (products.length ? Math.max(...products.map((p) => p.price)) : 0), [products]);
  const [selected, setSelected] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice, maxPrice]);

  const availableFilters = useMemo(
    () => FILTER_OPTIONS.filter((opt) => products.some((p) => p.category === opt.key)),
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const byCategory =
        selected.length === 0 ||
        selected.some((f) => p.category === f);
      const byPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      return byCategory && byPrice;
    });
  }, [products, selected, priceRange]);

  const toggleFilter = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">{title}</h1>
        {subtitle && <p className="text-[#6B6B6B] mt-2">{subtitle}</p>}
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="border border-[#EDE9E3] p-4 h-fit sticky top-24">
          <h2 className="text-sm font-semibold tracking-wide uppercase mb-4">Filters</h2>

          <div className="mb-6">
            <h3 className="text-xs font-medium uppercase tracking-wide mb-2 text-[#6B6B6B]">Collections</h3>
            <div className="space-y-2">
              {availableFilters.map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.key)}
                    onChange={() => toggleFilter(opt.key)}
                    className="accent-[#0A0A0A]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide mb-2 text-[#6B6B6B]">Price</h3>
            <div className="space-y-3">
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[0]}
                onChange={(e) => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                className="w-full"
              />
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                className="w-full"
              />
              <p className="text-xs text-[#6B6B6B]">
                Rs. {(priceRange[0] / 100).toLocaleString('en-IN')} - Rs. {(priceRange[1] / 100).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </aside>

        <div>
          <p className="text-sm text-[#6B6B6B] mb-4">{filtered.length} products</p>
          {filtered.length === 0 ? (
            <div className="border border-[#EDE9E3] bg-[#F8F6F3] px-6 py-14 text-center">
              <p className="font-serif text-2xl text-[#0A0A0A] mb-2">No products found</p>
              <p className="text-sm text-[#6B6B6B]">Try a different collection or clear your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
