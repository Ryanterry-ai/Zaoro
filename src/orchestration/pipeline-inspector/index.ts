/**
 * Pipeline Inspector - Visual pipeline execution report
 *
 * Generates human-readable and machine-readable reports of pipeline execution.
 * This is the highest ROI observability feature.
 */

import type { RuntimeTrace, LayerExecutionRecord, TraceValidationResult } from '../runtime-trace/types.js';
import { validateTrace } from '../runtime-trace/types.js';

// ============================================================================
// PIPELINE INSPECTOR
// ============================================================================

/**
 * Generate a visual pipeline report
 */
export function generatePipelineReport(trace: RuntimeTrace): string {
  const validation = validateTrace(trace);
  const lines: string[] = [];

  // Header
  lines.push('═'.repeat(60));
  lines.push(`  BUILD #${trace.id}`);
  lines.push('═'.repeat(60));
  lines.push('');

  // Prompt
  lines.push('  PROMPT');
  lines.push('  ─'.repeat(30));
  lines.push(`  ${trace.prompt.substring(0, 100)}${trace.prompt.length > 100 ? '...' : ''}`);
  lines.push('');

  // Pipeline visualization
  lines.push('  PIPELINE');
  lines.push('  ─'.repeat(30));

  const layerOrder = [
    'business-intelligence',
    'knowledge-acquisition',
    'experience-intelligence',
    'design-intelligence',
    'content-intelligence',
    'technology-planner',
    'application-blueprint',
    'execution-blueprint',
    'renderer'
  ];

  const layerNames: Record<string, string> = {
    'business-intelligence': 'Business Intelligence',
    'knowledge-acquisition': 'Knowledge Acquisition',
    'experience-intelligence': 'Experience Intelligence',
    'design-intelligence': 'Design Intelligence',
    'content-intelligence': 'Content Intelligence',
    'technology-planner': 'Technology Planner',
    'application-blueprint': 'Application Blueprint',
    'execution-blueprint': 'Execution Blueprint',
    'renderer': 'Renderer'
  };

  const statusIcons: Record<string, string> = {
    'completed': '✅',
    'skipped': '⏭️',
    'failed': '❌',
    'placeholder': '⏳'
  };

  for (let i = 0; i < layerOrder.length; i++) {
    const layerName = layerOrder[i];
    const record = trace.layers.find(l => l.layer === layerName);
    const displayName = layerNames[layerName] ?? layerName;
    const icon = record ? statusIcons[record.status] ?? '❓' : '❓';
    const confidence = record ? `(${(record.confidence * 100).toFixed(0)}%)` : '(N/A)';
    const duration = record ? `${record.duration}ms` : '';

    lines.push(`  ${icon} ${displayName.padEnd(25)} ${confidence.padEnd(8)} ${duration}`);

    // Arrow between layers
    if (i < layerOrder.length - 1) {
      lines.push('  ↓');
    }
  }

  lines.push('');

  // Output
  lines.push('  OUTPUT');
  lines.push('  ─'.repeat(30));
  lines.push(`  Generated Files: ${trace.generatedFilesCount}`);
  lines.push(`  Total Duration:  ${trace.totalDuration}ms`);
  lines.push('');

  // Validation summary
  lines.push('  VALIDATION');
  lines.push('  ─'.repeat(30));
  lines.push(`  Status: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`  Layers: ${validation.summary.completedLayers}/${validation.summary.totalLayers} completed`);
  lines.push(`  Artifacts: ${validation.summary.artifactsPresent}/${validation.summary.artifactsPresent + validation.summary.artifactsMissing} present`);

  if (validation.issues.length > 0) {
    lines.push('');
    lines.push('  ISSUES');
    lines.push('  ─'.repeat(30));
    for (const issue of validation.issues) {
      const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${icon} [${issue.layer}] ${issue.message}`);
    }
  }

  lines.push('');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

/**
 * Generate a compact pipeline summary
 */
export function generateCompactReport(trace: RuntimeTrace): string {
  const validation = validateTrace(trace);
  const completedLayers = trace.layers.filter(l => l.status === 'completed').length;
  const totalLayers = 9;

  return `Build #${trace.id}: ${validation.valid ? '✅' : '❌'} ${completedLayers}/${totalLayers} layers | ${trace.generatedFilesCount} files | ${trace.totalDuration}ms`;
}

/**
 * Generate a detailed layer report
 */
export function generateLayerReport(record: LayerExecutionRecord): string {
  const lines: string[] = [];

  lines.push(`  LAYER: ${record.layer.toUpperCase()}`);
  lines.push('  ─'.repeat(30));
  lines.push(`  Status:     ${record.status}`);
  lines.push(`  Confidence: ${(record.confidence * 100).toFixed(1)}%`);
  lines.push(`  Duration:   ${record.duration}ms`);
  lines.push(`  Output:     ${record.output ?? 'None'}`);
  lines.push(`  Inputs:     ${record.inputs.join(', ') || 'None'}`);

  if (record.reasoning) {
    lines.push('');
    lines.push('  Reasoning:');
    lines.push(`    ${record.reasoning}`);
  }

  if (record.evidence.length > 0) {
    lines.push('');
    lines.push('  Evidence:');
    for (const evidence of record.evidence) {
      lines.push(`    - ${evidence}`);
    }
  }

  if (record.provenance.length > 0) {
    lines.push('');
    lines.push('  Provenance:');
    for (const prov of record.provenance) {
      lines.push(`    - ${prov.ruleId} (confidence: ${(prov.confidence * 100).toFixed(0)}%)`);
    }
  }

  if (record.tokenUsage) {
    lines.push('');
    lines.push('  Token Usage:');
    lines.push(`    Input:  ${record.tokenUsage.input}`);
    lines.push(`    Output: ${record.tokenUsage.output}`);
    lines.push(`    Total:  ${record.tokenUsage.total}`);
  }

  if (record.error) {
    lines.push('');
    lines.push(`  Error: ${record.error}`);
  }

  return lines.join('\n');
}

/**
 * Generate JSON report for programmatic access
 */
export function generateJSONReport(trace: RuntimeTrace): object {
  const validation = validateTrace(trace);

  return {
    build: {
      id: trace.id,
      prompt: trace.prompt,
      startTime: trace.startTime,
      endTime: trace.endTime,
      status: trace.status,
      duration: trace.totalDuration,
    },
    pipeline: trace.layers.map(record => ({
      layer: record.layer,
      status: record.status,
      confidence: record.confidence,
      duration: record.duration,
      output: record.output,
      inputs: record.inputs,
      reasoning: record.reasoning,
      evidence: record.evidence,
      provenance: record.provenance,
      tokenUsage: record.tokenUsage,
      error: record.error,
    })),
    artifacts: {
      businessKnowledge: !!trace.businessKnowledge,
      evidenceCollection: !!trace.evidenceCollection,
      experienceBlueprint: !!trace.experienceBlueprint,
      contentBlueprint: !!trace.contentBlueprint,
      designDecision: !!trace.designDecision,
      solutionArchitecture: !!trace.solutionArchitecture,
      applicationBlueprint: !!trace.applicationBlueprint,
      executionBlueprint: !!trace.executionBlueprint,
      rendererOutput: !!trace.rendererOutput,
    },
    validation: {
      valid: validation.valid,
      summary: validation.summary,
      issues: validation.issues,
    },
    metadata: {
      generatedFilesCount: trace.generatedFilesCount,
      pipelineVersion: trace.pipelineVersion,
      environment: trace.environment,
    },
  };
}
