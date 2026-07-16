'use client';

import React from 'react';
import AboutSection from '@/components/AboutSection';
import TeamSection from '@/components/TeamSection';
import MissionSection from '@/components/MissionSection';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <AboutSection title="About NutriMart" subtitle="Your trusted destination for genuine supplements from top brands, lab-tested and verified" items={[{"title":"Our Domain","description":"Product, Order, Category, User","icon":"layers"},{"title":"Our Process","description":"Add to Cart → Checkout → Return Request","icon":"workflow"}]} />
      <TeamSection title="Meet Our Team" subtitle="The people behind the product" items={[{"title":"Operations","description":"Managing core business workflows","icon":"settings"},{"title":"Technology","description":"Building and maintaining systems","icon":"code"},{"title":"Customer Success","description":"Ensuring client satisfaction","icon":"heart"}]} />
      <MissionSection title="Our Mission" subtitle="What drives us every day" items={[{"title":"Domain Expertise","description":"Deep ecommerce knowledge built into every feature","icon":"target"},{"title":"Continuous Innovation","description":"Always evolving to meet industry demands","icon":"refresh-cw"},{"title":"Client Success","description":"Dedicated support and measurable outcomes","icon":"heart"}]} />
    </div>
  );
}
