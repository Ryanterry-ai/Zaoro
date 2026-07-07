#!/usr/bin/env node

// ─── Build.Anything CLI ───────────────────────────────────────────────────────
//
// Entry point for running the Build.Anything pipeline from command line.
// Uses agent-driven mode: generates artifacts directly, then writes files.
//
// Usage:
//   npx tsx src/app/build-anything-cli.ts "Build a gym CRM"
//   npx tsx src/app/build-anything-cli.ts --prompt "Build a SaaS dashboard"
//   npx tsx src/app/build-anything-cli.ts --file prompt.txt
// ──────────────────────────────────────────────────────────────────────────────

import { Orchestrator } from '../orchestration/orchestrator.js';
import { generateFromPrompt } from '../generation/agent-generators.js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Parse Arguments ──────────────────────────────────────────────────────────

function parseArgs(): { prompt: string; options: Record<string, string> } {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  let prompt = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;

    if (arg === '--prompt' || arg === '-p') {
      const nextArg = args[++i];
      prompt = nextArg ?? '';
    } else if (arg === '--file' || arg === '-f') {
      const filePath = args[++i];
      if (filePath && fs.existsSync(filePath)) {
        prompt = fs.readFileSync(filePath, 'utf-8').trim();
      } else {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
    } else if (arg === '--working-directory' || arg === '-w') {
      const nextArg = args[++i];
      options.workingDirectory = nextArg ?? '.build-anything';
    } else if (!arg.startsWith('-')) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error('Usage: npx tsx src/app/build-anything-cli.ts "Build a gym CRM"');
    console.error('       npx tsx src/app/build-anything-cli.ts --prompt "Build a SaaS dashboard"');
    console.error('       npx tsx src/app/build-anything-cli.ts --file prompt.txt');
    process.exit(1);
  }

  return { prompt, options };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { prompt, options } = parseArgs();
  const workingDir = options.workingDirectory ?? '.build-anything';

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Build.Anything v3 — Agent-Driven Mode');
  console.log(`  Prompt: ${prompt}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Step 1: Generate artifacts from prompt (agent-driven, no LLM calls)
  console.log('📝 Generating artifacts from prompt...');
  const artifacts = generateFromPrompt(prompt);

  console.log(`   ✅ Generated ${Object.keys(artifacts).length} artifact groups`);
  console.log(`   📄 Pages: ${(artifacts.frontendDesign as any)?.pages?.length ?? 0}`);
  console.log(`   🧩 Components: ${(artifacts.frontendDesign as any)?.components?.length ?? 0}`);
  console.log(`   🔌 API Endpoints: ${(artifacts.apiDesign as any)?.endpoints?.length ?? 0}`);
  console.log('');

  // Step 2: Run orchestrator with pre-generated artifacts
  console.log('🔨 Writing files to disk...');
  const orchestrator = new Orchestrator({
    workingDirectory: workingDir,
  });

  const result = await orchestrator.runWithArtifacts(artifacts as unknown as Record<string, unknown>, {
    workingDirectory: workingDir,
  });

  if (result.success) {
    const projectRoot = result.artifacts['code.projectRoot'] as string ?? path.join(process.cwd(), workingDir, 'projects', (artifacts.manifest as any)?.name ?? 'project');

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Build complete!');
    console.log(`   Files: ${result.artifacts['code.fileCount'] ?? 0}`);
    console.log(`   Project: ${projectRoot}`);
    console.log(`   Duration: ${result.durationMs}ms`);
    console.log('');
    console.log('   To preview your app:');
    console.log(`   cd ${projectRoot}`);
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('═══════════════════════════════════════════════════════════');
  } else {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ Build failed.');
    for (const [stageId, stageResult] of result.stageResults) {
      if (!stageResult.success) {
        console.log(`   ${stageId}: ${stageResult.error}`);
      }
    }
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
