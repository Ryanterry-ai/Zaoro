import { describe, it, expect } from 'vitest';
import {
  analyzePromptFromPrimitives,
  generatePagesFromPrimitives,
  generateFromPromptBridge,
} from '../src/generation/primitive-prompt-bridge.js';
import type { BusinessPrimitives } from '../src/generation/primitive-extractor.js';
import { deriveFromPrimitives } from '../src/generation/primitive-reasoner.js';

describe('PrimitivePromptBridge', () => {
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

  describe('analyzePromptFromPrimitives', () => {
    it('should use derived brand name as projectName', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(result.projectName).toBe(derivedSpec.brandName);
      expect(result.projectName).toBeTruthy();
    });

    it('should use derived slug', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(result.slug).toBe('headphone');
    });

    it('should map headphone to consumer-electronics industry', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(result.industry).toBe('consumer-electronics');
    });

    it('should map yoga to fitness industry', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const result = analyzePromptFromPrimitives(yogaPrimitives, derivedSpec, 'test prompt');
      expect(result.industry).toBe('fitness');
    });

    it('should map crypto to fintech industry', () => {
      const derivedSpec = deriveFromPrimitives(cryptoPrimitives);
      const result = analyzePromptFromPrimitives(cryptoPrimitives, derivedSpec, 'test prompt');
      expect(result.industry).toBe('fintech');
    });

    it('should include keywords from primitives', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(result.keywords).toContain('headphone');
      expect(result.keywords).toContain('premium');
      expect(result.keywords).toContain('futuristic');
    });

    it('should extract URL from prompt', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'build for https://example.com');
      expect(result.url).toBe('https://example.com');
    });

    it('should return undefined url when no URL in prompt', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const result = analyzePromptFromPrimitives(headphonePrimitives, derivedSpec, 'test prompt');
      expect(result.url).toBeUndefined();
    });
  });

  describe('generatePagesFromPrimitives', () => {
    it('should generate home page with sections from derived spec', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec);
      expect(pages.length).toBeGreaterThanOrEqual(1);
      expect(pages[0].name).toBe('Home');
      expect(pages[0].path).toBe('/');
      expect(pages[0].sections.length).toBeGreaterThan(0);
    });

    it('should include hero section', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec);
      const heroSection = pages[0].sections.find(s => s.type === 'hero');
      expect(heroSection).toBeDefined();
      expect(heroSection?.components[0].name).toBe('SoundwaveHero');
    });

    it('should include cta section', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec);
      const ctaSection = pages[0].sections.find(s => s.type === 'cta');
      expect(ctaSection).toBeDefined();
      expect(ctaSection?.components[0].name).toBe('CTA');
    });

    it('should populate hero content from brand name', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec);
      const heroSection = pages[0].sections.find(s => s.type === 'hero');
      const heroContent = heroSection?.components[0].content as Record<string, unknown>;
      expect(heroContent).toBeDefined();
      expect(heroContent['title']).toBe(derivedSpec.brandName);
    });

    it('should generate product pages for product-purchase transaction', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec);
      const productPage = pages.find(p => p.path === '/products');
      expect(productPage).toBeDefined();
    });

    it('should generate schedule pages for service-booking transaction', () => {
      const derivedSpec = deriveFromPrimitives(yogaPrimitives);
      const pages = generatePagesFromPrimitives(yogaPrimitives, derivedSpec);
      const schedulePage = pages.find(p => p.path === '/schedule');
      expect(schedulePage).toBeDefined();
    });

    it('should use business content when provided', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const bizContent = {
        name: 'Aura Audio',
        tagline: 'Premium Sound',
        testimonials: [
          { quote: 'Great headphones!', author: 'John', role: 'Audio Engineer', rating: 5 },
        ],
      };
      const pages = generatePagesFromPrimitives(headphonePrimitives, derivedSpec, bizContent);
      const heroSection = pages[0].sections.find(s => s.type === 'hero');
      const heroContent = heroSection?.components[0].content as Record<string, unknown>;
      expect(heroContent['title']).toBe('Aura Audio');
    });
  });

  describe('generateFromPromptBridge', () => {
    it('should use primitives when available', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const existingGenerator = (prompt: string) => ({ manifest: { name: 'old' } });
      const result = generateFromPromptBridge(headphonePrimitives, derivedSpec, 'test prompt', existingGenerator);
      expect(result.manifest).toBeDefined();
      expect(result.pages).toBeDefined();
      expect(result.pages.length).toBeGreaterThan(0);
    });

    it('should fallback to existing generator when primitives not available', () => {
      const existingGenerator = (prompt: string) => ({ manifest: { name: 'fallback' }, pages: [] });
      const result = generateFromPromptBridge(undefined, undefined, 'test prompt', existingGenerator);
      expect(result.manifest.name).toBe('fallback');
    });

    it('should set manifest industry from primitives', () => {
      const derivedSpec = deriveFromPrimitives(headphonePrimitives);
      const existingGenerator = (prompt: string) => ({ manifest: {} });
      const result = generateFromPromptBridge(headphonePrimitives, derivedSpec, 'test prompt', existingGenerator);
      expect(result.manifest.industry).toBe('consumer-electronics');
    });
  });
});
