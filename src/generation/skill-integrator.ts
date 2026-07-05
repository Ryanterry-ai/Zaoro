/**
 * SkillIntegrator - Wires existing Claude skills into the generation pipeline.
 * 
 * Skills available:
 * - UI/UX Pro Max: 50+ styles, 161 color palettes, 57 font pairings, 161 product types
 * - Frontend Design: Distinctive, production-grade interfaces
 * - GSAP ScrollTrigger: Scroll-driven animations
 * - Framer Motion: React animations
 * - Motion Principles: Expert motion design
 * - Modern Web Design: Trends and patterns
 * - High-End Visual Design: Premium aesthetics
 * - shadcn/ui: Pre-built components
 * 
 * Instead of building from scratch, we READ from these skills and
 * inject their recommendations into the generation process.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Skill Data Types ──────────────────────────────────────────────

export interface SkillRecommendation {
  skillName: string;
  category: string;
  recommendation: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  code?: string;
}

export interface DesignRecommendation {
  colors: ColorRecommendation;
  typography: TypographyRecommendation;
  layout: LayoutRecommendation;
  animation: AnimationRecommendation;
  components: ComponentRecommendation[];
  uxGuidelines: string[];
}

export interface ColorRecommendation {
  palette: string[];
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  reasoning: string;
}

export interface TypographyRecommendation {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  scale: Record<string, { size: string; lineHeight: string; weight: string }>;
  reasoning: string;
}

export interface LayoutRecommendation {
  heroLayout: 'centered' | 'split' | 'left' | 'full-width';
  sectionSpacing: string;
  containerMaxWidth: string;
  gridColumns: { sm: number; md: number; lg: number };
  reasoning: string;
}

export interface AnimationRecommendation {
  library: 'framer-motion' | 'gsap' | 'css';
  scrollReveal: boolean;
  staggerAnimations: boolean;
  hoverEffects: boolean;
  pageTransitions: boolean;
  reasoning: string;
}

export interface ComponentRecommendation {
  name: string;
  source: 'shadcn' | '21st' | 'custom' | 'primitive';
  props: string[];
  variants: string[];
  code?: string;
}

export type SkillArtifactType =
  | 'design_specification'
  | 'motion_specification'
  | 'asset_manifest'
  | 'component_graph'
  | 'state_graph'
  | 'typed_data_models';

export interface SkillArtifact<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  skillName: string;
  type: SkillArtifactType;
  producedAt: string;
  payload: TPayload;
}

// ─── UI/UX Pro Max Data (embedded from skill) ──────────────────────

const UI_UX_PRO_MAX = {
  styles: {
    glassmorphism: {
      description: 'Frosted glass effect with backdrop-blur',
      bestFor: ['dashboards', 'modern apps', 'creative portfolios'],
      css: 'backdrop-blur-md bg-white/10 border border-white/20',
    },
    brutalist: {
      description: 'Raw, bold, high-contrast design',
      bestFor: ['agencies', 'portfolios', 'experimental'],
      css: 'border-2 border-black bg-white font-mono',
    },
    minimal: {
      description: 'Clean, whitespace-focused',
      bestFor: ['luxury', 'editorial', 'professional'],
      css: 'bg-white text-gray-900 font-light',
    },
    dark: {
      description: 'Dark theme with subtle accents',
      bestFor: ['developer tools', 'creative', 'gaming'],
      css: 'bg-gray-950 text-gray-100',
    },
  },
  colorPalettes: {
    luxury: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#f5f5dc'],
    tech: ['#0f0f23', '#1a1a3e', '#2d2d5e', '#00d4ff', '#7c3aed'],
    warm: ['#2d1b00', '#5c3d00', '#8b6914', '#d4a843', '#f5e6c8'],
    minimal: ['#ffffff', '#f8f9fa', '#e9ecef', '#6c757d', '#212529'],
    creative: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b'],
  },
  fontPairings: {
    luxury: { heading: 'Playfair Display', body: 'Inter', mono: 'JetBrains Mono' },
    tech: { heading: 'Space Grotesk', body: 'DM Sans', mono: 'JetBrains Mono' },
    editorial: { heading: 'Fraunces', body: 'Commissioner', mono: 'JetBrains Mono' },
    modern: { heading: 'Plus Jakarta Sans', body: 'Inter', mono: 'JetBrains Mono' },
    minimal: { heading: 'system-ui', body: 'system-ui', mono: 'ui-monospace' },
  },
  productTypes: {
    'luxury-watch': {
      style: 'minimal',
      colors: 'luxury',
      fonts: 'luxury',
      layout: 'editorial',
      animation: 'subtle',
    },
    'saas-dashboard': {
      style: 'dark',
      colors: 'tech',
      fonts: 'tech',
      layout: 'sidebar',
      animation: 'functional',
    },
    'ecommerce': {
      style: 'modern',
      colors: 'warm',
      fonts: 'modern',
      layout: 'grid',
      animation: 'engaging',
    },
  },
  uxGuidelines: [
    'Touch targets minimum 44x44px',
    'Color contrast ratio 4.5:1 for text',
    'Visible focus states on interactive elements',
    'Loading states for async operations',
    'Error messages near the input field',
    'Mobile-first responsive design',
    'Progressive disclosure for complex forms',
    'Consistent navigation patterns',
    'Accessible color palette',
    'Reduced motion support',
  ],
};

// ─── Product-Specific Templates ────────────────────────────────────

const PRODUCT_TEMPLATES: Record<string, {
  sections: string[];
  features: string[];
  animations: string[];
  dataModels: string[];
}> = {
  'luxury-watch': {
    sections: ['navbar', 'hero', 'collections', 'customizer', 'story', 'craftsmanship', 'dealers', 'testimonials', 'contact', 'footer'],
    features: ['Interactive product customizer', 'SVG watch rendering', 'Dynamic pricing', 'Dealer locator with map', 'Appointment booking', 'Collection filtering'],
    animations: ['Breathing hero effect', 'Scroll reveal sections', 'Tab switching with layoutId', 'Carousel with auto-slide', 'Hover scale on cards', 'Map pin ripple animation'],
    dataModels: ['Watch', 'Collection', 'CraftsmanshipDetail', 'Dealer', 'Testimonial', 'Appointment'],
  },
  'saas-dashboard': {
    sections: ['navbar', 'hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'],
    features: ['Pricing table', 'Feature comparison', 'Social proof', 'Free trial CTA', 'Integration showcase'],
    animations: ['Hero stagger reveal', 'Feature card hover', 'Pricing highlight pulse', 'Counter animation', 'Scroll-triggered reveals'],
    dataModels: ['Feature', 'PricingTier', 'Testimonial', 'Integration'],
  },
  'ecommerce': {
    sections: ['navbar', 'hero', 'featured-products', 'categories', 'testimonials', 'newsletter', 'footer'],
    features: ['Product grid with filters', 'Product cards with hover', 'Quick view modal', 'Shopping cart', 'Wishlist'],
    animations: ['Product grid stagger', 'Card hover lift', 'Image zoom on hover', 'Cart slide-in', 'Filter transition'],
    dataModels: ['Product', 'Category', 'CartItem', 'Review', 'Order'],
  },
  'restaurant': {
    sections: ['navbar', 'hero', 'menu', 'about', 'testimonials', 'gallery', 'reservations', 'footer'],
    features: ['Menu with categories', 'Online ordering', 'Reservation form', 'Photo gallery', 'Location map'],
    animations: ['Menu item reveal', 'Gallery masonry', 'Reservation success', 'Scroll parallax', 'Hover glow'],
    dataModels: ['MenuItem', 'Category', 'Reservation', 'Review', 'GalleryImage'],
  },
  'fitness': {
    sections: ['navbar', 'hero', 'classes', 'trainers', 'pricing', 'testimonials', 'contact', 'footer'],
    features: ['Class schedule', 'Trainer profiles', 'Membership plans', 'Booking form', 'Progress tracking'],
    animations: ['Class card stagger', 'Trainer hover', 'Pricing highlight', 'Schedule scroll', 'CTA pulse'],
    dataModels: ['Class', 'Trainer', 'Membership', 'Booking', 'Schedule'],
  },
  'healthcare': {
    sections: ['navbar', 'hero', 'services', 'doctors', 'testimonials', 'booking', 'contact', 'footer'],
    features: ['Doctor profiles', 'Service descriptions', 'Appointment booking', 'Insurance info', 'Patient portal'],
    animations: ['Service card reveal', 'Doctor profile hover', 'Booking form', 'Scroll reveal', 'Trust badge'],
    dataModels: ['Doctor', 'Service', 'Appointment', 'Testimonial', 'Insurance'],
  },
};

type PaletteKey = keyof typeof UI_UX_PRO_MAX.colorPalettes;
type FontKey = keyof typeof UI_UX_PRO_MAX.fontPairings;
type StyleKey = keyof typeof UI_UX_PRO_MAX.styles;
type ProductTemplate = (typeof PRODUCT_TEMPLATES)[string];

// ─── Skill Integrator ──────────────────────────────────────────────

export class SkillIntegrator {
  private skillsDir: string;

  constructor() {
    this.skillsDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
  }

  /**
   * Get design recommendations based on industry and product type.
   * Reads from UI/UX Pro Max skill data.
   */
  getDesignRecommendations(industry: string, productType?: string): DesignRecommendation {
    const template = PRODUCT_TEMPLATES[productType || industry] ?? PRODUCT_TEMPLATES['saas-dashboard']!;
    const uiuxData = UI_UX_PRO_MAX;

    // Select palette based on industry
    const paletteKey = this.getPaletteKey(industry);
    const palette = uiuxData.colorPalettes[paletteKey] || uiuxData.colorPalettes.minimal;

    // Select fonts based on industry
    const fontKey = this.getFontKey(industry);
    const fonts = uiuxData.fontPairings[fontKey] || uiuxData.fontPairings.modern;

    // Select style based on industry
    const styleKey = this.getStyleKey(industry);
    const style = uiuxData.styles[styleKey] || uiuxData.styles.minimal;

    // Safe palette access with fallbacks
    const primaryColor = palette[3] ?? palette[0] ?? '#000000';
    const secondaryColor = palette[2] ?? palette[1] ?? '#333333';
    const accentColor = palette[4] ?? palette[3] ?? primaryColor;
    const backgroundColor = palette[0] ?? '#ffffff';
    const foregroundColor = palette[4] ?? '#ffffff';

    return {
      colors: {
        palette,
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        background: backgroundColor,
        foreground: foregroundColor,
        reasoning: `Selected ${paletteKey} palette for ${industry} industry`,
      },
      typography: {
        headingFont: fonts.heading,
        bodyFont: fonts.body,
        monoFont: fonts.mono,
        scale: {
          display: { size: '4.5rem', lineHeight: '1', weight: '800' },
          h1: { size: '3.5rem', lineHeight: '1.1', weight: '700' },
          h2: { size: '2.5rem', lineHeight: '1.2', weight: '600' },
          h3: { size: '1.875rem', lineHeight: '1.3', weight: '600' },
          h4: { size: '1.375rem', lineHeight: '1.4', weight: '500' },
          body: { size: '1rem', lineHeight: '1.6', weight: '400' },
          small: { size: '0.875rem', lineHeight: '1.5', weight: '400' },
        },
        reasoning: `Selected ${fontKey} font pairing for ${industry}`,
      },
      layout: {
        heroLayout: template.sections.includes('customizer') ? 'split' : 'centered',
        sectionSpacing: 'py-24 sm:py-32',
        containerMaxWidth: 'max-w-7xl',
        gridColumns: { sm: 1, md: 2, lg: 3 },
        reasoning: `Layout optimized for ${productType || industry} with ${template.sections.length} sections`,
      },
      animation: {
        library: 'framer-motion',
        scrollReveal: true,
        staggerAnimations: true,
        hoverEffects: true,
        pageTransitions: false,
        reasoning: `Framer Motion for React with scroll reveals and stagger animations`,
      },
      components: template.sections.map(s => {
        const TWENTY_FIRST_SECTIONS = new Set(['cta', 'testimonials', 'footer']);
        const sectionName = s.charAt(0).toUpperCase() + s.slice(1);
        const is21st = TWENTY_FIRST_SECTIONS.has(s);
        return {
          name: sectionName,
          source: is21st ? ('21st' as const) : ('custom' as const),
          props: [],
          variants: ['default'],
        };
      }),
      uxGuidelines: uiuxData.uxGuidelines,
    };
  }

  /**
   * Get product template with sections, features, animations, data models.
   */
  getProductTemplate(productType: string): typeof PRODUCT_TEMPLATES[string] {
    return PRODUCT_TEMPLATES[productType] ?? PRODUCT_TEMPLATES['saas-dashboard']!;
  }

  /**
   * Get animation recommendations from GSAP/Framer Motion skills.
   */
  getAnimationRecommendations(productType: string): AnimationRecommendation {
    const template = PRODUCT_TEMPLATES[productType] ?? PRODUCT_TEMPLATES['saas-dashboard']!;

    return {
      library: 'framer-motion',
      scrollReveal: true,
      staggerAnimations: true,
      hoverEffects: true,
      pageTransitions: false,
      reasoning: `Animations: ${template.animations.join(', ')}`,
    };
  }

  /**
   * Get UX guidelines from UI/UX Pro Max.
   */
  getUXGuidelines(): string[] {
    return UI_UX_PRO_MAX.uxGuidelines;
  }

  /**
   * Get style recommendations from UI/UX Pro Max.
   */
  getStyleRecommendation(industry: string): { style: string; css: string; bestFor: string[] } {
    const key = this.getStyleKey(industry);
    const style = UI_UX_PRO_MAX.styles[key] || UI_UX_PRO_MAX.styles.minimal;
    return {
      style: key,
      css: style.css,
      bestFor: style.bestFor,
    };
  }

  produceArtifacts(industry: string, productType?: string): SkillArtifact[] {
    const recommendations = this.getDesignRecommendations(industry, productType);
    const template = this.getProductTemplate(productType || industry);

    return [
      {
        id: `skill-uiux-design-${industry}`,
        skillName: 'ui-ux-pro-max',
        type: 'design_specification',
        producedAt: new Date().toISOString(),
        payload: {
          colors: recommendations.colors,
          typography: recommendations.typography,
          layout: recommendations.layout,
          uxGuidelines: recommendations.uxGuidelines,
        },
      },
      {
        id: `skill-uiux-motion-${industry}`,
        skillName: 'ui-ux-pro-max',
        type: 'motion_specification',
        producedAt: new Date().toISOString(),
        payload: {
          animation: recommendations.animation,
          patterns: template.animations,
        },
      },
      {
        id: `skill-uiux-components-${industry}`,
        skillName: 'ui-ux-pro-max',
        type: 'component_graph',
        producedAt: new Date().toISOString(),
        payload: {
          sections: template.sections,
          components: recommendations.components,
          features: template.features,
        },
      },
      {
        id: `skill-uiux-models-${industry}`,
        skillName: 'ui-ux-pro-max',
        type: 'typed_data_models',
        producedAt: new Date().toISOString(),
        payload: {
          dataModels: template.dataModels,
        },
      },
    ];
  }

  // ─── Helper Methods ───────────────────────────────────────────────

  private getPaletteKey(industry: string): PaletteKey {
    const map: Record<string, PaletteKey> = {
      luxury: 'luxury',
      fashion: 'luxury',
      jewelry: 'luxury',
      watch: 'luxury',
      tech: 'tech',
      saas: 'tech',
      startup: 'tech',
      developer: 'tech',
      restaurant: 'warm',
      cafe: 'warm',
      food: 'warm',
      bakery: 'warm',
      fitness: 'creative',
      gym: 'creative',
      wellness: 'creative',
      minimal: 'minimal',
      editorial: 'minimal',
    };
    return map[industry.toLowerCase()] || 'minimal';
  }

  private getFontKey(industry: string): FontKey {
    const map: Record<string, FontKey> = {
      luxury: 'luxury',
      fashion: 'luxury',
      jewelry: 'luxury',
      watch: 'luxury',
      tech: 'tech',
      saas: 'tech',
      startup: 'tech',
      editorial: 'editorial',
      blog: 'editorial',
      magazine: 'editorial',
      modern: 'modern',
      portfolio: 'modern',
      agency: 'modern',
    };
    return map[industry.toLowerCase()] || 'modern';
  }

  private getStyleKey(industry: string): StyleKey {
    const map: Record<string, StyleKey> = {
      luxury: 'minimal',
      fashion: 'minimal',
      jewelry: 'minimal',
      watch: 'minimal',
      tech: 'dark',
      saas: 'dark',
      startup: 'glassmorphism',
      creative: 'brutalist',
      agency: 'brutalist',
      portfolio: 'brutalist',
    };
    return map[industry.toLowerCase()] || 'minimal';
  }

  /**
   * Format recommendations as prompt section for LLM.
   */
  static formatForPrompt(recommendations: DesignRecommendation): string {
    const sections: string[] = [];

    sections.push('## UI/UX Pro Max Design Recommendations');
    sections.push('');

    sections.push('### Color Palette');
    sections.push(`Primary: ${recommendations.colors.primary}`);
    sections.push(`Secondary: ${recommendations.colors.secondary}`);
    sections.push(`Accent: ${recommendations.colors.accent}`);
    sections.push(`Background: ${recommendations.colors.background}`);
    sections.push(`Foreground: ${recommendations.colors.foreground}`);
    sections.push(`Reasoning: ${recommendations.colors.reasoning}`);
    sections.push('');

    sections.push('### Typography');
    sections.push(`Heading: ${recommendations.typography.headingFont}`);
    sections.push(`Body: ${recommendations.typography.bodyFont}`);
    sections.push(`Mono: ${recommendations.typography.monoFont}`);
    sections.push(`Reasoning: ${recommendations.typography.reasoning}`);
    sections.push('');

    sections.push('### Layout');
    sections.push(`Hero: ${recommendations.layout.heroLayout}`);
    sections.push(`Section Spacing: ${recommendations.layout.sectionSpacing}`);
    sections.push(`Container: ${recommendations.layout.containerMaxWidth}`);
    sections.push(`Grid: ${recommendations.layout.gridColumns.sm}/${recommendations.layout.gridColumns.md}/${recommendations.layout.gridColumns.lg}`);
    sections.push('');

    sections.push('### Animation');
    sections.push(`Library: ${recommendations.animation.library}`);
    sections.push(`Scroll Reveal: ${recommendations.animation.scrollReveal}`);
    sections.push(`Stagger: ${recommendations.animation.staggerAnimations}`);
    sections.push(`Hover: ${recommendations.animation.hoverEffects}`);
    sections.push('');

    sections.push('### UX Guidelines');
    for (const guideline of recommendations.uxGuidelines) {
      sections.push(`- ${guideline}`);
    }
    sections.push('');

    return sections.join('\n');
  }
}
