import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

export function SaleBanner() {
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
              Curated wardrobe essentials at remarkable prices. Limited time, enduring style.
            </p></Reveal>
            <Reveal delayMs={140}><div className="mb-8">
              <span className="text-6xl font-serif font-light text-[#0A0A0A]">40%</span>
              <span className="text-lg text-[#6B6B6B] ml-2">off</span>
            </div></Reveal>
            <Reveal delayMs={170}><Link href="/products/new-arrivals" className="btn-primary inline-block">
              Shop New Arrivals
            </Link></Reveal>
          </div>
          <Reveal className="relative h-[480px]">
            <Image
              src="https://framerusercontent.com/images/O9Pj4HbpB42EgKQBuGdmfJGgyvo.png"
              alt="Sale fashion"
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
