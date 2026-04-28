import 'server-only';
import type { Blog, Collection, NavigationData, Product, SiteSettings } from '@/types';
import { readContent, writeContent } from '@/lib/cms-store';

export async function getAllProducts(): Promise<Product[]> {
  return readContent('products');
}

export async function getProducts(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.visible);
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.handle === handle);
}

export async function getProductsByTag(tag: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.tags.includes(tag));
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.category === category);
}

export async function getAllCollections(): Promise<Collection[]> {
  return readContent('collections');
}

export async function getCollections(): Promise<Collection[]> {
  const collections = await getAllCollections();
  return collections.filter((c) => c.visible);
}

export async function getCollectionByHandle(handle: string): Promise<Collection | undefined> {
  const collections = await getCollections();
  return collections.find((c) => c.handle === handle);
}

export async function getCollectionProducts(handle: string): Promise<Product[]> {
  const collection = await getCollectionByHandle(handle);
  if (!collection) return [];

  const products = await getProducts();
  return collection.products
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[];
}

export async function getNavigation(): Promise<NavigationData> {
  return readContent('navigation');
}

export async function getSettings(): Promise<SiteSettings> {
  return readContent('settings');
}

export async function getAllBlogs(): Promise<Blog[]> {
  return readContent('blogs');
}

export async function getBlogs(): Promise<Blog[]> {
  const blogs = await getAllBlogs();
  return blogs.filter((b) => b.visible);
}

export async function getBlogByHandle(handle: string): Promise<Blog | undefined> {
  const blogs = await getBlogs();
  return blogs.find((b) => b.handle === handle);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const products = await getProducts();
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.tags.some((tag) => product.tags.includes(tag)))
    )
    .slice(0, limit);
}

export async function saveProducts(data: Product[]) {
  await writeContent('products', data);
}

export async function saveCollections(data: Collection[]) {
  await writeContent('collections', data);
}

export async function saveNavigation(data: NavigationData) {
  await writeContent('navigation', data);
}

export async function saveSettings(data: SiteSettings) {
  await writeContent('settings', data);
}
