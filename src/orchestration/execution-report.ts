// ─── Execution Report Generator ─────────────────────────────────────────────

import { StageStatus } from './types.js';
import type {
  ExecutionReport,
  StageReport,
  CostSummary,
  ExperienceSummary,
  StageResult,
  ExecutionPlan,
  ProjectManifest,
} from './types.js';
import type { ValidationReport } from './validation-pipeline.js';
import type { PipelineProgress } from './progress-reporter.js';

export interface ReportOptions {
  includeValidationDetails?: boolean;
  costPer1kTokens?: number;
}

const DEFAULT_COST_PER_1K = 0.003;

export class ExecutionReportGenerator {
  private options: ReportOptions;

  constructor(options?: ReportOptions) {
    this.options = { includeValidationDetails: true, costPer1kTokens: DEFAULT_COST_PER_1K, ...options };
  }

  generate(
    plan: ExecutionPlan,
    manifest: ProjectManifest,
    stageResults: Map<string, StageResult>,
    validationReports: Map<string, ValidationReport>,
    progress: PipelineProgress,
  ): ExecutionReport {
    const stageReports: StageReport[] = [];
    let totalTokens = 0;
    let totalLlmCalls = 0;
    let totalDurationMs = 0;

    for (const [stageId, result] of stageResults) {
      totalTokens += result.tokensUsed;
      totalLlmCalls += result.llmCalls;
      totalDurationMs += result.durationMs;
      stageReports.push({
        stageId,
        status: result.success ? StageStatus.Completed : StageStatus.Failed,
        durationMs: result.durationMs,
        tokensUsed: result.tokensUsed,
        llmCalls: result.llmCalls,
        provider: undefined,
        model: undefined,
        artifacts: Object.keys(result.artifacts),
        errors: result.error ? [result.error] : [],
      });
    }

    const costSummary: CostSummary = {
      totalTokens,
      estimatedCostUsd: Math.round((totalTokens / 1000) * (this.options.costPer1kTokens ?? DEFAULT_COST_PER_1K) * 100) / 100,
      byProvider: {},
    };

    const successCount = stageReports.filter(s => s.status === StageStatus.Completed).length;
    const experienceSummary: ExperienceSummary = {
      totalExecutions: stageReports.length,
      successRate: stageReports.length > 0 ? successCount / stageReports.length : 0,
      avgDurationMs: stageReports.length > 0 ? totalDurationMs / stageReports.length : 0,
      topProviders: [],
    };

    return {
      executionId: plan.id,
      manifest,
      startedAt: progress.startedAt,
      completedAt: progress.updatedAt,
      durationMs: progress.updatedAt - progress.startedAt,
      success: progress.status === 'completed',
      stages: stageReports,
      costSummary,
      experienceSummary,
    };
  }

  generateMarkdown(report: ExecutionReport): string {
    const lines: string[] = [];
    lines.push(`# Pipeline Execution Report`);
    lines.push('');
    lines.push(`**Execution ID:** ${report.executionId}`);
    lines.push(`**Status:** ${report.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push(`**Duration:** ${Math.round(report.durationMs / 1000)}s`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Stages | ${report.experienceSummary.totalExecutions} |`);
    lines.push(`| Success Rate | ${Math.round(report.experienceSummary.successRate * 100)}% |`);
    lines.push(`| Avg Duration | ${Math.round(report.experienceSummary.avgDurationMs / 1000)}s |`);
    lines.push(`| Total Tokens | ${report.costSummary.totalTokens.toLocaleString()} |`);
    lines.push(`| Estimated Cost | $${report.costSummary.estimatedCostUsd.toFixed(2)} |`);
    lines.push('');
    lines.push(`## Stage Breakdown`);
    lines.push('');
    lines.push(`| Stage | Status | Duration | Tokens | LLM Calls |`);
    lines.push(`|-------|--------|----------|--------|-----------|`);
    for (const stage of report.stages) {
      lines.push(`| ${stage.stageId} | ${stage.status} | ${Math.round(stage.durationMs / 1000)}s | ${stage.tokensUsed.toLocaleString()} | ${stage.llmCalls} |`);
    }
    lines.push('');
    const errors = report.stages.filter(s => s.errors.length > 0);
    if (errors.length > 0) {
      lines.push(`## Errors`);
      lines.push('');
      for (const stage of errors) lines.push(`- **${stage.stageId}**: ${stage.errors.join(', ')}`);
    }
    return lines.join('\n');
  }
}

export function createExecutionReportGenerator(options?: ReportOptions): ExecutionReportGenerator {
  return new ExecutionReportGenerator(options);
}
