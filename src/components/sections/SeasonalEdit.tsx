import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

const CATEGORY_ORDER = ['suits', 'sets', 't-shirts', 'shorts', 'leggings'];

export function SeasonalEdit({ products }: Props) {
  const visible = products.filter((p) => p.visible && p.images.length > 0);
  const curated = CATEGORY_ORDER
    .map((category) => visible.find((p) => p.category === category))
    .filter((p): p is Product => Boolean(p));
  const picks = Array.from(new Map([...curated, ...visible].map((p) => [p.id, p])).values()).slice(0, 3);

  return (
    <section className="bg-[#F8F6F3] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="grid grid-cols-3 gap-3">
            {picks.map((product, i) => (
              <Reveal key={product.id} delayMs={i * 90}>
                <div className="relative aspect-[3/4] overflow-hidden bg-[#EDE9E3] image-tilt-hover">
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 30vw, 15vw" />
                </div>
              </Reveal>
            ))}
          </div>
          <div>
            <Reveal><p className="text-xs tracking-widest uppercase text-[#6B6B6B] mb-3">Modern Details</p></Reveal>
            <Reveal delayMs={70}><h2 className="font-serif text-4xl md:text-5xl font-light text-[#0A0A0A] mb-6 leading-tight">
              Your best edits, styled for every season
            </h2></Reveal>
            <Reveal delayMs={110}><p className="text-[#6B6B6B] leading-relaxed mb-8">
              From polished suits to easy sets and everyday staples, these client-picked best products are curated to move seamlessly from day to night.
            </p></Reveal>
            <Reveal delayMs={140}><Link href="/products/best-sellers" className="btn-primary inline-block">
              Explore Collections
            </Link></Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
