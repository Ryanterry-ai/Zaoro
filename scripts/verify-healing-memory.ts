/**
 * Verification script for Failure Knowledge Base (Healing Memory).
 * Tests fix pattern matching, failure recording, and LLM call reduction.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HealingMemory } from '../src/intelligence/healing-memory/healing-memory.js';
import { FixPatterns } from '../src/intelligence/healing-memory/fix-patterns.js';
import { FailureStore } from '../src/intelligence/healing-memory/failure-store.js';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Fix pattern matching
  try {
    const patterns = new FixPatterns();

    // Test matching known errors
    const match1 = patterns.match("Cannot find module 'express'");
    assert(match1 !== null, 'Should match module not found error');
    assert(match1?.id === 'ts-module-not-found', 'Should match ts-module-not-found pattern');

    const match2 = patterns.match("Property 'name' does not exist on type 'User'");
    assert(match2 !== null, 'Should match property not exist error');

    const match3 = patterns.match("relative import './file' needs explicit file extension");
    assert(match3 !== null, 'Should match ESM extension error');

    const match4 = patterns.match("This is a completely unrelated error");
    assert(match4 === null, 'Should not match unrelated error');

    results.push({ name: 'Fix pattern matching', passed: true, detail: '4 patterns tested' });
  } catch (e: any) {
    results.push({ name: 'Fix pattern matching', passed: false, detail: e.message });
  }

  // Test 2: Failure store persistence
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-test-'));
    const store = new FailureStore(tmpDir);

    // Record a failure
    const id = store.recordFailure({
      errorSignature: "Cannot find module 'missing-pkg'",
      errorMessage: "Cannot find module 'missing-pkg'",
      errorCategory: 'module-resolution',
      fixApplied: 'npm install missing-pkg',
      fixSuccess: true,
    });

    assert(id.startsWith('fail_'), 'Should return failure ID');

    // Verify persistence
    const store2 = new FailureStore(tmpDir);
    const failures = store2.getAll();
    assert(failures.length === 1, 'Should have 1 failure');
    assert(failures[0]?.fixApplied === 'npm install missing-pkg', 'Should store fix');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Failure store persistence', passed: true, detail: 'Failure recorded and persisted' });
  } catch (e: any) {
    results.push({ name: 'Failure store persistence', passed: false, detail: e.message });
  }

  // Test 3: Historical fix lookup
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-test2-'));
    const store = new FailureStore(tmpDir);

    // Record multiple similar failures with fixes
    for (let i = 0; i < 5; i++) {
      store.recordFailure({
        errorSignature: "Cannot find module 'lodash'",
        errorMessage: "Cannot find module 'lodash'",
        errorCategory: 'module-resolution',
        fixApplied: 'npm install lodash',
        fixSuccess: true,
      });
    }

    // Find successful fixes
    const fixes = store.findSuccessfulFixes("Cannot find module 'lodash'");
    assert(fixes.length === 5, `Should find 5 fixes, got ${fixes.length}`);

    // Get best fix
    const bestFix = store.getBestFix("Cannot find module 'lodash'");
    assert(bestFix === 'npm install lodash', 'Best fix should be npm install lodash');

    // Check has known fix
    assert(store.hasKnownFix("Cannot find module 'lodash'"), 'Should have known fix');
    assert(!store.hasKnownFix("Completely different error"), 'Should not have fix for different error');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Historical fix lookup', passed: true, detail: '5 fixes found, best fix identified' });
  } catch (e: any) {
    results.push({ name: 'Historical fix lookup', passed: false, detail: e.message });
  }

  // Test 4: Healing memory analysis (without LLM)
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-test3-'));
    const memory = new HealingMemory({
      workspacePath: tmpDir,
      confidenceThreshold: 0.7,
    });

    // Analyze known error
    const result1 = memory.analyze({
      message: "Cannot find module 'express'",
      file: 'src/server.ts',
    });

    assert(result1.knownFix === true, 'Should have known fix for module error');
    assert(result1.shouldCallLLM === false, 'Should not call LLM for known fix');
    assert(result1.confidence >= 0.7, `Confidence should be >= 0.7, got ${result1.confidence}`);

    // Analyze unknown error
    const result2 = memory.analyze({
      message: "Some completely unknown and weird error that has no pattern",
    });

    assert(result2.knownFix === false, 'Should not have known fix for unknown error');
    assert(result2.shouldCallLLM === true, 'Should call LLM for unknown error');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Healing memory analysis', passed: true, detail: 'Known fix found, unknown triggers LLM' });
  } catch (e: any) {
    results.push({ name: 'Healing memory analysis', passed: false, detail: e.message });
  }

  // Test 5: Fix result recording
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-test4-'));
    const memory = new HealingMemory({ workspacePath: tmpDir });

    // Record successful fix
    memory.recordFixResult(
      { message: "Cannot find module 'lodash'", category: 'module-resolution' },
      'npm install lodash',
      true,
      'build-123',
    );

    // Record failed fix
    memory.recordFixResult(
      { message: "Cannot find module 'lodash'", category: 'module-resolution' },
      'npm install lodashx',
      false,
      'build-124',
    );

    // Check stats
    const stats = memory.getStats();
    assert(stats.totalFailures === 2, `Should have 2 failures, got ${stats.totalFailures}`);
    assert(stats.totalFixes === 2, `Should have 2 fixes, got ${stats.totalFixes}`);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Fix result recording', passed: true, detail: `Stats: ${stats.totalFailures} failures, ${stats.totalFixes} fixes` });
  } catch (e: any) {
    results.push({ name: 'Fix result recording', passed: false, detail: e.message });
  }

  // Test 6: Memory pruning
  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'healing-test5-'));
    const store = new FailureStore(tmpDir);

    // Record old failure
    store.recordFailure({
      errorSignature: 'old error',
      errorMessage: 'old error',
      errorCategory: 'runtime-error',
      fixApplied: 'old fix',
      fixSuccess: true,
    });

    // Verify entry exists
    assert(store.getAll().length === 1, 'Should have 1 entry');

    // Prune with 0 days (should remove everything)
    const pruned = store.prune(0);
    assert(pruned === 1, `Should prune 1 entry, got ${pruned}`);
    assert(store.getAll().length === 0, 'Should have 0 entries after prune');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Memory pruning', passed: true, detail: `Pruned ${pruned} entries` });
  } catch (e: any) {
    results.push({ name: 'Memory pruning', passed: false, detail: e.message });
  }

  // Test 7: Multiple error categories
  try {
    const patterns = new FixPatterns();

    const categories = [
      { error: "Cannot find module 'x'", expected: 'module-resolution' },
      { error: "Property 'y' does not exist on type 'Z'", expected: 'typescript-error' },
      { error: "Type 'A' is not assignable to type 'B'", expected: 'type-mismatch' },
      { error: "relative import './file' needs explicit file extension", expected: 'module-resolution' },
    ];

    let allMatch = true;
    for (const { error, expected } of categories) {
      const match = patterns.match(error);
      if (!match || match.errorCategory !== expected) {
        allMatch = false;
        break;
      }
    }

    assert(allMatch, 'All error categories should match correctly');

    results.push({ name: 'Multiple error categories', passed: true, detail: `${categories.length} categories tested` });
  } catch (e: any) {
    results.push({ name: 'Multiple error categories', passed: false, detail: e.message });
  }

  return results;
}

async function main() {
  console.log('=== Failure Knowledge Base Verification ===\n');

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
