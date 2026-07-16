import { describe, it, expect } from 'vitest';
import { runCanonicalBuild } from '../src/orchestration/pipeline/canonical-build.js';

describe('canonical-build pipeline', () => {
  const UNSEEN_BUSINESSES = [
    'marine bioluminescence research lab',
    'quantum computing company',
    'artisan sourdough bakery',
  ];

  it('produces all seven canonical artifacts for a known-brand prompt', async () => {
    const report = await runCanonicalBuild({ prompt: 'Build an Apple-style site for a fintech startup' });

    expect(report.businessKnowledge).toBeTruthy();
    expect(report.businessKnowledge.discovery).toBeTruthy();
    expect(report.evidence).toBeTruthy();
    expect(report.experienceBlueprint).toBeTruthy();
    expect(report.experienceBlueprint.id).toBeTruthy();
    expect(report.contentBlueprint).toBeTruthy();
    expect(report.contentBlueprint.id).toBeTruthy();
    expect(report.designDecision).toBeTruthy();
    expect(report.designDecision.id).toBeTruthy();
    expect(report.solutionArchitecture).toBeTruthy();
    expect(report.solutionArchitecture.id).toBeTruthy();
    expect(report.compiledExperience).toBeTruthy();
    expect(report.compiledExperience.sections.length).toBeGreaterThan(0);
  });

  it('runs end-to-end without throwing for unseen businesses', async () => {
    for (const prompt of UNSEEN_BUSINESSES) {
      const report = await runCanonicalBuild({ prompt });
      expect(report.businessKnowledge).toBeTruthy();
      expect(report.compiledExperience).toBeTruthy();
    }
  });

  it('instruments and captures hardcoded-industry violations as traced compliance records', async () => {
    const report = await runCanonicalBuild({ prompt: 'Build a marine bioluminescence research lab website' });

    // At minimum, the run completes and records any detected violations.
    expect(Array.isArray(report.violations)).toBe(true);
    // For an unseen/unknown business, the canonical engines must not rely on
    // a recognized industry profile — any such read is captured here.
    for (const v of report.violations) {
      expect(v.stage).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(v.severity);
      expect(v.detail).toBeTruthy();
    }
    // The pipeline must still produce artifacts even when violations exist.
    expect(report.businessKnowledge).toBeTruthy();
    expect(report.compiledExperience).toBeTruthy();
  });

  it('exposes a compliant flag reflecting absence of high/medium violations', async () => {
    const report = await runCanonicalBuild({ prompt: 'Build a quantum computing company site' });
    const hasBlocking = report.violations.some(v => v.severity === 'high' || v.severity === 'medium');
    expect(report.compliant).toBe(!hasBlocking);
  });
});
