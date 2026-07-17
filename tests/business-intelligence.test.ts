/**
 * Business Intelligence Engine — tests
 *
 * Proves the engine reasons about businesses from primitive signals
 * (workflows / customers / goals) rather than keyword→vertical lookups.
 * No test asserts any hardcoded vertical template.
 */

import { describe, it, expect } from 'vitest';
import { understandBusiness } from '../src/orchestration/business-intelligence/index.js';
import { extractSignals } from '../src/orchestration/business-intelligence/dimensions.js';

describe('Business Intelligence Engine', () => {
  it('understands a coffee business as a Cafe, not a generic Restaurant', () => {
    const bk = understandBusiness('build me a modern coffee website for Indian customers');
    expect(bk.discovery.industry).toBe('food-and-beverage');
    expect(bk.discovery.businessType.toLowerCase()).toContain('cafe');
    // The legacy "restaurant" vertical must NOT leak into the business type
    expect(bk.discovery.businessType.toLowerCase()).not.toBe('restaurant');
    expect(bk.discovery.businessType.toLowerCase()).not.toContain('restaurant');
  });

  it('derives India-specific compliance (FSSAI) for a beverage business', () => {
    const bk = understandBusiness('a modern coffee shop in Bangalore');
    const packs = bk.compliance.map((c) => c.pack);
    expect(packs).toContain('compliance.fssai');
    expect(packs).toContain('compliance.pci-dss'); // card payments present
  });

  it('discriminates cafe / roastery / subscription / marketplace from primitives', () => {
    const cafe = understandBusiness('a specialty coffee cafe with takeaway in Mumbai');
    const roastery = understandBusiness('a coffee roastery supplying cafes wholesale in India');
    const sub = understandBusiness('a coffee subscription service delivering beans monthly');
    const market = understandBusiness('a coffee marketplace connecting roasters and drinkers');

    expect(cafe.discovery.businessType.toLowerCase()).toContain('cafe');
    expect(roastery.discovery.businessType.toLowerCase()).toContain('roastery');
    expect(roastery.discovery.niche).toBe('wholesale');
    expect(sub.discovery.niche).toBe('subscription');
    expect(market.discovery.niche).toBe('marketplace');
  });

  it('produces generic, vertical-agnostic data entities (no coffee-specific content)', () => {
    const bk = understandBusiness('a modern coffee website for Indian customers');
    const entityNames = bk.entities.map((e) => e.name);
    expect(entityNames).toContain('User');
    expect(entityNames).toContain('Order');
    expect(entityNames).toContain('Product');
    // No hardcoded "Espresso" / "Latte" entity — that would be a vertical template
    expect(entityNames.some((n) => /espresso|latte|brew/i.test(n))).toBe(false);
  });

  it('distinguishes a health service (clinic) by appointment + service signals', () => {
    const bk = understandBusiness('a dentist clinic with online appointment booking');
    expect(bk.discovery.businessType.toLowerCase()).toContain('clinic');
    expect(bk.discovery.industry).toBe('services');
    const kinds = bk.workflows.map((w) => w.kind);
    expect(kinds).toContain('booking');
  });

  it('classifies a SaaS product as software, not a vertical', () => {
    const bk = understandBusiness('a SaaS CRM for sales teams with pipeline management');
    expect(bk.discovery.industry).toBe('software');
    expect(['SaaS', 'B2B Platform']).toContain(bk.discovery.businessType);
  });

  it('maps the same product-nature primitive for coffee and juice (no special-casing)', () => {
    const coffee = extractSignals('a coffee shop');
    const juice = extractSignals('a juice bar');
    const coffeeBev = coffee.some((s) => s.dimension === 'product-nature' && s.value === 'beverage');
    const juiceBev = juice.some((s) => s.dimension === 'product-nature' && s.value === 'beverage');
    expect(coffeeBev).toBe(true);
    expect(juiceBev).toBe(true); // both resolve to the SAME primitive
  });

  it('exposes the full BusinessKnowledge contract (no missing sections)', () => {
    const bk = understandBusiness('an online supplement store for Indian fitness buyers');
    expect(bk.version).toBeDefined();
    expect(bk.customerPersonas.length).toBeGreaterThan(0);
    expect(bk.userRoles.length).toBeGreaterThan(0);
    expect(bk.customerJourney.stages.length).toBeGreaterThan(0);
    expect(bk.workflows.length).toBeGreaterThan(0);
    expect(bk.revenue.model).toBeDefined();
    expect(bk.acquisition.length).toBeGreaterThan(0);
    expect(bk.retention.strategy).toBeDefined();
    expect(bk.kpis.length).toBeGreaterThan(0);
    expect(bk.entities.length).toBeGreaterThan(0);
    expect(bk.pages.length).toBeGreaterThan(0);
    expect(bk.dashboards.length).toBeGreaterThan(0);
    expect(bk.automations.length).toBeGreaterThan(0);
    expect(bk.integrations.length).toBeGreaterThan(0);
    expect(bk.vocabulary.terms).toBeDefined();
    expect(bk.contentStrategy).toBeDefined();
    expect(bk.designStrategy).toBeDefined();
    expect(bk.experienceGoals).toBeDefined();
  });

  it('derives vocabulary from primitives, not a hardcoded dictionary', () => {
    const bk = understandBusiness('a modern coffee website for Indian customers');
    // For a beverage business the product term should be a menu/item term
    expect(bk.vocabulary.terms['product']).toMatch(/item|product/i);
    // Domain nouns are extracted GENERICALLY (linguistic salience), not from a
    // curated industry list. The user's own product word IS captured — proving
    // no hardcoded dictionary — while scaffolding/stopwords are dropped.
    expect(bk.vocabulary.domainNouns).toContain('coffee'); // the user's own word
    const novelBk = understandBusiness('a futuristic headphone website where every scroll transforms noise into silence');
    expect(novelBk.vocabulary.domainNouns).toContain('headphone'); // novel noun captured generically
    expect(novelBk.vocabulary.domainNouns).not.toContain('every'); // stopword excluded
  });
});
