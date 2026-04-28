import productsData from '../../data/products.json';
import collectionsData from '../../data/collections.json';
import navigationData from '../../data/navigation.json';
import settingsData from '../../data/settings.json';
import blogsData from '../../data/blogs.json';
import type { Product, Collection, SiteSettings, Blog } from '@/types';
import { formatPrice as formatMoney } from '@/lib/format';

export function getProducts(): Product[] {
  return productsData.filter((p: Product) => p.visible);
}

export function getProductByHandle(handle: string): Product | undefined {
  return productsData.find((p: Product) => p.handle === handle && p.visible);
}

export function getProductsByTag(tag: string): Product[] {
  return productsData.filter((p: Product) => p.visible && p.tags.includes(tag));
}

export function getProductsByCategory(category: string): Product[] {
  return productsData.filter((p: Product) => p.visible && p.category === category);
}

export function getCollections(): Collection[] {
  return collectionsData.filter((c: Collection) => c.visible);
}

export function getCollectionByHandle(handle: string): Collection | undefined {
  return collectionsData.find((c: Collection) => c.handle === handle && c.visible);
}

export function getCollectionProducts(handle: string): Product[] {
  const collection = getCollectionByHandle(handle);
  if (!collection) return [];
  return collection.products
    .map(id => productsData.find((p: Product) => p.id === id && p.visible))
    .filter(Boolean) as Product[];
}

export function getNavigation() { return navigationData; }
export function getSettings(): SiteSettings { return settingsData as SiteSettings; }
export function getBlogs(): Blog[] { return blogsData.filter((b: Blog) => b.visible); }
export function getBlogByHandle(handle: string): Blog | undefined {
  return blogsData.find((b: Blog) => b.handle === handle && b.visible);
}

export function formatPrice(paise: number, symbol = 'Rs. '): string {
  return formatMoney(paise, symbol);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return productsData
    .filter((p: Product) => p.visible && p.id !== product.id && 
      (p.category === product.category || p.tags.some(t => product.tags.includes(t))))
    .slice(0, limit) as Product[];
}

