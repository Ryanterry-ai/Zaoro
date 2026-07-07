import { DeterministicOrchestratorV4 } from '../src/agents/deterministic-orchestrator-v4.js';
import type { GenerationIntent } from '../types/index.js';
import { execSync, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const WORKSPACE_BASE = path.resolve('sandbox_workspaces');
const WORKSPACE_ID = 'task-tracker-preview';

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Build.Anything — Generate + Preview     ║');
  console.log('╚══════════════════════════════════════════╝');

  const orch = new DeterministicOrchestratorV4(WORKSPACE_BASE);
  const intent: GenerationIntent = {
    type: 'build-app',
    prompt: 'Build a simple task tracker app with projects, kanban boards, tasks with labels, and user assignments. Single workspace, small teams.',
  };

  console.log('\nGenerating...\n');
  const t0 = Date.now();
  const result = await orch.processGenerationIntent(WORKSPACE_ID, intent);
  const elapsed = Date.now() - t0;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Generation: ${result.success ? '✅' : '❌'}`);
  console.log(`Duration: ${(elapsed / 1000).toFixed(1)}s`);

  if (!result.success) {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }

  const workspaceRoot = path.join(WORKSPACE_BASE, WORKSPACE_ID);
  console.log(`Workspace: ${workspaceRoot}`);
  console.log(`Pages: ${result.pageResults?.length ?? 0}`);

  // List generated files
  const files: string[] = [];
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full.replace(workspaceRoot, ''));
    }
  }
  walk(workspaceRoot);
  console.log(`Files generated: ${files.length}`);
  files.slice(0, 30).forEach(f => console.log(`  ${f}`));
  if (files.length > 30) console.log(`  ... and ${files.length - 30} more`);

  // Install + preview
  console.log('\nInstalling dependencies...');
  try {
    execSync('npm install', { cwd: workspaceRoot, stdio: 'pipe', timeout: 120000 });
    console.log('Dependencies installed.');

    console.log('\nStarting preview at http://localhost:3000...\n');
    const server = spawn('npx', ['next', 'dev', '-p', '3000'], {
      cwd: workspaceRoot,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' },
    });

    server.on('error', (err) => console.error('Failed to start preview:', err));
    server.on('close', (code) => console.log(`Preview server exited (code ${code})`));

    // Keep running for preview
    console.log('Press Ctrl+C to stop the preview server.');
  } catch (err: any) {
    console.error(`Failed: ${err.message}`);
  }
}

main().catch(console.error);
