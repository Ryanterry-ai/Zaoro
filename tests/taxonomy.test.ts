import { describe, it, expect, beforeEach } from 'vitest';
import {
  deriveLegacyIndustry,
  deriveLegacySubIndustry,
  deriveLegacyDomain,
  buildTaxonomyPath,
  validateTaxonomyPath,
  findTaxonomyByAlias,
  getTaxonomyChildren,
} from '../src/taxonomy/types.js';
import { DEFAULT_TAXONOMY } from '../src/taxonomy/default-taxonomy.js';
import {
  initializePackRegistry,
  getPackByPath,
  getPackByAlias,
  findPacksByKeyword,
  getPackCount,
  hasPack,
} from '../src/taxonomy/pack-registry.js';
import { RETAIL_FOOTWEAR_PACK } from '../src/taxonomy/packs/retail-footwear.js';
import { SERVICES_HEALTHCARE_VETERINARY_PACK } from '../src/taxonomy/packs/services-healthcare-veterinary.js';
import { resolveKnowledgePack } from '../src/taxonomy/resolver.js';
import {
  getIndustryCopyFromPack,
  getDesignProfileFromPack,
  getDomainDataFromPack,
  getExperienceFromPack,
  getVocabularyFromPack,
  getPagesFromPack,
  getFeaturesFromPack,
} from '../src/taxonomy/pack-bridge.js';
import {
  recordResolution,
  getUsageStats,
  getPackRecommendations,
  clearLearningData,
} from '../src/taxonomy/learning.js';

