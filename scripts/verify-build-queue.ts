#!/usr/bin/env npx tsx
/**
 * verify-build-queue.ts — BuildQueue contract verification
 *
 * Verifies queue mechanics without running full LLM builds:
 * - Class exports and config defaults
 * - Enqueue job shape and event emission
 * - Priority ordering in queue
 * - getJob / getStatus / getDetailedStatus
 * - destroy() cleanup
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BuildQueue, type BuildJob } from '../src/engine/build-queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function section(name: string) {
  console.log(`\n═══ ${name} ═══`);
}

const tmpBase = path.join(os.tmpdir(), `verify-queue-${Date.now()}`);
fs.mkdirSync(tmpBase, { recursive: true });

section('1. BuildQueue exports and defaults');

assert(typeof BuildQueue === 'function', 'BuildQueue is a class');
const queue = new BuildQueue(tmpBase, { maxConcurrent: 1, jobTimeoutMs: 60000 });
assert(queue.getQueueSize() === 0, 'Initial queue size is 0');
assert(queue.getRunningCount() === 0, 'Initial running count is 0');

const initialStatus = queue.getStatus();
assert(initialStatus.queued === 0, 'Initial queued count is 0');
assert(initialStatus.running === 0, 'Initial running count is 0');
assert(initialStatus.completed === 0, 'Initial completed count is 0');

section('2. Enqueue job shape and events');

const enqueued: BuildJob[] = [];
queue.on('enqueued', (job) => enqueued.push(job));

const jobA = queue.enqueue({
  id: 'job-low',
  workspaceId: 'ws-low',
  prompt: 'Build a todo app',
  priority: 1,
});

assert(jobA.id === 'job-low', 'enqueue returns job with correct id');
assert(jobA.workspaceId === 'ws-low', 'enqueue returns job with correct workspaceId');
assert(jobA.status === 'running' || jobA.status === 'queued', 'enqueue job is queued or running');
assert(jobA.createdAt > 0, 'enqueue sets createdAt');
assert(jobA.retryCount === 0, 'enqueue sets retryCount to 0');
assert(enqueued.length === 1, 'enqueued event fires once');

section('3. Priority ordering');

const queueB = new BuildQueue(path.join(tmpBase, 'b'), { maxConcurrent: 1, jobTimeoutMs: 60000 });

queueB.enqueue({ id: 'low-1', workspaceId: 'ws-1', prompt: 'low priority', priority: 1 });
queueB.enqueue({ id: 'high-1', workspaceId: 'ws-2', prompt: 'high priority', priority: 100 });
queueB.enqueue({ id: 'low-2', workspaceId: 'ws-3', prompt: 'low priority 2', priority: 2 });

assert(queueB.getQueueSize() >= 1, 'At least one job remains queued with maxConcurrent=1');
const highJob = queueB.getJob('high-1');
assert(highJob !== undefined, 'High-priority job is tracked by getJob');

section('4. getJob and getDetailedStatus');

const found = queue.getJob('job-low');
assert(found !== undefined, 'getJob finds enqueued job');
assert(found?.prompt === 'Build a todo app', 'getJob returns correct prompt');

const detailed = queue.getDetailedStatus();
assert(typeof detailed.queued === 'number', 'getDetailedStatus returns queued count');
assert(typeof detailed.running === 'number', 'getDetailedStatus returns running count');
assert(Array.isArray(detailed.jobs), 'getDetailedStatus returns jobs array');
assert(detailed.jobs.some(j => j.id === 'job-low'), 'getDetailedStatus includes enqueued job');

section('5. Workspace directory creation');

const wsDir = path.join(tmpBase, 'ws-low');
assert(fs.existsSync(wsDir), 'enqueue creates workspace directory');
const progressFile = path.join(wsDir, '.progress');
assert(fs.existsSync(progressFile), 'enqueue initializes .progress file');

section('6. destroy() cleanup');

const queueC = new BuildQueue(path.join(tmpBase, 'c'), { maxConcurrent: 2, jobTimeoutMs: 60000 });
queueC.enqueue({ id: 'destroy-test', workspaceId: 'ws-destroy', prompt: 'test', priority: 5 });
try {
  queueC.destroy();
  assert(true, 'destroy() does not throw');
} catch {
  assert(false, 'destroy() does not throw');
}
assert(queueC.getRunningCount() === 0, 'destroy() clears running jobs');

queue.destroy();
queueB.destroy();

// Cleanup temp workspace
try { fs.rmSync(tmpBase, { recursive: true, force: true }); } catch {}

section('Summary');

console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

if (failed > 0) {
  console.error('✗ Build queue verification failed.\n');
  process.exit(1);
}

console.log('✓ All build queue verification checks passed.\n');
process.exit(0);
