import { describe, it, expect } from 'vitest';
import { ValidationPipeline, createValidationPipeline } from '../src/orchestration/validation-pipeline.js';
import type { Artifact, StageResult } from '../src/orchestration/types.js';

function makeResult(artifacts: Record<string, unknown> = {}): StageResult {
  return { success: true, artifacts, warnings: [], durationMs: 100, llmCalls: 1, tokensUsed: 500 };
}

function makeArtifact(key: string, content: string): Artifact {
  return { key, content, type: 'json' as const, producedBy: 'test', createdAt: new Date().toISOString(), version: 1, hash: '' };
}

describe('ValidationPipeline', () => {
  it('should create pipeline with defaults', () => {
    const pipeline = new ValidationPipeline();
    const report = pipeline.validate('test', makeResult({ test: 'data' }), new Map());
    expect(report.stageId).toBe('test');
    expect(report.overallPassed).toBe(true);
    expect(report.tiers.length).toBeGreaterThan(0);
  });

  it('should pass valid artifacts', () => {
    const pipeline = new ValidationPipeline();
    const result = makeResult({ 'research.domain': { name: 'test', description: 'valid content' } });
    const report = pipeline.validate('research', result, new Map());
    expect(report.overallPassed).toBe(true);
  });

  it('should detect empty content', () => {
    const pipeline = new ValidationPipeline();
    const result = makeResult({ 'test.key': '' });
    const report = pipeline.validate('test', result, new Map());
    expect(report.totalErrors).toBeGreaterThan(0);
  });

  it('should detect placeholders', () => {
    const pipeline = new ValidationPipeline();
    const result = makeResult({ 'test.key': 'This is a TODO item' });
    const report = pipeline.validate('test', result, new Map());
    expect(report.totalWarnings).toBeGreaterThan(0);
  });

  it('should support custom cross-stage rules', () => {
    const pipeline = new ValidationPipeline();
    pipeline.addCrossStageRule({
      id: 'custom', description: 'test', sourceStage: 'src', targetStage: 'tgt',
      validator: () => ({ valid: true, errors: [], warnings: ['custom warning'] }),
    });
    expect(pipeline.getRules().crossStage.length).toBeGreaterThan(0);
  });

  it('should support custom quality rules', () => {
    const pipeline = new ValidationPipeline();
    pipeline.addQualityRule({
      id: 'custom-q', description: 'test', artifactKeys: ['test'],
      validator: () => ({ valid: true, errors: [], warnings: [] }), severity: 'warning',
    });
    expect(pipeline.getRules().quality.length).toBeGreaterThan(0);
  });

  it('should create via factory', () => {
    const pipeline = createValidationPipeline();
    expect(pipeline).toBeInstanceOf(ValidationPipeline);
  });
});
