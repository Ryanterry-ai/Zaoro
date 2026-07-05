import { describe, it, expect } from 'vitest';
import {
  resolveDomainImages,
  resolveSingleImage,
  resolveDashboardMockup,
  resolveIconSvg,
  SVG_ICONS,
} from '../src/generation/image-resolver.js';

describe('image-resolver', () => {
  describe('resolveDomainImages', () => {
    it('should return hero, items, team, and fallback', () => {
      const result = resolveDomainImages(['restaurant', 'food', 'dining'], 4, 3);
      expect(result.hero).toBeDefined();
      expect(result.items.length).toBe(4);
      expect(result.team.length).toBe(3);
      expect(result.fallback).toBeDefined();
    });

    it('should generate Unsplash URLs', () => {
      const result = resolveDomainImages(['business'], 1, 1);
      expect(result.hero).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?w=1200&h=800&fit=crop$/);
      expect(result.items[0]).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?w=600&h=400&fit=crop$/);
      expect(result.team[0]).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?w=200&h=200&fit=crop$/);
    });

    it('should generate consistent URLs for same keyword', () => {
      const a = resolveDomainImages(['coffee'], 1, 1);
      const b = resolveDomainImages(['coffee'], 1, 1);
      expect(a.hero).toBe(b.hero);
      expect(a.items[0]).toBe(b.items[0]);
    });

    it('should generate different URLs for different keywords', () => {
      const a = resolveDomainImages(['coffee'], 1, 1);
      const b = resolveDomainImages(['luxury'], 1, 1);
      expect(a.hero).not.toBe(b.hero);
    });

    it('should generate gradient fallback', () => {
      const result = resolveDomainImages(['business'], 1, 1);
      expect(result.fallback).toMatch(/^linear-gradient\(/);
    });

    it('should handle empty keywords', () => {
      const result = resolveDomainImages([], 2, 2);
      expect(result.hero).toBeDefined();
      expect(result.items.length).toBe(2);
      expect(result.team.length).toBe(2);
    });

    it('should rotate through keywords for items', () => {
      const result = resolveDomainImages(['a', 'b', 'c'], 6, 0);
      // Items should cycle through a, b, c, a, b, c
      expect(result.items.length).toBe(6);
      // Items 0 and 3 should be same keyword
      expect(result.items[0]).not.toBe(result.items[1]);
      expect(result.items[0]).not.toBe(result.items[2]);
    });
  });

  describe('resolveSingleImage', () => {
    it('should generate an Unsplash URL with default dimensions', () => {
      const url = resolveSingleImage('coffee');
      expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?w=600&h=400&fit=crop$/);
    });

    it('should accept custom dimensions', () => {
      const url = resolveSingleImage('coffee', 800, 600);
      expect(url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?w=800&h=600&fit=crop$/);
    });

    it('should be deterministic for same keyword', () => {
      const a = resolveSingleImage('test-keyword');
      const b = resolveSingleImage('test-keyword');
      expect(a).toBe(b);
    });
  });

  describe('resolveDashboardMockup', () => {
    it('should return a data URI SVG', () => {
      const svg = resolveDashboardMockup();
      expect(svg).toMatch(/^data:image\/svg\+xml,/);
    });

    it('should include the accent color', () => {
      const svg = resolveDashboardMockup('#ff0000');
      expect(svg).toContain('%23ff0000');
    });

    it('should default to indigo accent', () => {
      const svg = resolveDashboardMockup();
      expect(svg).toContain('6366f1');
    });

    it('should be deterministic', () => {
      const a = resolveDashboardMockup('#abc');
      const b = resolveDashboardMockup('#abc');
      expect(a).toBe(b);
    });
  });

  describe('resolveIconSvg', () => {
    it('should resolve known keywords to SVG', () => {
      const svg = resolveIconSvg('lightning');
      expect(svg).toContain('<svg');
      expect(svg).toContain('polygon');
    });

    it('should resolve security to shield icon', () => {
      const svg = resolveIconSvg('security');
      expect(svg).toContain('<svg');
    });

    it('should resolve analytics to chart icon', () => {
      const svg = resolveIconSvg('analytics');
      expect(svg).toContain('<svg');
    });

    it('should resolve unknown keywords to default layers icon', () => {
      const svg = resolveIconSvg('xyzzy-unknown');
      expect(svg).toContain('<svg');
    });

    it('should resolve email to mail icon', () => {
      const svg = resolveIconSvg('email notification');
      expect(svg).toContain('<svg');
    });
  });

  describe('SVG_ICONS', () => {
    it('should have at least 20 icon functions', () => {
      expect(Object.keys(SVG_ICONS).length).toBeGreaterThanOrEqual(20);
    });

    it('each icon function should return SVG string', () => {
      for (const [name, fn] of Object.entries(SVG_ICONS)) {
        const svg = fn();
        expect(svg).toContain('<svg');
        expect(svg).toContain('xmlns');
      }
    });

    it('each icon should accept optional color parameter', () => {
      for (const [name, fn] of Object.entries(SVG_ICONS)) {
        const svg = fn('#ff0000');
        expect(svg).toContain('#ff0000');
      }
    });
  });
});
