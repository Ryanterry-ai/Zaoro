/**
 * Validation Runner: "Build Hospital ERP"
 *
 * REPEATABLE EXECUTION SCRIPT
 * ==========================
 * 1. Set WORKSPACE_ROOT in env or edit below
 * 2. `npx tsx scripts/validate-hospital-erp.ts`
 * 3. Inspect output in validation-output/<timestamp>/
 *
 * Metrics captured: start time, end time, LLM/model, execution log,
 * generated artifacts, screenshots, final report, failures, improvements.
 */

import { DeterministicOrchestratorV4 } from '../src/agents/deterministic-orchestrator-v4.js';
import type { GenerationIntent } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT = `Build a comprehensive Hospital ERP system for a 200-bed multi-specialty hospital. Modules: patient management (registration, demographics, insurance verification, medical history), appointment scheduling (multi-department, multi-provider calendar, waitlist), clinical/EHR (electronic health records, clinical notes, lab orders, radiology, e-prescribing), billing & claims (insurance claims, payment processing, denial management, patient billing), pharmacy (inventory, dispensing, formulary management), inventory (medical supplies, equipment tracking, reorder management), HR/payroll (staff management, scheduling, attendance, payroll), financials (GL, AP, AR, budgeting), compliance (HIPAA, audit trails, role-based access control, consent management), reporting & analytics (operational dashboards, clinical outcomes, financial reports, regulatory compliance). Target: 200-bed multi-specialty hospital with 500+ staff and 50+ doctors.`;

const WORKSPACE_BASE = path.resolve('./sandbox_workspaces');

// ─── Checklist Header ──────────────────────────────────────────────────────────
// CHECKLIST for every benchmark run:
// [ ] Record start time
// [ ] Record LLM/model used
// [ ] Run pipeline → capture execution log
// [ ] Inspect generated artifacts
// [ ] Capture screenshots (if dev server available)
// [ ] Generate final report
// [ ] Note any failures or manual intervention
// [ ] Identify improvements

