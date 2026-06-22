#!/usr/bin/env npx tsx
/**
 * verify-persistence.ts — Platform persistence contract verification
 *
 * Verifies persistence module exports and graceful degradation
 * when DATABASE_URL is not configured (no live DB required).
 */

import {
  isPersistenceAvailable,
  checkDatabaseConnection,
  getOrCreateUser,
  createProject,
  getProject,
  createBuild,
  updateBuild,
  getBuilds,
  upsertWorkspace,
  getWorkspace,
  setWorkspaceFile,
  createMessage,
  getMessages,
} from '../src/core/persistence.js';

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

async function assertRejects(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    assert(false, `${label} — expected rejection`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    assert(message.includes('not configured') || message.includes('DATABASE_URL'), label);
  }
}

// Ensure no database URL for graceful degradation tests
const savedPlatformUrl = process.env.PLATFORM_DATABASE_URL;
const savedDatabaseUrl = process.env.DATABASE_URL;
delete process.env.PLATFORM_DATABASE_URL;
delete process.env.DATABASE_URL;

section('1. Module exports');

assert(typeof isPersistenceAvailable === 'function', 'isPersistenceAvailable is exported');
assert(typeof checkDatabaseConnection === 'function', 'checkDatabaseConnection is exported');
assert(typeof getOrCreateUser === 'function', 'getOrCreateUser is exported');
assert(typeof createProject === 'function', 'createProject is exported');
assert(typeof getProject === 'function', 'getProject is exported');
assert(typeof createBuild === 'function', 'createBuild is exported');
assert(typeof updateBuild === 'function', 'updateBuild is exported');
assert(typeof getBuilds === 'function', 'getBuilds is exported');
assert(typeof upsertWorkspace === 'function', 'upsertWorkspace is exported');
assert(typeof getWorkspace === 'function', 'getWorkspace is exported');
assert(typeof setWorkspaceFile === 'function', 'setWorkspaceFile is exported');
assert(typeof createMessage === 'function', 'createMessage is exported');
assert(typeof getMessages === 'function', 'getMessages is exported');

section('2. Graceful degradation without DATABASE_URL');

assert(isPersistenceAvailable() === false, 'isPersistenceAvailable() returns false without env');

const connected = await checkDatabaseConnection();
assert(connected === false, 'checkDatabaseConnection() returns false without env');

await assertRejects(
  () => getOrCreateUser('test@example.com'),
  'getOrCreateUser rejects when DB not configured',
);
await assertRejects(
  () => createProject('user-1', 'Test', 'Build an app'),
  'createProject rejects when DB not configured',
);
await assertRejects(
  () => createBuild('project-1', 'Build an app'),
  'createBuild rejects when DB not configured',
);
await assertRejects(
  () => upsertWorkspace('project-1', { 'src/app/page.tsx': 'export default function Home() {}' }),
  'upsertWorkspace rejects when DB not configured',
);
await assertRejects(
  () => createMessage('project-1', 'user', 'Hello'),
  'createMessage rejects when DB not configured',
);

section('3. Prisma schema contract (static)');

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '..', 'prisma', 'platform.prisma');
const schema = fs.readFileSync(schemaPath, 'utf-8');

assert(schema.includes('model User'), 'Schema defines User model');
assert(schema.includes('model Project'), 'Schema defines Project model');
assert(schema.includes('model Build'), 'Schema defines Build model');
assert(schema.includes('model Workspace'), 'Schema defines Workspace model');
assert(schema.includes('model Message'), 'Schema defines Message model');
assert(schema.includes('provider = "postgresql"'), 'Schema uses PostgreSQL provider');

// Restore env vars
if (savedPlatformUrl !== undefined) process.env.PLATFORM_DATABASE_URL = savedPlatformUrl;
if (savedDatabaseUrl !== undefined) process.env.DATABASE_URL = savedDatabaseUrl;

section('Summary');

console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

if (failed > 0) {
  console.error('✗ Persistence verification failed.\n');
  process.exit(1);
}

console.log('✓ All persistence verification checks passed.\n');
process.exit(0);
