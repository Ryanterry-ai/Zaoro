import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';

const logos = [
  'https://framerusercontent.com/images/r7vXW6by6nFnDZ4pnOROX8R9Y.svg',
  'https://framerusercontent.com/images/mj6w5Dn7Y7Q0jSY6WGfJ9Gcyw.svg',
  'https://framerusercontent.com/images/Qs6mz53NoR9Dv2CjkQf1vy95o.svg',
  'https://framerusercontent.com/images/f1wJYUapXvmlLxuCQXqfKUuj9Q.svg',
  'https://framerusercontent.com/images/q7JR4ocmR7QJ67Hyu58JLFcYY.svg',
  'https://framerusercontent.com/images/GR1ERHIcdsGPfNXwYm1EB95lA.svg',
];

export function TrustBanner() {
  return (
    <div className="bg-white border-y border-[#EDE9E3] py-8 overflow-hidden">
      <Reveal className="text-center text-xs tracking-widest uppercase text-[#6B6B6B] mb-6">As Seen In</Reveal>
      <div className="flex whitespace-nowrap logo-lane">
        <div className="animate-marquee flex gap-16 pr-16 items-center">
          {[0, 1, 2].map((rep) =>
            logos.map((logo, i) => (
              <Image key={`${rep}-${i}`} src={logo} alt="Brand logo" width={96} height={28} className="h-7 w-auto" />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

