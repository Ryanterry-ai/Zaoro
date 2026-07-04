import { describe, it, expect } from 'vitest';
import { calculateUsageMetrics } from '../src/core/llm-router.js';

describe('Token Budget Metrics Calculator', () => {
  it('should accurately calculate zero usage margins cleanly', () => {
    const metrics = calculateUsageMetrics(undefined);
    expect(metrics.promptTokens).toBe(0);
    expect(metrics.completionTokens).toBe(0);
    expect(metrics.estimatedCostUsd).toBe(0);
  });

  it('should compute exact financial costs based on token scale models', () => {
    const mockUsage = { prompt_tokens: 100000, completion_tokens: 20000 };
    const metrics = calculateUsageMetrics(mockUsage);

    // (100000 * 0.000005) + (20000 * 0.000015) = 0.5 + 0.3 = 0.8
    expect(metrics.promptTokens).toBe(100000);
    expect(metrics.completionTokens).toBe(20000);
    expect(metrics.estimatedCostUsd).toBe(0.8);
  });

  it('should handle small token counts correctly', () => {
    const mockUsage = { prompt_tokens: 1000, completion_tokens: 500 };
    const metrics = calculateUsageMetrics(mockUsage);

    // (1000 * 0.000005) + (500 * 0.000015) = 0.005 + 0.0075 = 0.0125
    expect(metrics.promptTokens).toBe(1000);
    expect(metrics.completionTokens).toBe(500);
    expect(metrics.estimatedCostUsd).toBe(0.0125);
  });

  it('should handle zero tokens with explicit zero values', () => {
    const mockUsage = { prompt_tokens: 0, completion_tokens: 0 };
    const metrics = calculateUsageMetrics(mockUsage);

    expect(metrics.promptTokens).toBe(0);
    expect(metrics.completionTokens).toBe(0);
    expect(metrics.estimatedCostUsd).toBe(0);
  });

  it('should handle large token counts', () => {
    const mockUsage = { prompt_tokens: 1000000, completion_tokens: 500000 };
    const metrics = calculateUsageMetrics(mockUsage);

    // (1000000 * 0.000005) + (500000 * 0.000015) = 5 + 7.5 = 12.5
    expect(metrics.promptTokens).toBe(1000000);
    expect(metrics.completionTokens).toBe(500000);
    expect(metrics.estimatedCostUsd).toBe(12.5);
  });

  it('should round cost to 6 decimal places', () => {
    const mockUsage = { prompt_tokens: 1, completion_tokens: 1 };
    const metrics = calculateUsageMetrics(mockUsage);

    // (1 * 0.000005) + (1 * 0.000015) = 0.000005 + 0.000015 = 0.00002
    expect(metrics.estimatedCostUsd).toBe(0.00002);
  });
});
