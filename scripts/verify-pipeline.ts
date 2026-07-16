import * as fs from 'fs';
import * as path from 'path';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';

const PROMPT = 'build me a modern coffee website for Indian customers';
const WORKSPACE_BASE = path.join(process.cwd(), 'sandbox_workspaces');
const workspaceId = `ws-coffee-verify-${Date.now()}`;
const workspaceDir = path.join(WORKSPACE_BASE, workspaceId);

async function main(): Promise<void> {
  console.log(`\nPrompt: "${PROMPT}"\n`);

  const breContext = buildBREContext(PROMPT);
  console.log('[build] Industry:', breContext.industry);
  console.log('[build] appName:', breContext.appName);
  console.log('[build] BusinessKnowledge attached:', !!breContext.businessKnowledge);

  const tPipeline = Date.now();
  const result = await runBuildPipeline(breContext, {
    platform: 'react',
    outputDir: path.join(workspaceDir, 'src'),
    workspaceDir,
  });

  console.log(`\n[build] Pipeline complete in ${Date.now() - tPipeline}ms`);
  console.log('[build] Blueprint name:', result.breResult.blueprint.name);
  console.log('[build] Blueprint industry:', result.breResult.blueprint.industry);
  console.log('[build] BusinessKnowledge in result:', !!result.businessKnowledge);
  console.log('[build] Files generated:', result.renderResult.files.length);

  // Find hero banner content
  const heroFile = result.renderResult.files.find(f => f.path.includes('HeroBanner') || f.path.includes('hero'));
  if (heroFile) {
    console.log('\n--- Hero Banner Content ---');
    const badgeMatch = heroFile.content.match(/badge.*?value.*?["']([^"']+)["']/);
    const titleMatch = heroFile.content.match(/title.*?value.*?["']([^"']+)["']/);
    console.log('Badge:', badgeMatch?.[1] ?? 'NOT FOUND');
    console.log('Title:', titleMatch?.[1] ?? 'NOT FOUND');
  }

  // Find testimonials
  const testimonialFile = result.renderResult.files.find(f => f.path.includes('Testimonial'));
  if (testimonialFile) {
    console.log('\n--- Testimonials Content ---');
    const quotes = testimonialFile.content.match(/quote.*?["']([^"']+)["']/g);
    if (quotes) {
      quotes.forEach((q, i) => console.log(`  ${i+1}. ${q.replace(/quote.*?["']|["']/g, '')}`));
    }
  }

  fs.mkdirSync(workspaceDir, { recursive: true });
  for (const file of result.renderResult.files) {
    const safePath = file.path.replace(/:/g, '_');
    const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
    const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
    const fullPath = path.join(workspaceDir, isRoot ? '' : 'src', relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.content, 'utf-8');
  }
  console.log(`\nFiles written to ${workspaceDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});