import { notFound } from 'next/navigation';
import { getCollectionProducts, getCollectionByHandle, getProductByHandle, getRelatedProducts } from '@/lib/data-server';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { ProductListingClient } from '@/components/product/ProductListingClient';

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props) {
  const { handle } = params;
  const collection = await getCollectionByHandle(handle);
  if (collection) {
    return { title: `${collection.name} - TruArtz` };
  }
  const product = await getProductByHandle(handle);
  if (!product) return { title: 'Not Found - TruArtz' };
  return { title: `${product.name} - TruArtz`, description: product.description };
}

export default async function ProductsOrCollectionPage({ params }: Props) {
  const { handle } = params;

  const collection = await getCollectionByHandle(handle);
  if (collection) {
    const products = await getCollectionProducts(handle);
    return <ProductListingClient title={collection.name} subtitle={collection.description} products={products} />;
  }

  const product = await getProductByHandle(handle);
  if (!product) notFound();
  const related = await getRelatedProducts(product);

  return (
    <div>
      <ProductDetailClient product={product} />
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-serif text-2xl font-light mb-8">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
