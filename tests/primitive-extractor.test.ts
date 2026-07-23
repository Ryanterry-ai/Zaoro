import { describe, it, expect } from 'vitest';
import { extractPrimitives, type BusinessPrimitives } from '../src/generation/primitive-extractor';

describe('PrimitiveExtractor', () => {
  describe('extractPrimitives', () => {
    it('should return default primitives for empty prompt', () => {
      const result = extractPrimitives('');
      expect(result).toEqual({
        valueObject: 'business',
        transactionType: 'lead-capture',
        contentShape: ['single-product'],
        aestheticSignals: [],
        emotionalIntent: [],
        currency: undefined,
        locale: undefined,
      });
    });

    it('should return default primitives for weak/generic prompt', () => {
      const result = extractPrimitives('build me a website');
      expect(result.valueObject).toBe('business');
      expect(result.transactionType).toBe('lead-capture');
      expect(result.aestheticSignals).toHaveLength(0);
      expect(result.emotionalIntent).toHaveLength(0);
    });

    it('should detect headphone-related value object', () => {
      const result = extractPrimitives('premium noise-cancelling headphone with futuristic design');
      expect(result.valueObject).toBe('headphone');
    });

    it('should detect yoga-related value object', () => {
      const result = extractPrimitives('yoga studio booking platform');
      expect(result.valueObject).toBe('yoga');
    });

    it('should detect flower-related value object', () => {
      const result = extractPrimitives('flower delivery service with premium bouquets');
      expect(result.valueObject).toBe('flower');
    });

    it('should detect crypto-related value object', () => {
      const result = extractPrimitives('crypto defi lending platform with yield staking');
      expect(result.valueObject).toBe('crypto');
    });

    it('should detect butcher-related value object', () => {
      const result = extractPrimitives('butcher shop with premium meat cuts and charcuterie');
      expect(result.valueObject).toBe('butcher');
    });

    it('should detect product-purchase transaction type', () => {
      const result = extractPrimitives('buy premium headphones with checkout cart price $299');
      expect(result.transactionType).toBe('product-purchase');
    });

    it('should detect service-booking transaction type', () => {
      const result = extractPrimitives('book yoga appointment schedule session slot');
      expect(result.transactionType).toBe('service-booking');
    });

    it('should detect subscription transaction type', () => {
      const result = extractPrimitives('monthly subscription plan membership recurring');
      expect(result.transactionType).toBe('subscription');
    });

    it('should detect lead-capture transaction type', () => {
      const result = extractPrimitives('contact form signup register for quote demo');
      expect(result.transactionType).toBe('lead-capture');
    });

    it('should detect marketplace transaction type', () => {
      const result = extractPrimitives('multi-vendor marketplace seller commission');
      expect(result.transactionType).toBe('marketplace');
    });

    it('should detect community transaction type', () => {
      const result = extractPrimitives('community forum member discussion social network');
      expect(result.transactionType).toBe('community');
    });

    it('should detect information transaction type', () => {
      const result = extractPrimitives('article blog guide resource learn documentation');
      expect(result.transactionType).toBe('information');
    });

    it('should detect multiple-products content shape', () => {
      const result = extractPrimitives('multiple models variants tiers comparison');
      expect(result.contentShape).toContain('multiple-products');
    });

    it('should detect single-product content shape', () => {
      const result = extractPrimitives('single product only one variant');
      expect(result.contentShape).toContain('single-product');
    });

    it('should detect specs-table content shape', () => {
      const result = extractPrimitives('specification features compare comparison table');
      expect(result.contentShape).toContain('specs-table');
    });

    it('should detect image-gallery content shape', () => {
      const result = extractPrimitives('gallery image photo visual showcase lookbook');
      expect(result.contentShape).toContain('image-gallery');
    });

    it('should detect dark-theme aesthetic signal', () => {
      const result = extractPrimitives('dark night midnight black charcoal obsidian design');
      expect(result.aestheticSignals).toContain('dark-theme');
    });

    it('should detect light-theme aesthetic signal', () => {
      const result = extractPrimitives('light white minimal clean airy bright design');
      expect(result.aestheticSignals).toContain('light-theme');
    });

    it('should detect electric-blue aesthetic signal', () => {
      const result = extractPrimitives('electric neon cyan blue glow vibrant saturated');
      expect(result.aestheticSignals).toContain('electric-blue');
    });

    it('should detect warm-gold aesthetic signal', () => {
      const result = extractPrimitives('warm gold amber sunset terracotta earth tones');
      expect(result.aestheticSignals).toContain('warm-gold');
    });

    it('should detect monochrome aesthetic signal', () => {
      const result = extractPrimitives('mono monochrome greyscale grayscale palette');
      expect(result.aestheticSignals).toContain('monochrome');
    });

    it('should detect brutalist aesthetic signal', () => {
      const result = extractPrimitives('brutal raw industrial concrete design');
      expect(result.aestheticSignals).toContain('brutalist');
    });

    it('should detect silence emotional intent', () => {
      const result = extractPrimitives('silence quiet calm peaceful tranquil zen still');
      expect(result.emotionalIntent).toContain('silence');
    });

    it('should detect futuristic emotional intent', () => {
      const result = extractPrimitives('futuristic cyber tech innovation next-gen cutting-edge');
      expect(result.emotionalIntent).toContain('futuristic');
    });

    it('should detect premium emotional intent', () => {
      const result = extractPrimitives('premium luxury exclusive elite high-end sophisticated');
      expect(result.emotionalIntent).toContain('premium');
    });

    it('should detect transformation emotional intent', () => {
      const result = extractPrimitives('transform transformation change evolve upgrade level-up');
      expect(result.emotionalIntent).toContain('transformation');
    });

    it('should detect USD currency', () => {
      const result = extractPrimitives('product costs $299 USD');
      expect(result.currency).toBe('USD');
    });

    it('should detect EUR currency', () => {
      const result = extractPrimitives('product costs €199');
      expect(result.currency).toBe('EUR');
    });

    it('should detect GBP currency', () => {
      const result = extractPrimitives('product costs £150');
      expect(result.currency).toBe('GBP');
    });

    it('should detect INR currency', () => {
      const result = extractPrimitives('product costs ₹15000');
      expect(result.currency).toBe('INR');
    });

    it('should detect IN locale', () => {
      const result = extractPrimitives('yoga studio in Mumbai Delhi India');
      expect(result.locale).toBe('IN');
    });

    it('should detect GB locale', () => {
      const result = extractPrimitives('shop in London Manchester UK');
      expect(result.locale).toBe('GB');
    });

    it('should detect US locale', () => {
      const result = extractPrimitives('business in New York Los Angeles USA');
      expect(result.locale).toBe('US');
    });

    it('should detect multiple aesthetic signals', () => {
      const result = extractPrimitives('dark theme with electric blue accents and neon glow');
      expect(result.aestheticSignals).toContain('dark-theme');
      expect(result.aestheticSignals).toContain('electric-blue');
    });

    it('should detect multiple emotional intents', () => {
      const result = extractPrimitives('premium luxury headphone with futuristic design and silence');
      expect(result.emotionalIntent).toContain('premium');
      expect(result.emotionalIntent).toContain('futuristic');
      expect(result.emotionalIntent).toContain('silence');
    });

    it('should handle complex headphone prompt with all signals', () => {
      const result = extractPrimitives(
        'premium noise-cancelling headphone with dark futuristic design, electric blue accents, silence and calm, $299 USD'
      );
      expect(result.valueObject).toBe('headphone');
      expect(result.transactionType).toBe('product-purchase');
      expect(result.aestheticSignals).toContain('dark-theme');
      expect(result.aestheticSignals).toContain('electric-blue');
      expect(result.emotionalIntent).toContain('premium');
      expect(result.emotionalIntent).toContain('futuristic');
      expect(result.emotionalIntent).toContain('silence');
      expect(result.emotionalIntent).toContain('calm');
      expect(result.currency).toBe('USD');
    });

    it('should handle complex yoga prompt with all signals', () => {
      const result = extractPrimitives(
        'premium yoga studio booking platform with warm gold tones, calm and natural aesthetic, schedule sessions in Mumbai India'
      );
      expect(result.valueObject).toBe('yoga');
      expect(result.transactionType).toBe('service-booking');
      expect(result.aestheticSignals).toContain('warm-gold');
      expect(result.emotionalIntent).toContain('calm');
      expect(result.emotionalIntent).toContain('natural');
      expect(result.locale).toBe('IN');
    });
  });
});
