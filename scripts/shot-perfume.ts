import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(process.cwd(), 'screenshots-perfume');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const BASE = 'http://localhost:3456';

const pages = [
  { url: '/', name: 'home', full: false, scroll: false },
  { url: '/', name: 'home-scrolled', full: false, scroll: true },
  { url: '/shop', name: 'shop', full: false, scroll: false },
  { url: '/product/noir-absolu', name: 'product', full: false, scroll: false },
  { url: '/product/noir-absolu', name: 'product-scrolled', full: false, scroll: true },
];

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  for (const p of pages) {
    try {
      await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1500);
      if (p.scroll) {
        await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
        await page.waitForTimeout(1500);
      }
      const out = path.join(DIR, `${p.name}.png`);
      await page.screenshot({ path: out, fullPage: p.full });
      console.log(`✓ ${p.name}`);
    } catch (e: any) {
      console.log(`✗ ${p.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done ->', DIR);
}

main();
