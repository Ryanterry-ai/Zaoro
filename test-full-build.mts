import { buildBREContext, buildBusinessResearch } from './src/bos/intake-parser.js';
import { runBREV2Pipeline } from './src/bos/bre-v2-pipeline.js';
import { runBuildPipeline } from './src/generation/build-pipeline.js';
import * as fs from 'fs';
import * as path from 'path';

const prompt = 'Build me a Multi brands e-commerce supplement store for Indian customers';
const workspaceDir = './test-workspace/supplement-store';

async function main() {
  console.log('=== Full Build Pipeline Test ===');
  console.log('Prompt:', prompt);
  console.log('');

  // Step 1: BRE Context
  console.log('Step 1: Building BRE Context...');
  const breContext = buildBREContext(prompt);
  console.log('  Industry:', breContext.industry);
  console.log('  App Name:', breContext.appName);
  console.log('');

  // Step 2: Business Research
  console.log('Step 2: Building Business Research...');
  const businessResearch = buildBusinessResearch(prompt, breContext.industry, breContext.subIndustry, breContext.country);
  console.log('  Personas:', businessResearch.userPersonas);
  console.log('  Revenue:', businessResearch.revenueFlow);
  console.log('');

  // Step 3: BRE v2 Pipeline
  console.log('Step 3: Running BRE v2 Pipeline...');
  const t1 = Date.now();
  const breResult = await runBREV2Pipeline(breContext);
  console.log('  Duration:', Date.now() - t1, 'ms');
  console.log('  Confidence:', breResult.confidence);
  console.log('  Blueprint exists:', !!breResult.blueprint);
  console.log('');

  // Step 4: Build Pipeline
  console.log('Step 4: Running Build Pipeline...');
  fs.mkdirSync(workspaceDir, { recursive: true });

  // Attach businessResearch to the context
  breContext.businessResearch = businessResearch;

  const t2 = Date.now();
  const buildResult = await runBuildPipeline(breContext, {
    workspaceDir,
    outputDir: path.join(workspaceDir, 'src'),
    platform: 'react',
  });
  console.log('  Duration:', Date.now() - t2, 'ms');

  // In agent mode, files live in renderResult.files (includes Pass 3: Prisma, API routes, seed)
  const assembly = buildResult.assemblyResult;
  const renderFiles = buildResult.renderResult?.files ?? [];

  if (assembly) {
    console.log('  Assembly files:', assembly.mergedFiles.size);
    console.log('  Assembly conflicts:', assembly.conflicts.length);
    console.log('  Specs processed:', assembly.specFilesProcessed);
  }
  console.log('  Render files (total including Pass 3):', renderFiles.length);

  // List generated files — renderResult.files is the complete set
  console.log('');
  console.log('=== Generated Files ===');
  const filesToWrite: Array<{ path: string; content: string }> = [];

  for (const file of renderFiles) {
    console.log('  ', file.path, `(${file.content.length} chars)`);
    filesToWrite.push({ path: file.path, content: file.content });
  }

  // Save files to disk
  console.log('');
  console.log('=== Saving Files ===');
  for (const file of filesToWrite) {
    // Resolve ../package.json etc. relative to workspace root
    const resolvedPath = file.path.startsWith('../')
      ? file.path.slice(3) // strip ../
      : file.path;
    const filePath = path.join(workspaceDir, resolvedPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
    console.log('  Saved:', resolvedPath);
  }

  console.log('');
  console.log('=== Build Complete ===');
  console.log('Output directory:', workspaceDir);
}

main().catch(console.error);
