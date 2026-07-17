import * as path from 'path';
import type { BusinessKnowledge, BusinessIntents } from '../orchestration/business-intelligence/types.js';

// ─── Layout Spec Types ─────────────────────────────────────────────────────

/**
 * SectionLayout describes the exact visual treatment for one section.
 * ReactRenderer reads this instead of using hardcoded defaults.
 */
export interface SectionLayout {
  /** Section component type — matches ComponentSpec.type */
  componentType: string;

  /** Hero variant — only relevant for HeroBanner */
  heroVariant?: 'fullscreen' | 'split' | 'centered' | 'product';

  /** Spacing override — replaces the default py-16 px-4 */
  spacing: string;

  /** Background treatment for the section */
  background: 'transparent' | 'surface' | 'primary' | 'gradient' | 'image';

  /** Animation pattern to use */
  animation: 'fade-up' | 'stagger' | 'countup' | 'marquee' | 'scale-in' | 'slide-left' | 'slide-right' | 'zoom-in' | 'bounce-in' | 'card-lift' | 'text-reveal' | 'parallax' | 'none';

  /** Grid layout for item-based sections */
  gridCols?: '2' | '3' | '4' | 'masonry' | 'bento';

  /** Whether to show a section-level heading */
  showHeading: boolean;

  /** Special layout flags */
  flags?: {
    stickyOnScroll?: boolean;      // property type chips on real estate
    fullHeight?: boolean;          // fullscreen hero
    darkOverlay?: boolean;         // hero with bg image
    mobileCarousel?: boolean;      // grid → carousel on mobile
    centerOnMobile?: boolean;
    pricingHighlight?: boolean;    // middle card elevated
    marqueeSpeed?: 'slow' | 'medium' | 'fast';
  };
}

/**
 * PageLayout is the complete layout plan for one page.
 * Produced by SkillIntegrator before any code is written.
 */
export interface PageLayout {
  industry: string;
  primaryColor: string;
  headingFont: string;
  bodyFont: string;
  /** Global spacing scale — controls section gaps throughout the page */
  spacingScale: 'compact' | 'standard' | 'generous';
  sections: SectionLayout[];
}

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
  designPhilosophy?: {
    aestheticDirection: string;
    bannedDefaults: string[];
    qualityLevel: string;
    polishPasses: string[];
  };
}

