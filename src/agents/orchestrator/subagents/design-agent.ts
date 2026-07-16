/**
 * DesignAgent — reads UI/UX skill instructions and generates design briefs.
 *
 * Scope: ONE thing only — translate industry + business context into a
 * concrete design brief that the ReactRenderer can consume.
 *
 * Reads skill instructions from:
 * - ui-ux-pro-max (color palettes, typography, UX guidelines)
 * - frontend-design (production-grade interface patterns)
 * - motion-framer (animation patterns)
 * - high-end-visual-design (premium design standards)
 *
 * Output: DesignBrief with colors, typography, layout, animation, components
 */

import type { IDesignAgent, PhaseContext, AgentResult } from '../types.js';
import type { BREContext } from '../../../bos/reasoning/rules-engine.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Design Brief Types ──────────────────────────────────────────────────

export interface DesignBrief {
  /** Industry for design context */
  industry: string;
  /** Sub-industry for specific patterns */
  subIndustry?: string;

  /** Color system */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    card: string;
    border: string;
    success: string;
    warning: string;
    destructive: string;
    /** Color reasoning */
    reasoning: string;
  };

  /** Typography system */
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    /** Font pairing reasoning */
    reasoning: string;
  };

  /** Layout patterns */
  layout: {
    heroVariant: 'fullscreen' | 'split' | 'centered' | 'product';
    sectionSpacing: string;
    containerMaxWidth: string;
    gridColumns: { sm: number; md: number; lg: number };
    /** Layout reasoning */
    reasoning: string;
  };

  /** Animation patterns */
  animation: {
    library: 'framer-motion' | 'gsap' | 'css';
    defaultDuration: string;
    defaultEasing: string;
    scrollTriggered: boolean;
    /** Animation reasoning */
    reasoning: string;
  };

  /** Component patterns for this industry */
  components: Array<{
    type: string;
    variant: string;
    description: string;
    /** Tailwind classes for this component */
    classes: string;
  }>;

  /** UX guidelines specific to this build */
  uxGuidelines: string[];

  /** Design style keywords */
  styleKeywords: string[];
}

// ─── Industry → Design Mappings ─────────────────────────────────────────

