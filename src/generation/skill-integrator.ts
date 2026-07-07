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
  defaultHeroLayout?: 'centered' | 'split' | 'left' | 'full-width';
}> = {
  'luxury-watch': {
    sections: ['navbar', 'hero', 'collections', 'customizer', 'story', 'craftsmanship', 'dealers', 'testimonials', 'contact', 'footer'],
    features: ['Interactive product customizer', 'SVG watch rendering', 'Dynamic pricing', 'Dealer locator with map', 'Appointment booking', 'Collection filtering'],
    animations: ['Breathing hero effect', 'Scroll reveal sections', 'Tab switching with layoutId', 'Carousel with auto-slide', 'Hover scale on cards', 'Map pin ripple animation'],
    dataModels: ['Watch', 'Collection', 'CraftsmanshipDetail', 'Dealer', 'Testimonial', 'Appointment'],
    defaultHeroLayout: 'split',
  },
  'saas-dashboard': {
    sections: ['navbar', 'hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'],
    features: ['Pricing table', 'Feature comparison', 'Social proof', 'Free trial CTA', 'Integration showcase'],
    animations: ['Hero stagger reveal', 'Feature card hover', 'Pricing highlight pulse', 'Counter animation', 'Scroll-triggered reveals'],
    dataModels: ['Feature', 'PricingTier', 'Testimonial', 'Integration'],
    defaultHeroLayout: 'left',
  },
  'ecommerce': {
    sections: ['navbar', 'hero', 'featured-products', 'categories', 'testimonials', 'newsletter', 'footer'],
    features: ['Product grid with filters', 'Product cards with hover', 'Quick view modal', 'Shopping cart', 'Wishlist'],
    animations: ['Product grid stagger', 'Card hover lift', 'Image zoom on hover', 'Cart slide-in', 'Filter transition'],
    dataModels: ['Product', 'Category', 'CartItem', 'Review', 'Order'],
    defaultHeroLayout: 'centered',
  },
  'restaurant': {
    sections: ['navbar', 'hero', 'menu', 'about', 'testimonials', 'gallery', 'reservations', 'footer'],
    features: ['Menu with categories', 'Online ordering', 'Reservation form', 'Photo gallery', 'Location map'],
    animations: ['Menu item reveal', 'Gallery masonry', 'Reservation success', 'Scroll parallax', 'Hover glow'],
    dataModels: ['MenuItem', 'Category', 'Reservation', 'Review', 'GalleryImage'],
    defaultHeroLayout: 'centered',
  },
  'fitness': {
    sections: ['navbar', 'hero', 'classes', 'trainers', 'pricing', 'testimonials', 'contact', 'footer'],
    features: ['Class schedule', 'Trainer profiles', 'Membership plans', 'Booking form', 'Progress tracking'],
    animations: ['Class card stagger', 'Trainer hover', 'Pricing highlight', 'Schedule scroll', 'CTA pulse'],
    dataModels: ['Class', 'Trainer', 'Membership', 'Booking', 'Schedule'],
    defaultHeroLayout: 'centered',
  },
  'healthcare': {
    sections: ['navbar', 'hero', 'services', 'doctors', 'testimonials', 'booking', 'contact', 'footer'],
    features: ['Doctor profiles', 'Service descriptions', 'Appointment booking', 'Insurance info', 'Patient portal'],
    animations: ['Service card reveal', 'Doctor profile hover', 'Booking form', 'Scroll reveal', 'Trust badge'],
    dataModels: ['Doctor', 'Service', 'Appointment', 'Testimonial', 'Insurance'],
    defaultHeroLayout: 'left',
  },
};

type PaletteKey = keyof typeof UI_UX_PRO_MAX.colorPalettes;
type FontKey = keyof typeof UI_UX_PRO_MAX.fontPairings;
type StyleKey = keyof typeof UI_UX_PRO_MAX.styles;

// ─── Skill Integrator ──────────────────────────────────────────────

export class SkillIntegrator {
  private skillsDir: string;

  constructor() {
    this.skillsDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
  }

  /**
   * Resolves the most suitable hero layout structure based on the template configuration.
   */
  private determineHeroLayout(template: typeof PRODUCT_TEMPLATES[string]): 'centered' | 'split' | 'left' | 'full-width' {
    if (template.defaultHeroLayout) return template.defaultHeroLayout;
    if (template.sections.includes('customizer')) return 'split';
    return 'centered';
  }

