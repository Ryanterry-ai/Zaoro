import { describe, it, expect } from 'vitest';
import {
  detectDomainFromPrimitives,
  generateDesignTokensFromPrimitives,
  detectDomainBridge,
  generateDesignTokensBridge,
} from '../src/generation/primitive-domain-bridge.js';
import type { BusinessPrimitives } from '../src/generation/primitive-extractor.js';
import type { DerivedSpec } from '../src/generation/primitive-reasoner.js';
import { deriveFromPrimitives } from '../src/generation/primitive-reasoner.js';

describe('PrimitiveDomainBridge', () => {
  const headphonePrimitives: BusinessPrimitives = {
    valueObject: 'headphone',
    transactionType: 'product-purchase',
    contentShape: ['multiple-products', 'specs-table'],
    aestheticSignals: ['dark-theme', 'electric-blue'],
    emotionalIntent: ['premium', 'futuristic', 'silence'],
    currency: 'USD',
    locale: 'US',
  };

  const yogaPrimitives: BusinessPrimitives = {
    valueObject: 'yoga',
    transactionType: 'service-booking',
    contentShape: ['schedule-times', 'team-profiles'],
    aestheticSignals: ['warm-gold'],
    emotionalIntent: ['calm', 'natural'],
    locale: 'IN',
  };

  const cryptoPrimitives: BusinessPrimitives = {
    valueObject: 'crypto',
    transactionType: 'subscription',
    contentShape: ['dashboard', 'pricing-table'],
    aestheticSignals: ['dark-theme', 'glassmorphism'],
    emotionalIntent: ['futuristic', 'trust'],
  };

  const neutralPrimitives: BusinessPrimitives = {
    valueObject: 'business',
    transactionType: 'lead-capture',
    contentShape: [],
    aestheticSignals: [],
    emotionalIntent: [],
  };

  describe('detectDomainFromPrimitives', () => {
    it('should map dark-theme to dark mood', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.mood).toBe('dark');
    });

    it('should map warm-gold to warm mood', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const domain = detectDomainFromPrimitives(yogaPrimitives, derivedSpec, 'test prompt');
      expect(domain.mood).toBe('warm');
    });

    it('should map glassmorphism to modern mood', () => {
      const glassmorphismPrimitives: BusinessPrimitives = {
        valueObject: 'crypto',
        transactionType: 'subscription',
        contentShape: ['dashboard', 'pricing-table'],
        aestheticSignals: ['glassmorphism'],
        emotionalIntent: ['futuristic', 'trust'],
      };
      const derivedSpec = deriveFromPrimitives(glassmorphismPrimitives);
      const domain = detectDomainFromPrimitives(glassmorphismPrimitives, derivedSpec, 'test prompt');
      expect(domain.mood).toBe('modern');
    });

    it('should default to modern mood for neutral primitives', () => {
      const derivedSpec = deriveFromPrimitives(neutralPrimitives);
      const domain = detectDomainFromPrimitives(neutralPrimitives, derivedSpec, 'test prompt');
      expect(domain.mood).toBe('modern');
    });

    it('should map dark-theme to slate color hint', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.colorHint).toBe('slate');
    });

    it('should map warm-gold to amber color hint', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const domain = detectDomainFromPrimitives(yogaPrimitives, derivedSpec, 'test prompt');
      expect(domain.colorHint).toBe('amber');
    });

    it('should include ecommerce features for product-purchase', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.features).toContain('ecommerce');
      expect(domain.features).toContain('product-gallery');
    });

    it('should include booking features for service-booking', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const domain = detectDomainFromPrimitives(yogaPrimitives, derivedSpec, 'test prompt');
      expect(domain.features).toContain('booking');
      expect(domain.features).toContain('schedule');
    });

    it('should include pricing features for subscription', () => {
      const derivedSpec = deriveFromPrimitives(cryptoPrimitives);
      const domain = detectDomainFromPrimitives(cryptoPrimitives, derivedSpec, 'test prompt');
      expect(domain.features).toContain('pricing');
      expect(domain.features).toContain('membership');
    });

    it('should map valueObject to imageKeywords', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.imageKeywords).toContain('headphones');
      expect(domain.imageKeywords).toContain('audio equipment');
    });

    it('should include suggestedSections from contentShape', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.suggestedSections).toContain('product-showcase');
      expect(domain.suggestedSections).toContain('specifications');
    });

    it('should set industry from valueObject', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(domain.industry).toBe('headphone');
    });
  });

  describe('generateDesignTokensFromPrimitives', () => {
    it('should generate tokens with correct colors from theme', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const tokens = generateDesignTokensFromPrimitives(headphonePrimitives, derivedSpec);
      expect(tokens.colors).toBeDefined();
      expect((tokens.colors as any).background).toBe('#0A0A0A');
      expect((tokens.colors as any).foreground).toBe('#F5F5F5');
      expect((tokens.colors as any).accent).toBe('#3B82F6');
    });

    it('should use premium typography for premium intent', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const tokens = generateDesignTokensFromPrimitives(headphonePrimitives, derivedSpec);
      expect((tokens.typography as any).fontFamily).toContain('Playfair');
      expect((tokens.typography as any).headingFont).toContain('Playfair');
    });

    it('should use Oswald for fitness/butcher valueObject', () => {
      const butcherPrimitives: BusinessPrimitives = {
        valueObject: 'butcher',
        transactionType: 'lead-capture',
        contentShape: [],
        aestheticSignals: [],
        emotionalIntent: [],
      };
      const derivedSpec = deriveFromPrimitives(butcherPrimitives);
      const tokens = generateDesignTokensFromPrimitives(butcherPrimitives, derivedSpec);
      expect((tokens.typography as any).headingFont).toContain('Oswald');
    });

    it('should include spacing and borderRadius', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const tokens = generateDesignTokensFromPrimitives(headphonePrimitives, derivedSpec);
      expect(tokens.spacing).toBeDefined();
      expect(tokens.borderRadius).toBeDefined();
      expect((tokens.borderRadius as any).full).toBe('9999px');
    });

    it('should generate warm tokens for warm-gold aesthetic', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const tokens = generateDesignTokensFromPrimitives(yogaPrimitives, derivedSpec);
      expect((tokens.colors as any).primary).toBe('#D97706');
      expect((tokens.colors as any).background).toBe('#FFFBEB');
    });
  });

  describe('detectDomainBridge', () => {
    it('should use primitives when available', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const domain = detectDomainBridge(headphonePrimitives, derivedSpec, undefined, 'test prompt');
      expect(domain.industry).toBe('headphone');
      expect(domain.mood).toBe('dark');
    });

    it('should fallback to detectDomain when primitives not available', () => {
      const domain = detectDomainBridge(undefined, undefined, undefined, 'test prompt');
      // Should not throw, should return some domain
      expect(domain).toBeDefined();
      expect(domain.industry).toBeDefined();
    });
  });

  describe('generateDesignTokensBridge', () => {
    it('should use primitives when available', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const existingGenerator = (industry: string) => ({ colors: { primary: '#000' } });
      const tokens = generateDesignTokensBridge(headphonePrimitives, derivedSpec, 'headphone', existingGenerator);
      expect((tokens.colors as any).background).toBe('#0A0A0A');
    });

    it('should fallback to existing generator when primitives not available', () => {
      const existingGenerator = (industry: string) => ({ colors: { primary: '#123456' } });
      const tokens = generateDesignTokensBridge(undefined, undefined, 'headphone', existingGenerator);
      expect((tokens.colors as any).primary).toBe('#123456');
    });
  });
});
