'use client';

import React from 'react';
import ProductGrid from '@/components/ProductGrid';
import FilterSidebar from '@/components/FilterSidebar';
import CategoryGrid from '@/components/CategoryGrid';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <ProductGrid title="All Products" subtitle="Browse our collection" entity="Product" columns={[{"key":"name","label":"Name","type":"text","sortable":true,"filterable":false},{"key":"price","label":"Price","type":"text","sortable":true,"filterable":false},{"key":"description","label":"Description","type":"text","sortable":true,"filterable":false},{"key":"image","label":"Image","type":"text","sortable":true,"filterable":false},{"key":"stock","label":"Stock","type":"text","sortable":true,"filterable":false},{"key":"sku","label":"Sku","type":"text","sortable":true,"filterable":false},{"key":"category","label":"Category","type":"text","sortable":true,"filterable":false},{"key":"userId","label":"UserId","type":"text","sortable":true,"filterable":true}]} />
      <FilterSidebar title="Filters" items={[{"title":"Category","icon":"grid","metadata":{"type":"select"}},{"title":"Price Range","icon":"dollar-sign","metadata":{"type":"range"}},{"title":"Rating","icon":"star","metadata":{"type":"select"}},{"title":"Availability","icon":"package","metadata":{"type":"checkbox"}}]} />
      <CategoryGrid title="Categories" subtitle="Browse by category" items={[{"title":"All","icon":"grid","metadata":{"href":"/shop"}},{"title":"Featured","icon":"star","metadata":{"href":"/shop?featured=true"}},{"title":"New Arrivals","icon":"sparkles","metadata":{"href":"/shop?new=true"}},{"title":"Sale","icon":"tag","metadata":{"href":"/shop?sale=true"}}]} />
    </div>
  );
}
