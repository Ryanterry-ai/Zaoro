const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const SCREENSHOTS_DIR = 'test-workspace/supplement-store/screenshots';

const pages = [
  { path: '/', name: 'homepage', wait: 3000 },
  { path: '/shop', name: 'shop', wait: 3000 },
  { path: '/product/muscleblaze-biozyme-performance-whey', name: 'product-detail', wait: 2000 },
  { path: '/cart', name: 'cart', wait: 1500 },
  { path: '/checkout', name: 'checkout', wait: 1500 },
  { path: '/login', name: 'login', wait: 1500 },
  { path: '/register', name: 'register', wait: 1500 },
  { path: '/contact', name: 'contact', wait: 1500 },
  { path: '/orders', name: 'orders', wait: 1500 },
  { path: '/profile', name: 'profile', wait: 1500 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  for (const p of pages) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(p.wait);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${p.name}.png`, fullPage: true });
      console.log(`✅ ${p.name} (${p.path})`);
    } catch (err) {
      console.error(`❌ ${p.name} (${p.path}): ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\nDone. Screenshots saved to ${SCREENSHOTS_DIR}/`);
})();
