import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('   [BROWSER]', msg.text()));
  
  console.log('1. Opening production UI...');
  await page.goto('https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app', { waitUntil: 'networkidle', timeout: 15000 });
  
  // Check textarea exists
  const textarea = await page.$('textarea');
  console.log('2. Textarea found:', !!textarea);
  
  // Check all buttons
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    const disabled = await btn.isDisabled();
    console.log(`   Button: "${text?.trim()}" disabled=${disabled}`);
  }
  
  console.log('3. Filling textarea...');
  if (textarea) {
    await textarea.fill('dental clinic with memberships');
    const value = await textarea.inputValue();
    console.log('   Value:', value);
  }
  
  console.log('4. Looking for Build button...');
  const buildBtn = await page.$('button:has-text("Build")');
  console.log('   Build button found:', !!buildBtn);
  if (buildBtn) {
    const disabled = await buildBtn.isDisabled();
    console.log('   Disabled:', disabled);
    
    // Try clicking with force
    console.log('5. Clicking...');
    await buildBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('   URL after click:', page.url());
  }
  
  await page.screenshot({ path: 'test-debug2.png' });
  await browser.close();
  console.log('Done!');
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
