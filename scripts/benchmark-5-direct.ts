import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import fs from 'fs';
import path from 'path';

const PROMPTS = [
  'a neighborhood Italian restaurant with online reservations, 2 locations in Austin TX',
  'B2B supplement wholesaler with bulk ordering and dealer portal for India',
  'SaaS CRM for sales teams with pipeline management',
  'luxury spa and wellness center with online booking in Manhattan',
  'online coding bootcamp with course catalog and student dashboard',
];

const WORKSPACE_BASE = path.join(process.cwd(), 'sandbox_workspaces');

async function main() {
  const results: { prompt: string; ws: string; files: number; industry: string }[] = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i]!;
    const wsId = `ws-benchmark-${Date.now()}-${i}`;
    const wsDir = path.join(WORKSPACE_BASE, wsId);

    console.log(`\n--- Prompt ${i + 1}/5: "${prompt.substring(0, 50)}..." ---`);
    const start = Date.now();

    const ctx = await buildBREContext(prompt);
    console.log(`  Industry: ${ctx.industry}, Entities: ${ctx.entities.length}`);

    const result = await runBuildPipeline(ctx, {
      platform: 'react',
      outputDir: path.join(wsDir, 'src'),
      workspaceDir: wsDir,
    });

    for (const file of result.renderResult.files) {
      const safePath = file.path.replace(/:/g, '_');
      const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
      const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
      const filePath = path.join(wsDir, isRoot ? '' : 'src', relPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content, 'utf-8');
    }

    const elapsed = Date.now() - start;
    console.log(`  Files: ${result.renderResult.files.length}, Time: ${elapsed}ms`);
    results.push({ prompt, ws: wsId, files: result.renderResult.files.length, industry: ctx.industry });
  }

  console.log('\n\n=== BENCHMARK RESULTS ===');
  for (const r of results) {
    console.log(`  ${r.industry.padEnd(15)} | ${r.files} files | ${r.ws}`);
    console.log(`    "${r.prompt}"`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
