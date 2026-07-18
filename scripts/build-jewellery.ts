// Deterministic build for a signal-driven prompt (no external LLM required).
// Runs the Universal Signal Extraction (canonical build) + deterministic render
// pipeline, then self-verifies via the verification loop.
import { runCanonicalBuild } from '../src/orchestration/pipeline/canonical-build.js';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { runVerificationLoop } from '../src/orchestration/verification/loop.js';
import { executeRepair } from '../src/orchestration/verification/repair-executor.js';
import fs from 'fs';
import path from 'path';

const PROMPT =
  'Build a premium luxury jewellery brand website that feels like entering a private haute joaillerie atelier rather than browsing an online store. ' +
  'The experience should communicate craftsmanship, exclusivity, timeless elegance, rarity, trust, and emotional value before showcasing products. ' +
  'Create a cinematic, emotionally driven storytelling experience where every scroll reveals the beauty of precious metals, gemstones, craftsmanship, and heritage through carefully choreographed motion, elegant transitions, macro product photography, refined lighting, subtle reflections, and luxurious pacing. ' +
  'Use soft ivory backgrounds, warm champagne-gold accents, premium serif typography paired with clean modern sans-serif text, generous whitespace, glass and polished metal materials, delicate shadows, and sophisticated micro-interactions. Every animation should feel intentional, slow, smooth, and premium rather than flashy. ' +
  'The homepage should gradually tell the brand story through immersive sections including heritage, craftsmanship, collections, signature pieces, bespoke jewellery services, gemstone selection, artisan process, client testimonials, luxury gifting, appointments, and personalized consultations. ' +
  'Build an unforgettable product discovery experience where collections and jewellery pieces reveal themselves naturally through cinematic scrolling, elegant hover interactions, refined image transitions, and premium motion choreography. Products should feel precious and collectible rather than catalog items. ' +
  'Maximize trust and conversion for high-value purchases by emphasizing authenticity, certifications, craftsmanship, limited editions, secure purchasing, concierge support, financing options, worldwide shipping, luxury packaging, aftercare services, and appointment booking for private consultations. ' +
  'Generate a luxury experience rather than a traditional ecommerce website. Every scene should reinforce exclusivity, craftsmanship, elegance, emotion, aspiration, and confidence.';

const WS = path.join(process.cwd(), 'sandbox_workspaces', 'ws-jewellery-engine');

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
  if (result.selectedSkills?.length) {
    console.log(`  skills         : ${result.selectedSkills.map((s) => s.id).join(', ')}`);
  }
  if (result.videoPlan) {
    console.log(`  video skill    : ${result.videoPlan.skillId} (${result.videoPlan.items.length} clip(s))`);
  }

  console.log('\n[05] Signal-driven verification + self-healing loop');
  const { report, iterations, finalInput } = await runVerificationLoop(
    {
      files: result.renderResult.files.map((f) => ({ path: f.path, content: f.content })),
      businessKnowledge: bk,
      rawPrompt: PROMPT,
    },
    executeRepair,
    8,
  );
  console.log(`  iterations     : ${iterations}`);
  console.log(`  passed         : ${report.passed}`);
  console.log(`  score          : ${report.score.toFixed(2)}`);
  console.log(`  gaps           : ${report.gaps.length}`);
  for (const g of report.gaps) {
    console.log(`    - [${g.severity}] ${g.category}: ${g.detail}`);
  }

  console.log('\n[06] Write generated + self-healed files');
  fs.mkdirSync(WS, { recursive: true });
  for (const file of finalInput.files) {
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

  console.log(`\nWorkspace: ${WS}`);
  console.log('════════════════════════════════════════════════════');
  console.log(report.passed ? 'RESULT: BUILD VERIFIED ✓' : 'RESULT: BUILD PRODUCED (review gaps)');
  console.log('════════════════════════════════════════════════════');
}

main().catch((e) => { console.error(e); process.exit(1); });