describe('Universal Business Taxonomy', () => {
  describe('deriveLegacyIndustry', () => {
    it('maps retail to ecommerce', () => {
      expect(deriveLegacyIndustry('retail')).toBe('ecommerce');
    });
    it('maps retail/footwear to ecommerce', () => {
      expect(deriveLegacyIndustry('retail/footwear')).toBe('ecommerce');
    });
    it('maps retail/footwear/athletic to ecommerce', () => {
      expect(deriveLegacyIndustry('retail/footwear/athletic')).toBe('ecommerce');
    });
    it('maps services/healthcare to healthcare', () => {
      expect(deriveLegacyIndustry('services/healthcare')).toBe('healthcare');
    });
    it('maps software/saas to saas', () => {
      expect(deriveLegacyIndustry('software/saas')).toBe('saas');
    });
    it('maps food-and-beverage/restaurant to restaurant', () => {
      expect(deriveLegacyIndustry('food-and-beverage/restaurant')).toBe('restaurant');
    });
    it('maps services/fitness to fitness', () => {
      expect(deriveLegacyIndustry('services/fitness')).toBe('fitness');
    });
    it('maps services/real-estate to real-estate', () => {
      expect(deriveLegacyIndustry('services/real-estate')).toBe('real-estate');
    });
    it('maps education to education', () => {
      expect(deriveLegacyIndustry('education')).toBe('education');
    });
    it('maps creative/portfolio to portfolio', () => {
      expect(deriveLegacyIndustry('creative/portfolio')).toBe('portfolio');
    });
    it('returns other for unknown paths', () => {
      expect(deriveLegacyIndustry('unknown/industry/path')).toBe('other');
    });
  });

  describe('deriveLegacySubIndustry', () => {
    it('returns empty for single segment', () => {
      expect(deriveLegacySubIndustry('retail')).toBe('');
    });
    it('joins segments after first with dash', () => {
      expect(deriveLegacySubIndustry('retail/footwear')).toBe('footwear');
    });
    it('joins three segments', () => {
      expect(deriveLegacySubIndustry('retail/footwear/athletic')).toBe('footwear-athletic');
    });
  });

  describe('deriveLegacyDomain', () => {
    it('maps retail to retail', () => {
      expect(deriveLegacyDomain('retail')).toBe('retail');
    });
    it('maps software to technology', () => {
      expect(deriveLegacyDomain('software')).toBe('technology');
    });
  });

  describe('buildTaxonomyPath', () => {
    it('builds path from segments', () => {
      expect(buildTaxonomyPath('retail', 'footwear')).toBe('retail/footwear');
    });
    it('normalizes to lowercase kebab-case', () => {
      expect(buildTaxonomyPath('Retail', 'Foot Wear')).toBe('retail/foot-wear');
    });
    it('filters empty segments', () => {
      expect(buildTaxonomyPath('retail', '', 'footwear')).toBe('retail/footwear');
    });
  });

  describe('DEFAULT_TAXONOMY', () => {
    it('has nodes', () => {
      expect(DEFAULT_TAXONOMY.nodes.length).toBeGreaterThan(0);
    });
    it('has version', () => {
      expect(DEFAULT_TAXONOMY.version).toBe('1.0.0');
    });
    it('includes retail/footwear', () => {
      const node = DEFAULT_TAXONOMY.nodes.find(n => n.slug === 'retail/footwear');
      expect(node).toBeDefined();
      expect(node?.label).toBe('Footwear');
    });
  });

  describe('validateTaxonomyPath', () => {
    it('finds existing node', () => {
      const node = validateTaxonomyPath('retail/footwear', DEFAULT_TAXONOMY);
      expect(node).toBeDefined();
      expect(node?.slug).toBe('retail/footwear');
    });
    it('returns undefined for non-existent path', () => {
      const node = validateTaxonomyPath('nonexistent/path', DEFAULT_TAXONOMY);
      expect(node).toBeUndefined();
    });
  });

  describe('findTaxonomyByAlias', () => {
    it('finds footwear by alias', () => {
      const node = findTaxonomyByAlias('shoes', DEFAULT_TAXONOMY);
      expect(node).toBeDefined();
      expect(node?.slug).toBe('retail/footwear');
    });
    it('finds healthcare by alias', () => {
      const node = findTaxonomyByAlias('medical', DEFAULT_TAXONOMY);
      expect(node).toBeDefined();
      expect(node?.slug).toBe('services/healthcare');
    });
    it('returns undefined for unknown alias', () => {
      const node = findTaxonomyByAlias('unknown', DEFAULT_TAXONOMY);
      expect(node).toBeUndefined();
    });
  });

  describe('getTaxonomyChildren', () => {
    it('finds children of retail', () => {
      const children = getTaxonomyChildren('retail', DEFAULT_TAXONOMY);
      expect(children.length).toBeGreaterThan(0);
      expect(children.some(c => c.slug === 'retail/footwear')).toBe(true);
    });
    it('returns empty for leaf node', () => {
      const children = getTaxonomyChildren('retail/footwear/athletic', DEFAULT_TAXONOMY);
      expect(children.length).toBe(0);
    });
  });
});

describe('Knowledge Pack Registry', () => {
  beforeEach(() => {
    initializePackRegistry();
  });

  it('has built-in packs', () => {
    expect(getPackCount()).toBeGreaterThan(0);
  });
  it('has retail/footwear pack', () => {
    expect(hasPack('retail/footwear')).toBe(true);
  });
  it('gets pack by path', () => {
    const pack = getPackByPath('retail/footwear');
    expect(pack).toBeDefined();
    expect(pack?.id).toBe('retail/footwear');
  });
  it('gets pack by alias', () => {
    const pack = getPackByAlias('shoes');
    expect(pack).toBeDefined();
    expect(pack?.id).toBe('retail/footwear');
  });
  it('finds packs by keyword', () => {
    const paths = findPacksByKeyword('sneaker');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain('retail/footwear');
  });
  it('returns empty for unknown keyword', () => {
    const paths = findPacksByKeyword('xyzunknown');
    expect(paths.length).toBe(0);
  });
});

