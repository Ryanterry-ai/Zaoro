'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const slides = [
  {
    headline: 'Jewellery That Defines You',
    subtext: 'From earrings to layered necklaces, discover statement pieces for every mood.',
    cta: { label: 'Shop Jewellery', url: '/products/jewellery' },
    ctaSecondary: { label: 'Explore Collections', url: '/products' },
    image: '/images/products/client/client-003.jpg',
    bg: '#F8F6F3',
  },
  {
    headline: 'Tailored Suits & Sets',
    subtext: 'Modern silhouettes designed for polish, comfort, and confidence every day.',
    cta: { label: 'Shop Suits', url: '/products/suits' },
    ctaSecondary: { label: 'Shop Sets', url: '/products/sets' },
    image: '/images/products/client/client-020.jpg',
    bg: '#EDE9E3',
  },
  {
    headline: 'Style Your Everyday Edit',
    subtext: 'Build complete looks with shorts, leggings, and elevated essentials.',
    cta: { label: 'Shop New Arrivals', url: '/products/new-arrivals' },
    ctaSecondary: { label: 'View Best Sellers', url: '/products/best-sellers' },
    image: '/images/products/client/client-045.jpg',
    bg: '#F2EEE9',
  },
];

const AUTOPLAY_MS = 5000;

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  const goPrev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((prev) => (prev + 1) % slides.length);

  useEffect(() => {
    const interval = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(interval);
  }, []);

  const slide = slides[current];

  return (
    <div style={{ backgroundColor: slide.bg }} className="relative min-h-[85vh] lg:min-h-screen flex items-center transition-colors duration-700 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-center py-16 lg:py-0">
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            <h1 key={`title-${current}`} className="hero-copy-line hero-copy-title font-serif text-5xl md:text-6xl lg:text-7xl font-light leading-[1.1] text-[#0A0A0A]">
              {slide.headline}
            </h1>
            <p key={`copy-${current}`} className="hero-copy-line hero-copy-text text-[#6B6B6B] text-base md:text-lg max-w-md leading-relaxed">
              {slide.subtext}
            </p>
            <div className="hero-copy-line hero-copy-cta flex flex-col sm:flex-row gap-3">
              <Link href={slide.cta.url} className="btn-primary inline-block text-center">{slide.cta.label}</Link>
              <Link href={slide.ctaSecondary.url} className="btn-outline inline-block text-center">{slide.ctaSecondary.label}</Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative h-[60vw] max-h-[640px] lg:h-[85vh] lg:max-h-none rounded-sm overflow-hidden">
            {slides.map((item, i) => (
              <Image
                key={`image-${item.headline}`}
                src={item.image}
                alt={item.headline}
                fill
                className={`hero-image-layer object-cover object-center ${i === current ? 'is-active' : ''}`}
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ))}
          </div>
        </div>
      </div>

      <button onClick={goPrev} className="hero-control absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white shadow flex items-center justify-center" aria-label="Previous slide">
        {'<'}
      </button>
      <button onClick={goNext} className="hero-control absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white shadow flex items-center justify-center" aria-label="Next slide">
        {'>'}
      </button>

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`h-0.5 transition-all duration-300 ${i === current ? 'w-8 bg-[#0A0A0A]' : 'w-4 bg-[#D4D4D4]'}`} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
      <div className="hero-progress">
        <span key={`progress-${current}`} className="hero-progress-fill" />
      </div>
    </div>
  );
}
