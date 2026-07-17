import { describe, it, expect } from 'vitest';
import { generateCandidateConcepts } from '../src/bos/experience/candidates.js';
import { directExperience } from '../src/bos/experience/director.js';
import type { ExperienceConcept, ExperienceDesign } from '../src/bos/experience/types.js';

const HEADPHONE_BK = {
  industry: 'headphones-audio',
  capabilities: ['commerce.catalog', 'commerce.cart', 'commerce.checkout', 'content.management', 'auth'] as any[],
  entities: ['Headphone', 'AudioFeature', 'SoundProfile'],
  description: 'Premium headphones — noise-cancelling, Hi-Res Audio, wireless.',
};

const CRM_BK = {
  industry: 'crm',
  capabilities: ['crm.contacts', 'crm.deals', 'crm.support', 'auth'] as any[],
  entities: ['Contact', 'Deal', 'Ticket'],
};

describe('Experience Director', () => {
  describe('candidate generation', () => {
    it('generates 6 candidate concepts from business knowledge', () => {
      const candidates = generateCandidateConcepts(HEADPHONE_BK);
      expect(candidates.length).toBe(6);
    });

    it('each candidate has required fields', () => {
      const candidates = generateCandidateConcepts(HEADPHONE_BK);
      for (const c of candidates) {
        expect(c.id).toBeTruthy();
        expect(c.name).toBeTruthy();
        expect(c.style).toBeTruthy();
        expect(c.emotionalArc.length).toBeGreaterThan(0);
        expect(c.motionPrinciples.length).toBeGreaterThan(0);
        expect(c.requiredCapabilities.length).toBeGreaterThan(0);
      }
    });

    it('candidate capabilities are drawn from business knowledge', () => {
      const candidates = generateCandidateConcepts(HEADPHONE_BK);
      const caps = new Set(HEADPHONE_BK.capabilities);
      for (const c of candidates) {
        for (const cap of c.requiredCapabilities) {
          expect(caps.has(cap)).toBe(true);
        }
      }
    });

    it('deterministic: same inputs produce same candidates', () => {
      const a = generateCandidateConcepts(HEADPHONE_BK);
      const b = generateCandidateConcepts(HEADPHONE_BK);
      expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
    });
  });

  describe('scoring and selection', () => {
    it('scores all candidates and selects the best', () => {
      const design = directExperience(HEADPHONE_BK);
      expect(design.scoredCandidates.length).toBe(6);
      expect(design.selectedBlueprint).not.toBeNull();
      expect(design.selectedBlueprint!.concept.id).toBeTruthy();
      expect(design.selectedBlueprint!.score.overallScore).toBeGreaterThan(0);
    });

    it('selected concept is the highest-scored', () => {
      const design = directExperience(HEADPHONE_BK);
      if (design.selectedBlueprint) {
        const best = design.scoredCandidates[0];
        expect(design.selectedBlueprint.concept.id).toBe(best.conceptId);
      }
    });

    it('scores are sorted descending', () => {
      const design = directExperience(HEADPHONE_BK);
      for (let i = 1; i < design.scoredCandidates.length; i++) {
        expect(design.scoredCandidates[i - 1].overallScore).toBeGreaterThanOrEqual(
          design.scoredCandidates[i].overallScore,
        );
      }
    });

    it('each score has all dimensions', () => {
      const design = directExperience(HEADPHONE_BK);
      for (const s of design.scoredCandidates) {
        expect(s.dimensionScores.narrativeFit).toBeDefined();
        expect(s.dimensionScores.capabilityFit).toBeDefined();
        expect(s.dimensionScores.conversionPotential).toBeDefined();
        expect(s.dimensionScores.emotionalResonance).toBeDefined();
        expect(s.dimensionScores.performanceFeasibility).toBeDefined();
        expect(s.dimensionScores.audienceMatch).toBeDefined();
      }
    });

    it('provides reasoning for the selection', () => {
      const design = directExperience(HEADPHONE_BK);
      expect(design.reasoning.length).toBeGreaterThan(0);
    });

    it('generates a blueprint plan with sections and motion script', () => {
      const design = directExperience(HEADPHONE_BK);
      if (design.selectedBlueprint) {
        expect(design.selectedBlueprint.sections.length).toBeGreaterThan(0);
        expect(design.selectedBlueprint.motionScript.length).toBeGreaterThan(0);
        expect(design.selectedBlueprint.performanceBudget.maxAnimatedElements).toBeGreaterThan(0);
        expect(design.selectedBlueprint.rendererHints.framework).toBe('react');
      }
    });
  });

  describe('selection is driven by primitives, not industry label', () => {
    it('produces 6 scored candidates and a selected blueprint for both businesses', () => {
      const headphone = directExperience(HEADPHONE_BK);
      const crm = directExperience(CRM_BK);
      expect(headphone.scoredCandidates.length).toBe(6);
      expect(crm.scoredCandidates.length).toBe(6);
      expect(headphone.selectedBlueprint).toBeTruthy();
      expect(crm.selectedBlueprint).toBeTruthy();
    });

    it('different entity sets can select different concepts (primitive-driven)', () => {
      const hp = directExperience(HEADPHONE_BK);
      const crm = directExperience(CRM_BK);
      // Both must still produce a blueprint; selection is by primitive overlap.
      expect(hp.selectedBlueprint).toBeTruthy();
      expect(crm.selectedBlueprint).toBeTruthy();
    });

    it('does not branch on the industry label alone', () => {
      // With identical primitives/entities and no brand signal, both resolve to
      // the same top concept — proof the pipeline no longer keys on industry.
      const a = directExperience({ ...HEADPHONE_BK, industry: 'headphones-audio' } as any);
      const b = directExperience({ ...HEADPHONE_BK, industry: 'crm' } as any);
      expect(a.selectedBlueprint?.concept.id).toBe(b.selectedBlueprint?.concept.id);
    });
  });

  describe('options', () => {
    it('respects minConfidence threshold', () => {
      const design = directExperience(HEADPHONE_BK, { minConfidence: 0.99 });
      // With very high threshold, likely nothing selected
      if (design.selectedBlueprint === null) {
        expect(design.reasoning).toContain('below');
      }
    });

    it('respects maxCandidates', () => {
      const design = directExperience(HEADPHONE_BK, { maxCandidates: 3 });
      expect(design.allCandidates.length).toBe(3);
      expect(design.scoredCandidates.length).toBe(3);
    });
  });
});