describe('RETAIL_FOOTWEAR_PACK', () => {
  it('has correct id and taxonomy path', () => {
    expect(RETAIL_FOOTWEAR_PACK.id).toBe('retail/footwear');
    expect(RETAIL_FOOTWEAR_PACK.taxonomyPath).toBe('retail/footwear');
  });
  it('has aliases and detection keywords', () => {
    expect(RETAIL_FOOTWEAR_PACK.aliases).toContain('shoes');
    expect(RETAIL_FOOTWEAR_PACK.detectionKeywords).toContain('sneaker');
  });
  it('has copy with hero', () => {
    expect(RETAIL_FOOTWEAR_PACK.copy.heroHeading).toContain('Footwear');
    expect(RETAIL_FOOTWEAR_PACK.copy.heroPrimaryButton).toBe('Shop Collection');
  });
  it('has domain data with products', () => {
    expect(RETAIL_FOOTWEAR_PACK.domainData.products.length).toBe(6);
  });
  it('has design profile', () => {
    expect(RETAIL_FOOTWEAR_PACK.design.personality).toBe('bold');
    expect(RETAIL_FOOTWEAR_PACK.design.colorHint).toBe('#FF4500');
  });
  it('has visual palette', () => {
    expect(RETAIL_FOOTWEAR_PACK.visual.palette.primary).toBe('#FF4500');
  });
  it('has experience profile', () => {
    expect(RETAIL_FOOTWEAR_PACK.experience.defaultStyle).toBe('energetic');
  });
  it('has workflows, entities, pages', () => {
    expect(RETAIL_FOOTWEAR_PACK.workflows.length).toBeGreaterThan(0);
    expect(RETAIL_FOOTWEAR_PACK.entities.length).toBeGreaterThan(0);
    expect(RETAIL_FOOTWEAR_PACK.pages.length).toBeGreaterThan(0);
  });
  it('has vocabulary', () => {
    expect(RETAIL_FOOTWEAR_PACK.vocabulary['product']).toBe('shoe');
  });
  it('has compliance and integrations', () => {
    expect(RETAIL_FOOTWEAR_PACK.compliance.length).toBeGreaterThan(0);
    expect(RETAIL_FOOTWEAR_PACK.integrations.length).toBeGreaterThan(0);
  });
});

describe('Knowledge Pack Resolver', () => {
  it('classifies sneaker prompt to retail/footwear', () => {
    const result = resolveKnowledgePack('Build me a premium sneaker store for runners');
    expect(result.classification.vertical.path).toBe('retail/footwear');
    expect(result.pack).toBeDefined();
    expect(result.pack?.id).toBe('retail/footwear');
    expect(result.matchMethod).toMatch(/alias|exact-path/);
    expect(result.matchConfidence).toBeGreaterThan(0.7);
  });

  it('classifies shoe prompt to retail/footwear', () => {
    const result = resolveKnowledgePack('Create an online shoe shop');
    expect(result.classification.vertical.path).toBe('retail/footwear');
    expect(result.pack).toBeDefined();
  });

  it('classifies restaurant prompt', () => {
    const result = resolveKnowledgePack('Build a restaurant website with menu');
    expect(result.classification.vertical.path).toBe('food-and-beverage/restaurant');
    expect(result.classification.legacyIndustry).toBe('restaurant');
  });

  it('classifies healthcare prompt', () => {
    const result = resolveKnowledgePack('Create a dental clinic booking site');
    expect(result.classification.vertical.path).toBe('services/healthcare/dental');
    expect(result.classification.legacyIndustry).toBe('healthcare');
  });

  it('classifies fitness prompt', () => {
    const result = resolveKnowledgePack('Build a gym membership website');
    expect(result.classification.vertical.path).toBe('services/fitness');
    expect(result.classification.legacyIndustry).toBe('fitness');
  });

  it('classifies saas prompt', () => {
    const result = resolveKnowledgePack('Create a SaaS dashboard with analytics');
    expect(result.classification.vertical.path).toBe('software/saas');
    expect(result.classification.legacyIndustry).toBe('saas');
  });

  it('detects subscription business model', () => {
    const result = resolveKnowledgePack('Build a monthly subscription site');
    expect(result.classification.businessModel.primary).toBe('subscription');
  });

  it('detects subscription-box business model', () => {
    const result = resolveKnowledgePack('Build a monthly subscription box site');
    expect(result.classification.businessModel.primary).toBe('subscription-box');
  });

  it('detects startup maturity', () => {
    const result = resolveKnowledgePack('Build an MVP for my startup');
    expect(result.classification.maturity.level).toBe('startup');
  });

  it('detects b2b audience', () => {
    const result = resolveKnowledgePack('Build a B2B enterprise dashboard');
    expect(result.classification.audience.scope).toBe('b2b');
  });

  it('returns backward-compatible fields', () => {
    const result = resolveKnowledgePack('Build me a sneaker store');
    expect(result.classification.industry).toBeDefined();
    expect(result.classification.legacyIndustry).toBeDefined();
    expect(result.classification.domain).toBeDefined();
  });

  it('returns evidence signals', () => {
    const result = resolveKnowledgePack('Build me a sneaker store');
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].dimension).toBeDefined();
    expect(result.evidence[0].weight).toBeGreaterThan(0);
  });
});

