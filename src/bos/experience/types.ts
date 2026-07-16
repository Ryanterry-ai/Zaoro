// ─── Experience Director — Planning Types ───────────────────────────
// The Experience Director operates BEFORE the runtime Experience Intelligence
// layer.  It takes the Business Knowledge (industry, capabilities, intent) and
// the Content Blueprint (sections, narrative arc, conversion goals) and produces
// a scored set of experience *concepts* — high-level creative directions like
// "cinematic scroll", "3D immersive", "minimal luxury".  The selected concept
// then drives the runtime Experience Intelligence layer (scroll triggers,
// choreography, parallax, etc.) and the Component Library.
//
// This is what moves the system from "generate then critique" to
// "plan, compare, then generate."

import type { CapabilityId } from '../capabilities/types.js';

// ─── Experience Concept (what the Director scores) ──────────────────

export type ExperienceStyle =
  | 'cinematic'      // camera dolly, depth, storytelling
  | 'immersive-3d'   // Three.js scenes, interactive objects
  | 'minimal-luxe'   // glassmorphism, whitespace, premium feel
  | 'editorial'      // long-form scroll, narrative-driven
  | 'dynamic'        // motion-heavy, parallax, particle effects
  | 'conversion'     // CTA-first, funnel-optimized, trust signals
  | 'hybrid';        // blends 2+ styles deliberately

export interface ExperienceConcept {
  id: string;
  name: string;
  style: ExperienceStyle;
  tagline: string;                          // e.g. "Scrolling should feel like a camera dolly"
  description: string;
  motionPrinciples: string[];               // e.g. ['scroll-driven', 'parallax', 'depth-of-field']
  emotionalArc: string[];                   // ordered emotion targets per section
  conversionStrategy: string;               // how trust → action
  performanceProfile: 'light' | 'standard' | 'heavy' | 'cinematic';
  requiredCapabilities: CapabilityId[];     // canonical ids this concept demands
  pageLayout: 'single-scroll' | 'multi-page' | 'app-like';
  audienceAlignment: string[];              // e.g. ['audiophile', 'luxury-buyer']
}

// ─── Scoring ────────────────────────────────────────────────────────

export interface ConceptScore {
  conceptId: string;
  overallScore: number;                     // 0-100
  dimensionScores: {
    narrativeFit: number;                   // does the story arc match?
    capabilityFit: number;                  // do the required capabilities exist?
    conversionPotential: number;            // will it drive action?
    emotionalResonance: number;             // will it feel memorable?
    performanceFeasibility: number;         // can it hit 60fps?
    audienceMatch: number;                  // does the target audience want this?
  };
}

// ─── Blueprint (selected concept + full plan) ───────────────────────

export interface ExperienceBlueprintPlan {
  concept: ExperienceConcept;
  score: ConceptScore;
  sections: Array<{
    name: string;
    emotion: string;
    motionType: string;
    conversionRole: string;
  }>;
  motionScript: string;                     // narrative description of the scroll journey
  performanceBudget: {
    maxAnimatedElements: number;
    targetFrameRate: number;
    lazyLoadStrategy: string;
  };
  rendererHints: {
    framework: string;
    threeJsRequired: boolean;
    gsapRequired: boolean;
    lottieOpportunities: string[];
  };
}

// ─── Director Output ────────────────────────────────────────────────

export interface ExperienceDesign {
  selectedBlueprint: ExperienceBlueprintPlan | null;
  scoredCandidates: ConceptScore[];
  allCandidates: ExperienceConcept[];
  reasoning: string;
  experienceProfile: Record<string, unknown>;  // downstream consumption
}
