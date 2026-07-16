'use client';

import React from 'react';
import ProductInfo from '@/components/ProductInfo';
import ProductGallery from '@/components/ProductGallery';
import RecommendedProducts from '@/components/RecommendedProducts';

export default function ProductHandlePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <ProductInfo title="Product Details" entity="Product" fields={[{"name":"name","label":"Name","type":"text","required":true},{"name":"price","label":"Price","type":"number","required":true},{"name":"description","label":"Description","type":"textarea","required":false},{"name":"sku","label":"SKU","type":"text","required":false},{"name":"stock","label":"Stock","type":"number","required":false}]} />
      <ProductGallery title="Product Gallery" entity="Product" />
      <RecommendedProducts title="You May Also Like" entity="Product" items={[{"title":"Featured Item","description":"Top rated product","icon":"star"},{"title":"Popular Choice","description":"Best seller in category","icon":"trending-up"},{"title":"New Arrival","description":"Just added to collection","icon":"sparkles"}]} />
    </div>
  );
}
