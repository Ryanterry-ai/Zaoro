'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

function useCountdown(targetHours = 24) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        const totalSecs = prev.h * 3600 + prev.m * 60 + prev.s - 1;
        if (totalSecs <= 0) return { h: targetHours, m: 0, s: 0 };
        return { h: Math.floor(totalSecs / 3600), m: Math.floor((totalSecs % 3600) / 60), s: totalSecs % 60 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetHours]);
  return time;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export function SaleCountdown() {
  const time = useCountdown(23);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://framerusercontent.com/images/gbDhogVvY3lyqoEhF9CEudW9EU.jpg"
          alt="Sale banner"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0A0A0A]/50" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text */}
          <div className="text-white text-center lg:text-left">
            <p className="text-xs tracking-widest uppercase text-[#C8A882] mb-3">Elevated Style</p>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6">
              Sale now on
            </h2>
            {/* Countdown */}
            <div className="flex items-center gap-4 justify-center lg:justify-start mb-8">
              {[
                { val: pad(time.h), label: 'Hours' },
                { val: pad(time.m), label: 'Minutes' },
                { val: pad(time.s), label: 'Seconds' },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-4">
                  {i > 0 && <span className="text-2xl font-light text-[#C8A882]">:</span>}
                  <div className="text-center">
                    <div className="text-4xl font-light font-serif">{t.val}</div>
                    <div className="text-xs tracking-widest uppercase text-[#D4D4D4] mt-1">{t.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/products/new-arrivals" className="btn-white inline-block">
              Shop New Arrivals
            </Link>
          </div>

          {/* Sweater */}
          <div className="flex-shrink-0 text-center">
            <div className="relative w-48 h-60 mx-auto">
              <Image
                src="https://framerusercontent.com/images/jbKmkvX5bnq1KppJvUZXBpUEsm8.png"
                alt="Featured sweater"
                fill
                className="object-contain"
                sizes="192px"
              />
            </div>
            <p className="text-xs text-[#D4D4D4] tracking-widest uppercase mt-3 mb-1">Featured item</p>
            <p className="text-white font-serif text-base">Shop the sweater</p>
            <Link href="/products/women" className="text-[#C8A882] text-sm underline underline-offset-4 mt-1 inline-block">
              Shop Women →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