const INDUSTRY_DESIGNS: Record<string, Partial<DesignBrief>> = {
  ecommerce: {
    colors: {
      primary: '#10B981',
      secondary: '#6366F1',
      accent: '#F59E0B',
      background: '#09090B',
      foreground: '#FAFAFA',
      muted: '#27272A',
      card: '#18181B',
      border: '#27272A',
      success: '#10B981',
      warning: '#F59E0B',
      destructive: '#EF4444',
      reasoning: 'Green primary for trust/conversion, indigo secondary for premium feel, amber accent for CTAs. Dark background for modern ecommerce.',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      reasoning: 'Inter for clean readability at all sizes. High contrast for product prices and CTAs.',
    },
    layout: {
      heroVariant: 'product',
      sectionSpacing: 'py-20 px-6',
      containerMaxWidth: 'max-w-7xl',
      gridColumns: { sm: 1, md: 2, lg: 4 },
      reasoning: 'Product-focused hero with large imagery. 4-column grid for product cards. Generous spacing between sections.',
    },
    animation: {
      library: 'framer-motion',
      defaultDuration: '0.4s',
      defaultEasing: 'easeOut',
      scrollTriggered: true,
      reasoning: 'Subtle fade-up animations for product cards. Staggered reveals for grid items. No flashy animations that distract from purchasing.',
    },
    components: [
      { type: 'HeroBanner', variant: 'product', description: 'Full-width product hero with image background', classes: 'relative overflow-hidden' },
      { type: 'ProductGrid', variant: 'card-grid', description: '4-column product card grid with images, prices, ratings', classes: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6' },
      { type: 'FeatureGrid', variant: 'icon-cards', description: 'Trust badges and feature cards', classes: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
      { type: 'Testimonials', variant: 'card-carousel', description: 'Customer review cards with avatars', classes: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
      { type: 'CTASection', variant: 'centered', description: 'Conversion-focused CTA with trust signals', classes: 'text-center py-20' },
    ],
    uxGuidelines: [
      'Product images must be high-quality, minimum 400x400px',
      'Prices must be prominent with original price strikethrough',
      'Star ratings with review count for social proof',
      'Add to Cart button must be prominent and above-fold',
      'Trust badges (FSSAI, lab-tested, free delivery) visible',
      'Mobile-first responsive design with touch-friendly targets',
    ],
    styleKeywords: ['dark', 'premium', ' conversion-focused', ' trust-building', ' product-centric'],
  },

  saas: {
    colors: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      accent: '#06B6D4',
      background: '#09090B',
      foreground: '#FAFAFA',
      muted: '#27272A',
      card: '#18181B',
      border: '#27272A',
      success: '#10B981',
      warning: '#F59E0B',
      destructive: '#EF4444',
      reasoning: 'Indigo primary for tech/professional, violet secondary for creativity, cyan accent for innovation. Dark theme for modern SaaS.',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      reasoning: 'Inter for professional clarity. Mono font for code snippets and technical content.',
    },
    layout: {
      heroVariant: 'split',
      sectionSpacing: 'py-24 px-6',
      containerMaxWidth: 'max-w-6xl',
      gridColumns: { sm: 1, md: 2, lg: 3 },
      reasoning: 'Split hero with text + product screenshot. 3-column grid for features. Generous spacing for premium feel.',
    },
    animation: {
      library: 'framer-motion',
      defaultDuration: '0.5s',
      defaultEasing: 'easeOut',
      scrollTriggered: true,
      reasoning: 'Smooth fade-up for sections. Count-up animations for stats. Subtle hover effects on cards.',
    },
    components: [
      { type: 'HeroBanner', variant: 'split', description: 'Split hero with headline + product preview', classes: 'grid grid-cols-1 lg:grid-cols-2 gap-12' },
      { type: 'StatsCards', variant: 'count-up', description: 'Animated statistics counters', classes: 'grid grid-cols-2 md:grid-cols-4 gap-6' },
      { type: 'FeatureGrid', variant: 'bento', description: 'Bento grid feature layout', classes: 'grid grid-cols-4 grid-rows-2 gap-4' },
      { type: 'PricingTable', variant: '3-tier', description: 'Three-tier pricing with highlighted middle', classes: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
      { type: 'Testimonials', variant: 'marquee', description: 'Auto-scrolling testimonial marquee', classes: 'flex gap-6 overflow-hidden' },
    ],
    uxGuidelines: [
      'Clear value proposition above the fold',
      'Social proof (logos, testimonials, stats) prominent',
      'Pricing transparency with feature comparison',
      'Free trial or demo CTA visible',
      'Mobile-responsive with sticky CTA on scroll',
    ],
    styleKeywords: ['professional', ' trustworthy', ' innovative', ' clean', ' conversion-optimized'],
  },

  restaurant: {
    colors: {
      primary: '#DC2626',
      secondary: '#F59E0B',
      accent: '#10B981',
      background: '#0C0A09',
      foreground: '#FAFAFA',
      muted: '#292524',
      card: '#1C1917',
      border: '#292524',
      success: '#10B981',
      warning: '#F59E0B',
      destructive: '#EF4444',
      reasoning: 'Red primary for appetite/urgency, gold secondary for premium dining, green accent for fresh/healthy. Warm dark background.',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      reasoning: 'Playfair Display for elegant headings (restaurant vibe), Inter for readable body text.',
    },
    layout: {
      heroVariant: 'fullscreen',
      sectionSpacing: 'py-20 px-6',
      containerMaxWidth: 'max-w-6xl',
      gridColumns: { sm: 1, md: 2, lg: 3 },
      reasoning: 'Fullscreen hero with food imagery. 3-column menu grid. Warm, inviting spacing.',
    },
    animation: {
      library: 'framer-motion',
      defaultDuration: '0.4s',
      defaultEasing: 'easeOut',
      scrollTriggered: true,
      reasoning: 'Subtle fade animations. Parallax on hero image. Hover effects on menu items.',
    },
    components: [
      { type: 'HeroBanner', variant: 'fullscreen', description: 'Fullscreen hero with food background', classes: 'relative h-screen flex items-center' },
      { type: 'MenuGrid', variant: 'card-grid', description: 'Menu items with images and prices', classes: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' },
      { type: 'ReservationForm', variant: 'inline', description: 'Table reservation form', classes: 'max-w-2xl mx-auto' },
      { type: 'Testimonials', variant: 'card-grid', description: 'Customer reviews with avatars', classes: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
    ],
    uxGuidelines: [
      'Food images must be appetizing and high-quality',
      'Menu prices clearly visible',
      'Easy reservation flow (3 steps max)',
      'Location and hours prominently displayed',
      'Mobile-friendly with tap-to-call',
    ],
    styleKeywords: ['warm', ' inviting', ' appetizing', ' elegant', ' cozy'],
  },
};

// ─── Skill Instruction Reader ────────────────────────────────────────────

function readSkillInstructions(skillId: string): string | null {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const skillPaths = [
    join(homeDir, '.claude', 'skills', `${skillId}-main`, `${skillId}-main`, '.claude', 'skills', skillId, 'SKILL.md'),
    join(homeDir, '.claude', 'skills', `${skillId}`, 'SKILL.md'),
    join(homeDir, '.claude', 'skills', `${skillId}-main`, '.claude', 'skills', skillId, 'SKILL.md'),
  ];

  for (const p of skillPaths) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf-8');
      } catch {
        continue;
      }
    }
  }
  return null;
}

function extractDesignRules(instructions: string): string[] {
  const rules: string[] = [];
  const lines = instructions.split('\n');
  for (const line of lines) {
    if (line.match(/^-\s+`[a-z-]+`\s+-/)) {
      rules.push(line.replace(/^-\s+/, '').trim());
    }
  }
  return rules.slice(0, 20); // Top 20 rules
}

// ─── DesignAgent Implementation ─────────────────────────────────────────

export class DesignAgent implements IDesignAgent {
  readonly name = 'design-agent';

  async run(ctx: PhaseContext): Promise<AgentResult<DesignBrief>> {
    const start = Date.now();
    let attempts = 0;

    while (true) {
      attempts++;
      try {
        const brief = this.generateBrief(ctx);

        return {
          status: 'completed',
          data: brief,
          duration: Date.now() - start,
          attempts,
        };
      } catch (err) {
        if (attempts >= ctx.maxRetries) {
          return {
            status: 'failed',
            error: (err as Error).message,
            duration: Date.now() - start,
            attempts,
          };
        }
      }
    }
  }

  /**
   * Generate a design brief from BRE context + skill instructions.
   */
  private generateBrief(ctx: PhaseContext): DesignBrief {
    const { breContext, businessResearch } = ctx;
    const industry = breContext.industry ?? 'saas';
    const subIndustry = breContext.subIndustry;

    // Get industry-specific design defaults
    const industryDesign = INDUSTRY_DESIGNS[industry] ?? INDUSTRY_DESIGNS['saas']!;

    // Read skill instructions for additional rules
    const uiUxInstructions = readSkillInstructions('ui-ux-pro-max');
    const frontendInstructions = readSkillInstructions('frontend-design');
    const motionInstructions = readSkillInstructions('motion-framer');

    const uxGuidelines = [...(industryDesign.uxGuidelines ?? [])];
    if (uiUxInstructions) {
      uxGuidelines.push(...extractDesignRules(uiUxInstructions).slice(0, 10));
    }

    // Build the complete design brief
    const brief: DesignBrief = {
      industry,
      ...(subIndustry ? { subIndustry } : {}),
      colors: industryDesign.colors!,
      typography: industryDesign.typography!,
      layout: industryDesign.layout!,
      animation: industryDesign.animation!,
      components: industryDesign.components ?? [],
      uxGuidelines: [...new Set(uxGuidelines)], // Deduplicate
      styleKeywords: industryDesign.styleKeywords ?? [],
    };

    return brief;
  }
}