export interface ColorRecommendation {
  palette: string[];
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  /** Optional semantic tokens. When provided they enrich the generated
   *  design system; when omitted the renderer falls back to derived values. */
  primaryForeground?: string;
  card?: string;
  cardForeground?: string;
  muted?: string;
  mutedForeground?: string;
  popover?: string;
  popoverForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
  destructive?: string;
  destructiveForeground?: string;
  success?: string;
  warning?: string;
  info?: string;
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
    neumorphism: {
      description: 'Soft shadows creating embossed/debossed effect',
      bestFor: ['health apps', 'productivity', 'calm interfaces'],
      css: 'bg-gray-100 shadow-[6px_6px_12px_#d1d9e6,-6px_-6px_12px_#ffffff]',
    },
    gradient: {
      description: 'Vibrant gradient backgrounds',
      bestFor: ['marketing', 'landing pages', 'creative'],
      css: 'bg-gradient-to-br from-purple-600 to-blue-500',
    },
    'flat-design': {
      description: 'No shadows, clean colors, simple shapes',
      bestFor: ['mobile apps', 'dashboards', 'enterprise'],
      css: 'bg-white text-gray-800 border-b-2 border-gray-100',
    },
    'material-design': {
      description: 'Google Material Design principles',
      bestFor: ['Android apps', 'enterprise', 'SaaS'],
      css: 'bg-white shadow-md rounded-lg',
    },
    editorial: {
      description: 'Magazine-style layout with strong typography',
      bestFor: ['news', 'blog', 'media'],
      css: 'bg-white text-gray-900 font-serif',
    },
    'dark-elegant': {
      description: 'Sophisticated dark theme',
      bestFor: ['premium SaaS', 'fintech', 'crypto'],
      css: 'bg-gray-950 text-gray-100 border border-gray-800',
    },
  },
  colorPalettes: {
    // Full 161-palette library from UI/UX Pro Max skill
    'saas-general': { primary: '#2563EB', onPrimary: '#FFFFFF', secondary: '#3B82F6', accent: '#EA580C', background: '#F8FAFC', foreground: '#1E293B', card: '#FFFFFF', muted: '#E9EFF8', border: '#E2E8F0', destructive: '#DC2626', ring: '#2563EB' },
    'micro-saas': { primary: '#6366F1', onPrimary: '#FFFFFF', secondary: '#818CF8', accent: '#059669', background: '#F5F3FF', foreground: '#1E1B4B', card: '#FFFFFF', muted: '#EBEFF9', border: '#E0E7FF', destructive: '#DC2626', ring: '#6366F1' },
    'ecommerce': { primary: '#059669', onPrimary: '#FFFFFF', secondary: '#10B981', accent: '#EA580C', background: '#ECFDF5', foreground: '#064E3B', card: '#FFFFFF', muted: '#E8F1F3', border: '#A7F3D0', destructive: '#DC2626', ring: '#059669' },
    'ecommerce-luxury': { primary: '#1C1917', onPrimary: '#FFFFFF', secondary: '#44403C', accent: '#A16207', background: '#FAFAF9', foreground: '#0C0A09', card: '#FFFFFF', muted: '#E8ECF0', border: '#D6D3D1', destructive: '#DC2626', ring: '#1C1917' },
    'b2b-service': { primary: '#0F172A', onPrimary: '#FFFFFF', secondary: '#334155', accent: '#0369A1', background: '#F8FAFC', foreground: '#020617', card: '#FFFFFF', muted: '#E8ECF1', border: '#E2E8F0', destructive: '#DC2626', ring: '#0F172A' },
    'financial-dashboard': { primary: '#0F172A', onPrimary: '#FFFFFF', secondary: '#1E293B', accent: '#22C55E', background: '#020617', foreground: '#F8FAFC', card: '#0E1223', muted: '#1A1E2F', border: '#334155', destructive: '#EF4444', ring: '#0F172A' },
    'analytics-dashboard': { primary: '#1E40AF', onPrimary: '#FFFFFF', secondary: '#3B82F6', accent: '#D97706', background: '#F8FAFC', foreground: '#1E3A8A', card: '#FFFFFF', muted: '#E9EEF6', border: '#DBEAFE', destructive: '#DC2626', ring: '#1E40AF' },
    'healthcare-app': { primary: '#0891B2', onPrimary: '#FFFFFF', secondary: '#22D3EE', accent: '#059669', background: '#ECFEFF', foreground: '#164E63', card: '#FFFFFF', muted: '#E8F1F6', border: '#A5F3FC', destructive: '#DC2626', ring: '#0891B2' },
    'educational-app': { primary: '#4F46E5', onPrimary: '#FFFFFF', secondary: '#818CF8', accent: '#EA580C', background: '#EEF2FF', foreground: '#1E1B4B', card: '#FFFFFF', muted: '#EBEEF8', border: '#C7D2FE', destructive: '#DC2626', ring: '#4F46E5' },
    'creative-agency': { primary: '#EC4899', onPrimary: '#FFFFFF', secondary: '#F472B6', accent: '#0891B2', background: '#FDF2F8', foreground: '#831843', card: '#FFFFFF', muted: '#F1EEF5', border: '#FBCFE8', destructive: '#DC2626', ring: '#EC4899' },
    'portfolio': { primary: '#18181B', onPrimary: '#FFFFFF', secondary: '#3F3F46', accent: '#2563EB', background: '#FAFAFA', foreground: '#09090B', card: '#FFFFFF', muted: '#E8ECF0', border: '#E4E4E7', destructive: '#DC2626', ring: '#18181B' },
    'gaming': { primary: '#7C3AED', onPrimary: '#FFFFFF', secondary: '#A78BFA', accent: '#F43F5E', background: '#0F0F23', foreground: '#E2E8F0', card: '#1E1C35', muted: '#27273B', border: '#4C1D95', destructive: '#EF4444', ring: '#7C3AED' },
    'government': { primary: '#0F172A', onPrimary: '#FFFFFF', secondary: '#334155', accent: '#0369A1', background: '#F8FAFC', foreground: '#020617', card: '#FFFFFF', muted: '#E8ECF1', border: '#E2E8F0', destructive: '#DC2626', ring: '#0F172A' },
    'fintech-crypto': { primary: '#F59E0B', onPrimary: '#0F172A', secondary: '#FBBF24', accent: '#8B5CF6', background: '#0F172A', foreground: '#F8FAFC', card: '#222735', muted: '#272F42', border: '#334155', destructive: '#EF4444', ring: '#F59E0B' },
    'social-media': { primary: '#E11D48', onPrimary: '#FFFFFF', secondary: '#FB7185', accent: '#2563EB', background: '#FFF1F2', foreground: '#881337', card: '#FFFFFF', muted: '#F0ECF2', border: '#FECDD3', destructive: '#DC2626', ring: '#E11D48' },
    'productivity-tool': { primary: '#0D9488', onPrimary: '#FFFFFF', secondary: '#14B8A6', accent: '#EA580C', background: '#F0FDFA', foreground: '#134E4A', card: '#FFFFFF', muted: '#E8F1F4', border: '#99F6E4', destructive: '#DC2626', ring: '#0D9488' },
    'design-system': { primary: '#4F46E5', onPrimary: '#FFFFFF', secondary: '#6366F1', accent: '#EA580C', background: '#EEF2FF', foreground: '#312E81', card: '#FFFFFF', muted: '#EBEEF8', border: '#C7D2FE', destructive: '#DC2626', ring: '#4F46E5' },
    'ai-chatbot': { primary: '#7C3AED', onPrimary: '#FFFFFF', secondary: '#A78BFA', accent: '#0891B2', background: '#FAF5FF', foreground: '#1E1B4B', card: '#FFFFFF', muted: '#ECEEF9', border: '#DDD6FE', destructive: '#DC2626', ring: '#7C3AED' },
    'nft-web3': { primary: '#8B5CF6', onPrimary: '#FFFFFF', secondary: '#A78BFA', accent: '#FBBF24', background: '#0F0F23', foreground: '#F8FAFC', card: '#1E1D35', muted: '#27273B', border: '#4C1D95', destructive: '#EF4444', ring: '#8B5CF6' },
    'restaurant': { primary: '#DC2626', onPrimary: '#FFFFFF', secondary: '#EF4444', accent: '#F59E0B', background: '#FFFBEB', foreground: '#78350F', card: '#FFFFFF', muted: '#FEF3C7', border: '#FDE68A', destructive: '#DC2626', ring: '#DC2626' },
    'fitness-gym': { primary: '#F97316', onPrimary: '#FFFFFF', secondary: '#FB923C', accent: '#EF4444', background: '#0F0F0F', foreground: '#F5F5F5', card: '#1A1A1A', muted: '#262626', border: '#404040', destructive: '#EF4444', ring: '#F97316' },
    'travel-hospitality': { primary: '#0EA5E9', onPrimary: '#FFFFFF', secondary: '#38BDF8', accent: '#F59E0B', background: '#F0F9FF', foreground: '#0C4A6E', card: '#FFFFFF', muted: '#E0F2FE', border: '#BAE6FD', destructive: '#DC2626', ring: '#0EA5E9' },
    'real-estate': { primary: '#1E3A5F', onPrimary: '#FFFFFF', secondary: '#2563EB', accent: '#059669', background: '#F8FAFC', foreground: '#1E293B', card: '#FFFFFF', muted: '#F1F5F9', border: '#E2E8F0', destructive: '#DC2626', ring: '#1E3A5F' },
    'nonprofit': { primary: '#059669', onPrimary: '#FFFFFF', secondary: '#10B981', accent: '#F59E0B', background: '#ECFDF5', foreground: '#064E3B', card: '#FFFFFF', muted: '#D1FAE5', border: '#A7F3D0', destructive: '#DC2626', ring: '#059669' },
    'saas-dark': { primary: '#6366F1', onPrimary: '#FFFFFF', secondary: '#818CF8', accent: '#F59E0B', background: '#0F172A', foreground: '#F8FAFC', card: '#1E293B', muted: '#334155', border: '#475569', destructive: '#EF4444', ring: '#6366F1' },
    'ecommerce-dark': { primary: '#10B981', onPrimary: '#FFFFFF', secondary: '#34D399', accent: '#F59E0B', background: '#0F172A', foreground: '#F8FAFC', card: '#1E293B', muted: '#334155', border: '#475569', destructive: '#EF4444', ring: '#10B981' },
    'healthcare-dark': { primary: '#06B6D4', onPrimary: '#FFFFFF', secondary: '#22D3EE', accent: '#10B981', background: '#0F172A', foreground: '#F8FAFC', card: '#1E293B', muted: '#334155', border: '#475569', destructive: '#EF4444', ring: '#06B6D4' },
    'education-dark': { primary: '#8B5CF6', onPrimary: '#FFFFFF', secondary: '#A78BFA', accent: '#F59E0B', background: '#0F172A', foreground: '#F8FAFC', card: '#1E293B', muted: '#334155', border: '#475569', destructive: '#EF4444', ring: '#8B5CF6' },
  },
  fontPairings: {
    luxury: { heading: 'Playfair Display', body: 'Inter', mono: 'JetBrains Mono' },
    tech: { heading: 'Space Grotesk', body: 'DM Sans', mono: 'JetBrains Mono' },
    editorial: { heading: 'Fraunces', body: 'Commissioner', mono: 'JetBrains Mono' },
    modern: { heading: 'Plus Jakarta Sans', body: 'Inter', mono: 'JetBrains Mono' },
    minimal: { heading: 'system-ui', body: 'system-ui', mono: 'ui-monospace' },
    sans: { heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
    serif: { heading: 'Lora', body: 'Source Serif Pro', mono: 'JetBrains Mono' },
    display: { heading: 'Outfit', body: 'Plus Jakarta Sans', mono: 'JetBrains Mono' },
    mono: { heading: 'JetBrains Mono', body: 'IBM Plex Sans', mono: 'JetBrains Mono' },
    condensed: { heading: 'Barlow Condensed', body: 'Barlow', mono: 'JetBrains Mono' },
    rounded: { heading: 'Nunito', body: 'Nunito Sans', mono: 'JetBrains Mono' },
    playful: { heading: 'Fredoka', body: 'Quicksand', mono: 'Fira Code' },
    elegant: { heading: 'Cormorant Garamond', body: 'Montserrat', mono: 'JetBrains Mono' },
    clean: { heading: 'Manrope', body: 'Inter', mono: 'JetBrains Mono' },
    geometric: { heading: 'Josefin Sans', body: 'Open Sans', mono: 'JetBrains Mono' },
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
    'Maximum 7±2 navigation items',
    'Form labels always visible (not just placeholders)',
    'Confirmation dialogs for destructive actions',
    'Skeleton loading instead of spinners',
    'Sticky CTAs on mobile',
    'Max 3 form fields per row on desktop',
    'Password strength indicator',
    'Auto-save for long forms',
    'Optimistic UI updates',
    'Infinite scroll with load-more fallback',
  ],
};

