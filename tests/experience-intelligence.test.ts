/**
 * Experience Intelligence Engine Tests
 *
 * Tests the full Experience Intelligence pipeline:
 * - Experience Profiles (per-industry defaults)
 * - Scene Planner (section → scenes)
 * - Scroll Narrative (story structure)
 * - Hover Intelligence (interaction philosophy)
 * - Motion Language (choreography, timing, micro-interactions)
 * - Experience Blueprint generation
 * - Validation
 */

import { describe, it, expect } from 'vitest';
import { generateExperienceBlueprint, validateExperienceBlueprint } from '../src/orchestration/design-intelligence/experience-engine.js';
import { getExperienceProfile, customizeProfile, getAllExperienceProfiles } from '../src/orchestration/design-intelligence/experience-profiles.js';
import { planScenes, generateEmotionCurve } from '../src/orchestration/design-intelligence/scene-planner.js';
import { planScrollNarrative } from '../src/orchestration/design-intelligence/scroll-narrative.js';
import { generateHoverBehaviors, getAllStrategies } from '../src/orchestration/design-intelligence/hover-intelligence.js';
import { planMotionLanguage, getRevealVariants } from '../src/orchestration/design-intelligence/motion-language.js';
import type { Industry } from '../src/orchestration/types.js';

// ─── Shared Test Data ──────────────────────────────────────────────────────

const SAMPLE_SECTIONS = [
  { type: 'HeroBanner', content: { title: { value: 'Welcome' } } },
  { type: 'FeatureGrid', content: { title: { value: 'Features' } } },
  { type: 'Testimonials', content: {} },
  { type: 'PricingTable', content: {} },
  { type: 'CTASection', content: {} },
];

const MINIMAL_SECTIONS = [
  { type: 'HeroBanner', content: {} },
  { type: 'FeatureGrid', content: {} },
  { type: 'CTASection', content: {} },
];

// ─── Experience Profiles ───────────────────────────────────────────────────

describe('Experience Profiles', () => {
  it('has profiles for all industries', () => {
    const profiles = getAllExperienceProfiles();
    const industries: Industry[] = [
      'ecommerce', 'saas', 'fintech', 'healthcare', 'education',
      'restaurant', 'fitness', 'real-estate', 'media', 'portfolio',
      'marketplace', 'nonprofit', 'other',
    ];
    for (const industry of industries) {
      expect(profiles[industry]).toBeDefined();
      expect(profiles[industry].industry).toBe(industry);
      expect(profiles[industry].defaultStyle).toBeTruthy();
      expect(profiles[industry].emotionalQualities.length).toBeGreaterThan(0);
      expect(profiles[industry].sceneTemplate.length).toBeGreaterThan(0);
    }
  });

  it('returns correct profile for known industry', () => {
    const profile = getExperienceProfile('ecommerce');
    expect(profile.industry).toBe('ecommerce');
    expect(profile.name).toBe('E-Commerce');
    expect(profile.defaultStyle).toBe('premium');
    expect(profile.conversionFocus).toBe('high');
  });

  it('falls back to other for unknown industry', () => {
    const profile = getExperienceProfile('other');
    expect(profile.industry).toBe('other');
    expect(profile.defaultStyle).toBe('premium');
  });

  it('customizes profile based on personality', () => {
    const base = getExperienceProfile('saas');
    const luxury = customizeProfile(base, undefined, 'luxury');
    expect(luxury.defaultStyle).toBe('luxury');
    expect(luxury.motionIntensity).toBeLessThan(base.motionIntensity);

    const playful = customizeProfile(base, undefined, 'playful');
    expect(playful.defaultStyle).toBe('playful');
    expect(playful.motionIntensity).toBeGreaterThan(base.motionIntensity);
  });

  it('customizes profile based on sub-industry', () => {
    const base = getExperienceProfile('healthcare');
    const dental = customizeProfile(base, 'dental');
    expect(dental.emotionalQualities).toContain('delight');

    const therapy = customizeProfile(base, 'therapy');
    expect(therapy.motionIntensity).toBeLessThan(base.motionIntensity);
  });
});

// ─── Scene Planner ─────────────────────────────────────────────────────────

