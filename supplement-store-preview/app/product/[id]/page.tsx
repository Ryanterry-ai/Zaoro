'use client';

import React from 'react';
import ProductGallery from '@/components/ProductGallery';
import ProductInfo from '@/components/ProductInfo';
import Testimonials from '@/components/Testimonials';
import RecommendedProducts from '@/components/RecommendedProducts';

export default function ProductIdPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <ProductGallery title="Product Gallery" entity="Product" />
      <ProductInfo title="Product Details" entity="Product" fields={[{"name":"name","label":"Name","type":"text","required":true},{"name":"price","label":"Price","type":"number","required":true},{"name":"description","label":"Description","type":"textarea","required":false},{"name":"sku","label":"SKU","type":"text","required":false},{"name":"stock","label":"Stock","type":"number","required":false}]} />
      <Testimonials title="What Our Users Say" subtitle="Trusted by thousands" items={[{"title":"Alex Rivera","description":"Fitness Trainer","metadata":{"quote":"I recommend NutriMart to all my clients. The lab-tested quality gives me confidence."}},{"title":"Jordan Lee","description":"Athlete","metadata":{"quote":"Fast delivery and genuine products. The subscription bundle saves me time every month."}},{"title":"Sam Patel","description":"Health Enthusiast","metadata":{"quote":"Finally a supplement store I can trust. Every product is verified and the prices are fair."}}]} />
      <RecommendedProducts title="You May Also Like" entity="Product" items={[{"title":"Featured Item","description":"Top rated product","icon":"star"},{"title":"Popular Choice","description":"Best seller in category","icon":"trending-up"},{"title":"New Arrival","description":"Just added to collection","icon":"sparkles"}]} />
    </div>
  );
}
