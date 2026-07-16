'use client';

import React from 'react';
import AboutSection from '@/components/AboutSection';
import TeamSection from '@/components/TeamSection';
import MissionSection from '@/components/MissionSection';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <AboutSection title="About NutriMart" subtitle="NutriMart — a me multi brands e-commerce supplement serving brand loyalist and fitness enthusiast through direct sales" items={[{"title":"Our Domain","description":"Product, Order, Category, User","icon":"layers"},{"title":"Our Process","description":"Add to Cart → Checkout → Return Request","icon":"workflow"}]} />
      <TeamSection title="Meet Our Team" subtitle="The people behind the product" items={[{"title":"Operations","description":"Managing core business workflows","icon":"settings"},{"title":"Technology","description":"Building and maintaining systems","icon":"code"},{"title":"Customer Success","description":"Ensuring client satisfaction","icon":"heart"}]} />
      <MissionSection title="Our Mission" subtitle="What drives us every day" items={[{"title":"Inventory","description":"Expert inventory for ecommerce","icon":"target"},{"title":"Order Processing","description":"Expert order processing for ecommerce","icon":"refresh-cw"},{"title":"Marketing","description":"Expert marketing for ecommerce","icon":"heart"}]} />
    </div>
  );
}
