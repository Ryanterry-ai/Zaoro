import { describe, it, expect, beforeAll } from 'vitest';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { mapBlueprintToFullStack } from '../src/bos/blueprint-mapper.js';
import { buildBREContext } from '../src/bos/intake-parser.js';

describe('BRE v2 Pipeline (end-to-end)', () => {
  let restaurantResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;
  let saasResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;
  let gymResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;
  let unknownResult: Awaited<ReturnType<typeof runBREV2Pipeline>>;

  beforeAll(async () => {
    const restaurantCtx = await buildBREContext('Build a restaurant called Bella Vista with online reservations');
    restaurantResult = await runBREV2Pipeline(restaurantCtx);

    const saasCtx = await buildBREContext('Build a SaaS subscription platform called CloudDash');
    saasResult = await runBREV2Pipeline(saasCtx);

    const gymCtx = await buildBREContext('Build a gym membership app called FitZone');
    gymResult = await runBREV2Pipeline(gymCtx);

    const unknownCtx = await buildBREContext('Build something called MysteryApp');
    unknownResult = await runBREV2Pipeline(unknownCtx);
  }, 60000);

  it('should produce a valid ApplicationBlueprint for a restaurant prompt', () => {
    expect(restaurantResult.blueprint).toBeDefined();
    expect(restaurantResult.blueprint.name).toBe('Bella Vista');
    expect(restaurantResult.blueprint.industry).toBe('restaurant');
    expect(restaurantResult.blueprint.pages.length).toBeGreaterThan(0);
    expect(restaurantResult.blueprint.entities.length).toBeGreaterThan(0);
    expect(restaurantResult.confidence).toBeGreaterThan(0);
    expect(restaurantResult.decisions.length).toBeGreaterThan(0);
  });

  it('should produce a valid ApplicationBlueprint for a SaaS prompt', () => {
    expect(saasResult.blueprint.name).toBe('CloudDash');
    expect(saasResult.blueprint.pages.some((p: { path: string }) => p.path === '/pricing')).toBe(true);
    expect(saasResult.blueprint.pages.some((p: { path: string }) => p.path === '/dashboard')).toBe(true);
  });

  it('should map ApplicationBlueprint to FullStackBlueprint', () => {
    const fsBlueprint = mapBlueprintToFullStack(gymResult.blueprint);

    expect(fsBlueprint.appName).toBe('FitZone');
    expect(fsBlueprint.pages.length).toBeGreaterThan(0);
    expect(fsBlueprint.dataModels.length).toBeGreaterThan(0);
    expect(fsBlueprint.colorScheme).toBeDefined();
    expect(['indigo', 'emerald', 'amber', 'rose', 'violet', 'sky']).toContain(fsBlueprint.colorScheme);
  });

  it('should handle unknown industries gracefully', () => {
    expect(unknownResult.blueprint).toBeDefined();
    expect(unknownResult.blueprint.pages.length).toBeGreaterThan(0);
  });
});
