import { ProductCard } from '@/components/product/ProductCard';
import { getProducts } from '@/lib/data-server';

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A] mb-8">All Products</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
