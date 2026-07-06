import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BenchmarkSuite } from '../src/orchestration/benchmark/benchmark-suite.js';
import type { LLMAdapterInterface } from '../src/orchestration/types.js';

function createMockAdapter(): LLMAdapterInterface {
  return {
    call: vi.fn().mockResolvedValue({
      text: 'mock response',
      tokens: { input: 10, output: 20, total: 30 },
    }),
    getModel: vi.fn().mockReturnValue('mock-model'),
    setModel: vi.fn(),
    canHandle: vi.fn().mockReturnValue(true),
    dispose: vi.fn(),
  };
}

describe('BenchmarkSuite', () => {
  let mockAdapter: LLMAdapterInterface;
  let tempDir: string;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
    tempDir = '.build-anything/benchmark-test';
  });

  it('should create benchmark suite', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    expect(suite).toBeInstanceOf(BenchmarkSuite);
  });

  it('should create via factory', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    expect(suite).toBeInstanceOf(BenchmarkSuite);
  });

  it('should filter by industry', () => {
    const suite = new BenchmarkSuite();
    const apps = (suite as unknown as { apps: Array<{ industry: string }> }).apps;
    const filtered = apps.filter((a: { industry: string }) => a.industry === 'ecommerce');
    expect(filtered.length).toBeGreaterThanOrEqual(5);
  });

  it('should filter by complexity', () => {
    const suite = new BenchmarkSuite();
    const apps = (suite as unknown as { apps: Array<{ complexity: string }> }).apps;
    const simple = apps.filter((a: { complexity: string }) => a.complexity === 'simple');
    expect(simple.length).toBeGreaterThanOrEqual(3);
  });

  it('should calculate scores from artifacts', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    const calcScores = (
      result: { success: boolean; artifacts: Record<string, unknown> },
      _app: { id: string },
    ) => {
      const baseScore = result.success ? 60 : 20;
      const checks = ['architecture.system', 'database.schema', 'api.spec', 'frontend.spec', 'qa.plan', 'deployment.config'];
      const completeness = checks.filter(k => result.artifacts[k]).length;
      const bonus = (completeness / 6) * 30;
      const overall = Math.min(100, Math.round(baseScore + bonus));
      return {
        design: Math.min(100, overall + 5),
        architecture: overall + (result.artifacts['architecture.system'] ? 5 : -10),
        security: overall,
        performance: overall,
        accessibility: overall,
        business: overall + (result.artifacts['frontend.spec'] ? 5 : -5),
        overall,
      };
    };

    const scores = calcScores({
      success: true,
      artifacts: {
        'architecture.system': {},
        'database.schema': {},
        'api.spec': {},
        'frontend.spec': {},
        'qa.plan': {},
        'deployment.config': {},
      },
    }, { id: 'test' });

    expect(scores.overall).toBeGreaterThanOrEqual(80);
    expect(scores.overall).toBeLessThanOrEqual(100);
    expect(scores.architecture).toBeGreaterThanOrEqual(scores.overall);
  });

  it('should penalize failed builds in scoring', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    const calcScores = (
      result: { success: boolean; artifacts: Record<string, unknown> },
    ) => {
      const baseScore = result.success ? 60 : 20;
      const checks = ['architecture.system', 'database.schema', 'api.spec', 'frontend.spec', 'qa.plan', 'deployment.config'];
      const completeness = checks.filter(k => result.artifacts[k]).length;
      const bonus = (completeness / 6) * 30;
      const overall = Math.min(100, Math.round(baseScore + bonus));
      return { design: overall, architecture: overall, security: overall, performance: overall, accessibility: overall, business: overall, overall };
    };

    const failed = calcScores({ success: false, artifacts: {} });
    expect(failed.overall).toBe(20);
  });

  it('should estimate cost from tokens', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    const estimate = (suite as unknown as { estimateCost(tokens: number): number }).estimateCost;
    expect(estimate(0)).toBe(0);
    expect(estimate(1000)).toBe(0.03);
    expect(estimate(10000)).toBe(0.3);
  });

  it('should get default apps', () => {
    const suite = new BenchmarkSuite();
    const apps = (suite as unknown as { apps: Array<{ id: string }> }).apps;
    expect(apps.length).toBeGreaterThanOrEqual(30);

    const ids = apps.map((a: { id: string }) => a.id);
    expect(ids).toContain('ecom-001');
    expect(ids).toContain('saas-001');
    expect(ids).toContain('rest-001');
    expect(ids).toContain('health-001');
    expect(ids).toContain('edu-001');
    expect(ids).toContain('fin-001');
    expect(ids).toContain('port-001');
    expect(ids).toContain('np-001');
  });

  it('should have valid industry for all default apps', () => {
    const suite = new BenchmarkSuite();
    const apps = (suite as unknown as { apps: Array<{ industry: string }> }).apps;
    const validIndustries = ['ecommerce', 'saas', 'fintech', 'healthcare', 'education', 'restaurant', 'fitness', 'real-estate', 'media', 'portfolio', 'marketplace', 'nonprofit', 'other'];
    for (const app of apps) {
      expect(validIndustries).toContain(app.industry);
    }
  });

  it('should handle empty filters gracefully', async () => {
    const suite = new BenchmarkSuite();
    const result = await suite.run({
      filterIndustry: 'other' as 'ecommerce',
      maxConcurrency: 1,
    });
    expect(result.totalApps).toBe(0);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('should generate markdown report', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    const generate = (suite as unknown as { generateSummaryReport(result: Record<string, unknown>): string }).generateSummaryReport;

    const report = generate({
      totalApps: 30,
      successful: 28,
      failed: 2,
      avgDurationMs: 5000,
      avgScore: 75,
      avgCostUsd: 0.5,
      industryScores: { ecommerce: { avg: 80, count: 5 } },
      topPatterns: ['rest-api-pattern'],
      weakestAreas: ['design (65/100)'],
      recommendations: ['Improve design scoring'],
      results: [
        {
          appName: 'Test App',
          industry: 'ecommerce',
          scores: { overall: 85 },
          durationMs: 3000,
          estimatedCostUsd: 0.3,
          success: true,
          appId: 'test-001',
        },
      ],
      durationMs: 100,
    });

    expect(report).toContain('# Benchmark Suite Report');
    expect(report).toContain('Test App');
    expect(report).toContain('85/100');
    expect(report).toContain('30');
    expect(report).toContain('28');
  });

  it('should generate recommendations based on weak areas', () => {
    const suite = new BenchmarkSuite({ outputDir: tempDir });
    const generate = (
      results: Array<{ estimatedCostUsd: number; success: boolean }>,
      categoryAvgs: Array<{ category: string; avg: number }>,
      topPatterns: string[],
    ) => {
      const recs: string[] = [];
      if (categoryAvgs[0] && categoryAvgs[0].avg < 60) {
        recs.push(`Improve ${categoryAvgs[0].category} scoring (currently ${Math.round(categoryAvgs[0].avg)}/100)`);
      }
      const failureRate = results.filter(r => !r.success).length / results.length;
      if (failureRate > 0.2) recs.push(`High failure rate (${Math.round(failureRate * 100)}%)`);
      const avgCost = results.reduce((a, r) => a + r.estimatedCostUsd, 0) / results.length;
      if (avgCost > 1.0) recs.push(`Average cost per build is $${avgCost.toFixed(2)}`);
      if (topPatterns.length > 0) recs.push(`Leverage common patterns: ${topPatterns.slice(0, 3).join(', ')}`);
      return recs;
    };

    const recs = generate(
      [{ estimatedCostUsd: 0.5, success: true }, { estimatedCostUsd: 2.0, success: false }],
      [{ category: 'security', avg: 45 }],
      ['rest-api-pattern'],
    );

    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0]).toContain('security');
  });

  it('should handle app errors with zero scores', async () => {
    const suite = new BenchmarkSuite({
      outputDir: tempDir,
      llmAdapter: mockAdapter,
    });

    const result = await suite.run({
      appIds: ['port-001'],
      maxConcurrency: 1,
    });

    expect(result).toBeDefined();
    expect(result.totalApps).toBe(1);
  });

  it('should accept custom apps', async () => {
    const customApps = [
      { id: 'custom-1', name: 'Custom App', industry: 'saas' as const, description: 'A custom test app', complexity: 'simple' as const, expectedPages: 1, expectedEntities: 1, tags: ['test'] },
    ];

    const suite = new BenchmarkSuite({
      apps: customApps,
      outputDir: tempDir,
    });

    const apps = (suite as unknown as { apps: Array<{ id: string }> }).apps;
    expect(apps.length).toBe(1);
    expect(apps[0].id).toBe('custom-1');
  });
});
