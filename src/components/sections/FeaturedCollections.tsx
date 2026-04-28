import Link from 'next/link';
import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import type { Collection, Product, SiteSettings } from '@/types';

interface Props {
  collections: Collection[];
  products: Product[];
  content?: SiteSettings['homeContent'];
}

const CLOTHING_COLLECTION_ORDER = ['t-shirts', 'suits', 'shorts', 'sets', 'leggings'];

export function FeaturedCollections({ collections, products, content }: Props) {
  const productCategories = new Set(products.map((product) => product.category));
  const featured = CLOTHING_COLLECTION_ORDER
    .map((handle) => collections.find((collection) => collection.handle === handle))
    .filter((collection): collection is Collection => Boolean(collection))
    .filter((collection) => productCategories.has(collection.handle))
    .slice(0, 3);

  return (
    <section className="bg-[#F8F6F3] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10">
          <div>
            <Reveal><h2 className="font-serif text-3xl md:text-4xl font-light text-[#0A0A0A]">{content?.featuredCollectionsTitle || 'Clothing Collections'}</h2></Reveal>
            <p className="text-[#6B6B6B] mt-2 text-sm md:text-base">
              {content?.featuredCollectionsSubtitle || 'Browse live clothing categories generated from your current product catalog.'}
            </p>
          </div>
          <Link href={content?.featuredCollectionsCtaUrl || '/products/t-shirts'} className="btn-outline mt-4 md:mt-0 inline-block">
            {content?.featuredCollectionsCtaLabel || 'Shop Clothing'}
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {featured.map((collection, i) => (
            <Reveal key={collection.id} delayMs={i * 70}>
              <Link href={`/products/${collection.handle}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#EDE9E3]">
                  <Image
                    src={collection.image}
                    alt={collection.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[#0A0A0A]/20 group-hover:bg-[#0A0A0A]/30 transition-colors duration-300" />
                </div>
                <div className="mt-4">
                  <p className="text-xs text-[#6B6B6B] mb-1">{collection.description}</p>
                  <h3 className="font-serif text-xl font-light text-[#0A0A0A]">{collection.name}</h3>
                  <span className="text-sm font-medium tracking-wide underline underline-offset-4 mt-1 inline-block hover:text-[#6B6B6B] transition-colors">
                    Shop Now {'->'}
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