  /**
   * Get design recommendations based on industry and product type.
   * Reads from UI/UX Pro Max skill data.
   */
  public getDesignRecommendations(industry: string, productType?: string): DesignRecommendation {
    const template = PRODUCT_TEMPLATES[productType || industry] ?? PRODUCT_TEMPLATES['saas-dashboard']!;

    const paletteKey = this.getPaletteKey(industry);
    const palette = UI_UX_PRO_MAX.colorPalettes[paletteKey] || UI_UX_PRO_MAX.colorPalettes.minimal;

    const fontKey = this.getFontKey(industry);
    const fonts = UI_UX_PRO_MAX.fontPairings[fontKey] || UI_UX_PRO_MAX.fontPairings.modern;

    return {
      colors: {
        palette,
        primary: palette[3] ?? palette[0] ?? '#000000',
        secondary: palette[2] ?? palette[1] ?? '#333333',
        accent: palette[4] ?? palette[3] ?? '#000000',
        background: palette[0] ?? '#ffffff',
        foreground: palette[4] ?? '#ffffff',
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
        heroLayout: this.determineHeroLayout(template),
        sectionSpacing: 'py-24 sm:py-32',
        containerMaxWidth: 'max-w-7xl',
        gridColumns: { sm: 1, md: 2, lg: 3 },
        reasoning: `Layout optimized for target implementation with ${template.sections.length} UI components`,
      },
      animation: {
        library: 'framer-motion',
        scrollReveal: true,
        staggerAnimations: true,
        hoverEffects: true,
        pageTransitions: false,
        reasoning: `Framer Motion orchestration layer using scroll reveals and component stagger patterns`,
      },
      components: template.sections.map(s => {
        const sectionName = s.charAt(0).toUpperCase() + s.slice(1);
        return {
          name: sectionName,
          source: 'custom',
          props: [],
          variants: ['default'],
        };
      }),
      uxGuidelines: UI_UX_PRO_MAX.uxGuidelines,
    };
  }

  /**
   * Get product template with sections, features, animations, data models.
   */
  public getProductTemplate(productType: string): typeof PRODUCT_TEMPLATES[string] {
    return PRODUCT_TEMPLATES[productType] ?? PRODUCT_TEMPLATES['saas-dashboard']!;
  }

  /**
   * Get animation recommendations from GSAP/Framer Motion skills.
   */
  public getAnimationRecommendations(productType: string): AnimationRecommendation {
    const template = this.getProductTemplate(productType);

    return {
      library: 'framer-motion',
      scrollReveal: true,
      staggerAnimations: true,
      hoverEffects: true,
      pageTransitions: false,
      reasoning: `Animations utilized: ${template.animations.join(', ')}`,
    };
  }

  /**
   * Get UX guidelines from UI/UX Pro Max.
   */
  public getUXGuidelines(): string[] {
    return UI_UX_PRO_MAX.uxGuidelines;
  }

  /**
   * Get style recommendations from UI/UX Pro Max.
   */
  public getStyleRecommendation(industry: string): { style: string; css: string; bestFor: string[] } {
    const key = this.getStyleKey(industry);
    const style = UI_UX_PRO_MAX.styles[key] || UI_UX_PRO_MAX.styles.minimal;
    return {
      style: key,
      css: style.css,
      bestFor: style.bestFor,
    };
  }

  /**
   * Generates structured skill artifact manifests for architectural pipelines.
   */
  public produceArtifacts(industry: string, productType?: string): SkillArtifact[] {
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
   * Format recommendations as prompt section for LLM context injection.
   */
  public static formatForPrompt(recommendations: DesignRecommendation): string {
    return [
      `## UI/UX Pro Max Design Recommendations\n`,
      `### Color Palette`,
      `- Primary: ${recommendations.colors.primary}`,
      `- Secondary: ${recommendations.colors.secondary}`,
      `- Accent: ${recommendations.colors.accent}`,
      `- Background: ${recommendations.colors.background}`,
      `- Foreground: ${recommendations.colors.foreground}`,
      `- Reasoning: ${recommendations.colors.reasoning}\n`,
      `### Typography`,
      `- Heading: ${recommendations.typography.headingFont}`,
      `- Body: ${recommendations.typography.bodyFont}`,
      `- Mono: ${recommendations.typography.monoFont}`,
      `- Reasoning: ${recommendations.typography.reasoning}\n`,
      `### Layout`,
      `- Hero: ${recommendations.layout.heroLayout}`,
      `- Section Spacing: ${recommendations.layout.sectionSpacing}`,
      `- Container: ${recommendations.layout.containerMaxWidth}`,
      `- Grid Columns: SM:${recommendations.layout.gridColumns.sm} / MD:${recommendations.layout.gridColumns.md} / LG:${recommendations.layout.gridColumns.lg}\n`,
      `### Animation`,
      `- Library: ${recommendations.animation.library}`,
      `- Scroll Reveal: ${recommendations.animation.scrollReveal}`,
      `- Stagger: ${recommendations.animation.staggerAnimations}`,
      `- Hover: ${recommendations.animation.hoverEffects}\n`,
      `### UX Guidelines`,
      ...recommendations.uxGuidelines.map(guideline => `- ${guideline}`)
    ].join('\n');
  }
}
