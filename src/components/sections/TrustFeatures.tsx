import { getSettings } from '@/lib/data';
import { RotateCcw, Truck, Headphones } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  RotateCcw: <RotateCcw className="w-6 h-6" />,
  Truck: <Truck className="w-6 h-6" />,
  Headphones: <Headphones className="w-6 h-6" />,
};

export function TrustFeatures() {
  const settings = getSettings();
  return (
    <section className="border-t border-[#EDE9E3] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {settings.trustBadges.map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="text-[#0A0A0A]">{iconMap[badge.icon]}</div>
              <h4 className="font-semibold text-sm tracking-wide">{badge.title}</h4>
              <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-xs">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
