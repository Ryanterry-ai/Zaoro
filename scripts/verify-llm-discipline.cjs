#!/usr/bin/env node
/**
 * scripts/verify-llm-discipline.js
 *
 * Reads a build's logs/llm-calls.jsonl (written by skills/_adapter/index.js)
 * and fails the process (non-zero exit) if the build violated any of the
 * LLM-discipline rules from the remediation prompt:
 *
 *   1. Every taskType used must be registered in skills/_adapter's TASK_TYPES.
 *   2. No call may originate from a Bucket A skill/tool (those must never
 *      touch the adapter at all).
 *   3. Single-unit task types (component-spec, content-generation,
 *      code-generation) may not be logged as covering more than one
 *      page/component in a single call.
 *   4. Total call count must stay under the configured budget ceiling
 *      (soft cap by default, hard cap with --strict).
 *   5. No call may be marked `repaired: true` more than --max-repairs
 *      times in one build (repeated silent repairs usually mean the
 *      prompt/schema is wrong, not the model).
 *
 * Usage:
 *   node scripts/verify-llm-discipline.js [path/to/llm-calls.jsonl]
 *   node scripts/verify-llm-discipline.js logs/llm-calls.jsonl --strict
 *   node scripts/verify-llm-discipline.js logs/llm-calls.jsonl --budget=60
 *
 * Exit codes:
 *   0  — clean, no violations (soft-cap warnings allowed unless --strict)
 *   1  — one or more hard violations found, or the log file is missing/empty
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_LOG_PATH = path.join('logs', 'llm-calls.jsonl');
const DEFAULT_BUDGET = 80; // generous soft ceiling; tune per project size
const DEFAULT_MAX_REPAIRS = 3;

// Bucket A skills and tools — these must NEVER appear as `callingSkill`.
// Keep this list in sync with the remediation prompt's Bucket A inventory.
const BUCKET_A_NAMES = new Set([
  // skills/
  'orchestrator',
  'build-orchestrator',
  'skill-integrator',
  'crawl-site',
  'extract-design-tokens',
  'localize-assets',
  'deploy-target-selector',
  'state-weaver',
  // tools/
  'crawler',
  'token-extractor',
  'asset-downloader',
  'screenshot-diff',
  'schema-codegen',
  'deploy-codegen',
  'quality-gate',
  'dependency-checker',
  'content-validator',
  'audit-log',
  'audit-check',
]);

// Task types that represent exactly one unit of work per call (one page,
// one component, one data type). A call logged against one of these with
// more than one unit in its context is a scope violation.
const SINGLE_UNIT_TASK_TYPES = new Set([
  'component-spec',
  'content-generation',
  'code-generation',
]);

// Task types that are inherently one-call-per-build (allowed to cover
// "all pages" conceptually because they produce one shared artifact, not
// per-page output).
const PER_BUILD_TASK_TYPES = new Set([
  'design-synthesis',
  'sitemap-planning',
  'structured-extraction',
]);

// ---------------------------------------------------------------------------
// Load the adapter's TASK_TYPES if it exists, so this script can't silently
// drift from the source of truth. Falls back to a hardcoded mirror if the
// adapter hasn't been built yet (e.g. running this script during setup).
// ---------------------------------------------------------------------------

function loadKnownTaskTypes() {
  const candidatePaths = [
    path.join(process.cwd(), 'skills', '_adapter', 'index.js'),
    path.join(__dirname, '..', 'skills', '_adapter', 'index.js'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const adapter = require(p);
        if (adapter && adapter.TASK_TYPES) {
          return {
            values: new Set(Object.values(adapter.TASK_TYPES)),
            source: p,
          };
        }
      } catch (err) {
        console.warn(
          `[verify-llm-discipline] Found adapter at ${p} but failed to ` +
            `load TASK_TYPES (${err.message}). Falling back to hardcoded list.`
        );
      }
    }
  }

  // Hardcoded fallback — must mirror skills/_adapter/index.js exactly.
  return {
    values: new Set([
      'structured-extraction',
      'design-synthesis',
      'sitemap-planning',
      'component-spec',
      'content-generation',
      'code-generation',
      'merge-resolution',
      'error-triage',
      'knowledge-base-seed',
    ]),
    source: '(hardcoded fallback — skills/_adapter/index.js not found)',
  };
}

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { strict: false, budget: DEFAULT_BUDGET, maxRepairs: DEFAULT_MAX_REPAIRS };
  const positional = [];

  for (const raw of argv) {
    if (raw === '--strict') {
      args.strict = true;
    } else if (raw.startsWith('--budget=')) {
      args.budget = parseInt(raw.split('=')[1], 10);
    } else if (raw.startsWith('--max-repairs=')) {
      args.maxRepairs = parseInt(raw.split('=')[1], 10);
    } else if (!raw.startsWith('--')) {
      positional.push(raw);
    }
  }

  args.logPath = positional[0] || DEFAULT_LOG_PATH;
  return args;
}

// ---------------------------------------------------------------------------
// Log loading
// ---------------------------------------------------------------------------

function loadEntries(logPath) {
  if (!fs.existsSync(logPath)) {
    throw new Error(`Log file not found: ${logPath}`);
  }

  const raw = fs.readFileSync(logPath, 'utf8').trim();
  if (!raw) {
    throw new Error(`Log file is empty: ${logPath}`);
  }

  const lines = raw.split('\n').filter(Boolean);
  const entries = [];
  const parseErrors = [];

  lines.forEach((line, i) => {
    try {
      entries.push(JSON.parse(line));
    } catch (err) {
      parseErrors.push({ lineNumber: i + 1, line, error: err.message });
    }
  });

  return { entries, parseErrors };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = [
  'taskType',
  'callingSkill',
  'provider',
  'model',
  'startedAt',
  'durationMs',
];

function countUnits(entry) {
  // The adapter is expected to log how many distinct pages/components a
  // call covered, under one of these context keys. Anything missing is
  // treated conservatively as 1 (can't prove a violation without evidence,
  // but missing unit-count metadata is itself reported as a warning).
  const ctx = entry.context || {};
  if (Array.isArray(ctx.units)) return { count: ctx.units.length, known: true };
  if (typeof ctx.unitCount === 'number') return { count: ctx.unitCount, known: true };
  if (Array.isArray(ctx.pages)) return { count: ctx.pages.length, known: true };
  if (Array.isArray(ctx.components)) return { count: ctx.components.length, known: true };
  return { count: 1, known: false };
}

function validate(entries, knownTaskTypes, args) {
  const violations = []; // hard failures -> exit 1
  const warnings = []; // soft issues -> printed, don't fail unless --strict

  entries.forEach((entry, i) => {
    const where = `entry #${i + 1}`;

    // Required fields present
    for (const field of REQUIRED_FIELDS) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        violations.push(`${where}: missing required field "${field}"`);
      }
    }

    if (!entry.taskType) return; // can't run remaining checks meaningfully

    // 1. Registered taskType
    if (!knownTaskTypes.values.has(entry.taskType)) {
      violations.push(
        `${where}: unregistered taskType "${entry.taskType}" (callingSkill: ${entry.callingSkill || 'unknown'}). ` +
          `Add it to skills/_adapter/index.js's TASK_TYPES before using it.`
      );
    }

    // 2. Bucket A skill must never call the adapter
    if (entry.callingSkill && BUCKET_A_NAMES.has(entry.callingSkill)) {
      violations.push(
        `${where}: Bucket A skill/tool "${entry.callingSkill}" made an LLM call ` +
          `(taskType: ${entry.taskType}). Bucket A must be pure deterministic code.`
      );
    }

    // 3. Single-unit task types may not cover >1 page/component
    if (SINGLE_UNIT_TASK_TYPES.has(entry.taskType)) {
      const { count, known } = countUnits(entry);
      if (known && count > 1) {
        violations.push(
          `${where}: taskType "${entry.taskType}" (single-unit) covered ${count} ` +
            `units in one call (callingSkill: ${entry.callingSkill}). This violates ` +
            `the "one component/page per call" rule.`
        );
      } else if (!known) {
        warnings.push(
          `${where}: taskType "${entry.taskType}" has no unit-count metadata in ` +
            `context (units/unitCount/pages/components) — cannot verify scope. ` +
            `Add unit-count logging to skills/_adapter for full auditability.`
        );
      }
    }

    // 5. Repeated repairs on the same call type may indicate a broken
    // prompt/schema rather than a flaky model — tracked, not failed here
    // individually; aggregate check happens after the loop.
  });

  // Aggregate: repeated repairs
  const repairedCount = entries.filter((e) => e.repaired === true).length;
  if (repairedCount > args.maxRepairs) {
    const msg =
      `Total repaired calls (${repairedCount}) exceeds --max-repairs (${args.maxRepairs}). ` +
      `Repeated JSON repair usually means a prompt/schema problem, not transient model noise.`;
    if (args.strict) violations.push(msg);
    else warnings.push(msg);
  }

  // Aggregate: total call budget
  if (entries.length > args.budget) {
    const msg = `Total LLM call count (${entries.length}) exceeds budget (${args.budget}).`;
    if (args.strict) violations.push(msg);
    else warnings.push(msg);
  }

  return { violations, warnings };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function buildSummaryTable(entries) {
  const counts = new Map();
  for (const e of entries) {
    const key = e.taskType || '(missing taskType)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const taskTypeWidth = Math.max(8, ...rows.map(([t]) => t.length));

  let out = '';
  out += `${'taskType'.padEnd(taskTypeWidth)}  count\n`;
  out += `${'-'.repeat(taskTypeWidth)}  -----\n`;
  for (const [taskType, count] of rows) {
    out += `${taskType.padEnd(taskTypeWidth)}  ${String(count).padStart(5)}\n`;
  }
  out += `${'-'.repeat(taskTypeWidth)}  -----\n`;
  out += `${'TOTAL'.padEnd(taskTypeWidth)}  ${String(entries.length).padStart(5)}\n`;
  return out;
}

function buildSkillTable(entries) {
  const counts = new Map();
  for (const e of entries) {
    const key = e.callingSkill || '(missing callingSkill)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const skillWidth = Math.max(12, ...rows.map(([s]) => s.length));

  let out = '';
  out += `${'callingSkill'.padEnd(skillWidth)}  count\n`;
  out += `${'-'.repeat(skillWidth)}  -----\n`;
  for (const [skill, count] of rows) {
    const flag = BUCKET_A_NAMES.has(skill) ? '  <-- BUCKET A VIOLATION' : '';
    out += `${skill.padEnd(skillWidth)}  ${String(count).padStart(5)}${flag}\n`;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('='.repeat(70));
  console.log('verify-llm-discipline');
  console.log('='.repeat(70));
  console.log(`Log file:     ${args.logPath}`);
  console.log(`Strict mode:  ${args.strict}`);
  console.log(`Call budget:  ${args.budget}`);
  console.log(`Max repairs:  ${args.maxRepairs}`);
  console.log('');

  let entries, parseErrors;
  try {
    ({ entries, parseErrors } = loadEntries(args.logPath));
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }

  if (parseErrors.length > 0) {
    console.error(`FAIL: ${parseErrors.length} unparseable line(s) in log file:`);
    for (const pe of parseErrors) {
      console.error(`  line ${pe.lineNumber}: ${pe.error}`);
    }
    process.exit(1);
  }

  const knownTaskTypes = loadKnownTaskTypes();
  console.log(`TASK_TYPES source: ${knownTaskTypes.source}`);
  console.log('');

  const { violations, warnings } = validate(entries, knownTaskTypes, args);

  console.log('--- Calls by taskType ---');
  console.log(buildSummaryTable(entries));

  console.log('--- Calls by callingSkill ---');
  console.log(buildSkillTable(entries));

  if (warnings.length > 0) {
    console.log(`--- Warnings (${warnings.length}) ---`);
    warnings.forEach((w) => console.log(`  WARN: ${w}`));
    console.log('');
  }

  if (violations.length > 0) {
    console.log(`--- Violations (${violations.length}) ---`);
    violations.forEach((v) => console.log(`  FAIL: ${v}`));
    console.log('');
    console.log(`RESULT: FAIL (${violations.length} violation(s))`);
    process.exit(1);
  }

  console.log(`RESULT: PASS (${entries.length} total calls, 0 violations` +
    `${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ''})`);
  process.exit(0);
}

main();