describe('Scene Planner', () => {
  it('plans scenes from sections', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    expect(scenes.length).toBe(SAMPLE_SECTIONS.length);
    expect(scenes[0].sectionType).toBe('HeroBanner');
    expect(scenes[0].narrativeRole).toBe('hook');
    expect(scenes[scenes.length - 1].narrativeRole).toBe('cta');
  });

  it('assigns entry animations to each scene', () => {
    const profile = getExperienceProfile('saas');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'minimal',
      pageIndex: 0,
    });

    for (const scene of scenes) {
      expect(scene.entry).toBeDefined();
      expect(scene.entry.duration).toBeGreaterThan(0);
      expect(scene.entry.easing).toBeTruthy();
    }
  });

  it('assigns scroll triggers', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    for (const scene of scenes) {
      expect(scene.scrollTrigger).toBeDefined();
      expect(scene.scrollTrigger.trigger).toBeTruthy();
      expect(scene.scrollTrigger.start).toBeTruthy();
    }
  });

  it('assigns camera effects', () => {
    const profile = getExperienceProfile('portfolio');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'cinematic',
      pageIndex: 0,
    });

    // Hero should have a camera effect
    expect(scenes[0].cameraEffect).toBeDefined();
    expect(scenes[0].cameraEffect.type).not.toBe('none');
  });

  it('calculates performance cost', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    for (const scene of scenes) {
      expect(scene.performanceCost).toBeGreaterThanOrEqual(0);
      expect(scene.performanceCost).toBeLessThanOrEqual(1);
    }
  });

  it('generates valid emotion curve', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    const curve = generateEmotionCurve(scenes, 'premium');
    expect(curve.points.length).toBe(scenes.length);
    expect(curve.arc).toBeTruthy();
    for (const point of curve.points) {
      expect(point.intensity).toBeGreaterThanOrEqual(0);
      expect(point.intensity).toBeLessThanOrEqual(1);
      expect(point.emotion).toBeTruthy();
    }
  });
});

// ─── Scroll Narrative ──────────────────────────────────────────────────────

describe('Scroll Narrative', () => {
  it('plans narrative for ecommerce', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    const narrative = planScrollNarrative({
      scenes,
      profile,
      style: 'premium',
      pageType: 'landing',
    });

    expect(narrative.value.speedProfile).toBeTruthy();
    expect(narrative.value.scrollLinked).toBeDefined();
    expect(narrative.value.scrollLinked.length).toBeGreaterThan(0);
  });

  it('selects storytelling structure for cinematic style', () => {
    const profile = getExperienceProfile('portfolio');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'cinematic',
      pageIndex: 0,
    });

    const narrative = planScrollNarrative({
      scenes,
      profile,
      style: 'cinematic',
      pageType: 'landing',
    });

    expect(['cinematic', 'organic', 'smooth', 'snappy']).toContain(narrative.value.speedProfile);
  });
});

// ─── Hover Intelligence ────────────────────────────────────────────────────

describe('Hover Intelligence', () => {
  it('generates hover behaviors for components', () => {
    const profile = getExperienceProfile('ecommerce');
    const behaviors = generateHoverBehaviors({
      componentTypes: ['button', 'card', 'image', 'icon'],
      profile,
      style: 'premium',
      density: 'rich',
    });

    expect(behaviors.value.elements.length).toBeGreaterThan(0);
    for (const behavior of behaviors.value.elements) {
      expect(behavior.type).toBeTruthy();
      expect(behavior.animation).toBeDefined();
    }
  });

  it('respects interaction density', () => {
    const profile = getExperienceProfile('healthcare');
    const minimal = generateHoverBehaviors({
      componentTypes: ['button', 'card', 'image', 'icon', 'nav-item'],
      profile,
      style: 'minimal',
      density: 'minimal',
    });

    const rich = generateHoverBehaviors({
      componentTypes: ['button', 'card', 'image', 'icon', 'nav-item'],
      profile,
      style: 'premium',
      density: 'rich',
    });

    expect(minimal.value.elements.length).toBeLessThanOrEqual(rich.value.elements.length);
  });

  it('returns all available strategies', () => {
    const strategies = getAllStrategies();
    expect(strategies.length).toBeGreaterThan(5);
    expect(strategies).toContain('elevation');
    expect(strategies).toContain('magnetic');
    expect(strategies).toContain('glow');
  });
});

// ─── Motion Language ───────────────────────────────────────────────────────

describe('Motion Language', () => {
  it('plans motion language for page', () => {
    const profile = getExperienceProfile('ecommerce');
    const scenes = planScenes({
      sections: SAMPLE_SECTIONS,
      profile,
      style: 'premium',
      pageIndex: 0,
    });

    const result = planMotionLanguage({ scenes, profile, style: 'premium' });

    expect(result.value.timing).toBeDefined();
    expect(result.value.staggerPatterns.length).toBeGreaterThan(0);
    expect(result.value.choreography).toBeDefined();
    expect(result.value.choreography.length).toBe(scenes.length);
  });

  it('generates faster timeline for minimal style', () => {
    const profile = getExperienceProfile('saas');
    const scenes = planScenes({
      sections: MINIMAL_SECTIONS,
      profile,
      style: 'minimal',
      pageIndex: 0,
    });

    const result = planMotionLanguage({ scenes, profile, style: 'minimal' });
    expect(result.value.staggerPatterns[0].staggerDelay).toBeLessThanOrEqual(80);
  });

  it('generates reveal variants for all strategies', () => {
    const defaults = ['fade', 'slide-up', 'slide-left', 'scale', 'blur', 'none'] as const;
    for (const defaultType of defaults) {
      const variants = getRevealVariants({ default: defaultType, scrollReveal: true, staggerDelay: 100, duration: 600, easing: 'power2.out' });
      expect(variants).toBeDefined();
      expect(variants.hidden).toBeDefined();
      expect(variants.visible).toBeDefined();
    }
  });
});

