import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import type { BREContext } from '../src/bos/reasoning/rules-engine.js';

describe('Primitive Reasoning Integration', () => {
  const originalEnv = process.env.PRIMITIVE_REASONING;

  beforeEach(() => {
    // Reset env
    delete process.env.PRIMITIVE_REASONING;
  });

  afterEach(() => {
    // Restore env
    if (originalEnv !== undefined) {
      process.env.PRIMITIVE_REASONING = originalEnv;
    } else {
      delete process.env.PRIMITIVE_REASONING;
    }
  });

  it('should not populate primitives when PRIMITIVE_REASONING is not set', async () => {
    const ctx: BREContext = {
      industry: 'consumer-electronics',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: ['gallery', 'pricing'],
      journeys: ['visitor', 'customer'],
      entities: ['Product'],
      appName: 'Aura',
      description: 'premium noise-cancelling headphone with dark futuristic design',
    };

    const result = await runBREV2Pipeline(ctx);
    expect(result.primitives).toBeUndefined();
    expect(result.derivedSpec).toBeUndefined();
    expect(result.primitiveReasoning).toBeUndefined();
  });

  it('should not populate primitives when PRIMITIVE_REASONING=0', async () => {
    process.env.PRIMITIVE_REASONING = '0';

    const ctx: BREContext = {
      industry: 'consumer-electronics',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: ['gallery', 'pricing'],
      journeys: ['visitor', 'customer'],
      entities: ['Product'],
      appName: 'Aura',
      description: 'premium noise-cancelling headphone with dark futuristic design',
    };

    const result = await runBREV2Pipeline(ctx);
    expect(result.primitives).toBeUndefined();
    expect(result.derivedSpec).toBeUndefined();
    expect(result.primitiveReasoning).toBeUndefined();
  });

  it('should populate primitives when PRIMITIVE_REASONING=1', async () => {
    process.env.PRIMITIVE_REASONING = '1';

    const ctx: BREContext = {
      industry: 'consumer-electronics',
      businessModels: ['direct-sales'],
      compliancePacks: [],
      capabilities: ['gallery', 'pricing'],
      journeys: ['visitor', 'customer'],
      entities: ['Product'],
      appName: 'Aura',
      description: 'premium noise-cancelling headphone with dark futuristic design, buy now $299',
    };

    const result = await runBREV2Pipeline(ctx);
    expect(result.primitives).toBeDefined();
    expect(result.derivedSpec).toBeDefined();
    expect(result.primitiveReasoning).toBe(true);

    // Verify primitives
    expect(result.primitives!.valueObject).toBe('headphone');
    expect(result.primitives!.transactionType).toBe('product-purchase');
    expect(result.primitives!.aestheticSignals).toContain('dark-theme');
    expect(result.primitives!.emotionalIntent).toContain('premium');
    expect(result.primitives!.emotionalIntent).toContain('futuristic');

    // Verify derived spec
    expect(result.derivedSpec!.brandName).toBeTruthy();
    expect(result.derivedSpec!.slug).toBe('headphone');
    expect(result.derivedSpec!.entities.length).toBeGreaterThanOrEqual(2);
    expect(result.derivedSpec!.sections[0].id).toBe('hero');
    expect(result.derivedSpec!.sections[result.derivedSpec!.sections.length - 1].id).toBe('cta');
  });

  it('should populate primitives for yoga prompt when enabled', async () => {
    process.env.PRIMITIVE_REASONING = '1';

    const ctx: BREContext = {
      industry: 'wellness',
      businessModels: ['service-booking'],
      compliancePacks: [],
      capabilities: ['booking', 'schedule'],
      journeys: ['visitor', 'customer'],
      entities: ['Class', 'Instructor'],
      appName: 'Zen Studio',
      description: 'yoga studio booking platform with warm gold tones, book appointment schedule session',
    };

    const result = await runBREV2Pipeline(ctx);
    expect(result.primitives).toBeDefined();
    expect(result.primitives!.valueObject).toBe('yoga');
    expect(result.primitives!.transactionType).toBe('service-booking');
    expect(result.primitives!.aestheticSignals).toContain('warm-gold');
  });

  it('should populate primitives for crypto prompt when enabled', async () => {
    process.env.PRIMITIVE_REASONING = '1';

    const ctx: BREContext = {
      industry: 'fintech',
      businessModels: ['subscription'],
      compliancePacks: [],
      capabilities: ['dashboard', 'analytics'],
      journeys: ['visitor', 'customer'],
      entities: ['Account', 'Transaction'],
      appName: 'DeFi Platform',
      description: 'crypto defi lending platform with futuristic trust, dark glassmorphism',
    };

    const result = await runBREV2Pipeline(ctx);
    expect(result.primitives).toBeDefined();
    expect(result.primitives!.valueObject).toBe('crypto');
    expect(result.primitives!.aestheticSignals).toContain('dark-theme');
    expect(result.primitives!.aestheticSignals).toContain('glassmorphism');
  });
});
