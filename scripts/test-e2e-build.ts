import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('1. Opening production UI...');
  await page.goto('https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app', { waitUntil: 'networkidle', timeout: 15000 });
  console.log('   Title:', await page.title());
  
  console.log('2. Entering prompt...');
  await page.fill('textarea', 'dental clinic with memberships');
  
  console.log('3. Clicking Build...');
  await page.click('button:has-text("Build")');
  
  console.log('4. Waiting for workspace page...');
  await page.waitForURL(/\/workspace\//, { timeout: 10000 });
  console.log('   URL:', page.url());
  
  // Wait and screenshot at intervals
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(5000);
    const text = await page.textContent('body');
    const stages = ['Initializing', 'Analyzing', 'Designing', 'Creating', 'Generating', 'Compiling', 'Rendering', 'Build completed', 'Complete'];
    const visible = stages.filter(s => text.includes(s));
    console.log(`   ${i*5}s - Visible: ${visible.join(', ') || 'none'}`);
    await page.screenshot({ path: `test-progress-${i}.png` });
  }
  
  await browser.close();
  console.log('Done!');
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
