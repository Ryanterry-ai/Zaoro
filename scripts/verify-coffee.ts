import * as fs from 'fs';
import * as path from 'path';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';

const PROMPT = 'build me a modern coffee website for Indian customers';
const WORKSPACE_BASE = path.join(process.cwd(), 'sandbox_workspaces');
const workspaceId = `ws-coffee-verify-${Date.now()}`;
const workspaceDir = path.join(WORKSPACE_BASE, workspaceId);

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Build verification: "${PROMPT}"`);
  console.log(`${'='.repeat(60)}\n`);

  const start = Date.now();
  const breContext = buildBREContext(PROMPT);

  console.log(`[build] Industry: ${breContext.industry}`);
  console.log(`[build] AppName: ${breContext.appName}`);
  console.log(`[build] BusinessKnowledge: ${breContext.businessKnowledge ? 'YES' : 'NO'}`);
  if (breContext.businessKnowledge) {
    const bk = breContext.businessKnowledge;
    console.log(`[bk] businessType: ${bk.discovery.businessType}`);
    console.log(`[bk] industry: ${bk.discovery.industry}`);
    console.log(`[bk] subIndustry: ${bk.discovery.subIndustry}`);
    console.log(`[bk] niche: ${bk.discovery.niche}`);
    console.log(`[bk] domain: ${bk.discovery.domain}`);
    console.log(`[bk] customerPersonas: ${bk.customerPersonas.length}`);
    console.log(`[bk] workflows: ${bk.workflows.length}`);
    console.log(`[bk] entities: ${bk.entities.length}`);
    console.log(`[bk] vocab product: ${bk.vocabulary.terms.product}`);
    console.log(`[bk] vocab customer: ${bk.vocabulary.terms.customer}`);
  }

  const tPipeline = Date.now();
  const result = await runBuildPipeline(breContext, {
    platform: 'react',
    outputDir: path.join(workspaceDir, 'src'),
    workspaceDir,
  });

  console.log(`[build] Pipeline complete in ${Date.now() - tPipeline}ms`);
  console.log(`[build] Blueprint name: ${result.breResult.blueprint.name}`);
  console.log(`[build] Pages: ${result.breResult.blueprint.pages.length}`);
  console.log(`[build] Files: ${result.renderResult.files.length}`);
  console.log(`[build] BusinessKnowledge in result: ${result.businessKnowledge ? 'YES' : 'NO'}`);

  if (result.businessKnowledge) {
    console.log(`[bk] businessType: ${result.businessKnowledge.discovery.businessType}`);
    console.log(`[bk] industry: ${result.businessKnowledge.discovery.industry}`);
  }

  // Check hero badge
  const heroFile = result.renderResult.files.find(f => f.path.includes('HeroBanner') || f.path.includes('hero'));
  if (heroFile) {
    const badgeMatch = heroFile.content.match(/badge.*?value:\s*['"]([^'"]+)['"]/);
    if (badgeMatch) {
      console.log(`[hero] Badge: "${badgeMatch[1]}"`);
    }
  }

  // Check testimonials
  const testFile = result.renderResult.files.find(f => f.path.includes('Testimonial') || f.path.includes('testimonial'));
  if (testFile) {
    const quotes = testFile.content.match(/quote:\s*['"`]([^'"`]+)['"`]/g);
    if (quotes) {
      console.log('[testimonials] Quotes:');
      quotes.forEach((q, i) => console.log(`  ${i+1}. ${q.slice(0, 100)}...`));
    }
  }

  // Write files for manual inspection
  fs.mkdirSync(workspaceDir, { recursive: true });
  for (const file of result.renderResult.files) {
    const safePath = file.path.replace(/:/g, '_');
    const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
    const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
    const fullPath = path.join(workspaceDir, isRoot ? '' : 'src', relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf-8');
  }
  console.log(`\n[build] ${result.renderResult.files.length} files written to ${workspaceDir}`);
  console.log(`[build] Total duration: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});