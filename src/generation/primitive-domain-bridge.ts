/**
 * Primitive Domain Bridge — replaces industry-based detectDomain() and
 * generateDesignTokens() with primitive-derived versions.
 *
 * When PRIMITIVE_REASONING=1, these functions use the primitives from
 * the Primitive Reasoning Engine instead of industry catalogs.
 *
 * Falls back to existing functions when primitives are not available.
 */

import type { BusinessPrimitives } from './primitive-extractor.js';
import type { DerivedSpec } from './primitive-reasoner.js';
import type { DomainContext } from './domain-detector.js';
import { detectDomain, buildMinimalBusinessKnowledge } from './domain-detector.js';

// ============================================================================
// MOOD MAPPING — aestheticSignals → DomainContext.mood
// ============================================================================

const AESTHETIC_TO_MOOD: Record<string, DomainContext['mood']> = {
  'dark-theme': 'dark',
  'light-theme': 'minimal',
  'electric-blue': 'modern',
  'warm-gold': 'warm',
  'monochrome': 'minimal',
  'brutalist': 'bold',
  'glassmorphism': 'modern',
  'gradient-mesh': 'playful',
  'editorial-typography': 'premium',
  'scroll-motion': 'modern',
};

// ============================================================================
// COLOR HINT MAPPING — aestheticSignals → color hint
// ============================================================================

const AESTHETIC_TO_COLOR: Record<string, string> = {
  'dark-theme': 'slate',
  'light-theme': 'gray',
  'electric-blue': 'blue',
  'warm-gold': 'amber',
  'monochrome': 'gray',
  'brutalist': 'red',
  'glassmorphism': 'cyan',
  'gradient-mesh': 'purple',
  'editorial-typography': 'stone',
};

// ============================================================================
// SECTION MAPPING — contentShape → suggestedSections
// ============================================================================

const CONTENT_SHAPE_TO_SECTIONS: Record<string, string[]> = {
  'single-product': ['hero', 'features', 'cta'],
  'multiple-products': ['hero', 'product-showcase', 'deals', 'cta'],
  'specs-table': ['hero', 'specifications', 'comparison', 'cta'],
  'image-gallery': ['hero', 'gallery', 'about', 'cta'],
  'reviews': ['hero', 'testimonials', 'reviews', 'cta'],
  'schedule-times': ['hero', 'schedule', 'booking', 'cta'],
  'team-profiles': ['hero', 'team', 'about', 'cta'],
  'location-map': ['hero', 'location', 'contact', 'cta'],
  'pricing-table': ['hero', 'pricing', 'features', 'cta'],
  'dashboard': ['hero', 'dashboard', 'features', 'cta'],
  'form': ['hero', 'form', 'contact', 'cta'],
};

// ============================================================================
// FEATURE MAPPING — transactionType → features
// ============================================================================

const TRANSACTION_TO_FEATURES: Record<string, string[]> = {
  'product-purchase': ['ecommerce', 'product-gallery', 'cart', 'checkout'],
  'service-booking': ['booking', 'schedule', 'calendar'],
  'subscription': ['pricing', 'membership', 'dashboard'],
  'lead-capture': ['contact-form', 'lead-capture', 'newsletter'],
  'marketplace': ['listings', 'search', 'vendor-profiles'],
  'community': ['forum', 'member-profiles', 'discussions'],
  'information': ['blog', 'articles', 'resources'],
};

// ============================================================================
// IMAGE KEYWORD MAPPING — valueObject → imageKeywords
// ============================================================================

const VALUE_OBJECT_TO_IMAGES: Record<string, string[]> = {
  'headphone': ['headphones', 'audio equipment', 'sound waves', 'music listening'],
  'yoga': ['yoga studio', 'meditation', 'wellness', 'fitness class'],
  'flower': ['flowers', 'bouquet', 'floral arrangement', 'garden'],
  'crypto': ['cryptocurrency', 'blockchain', 'digital wallet', 'trading'],
  'butcher': ['meat cuts', 'butcher shop', 'charcuterie', 'fresh meat'],
  'restaurant': ['restaurant interior', 'gourmet food', 'dining', 'chef'],
  'app': ['software interface', 'dashboard', 'mobile app', 'technology'],
  'service': ['professional service', 'consulting', 'team meeting', 'office'],
  'store': ['retail store', 'shopping', 'product display', 'ecommerce'],
  'course': ['online learning', 'classroom', 'education', 'training'],
};

// ============================================================================
// SECTION COMPONENT MAPPING — section id → component name
// ============================================================================

const SECTION_COMPONENT_MAP: Record<string, string> = {
  'hero': 'Hero',
  'features': 'Features',
  'product-showcase': 'ProductShowcase',
  'deals': 'Deals',
  'specifications': 'Specifications',
  'comparison': 'Comparison',
  'gallery': 'Gallery',
  'about': 'About',
  'testimonials': 'Testimonials',
  'reviews': 'Reviews',
  'schedule': 'Schedule',
  'booking': 'Booking',
  'team': 'Team',
  'location': 'LocationMap',
  'contact': 'ContactForm',
  'pricing': 'PricingTable',
  'dashboard': 'Dashboard',
  'cta': 'CTA',
};

