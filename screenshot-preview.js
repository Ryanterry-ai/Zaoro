const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:3007';
const SCREENSHOT_DIR = path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop', 'screenshots-build-preview');

const routes = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/properties', name: 'properties' },
];

(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const route of routes) {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Scroll through the page to trigger whileInView animations
      const height = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y < height; y += 400) {
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(200);
      }
      // Scroll back to top for full-page screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

      const filePath = path.join(SCREENSHOT_DIR, `${route.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`✓ ${route.path} → ${filePath}`);
    } catch (e) {
      console.error(`✗ ${route.path} — ${e.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${SCREENSHOT_DIR}`);
})();
