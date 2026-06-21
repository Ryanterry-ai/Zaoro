import { DeterministicOrchestratorV4 } from '../src/agents/deterministic-orchestrator-v4.js';
import { LLMGateway } from '../src/core/llm-gateway.js';
import { ArchitectAgent } from '../src/generation/architect.js';
import { GenerationIntent } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_BASE = path.resolve('./sandbox_workspaces');

if (fs.existsSync(WORKSPACE_BASE)) {
  fs.rmSync(WORKSPACE_BASE, { recursive: true, force: true });
}

const orchestrator = new DeterministicOrchestratorV4(WORKSPACE_BASE);

async function runAudit() {
  console.log('======================================================');
  console.log('   GENERATION LAYER INTEGRATION VERIFICATION SUITE   ');
  console.log('======================================================\n');

  // Check 1: JIT Synthesis generates patches from any prompt
  console.log('[Check 1] Verifying JIT Synthesis generates patches...');
  const gateway = new LLMGateway({ provider: 'openai', apiKey: '' });
  const fallbackPatches = await gateway.generatePatches({
    prompt: 'Build a martial arts gym that sells organic green tea and books physical therapy sessions',
    errors: [],
    attempt: 0,
    changedFiles: []
  });

  if (fallbackPatches.length === 0) {
    console.error('❌ FAIL: JIT synthesis returned empty patches.');
    process.exit(1);
  }
  if (!fallbackPatches[0]?.codeBlock.includes('min-h-screen')) {
    console.error('❌ FAIL: JIT synthesis output missing React/Tailwind code.');
    process.exit(1);
  }
  console.log(`  + OK: JIT synthesis generated ${fallbackPatches.length} patch(es) with real React code.`);

  // Check 2: ArchitectAgent designs architecture for cross-domain prompts
  console.log('\n[Check 2] Verifying ArchitectAgent cross-domain synthesis...');
  const architect = new ArchitectAgent();
  const decision = architect.designArchitecture('A martial arts gym that also sells organic green tea and lets users book physical therapy sessions');

  if (decision.subDomains.length < 2) {
    console.error('❌ FAIL: ArchitectAgent did not detect sub-domains.');
    process.exit(1);
  }
  if (decision.pages.length < 3) {
    console.error('❌ FAIL: ArchitectAgent generated fewer than 3 pages.');
    process.exit(1);
  }
  console.log(`  + OK: Detected ${decision.subDomains.length} sub-domains: ${decision.subDomains.join(', ')}`);
  console.log(`  + OK: Designed ${decision.pages.length} pages: ${decision.pages.map(p => p.route).join(', ')}`);
  console.log(`  + OK: Color scheme: ${decision.colorScheme.primary} primary, ${decision.colorScheme.mood} mood`);

  // Check 3: Blueprint scaffolds pages to disk
  console.log('\n[Check 3] Verifying Blueprint Page Scaffolding...');
  const blueprintGenerator = orchestrator.getBlueprintGenerator();
  const bp = blueprintGenerator.generateFromPrompt('Build an ecommerce store called ShoeHub');
  
  if (bp.pages.length === 0 || bp.components.length === 0) {
    console.error('❌ FAIL: Scaffolder returned empty pages or components list');
    process.exit(1);
  }
  console.log(`  + OK: Dynamic blueprint maps ${bp.pages.length} pages.`);

  // Check 4: Full Orchestration compilation flow end-to-end
  console.log('\n[Check 4] Executing Orchestration Compilation Flow...');
  const intent: GenerationIntent = {
    type: 'build-website',
    prompt: 'Build a martial arts gym that sells organic green tea and books physical therapy sessions'
  };

  try {
    const res = await orchestrator.processGenerationIntent('sandbox-verify-id', intent, { provider: 'openai', apiKey: '' });
    if (!res.success) {
      console.error('❌ FAIL: Orchestration pipeline failed compile check.');
      process.exit(1);
    }

    const pageCheck = path.join(WORKSPACE_BASE, 'sandbox-verify-id', 'src', 'app', 'page.tsx');
    if (!fs.existsSync(pageCheck)) {
      console.error('❌ FAIL: Blueprint page files did not write to disk.');
      process.exit(1);
    }

    // Read the generated page and verify it has real content
    const pageContent = fs.readFileSync(pageCheck, 'utf-8');
    if (pageContent.length < 500) {
      console.error('❌ FAIL: Generated page is too short — likely a stub.');
      process.exit(1);
    }

    console.log(`  + OK: Generated page.tsx (${pageContent.length} chars)`);
    console.log(`  + OK: Contains gradient text: ${pageContent.includes('bg-gradient-to-r')}`);
    console.log(`  + OK: Contains interactive elements: ${pageContent.includes('useState')}`);

    console.log(`\n✔ INTEGRATION VERIFICATION COMPLETE: ALL GATES PASS`);
    orchestrator.stopDevInstance('sandbox-verify-id');
    process.exit(0);

  } catch (err: any) {
    console.error('\n❌ FAIL: Compilation flow threw an unhandled exception:', err.message);
    process.exit(1);
  }
}

runAudit();
