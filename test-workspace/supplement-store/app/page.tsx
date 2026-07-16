'use client';

import React from 'react';
import HeroBanner from '@/components/HeroBanner';
import FeatureGrid from '@/components/FeatureGrid';
import ProductGrid from '@/components/ProductGrid';
import Testimonials from '@/components/Testimonials';
import CTASection from '@/components/CTASection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <HeroBanner
        title="Fuel Your Performance"
        subtitle="Premium sports nutrition and health supplements trusted by fitness professionals across India. FSSAI certified, lab-tested, genuine products."
        badge="Trusted by 50,000+ Athletes"
        actions={[
          { label: 'Shop Supplements', action: '/shop', style: 'primary' },
          { label: 'View Lab Reports', action: '#features', style: 'ghost' },
        ]}
      />
      <FeatureGrid
        title="Why NutriMart"
        subtitle="Trusted by athletes, built for performance"
      />
      <ProductGrid
        title="Shop Supplements"
        subtitle="Premium sports nutrition trusted by 50,000+ athletes"
      />
      <Testimonials
        title="Loved by Athletes"
        subtitle="Don't take our word for it"
      />
      <CTASection
        title="Fuel Your Performance"
        subtitle="Join 50,000+ athletes who trust NutriMart for genuine, lab-tested supplements."
        actions={[
          { label: 'Shop Now', action: '/shop', style: 'primary' },
          { label: 'Learn More', action: '/about', style: 'ghost' },
        ]}
      />
    </div>
  );
}
