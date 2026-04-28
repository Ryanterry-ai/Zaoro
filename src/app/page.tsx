import { HeroSlider } from '@/components/sections/HeroSlider';
import { TrustBanner } from '@/components/sections/TrustBanner';
import { TrendingNow } from '@/components/sections/TrendingNow';
import { FeaturedCollections } from '@/components/sections/FeaturedCollections';
import { CategoryCarousel } from '@/components/sections/CategoryCarousel';
import { SaleCountdown } from '@/components/sections/SaleCountdown';
import { BestSellers } from '@/components/sections/BestSellers';
import { SeasonalEdit } from '@/components/sections/SeasonalEdit';
import { BlogSection } from '@/components/sections/BlogSection';
import { SaleBanner } from '@/components/sections/SaleBanner';
import { TrustFeatures } from '@/components/sections/TrustFeatures';
import { RealStyle } from '@/components/sections/RealStyle';
import { getCollections, getProducts, getSettings } from '@/lib/data-server';

export default async function HomePage() {
  const [products, collections, settings] = await Promise.all([
    getProducts(),
    getCollections(),
    getSettings(),
  ]);

  return (
    <>
      <HeroSlider />
      <TrustBanner />
      <TrendingNow products={products} />
      <FeaturedCollections collections={collections} />
      <CategoryCarousel collections={collections} products={products} />
      <SaleCountdown />
      <BestSellers products={products} />
      <SeasonalEdit />
      <RealStyle />
      <BlogSection products={products} />
      <SaleBanner products={products} />
      <TrustFeatures settings={settings} />
    </>
  );
}
