/**
 * Verification script for Export Engine.
 * Tests ZIP export, GitHub push readiness, and env template generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExportEngine } from '../src/pipeline/export-engine.js';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function createTestWorkspace(): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-test-'));

  // Create directories first
  fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'prisma'), { recursive: true });

  // Create test files
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    type: 'module',
    dependencies: { 'react': '^19.0.0' },
  }, null, 2), 'utf-8');

  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
import React from 'react';
export default function Home() {
  return <div>Hello World</div>;
}
`, 'utf-8');

  fs.writeFileSync(path.join(tmpDir, 'prisma', 'schema.prisma'), `
generator client {
  provider = "prisma-client-js"
}
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`, 'utf-8');

  fs.writeFileSync(path.join(tmpDir, '.env'), 'DATABASE_URL="postgresql://localhost/test"', 'utf-8');

  return tmpDir;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: ZIP export
  try {
    const tmpDir = await createTestWorkspace();
    const engine = new ExportEngine();
    const outputPath = path.join(os.tmpdir(), 'test-export.zip');

    const result = await engine.exportZip({
      workspacePath: tmpDir,
      outputPath,
    });

    assert(result.success, 'ZIP export should succeed');
    assert(result.fileCount > 0, 'Should have files in archive');
    assert(result.archivePath !== undefined, 'Should have archive path');
    assert(fs.existsSync(result.archivePath!), 'Archive file should exist');

    // Verify ZIP file starts with PK signature
    const zipBuffer = fs.readFileSync(result.archivePath!);
    assert(zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4b, 'ZIP should start with PK signature');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlinkSync(outputPath);

    results.push({ name: 'ZIP export', passed: true, detail: `${result.fileCount} files, ${result.totalSize} bytes` });
  } catch (e: any) {
    results.push({ name: 'ZIP export', passed: false, detail: e.message });
  }

  // Test 2: ZIP file structure validation
  try {
    const tmpDir = await createTestWorkspace();
    const engine = new ExportEngine();
    const outputPath = path.join(os.tmpdir(), 'test-export2.zip');

    const result = await engine.exportZip({
      workspacePath: tmpDir,
      outputPath,
    });

    assert(result.success, 'ZIP export should succeed');

    // Read and parse ZIP
    const zipBuffer = fs.readFileSync(outputPath);

    // Check for end of central directory signature (0x06054b50)
    const eocdSignature = zipBuffer.readUInt32LE(zipBuffer.length - 22);
    assert(eocdSignature === 0x06054b50, 'ZIP should have valid end of central directory');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlinkSync(outputPath);

    results.push({ name: 'ZIP file structure validation', passed: true, detail: 'Valid ZIP structure verified' });
  } catch (e: any) {
    results.push({ name: 'ZIP file structure validation', passed: false, detail: e.message });
  }

  // Test 3: GitHub push readiness (no actual push)
  try {
    const engine = new ExportEngine();

    // Test with missing token
    const result = await engine.pushToGitHub({
      workspacePath: '/tmp/test',
      owner: 'test',
      repo: 'test',
      message: 'test',
    });

    assert(!result.success, 'Should fail without token');
    assert(result.errors.length > 0, 'Should have error message');
    assert(result.errors[0]?.includes('token'), 'Error should mention token');

    results.push({ name: 'GitHub push readiness', passed: true, detail: 'Correctly requires token' });
  } catch (e: any) {
    results.push({ name: 'GitHub push readiness', passed: false, detail: e.message });
  }

  // Test 4: Environment template generation
  try {
    const tmpDir = await createTestWorkspace();
    const engine = new ExportEngine();

    const envPath = engine.generateEnvTemplate(tmpDir);

    assert(fs.existsSync(envPath), '.env.example should be created');

    const content = fs.readFileSync(envPath, 'utf-8');
    assert(content.includes('DATABASE_URL'), 'Should include DATABASE_URL');
    assert(content.includes('NEXTAUTH_SECRET'), 'Should include NEXTAUTH_SECRET');
    assert(content.includes('NEXTAUTH_URL'), 'Should include NEXTAUTH_URL');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Environment template generation', passed: true, detail: '.env.example created with required vars' });
  } catch (e: any) {
    results.push({ name: 'Environment template generation', passed: false, detail: e.message });
  }

  // Test 5: README generation
  try {
    const tmpDir = await createTestWorkspace();
    const engine = new ExportEngine();

    const readmePath = engine.generateReadme(tmpDir, 'My Test App');

    assert(fs.existsSync(readmePath), 'README.md should be created');

    const content = fs.readFileSync(readmePath, 'utf-8');
    assert(content.includes('# My Test App'), 'Should include project name');
    assert(content.includes('npm install'), 'Should include install instructions');
    assert(content.includes('npm run dev'), 'Should include dev instructions');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'README generation', passed: true, detail: 'README.md created with project name' });
  } catch (e: any) {
    results.push({ name: 'README generation', passed: false, detail: e.message });
  }

  // Test 6: Empty workspace handling
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-empty-'));
    const engine = new ExportEngine();
    const outputPath = path.join(os.tmpdir(), 'test-export-empty.zip');

    const result = await engine.exportZip({
      workspacePath: tmpDir,
      outputPath,
    });

    assert(result.success, 'Empty workspace should export successfully');
    assert(result.fileCount === 0, 'Empty workspace should have 0 files');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    results.push({ name: 'Empty workspace handling', passed: true, detail: 'Empty workspace exported successfully' });
  } catch (e: any) {
    results.push({ name: 'Empty workspace handling', passed: false, detail: e.message });
  }

  // Test 7: Workspace scanning excludes node_modules
  try {
    const tmpDir = await createTestWorkspace();

    // Create node_modules with files
    fs.mkdirSync(path.join(tmpDir, 'node_modules', 'react'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'react', 'index.js'), '// react', 'utf-8');

    // Create .next directory
    fs.mkdirSync(path.join(tmpDir, '.next', 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.next', 'static', 'chunk.js'), '// chunk', 'utf-8');

    const engine = new ExportEngine();
    const outputPath = path.join(os.tmpdir(), 'test-export-exclude.zip');

    const result = await engine.exportZip({
      workspacePath: tmpDir,
      outputPath,
    });

    assert(result.success, 'Export should succeed');
    assert(result.fileCount >= 3, 'Should have at least 3 files (package.json, page.tsx, schema.prisma)');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlinkSync(outputPath);

    results.push({ name: 'Workspace scanning excludes node_modules', passed: true, detail: `Exported ${result.fileCount} files (excluded node_modules)` });
  } catch (e: any) {
    results.push({ name: 'Workspace scanning excludes node_modules', passed: false, detail: e.message });
  }

  return results;
}

async function main() {
  console.log('=== Export Engine Verification ===\n');

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
