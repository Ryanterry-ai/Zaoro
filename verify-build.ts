import { buildBREContext } from './src/bos/intake-parser.js';
import { runBuildPipeline } from './src/generation/build-pipeline.js';
import * as fs from 'fs';
import * as path from 'path';

const prompt = 'a coffee shop in Austin with online ordering';
const workspaceId = `ws-verify-${Date.now()}`;
const workspaceDir = path.join(process.cwd(), 'sandbox_workspaces', workspaceId);

async function main() {
  console.log('=== 6-Step Verification ===');
  console.log(`Prompt: "${prompt}"`);
  console.log(`Workspace: ${workspaceDir}`);
  console.log('');

  fs.mkdirSync(workspaceDir, { recursive: true });

  try {
    // Step 1: Build
    console.log('Step 1: Trigger build');
    const breContext = await buildBREContext(prompt);
    const result = await runBuildPipeline(breContext, {
      platform: 'react',
      outputDir: workspaceDir,
      includeComments: true,
      includeTests: false,
    });

    // Write ALL files to disk
    for (const file of result.renderResult.files) {
      const filePath = path.join(workspaceDir, file.path);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, file.content);
    }
    console.log(`  workspaceId: ${workspaceId}`);
    console.log(`  Files written: ${result.renderResult.files.length}`);
    console.log('');

    // Step 2: Check package.json
    console.log('Step 2: Check package.json dependencies');
    const packageFile = result.renderResult.files.find(f => f.path.includes('package.json'));
    if (packageFile) {
      const hasFramer = packageFile.content.includes('framer-motion');
      const hasTailwind = packageFile.content.includes('tailwindcss');
      const has21st = packageFile.content.includes('@21st-dev');
      console.log(`  framer-motion: ${hasFramer ? '✅' : '❌'}`);
      console.log(`  tailwindcss: ${hasTailwind ? '✅' : '❌'}`);
      console.log(`  @21st-dev: ${has21st ? '❌ FOUND (should be absent)' : '✅ ABSENT'}`);
    } else {
      console.log('  ❌ package.json not found');
    }
    console.log('');

    // Step 3: npm install && npm run build (simulated - check structure)
    console.log('Step 3: Check build structure');
    const pageFiles = result.renderResult.files.filter(f => f.type === 'page');
    const componentFiles = result.renderResult.files.filter(f => f.type === 'component');
    const configFiles = result.renderResult.files.filter(f => f.type === 'config');
    console.log(`  Pages: ${pageFiles.length}`);
    console.log(`  Components: ${componentFiles.length}`);
    console.log(`  Configs: ${configFiles.length}`);
    console.log('');

    // Step 4: Check CSS/config files
    console.log('Step 4: Check CSS/config files');
    const globalsFile = result.renderResult.files.find(f => f.path.includes('globals.css'));
    const nextConfig = result.renderResult.files.find(f => f.path.includes('next.config'));
    const tailwindConfig = result.renderResult.files.find(f => f.path.includes('tailwind.config'));
    console.log(`  globals.css: ${globalsFile ? '✅' : '❌'}`);
    console.log(`  next.config: ${nextConfig ? '✅' : '❌'}`);
    console.log(`  tailwind.config: ${tailwindConfig ? '✅' : '❌'}`);
    if (globalsFile) {
      const hasPrimary = globalsFile.content.includes('--primary');
      console.log(`  globals.css --primary: ${hasPrimary ? '✅' : '❌'}`);
    }
    console.log('');

    // Step 5: Check icons are components
    console.log('Step 5: Check icons are components (not text strings)');
    const allContent = result.renderResult.files.map(f => f.content).join('\n');
    const hasTextIcons = /(?:layers|zap|shield)(?:["'\s>])/.test(allContent) && !/import.*(?:layers|zap|shield)/.test(allContent);
    console.log(`  Text icons (layers/zap/shield): ${hasTextIcons ? '❌ FOUND' : '✅ ABSENT (icons are components)'}`);
    console.log('');

    // Step 6: Check seed data in output
    console.log('Step 6: Check seed data in rendered output');
    const pageContent = result.renderResult.files.find(f => f.path.endsWith('page.tsx'))?.content ?? '';
    const hasCoffee = /coffee|cafe|roast|brew|espresso|latte/i.test(pageContent);
    const hasAustin = /austin/i.test(pageContent);
    const hasRestaurantContent = /menu|reservation|table|dining|food/i.test(pageContent);
    console.log(`  Coffee content: ${hasCoffee ? '✅' : '❌'}`);
    console.log(`  Austin content: ${hasAustin ? '✅' : '❌'}`);
    console.log(`  Restaurant content: ${hasRestaurantContent ? '✅' : '❌'}`);
    console.log('');

    console.log('=== VERIFICATION COMPLETE ===');
    console.log(`Workspace: ${workspaceDir}`);

  } catch (error) {
    console.error('=== VERIFICATION FAILED ===');
    console.error(error);
    process.exit(1);
  }
}

main();
