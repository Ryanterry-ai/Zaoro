import { ContentScraper } from './src/generation/content-scraper.js';

async function main() {
  const scraper = new ContentScraper(process.cwd());

  console.log('=== Testing scrapePromptData (Bing + Google fallback) ===');
  console.log('Query should be: "ecommerce supplement IN"');
  console.log('');

  const result = await scraper.scrapePromptData(
    'NutriMart',
    'ecommerce',
    'IN',
    'supplement store for Indian customers'
  );

  if (result && result.sourceUrl) {
    console.log('=== SCRAPED DATA ===');
    console.log('Source URL:', result.sourceUrl);
    console.log('Hero headline:', result.heroHeadline?.substring(0, 120));
    console.log('About text:', result.aboutText?.substring(0, 120));
    console.log('Products:', result.productSpecs.length, result.productSpecs.slice(0, 3));
    console.log('Prices:', result.prices.length, result.prices.slice(0, 3));
    console.log('Testimonials:', result.testimonials.length);
    console.log('Team:', result.teamMembers.length);
  } else {
    console.log('No content scraped');
  }
}

main().catch(e => console.error('ERROR:', e.message));
