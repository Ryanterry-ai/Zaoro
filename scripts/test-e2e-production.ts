import { chromium } from 'playwright';

const PRODUCTION_URL = 'https://web-nqhr7m99r-upgraded-ai-factory-s-projects.vercel.app';
const ENGINE_URL = 'http://localhost:3001';

interface TestResult {
  stage: string;
  success: boolean;
  duration: number;
  details: string;
}

async function runTest(prompt: string, mode: 'build' | 'clone' = 'build', cloneUrl?: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const startTime = Date.now();

  try {
    // Stage 1: Load homepage
    const t1 = Date.now();
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 15000 });
    results.push({ stage: 'Load Homepage', success: true, duration: Date.now() - t1, details: await page.title() });

    // Stage 2: Enter prompt and click submit
    const t2 = Date.now();
    if (mode === 'clone' && cloneUrl) {
      await page.click('button:has-text("Clone")');
      await page.waitForTimeout(300);
      await page.fill('input[type="url"]', cloneUrl);
    } else {
      await page.fill('textarea', prompt);
    }

    // Click the SUBMIT button (has bg-accent class), not the tab button
    const submitBtn = page.locator('button.bg-accent:not(.rounded-lg)').first();
    await submitBtn.click({ force: true });
    results.push({ stage: 'Submit Prompt', success: true, duration: Date.now() - t2, details: `Mode: ${mode}` });

    // Stage 3: Wait for workspace URL
    const t3 = Date.now();
    await page.waitForURL(/\/workspace\//, { timeout: 10000 });
    const workspaceUrl = page.url();
    const workspaceId = workspaceUrl.split('/workspace/')[1];
    results.push({ stage: 'Navigate to Workspace', success: true, duration: Date.now() - t3, details: workspaceId || '' });

    // Stage 4: Wait for progress stages to appear
    const t4 = Date.now();
    let foundStages: string[] = [];
    const expectedStages = ['Analyzing', 'Designing', 'Creating', 'Generating', 'Compiling', 'Rendering', 'Build completed', 'Complete'];

    for (let i = 0; i < 24; i++) { // Poll for 2 minutes
      await page.waitForTimeout(5000);
      const text = await page.textContent('body');
      foundStages = expectedStages.filter(s => text.includes(s));

      if (foundStages.includes('Build completed') || foundStages.includes('Complete')) {
        break;
      }

      console.log(`   [${(i+1)*5}s] Stages visible: ${foundStages.join(', ') || 'waiting...'}`);
    }

    results.push({
      stage: 'Progress Stages',
      success: foundStages.length >= 3,
      duration: Date.now() - t4,
      details: foundStages.join(' → ')
    });

    // Stage 5: Check preview iframe
    const t5 = Date.now();
    await page.waitForTimeout(3000);
    const iframe = await page.$('iframe[title="Preview"]');
    const hasPreview = !!iframe;
    let previewSrc = '';
    if (iframe) {
      previewSrc = await iframe.getAttribute('srcdoc') ? 'has content' : 'empty';
    }
    results.push({ stage: 'Preview Iframe', success: hasPreview, duration: Date.now() - t5, details: previewSrc });

    // Stage 6: Check files
    const t6 = Date.now();
    const filesTab = page.locator('button:has-text("Files")');
    await filesTab.click();
    await page.waitForTimeout(1000);
    const fileText = await page.textContent('body');
    const hasFiles = fileText.includes('.tsx') || fileText.includes('.ts');
    results.push({ stage: 'Files Generated', success: hasFiles, duration: Date.now() - t6, details: hasFiles ? 'TSX/TS files found' : 'no files' });

    // Take final screenshot
    await page.screenshot({ path: `test-final-${Date.now()}.png` });

  } catch (err: any) {
    results.push({ stage: 'ERROR', success: false, duration: Date.now() - startTime, details: err.message });
    await page.screenshot({ path: `test-error-${Date.now()}.png` });
  }

  await browser.close();
  return results;
}

async function main() {
  console.log('====================================================');
  console.log('   AUTOMATED PRODUCTION TEST (Playwright)');
  console.log('====================================================\n');

  console.log('Prompt: "dental clinic with memberships and oral-care products"');
  console.log('Mode: build\n');

  const results = await runTest('dental clinic with memberships and oral-care products', 'build');

  console.log('\n--- Results ---');
  let allPassed = true;
  for (const r of results) {
    const icon = r.success ? '✓' : '✗';
    console.log(`  ${icon} ${r.stage} (${r.duration}ms) — ${r.details}`);
    if (!r.success) allPassed = false;
  }

  console.log(`\n${allPassed ? '✓ ALL PASSED' : '✗ SOME FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

main();
