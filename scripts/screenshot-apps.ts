import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

const apps = [
  { id: 'ws-1782158488852-slaxid', name: 'martial-arts-gym', label: 'Martial Arts Gym + Tea + PT' },
  { id: 'ws-1782158491065-6wx87j', name: 'vet-clinic', label: 'Veterinary Clinic + Ecommerce' },
  { id: 'ws-1782158493154-kd740o', name: 'real-estate', label: 'Real Estate Marketplace' },
  { id: 'ws-1782158495514-3fs0ob', name: 'supplement-d2c', label: 'Supplement D2C + Wholesale' },
  { id: 'ws-1782158497654-opejap', name: 'law-firm-crm', label: 'Law Firm CRM' },
  { id: 'ws-1782158499805-xvp7ix', name: 'ai-saas-accountants', label: 'AI SaaS for Accountants' },
];

async function screenshotApp(browser: any, app: typeof apps[0]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  try {
    // Fetch preview HTML from engine
    const resp = await fetch(`http://localhost:3001/api/workspace/${app.id}/preview`);
    const html = await resp.text();

    // Write to temp file and load
    const tmpFile = path.join(SCREENSHOTS_DIR, `${app.name}-tmp.html`);
    fs.writeFileSync(tmpFile, html);
    await page.goto(`file:///${tmpFile.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${app.name}-full.png`),
      fullPage: true,
    });

    // Viewport screenshot (above the fold)
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, `${app.name}-viewport.png`),
    });

    console.log(`✓ ${app.label}: screenshots saved`);
  } catch (err: any) {
    console.log(`✗ ${app.label}: ${err.message}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  for (const app of apps) {
    await screenshotApp(browser, app);
  }

  await browser.close();
  console.log('\nDone! All screenshots saved to screenshots/');
}

main().catch(console.error);
