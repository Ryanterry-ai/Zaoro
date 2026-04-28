import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

const FEATURE_CATEGORIES = ['earrings', 'necklaces', 'bracelets', 'sets'];

export function RealStyle({ products }: Props) {
  const visible = products.filter((p) => p.visible && p.images.length > 0);
  const lead =
    visible.find((p) => p.tags.includes('bestseller') && FEATURE_CATEGORIES.includes(p.category)) ??
    visible.find((p) => FEATURE_CATEGORIES.includes(p.category)) ??
    visible[0];

  const picks = visible
    .filter((p) => p.id !== lead?.id && FEATURE_CATEGORIES.includes(p.category))
    .slice(0, 2);

  if (!lead) return null;

  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#F8F6F3] image-float">
              <Image
                src={lead.images[0]}
                alt={lead.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </Reveal>

          <div>
            <Reveal>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-[#0A0A0A] mb-4">Real style, real confidence</h2>
            </Reveal>
            <Reveal delayMs={80}>
              <p className="text-[#6B6B6B] leading-relaxed mb-6">
                Featuring {lead.name}, this edit blends signature jewellery and versatile fashion pieces designed to be worn, lived in, and remembered.
              </p>
            </Reveal>
            <Reveal delayMs={120}>
              <Link href="/products/jewellery" className="btn-outline inline-block mb-6 image-tilt-hover">Explore Collections</Link>
            </Reveal>
            {picks.length > 0 && (
              <Reveal delayMs={150}>
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {picks.map((product) => (
                    <Link key={product.id} href={`/products/${product.handle}`} className="border border-[#EDE9E3] p-3 hover:border-[#0A0A0A] transition-colors">
                      <p className="text-xs text-[#6B6B6B] mb-1 uppercase tracking-wide">{product.category}</p>
                      <p className="text-sm text-[#0A0A0A] leading-snug">{product.name}</p>
                      <p className="text-sm font-medium mt-1">{formatPrice(product.price)}</p>
                    </Link>
                  ))}
                </div>
              </Reveal>
            )}
            <div className="space-y-3">
              <div className="text-loop-row"><span>Feel authentic</span><span>Feel trending</span><span>Feel authentic</span><span>Feel trending</span></div>
              <div className="text-loop-row reverse"><span>Feel trending</span><span>Feel authentic</span><span>Feel trending</span><span>Feel authentic</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
