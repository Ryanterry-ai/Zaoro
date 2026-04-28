'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const slides = [
  {
    headline: 'Elevate Your Style',
    subtext: 'Enhance confidence and sophistication with effortless everyday style.',
    cta: { label: 'Shop New Arrivals', url: '/products/new-arrivals' },
    ctaSecondary: { label: 'Explore Collections', url: '/products' },
    image: 'https://framerusercontent.com/images/D2p9zTlaP7XVUh5hZNXnMgEh4Q.png',
    bg: '#F8F6F3',
  },
  {
    headline: 'Real Women Style',
    subtext: 'Discover refined pieces designed to inspire confidence and elevate your style.',
    cta: { label: 'Shop New Arrivals', url: '/products/new-arrivals' },
    ctaSecondary: { label: 'Explore Collections', url: '/products' },
    image: 'https://framerusercontent.com/images/STYW4yhb7jxpxfEibmLXyd7R5g.png',
    bg: '#EDE9E3',
  },
  {
    headline: 'Timeless Modern Style',
    subtext: 'Embrace timeless modern style with curated pieces that bring elegance.',
    cta: { label: 'Shop New Arrivals', url: '/products/new-arrivals' },
    ctaSecondary: { label: 'Explore Collections', url: '/products' },
    image: 'https://framerusercontent.com/images/MEMAMZTRXVMdwdbxLGGg8wjgg.png',
    bg: '#F0EDE8',
  },
];

const AUTOPLAY_MS = 5000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setCurrent((prev) => (prev + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, []);

  const slide = slides[current];

  return (
    <div style={{ backgroundColor: slide.bg }} className="relative min-h-[85vh] lg:min-h-screen flex items-center transition-colors duration-700 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-center py-16 lg:py-0">
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            <h1 key={`title-${current}`} className="font-serif text-5xl md:text-6xl lg:text-7xl font-light leading-[1.1] text-[#0A0A0A] animate-[fadeInUp_700ms_ease-out]">
              {slide.headline}
            </h1>
            <p key={`copy-${current}`} className="text-[#6B6B6B] text-base md:text-lg max-w-md leading-relaxed animate-[fadeInUp_700ms_ease-out]">
              {slide.subtext}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href={slide.cta.url} className="btn-primary inline-block text-center">{slide.cta.label}</Link>
              <Link href={slide.ctaSecondary.url} className="btn-outline inline-block text-center">{slide.ctaSecondary.label}</Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative h-[60vw] max-h-[640px] lg:h-[85vh] lg:max-h-none">
            <Image
              key={`image-${current}`}
              src={slide.image}
              alt={slide.headline}
              fill
              className="object-contain object-center lg:object-right animate-[fadeInUp_700ms_ease-out]"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>

      <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white shadow flex items-center justify-center transition-colors" aria-label="Previous slide">
        {'<'}
      </button>
      <button onClick={() => setCurrent((current + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white shadow flex items-center justify-center transition-colors" aria-label="Next slide">
        {'>'}
      </button>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`h-0.5 transition-all duration-300 ${i === current ? 'w-8 bg-[#0A0A0A]' : 'w-4 bg-[#D4D4D4]'}`} />
        ))}
      </div>
      <div className="hero-progress">
        <span key={`progress-${current}`} className="hero-progress-fill" />
      </div>
    </div>
  );
}

