import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://build-same.vercel.app';
const TEST_PROMPT = 'modern coffee shop website with online ordering and loyalty program';

async function runTest() {
  console.log('==========================================================');
  console.log(`  Testing ${PRODUCTION_URL}`);
  console.log(`  Prompt: "${TEST_PROMPT}"`);
  console.log('==========================================================\n');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  [BROWSER_ERR]', msg.text());
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log('  [API]', resp.status(), resp.url().split('?')[0]);
    }
  });

  try {
    // ─── 1. Load homepage ─────────────────────────────────────────
    console.log('\n1. Loading homepage...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots-v2/test-01-homepage.png' });
    console.log('   ✓ Title:', await page.title());

    // ─── 2. Fill prompt textarea ──────────────────────────────────
    console.log('\n2. Filling prompt...');
    const textarea = page.locator('textarea');
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    await textarea.fill(TEST_PROMPT);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots-v2/test-02-prompt-filled.png' });
    console.log('   ✓ Prompt filled');

    // ─── 3. Click the submit button ───────────────────────────────
    // The submit button is inside the input container, has rounded-xl, 
    // contains "Build" text, and is NOT inside the mode tabs.
    // It's the LAST button with bg-accent in the DOM.
    console.log('\n3. Clicking submit button...');
    const submitBtn = page.locator('button').filter({ hasText: /^Build/ }).last();
    const submitBtnExists = await submitBtn.count();
    console.log(`   Found submit button candidate: ${submitBtnExists > 0}`);

    if (submitBtnExists > 0) {
      await submitBtn.click();
      console.log('   ✓ Clicked');
    } else {
      // Fallback: click the last bg-accent button that has "Build" text
      const fallback = page.locator('button.bg-accent:has-text("Build")').last();
      await fallback.click({ force: true });
      console.log('   ✓ Clicked (fallback)');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots-v2/test-03-after-submit.png' });

    // ─── 4. Wait for navigation to workspace ──────────────────────
    console.log('\n4. Waiting for workspace redirect...');
    try {
      await page.waitForURL(/\/workspace\//, { timeout: 15000 });
      const wsUrl = page.url();
      console.log('   ✓ Navigated to:', wsUrl);
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots-v2/test-04-workspace.png' });

      // ─── 5. Extract workspace ID and hit engine directly ────────
      const wsId = wsUrl.split('/workspace/')[1];
      console.log('   ✓ Workspace ID:', wsId);

      // ─── 6. Poll for progress stages ────────────────────────────
      console.log('\n5. Polling for progress stages (up to 2 min)...');
      for (let i = 0; i < 24; i++) {
        await page.waitForTimeout(5000);
        const bodyText = (await page.textContent('body')) || '';

        const keywords = ['Analyzing', 'Designing', 'Creating', 'Generating', 'Compiling', 'Rendering', 'Complete', 'Building', 'Progress'];
        const found = keywords.filter(k => bodyText.includes(k));
        console.log(`   [${(i+1)*5}s] ${found.join(' → ') || 'waiting...'}`);

        if (i === 0 || i === 5 || i === 10 || i === 15 || i === 20 || found.length > 0) {
          await page.screenshot({ path: `screenshots-v2/test-05-progress-${i+1}.png` });
        }

        if (bodyText.includes('Build complete') || (bodyText.includes('Complete') && !bodyText.includes('Clone'))) {
          console.log('   ✓ Build completed!');
          break;
        }
      }

      // ─── 7. Final screenshot ────────────────────────────────────
      console.log('\n6. Final state...');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots-v2/test-06-final.png' });

      // Try clicking Files tab
      try {
        const filesBtn = page.locator('button:has-text("Files")');
        if (await filesBtn.count() > 0) {
          await filesBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'screenshots-v2/test-07-files.png' });
          console.log('   ✓ Files tab screenshot');
        }
      } catch {}

    } catch {
      console.log('   ✗ Did not navigate to workspace');
      const text = (await page.textContent('body')) || '';
      console.log('   Page content (first 600):', text.substring(0, 600));
      await page.screenshot({ path: 'screenshots-v2/test-04-no-navigation.png' });
    }

    console.log('\n✓ Test complete!');
  } catch (err: any) {
    console.error('\n✗ ERROR:', err.message);
    await page.screenshot({ path: 'screenshots-v2/test-error.png' });
  }

  await browser.close();
}

runTest();