async function main() {
  const startTime = new Date().toISOString();
  const startMs = Date.now();
  const timestamp = startTime.replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.resolve(`validation-output/${timestamp}--hospital-erp`);
  fs.mkdirSync(outputDir, { recursive: true });

  // ─── Log file ─────────────────────────────────────────────────────────────
  const logFile = path.join(outputDir, 'execution.log');
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(logFile, line + '\n');
  };

  log('=== VALIDATION RUN: Build Hospital ERP ===');
  log(`Start time: ${startTime}`);
  log(`LLM/Model: NONE (deterministic pipeline — zero LLM API calls)`);
  log(`Pipeline mode: deterministic (BRE v2 + renderer + self-healing)`);
  log(`Output directory: ${outputDir}`);

  // ─── Clean workspace ──────────────────────────────────────────────────────
  if (fs.existsSync(WORKSPACE_BASE)) {
    fs.rmSync(WORKSPACE_BASE, { recursive: true, force: true });
    log('Cleaned previous workspace');
  }

  const orchestrator = new DeterministicOrchestratorV4(WORKSPACE_BASE);

  const intent: GenerationIntent = {
    type: 'build-app',
    prompt: PROMPT,
  };

  // ─── Execution Phase ──────────────────────────────────────────────────────
  log('Starting pipeline execution...');
  let result;
  try {
    result = await orchestrator.processGenerationIntent('hospital-erp-001', intent);
    const endMs = Date.now();
    const durationSec = ((endMs - startMs) / 1000).toFixed(1);
    log(`Pipeline completed in ${durationSec}s`);
    log(`Success: ${result.success}`);
    log(`Duration: ${result.duration}ms`);
  } catch (err: any) {
    const endMs = Date.now();
    const durationSec = ((endMs - startMs) / 1000).toFixed(1);
    log(`Pipeline CRASHED after ${durationSec}s: ${err.message}`);
    log(`Stack: ${err.stack}`);
    // Write crash report
    fs.writeFileSync(
      path.join(outputDir, 'CRASH.json'),
      JSON.stringify({ error: err.message, stack: err.stack, startTime, endTime: new Date().toISOString() }, null, 2),
    );
    process.exit(1);
  }

  // ─── Artifact Inspection ──────────────────────────────────────────────────
  log('Inspecting generated artifacts...');

  const workspacePath = path.join(WORKSPACE_BASE, 'hospital-erp-001');
  const generatedFiles: string[] = [];

  if (fs.existsSync(workspacePath)) {
    const walkDir = (dir: string, prefix: string = '') => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) walkDir(path.join(dir, entry.name), rel);
        else generatedFiles.push(rel);
      }
    };
    walkDir(workspacePath);
  }

  log(`Total generated files: ${generatedFiles.length}`);

  // Save generated file listing
  fs.writeFileSync(
    path.join(outputDir, 'generated-files.json'),
    JSON.stringify({ count: generatedFiles.length, files: generatedFiles }, null, 2),
  );

  // ─── Extract key artifacts ──────────────────────────────────────────────────
  const buildReportPath = path.join(workspacePath, '.build-report.json');
  let buildReport: any = null;
  if (fs.existsSync(buildReportPath)) {
    buildReport = JSON.parse(fs.readFileSync(buildReportPath, 'utf-8'));
    log(`Build report found: ${buildReport.files?.total ?? 0} files, ${buildReport.pages?.length ?? 0} pages`);
    fs.writeFileSync(
      path.join(outputDir, 'build-report.json'),
      JSON.stringify(buildReport, null, 2),
    );
  }

  const planInspectPath = path.join(workspacePath, '.plan-inspect.json');
  let planInspect: any = null;
  if (fs.existsSync(planInspectPath)) {
    planInspect = JSON.parse(fs.readFileSync(planInspectPath, 'utf-8'));
    log(`Plan inspect found: ${planInspect.blueprint?.pages ?? 0} pages, ${planInspect.blueprint?.entities ?? 0} entities`);
    fs.writeFileSync(
      path.join(outputDir, 'plan-inspect.json'),
      JSON.stringify(planInspect, null, 2),
    );
  }

  // ─── Count by file type ────────────────────────────────────────────────────
  const extCounts: Record<string, number> = {};
  for (const f of generatedFiles) {
    const ext = path.extname(f) || 'unknown';
    extCounts[ext] = (extCounts[ext] || 0) + 1;
  }
  log(`Files by type: ${JSON.stringify(extCounts)}`);

  // ─── Check for build artifacts directory ────────────────────────────────────
  const artifactsDir = path.join(workspacePath, '.build-artifacts');
  let artifactFiles: string[] = [];
  if (fs.existsSync(artifactsDir)) {
    artifactFiles = fs.readdirSync(artifactsDir);
    log(`Build artifacts directory: ${artifactFiles.length} files`);
    fs.writeFileSync(
      path.join(outputDir, 'artifact-index.json'),
      JSON.stringify(artifactFiles, null, 2),
    );
  } else {
    log('No .build-artifacts directory found');
  }

  // ─── End time ──────────────────────────────────────────────────────────────
  const endTime = new Date().toISOString();
  const totalDurationMs = Date.now() - startMs;

  // ─── Final Report ──────────────────────────────────────────────────────────
  const pages = buildReport?.pages ?? planInspect?.blueprint?.pages ?? 0;
  const entities = buildReport?.blueprint?.entitiesCount ?? planInspect?.blueprint?.entities ?? 0;
  const warnings = result.warnings ?? buildReport?.warnings ?? [];

  const report = {
    run: {
      timestamp,
      startTime,
      endTime,
      durationMs: totalDurationMs,
      durationSec: (totalDurationMs / 1000).toFixed(1),
    },
    system: {
      llmModel: 'NONE (deterministic)',
      llmCalls: 0,
      pipelineMode: 'deterministic (BRE v2 + renderer + self-healing)',
      platform: 'react',
    },
    result: {
      success: result.success,
      error: result.error ?? null,
      warnings: warnings.length > 0 ? warnings : null,
    },
    blueprint: {
      pages,
      entities,
      dataModels: buildReport?.blueprint?.dataModelsCount ?? planInspect?.blueprint?.database?.tables ?? 0,
      apis: buildReport?.blueprint?.apisCount ?? planInspect?.blueprint?.apis ?? 0,
      workflows: buildReport?.blueprint?.workflowsCount ?? planInspect?.blueprint?.workflows ?? 0,
    },
    files: {
      total: generatedFiles.length,
      byType: extCounts,
    },
    failures: [] as string[],
    improvements: [] as string[],
  };

  // ─── Identify failures / manual interventions ──────────────────────────────
  if (!result.success) {
    report.failures.push(`Pipeline reported failure: ${result.error}`);
  }
  if (result.warnings && result.warnings.length > 0) {
    for (const w of result.warnings) {
      report.failures.push(`Warning: ${w}`);
    }
  }
  if (pages === 0) {
    report.failures.push('No pages generated');
  }
  if (generatedFiles.length === 0) {
    report.failures.push('No files generated in workspace');
  }

  // ─── Identify improvements ────────────────────────────────────────────────
  if (entities === 0) {
    report.improvements.push('Zero entities detected — BRE v2 entity detection may need tuning for compound ERP prompt');
  }
  if (pages === 0) {
    report.improvements.push('Zero pages generated — verify execution blueprint pipeline');
  }
  if (result.error && result.error.includes('page')) {
    report.improvements.push('Some pages failed to render — investigate renderer edge cases');
  }
  if (generatedFiles.length > 0 && !fs.existsSync(path.join(workspacePath, 'src/app/page.tsx'))) {
    report.improvements.push('No main page.tsx found — app shell may be missing');
  }

  // ─── Write final report ────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(outputDir, 'validation-report.json'),
    JSON.stringify(report, null, 2),
  );

  // Human-readable summary
  const summaryLines = [
    '# Validation Report: Build Hospital ERP',
    '',
    '## Run Metadata',
    `- **Timestamp**: ${timestamp}`,
    `- **Start**: ${startTime}`,
    `- **End**: ${endTime}`,
    `- **Duration**: ${report.run.durationSec}s`,
    `- **LLM/Model**: ${report.system.llmModel}`,
    `- **Pipeline Mode**: ${report.system.pipelineMode}`,
    '',
    '## Result',
    `- **Success**: ${result.success}`,
    result.error ? `- **Error**: ${result.error}` : '',
    warnings.length > 0 ? `- **Warnings**: ${warnings.join('; ')}` : '',
    '',
    '## Blueprint',
    `- **Pages**: ${report.blueprint.pages}`,
    `- **Entities**: ${report.blueprint.entities}`,
    `- **Data Models**: ${report.blueprint.dataModels}`,
    `- **APIs**: ${report.blueprint.apis}`,
    `- **Workflows**: ${report.blueprint.workflows}`,
    '',
    '## Generated Files',
    `- **Total**: ${report.files.total}`,
    `- **By Type**: ${JSON.stringify(report.files.byType, null, 2)}`,
    '',
    '## Failures / Manual Interventions',
    ...(report.failures.length > 0 ? report.failures.map(f => `- ${f}`) : ['- None']),
    '',
    '## Improvements Identified',
    ...(report.improvements.length > 0 ? report.improvements.map(i => `- ${i}`) : ['- None identified']),
    '',
    '## Output Directory',
    `- \`${outputDir}\``,
    '',
    '## Checklist',
    '- [x] Record start time',
    '- [x] Record LLM/model used',
    '- [x] Run pipeline → capture execution log',
    '- [x] Inspect generated artifacts',
    '- [ ] Capture screenshots (requires dev server)',
    '- [x] Generate final report',
    `- [${report.failures.length > 0 ? ' ' : 'x'}] Note failures or manual intervention`,
    '- [x] Identify improvements',
    '',
  ];

  fs.writeFileSync(path.join(outputDir, 'validation-report.md'), summaryLines.filter(l => l !== '').join('\n'));

  log('=== VALIDATION COMPLETE ===');
  log(`Report written to: ${path.join(outputDir, 'validation-report.md')}`);
  log(`Duration: ${report.run.durationSec}s`);
  log(`Success: ${result.success}`);

  // Print to stdout for capture
  console.log('\n' + summaryLines.filter(l => l !== '').join('\n'));
}

main().catch(err => {
  console.error('Validation runner crashed:', err);
  process.exit(1);
});