describe('Pack Bridge (Backward Compatibility)', () => {
  it('getIndustryCopyFromPack returns footwear copy', () => {
    const copy = getIndustryCopyFromPack('ecommerce', 'footwear');
    expect(copy.heroHeading).toContain('Footwear');
    expect(copy.heroPrimaryButton).toBe('Shop Collection');
  });

  it('getIndustryCopyFromPack returns generic copy for unknown industry', () => {
    const copy = getIndustryCopyFromPack('unknown-industry');
    expect(copy.heroHeading).toBeDefined();
    expect(copy.heroPrimaryButton).toBeDefined();
  });

  it('getDesignProfileFromPack returns footwear design', () => {
    const design = getDesignProfileFromPack('ecommerce', 'footwear');
    expect(design).toBeDefined();
    expect(design?.personality).toBe('bold');
    expect(design?.colorHint).toBe('#FF4500');
  });

  it('getDesignProfileFromPack returns null for unknown industry', () => {
    const design = getDesignProfileFromPack('unknown-industry');
    expect(design).toBeNull();
  });

  it('getDomainDataFromPack returns footwear products', () => {
    const data = getDomainDataFromPack('ecommerce', 'footwear');
    expect(data).toBeDefined();
    expect(data?.products.length).toBe(6);
  });

  it('getExperienceFromPack returns footwear experience', () => {
    const exp = getExperienceFromPack('ecommerce', 'footwear');
    expect(exp).toBeDefined();
    expect(exp?.defaultStyle).toBe('energetic');
  });

  it('getVocabularyFromPack returns footwear vocabulary', () => {
    const vocab = getVocabularyFromPack('ecommerce', 'footwear');
    expect(vocab['product']).toBe('shoe');
    expect(vocab['customer']).toBe('runner');
  });

  it('getVocabularyFromPack returns empty for unknown industry', () => {
    const vocab = getVocabularyFromPack('unknown-industry');
    expect(Object.keys(vocab).length).toBe(0);
  });

  it('getPagesFromPack returns footwear pages', () => {
    const pages = getPagesFromPack('ecommerce', 'footwear');
    expect(pages.length).toBeGreaterThan(0);
    expect(pages[0].path).toBe('/');
  });

  it('getPagesFromPack returns generic pages for unknown industry', () => {
    const pages = getPagesFromPack('unknown-industry');
    expect(pages.length).toBe(3);
    expect(pages[0].path).toBe('/');
  });

  it('getFeaturesFromPack returns footwear features', () => {
    const features = getFeaturesFromPack('ecommerce', 'footwear');
    expect(features.length).toBeGreaterThan(0);
  });
});

