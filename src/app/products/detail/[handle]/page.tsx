import { notFound } from 'next/navigation';
import { getProductByHandle, getRelatedProducts } from '@/lib/data-server';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { ProductCard } from '@/components/product/ProductCard';

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props) {
  const product = await getProductByHandle(params.handle);
  if (!product) return { title: 'Not Found' };
  return { title: `${product.name} - Zaro`, description: product.description };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await getProductByHandle(params.handle);
  if (!product) notFound();
  const related = await getRelatedProducts(product);

  return (
    <div>
      <ProductDetailClient product={product} />
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-serif text-2xl font-light mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