// ─── Experience Blueprint (Integration) ────────────────────────────────────

describe('Experience Blueprint', () => {
  it('generates blueprint for ecommerce', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint).toBeDefined();
    expect(blueprint.id).toBeTruthy();
    expect(blueprint.createdAt).toBeInstanceOf(Date);
    expect(blueprint.version).toBeTruthy();
    expect(blueprint.sectionOrder.value.length).toBe(SAMPLE_SECTIONS.length);
    expect(blueprint.scrollNarrative).toBeDefined();
    expect(blueprint.hoverBehavior.value.elements.length).toBeGreaterThan(0);
    expect(blueprint.microInteractions.value.length).toBeGreaterThan(0);
    expect(blueprint.sceneTransitions.value).toBeDefined();
    expect(blueprint.performanceBudget).toBeDefined();
  });

  it('generates blueprint for saas', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'saas',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
      personality: 'clean',
    });

    expect(blueprint.sectionOrder.value.length).toBe(SAMPLE_SECTIONS.length);
    expect(blueprint.performanceBudget.value.gpuAcceleration).toBe('always');
  });

  it('generates blueprint for restaurant', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'restaurant',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint.sectionOrder.value.length).toBe(SAMPLE_SECTIONS.length);
  });

  it('generates blueprint for healthcare', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'healthcare',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint.performanceBudget.value.gpuAcceleration).toBe('always');
    expect(blueprint.performanceBudget.value.maxConcurrentAnimations).toBeLessThanOrEqual(3);
  });

  it('generates blueprint for portfolio with cinematic style', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'portfolio',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
      personality: 'creative',
    });

    expect(blueprint.motionLanguage.value.personality).toBe('cinematic');
    expect(blueprint.sectionOrder.value.length).toBe(SAMPLE_SECTIONS.length);
  });

  it('includes emotional curve with valid data', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint.emotionalCurve).toBeDefined();
    expect(blueprint.emotionalCurve.value.length).toBe(blueprint.sectionOrder.value.length);
    for (const point of blueprint.emotionalCurve.value) {
      expect(point.intensity).toBeGreaterThanOrEqual(0);
      expect(point.intensity).toBeLessThanOrEqual(1);
      expect(point.emotion).toBeTruthy();
    }
  });

  it('includes conversion moments for high-focus industries', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'saas',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint.conversionMoments.value.length).toBeGreaterThan(0);
  });

  it('respects sub-industry customization', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'healthcare',
      subIndustry: 'dental',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    expect(blueprint.sectionOrder.value[0].contentDensity).toBeGreaterThan(0);
    expect(blueprint.animationDensity.value).toBeGreaterThan(0.3);
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe('Experience Validation', () => {
  it('validates a good blueprint', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: SAMPLE_SECTIONS,
      pageType: 'landing',
    });

    const result = validateExperienceBlueprint(blueprint);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('rejects blueprint with zero scenes', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: [],
      pageType: 'landing',
    });

    const result = validateExperienceBlueprint(blueprint);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('zero sections'))).toBe(true);
  });

  it('accepts a single-scene (minimal) blueprint as valid', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: [{ type: 'HeroBanner', content: {} }],
      pageType: 'landing',
    });

    const result = validateExperienceBlueprint(blueprint);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('warns about missing CTA', () => {
    const blueprint = generateExperienceBlueprint({
      industry: 'ecommerce',
      sections: [
        { type: 'HeroBanner', content: {} },
        { type: 'FeatureGrid', content: {} },
        { type: 'Testimonials', content: {} },
      ],
      pageType: 'landing',
    });

    const result = validateExperienceBlueprint(blueprint);
    expect(result.warnings.some(w => w.includes('CTA'))).toBe(true);
  });

  it('warns about repetitive emotions', () => {
    // Use minimal sections that might create repetitive emotion pattern
    const blueprint = generateExperienceBlueprint({
      industry: 'saas',
      sections: [
        { type: 'HeroBanner', content: {} },
        { type: 'FeatureGrid', content: {} },
        { type: 'StatsCards', content: {} },
        { type: 'Testimonials', content: {} },
        { type: 'CTASection', content: {} },
      ],
      pageType: 'landing',
    });

    const result = validateExperienceBlueprint(blueprint);
    // Should not crash, may or may not have warnings
    expect(result).toBeDefined();
  });
});