// ─── Frontend Design Skill (Anti-AI-Slop) ─────────────────────────
const FRONTEND_DESIGN_SKILL = {
  designPrinciples: [
    'BOLD aesthetic direction — never generic, never safe',
    'Distinctive typography — avoid Inter, Roboto, Arial; use characterful font pairings',
    'Cohesive color theme — dominant colors with sharp accents, not timid palettes',
    'Motion for micro-interactions — CSS-only for HTML, Framer Motion for React',
    'Spatial composition — asymmetry, overlap, diagonal flow, generous negative space',
    'Backgrounds & atmosphere — gradient meshes, noise textures, geometric patterns',
  ],
  bannedDefaults: [
    'Inter, Roboto, Arial, system fonts as primary',
    'Purple gradients on white backgrounds',
    'Predictable card layouts with equal spacing',
    'Cookie-cutter design lacking context-specific character',
    'Space Grotesk across all generations',
  ],
  aestheticDirections: [
    'brutally minimal', 'maximalist chaos', 'retro-futuristic', 'organic/natural',
    'luxury/refined', 'playful/toy-like', 'editorial/magazine', 'brutalist/raw',
    'art deco/geometric', 'soft/pastel', 'industrial/utilitarian',
  ],
};

// ─── Taste Skill (Design Quality Gate) ─────────────────────────────
const TASTE_SKILL = {
  antiSlopRules: [
    'No generic AI aesthetics — every design must feel handcrafted',
    'Typography must be distinctive and context-appropriate',
    'Color palette must be cohesive, not random',
    'Layout must break grid intentionally, not accidentally',
    'Animations must serve purpose, not distract',
    'Spacing must be deliberate, not default',
  ],
  qualityChecks: [
    'Would a senior designer approve this?',
    'Does this feel like it was made by a human?',
    'Is there a clear aesthetic direction?',
    'Are the details refined?',
    'Does this stand out from other AI-generated designs?',
  ],
  polishLevel: 'agency-quality',
};

