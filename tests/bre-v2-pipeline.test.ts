import { describe, it, expect } from 'vitest';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../src/bos/blueprint-mapper.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

describe('BRE v2 Pipeline (end-to-end)', () => {
  it('should produce a valid ApplicationBlueprint for a restaurant prompt', () => {
    const ctx = buildBREContext('Build a restaurant called Bella Vista with online reservations');
    expect(ctx.industry).toBe('restaurant');
    expect(ctx.businessModels).toContain('direct-sales');

    const result = runBREV2Pipeline(ctx);
    expect(result.blueprint).toBeDefined();
    expect(result.blueprint.name).toBe('Bella Vista');
    expect(result.blueprint.industry).toBe('restaurant');
    expect(result.blueprint.pages.length).toBeGreaterThan(0);
    expect(result.blueprint.entities.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.decisions.length).toBeGreaterThan(0);
  });

  it('should produce a valid ApplicationBlueprint for a SaaS prompt', () => {
    const ctx = buildBREContext('Build a SaaS subscription platform called CloudDash');
    expect(ctx.industry).toBe('saas');
    expect(ctx.businessModels).toContain('subscription');

    const result = runBREV2Pipeline(ctx);
    expect(result.blueprint.name).toBe('CloudDash');
    expect(result.blueprint.pages.some(p => p.path === '/pricing')).toBe(true);
    expect(result.blueprint.pages.some(p => p.path === '/dashboard')).toBe(true);
  });

  it('should map ApplicationBlueprint to FullStackBlueprint', () => {
    const ctx = buildBREContext('Build a gym membership app called FitZone');
    const result = runBREV2Pipeline(ctx);
    const fsBlueprint = mapBlueprintToFullStack(result.blueprint);

    expect(fsBlueprint.appName).toBe('FitZone');
    expect(fsBlueprint.pages.length).toBeGreaterThan(0);
    expect(fsBlueprint.dataModels.length).toBeGreaterThan(0);
    expect(fsBlueprint.colorScheme).toBeDefined();
    expect(['indigo', 'emerald', 'amber', 'rose', 'violet', 'sky']).toContain(fsBlueprint.colorScheme);
  });

  it('should handle unknown industries gracefully', () => {
    const ctx = buildBREContext('Build something called MysteryApp');
    const result = runBREV2Pipeline(ctx);
    expect(result.blueprint).toBeDefined();
    expect(result.blueprint.pages.length).toBeGreaterThan(0);
  });
});
