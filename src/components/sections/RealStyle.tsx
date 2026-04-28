import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/ui/Reveal';

export function RealStyle() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#F8F6F3]">
              <Image
                src="https://framerusercontent.com/images/3J4UmtMMji8TP6aAEm6fV6x2VE.jpg"
                alt="Real style"
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
                From city streets to intimate gatherings, explore looks designed to be worn, lived in, and remembered.
              </p>
            </Reveal>
            <Reveal delayMs={120}>
              <Link href="/products" className="btn-outline inline-block mb-8">Explore Collections</Link>
            </Reveal>
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

