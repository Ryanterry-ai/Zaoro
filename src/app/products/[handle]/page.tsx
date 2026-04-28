import { notFound } from 'next/navigation';
import { getCollectionProducts, getCollectionByHandle, getProductByHandle, getRelatedProducts } from '@/lib/data-server';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props) {
  const { handle } = params;
  const collection = await getCollectionByHandle(handle);
  if (collection) {
    return { title: `${collection?.name} - Zaro` };
  }
  const product = await getProductByHandle(handle);
  if (!product) return { title: 'Not Found - Zaro' };
  return { title: `${product.name} - Zaro`, description: product.description };
}

export default async function ProductsOrCollectionPage({ params }: Props) {
  const { handle } = params;

  const collection = await getCollectionByHandle(handle);
  if (collection) {
    const products = await getCollectionProducts(handle);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">{collection.name}</h1>
          <p className="text-[#6B6B6B] mt-2">{collection.description}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    );
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
