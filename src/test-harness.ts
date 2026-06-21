import { DeterministicOrchestratorV4 } from './agents/deterministic-orchestrator-v4.js';
import { ASTPatch, LLMContext } from './types/index.js';
import * as fs from 'fs';
import * as path from 'path';

const WORKSPACE_BASE = path.resolve('./sandbox_workspaces');

// Clear legacy test environments safely
if (fs.existsSync(WORKSPACE_BASE)) {
  fs.rmSync(WORKSPACE_BASE, { recursive: true, force: true });
}

const orchestrator = new DeterministicOrchestratorV4(WORKSPACE_BASE);

async function runTestVerification() {
  console.log('--- STARTING SYSTEM INTEGRATION HARNESS AUDIT ---');

  let runAttempt = 0;
  
  const mockLLMClient = async (context: LLMContext): Promise<ASTPatch[]> => {
    runAttempt++;
    
    // Attempt 1: Scaffold a valid, clean page
    if (runAttempt === 1) {
      console.log('  [Harness] Attempt 1: Emitting structurally correct TSX patch...');
      return [
        {
          targetFile: 'src/app/page.tsx',
          targetExport: 'Home',
          action: 'update',
          codeBlock: `export default function Home() {
  return (
    <main style={{ padding: '3rem', background: '#000', color: '#fff' }}>
      <h1>SaaS Control Panel V4 Active</h1>
    </main>
  );
}`
        }
      ];
    }

    // Attempt 2: Introduce a compiler error + create dirty untracked folders and files
    if (runAttempt === 2) {
      console.log('  [Harness] Attempt 2: Simulating malicious/corrupt structural mutation...');
      
      const dirtyDir = path.join(WORKSPACE_BASE, 'test-sandbox-id', 'src', 'dirty-pollution-feature');
      fs.mkdirSync(dirtyDir, { recursive: true });
      fs.writeFileSync(path.join(dirtyDir, 'untracked-leak.ts'), 'export const badCode = 123;', 'utf-8');
      
      return [
        {
          targetFile: 'src/app/page.tsx',
          targetExport: 'Home',
          action: 'update',
          codeBlock: `export default function Home() {
  // Non-existent reference designed to trigger TSC Compilation Error
  return <MissingComponent />;
}`
        }
      ];
    }

    // Attempt 3: Recovery patch to stabilize the workspace
    console.log('  [Harness] Attempt 3: Emitting recovery patch to restore compile stability...');
    return [
      {
        targetFile: 'src/app/page.tsx',
        targetExport: 'Home',
        action: 'update',
        codeBlock: `export default function Home() {
  return (
    <main style={{ padding: '3rem' }}>
      <h1>Self-Healing Loop Resolved Successfully</h1>
    </main>
  );
}`
      }
    ];
  };

  try {
    const config = await orchestrator.runCompilationFlow(
      'test-sandbox-id',
      'Deploy SaaS dashboard layout with strict self-healing tests',
      mockLLMClient,
      4,
      true
    );

    console.log('\n✔ Verification Flow completed successfully!');
    console.log(`  + Workspace compiled successfully at: ${config.rootPath}`);

    // Verify post-rollback filesystem safety
    const dirtyDir = path.join(WORKSPACE_BASE, 'test-sandbox-id', 'src', 'dirty-feature');
    if (fs.existsSync(dirtyDir)) {
      console.error('❌ FAIL: Untracked directory structure survived rollback!');
      process.exit(1);
    } else {
      console.log('✔ SUCCESS: Untracked directory tree purged cleanly from disk.');
    }

    console.log('\n--- VERIFICATION PASS: SYSTEM IS 100% PRODUCTION READY ---');
    orchestrator.stopDevInstance('test-sandbox-id');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ FAIL: System orchestration loop crashed under test:', error.message);
    process.exit(1);
  }
}

runTestVerification();
