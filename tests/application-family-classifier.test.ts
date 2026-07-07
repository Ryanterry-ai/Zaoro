import { describe, it, expect } from 'vitest';
import { classify } from '../src/bos/reasoning/application-family-classifier.js';
import type { BREContext } from '../src/bos/reasoning/rules-engine.js';

function makeCtx(industry: string, caps: string[] = [], desc = ''): BREContext {
  return { industry, businessModels: [], capabilities: caps, journeys: ['visitor'], entities: [], compliancePacks: [], description: desc };
}

describe('ApplicationFamilyClassifier', () => {
  it('classifies "task tracker" as productivity-tool', () => {
    const r = classify('Build a simple task tracker', makeCtx('general', [], 'Build a simple task tracker'));
    expect(r.family).toBe('productivity-tool');
    expect(r.appType).toBe('task-tracker');
    expect(r.uiMode).toBe('app');
    expect(r.dataModel).toBe('minimal');
  });

  it('classifies "habit tracker" as productivity-tool', () => {
    const r = classify('Build a habit tracker app', makeCtx('general', [], 'Build a habit tracker app'));
    expect(r.family).toBe('productivity-tool');
    expect(r.appType).toBe('habit-tracker');
  });

  it('classifies "kanban board" as productivity-tool', () => {
    const r = classify('Build a kanban board for my team', makeCtx('general', ['workflow'], 'Build a kanban board'));
    expect(r.family).toBe('productivity-tool');
    expect(r.appType).toBe('kanban');
  });

  it('classifies "note taking app" as productivity-tool', () => {
    const r = classify('Build a note taking app', makeCtx('general', [], 'Build a note taking app'));
    expect(r.family).toBe('productivity-tool');
    expect(r.appType).toBe('notes');
  });

  it('classifies "bug tracker" as developer-tool', () => {
    const r = classify('Build a bug tracker', makeCtx('general', [], 'Build a bug tracker'));
    expect(r.family).toBe('developer-tool');
    expect(r.appType).toBe('bug-tracker');
  });

  it('classifies "issue tracker" as developer-tool', () => {
    const r = classify('Build an issue tracker for our team', makeCtx('general', [], 'Build an issue tracker'));
    expect(r.family).toBe('developer-tool');
    expect(r.appType).toBe('issue-tracker');
  });

  it('classifies "recipe organiser" as data-organiser', () => {
    const r = classify('Build a recipe organiser', makeCtx('general', [], 'Build a recipe organiser'));
    expect(r.family).toBe('data-organiser');
    expect(r.appType).toBe('recipe-organiser');
  });

  it('classifies "book tracker" as data-organiser', () => {
    const r = classify('Build a book tracker to track my reading', makeCtx('general', [], 'Build a book tracker'));
    expect(r.family).toBe('data-organiser');
  });

  it('classifies "gym CRM" as industry-specific', () => {
    const r = classify('Build a gym CRM', makeCtx('fitness', ['crm'], 'Build a gym CRM'));
    expect(r.family).toBe('industry-specific');
  });

  it('classifies "hospital ERP" as industry-specific', () => {
    const r = classify('Build a hospital ERP', makeCtx('healthcare', ['analytics', 'crm'], 'Build a hospital ERP'));
    expect(r.family).toBe('industry-specific');
  });

  it('classifies "restaurant booking" as industry-specific', () => {
    const r = classify('Build a restaurant booking site', makeCtx('restaurant', ['booking'], 'Build a restaurant booking site'));
    expect(r.family).toBe('industry-specific');
  });

  it('classifies "ecommerce store" as commerce', () => {
    const r = classify('Build an ecommerce store', makeCtx('ecommerce', ['commerce'], 'Build an ecommerce store'));
    expect(r.family).toBe('commerce');
  });

  it('marks "simple" prompts as micro complexity', () => {
    const r = classify('Build a simple task tracker', makeCtx('general', [], 'Build a simple task tracker'));
    expect(r.complexity).toBe('micro');
  });

  it('marks prompts without "simple" as standard complexity', () => {
    const r = classify('Build a task management app for our team', makeCtx('general', [], 'Build a task management app'));
    expect(r.complexity).toBe('standard');
  });

  it('returns high confidence for productivity-tool with clear keywords', () => {
    const r = classify('Build a task tracker', makeCtx('general'));
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it('returns lower confidence for industry-specific with no family match', () => {
    const r = classify('Build something', makeCtx('general'));
    expect(r.family).toBe('industry-specific');
    expect(r.confidence).toBeLessThan(0.5);
  });
});