import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

const CATEGORY_PRIORITY = [
  'earrings',
  'necklaces',
  'bracelets',
  'suits',
  'sets',
  't-shirts',
  'shorts',
  'leggings',
];

const categoryLabel = (value: string) =>
  value
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

export function BlogSection({ products }: Props) {
  const visible = products.filter((product) => product.visible && product.images.length > 0);

  const curatedByCategory = CATEGORY_PRIORITY
    .map((category) => visible.find((product) => product.category === category))
    .filter((product): product is Product => Boolean(product));

  const uniqueProducts = Array.from(
    new Map(
      [...curatedByCategory, ...visible].map((product) => [product.id, product])
    ).values()
  );

  const stylePicks = uniqueProducts.slice(0, 3);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      <div className="flex items-end justify-between mb-10">
        <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">Fashion Insider</h2></Reveal>
        <Link href="/products" className="text-sm font-medium tracking-wide underline underline-offset-4 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
          View All
        </Link>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {stylePicks.map((product, i) => (
          <Reveal key={product.id} delayMs={i * 80}>
          <Link href={`/products/${product.handle}`} className="group">
            <div className="relative aspect-video overflow-hidden bg-[#F8F6F3] mb-4">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <p className="text-xs text-[#6B6B6B] mb-2">
              Featured in {categoryLabel(product.category)}
            </p>
            <h3 className="font-medium text-[#0A0A0A] hover:underline text-base leading-snug">
              {product.name}
            </h3>
          </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
