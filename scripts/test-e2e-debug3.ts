import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('   [BROWSER]', msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/')) console.log('   [REQ]', req.method(), req.url());
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/')) console.log('   [RES]', resp.status(), resp.url());
  });
  
  console.log('1. Creating workspace...');
  const createRes = await page.request.post('https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app/api/create', {
    data: { prompt: 'dental clinic with memberships' }
  });
  const createData = await createRes.json();
  console.log('   Created:', createData.id);
  
  console.log('2. Navigating to workspace...');
  await page.goto(`https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app/workspace/${createData.id}`, { waitUntil: 'networkidle', timeout: 15000 });
  
  console.log('3. Waiting for page to settle...');
  await page.waitForTimeout(5000);
  
  const text = await page.textContent('body');
  console.log('   Page content includes:', {
    initializing: text.includes('Initializing'),
    analyzing: text.includes('Analyzing'),
    designing: text.includes('Designing'),
    building: text.includes('Building'),
  });
  
  // Check if build was triggered by looking at network requests
  console.log('4. Manually triggering build...');
  const buildRes = await page.request.post(`https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app/api/workspace/${createData.id}/build`);
  const buildData = await buildRes.json();
  console.log('   Build:', buildData);
  
  // Now poll for progress
  console.log('5. Polling progress...');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(5000);
    const progressRes = await page.request.get(`http://localhost:3001/api/workspace/${createData.id}/progress`);
    const progress = await progressRes.json();
    console.log(`   [${(i+1)*5}s] Steps: ${progress.steps?.length || 0}`);
    if (progress.steps?.length > 0) {
      progress.steps.forEach((s: any) => console.log(`     [${s.step}] ${s.message}`));
    }
  }
  
  await page.screenshot({ path: 'test-debug3.png' });
  await browser.close();
  console.log('Done!');
}

test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
