import { buildBREContext } from './src/bos/intake-parser.js';
import { runBuildPipeline } from './src/generation/build-pipeline.js';
import * as fs from 'fs';
import * as path from 'path';

const prompt = 'a coffee shop in Austin with online ordering';
const workspaceId = `ws-test-${Date.now()}`;
const workspaceDir = path.join(process.cwd(), 'sandbox_workspaces', workspaceId);

async function main() {
  console.log('=== Coffee Shop Build Test ===');
  console.log(`Prompt: "${prompt}"`);
  console.log(`Workspace: ${workspaceDir}`);
  console.log('');

  // Create workspace
  fs.mkdirSync(workspaceDir, { recursive: true });

  try {
    // Step 1: Build BRE context
    console.log('Step 1: Building BRE context...');
    const breContext = await buildBREContext(prompt);
    console.log(`  ✅ BRE context built`);
    console.log(`  - Business Knowledge: ${breContext.businessKnowledge ? 'YES' : 'NO'}`);
    console.log(`  - Industry: ${breContext.businessKnowledge?.discovery?.industry ?? 'unknown'}`);
    console.log('');

    // Step 2: Run build pipeline
    console.log('Step 2: Running build pipeline...');
    const result = await runBuildPipeline(breContext, {
      platform: 'react',
      outputDir: workspaceDir,
      includeComments: true,
      includeTests: false,
    });

    console.log(`  ✅ Build pipeline completed`);
    console.log(`  - Pages: ${result.applicationSpec.pages.length}`);
    console.log(`  - Components: ${result.applicationSpec.pages.reduce((s: number, p: any) => s + p.components.length, 0)}`);
    console.log(`  - Files: ${result.renderResult.files.length}`);
    console.log('');

    // Step 3: Write files to disk
    console.log('Step 3: Writing files to disk...');
    for (const file of result.renderResult.files) {
      const filePath = path.join(workspaceDir, file.path);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, file.content);
    }
    console.log(`  ✅ Wrote ${result.renderResult.files.length} files`);
    console.log('');

    // Step 4: Check generated files
    console.log('Step 4: Checking generated files...');
    const files = result.renderResult.files;
    const fileTypes = files.reduce((acc: Record<string, number>, f: any) => {
      acc[f.type] = (acc[f.type] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`  File types: ${JSON.stringify(fileTypes)}`);
    console.log('');

    // Step 5: Check for specific content
    console.log('Step 5: Checking content...');
    const pageFile = files.find((f: any) => f.path.includes('page.tsx'));
    const globalsFile = files.find((f: any) => f.path.includes('globals.css'));
    const packageFile = files.find((f: any) => f.path.includes('package.json'));

    if (pageFile) {
      const hasRoastery = pageFile.content.includes('Roastery') || pageFile.content.includes('coffee');
      const hasStats = pageFile.content.includes('Happy Customers') || pageFile.content.includes('Menu Items');
      const hasTestimonials = pageFile.content.includes('Best coffee') || pageFile.content.includes('pour-over');
      console.log(`  page.tsx: Roastery/coffee content: ${hasRoastery}`);
      console.log(`  page.tsx: Stats content: ${hasStats}`);
      console.log(`  page.tsx: Testimonials content: ${hasTestimonials}`);
    }

    if (globalsFile) {
      const hasPrimary = globalsFile.content.includes('--primary');
      console.log(`  globals.css: Has --primary: ${hasPrimary}`);
    }

    if (packageFile) {
      const hasFramer = packageFile.content.includes('framer-motion');
      const hasTailwind = packageFile.content.includes('tailwindcss');
      const has21st = packageFile.content.includes('@21st-dev');
      console.log(`  package.json: framer-motion: ${hasFramer}`);
      console.log(`  package.json: tailwindcss: ${hasTailwind}`);
      console.log(`  package.json: @21st-dev: ${has21st}`);
    }
    console.log('');

    // Step 6: Save results
    console.log('Step 6: Saving results...');
    const report = {
      workspaceId,
      prompt,
      pages: result.applicationSpec.pages.length,
      components: result.applicationSpec.pages.reduce((s: number, p: any) => s + p.components.length, 0),
      files: result.renderResult.files.length,
      businessKnowledge: !!breContext.businessKnowledge,
      industry: breContext.businessKnowledge?.discovery?.industry,
      hasPageLayout: !!result.executionBlueprint,
    };
    fs.writeFileSync(path.join(workspaceDir, 'build-report.json'), JSON.stringify(report, null, 2));
    console.log(`  ✅ Report saved to ${workspaceDir}/build-report.json`);
    console.log('');

    console.log('=== BUILD SUCCESSFUL ===');
    console.log(`Workspace: ${workspaceDir}`);
    console.log(`Files: ${result.renderResult.files.length}`);

  } catch (error) {
    console.error('=== BUILD FAILED ===');
    console.error(error);
    process.exit(1);
  }
}

main();
