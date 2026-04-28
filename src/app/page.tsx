import { HeroSlider } from '@/components/sections/HeroSlider';
import { TrustBanner } from '@/components/sections/TrustBanner';
import { TrendingNow } from '@/components/sections/TrendingNow';
import { FeaturedCollections } from '@/components/sections/FeaturedCollections';
import { SaleCountdown } from '@/components/sections/SaleCountdown';
import { BestSellers } from '@/components/sections/BestSellers';
import { SeasonalEdit } from '@/components/sections/SeasonalEdit';
import { BlogSection } from '@/components/sections/BlogSection';
import { SaleBanner } from '@/components/sections/SaleBanner';
import { TrustFeatures } from '@/components/sections/TrustFeatures';
import { getProducts } from '@/lib/data-server';

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <HeroSlider />
      <TrustBanner />
      <TrendingNow />
      <FeaturedCollections />
      <SaleCountdown />
      <BestSellers products={products} />
      <SeasonalEdit />
      <BlogSection />
      <SaleBanner />
      <TrustFeatures />
    </>
  );
}
