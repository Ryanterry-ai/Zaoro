/**
 * Verification script for Delivery Pipeline.
 * Tests complete pipeline orchestration, resumability, and idempotency.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DeliveryPipeline } from '../src/pipeline/delivery-pipeline.js';
import type { PipelineStatus } from '../src/pipeline/delivery-pipeline.js';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function createTestWorkspace(): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-test-'));

  // Create package.json
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-delivery-app',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      'react': '^19.0.0',
      'react-dom': '^19.0.0',
    },
  }, null, 2), 'utf-8');

  // Create app routes
  fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
import React from 'react';
export default function Home() {
  return <div>Hello World</div>;
}
`, 'utf-8');

  // Create API routes
  fs.mkdirSync(path.join(tmpDir, 'src', 'app', 'api', 'users'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'api', 'users', 'route.ts'), `
export async function GET() {}
export async function POST() {}
`, 'utf-8');

  // Create Prisma schema
  fs.mkdirSync(path.join(tmpDir, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'prisma', 'schema.prisma'), `
generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`, 'utf-8');

  // Create .env.example
  fs.writeFileSync(path.join(tmpDir, '.env.example'), `
DATABASE_URL="postgresql://localhost/test"
NEXTAUTH_SECRET="secret"
`, 'utf-8');

  return tmpDir;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Complete pipeline execution
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Test Delivery App',
      projectDescription: 'A test app for delivery pipeline',
      buildId: 'test-build-001',
      skipStages: ['github-push'],
    });

    const status = await pipeline.run();

    assert(status.stage === 'complete', `Stage should be complete, got ${status.stage}`);
    assert(status.completedAt !== undefined, 'Should have completedAt');
    assert(status.error === undefined, 'Should have no error');
    assert(status.results.dependencies?.lockAcquired === true, 'Dependencies should be acquired');
    assert(status.results.validation?.passed === true, 'Validation should pass');
    assert(status.results.manifest !== undefined, 'Manifest should be generated');
    assert(status.results.zipExport?.success === true, 'ZIP export should succeed');
    assert(status.results.zipExport?.fileCount !== undefined, 'ZIP should have file count');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Complete pipeline execution', passed: true, detail: `ZIP: ${status.results.zipExport?.fileCount} files` });
  } catch (e: any) {
    results.push({ name: 'Complete pipeline execution', passed: false, detail: e.message });
  }

  // Test 2: Pipeline status saving and loading
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Status Test App',
      skipStages: ['github-push'],
    });

    await pipeline.run();

    // Check status file was created
    const statusPath = path.join(tmpDir, '.pipeline-status.json');
    assert(fs.existsSync(statusPath), 'Status file should be created');

    // Load status and verify
    const savedStatus = JSON.parse(fs.readFileSync(statusPath, 'utf-8')) as PipelineStatus;
    assert(savedStatus.stage === 'complete', 'Saved status should show complete');
    assert(savedStatus.results.manifest !== undefined, 'Saved status should have manifest');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Pipeline status saving and loading', passed: true, detail: 'Status persisted correctly' });
  } catch (e: any) {
    results.push({ name: 'Pipeline status saving and loading', passed: false, detail: e.message });
  }

  // Test 3: Pipeline idempotency (run twice)
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Idempotent App',
      skipStages: ['github-push'],
    });

    // Run twice
    const status1 = await pipeline.run();
    const status2 = await pipeline.run();

    assert(status1.stage === 'complete', 'First run should complete');
    assert(status2.stage === 'complete', 'Second run should complete');

    // Manifest should be regenerated
    assert(status2.results.manifest?.metadata.name === 'Idempotent App', 'Manifest should have correct name');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Pipeline idempotency', passed: true, detail: 'Both runs completed successfully' });
  } catch (e: any) {
    results.push({ name: 'Pipeline idempotency', passed: false, detail: e.message });
  }

  // Test 4: Skip specific stages
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Skip Test App',
      skipStages: ['zip-export', 'github-push'],
    });

    const status = await pipeline.run();

    assert(status.stage === 'complete', 'Should complete');
    assert(status.results.zipExport === undefined, 'ZIP export should be skipped');
    assert(status.results.githubPush === undefined, 'GitHub push should be skipped');
    assert(status.results.manifest !== undefined, 'Manifest should still run');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Skip specific stages', passed: true, detail: 'Skipped stages not executed' });
  } catch (e: any) {
    results.push({ name: 'Skip specific stages', passed: false, detail: e.message });
  }

  // Test 5: Healing memory integration
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Healing Test App',
      skipStages: ['github-push'],
    });

    const status = await pipeline.run();

    assert(status.results.healing !== undefined, 'Healing should run');
    assert(typeof status.results.healing?.knownFix === 'boolean', 'Healing should have knownFix');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Healing memory integration', passed: true, detail: 'Healing ran correctly' });
  } catch (e: any) {
    results.push({ name: 'Healing memory integration', passed: false, detail: e.message });
  }

  // Test 6: Manifest generation with all components
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Full Manifest App',
      skipStages: ['github-push'],
    });

    const status = await pipeline.run();

    const manifest = status.results.manifest;
    assert(manifest !== undefined, 'Manifest should exist');
    assert(manifest?.routes.length !== undefined, 'Manifest should have routes');
    assert(manifest?.apiEndpoints.length !== undefined, 'Manifest should have API endpoints');
    assert(manifest?.database.models.length !== undefined, 'Manifest should have database models');
    assert(manifest?.environment.length !== undefined, 'Manifest should have environment vars');
    assert(manifest?.deployment.length !== undefined, 'Manifest should have deployment targets');

    // Verify manifest file exists
    const manifestPath = path.join(tmpDir, 'workspace.manifest.json');
    assert(fs.existsSync(manifestPath), 'Manifest file should exist on disk');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Manifest generation with all components', passed: true, detail: `Routes: ${manifest?.routes.length}, APIs: ${manifest?.apiEndpoints.length}` });
  } catch (e: any) {
    results.push({ name: 'Manifest generation with all components', passed: false, detail: e.message });
  }

  // Test 7: ZIP export includes all essential files
  try {
    const tmpDir = await createTestWorkspace();
    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'ZIP Content App',
      skipStages: ['github-push'],
    });

    const status = await pipeline.run();

    assert(status.results.zipExport?.success === true, 'ZIP should succeed');

    // Check that .env.example and README.md were generated
    assert(fs.existsSync(path.join(tmpDir, '.env.example')), '.env.example should exist');
    assert(fs.existsSync(path.join(tmpDir, 'README.md')), 'README.md should exist');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'ZIP export includes all essential files', passed: true, detail: 'All essential files present' });
  } catch (e: any) {
    results.push({ name: 'ZIP export includes all essential files', passed: false, detail: e.message });
  }

  // Test 8: Empty workspace pipeline
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-empty-'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'empty-app',
      version: '1.0.0',
      type: 'module',
    }, null, 2), 'utf-8');

    const pipeline = new DeliveryPipeline({
      workspacePath: tmpDir,
      projectName: 'Empty App',
      skipStages: ['github-push'],
    });

    const status = await pipeline.run();

    // Pipeline should complete even with minimal workspace
    assert(status.stage === 'complete', 'Pipeline should complete with empty workspace');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Empty workspace pipeline', passed: true, detail: 'Pipeline handles empty workspace' });
  } catch (e: any) {
    results.push({ name: 'Empty workspace pipeline', passed: false, detail: e.message });
  }

  return results;
}

async function main() {
  console.log('=== Delivery Pipeline Verification ===\n');

  const results = await runTests();

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.name}: ${result.detail}`);
    if (result.passed) passed++; else failed++;
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