describe('Learning Mechanism', () => {
  beforeEach(() => {
    clearLearningData();
  });

  it('records resolution events', () => {
    recordResolution({
      taxonomyPath: 'retail/footwear',
      confidence: 0.85,
      synthesized: false,
      matchMethod: 'alias',
      prompt: 'Build me a sneaker store',
      classification: {
        version: '1.0.0',
        vertical: { path: 'retail/footwear', confidence: 0.85, evidence: [] },
        businessModel: { primary: 'direct-sales', confidence: 0.5 },
        maturity: { level: 'smb', confidence: 0.5 },
        audience: { scope: 'b2c', confidence: 0.4 },
        industry: 'retail',
        subIndustry: 'footwear',
        domain: 'footwear',
        legacyIndustry: 'ecommerce',
      },
      packId: 'retail/footwear',
    });

    const stats = getUsageStats();
    expect(stats.totalResolutions).toBe(1);
    expect(stats.byPath['retail/footwear']).toBe(1);
    expect(stats.byMethod['alias']).toBe(1);
  });

  it('tracks usage statistics', () => {
    // Record multiple resolutions
    for (let i = 0; i < 5; i++) {
      recordResolution({
        taxonomyPath: 'retail/footwear',
        confidence: 0.8 + i * 0.02,
        synthesized: false,
        matchMethod: 'alias',
        prompt: `Sneaker store ${i}`,
        classification: {
          version: '1.0.0',
          vertical: { path: 'retail/footwear', confidence: 0.8, evidence: [] },
          businessModel: { primary: 'direct-sales', confidence: 0.5 },
          maturity: { level: 'smb', confidence: 0.5 },
          audience: { scope: 'b2c', confidence: 0.4 },
          industry: 'retail',
          subIndustry: 'footwear',
          domain: 'footwear',
          legacyIndustry: 'ecommerce',
        },
        packId: 'retail/footwear',
      });
    }

    const stats = getUsageStats();
    expect(stats.totalResolutions).toBe(5);
    expect(stats.topPaths[0].path).toBe('retail/footwear');
    expect(stats.topPaths[0].count).toBe(5);
  });

  it('calculates average confidence', () => {
    recordResolution({
      taxonomyPath: 'retail/footwear',
      confidence: 0.9,
      synthesized: false,
      matchMethod: 'alias',
      prompt: 'Test 1',
      classification: {
        version: '1.0.0',
        vertical: { path: 'retail/footwear', confidence: 0.9, evidence: [] },
        businessModel: { primary: 'direct-sales', confidence: 0.5 },
        maturity: { level: 'smb', confidence: 0.5 },
        audience: { scope: 'b2c', confidence: 0.4 },
        industry: 'retail',
        subIndustry: 'footwear',
        domain: 'footwear',
        legacyIndustry: 'ecommerce',
      },
      packId: 'retail/footwear',
    });

    recordResolution({
      taxonomyPath: 'services/fitness',
      confidence: 0.7,
      synthesized: false,
      matchMethod: 'keyword',
      prompt: 'Test 2',
      classification: {
        version: '1.0.0',
        vertical: { path: 'services/fitness', confidence: 0.7, evidence: [] },
        businessModel: { primary: 'service-booking', confidence: 0.5 },
        maturity: { level: 'smb', confidence: 0.5 },
        audience: { scope: 'b2c', confidence: 0.4 },
        industry: 'services',
        subIndustry: 'fitness',
        domain: 'fitness',
        legacyIndustry: 'fitness',
      },
      packId: 'services/fitness',
    });

    const stats = getUsageStats();
    expect(stats.averageConfidence).toBeCloseTo(0.8, 1);
  });

  it('identifies low confidence paths for pack recommendations', () => {
    // Record multiple low-confidence resolutions for the same path
    for (let i = 0; i < 5; i++) {
      recordResolution({
        taxonomyPath: 'services/custom-industry',
        confidence: 0.3,
        synthesized: true,
        matchMethod: 'generic',
        prompt: `Custom business ${i}`,
        classification: {
          version: '1.0.0',
          vertical: { path: 'services/custom-industry', confidence: 0.3, evidence: [] },
          businessModel: { primary: 'direct-sales', confidence: 0.5 },
          maturity: { level: 'smb', confidence: 0.5 },
          audience: { scope: 'b2c', confidence: 0.4 },
          industry: 'services',
          subIndustry: 'custom-industry',
          domain: 'custom-industry',
          legacyIndustry: 'other',
        },
        packId: null,
      });
    }

    const recommendations = getPackRecommendations();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].path).toBe('services/custom-industry');
    expect(recommendations[0].priority).toBe('high');
  });
});

