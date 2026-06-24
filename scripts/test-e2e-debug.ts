import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Listen for console messages
  page.on('console', msg => console.log('   [BROWSER]', msg.text()));
  page.on('requestfailed', req => console.log('   [FAIL]', req.url(), req.failure()?.errorText));
  
  console.log('1. Opening production UI...');
  await page.goto('https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app', { waitUntil: 'networkidle', timeout: 15000 });
  
  console.log('2. Entering prompt...');
  await page.fill('textarea', 'dental clinic with memberships');
  
  console.log('3. Clicking Build...');
  
  // Intercept the API call
  const responsePromise = page.waitForResponse(resp => resp.url().includes('/api/create'), { timeout: 10000 });
  await page.click('button:has-text("Build")');
  
  try {
    const resp = await responsePromise;
    const data = await resp.json();
    console.log('   API Response:', JSON.stringify(data));
  } catch (e: any) {
    console.log('   API Error:', e.message);
  }
  
  console.log('4. Current URL:', page.url());
  await page.waitForTimeout(3000);
  console.log('   URL after 3s:', page.url());
  
  await page.screenshot({ path: 'test-debug.png' });
  
  await browser.close();
  console.log('Done!');
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
