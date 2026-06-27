import { describe, it, expect } from 'vitest';
import { Scorer } from '../src/bos/reasoning/scorer.js';
import type { DesignProfile } from '../src/bos/schemas/knowledge/design-profile.schema.js';
import type { Pattern } from '../src/bos/schemas/knowledge/pattern.schema.js';

function makeDesignProfile(overrides = {}) {
  return Object.assign({
    id: 'test-profile',
    version: '1.0.0',
    status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00',
    updatedAt: '2025-01-01T00:00:00+00:00',
    kind: 'DesignProfile',
    name: 'Test Profile',
    typography: {
      displayFamily: 'Inter',
      bodyFamily: 'Inter',
      scale: {},
    },
    colorPsychology: {
      primary: '#000',
      secondary: '#fff',
      accent: '#f00',
      background: '#fff',
      foreground: '#000',
      muted: '#888',
      destructive: '#f00',
      success: '#0f0',
      warning: '#ff0',
      info: '#00f',
      psychology: {},
      gradients: {},
    },
    spacing: {},
    grid: { columns: 12, gutter: '1rem', margin: '1.5rem', breakpoints: {} },
    motion: {
      duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
      easing: { default: '', enter: '', exit: '', spring: '' },
      reducedMotion: 'simplify',
    },
    accessibility: {
      contrastRatio: 4.5,
      focusVisible: true,
      keyboardNav: true,
      ariaLabels: true,
      reducedMotion: true,
      screenReader: true,
    },
    iconography: { library: 'lucide', style: 'outline', size: {} },
    illustration: { style: 'flat' },
    photography: { style: 'editorial', mood: [], aspectRatio: '16/9' },
    componentsStyling: {
      button: { primary: 'style', secondary: 'style' },
      card: { elevated: 'style' },
      input: {},
      badge: {},
      avatar: {},
      dialog: {},
      table: {},
      form: {},
      chart: {},
    },
    brandPersonality: ['modern', 'tech'],
    microInteractions: [
      { trigger: 'hover', animation: 'scale' },
    ],
  }, overrides);
}

function makePattern(overrides = {}) {
  return Object.assign({
    id: 'test-pattern',
    version: '1.0.0',
    status: 'active',
    createdAt: '2025-01-01T00:00:00+00:00',
    updatedAt: '2025-01-01T00:00:00+00:00',
    kind: 'Pattern',
    name: 'Test Pattern',
    navigation: { items: [], style: 'horizontal', sticky: false, logo: true },
    pages: [
      { path: '/', name: 'Home', type: 'home', sections: ['hero'] },
      { path: '/about', name: 'About', type: 'static', sections: ['story'] },
    ],
    components: ['Hero', 'FeatureGrid'],
    relationships: [],
    workflows: [],
    integrations: [],
    design: {},
    generationRules: [],
    compatibleIndustries: ['saas', 'software'],
    compatibleBusinessModels: ['subscription'],
  }, overrides);
}

