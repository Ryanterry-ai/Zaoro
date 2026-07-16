import { describe, it, expect } from 'vitest';
import { ProductionAcceptanceGateEngine } from '../src/orchestration/production-acceptance-gate/engine.js';
import { capabilityRegistry } from '../src/bos/capabilities/index.js';

describe('ProductionAcceptanceGate — capability coverage (Phase R2)', () => {
  it('passes when a canonical capability manifest is fully fulfilled', () => {
    const engine = new ProductionAcceptanceGateEngine();
    const manifest = capabilityRegistry.buildManifest(['ecommerce']);
    const result = engine.evaluate({
      capabilityManifest: manifest,
      capabilities: manifest.capabilities,
    });
    const check = result.checks.find(c => c.name === 'Capability Coverage')!;
    expect(check.status).toBe('PASS');
    expect(check.score).toBe(1);
  });

  it('fails (below min) when the manifest capabilities are not fulfilled', () => {
    const engine = new ProductionAcceptanceGateEngine();
    const manifest = capabilityRegistry.buildManifest(['ecommerce']);
    const result = engine.evaluate({
      capabilityManifest: manifest,
      capabilities: [], // nothing fulfilled
    });
    const check = result.checks.find(c => c.name === 'Capability Coverage')!;
    expect(check.score).toBe(0);
    expect(check.status).toBe('FAIL');
  });

  it('falls back to a legacy capabilityCoverage score artifact', () => {
    const engine = new ProductionAcceptanceGateEngine();
    const result = engine.evaluate({
      capabilityCoverage: { score: 0.9 },
    });
    const check = result.checks.find(c => c.name === 'Capability Coverage')!;
    expect(check.score).toBe(0.9);
    expect(check.status).toBe('PASS');
  });

  it('normalizes raw capability ids to a presence baseline when no score is given', () => {
    const engine = new ProductionAcceptanceGateEngine();
    const result = engine.evaluate({
      capabilities: ['commerce', 'booking', 'crm'],
    });
    const check = result.checks.find(c => c.name === 'Capability Coverage')!;
    expect(check.score).toBe(1);
    expect(check.status).toBe('PASS');
  });

  it('reports zero coverage when no capabilities are supplied', () => {
    const engine = new ProductionAcceptanceGateEngine();
    const result = engine.evaluate({});
    const check = result.checks.find(c => c.name === 'Capability Coverage')!;
    expect(check.score).toBe(0);
  });
});
