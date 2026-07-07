import { describe, it, expect } from 'vitest';
import { shouldUseNoPattern } from '../src/bos/reasoning/scorer.js';
import type { AppFamilyResult } from '../src/bos/reasoning/application-family-classifier.js';

const productivityFamily: AppFamilyResult = {
  family: 'productivity-tool', appType: 'task-tracker', complexity: 'micro',
  uiMode: 'app', dataModel: 'minimal', confidence: 0.95,
  primaryEntity: 'Task', reason: 'test',
};

const industryFamily: AppFamilyResult = {
  family: 'industry-specific', appType: 'generic', complexity: 'standard',
  uiMode: 'hybrid', dataModel: 'relational', confidence: 0.85,
  primaryEntity: null, reason: 'test',
};

describe('shouldUseNoPattern', () => {
  it('returns true for productivity-tool with high family confidence', () => {
    const topScore = { id: 'crm', name: 'Enterprise CRM', score: 60,
      breakdown: { industryFit: 5, modelFit: 10, pageCoverage: 25, componentCount: 20 }, reason: '' };
    expect(shouldUseNoPattern(topScore, productivityFamily)).toBe(true);
  });

  it('returns false for industry-specific family', () => {
    const topScore = { id: 'restaurant', name: 'Restaurant', score: 80,
      breakdown: { industryFit: 30, modelFit: 25, pageCoverage: 15, componentCount: 10 }, reason: '' };
    expect(shouldUseNoPattern(topScore, industryFamily)).toBe(false);
  });

  it('returns false when pattern has real industry fit (≥20)', () => {
    const topScore = { id: 'saas', name: 'SaaS', score: 75,
      breakdown: { industryFit: 30, modelFit: 25, pageCoverage: 15, componentCount: 5 }, reason: '' };
    const dataOrganiser: AppFamilyResult = { ...productivityFamily, family: 'data-organiser' };
    expect(shouldUseNoPattern(topScore, dataOrganiser)).toBe(false);
  });

  it('returns true when no pattern was selected (undefined)', () => {
    expect(shouldUseNoPattern(undefined, productivityFamily)).toBe(true);
  });
});