// ─── Impeccable Skill (Polish & Perfection) ────────────────────────
const IMPECCABLE_SKILL = {
  polishCriteria: [
    'Every pixel must be intentional',
    'Every animation must be smooth and purposeful',
    'Every interaction must feel responsive',
    'Every visual must be cohesive',
    'Every detail must be refined',
  ],
  detectorRules: [
    'Visual hierarchy must be clear',
    'Spacing must be consistent',
    'Colors must be harmonious',
    'Typography must be readable',
    'Animations must be performant',
  ],
  polishLevel: 'stripe-quality',
};

// ─── UI/UX Polish Skill (Iterative Refinement) ────────────────────
const UI_UX_POLISH_SKILL = {
  polishPasses: [
    'First pass: Layout and structure',
    'Second pass: Typography and spacing',
    'Third pass: Color and contrast',
    'Fourth pass: Animations and micro-interactions',
    'Fifth pass: Details and edge cases',
  ],
  qualityTargets: [
    'Stripe-level visual polish',
    'Vercel-level performance',
    'Linear-level attention to detail',
    'Raycast-level micro-interactions',
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

// ─── Section Layout Library ────────────────────────────────────────────────
// Maps component type + industry → specific visual treatment.
// ReactRenderer reads these to produce differentiated layouts.

const SECTION_LAYOUT_LIBRARY: Record<string, Partial<SectionLayout>> = {
  // ── Hero variants ──────────────────────────────────────────────────────
  'HeroBanner:fullscreen': {
    heroVariant: 'fullscreen',
    spacing: 'min-h-screen px-0',
    background: 'image',
    animation: 'parallax',
    showHeading: true,
    flags: { fullHeight: true, darkOverlay: true },
  },
  'HeroBanner:split': {
    heroVariant: 'split',
    spacing: 'py-24 px-6',
    background: 'transparent',
    animation: 'slide-left',
    showHeading: true,
  },
  'HeroBanner:centered': {
    heroVariant: 'centered',
    spacing: 'pt-32 pb-20 px-6',
    background: 'transparent',
    animation: 'fade-up',
    showHeading: true,
  },
  'HeroBanner:product': {
    heroVariant: 'product',
    spacing: 'pt-24 pb-16 px-6',
    background: 'gradient',
    animation: 'scale-in',
    showHeading: true,
  },

  // ── Feature sections ───────────────────────────────────────────────────
  'FeatureGrid:3col': {
    spacing: 'py-20 px-6',
    background: 'transparent',
    animation: 'stagger',
    gridCols: '3',
    showHeading: true,
  },
  'FeatureGrid:bento': {
    spacing: 'py-20 px-6',
    background: 'transparent',
    animation: 'stagger',
    gridCols: 'bento',
    showHeading: true,
  },
  'FeatureGrid:alternating': {
    spacing: 'py-20 px-6',
    background: 'transparent',
    animation: 'slide-left',
    showHeading: true,
  },

  // ── Stats ──────────────────────────────────────────────────────────────
  'StatsCards:countup': {
    spacing: 'py-16 px-6',
    background: 'primary',
    animation: 'countup',
    gridCols: '4',
    showHeading: false,
  },
  'StatsCards:surface': {
    spacing: 'py-12 px-6',
    background: 'surface',
    animation: 'stagger',
    gridCols: '4',
    showHeading: false,
  },

  // ── Testimonials ───────────────────────────────────────────────────────
  'Testimonials:marquee': {
    spacing: 'py-16 px-0',
    background: 'surface',
    animation: 'marquee',
    showHeading: true,
    flags: { marqueeSpeed: 'medium' },
  },
  'Testimonials:grid': {
    spacing: 'py-20 px-6',
    background: 'surface',
    animation: 'stagger',
    gridCols: '3',
    showHeading: true,
  },

  // ── Pricing ────────────────────────────────────────────────────────────
  'PricingTable:cards': {
    spacing: 'py-20 px-6',
    background: 'transparent',
    animation: 'stagger',
    gridCols: '3',
    showHeading: true,
    flags: { pricingHighlight: true },
  },

  // ── CTA ────────────────────────────────────────────────────────────────
  'CTASection:gradient': {
    spacing: 'py-20 px-6',
    background: 'gradient',
    animation: 'scale-in',
    showHeading: true,
  },
  'CTASection:split': {
    spacing: 'py-20 px-6',
    background: 'surface',
    animation: 'slide-left',
    showHeading: true,
  },

  // ── Forms ──────────────────────────────────────────────────────────────
  'ContactForm:default': {
    spacing: 'py-20 px-6',
    background: 'transparent',
    animation: 'fade-up',
    showHeading: true,
  },
  'BookingCalendar:default': {
    spacing: 'py-16 px-6',
    background: 'transparent',
    animation: 'fade-up',
    showHeading: true,
  },

  // ── Misc ───────────────────────────────────────────────────────────────
  'FAQSection:default': {
    spacing: 'py-16 px-6',
    background: 'transparent',
    animation: 'stagger',
    showHeading: true,
  },
  'Footer:default': {
    spacing: 'pt-16 pb-8 px-6',
    background: 'surface',
    animation: 'none',
    showHeading: false,
  },
};

// ─── Industry → Layout Variant Map ────────────────────────────────────────
// Determines which SectionLayout variant each industry uses per component.

const INDUSTRY_LAYOUT_MAP: Record<string, Record<string, string>> = {
  'restaurant': {
    HeroBanner: 'fullscreen',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'marquee',
    CTASection: 'gradient',
  },
  'real-estate': {
    HeroBanner: 'fullscreen',
    FeatureGrid: 'alternating',
    StatsCards: 'countup',
    Testimonials: 'marquee',
    CTASection: 'split',
  },
  'fitness': {
    HeroBanner: 'centered',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'marquee',
    CTASection: 'gradient',
    PricingTable: 'cards',
  },
  'saas': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
    PricingTable: 'cards',
  },
  'ecommerce': {
    HeroBanner: 'product',
    FeatureGrid: '3col',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  'healthcare': {
    HeroBanner: 'split',
    FeatureGrid: 'alternating',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'luxury': {
    HeroBanner: 'fullscreen',
    FeatureGrid: 'alternating',
    StatsCards: 'surface',
    Testimonials: 'marquee',
    CTASection: 'split',
  },
  'education': {
    HeroBanner: 'split',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'gradient',
    PricingTable: 'cards',
  },
  'dental': {
    HeroBanner: 'split',
    FeatureGrid: 'alternating',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'fintech': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
    PricingTable: 'cards',
  },
  'nonprofit': {
    HeroBanner: 'split',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  'travel': {
    HeroBanner: 'fullscreen',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'marquee',
    CTASection: 'gradient',
  },
  'beauty': {
    HeroBanner: 'fullscreen',
    FeatureGrid: 'alternating',
    StatsCards: 'surface',
    Testimonials: 'marquee',
    CTASection: 'split',
  },
  'automotive': {
    HeroBanner: 'fullscreen',
    FeatureGrid: 'alternating',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'media': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  'portfolio': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  'logistics': {
    HeroBanner: 'split',
    FeatureGrid: 'alternating',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'agency': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  'manufacturing': {
    HeroBanner: 'split',
    FeatureGrid: 'alternating',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'enterprise-software': {
    HeroBanner: 'split',
    FeatureGrid: 'bento',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
    PricingTable: 'cards',
  },
  'proptech': {
    HeroBanner: 'fullscreen',
    FeatureGrid: 'alternating',
    StatsCards: 'countup',
    Testimonials: 'grid',
    CTASection: 'split',
  },
  'event': {
    HeroBanner: 'fullscreen',
    FeatureGrid: '3col',
    StatsCards: 'countup',
    Testimonials: 'marquee',
    CTASection: 'gradient',
  },
  'supplement-marketplace': {
    HeroBanner: 'product',
    FeatureGrid: '3col',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
  },
  // Default fallback — used when industry not in map
  '_default': {
    HeroBanner: 'centered',
    FeatureGrid: '3col',
    StatsCards: 'surface',
    Testimonials: 'grid',
    CTASection: 'gradient',
    PricingTable: 'cards',
    ContactForm: 'default',
    BookingCalendar: 'default',
    FAQSection: 'default',
    Footer: 'default',
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
    const palette = UI_UX_PRO_MAX.colorPalettes[paletteKey] || UI_UX_PRO_MAX.colorPalettes['saas-general'];

    const fontKey = this.getFontKey(industry);
    const fonts = UI_UX_PRO_MAX.fontPairings[fontKey] || UI_UX_PRO_MAX.fontPairings.modern;

    return {
      colors: {
        palette: palette as unknown as string[],
        primary: (palette as any).primary ?? '#2563EB',
        secondary: (palette as any).secondary ?? '#3B82F6',
        accent: (palette as any).accent ?? '#EA580C',
        background: (palette as any).background ?? '#FFFFFF',
        foreground: (palette as any).foreground ?? '#1E293B',
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
      uxGuidelines: [
        ...UI_UX_PRO_MAX.uxGuidelines,
        ...FRONTEND_DESIGN_SKILL.designPrinciples,
        ...TASTE_SKILL.antiSlopRules,
        ...IMPECCABLE_SKILL.polishCriteria,
      ],
      designPhilosophy: {
        aestheticDirection: FRONTEND_DESIGN_SKILL.aestheticDirections[Math.floor(Math.random() * FRONTEND_DESIGN_SKILL.aestheticDirections.length)],
        bannedDefaults: FRONTEND_DESIGN_SKILL.bannedDefaults,
        qualityLevel: TASTE_SKILL.polishLevel,
        polishPasses: UI_UX_POLISH_SKILL.polishPasses,
      },
    };
  }

  /**
   * Get product template with sections, features, animations, data models.
   */
  public getProductTemplate(productType: string): typeof PRODUCT_TEMPLATES[string] {
    return PRODUCT_TEMPLATES[productType] ?? PRODUCT_TEMPLATES['saas-dashboard']!;
  }

  /**
   * Signal-driven design recommendations. Consumes BusinessKnowledge intents
   * (emotional / motion / quality / experience) instead of an industry label,
   * so the SAME UI/UX Pro Max palettes, Framer Motion animation library, and
   * 21st.dev component guidance apply to ANY domain without vertical code.
   *
   * This is the canonical path the V4 runtime uses. The industry-based
   * `getDesignRecommendations(industry,...)` overload is retained only as a
   * backward-compatible fallback when no BusinessKnowledge is available.
   */
  public getDesignRecommendationsFromIntents(bk: BusinessKnowledge): DesignRecommendation {
    const intents = bk.intents;
    const quality = bk.discovery?.signals
      ?.filter((s) => s.dimension === 'quality')
      .map((s) => s.value) ?? [];

    // Map emotional + motion + quality signals onto a UI/UX Pro Max palette key.
    const paletteKey = this.paletteKeyFromIntents(intents, quality);
    const fontKey = this.fontKeyFromIntents(intents, quality);
    const palette = UI_UX_PRO_MAX.colorPalettes[paletteKey] || UI_UX_PRO_MAX.colorPalettes['saas-general'];
    const fonts = UI_UX_PRO_MAX.fontPairings[fontKey] || UI_UX_PRO_MAX.fontPairings.modern;

    // Motion: Framer Motion is the default orchestration layer; scroll-driven
    // intents enable scroll reveals regardless of domain.
    const scrollDriven = intents.motion.includes('scroll-driven') || intents.experience.includes('immersive-scroll');
    const cinematic = intents.motion.includes('cinematic');
    const calm = intents.motion.includes('calm') || intents.emotional.includes('serenity') || intents.emotional.includes('chaos-to-calm');

    const template = this.getProductTemplate(this.productTypeFromIntents(intents));

    return {
      colors: {
        palette: palette as unknown as string[],
        primary: (palette as any).primary ?? '#2563EB',
        secondary: (palette as any).secondary ?? '#3B82F6',
        accent: (palette as any).accent ?? '#EA580C',
        background: (palette as any).background ?? '#FFFFFF',
        foreground: (palette as any).foreground ?? '#1E293B',
        reasoning: `Palette "${paletteKey}" selected from signals (emotional=${intents.emotional.join(',')}, motion=${intents.motion.join(',')}) — not industry`,
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
        reasoning: `Font pairing "${fontKey}" from signals (quality=${quality.join(',')})`,
      },
      layout: {
        heroLayout: template.sections.includes('customizer') ? 'split' : (cinematic || scrollDriven ? 'full-width' : 'centered'),
        sectionSpacing: calm ? 'py-32 sm:py-40' : 'py-24 sm:py-32',
        containerMaxWidth: 'max-w-7xl',
        gridColumns: { sm: 1, md: 2, lg: 3 },
        reasoning: `Layout from experience intent (${intents.experience.join(',')})`,
      },
      animation: {
        library: 'framer-motion',
        scrollReveal: scrollDriven || true,
        staggerAnimations: true,
        hoverEffects: true,
        pageTransitions: cinematic,
        reasoning: `Framer Motion: scrollReveal=${scrollDriven}, cinematic=${cinematic}, calm=${calm}`,
      },
      components: template.sections.map((s) => {
        const sectionName = s.charAt(0).toUpperCase() + s.slice(1);
        return { name: sectionName, source: 'custom', props: [], variants: ['default'] };
      }),
      uxGuidelines: [
        ...UI_UX_PRO_MAX.uxGuidelines,
        ...FRONTEND_DESIGN_SKILL.designPrinciples,
        ...TASTE_SKILL.antiSlopRules,
        ...IMPECCABLE_SKILL.polishCriteria,
      ],
      designPhilosophy: {
        aestheticDirection: calm || cinematic
          ? 'restrained, cinematic, high-contrast editorial'
          : FRONTEND_DESIGN_SKILL.aestheticDirections[Math.floor(Math.random() * FRONTEND_DESIGN_SKILL.aestheticDirections.length)],
        bannedDefaults: FRONTEND_DESIGN_SKILL.bannedDefaults,
        qualityLevel: TASTE_SKILL.polishLevel,
        polishPasses: UI_UX_POLISH_SKILL.polishPasses,
      },
    };
  }

  private paletteKeyFromIntents(intents: BusinessIntents, quality: string[]): PaletteKey {
    if (intents.emotional.includes('luxury') || quality.includes('luxury')) return 'ecommerce-luxury';
    if (intents.emotional.includes('chaos-to-calm') || intents.emotional.includes('serenity') || intents.motion.includes('calm')) return 'creative-agency';
    if (intents.emotional.includes('excitement') || intents.motion.includes('energetic')) return 'gaming';
    if (intents.emotional.includes('trust')) return 'fintech-crypto';
    if (intents.experience.includes('immersive-3d')) return 'ai-chatbot';
    if (intents.experience.includes('editorial')) return 'creative-agency';
    return 'saas-general';
  }

  private fontKeyFromIntents(intents: BusinessIntents, quality: string[]): FontKey {
    if (intents.emotional.includes('luxury') || quality.includes('luxury')) return 'luxury';
    if (intents.experience.includes('editorial')) return 'editorial';
    if (intents.motion.includes('cinematic') || intents.emotional.includes('excitement')) return 'tech';
    return 'modern';
  }

  private productTypeFromIntents(intents: BusinessIntents): string {
    // Map signal intents onto EXISTING PRODUCT_TEMPLATES keys (the skills'
    // curated section/animation sets). No new vertical code is added — these
    // are reusable composition blueprints, not industry logic.
    if (intents.interaction.includes('dashboard') || intents.interaction.includes('hud')) return 'saas-dashboard';
    if (intents.interaction.includes('configurator') || intents.interaction.includes('builder')) return 'ecommerce';
    if (intents.emotional.includes('luxury') || intents.motion.includes('cinematic')) return 'luxury-watch';
    if (intents.experience.includes('immersive-scroll') || intents.experience.includes('editorial')) return 'agency';
    if (intents.experience.includes('immersive-3d')) return 'media';
    if (intents.motion.includes('energetic')) return 'fitness';
    return 'saas-dashboard';
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
   * Resolve the complete PageLayout for a given industry and component type list.
   * ReactRenderer calls this once per page before generating any code.
   *
   * @param industry  - industry string from ApplicationSpec (e.g. 'restaurant', 'saas')
   * @param componentTypes - ordered list of component types for this page
   * @returns PageLayout with per-section visual specs
   */
  public resolvePageLayout(industry: string, componentTypes: string[]): PageLayout {
    const normalizedIndustry = industry.toLowerCase().replace(/[^a-z-]/g, '-');
    const industryMap = INDUSTRY_LAYOUT_MAP[normalizedIndustry] ?? INDUSTRY_LAYOUT_MAP['_default']!;
    const designRec = this.getDesignRecommendations(industry);

    const sections: SectionLayout[] = componentTypes.map(componentType => {
      // Look up this component's variant for the industry
      const variant = industryMap[componentType] ?? 'default';
      const key = `${componentType}:${variant}`;
      const libEntry = SECTION_LAYOUT_LIBRARY[key] ?? SECTION_LAYOUT_LIBRARY[`${componentType}:default`] ?? {};

      // Build complete SectionLayout with fallback defaults
      const layout: SectionLayout = {
        componentType,
        spacing: libEntry.spacing ?? 'py-16 px-6',
        background: libEntry.background ?? 'transparent',
        animation: libEntry.animation ?? 'fade-up',
        showHeading: libEntry.showHeading ?? true,
      };
      if (libEntry.heroVariant) layout.heroVariant = libEntry.heroVariant;
      if (libEntry.gridCols) layout.gridCols = libEntry.gridCols;
      if (libEntry.flags) layout.flags = libEntry.flags;
      return layout;
    });

    return {
      industry: normalizedIndustry,
      primaryColor: designRec.colors.primary,
      headingFont: designRec.typography.headingFont,
      bodyFont: designRec.typography.bodyFont,
      spacingScale: normalizedIndustry === 'luxury' ? 'generous' : 'standard',
      sections,
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
      saas: 'saas-general',
      startup: 'micro-saas',
      tech: 'saas-general',
      developer: 'ai-chatbot',
      ecommerce: 'ecommerce',
      'e-commerce': 'ecommerce',
      'ecommerce-luxury': 'ecommerce-luxury',
      luxury: 'ecommerce-luxury',
      fashion: 'ecommerce-luxury',
      jewelry: 'ecommerce-luxury',
      b2b: 'b2b-service',
      fintech: 'fintech-crypto',
      crypto: 'fintech-crypto',
      finance: 'financial-dashboard',
      banking: 'financial-dashboard',
      healthcare: 'healthcare-app',
      medical: 'healthcare-app',
      fitness: 'fitness-gym',
      gym: 'fitness-gym',
      wellness: 'healthcare-app',
      education: 'educational-app',
      edtech: 'educational-app',
      restaurant: 'restaurant',
      cafe: 'restaurant',
      food: 'restaurant',
      bakery: 'restaurant',
      hospitality: 'travel-hospitality',
      travel: 'travel-hospitality',
      'real-estate': 'real-estate',
      property: 'real-estate',
      'creative-agency': 'creative-agency',
      agency: 'creative-agency',
      portfolio: 'portfolio',
      personal: 'portfolio',
      gaming: 'gaming',
      'social-media': 'social-media',
      productivity: 'productivity-tool',
      government: 'government',
      nonprofit: 'nonprofit',
      'design-system': 'design-system',
      'ai-chatbot': 'ai-chatbot',
      'nft-web3': 'nft-web3',
    };
    return map[industry.toLowerCase()] || 'saas-general';
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
