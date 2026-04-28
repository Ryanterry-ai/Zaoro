import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import { list, put } from '@vercel/blob';
import productsDefault from '../../data/products.json';
import collectionsDefault from '../../data/collections.json';
import navigationDefault from '../../data/navigation.json';
import settingsDefault from '../../data/settings.json';
import blogsDefault from '../../data/blogs.json';
import type { Blog, Collection, NavigationData, Product, SiteSettings } from '@/types';

export type ContentKey = 'products' | 'collections' | 'navigation' | 'settings' | 'blogs';

type ContentMap = {
  products: Product[];
  collections: Collection[];
  navigation: NavigationData;
  settings: SiteSettings;
  blogs: Blog[];
};

const FILE_BY_KEY: Record<ContentKey, string> = {
  products: 'products.json',
  collections: 'collections.json',
  navigation: 'navigation.json',
  settings: 'settings.json',
  blogs: 'blogs.json',
};

const BLOB_PATH_BY_KEY: Record<ContentKey, string> = {
  products: 'cms/products.json',
  collections: 'cms/collections.json',
  navigation: 'cms/navigation.json',
  settings: 'cms/settings.json',
  blogs: 'cms/blogs.json',
};

const DEFAULT_CONTENT: ContentMap = {
  products: productsDefault as Product[],
  collections: collectionsDefault as Collection[],
  navigation: navigationDefault as NavigationData,
  settings: settingsDefault as SiteSettings,
  blogs: blogsDefault as Blog[],
};

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readFromLocalFile<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const filePath = path.join(process.cwd(), 'data', FILE_BY_KEY[key]);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as ContentMap[K];
  } catch {
    return DEFAULT_CONTENT[key];
  }
}

async function readFromBlob<K extends ContentKey>(key: K): Promise<ContentMap[K] | null> {
  if (!hasBlobToken()) return null;

  try {
    const pathname = BLOB_PATH_BY_KEY[key];
    const result = await list({ prefix: pathname, limit: 1000 });
    const blob = result.blobs.find((b) => b.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return null;

    return (await response.json()) as ContentMap[K];
  } catch {
    return null;
  }
}

async function writeToLocalFile<K extends ContentKey>(key: K, data: ContentMap[K]) {
  const filePath = path.join(process.cwd(), 'data', FILE_BY_KEY[key]);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function writeToBlob<K extends ContentKey>(key: K, data: ContentMap[K]) {
  const pathname = BLOB_PATH_BY_KEY[key];
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function readContent<K extends ContentKey>(key: K): Promise<ContentMap[K]> {
  const blobData = await readFromBlob(key);
  if (blobData) return blobData;
  return readFromLocalFile(key);
}

export async function writeContent<K extends ContentKey>(key: K, data: ContentMap[K]) {
  if (hasBlobToken()) {
    await writeToBlob(key, data);
    return;
  }
  await writeToLocalFile(key, data);
}
