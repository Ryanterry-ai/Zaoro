import { DeterministicOrchestratorV4 } from './src/agents/deterministic-orchestrator-v4.js';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_BASE = './test-workspace';
const INPUT = '/build-anything Build me a Multi brands e-commerce supplement store for Indian customers';

async function main() {
  console.log('=== Build-Anything Pipeline Test ===');
  console.log('Input:', INPUT);
  console.log('');

  // Create workspace
  const workspaceId = `test-${Date.now()}`;
  const workspaceDir = path.join(WORKSPACE_BASE, workspaceId);
  fs.mkdirSync(workspaceDir, { recursive: true });

  console.log('Workspace:', workspaceDir);
  console.log('');

  // Run orchestrator
  const orch = new DeterministicOrchestratorV4(WORKSPACE_BASE);

  const startTime = Date.now();
  const result = await orch.processInput(workspaceId, INPUT);

  const duration = Date.now() - startTime;

  console.log('=== Result ===');
  console.log('Success:', result.success);
  console.log('Duration:', duration, 'ms');
  console.log('Duration (s):', (duration / 1000).toFixed(1), 's');

  if (result.error) {
    console.log('Error:', result.error);
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('Warnings:');
    for (const w of result.warnings) {
      console.log('  -', w);
    }
  }

  // List generated files
  console.log('');
  console.log('=== Generated Files ===');

  const files: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) continue;
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile()) {
        files.push(path.relative(workspaceDir, fullPath));
      }
    }
  };
  walk(workspaceDir);

  console.log(`Total files: ${files.length}`);
  for (const file of files.slice(0, 30)) {
    console.log('  ', file);
  }
  if (files.length > 30) {
    console.log(`  ... and ${files.length - 30} more`);
  }

  // Show key files
  console.log('');
  console.log('=== Key Files ===');

  const keyFiles = ['src/app/page.tsx', 'src/app/layout.tsx', 'prisma/schema.prisma', 'package.json'];
  for (const kf of keyFiles) {
    const fullPath = path.join(workspaceDir, kf);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      console.log(`\n--- ${kf} (${content.length} chars) ---`);
      console.log(content.slice(0, 500));
      if (content.length > 500) {
        console.log('...');
      }
    }
  }
}

main().catch(console.error);
