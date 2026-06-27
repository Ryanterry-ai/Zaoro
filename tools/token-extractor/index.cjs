// tools/token-extractor/index.js
// Bucket A — pure Playwright script, no LLM.
// Extracts computed CSS tokens from a live website using headless browser.
// Usage: node tools/token-extractor/index.js <url> <output-dir>
// Output: tokens.json { colors[], fonts[], spacing[], breakpoints[], screenshots{} }

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function extractTokens(url, outputDir) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const tokens = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const colors = new Set();
    const fonts = new Set();
    const spacing = new Set();

    for (const el of elements) {
      const style = window.getComputedStyle(el);
      ['color', 'background-color', 'border-color'].forEach(prop => {
        const val = style.getPropertyValue(prop);
        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
          colors.add(val);
        }
      });
      const font = style.getPropertyValue('font-family');
      if (font) fonts.add(font.split(',')[0].trim().replace(/['"]/g, ''));
      ['padding', 'margin', 'gap'].forEach(prop => {
        const val = style.getPropertyValue(prop);
        if (val && val !== '0px') spacing.add(val);
      });
    }

    const rootStyles = window.getComputedStyle(document.documentElement);
    const cssVars = {};
    for (const prop of rootStyles) {
      if (prop.startsWith('--')) {
        cssVars[prop] = rootStyles.getPropertyValue(prop).trim();
      }
    }

    return {
      colors: [...colors].slice(0, 20),
      fonts: [...fonts].filter(f => f.length > 0).slice(0, 5),
      spacing: [...spacing].slice(0, 20),
      cssVars,
    };
  });

  const screenshotPath = path.join(outputDir, 'reference-desktop.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileScreenshotPath = path.join(outputDir, 'reference-mobile.png');
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });

  await browser.close();

  const output = { url, tokens, screenshots: { desktop: screenshotPath, mobile: mobileScreenshotPath } };
  fs.writeFileSync(path.join(outputDir, 'tokens.json'), JSON.stringify(output, null, 2));

  console.log(`Extracted ${tokens.colors.length} colors, ${tokens.fonts.length} fonts from ${url}`);
  return output;
}

const [,, url, outputDir] = process.argv;
if (!url || !outputDir) {
  console.error('Usage: node index.js <url> <output-dir>');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
extractTokens(url, outputDir).catch(err => {
  console.error(err.message);
  process.exit(1);
});