// ============================================================================
// PRIMITIVE-BASED detectDomain
// ============================================================================

/**
 * Detect domain from primitives instead of industry catalogs.
 * Returns a DomainContext compatible with existing consumers.
 */
export function detectDomainFromPrimitives(
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec,
  prompt: string
): DomainContext {
  // Map aestheticSignals to mood
  let mood: DomainContext['mood'] = 'modern'; // default
  for (const signal of primitives.aestheticSignals) {
    const mapped = AESTHETIC_TO_MOOD[signal];
    if (mapped) {
      mood = mapped;
      break;
    }
  }

  // Map aestheticSignals to colorHint
  let colorHint = 'blue'; // default
  for (const signal of primitives.aestheticSignals) {
    const mapped = AESTHETIC_TO_COLOR[signal];
    if (mapped) {
      colorHint = mapped;
      break;
    }
  }

  // Map contentShape to suggestedSections
  const suggestedSections: string[] = ['hero', 'cta']; // defaults
  for (const shape of primitives.contentShape) {
    const sections = CONTENT_SHAPE_TO_SECTIONS[shape];
    if (sections) {
      suggestedSections.push(...sections.filter(s => !suggestedSections.includes(s)));
    }
  }

  // Map transactionType to features
  const features = TRANSACTION_TO_FEATURES[primitives.transactionType] ?? ['contact-form'];

  // Map valueObject to imageKeywords
  const imageKeywords = VALUE_OBJECT_TO_IMAGES[primitives.valueObject] ?? ['business', 'professional', 'office'];

  // Content keywords from emotional intent
  const contentKeywords = primitives.emotionalIntent.length > 0
    ? primitives.emotionalIntent
    : [primitives.valueObject];

  return {
    industry: primitives.valueObject,
    subIndustry: '',
    mood,
    features,
    contentKeywords,
    suggestedSections,
    colorHint,
    imageKeywords,
  };
}

// ============================================================================
// PRIMITIVE-BASED generateDesignTokens
// ============================================================================

/**
 * Generate design tokens from primitives instead of industry catalogs.
 * Returns a Record<string, unknown> compatible with existing consumers.
 */
export function generateDesignTokensFromPrimitives(
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec
): Record<string, unknown> {
  const { theme } = derivedSpec;

  // Typography mapping based on emotional intent
  let fontFamily = 'Inter, system-ui, sans-serif';
  let headingFont = 'Inter, system-ui, sans-serif';

  if (primitives.emotionalIntent.includes('premium') || primitives.emotionalIntent.includes('futuristic')) {
    fontFamily = 'Playfair Display, Georgia, serif';
    headingFont = 'Playfair Display, Georgia, serif';
  }
  if (primitives.aestheticSignals.includes('editorial-typography')) {
    fontFamily = 'Playfair Display, Georgia, serif';
    headingFont = 'Playfair Display, Georgia, serif';
  }
  if (primitives.valueObject === 'fitness' || primitives.valueObject === 'butcher') {
    headingFont = 'Oswald, Impact, sans-serif';
  }

  return {
    colors: {
      primary: theme.primary,
      secondary: theme.secondary,
      accent: theme.accent,
      background: theme.background,
      foreground: theme.foreground,
      muted: theme.muted,
      card: theme.card,
      border: theme.border,
    },
    typography: {
      fontFamily,
      headingFont,
      bodyFont: 'Inter, system-ui, sans-serif',
      scale: ['12px', '14px', '16px', '20px', '24px', '32px', '48px', '64px'],
    },
    spacing: ['4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'],
    borderRadius: { sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  };
}

// ============================================================================
// BRIDGE FUNCTIONS — with fallback to existing implementations
// ============================================================================

/**
 * Bridge function: detectDomain with primitive reasoning fallback.
 * When primitives are available, uses primitive-derived domain.
 * Otherwise, falls back to existing detectDomain.
 */
export function detectDomainBridge(
  primitives: BusinessPrimitives | undefined,
  derivedSpec: DerivedSpec | undefined,
  businessKnowledge: any,
  prompt: string
): DomainContext {
  if (primitives && derivedSpec) {
    return detectDomainFromPrimitives(primitives, derivedSpec, prompt);
  }
  // Fallback to existing implementation
  return detectDomain(businessKnowledge ?? buildMinimalBusinessKnowledge(prompt), prompt);
}

/**
 * Bridge function: generateDesignTokens with primitive reasoning fallback.
 * When primitives are available, uses primitive-derived tokens.
 * Otherwise, falls back to existing generateDesignTokens (imported from agent-generators).
 */
export function generateDesignTokensBridge(
  primitives: BusinessPrimitives | undefined,
  derivedSpec: DerivedSpec | undefined,
  industry: string,
  existingGenerator: (industry: string) => Record<string, unknown>
): Record<string, unknown> {
  if (primitives && derivedSpec) {
    return generateDesignTokensFromPrimitives(primitives, derivedSpec);
  }
  // Fallback to existing implementation
  return existingGenerator(industry);
}