describe('SERVICES_HEALTHCARE_VETERINARY_PACK', () => {
  it('has correct id and taxonomy path', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.id).toBe('services/healthcare/veterinary');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.taxonomyPath).toBe('services/healthcare/veterinary');
  });

  it('has aliases', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.aliases).toContain('vet');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.aliases).toContain('veterinary');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.aliases).toContain('animal hospital');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.aliases).toContain('pet clinic');
  });

  it('has detection keywords', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.detectionKeywords.length).toBeGreaterThan(0);
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.detectionKeywords).toContain('veterinary');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.detectionKeywords).toContain('pet clinic');
  });

  it('has copy with hero', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.copy.heroHeading).toContain('Compassionate');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.copy.heroSubheading).toContain('veterinary');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.copy.heroPrimaryButton).toBe('Book Appointment');
  });

  it('has domain data with products', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.domainData.products.length).toBe(6);
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.domainData.products[0].name).toBe('Wellness Exam');
  });

  it('has design profile', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.design.personality).toBe('caring');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.design.colorHint).toBe('#059669');
  });

  it('has visual palette', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.visual.palette.primary).toBe('#059669');
  });

  it('has experience profile', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.experience.defaultStyle).toBe('caring');
  });

  it('has workflows', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.workflows.length).toBe(3);
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.workflows[0].name).toBe('Book Appointment');
  });

  it('has entities', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.entities.length).toBe(3);
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.entities[0].name).toBe('Patient');
  });

  it('has pages', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.pages.length).toBeGreaterThan(0);
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.pages[0].path).toBe('/');
  });

  it('has features', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.features.length).toBeGreaterThan(0);
  });

  it('has hero', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.hero.heading).toContain('Compassionate');
  });

  it('has vocabulary', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.vocabulary['customer']).toBe('pet parent');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.vocabulary['order']).toBe('appointment');
  });

  it('has compliance', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.compliance.length).toBeGreaterThan(0);
  });

  it('has integrations', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.integrations.length).toBeGreaterThan(0);
  });

  it('has KPIs', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.kpis.length).toBeGreaterThan(0);
  });

  it('has payment methods', () => {
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.paymentMethods).toContain('pet-insurance');
    expect(SERVICES_HEALTHCARE_VETERINARY_PACK.paymentMethods).toContain('care-credit');
  });
});

describe('Veterinary Pack Integration', () => {
  beforeEach(() => {
    initializePackRegistry();
  });

  it('is registered in the pack registry', () => {
    expect(hasPack('services/healthcare/veterinary')).toBe(true);
  });

  it('can be found by alias "vet"', () => {
    const pack = getPackByAlias('vet');
    expect(pack).toBeDefined();
    expect(pack?.id).toBe('services/healthcare/veterinary');
  });

  it('can be found by alias "pet clinic"', () => {
    const pack = getPackByAlias('pet clinic');
    expect(pack).toBeDefined();
    expect(pack?.id).toBe('services/healthcare/veterinary');
  });

  it('can be found by keyword "veterinary"', () => {
    const paths = findPacksByKeyword('veterinary');
    expect(paths).toContain('services/healthcare/veterinary');
  });

  it('can be found by keyword "pet clinic"', () => {
    const paths = findPacksByKeyword('pet clinic');
    expect(paths).toContain('services/healthcare/veterinary');
  });

  it('resolves from prompt "build a vet clinic website"', () => {
    const result = resolveKnowledgePack('Build a veterinary clinic website');
    expect(result.classification.vertical.path).toBe('services/healthcare/veterinary');
    expect(result.pack).toBeDefined();
    expect(result.pack?.id).toBe('services/healthcare/veterinary');
  });

  it('resolves from prompt with "animal hospital"', () => {
    const result = resolveKnowledgePack('Create an animal hospital booking site');
    expect(result.classification.vertical.path).toBe('services/healthcare/veterinary');
    expect(result.pack).toBeDefined();
  });

  it('returns correct legacy industry', () => {
    const result = resolveKnowledgePack('Build a vet clinic');
    expect(result.classification.legacyIndustry).toBe('healthcare');
  });

  it('has correct number of packs (2 built-in)', () => {
    expect(getPackCount()).toBe(2);
  });
});
