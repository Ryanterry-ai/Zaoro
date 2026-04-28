import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

const images = [
  { src: 'https://framerusercontent.com/images/2GGLL7TYs5QQGupGS5L7W3z96A.jpg', alt: 'Modern Dress' },
  { src: 'https://framerusercontent.com/images/RAio2EJ6X6cvtTRigkNKbeWyCys.jpg', alt: 'Winter dress' },
  { src: 'https://framerusercontent.com/images/rYTkNINe26xHnKow5XcrN3SRBE.jpg', alt: 'Modern Dress' },
];

export function SeasonalEdit() {
  return (
    <section className="bg-[#F8F6F3] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-[3/4] overflow-hidden bg-[#EDE9E3]">
                <Image src={img.src} alt={img.alt} fill className="object-cover hover:scale-105 transition-transform duration-700" sizes="(max-width: 1024px) 30vw, 15vw" />
              </div>
            ))}
          </Reveal>
          <div>
            <Reveal><p className="text-xs tracking-widest uppercase text-[#6B6B6B] mb-3">Modern Details</p></Reveal>
            <Reveal delayMs={70}><h2 className="font-serif text-4xl md:text-5xl font-light text-[#0A0A0A] mb-6 leading-tight">
              A new story unfolds each season
            </h2></Reveal>
            <Reveal delayMs={110}><p className="text-[#6B6B6B] leading-relaxed mb-8">
              Quiet mornings deserve softness. Confident days demand structure. Unforgettable nights call for detail. Zaro's seasonal edits deliver the perfect balance of comfort and elegance, curated for the way you live today.
            </p></Reveal>
            <Reveal delayMs={140}><Link href="/products" className="btn-primary inline-block">
              Explore Collections
            </Link></Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
