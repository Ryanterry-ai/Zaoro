import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/types';

interface Props {
  products: Product[];
}

const categoryLabel = (value: string) =>
  value
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');

export function SaleBanner({ products }: Props) {
  const visible = products.filter((product) => product.visible && product.images.length > 0);
  const saleLead =
    visible.find((product) => (product.comparePrice ?? 0) > product.price) ??
    visible.find((product) => product.tags.includes('sale')) ??
    visible[0];

  if (!saleLead) return null;

  const sidePick =
    visible.find((product) => product.id !== saleLead.id && product.category !== saleLead.category) ??
    visible.find((product) => product.id !== saleLead.id);

  const discountPct = saleLead.comparePrice
    ? Math.max(0, Math.round(((saleLead.comparePrice - saleLead.price) / saleLead.comparePrice) * 100))
    : 20;

  return (
    <section className="bg-[#F8F6F3] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal><p className="text-xs tracking-widest uppercase text-[#C8A882] mb-3">Season sale</p></Reveal>
            <Reveal delayMs={70}><h2 className="font-serif text-5xl md:text-6xl font-light text-[#0A0A0A] mb-6 leading-tight">
              Save <span className="italic">today</span>
            </h2></Reveal>
            <Reveal delayMs={110}><p className="text-[#6B6B6B] mb-4">
              Handpicked {categoryLabel(saleLead.category)} styles from your latest catalog with limited-time offers.
            </p></Reveal>
            <Reveal delayMs={140}><div className="mb-8">
              <span className="text-6xl font-serif font-light text-[#0A0A0A]">{discountPct}%</span>
              <span className="text-lg text-[#6B6B6B] ml-2">off</span>
            </div></Reveal>
            <Reveal delayMs={170}><Link href={`/products/${saleLead.category}`} className="btn-primary inline-block">
              Shop {categoryLabel(saleLead.category)}
            </Link></Reveal>
            <Reveal delayMs={190}>
              <p className="text-sm text-[#6B6B6B] mt-5">
                {saleLead.name}: <span className="text-[#0A0A0A] font-medium">{formatPrice(saleLead.price)}</span>
                {saleLead.comparePrice && saleLead.comparePrice > saleLead.price ? (
                  <span className="line-through ml-2">{formatPrice(saleLead.comparePrice)}</span>
                ) : null}
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
