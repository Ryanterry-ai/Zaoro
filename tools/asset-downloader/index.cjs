// tools/asset-downloader/index.js
// Bucket A — downloads and localizes all assets from a URL.
// Usage: node tools/asset-downloader/index.js <url> <output-dir>
// Downloads images, fonts, icons to outputDir/public/

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const ASSET_PATTERN = /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav)$/i;

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

async function downloadAssets(url, outputDir) {
  const publicDir = path.join(outputDir, 'public', 'assets');
  fs.mkdirSync(publicDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  const assetUrls = await page.evaluate(() => {
    const assets = new Set();
    document.querySelectorAll('img[src], video[src], source[src], link[href]').forEach(el => {
      const src = el.getAttribute('src') || el.getAttribute('href');
      if (src && !src.startsWith('data:') && !src.startsWith('#')) {
        assets.add(src);
      }
    });
    document.querySelectorAll('style').forEach(style => {
      const text = style.textContent || '';
      const urlMatches = text.matchAll(/url\(["']?([^"')]+)["']?\)/g);
      for (const match of urlMatches) {
        if (match[1] && !match[1].startsWith('data:')) {
          assets.add(match[1]);
        }
      }
    });
    return [...assets];
  });

  const downloaded = [];
  for (const assetUrl of assetUrls) {
    try {
      const fullUrl = assetUrl.startsWith('http') ? assetUrl : new URL(assetUrl, url).href;
      if (!ASSET_PATTERN.test(fullUrl)) continue;

      const fileName = path.basename(new URL(fullUrl).pathname);
      const destPath = path.join(publicDir, fileName);

      if (!fs.existsSync(destPath)) {
        await downloadFile(fullUrl, destPath);
      }

      const ext = path.extname(fileName).toLowerCase().replace('.', '');
      const type = /^(png|jpe?g|gif|svg|webp|avif|ico)$/.test(ext) ? 'image'
        : /^(woff2?|ttf|otf|eot)$/.test(ext) ? 'font'
        : /^(mp4|webm)$/.test(ext) ? 'video'
        : ext === 'svg' ? 'svg' : 'other';
      const localPath = `/assets/${fileName}`;
      downloaded.push({ originalUrl: fullUrl, localPath, fileName, type, reviewRequired: false });
      console.log(`Downloaded: ${fileName}`);
    } catch (err) {
      console.warn(`Failed: ${assetUrl} — ${err.message}`);
    }
  }

  await browser.close();

  const manifest = { sourceUrl: url, generatedAt: new Date().toISOString(), assets: downloaded };
  fs.writeFileSync(path.join(outputDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Downloaded ${downloaded.length} assets to ${publicDir}`);
  return manifest;
}

const [,, url, outputDir] = process.argv;
if (!url || !outputDir) {
  console.error('Usage: node index.js <url> <output-dir>');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
downloadAssets(url, outputDir).catch(err => {
  console.error(err.message);
  process.exit(1);
});
