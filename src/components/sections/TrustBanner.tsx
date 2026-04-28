export function TrustBanner() {
  const brands = ['As Seen In', 'Vogue', 'Harper\'s Bazaar', 'Elle', 'InStyle'];
  return (
    <div className="bg-white border-y border-[#EDE9E3] py-8 overflow-hidden">
      <p className="text-center text-xs tracking-widest uppercase text-[#6B6B6B] mb-6">As Seen In</p>
      <div className="flex whitespace-nowrap">
        <div className="animate-marquee flex gap-16 pr-16 items-center">
          {[0, 1, 2].map(rep => (
            ['VOGUE', 'BAZAAR', 'ELLE', 'INSTYLE'].map((brand, i) => (
              <span key={`${rep}-${i}`} className="font-serif text-xl font-light tracking-widest text-[#0A0A0A] opacity-60">
                {brand}
              </span>
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