describe('Scorer', () => {
  const scorer = new Scorer();

  describe('scoreDesignProfiles', () => {
    it('should score a profile with all dimensions', () => {
      const ctx = {
        industry: 'saas',
        businessModels: ['subscription'],
        capabilities: [],
        decisions: [],
        designProfiles: [makeDesignProfile()],
        patterns: [],
      };
      const results = scorer.scoreDesignProfiles(ctx);
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].breakdown.industryFit).toBeDefined();
      expect(results[0].breakdown.componentCoverage).toBeDefined();
      expect(results[0].breakdown.motionQuality).toBeDefined();
      expect(results[0].breakdown.a11yScore).toBeDefined();
    });

    it('should give higher industryFit when brand personality matches', () => {
      const matching = makeDesignProfile({ brandPersonality: ['saas'] });
      const nonMatching = makeDesignProfile({ brandPersonality: ['luxury'] });

      const ctxFor = (p) => ({
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [p],
        patterns: [],
      });

      const matchResult = scorer.scoreDesignProfiles(ctxFor(matching));
      const nonMatchResult = scorer.scoreDesignProfiles(ctxFor(nonMatching));
      expect(matchResult[0].breakdown.industryFit).toBeGreaterThan(
        nonMatchResult[0].breakdown.industryFit,
      );
    });

    it('should give higher motionQuality when micro-interactions exist', () => {
      const withMotion = makeDesignProfile({
        microInteractions: [{ trigger: 'hover', animation: 'scale' }],
      });
      const withoutMotion = makeDesignProfile({ microInteractions: [] });

      const ctxFor = (p) => ({
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [p],
        patterns: [],
      });

      const withResult = scorer.scoreDesignProfiles(ctxFor(withMotion));
      const withoutResult = scorer.scoreDesignProfiles(ctxFor(withoutMotion));
      expect(withResult[0].breakdown.motionQuality).toBeGreaterThan(
        withoutResult[0].breakdown.motionQuality,
      );
    });

    it('should give higher a11yScore when contrast ratio >= 4.5', () => {
      const goodA11y = makeDesignProfile({
        accessibility: { contrastRatio: 7, focusVisible: true, keyboardNav: true, ariaLabels: true, reducedMotion: true, screenReader: true },
      });
      const badA11y = makeDesignProfile({
        accessibility: { contrastRatio: 3, focusVisible: true, keyboardNav: true, ariaLabels: true, reducedMotion: true, screenReader: true },
      });

      const ctxFor = (p) => ({
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [p],
        patterns: [],
      });

      const goodResult = scorer.scoreDesignProfiles(ctxFor(goodA11y));
      const badResult = scorer.scoreDesignProfiles(ctxFor(badA11y));
      expect(goodResult[0].breakdown.a11yScore).toBeGreaterThan(
        badResult[0].breakdown.a11yScore,
      );
    });

    it('should sort results by score descending', () => {
      const profiles = [
        makeDesignProfile({ id: 'low', brandPersonality: ['other'] }),
        makeDesignProfile({ id: 'high', brandPersonality: ['saas'] }),
      ];
      const ctx = {
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: profiles,
        patterns: [],
      };
      const results = scorer.scoreDesignProfiles(ctx);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('should include a reason string', () => {
      const ctx = {
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [makeDesignProfile()],
        patterns: [],
      };
      const results = scorer.scoreDesignProfiles(ctx);
      expect(results[0].reason).toContain('Score');
      expect(results[0].reason).toContain('/100');
    });
  });

  describe('scorePatterns', () => {
    it('should score a pattern with all dimensions', () => {
      const ctx = {
        industry: 'saas',
        businessModels: ['subscription'],
        capabilities: [],
        decisions: [],
        designProfiles: [],
        patterns: [makePattern()],
      };
      const results = scorer.scorePatterns(ctx);
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].breakdown.industryFit).toBeDefined();
      expect(results[0].breakdown.modelFit).toBeDefined();
      expect(results[0].breakdown.pageCoverage).toBeDefined();
      expect(results[0].breakdown.componentCount).toBeDefined();
    });

    it('should give higher industryFit for matching industry', () => {
      const matching = makePattern({ compatibleIndustries: ['saas'] });
      const nonMatching = makePattern({ compatibleIndustries: ['restaurant'] });

      const ctxFor = (p) => ({
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [],
        patterns: [p],
      });

      const matchResult = scorer.scorePatterns(ctxFor(matching));
      const nonMatchResult = scorer.scorePatterns(ctxFor(nonMatching));
      expect(matchResult[0].breakdown.industryFit).toBeGreaterThan(
        nonMatchResult[0].breakdown.industryFit,
      );
    });

    it('should give higher modelFit for matching business model', () => {
      const matching = makePattern({ compatibleBusinessModels: ['subscription'] });
      const nonMatching = makePattern({ compatibleBusinessModels: ['direct-sales'] });

      const ctxFor = (p) => ({
        industry: 'saas',
        businessModels: ['subscription'],
        capabilities: [],
        decisions: [],
        designProfiles: [],
        patterns: [p],
      });

      const matchResult = scorer.scorePatterns(ctxFor(matching));
      const nonMatchResult = scorer.scorePatterns(ctxFor(nonMatching));
      expect(matchResult[0].breakdown.modelFit).toBeGreaterThan(
        nonMatchResult[0].breakdown.modelFit,
      );
    });

    it('should sort results by score descending', () => {
      const patterns = [
        makePattern({ id: 'low', compatibleIndustries: ['restaurant'] }),
        makePattern({ id: 'high', compatibleIndustries: ['saas'] }),
      ];
      const ctx = {
        industry: 'saas',
        businessModels: [],
        capabilities: [],
        decisions: [],
        designProfiles: [],
        patterns,
      };
      const results = scorer.scorePatterns(ctx);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });
  });

  describe('rankOptions', () => {
    it('should sort options by score descending', () => {
      const options = [
        { id: 'a', name: 'A', score: 30, breakdown: {}, reason: '' },
        { id: 'b', name: 'B', score: 70, breakdown: {}, reason: '' },
        { id: 'c', name: 'C', score: 50, breakdown: {}, reason: '' },
      ];
      const ranked = scorer.rankOptions(options);
      expect(ranked[0].id).toBe('b');
      expect(ranked[1].id).toBe('c');
      expect(ranked[2].id).toBe('a');
    });
  });

  describe('selectBest', () => {
    it('should return the highest scoring option from pre-sorted array', () => {
      // selectBest expects pre-sorted input (returns options[0])
      const options = [
        { id: 'b', name: 'B', score: 70, breakdown: {}, reason: '' },
        { id: 'a', name: 'A', score: 30, breakdown: {}, reason: '' },
        { id: 'c', name: 'C', score: 50, breakdown: {}, reason: '' },
      ];
      const best = scorer.selectBest(options);
      expect(best.id).toBe('b');
    });

    it('should return undefined for empty array', () => {
      const best = scorer.selectBest([]);
      expect(best).toBeUndefined();
    });
  });
});
