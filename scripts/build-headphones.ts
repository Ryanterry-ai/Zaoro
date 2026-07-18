// Deterministic build for a signal-driven prompt (no external LLM required).
// Runs the Universal Signal Extraction (canonical build) + deterministic render
// pipeline, then self-verifies via the verification loop.
import { runCanonicalBuild } from '../src/orchestration/pipeline/canonical-build.js';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { verifyBuild } from '../src/orchestration/verification/loop.js';
import fs from 'fs';
import path from 'path';

const PROMPT =
  'Build me a futuristic headphone website where every scroll transforms noise into silence—from chaotic soundwaves to complete calm experience people won\'t forget';

const WS = path.join(process.cwd(), 'sandbox_workspaces', 'ws-headphones-engine');

async function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('Build.Anything v2 — Signal-Driven Execution');
  console.log('════════════════════════════════════════════════════');

  console.log('\n[01] Universal Signal Extraction (canonical build)');
  const canonical = await runCanonicalBuild({ prompt: PROMPT });
  const bk = canonical.businessKnowledge;
  const intents = bk.intents;
  console.log(`  industry label : ${bk.discovery?.industry ?? 'general'} (coarse, non-branching)`);
  console.log(`  experience     : ${intents.experience.join(', ') || '(none)'}`);
  console.log(`  interaction    : ${intents.interaction.join(', ') || '(none)'}`);
  console.log(`  motion         : ${intents.motion.join(', ') || '(none)'}`);
  console.log(`  conversion     : ${intents.conversion.join(', ') || '(none)'}`);
  console.log(`  emotional       : ${intents.emotional.join(', ') || '(none)'}`);
  console.log(`  compliant      : ${canonical.compliant}`);

  console.log('\n[02] Build BRE context + overlay BusinessKnowledge');
  const ctx = await buildBREContext(PROMPT);
  (ctx as any).businessKnowledge = bk;

  console.log('\n[03] Deterministic render pipeline (SkillIntegrator intents path)');
  const result = await runBuildPipeline(ctx, {
    platform: 'react',
    outputDir: path.join(WS, 'src'),
    workspaceDir: WS,
  });
  console.log(`  files rendered : ${result.renderResult.files.length}`);

  console.log('\n[04] Write generated files');
  fs.mkdirSync(WS, { recursive: true });
  for (const file of result.renderResult.files) {
    const safePath = file.path.replace(/:/g, '_');
    const isRoot =
      safePath.startsWith('../') ||
      safePath.startsWith('prisma/') ||
      safePath.startsWith('public/');
    const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
    const filePath = path.join(WS, isRoot ? '' : 'src', relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  console.log('\n[05] Signal-driven verification loop');
  const report = verifyBuild({
    files: result.renderResult.files.map((f) => ({ path: f.path, content: f.content })),
    businessKnowledge: bk,
  });
  console.log(`  passed         : ${report.passed}`);
  console.log(`  score          : ${report.score.toFixed(2)}`);
  console.log(`  gaps           : ${report.gaps.length}`);
  for (const g of report.gaps) {
    console.log(`    - [${g.severity}] ${g.category}: ${g.detail}`);
  }

  console.log(`\nWorkspace: ${WS}`);
  console.log('════════════════════════════════════════════════════');
  console.log(report.passed ? 'RESULT: BUILD VERIFIED ✓' : 'RESULT: BUILD PRODUCED (review gaps)');
  console.log('════════════════════════════════════════════════════');
}

main().catch((e) => { console.error(e); process.exit(1); });
