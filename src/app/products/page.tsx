import { ProductListingClient } from '@/components/product/ProductListingClient';
import { getProducts } from '@/lib/data-server';

export default async function ShopPage() {
  const products = await getProducts();
  return <ProductListingClient title="All Products" products={products} />;
}
