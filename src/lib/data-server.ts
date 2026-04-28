import 'server-only';
import type { Blog, Collection, NavigationData, Product, SiteSettings } from '@/types';
import { readContent, writeContent } from '@/lib/cms-store';

const COLLECTION_CATEGORY_MAP: Record<string, string[]> = {
  jewellery: ['earrings', 'bracelets', 'necklaces'],
  earrings: ['earrings'],
  bracelets: ['bracelets'],
  necklaces: ['necklaces'],
  't-shirts': ['t-shirts'],
  suits: ['suits'],
  shorts: ['shorts'],
  leggings: ['leggings'],
  sets: ['sets'],
};

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
  const byId = new Map(products.map((p) => [p.id, p]));
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const referencedProducts = collection.products
    .map((ref) => byId.get(ref) ?? byHandle.get(ref))
    .filter((p): p is Product => Boolean(p));

  let resolved = referencedProducts;

  if (handle === 'new-arrivals') {
    resolved = products.filter((p) => p.tags.includes('new-arrivals'));
  } else if (handle === 'best-sellers') {
    resolved = products.filter((p) => p.tags.includes('bestseller'));
  } else if (handle === 'sale') {
    resolved = products.filter((p) => p.tags.includes('sale'));
  } else if (COLLECTION_CATEGORY_MAP[handle]) {
    const allowedCategories = new Set(COLLECTION_CATEGORY_MAP[handle]);
    const strictByCategory = products.filter((p) => allowedCategories.has(p.category));
    const strictSet = new Set(strictByCategory.map((p) => p.id));
    const fromCollection = resolved.filter((p) => strictSet.has(p.id));
    resolved = fromCollection.length > 0 ? fromCollection : strictByCategory;
  }

  return Array.from(new Map(resolved.map((p) => [p.id, p])).values());
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
