'use client';

import React from 'react';
import HeroBanner from '@/components/HeroBanner';
import FeatureGrid from '@/components/FeatureGrid';
import Testimonials from '@/components/Testimonials';
import CTASection from '@/components/CTASection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <HeroBanner title="NutriMart" subtitle="Premium supplements from top brands, lab-tested and delivered" badge="Supplement — ecommerce" items={[{"title":"Add to Cart","description":"Add to Cart workflow","icon":"zap"},{"title":"Checkout","description":"Checkout workflow","icon":"zap"},{"title":"Return Request","description":"Return Request workflow","icon":"zap"}]} actions={[{"label":"Shop Now","action":"#features","style":"primary"},{"label":"View Collections","action":"#contact","style":"ghost"}]} />
      <FeatureGrid title="NutriMart Capabilities" subtitle="What makes NutriMart different" items={[{"title":"Lab-Tested Products","description":"Third-party verified purity and potency for every batch","icon":"flask-conical"},{"title":"Brand Catalog","description":"Multi-brand inventory with real-time stock and pricing","icon":"grid"},{"title":"Subscription Bundles","description":"Monthly supplement stacks delivered to your door","icon":"repeat"}]} />
      <Testimonials title="What Our Users Say" subtitle="Trusted by thousands" items={[{"title":"Alex Rivera","description":"Fitness Trainer","metadata":{"quote":"I recommend NutriMart to all my clients. The lab-tested quality gives me confidence."}},{"title":"Jordan Lee","description":"Athlete","metadata":{"quote":"Fast delivery and genuine products. The subscription bundle saves me time every month."}},{"title":"Sam Patel","description":"Health Enthusiast","metadata":{"quote":"Finally a supplement store I can trust. Every product is verified and the prices are fair."}}]} />
      <CTASection title="Shop NutriMart Today" subtitle="Browse our curated collection and find exactly what you need." items={[{"title":"No credit card required","description":"Start free and upgrade anytime","icon":"credit-card"},{"title":"Instant setup","description":"Get up and running in minutes","icon":"zap"}]} actions={[{"label":"Shop Now","action":"/shop","style":"primary"},{"label":"Browse Categories","action":"/shop","style":"ghost"}]} />
    </div>
  );
}
