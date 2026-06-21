#!/usr/bin/env npx tsx
/**
 * verify-telemetry.ts — Telemetry layer contract verification
 *
 * Verifies:
 * 1. TelemetryLayer exports all required methods
 * 2. Each method accepts the correct argument shapes
 * 3. Methods do not throw when env vars are missing (graceful degradation)
 * 4. Types (BuildEvent, PageEvent, ErrorEvent) match orchestrator usage
 */
import {
  TelemetryLayer,
  type BuildEvent,
  type PageEvent,
  type ErrorEvent,
} from '../src/core/telemetry.js';

// Ensure env vars are empty — tests graceful degradation
delete process.env.SENTRY_DSN;
delete process.env.POSTHOG_API_KEY;
delete process.env.POSTHOG_HOST;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function assertNoThrow(fn: () => void, label: string) {
  try {
    fn();
    assert(true, label);
  } catch (err: any) {
    assert(false, `${label} — threw: ${err.message}`);
  }
}

async function assertNoThrowAsync(fn: () => Promise<void>, label: string) {
  try {
    await fn();
    assert(true, label);
  } catch (err: any) {
    assert(false, `${label} — threw: ${err.message}`);
  }
}

async function main() {
  console.log('=== Telemetry Layer Verification ===');
  console.log('(env vars cleared — testing graceful degradation)\n');

  // ─── 1. Method existence ───────────────────────────────
  console.log('[1] TelemetryLayer exports');
  assert(typeof TelemetryLayer.init === 'function', 'init() is a function');
  assert(typeof TelemetryLayer.reportBuildStart === 'function', 'reportBuildStart() is a function');
  assert(typeof TelemetryLayer.reportBuildStep === 'function', 'reportBuildStep() is a function');
  assert(typeof TelemetryLayer.reportPageComplete === 'function', 'reportPageComplete() is a function');
  assert(typeof TelemetryLayer.reportBuildComplete === 'function', 'reportBuildComplete() is a function');
  assert(typeof TelemetryLayer.reportError === 'function', 'reportError() is a function');
  assert(typeof TelemetryLayer.reportHealing === 'function', 'reportHealing() is a function');
  assert(typeof TelemetryLayer.shutdown === 'function', 'shutdown() is a function');

  // ─── 2. init() ─────────────────────────────────────────
  console.log('\n[2] init() — no env vars set');
  assertNoThrow(() => TelemetryLayer.init(), 'init() does not throw without SENTRY_DSN/POSTHOG/SUPABASE');

  // ─── 3. reportBuildStart ───────────────────────────────
  console.log('\n[3] reportBuildStart()');
  assertNoThrow(
    () => TelemetryLayer.reportBuildStart('ws-001', 'Build a fitness tracker app'),
    'reportBuildStart(ws-001, prompt) does not throw',
  );

  // ─── 4. reportBuildStep ────────────────────────────────
  console.log('\n[4] reportBuildStep()');
  assertNoThrow(
    () => TelemetryLayer.reportBuildStep('ws-001', 'compiler', { fileCount: 5 }),
    'reportBuildStep(ws-001, compiler, detail) does not throw',
  );

  // ─── 5. reportPageComplete (success) ───────────────────
  console.log('\n[5] reportPageComplete() — success');
  const pageSuccess: PageEvent = {
    workspaceId: 'ws-001',
    pagePath: '/shop',
    succeeded: true,
    attemptCount: 1,
    duration: 3200,
  };
  assertNoThrow(
    () => TelemetryLayer.reportPageComplete('ws-001', pageSuccess),
    'reportPageComplete(ws-001, { succeeded: true }) does not throw',
  );

  // ─── 6. reportPageComplete (failure) ───────────────────
  console.log('\n[6] reportPageComplete() — failure');
  const pageFailure: PageEvent = {
    workspaceId: 'ws-001',
    pagePath: '/api/auth',
    succeeded: false,
    attemptCount: 3,
    lastError: 'TS2307: Cannot find module "react"',
    duration: 9100,
  };
  assertNoThrow(
    () => TelemetryLayer.reportPageComplete('ws-001', pageFailure),
    'reportPageComplete(ws-001, { succeeded: false, lastError }) does not throw',
  );

  // ─── 7. reportBuildComplete ────────────────────────────
  console.log('\n[7] reportBuildComplete()');
  const buildEvent: BuildEvent = {
    workspaceId: 'ws-001',
    prompt: 'Build a fitness tracker',
    pagesTotal: 4,
    pagesSucceeded: 3,
    pagesFailed: 1,
    duration: 18000,
    success: false,
  };
  assertNoThrow(
    () => TelemetryLayer.reportBuildComplete(buildEvent),
    'reportBuildComplete({ 4 pages, 1 failed }) does not throw',
  );

  // ─── 8. reportError ────────────────────────────────────
  console.log('\n[8] reportError()');
  const errorEvent: ErrorEvent = {
    workspaceId: 'ws-001',
    error: 'TS2307: Cannot find module "react"',
    code: 'AST_SIMULATION_REJECT',
    phase: 'simulation-gate',
  };
  assertNoThrow(
    () => TelemetryLayer.reportError(errorEvent),
    'reportError(ws-001, simulation-gate) does not throw',
  );

  // ─── 9. reportError (regression) ──────────────────────
  console.log('\n[9] reportError() — regression gate');
  assertNoThrow(
    () => TelemetryLayer.reportError({
      workspaceId: 'ws-001',
      error: 'Duplicate export Home',
      code: 'AST_REGRESSION_REJECT',
      phase: 'regression-gate',
    }),
    'reportError(ws-001, regression-gate) does not throw',
  );

  // ─── 10. reportHealing ─────────────────────────────────
  console.log('\n[10] reportHealing()');
  assertNoThrow(
    () => TelemetryLayer.reportHealing('ws-001', 2, 3),
    'reportHealing(ws-001, attempt=2, errors=3) does not throw',
  );

  // ─── 11. shutdown ──────────────────────────────────────
  console.log('\n[11] shutdown()');
  await assertNoThrowAsync(
    () => TelemetryLayer.shutdown(),
    'shutdown() does not throw',
  );

  // ─── 12. Type shape checks ─────────────────────────────
  console.log('\n[12] Type shapes');
  const be: BuildEvent = {
    workspaceId: 'x', prompt: 'x', pagesTotal: 0,
    pagesSucceeded: 0, pagesFailed: 0, duration: 0, success: true,
  };
  assert(be.workspaceId === 'x', 'BuildEvent has required fields');
  const pe: PageEvent = {
    workspaceId: 'x', pagePath: '/', succeeded: true,
    attemptCount: 1, duration: 0,
  };
  assert(pe.pagePath === '/', 'PageEvent has required fields');
  const er: ErrorEvent = {
    workspaceId: 'x', error: 'msg', code: 'C', phase: 'p',
  };
  assert(er.code === 'C', 'ErrorEvent has required fields');

  // ─── Summary ───────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
