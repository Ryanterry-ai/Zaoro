import { LLMGateway } from '../src/core/llm-gateway.js';
import { FullStackArchitect } from '../src/generation/architect.js';
import { ASTPatcher } from '../src/core/ast-patcher.js';
import { FullStackCompilerPipeline } from '../src/generation/compiler-pipeline.js';
import { detectDomain } from '../src/generation/domain-detector.js';
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = path.join(process.cwd(), 'sandbox_workspaces');

const TEST_PROMPTS = [
  { prompt: 'real estate agency with property listings', expected: 'real-estate', heroKeyword: 'Dream Property' },
  { prompt: 'restaurant with online menu and reservations', expected: 'restaurant', heroKeyword: 'Culinary' },
  { prompt: 'gym with membership plans and class schedule', expected: 'fitness', heroKeyword: 'Transform' },
  { prompt: 'SaaS platform for project management', expected: 'saas', heroKeyword: 'Ship Faster' },
  { prompt: 'dental clinic with appointments', expected: 'dental', heroKeyword: 'Trusted' },
  { prompt: 'law firm with practice areas', expected: 'law-firm', heroKeyword: 'Legal' },
  { prompt: 'online education platform with courses', expected: 'education', heroKeyword: 'Master' },
  { prompt: 'coffee shop with menu and loyalty program', expected: 'coffee-shop', heroKeyword: 'Artisan' },
  { prompt: 'beauty salon with services and booking', expected: 'beauty-salon', heroKeyword: 'Amazing' },
  { prompt: 'auto dealership with vehicle inventory', expected: 'auto-dealership', heroKeyword: 'Dream Car' },
  { prompt: 'pet grooming and veterinary services', expected: 'pet-services', heroKeyword: 'Loving' },
  { prompt: 'personal portfolio for a designer', expected: 'portfolio', heroKeyword: 'Crafting' },
];

async function testOne(prompt: string, expected: string, heroKeyword: string): Promise<{ pass: boolean; detail: string }> {
  const domain = detectDomain(prompt);
  if (domain.industry !== expected) {
    return { pass: false, detail: `Domain mismatch: got ${domain.industry}, expected ${expected}` };
  }

  const gateway = new LLMGateway({ provider: 'gemini', apiKey: '' });
  const llmContext = { prompt, attempt: 0, changedFiles: [], errors: [] };
  const patches = await gateway.generatePatches(llmContext);

  const homePatch = patches.find(p => p.targetFile === 'src/app/page.tsx');
  if (!homePatch) {
    return { pass: false, detail: 'No home patch generated' };
  }

  const wsId = `test-${expected}-${Date.now()}`;
  const wsDir = path.join(WS_BASE, wsId);
  fs.mkdirSync(wsDir, { recursive: true });

  try {
    const workspace = { rootPath: wsDir } as any;
    const decision = FullStackArchitect.design(prompt);
    FullStackCompilerPipeline.compile(workspace, decision);

    const patcher = new ASTPatcher();
    patcher.applyPatch(wsDir, homePatch);

    const result = fs.readFileSync(path.join(wsDir, 'src/app/page.tsx'), 'utf-8');
    const hasDomainContent = result.includes(heroKeyword) || result.includes('Trusted') || result.includes('Start Free') || result.includes('Our ');
    const hasScaffold = result.includes('JIT Full-Stack Blueprint') || result.includes('Database Model');

    if (!hasDomainContent) {
      return { pass: false, detail: `Domain content missing (keyword: ${heroKeyword})` };
    }
    if (hasScaffold) {
      return { pass: false, detail: 'Scaffold content still present' };
    }
    return { pass: true, detail: `OK (${patches.length} patches, domain content rendered)` };
  } catch (err: any) {
    return { pass: false, detail: `Error: ${err.message}` };
  } finally {
    fs.rmSync(wsDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('=== Domain Patch Verification (all industries) ===\n');

  let pass = 0;
  let fail = 0;

  for (const t of TEST_PROMPTS) {
    const result = await testOne(t.prompt, t.expected, t.heroKeyword);
    const icon = result.pass ? '✓' : '✗';
    console.log(`  ${icon} ${t.expected}: ${result.detail}`);
    if (result.pass) pass++; else fail++;
  }

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
