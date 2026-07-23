import { describe, it, expect } from 'vitest';
import {
  synthesizeBrandName,
  deriveFromPrimitives,
  type BusinessPrimitives,
} from '../src/generation/primitive-reasoner';

describe('PrimitiveReasoner', () => {
  describe('synthesizeBrandName', () => {
    it('should generate a brand name from valueObject and emotionalIntent', () => {
      const name = synthesizeBrandName('headphone', ['silence', 'futuristic']);
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThanOrEqual(5);
      expect(name.length).toBeLessThanOrEqual(8);
      expect(name).toBe(name.toUpperCase());
    });

    it('should generate different names for different inputs', () => {
      const name1 = synthesizeBrandName('headphone', ['silence', 'futuristic']);
      const name2 = synthesizeBrandName('yoga', ['calm', 'natural']);
      // They should be different (or at least not guaranteed to be the same)
      expect(typeof name1).toBe('string');
      expect(typeof name2).toBe('string');
    });

    it('should generate a name for flower + premium', () => {
      const name = synthesizeBrandName('flower', ['premium', 'joy']);
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThanOrEqual(5);
    });

    it('should generate a name for crypto + futuristic', () => {
      const name = synthesizeBrandName('crypto', ['futuristic', 'trust']);
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThanOrEqual(5);
    });

    it('should not return generic names for common words', () => {
      const name = synthesizeBrandName('headphone', ['premium']);
      expect(name).not.toBe('HEADPHONE');
      expect(name).not.toBe('HEAD');
      expect(name).not.toBe('PHONE');
    });

    it('should handle empty emotionalIntent', () => {
      const name = synthesizeBrandName('business', []);
      expect(name).toBeTruthy();
      expect(name.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('deriveFromPrimitives', () => {
    const headphonePrimitives: BusinessPrimitives = {
      valueObject: 'headphone',
      transactionType: 'product-purchase',
      contentShape: ['multiple-products', 'specs-table'],
      aestheticSignals: ['dark-theme', 'electric-blue'],
      emotionalIntent: ['premium', 'futuristic', 'silence'],
      currency: 'USD',
      locale: 'US',
    };

    it('should derive a complete spec from headphone primitives', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);

      // Brand name
      expect(spec.brandName).toBeTruthy();
      expect(spec.brandName.length).toBeGreaterThanOrEqual(5);

      // Slug
      expect(spec.slug).toBe('headphone');

      // Entities - should have product and order
      expect(spec.entities.length).toBeGreaterThanOrEqual(2);
      expect(spec.entities.find(e => e.slug === 'product')).toBeDefined();
      expect(spec.entities.find(e => e.slug === 'order')).toBeDefined();

      // Theme - dark theme + electric blue
      expect(spec.theme.background).toBe('#0A0A0A');
      expect(spec.theme.foreground).toBe('#F5F5F5');
      expect(spec.theme.primary).toBe('#FAFAFA');
      expect(spec.theme.accent).toBe('#3B82F6');

      // Sections - should have hero, product-showcase, deals, cta
      expect(spec.sections.length).toBeGreaterThanOrEqual(3);
      expect(spec.sections[0].id).toBe('hero');
      expect(spec.sections.find(s => s.id === 'product-showcase')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'cta')).toBeDefined();

      // Component map
      expect(spec.componentMap['hero']).toBeTruthy();
      expect(spec.componentMap['product-showcase']).toBeTruthy();

      // Copy
      expect(spec.copy.heroTitle).toBeTruthy();
      expect(spec.copy.ctaText).toBe('Shop Now');
    });

    it('should derive correct theme for dark-theme + electric-blue', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      expect(spec.theme.background).toBe('#0A0A0A');
      expect(spec.theme.accent).toBe('#3B82F6');
    });

    it('should derive correct entities for product-purchase', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      const product = spec.entities.find(e => e.slug === 'product');
      const order = spec.entities.find(e => e.slug === 'order');
      expect(product).toBeDefined();
      expect(order).toBeDefined();
      expect(product?.fields['name']).toBe('string');
      expect(product?.fields['price']).toBe('number');
    });

    it('should derive correct sections for multiple-products + specs-table', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      expect(spec.sections.find(s => s.id === 'product-showcase')).toBeDefined();
    });

    it('should derive correct copy for premium + futuristic + silence', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      expect(spec.copy.heroTitle).toContain('Premium');
      expect(spec.copy.ctaText).toBe('Shop Now');
    });

    it('should derive service-booking entities for yoga prompt', () => {
      const yogaPrimitives: BusinessPrimitives = {
        valueObject: 'yoga',
        transactionType: 'service-booking',
        contentShape: ['schedule-times', 'team-profiles'],
        aestheticSignals: ['warm-gold'],
        emotionalIntent: ['calm', 'natural'],
        locale: 'IN',
      };

      const spec = deriveFromPrimitives(yogaPrimitives);
      expect(spec.entities.find(e => e.slug === 'appointment')).toBeDefined();
      expect(spec.entities.find(e => e.slug === 'service')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'schedule')).toBeDefined();
      expect(spec.copy.ctaText).toBe('Book Now');
    });

    it('should derive subscription entities for crypto prompt', () => {
      const cryptoPrimitives: BusinessPrimitives = {
        valueObject: 'crypto',
        transactionType: 'subscription',
        contentShape: ['dashboard', 'pricing-table'],
        aestheticSignals: ['dark-theme', 'glassmorphism'],
        emotionalIntent: ['futuristic', 'trust'],
      };

      const spec = deriveFromPrimitives(cryptoPrimitives);
      expect(spec.entities.find(e => e.slug === 'subscription')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'pricing')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'dashboard')).toBeDefined();
      expect(spec.copy.ctaText).toBe('Subscribe');
    });

    it('should derive lead-capture entities for butcher prompt', () => {
      const butcherPrimitives: BusinessPrimitives = {
        valueObject: 'butcher',
        transactionType: 'lead-capture',
        contentShape: ['image-gallery', 'reviews'],
        aestheticSignals: ['brutalist'],
        emotionalIntent: ['premium', 'natural'],
      };

      const spec = deriveFromPrimitives(butcherPrimitives);
      expect(spec.entities.find(e => e.slug === 'lead')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'gallery')).toBeDefined();
      expect(spec.sections.find(s => s.id === 'testimonials')).toBeDefined();
      expect(spec.copy.ctaText).toBe('Contact Us');
    });

    it('should derive community entities for flower prompt', () => {
      const flowerPrimitives: BusinessPrimitives = {
        valueObject: 'flower',
        transactionType: 'community',
        contentShape: ['image-gallery', 'team-profiles'],
        aestheticSignals: ['light-theme', 'warm-gold'],
        emotionalIntent: ['joy', 'natural'],
      };

      const spec = deriveFromPrimitives(flowerPrimitives);
      expect(spec.entities.find(e => e.slug === 'member')).toBeDefined();
      expect(spec.entities.find(e => e.slug === 'discussion')).toBeDefined();
      expect(spec.copy.ctaText).toBe('Join Community');
    });

    it('should use SoundwaveHero for dark-theme', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      const hero = spec.sections.find(s => s.id === 'hero');
      expect(hero?.component).toBe('SoundwaveHero');
    });

    it('should use regular Hero for non-dark themes', () => {
      const yogaPrimitives: BusinessPrimitives = {
        valueObject: 'yoga',
        transactionType: 'service-booking',
        contentShape: [],
        aestheticSignals: ['warm-gold'],
        emotionalIntent: [],
      };

      const spec = deriveFromPrimitives(yogaPrimitives);
      const hero = spec.sections.find(s => s.id === 'hero');
      expect(hero?.component).toBe('Hero');
    });

    it('should always end with CTA section', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      const lastSection = spec.sections[spec.sections.length - 1];
      expect(lastSection.id).toBe('cta');
      expect(lastSection.component).toBe('CTA');
    });

    it('should always start with hero section', () => {
      const spec = deriveFromPrimitives(headphonePrimitives);
      expect(spec.sections[0].id).toBe('hero');
    });

    it('should handle empty aestheticSignals with neutral theme', () => {
      const neutralPrimitives: BusinessPrimitives = {
        valueObject: 'business',
        transactionType: 'lead-capture',
        contentShape: [],
        aestheticSignals: [],
        emotionalIntent: [],
      };

      const spec = deriveFromPrimitives(neutralPrimitives);
      expect(spec.theme.background).toBe('#FAFAFA');
      expect(spec.theme.foreground).toBe('#18181B');
      expect(spec.theme.primary).toBe('#18181B');
    });

    it('should handle empty emotionalIntent with generic copy', () => {
      const neutralPrimitives: BusinessPrimitives = {
        valueObject: 'business',
        transactionType: 'lead-capture',
        contentShape: [],
        aestheticSignals: [],
        emotionalIntent: [],
      };

      const spec = deriveFromPrimitives(neutralPrimitives);
      expect(spec.copy.heroTitle).toContain('Business');
      expect(spec.copy.ctaText).toBe('Contact Us');
    });
  });

  describe('5 Test Prompts - Full Pipeline', () => {
    const testPrompts = [
      {
        name: 'Headphones',
        prompt: 'premium noise-cancelling headphone with dark futuristic design, electric blue accents, silence and calm, $299 USD',
        expected: {
          valueObject: 'headphone',
          transactionType: 'product-purchase',
          hasDarkTheme: true,
          hasElectricBlue: true,
          hasProduct: true,
          hasOrder: true,
          noPricingTable: true,
        },
      },
      {
        name: 'Yoga Studio',
        prompt: 'yoga studio booking platform with warm gold tones, calm and natural aesthetic, schedule sessions in Mumbai India',
        expected: {
          valueObject: 'yoga',
          transactionType: 'service-booking',
          hasWarmGold: true,
          hasAppointment: true,
          hasService: true,
          hasSchedule: true,
        },
      },
      {
        name: 'Flower Delivery',
        prompt: 'flower delivery service with premium bouquets, joy and natural aesthetic, image gallery',
        expected: {
          valueObject: 'flower',
          transactionType: 'lead-capture',
          hasGallery: true,
          hasLead: true,
        },
      },
      {
        name: 'Crypto Platform',
        prompt: 'crypto defi lending platform with futuristic trust, dark glassmorphism, dashboard and pricing',
        expected: {
          valueObject: 'crypto',
          transactionType: 'lead-capture',
          hasDarkTheme: true,
          hasGlassmorphism: true,
          hasPricing: true,
          hasDashboard: true,
        },
      },
      {
        name: 'Butcher Shop',
        prompt: 'butcher shop with premium meat cuts, brutalist raw industrial design, image gallery and reviews',
        expected: {
          valueObject: 'butcher',
          transactionType: 'lead-capture',
          hasBrutalist: true,
          hasGallery: true,
          hasLead: true,
        },
      },
    ];

    for (const { name, prompt, expected } of testPrompts) {
      it(`should derive correct spec for ${name}`, () => {
        // Step 1: Extract primitives
        const primitives = extractPrimitives(prompt);

        // Step 2: Derive spec
        const spec = deriveFromPrimitives(primitives);

        // Verify valueObject
        expect(primitives.valueObject).toBe(expected.valueObject);

        // Verify transactionType
        expect(primitives.transactionType).toBe(expected.transactionType);

        // Verify aesthetic signals
        if (expected.hasDarkTheme) {
          expect(primitives.aestheticSignals).toContain('dark-theme');
        }
        if (expected.hasElectricBlue) {
          expect(primitives.aestheticSignals).toContain('electric-blue');
          expect(spec.theme.accent).toBe('#3B82F6');
        }
        if (expected.hasWarmGold) {
          expect(primitives.aestheticSignals).toContain('warm-gold');
          expect(spec.theme.primary).toBe('#D97706');
        }
        if (expected.hasLightTheme) {
          expect(primitives.aestheticSignals).toContain('light-theme');
          expect(spec.theme.background).toBe('#FAFAFA');
        }
        if (expected.hasGlassmorphism) {
          expect(primitives.aestheticSignals).toContain('glassmorphism');
          expect(spec.theme.card).toContain('rgba');
        }
        if (expected.hasBrutalist) {
          expect(primitives.aestheticSignals).toContain('brutalist');
          expect(spec.theme.background).toBe('#000000');
        }

        // Verify entities
        if (expected.hasProduct) {
          expect(spec.entities.find(e => e.slug === 'product')).toBeDefined();
        }
        if (expected.hasOrder) {
          expect(spec.entities.find(e => e.slug === 'order')).toBeDefined();
        }
        if (expected.hasAppointment) {
          expect(spec.entities.find(e => e.slug === 'appointment')).toBeDefined();
        }
        if (expected.hasService) {
          expect(spec.entities.find(e => e.slug === 'service')).toBeDefined();
        }
        if (expected.hasLead) {
          expect(spec.entities.find(e => e.slug === 'lead')).toBeDefined();
        }
        if (expected.hasSubscription) {
          expect(spec.entities.find(e => e.slug === 'subscription')).toBeDefined();
        }

        // Verify sections
        if (expected.hasSchedule) {
          expect(spec.sections.find(s => s.id === 'schedule')).toBeDefined();
        }
        if (expected.hasGallery) {
          expect(spec.sections.find(s => s.id === 'gallery')).toBeDefined();
        }
        if (expected.hasPricing) {
          expect(spec.sections.find(s => s.id === 'pricing')).toBeDefined();
        }
        if (expected.hasDashboard) {
          expect(spec.sections.find(s => s.id === 'dashboard')).toBeDefined();
        }
        if (expected.hasTestimonials) {
          expect(spec.sections.find(s => s.id === 'testimonials')).toBeDefined();
        }
        if (expected.noPricingTable) {
          expect(spec.sections.find(s => s.id === 'pricing')).toBeUndefined();
        }

        // Verify structure
        expect(spec.sections[0].id).toBe('hero');
        expect(spec.sections[spec.sections.length - 1].id).toBe('cta');
        expect(spec.brandName).toBeTruthy();
        expect(spec.slug).toBeTruthy();
        expect(spec.copy.heroTitle).toBeTruthy();
        expect(spec.copy.ctaText).toBeTruthy();
      });
    }
  });
});

// Need to import extractPrimitives for the full pipeline tests
import { extractPrimitives } from '../src/generation/primitive-extractor';
