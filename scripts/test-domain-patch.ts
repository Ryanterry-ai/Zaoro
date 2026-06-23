import { LLMGateway } from '../src/core/llm-gateway.js';
import { FullStackArchitect } from '../src/generation/architect.js';
import { ASTPatcher } from '../src/core/ast-patcher.js';
import { FullStackCompilerPipeline } from '../src/generation/compiler-pipeline.js';
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = path.join(process.cwd(), 'sandbox_workspaces');
const WS_ID = 'test-domain-' + Date.now();
const WS_DIR = path.join(WS_BASE, WS_ID);

async function main() {
  console.log('=== Testing Domain Patch Flow (after fix) ===\n');

  const prompt = 'SaaS platform for project management';

  // 1. Get domain patches (no API key)
  const gateway = new LLMGateway({ provider: 'gemini', apiKey: '' });
  const llmContext = { prompt, attempt: 0, changedFiles: [], errors: [] };
  const patches = await gateway.generatePatches(llmContext);

  console.log(`Generated ${patches.length} domain patches`);

  // 2. Create workspace and scaffold
  fs.mkdirSync(WS_DIR, { recursive: true });
  const workspace = { rootPath: WS_DIR } as any;
  const decision = FullStackArchitect.design(prompt);
  FullStackCompilerPipeline.compile(workspace, decision);

  // 3. Try applying the home patch
  const patcher = new ASTPatcher();
  const homePatch = patches.find(p => p.targetFile === 'src/app/page.tsx');
  if (!homePatch) {
    console.log('ERROR: No home patch found!');
    fs.rmSync(WS_DIR, { recursive: true, force: true });
    return;
  }

  console.log(`\nApplying home patch (export: ${homePatch.targetExport})...`);
  try {
    patcher.applyPatch(WS_DIR, homePatch);
    const result = fs.readFileSync(path.join(WS_DIR, 'src/app/page.tsx'), 'utf-8');
    console.log(`\nPATCH APPLIED SUCCESSFULLY!`);
    console.log(`Has domain hero: ${result.includes('Ship Faster') || result.includes('Trusted by') || result.includes('Start Free Trial') ? 'YES' : 'NO'}`);
    console.log(`Has scaffold: ${result.includes('JIT Full-Stack Blueprint') ? 'YES' : 'NO'}`);
    console.log(`Has pricing: ${result.includes('Starter') || result.includes('Professional') || result.includes('Enterprise') ? 'YES' : 'NO'}`);
    console.log(`First 500: ${result.substring(0, 500).replace(/\n/g, ' ')}`);
  } catch (err: any) {
    console.log(`\nPatch FAILED: ${err.message}`);
  }

  // 4. Apply ALL patches
  console.log(`\n--- Applying all patches ---`);
  let successCount = 0;
  let failCount = 0;
  for (const patch of patches) {
    try {
      patcher.applyPatch(WS_DIR, patch);
      successCount++;
      console.log(`  ✓ ${patch.targetFile}`);
    } catch (err: any) {
      failCount++;
      console.log(`  ✗ ${patch.targetFile}: ${err.message.substring(0, 80)}`);
    }
  }
  console.log(`\nResults: ${successCount} success, ${failCount} failed`);

  // Cleanup
  fs.rmSync(WS_DIR, { recursive: true, force: true });
  console.log('\n=== Test Complete ===');
}

main().catch(err => { console.error(err); process.exit(1); });
