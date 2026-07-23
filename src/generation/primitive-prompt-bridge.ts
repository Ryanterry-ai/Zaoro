/**
 * Primitive Prompt Bridge — replaces industry-based analyzePrompt() and
 * page generators with primitive-derived versions.
 *
 * When PRIMITIVE_REASONING=1, these functions use the primitives from
 * the Primitive Reasoning Engine instead of industry catalogs.
 *
 * Falls back to existing functions when primitives are not available.
 */

import type { BusinessPrimitives } from './primitive-extractor.js';
import type { DerivedSpec, EntityDef, SectionDef } from './primitive-reasoner.js';
import type { Industry } from '../orchestration/types.js';
import type { PageSpec, SectionSpec, ComponentSpec } from './agent-generators.js';

// ============================================================================
// PRIMITIVE → INDUSTRY MAPPING
// ============================================================================

const PRIMITIVE_TO_INDUSTRY: Record<string, Industry> = {
  'headphone': 'consumer-electronics' as Industry,
  'yoga': 'fitness',
  'flower': 'ecommerce',
  'crypto': 'fintech',
  'butcher': 'ecommerce',
  'restaurant': 'restaurant',
  'app': 'saas',
  'service': 'saas',
  'store': 'ecommerce',
  'course': 'education',
  'business': 'saas',
};

// ============================================================================
// SECTION → COMPONENT MAPPING
// ============================================================================

const SECTION_TO_COMPONENT: Record<string, { name: string; type: string; props: Record<string, string> }> = {
  'hero': { name: 'HeroSection', type: 'hero', props: { title: '', subtitle: '', cta: '' } },
  'features': { name: 'FeaturesGrid', type: 'grid', props: { columns: '3', gap: '8' } },
  'product-showcase': { name: 'ProductGrid', type: 'grid', props: { columns: '3', gap: '8' } },
  'deals': { name: 'DealsCarousel', type: 'carousel', props: { items: '5' } },
  'specifications': { name: 'SpecsTable', type: 'table', props: { variant: 'detailed' } },
  'comparison': { name: 'ComparisonTable', type: 'table', props: { columns: '3' } },
  'gallery': { name: 'ImageGallery', type: 'gallery', props: { columns: '3', lightbox: 'true' } },
  'about': { name: 'AboutSection', type: 'content', props: { variant: 'split' } },
  'testimonials': { name: 'TestimonialCarousel', type: 'carousel', props: { items: '5' } },
  'reviews': { name: 'ReviewList', type: 'list', props: { variant: 'detailed' } },
  'schedule': { name: 'ScheduleGrid', type: 'grid', props: { columns: '7', timeSlot: '30' } },
  'booking': { name: 'BookingForm', type: 'form', props: { variant: 'inline' } },
  'team': { name: 'TeamGrid', type: 'grid', props: { columns: '3', showBio: 'true' } },
  'location': { name: 'LocationMap', type: 'map', props: { zoom: '14' } },
  'contact': { name: 'ContactForm', type: 'form', props: { variant: 'full' } },
  'pricing': { name: 'PricingTable', type: 'pricing', props: { columns: '3', highlight: 'middle' } },
  'dashboard': { name: 'DashboardPreview', type: 'image', props: { variant: 'mockup' } },
  'cta': { name: 'CallToAction', type: 'cta', props: { variant: 'centered' } },
};

// ============================================================================
// PRIMITIVE-BASED analyzePrompt
// ============================================================================

/**
 * Analyze prompt using primitives instead of industry if/else chain.
 * Returns the same interface as analyzePrompt() for backward compatibility.
 */
export function analyzePromptFromPrimitives(
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec,
  prompt: string
): {
  projectName: string;
  slug: string;
  industry: Industry;
  description: string;
  keywords: string[];
  url: string | undefined;
} {
  // Extract URL if present
  const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
  const url = urlMatch?.[0];

  // Use derived brand name as projectName
  const projectName = derivedSpec.brandName;

  // Use derived slug
  const slug = derivedSpec.slug;

  // Map valueObject to industry
  const industry = PRIMITIVE_TO_INDUSTRY[primitives.valueObject] ?? 'saas';

  // Extract keywords from emotional intent + valueObject
  const keywords = [
    primitives.valueObject,
    ...primitives.emotionalIntent,
    ...primitives.aestheticSignals,
  ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

  return {
    projectName,
    slug,
    industry,
    description: prompt,
    keywords,
    url,
  };
}

// ============================================================================
// PRIMITIVE-BASED PAGE GENERATOR
// ============================================================================

/**
 * Generate pages from primitives instead of industry-specific generators.
 * Returns PageSpec[] compatible with existing consumers.
 */
export function generatePagesFromPrimitives(
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec,
  businessContent?: {
    name?: string;
    tagline?: string;
    description?: string;
    services?: Array<{ name: string; description: string; price?: string }>;
    stats?: Array<{ value: string; label: string }>;
    testimonials?: Array<{ quote: string; author: string; role?: string; rating?: number }>;
    features?: string[];
    cta?: { title: string; button: string };
  }
): PageSpec[] {
  const { sections, copy, entities } = derivedSpec;
  const bizName = businessContent?.name ?? derivedSpec.brandName;
  const tagline = businessContent?.tagline ?? copy.heroSubtitle;
  const ctaTitle = businessContent?.cta?.title ?? copy.ctaText;
  const ctaButton = businessContent?.cta?.button ?? copy.ctaText;

  // Generate home page sections from derived sections
  const homeSections: SectionSpec[] = sections.map(section => {
    // Use the component name from the derived section, fallback to SECTION_TO_COMPONENT
    const sectionComponent = SECTION_TO_COMPONENT[section.id];
    const componentName = section.component ?? sectionComponent?.name ?? `${section.id}Section`;
    const componentType = sectionComponent?.type ?? 'content';
    const componentProps = sectionComponent?.props ?? {};

    // Populate component content based on section type
    const content: Record<string, unknown> = {};
    if (section.id === 'hero') {
      content['title'] = bizName;
      content['subtitle'] = tagline;
      content['cta'] = ctaButton;
    }
    if (section.id === 'cta') {
      content['title'] = ctaTitle;
      content['button'] = ctaButton;
    }
    if (section.id === 'testimonials' && businessContent?.testimonials) {
      content['items'] = businessContent.testimonials;
    }
    if (section.id === 'features' && businessContent?.features) {
      content['items'] = businessContent.features;
    }

    return {
      name: section.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      type: section.id,
      components: [
        {
          name: componentName,
          type: componentType,
          props: componentProps,
          ...(Object.keys(content).length > 0 ? { content } : {}),
        },
      ],
    };
  });

  const pages: PageSpec[] = [
    {
      name: 'Home',
      path: '/',
      description: `Home page for ${bizName}`,
      layout: 'default',
      auth: false,
      sections: homeSections,
    },
  ];

  // Add entity-based pages
  for (const entity of entities) {
    if (entity.slug === 'product' || entity.slug === 'listing') {
      pages.push({
        name: entity.name + 's',
        path: `/${entity.slug}s`,
        description: `${entity.name} listings`,
        layout: 'default',
        auth: false,
        sections: [
          {
            name: 'Grid',
            type: 'grid',
            components: [
              { name: 'ProductGrid', type: 'grid', props: { columns: '3', gap: '8' } },
            ],
          },
        ],
      });
    }
    if (entity.slug === 'appointment' || entity.slug === 'service') {
      pages.push({
        name: 'Schedule',
        path: '/schedule',
        description: 'Booking and schedule',
        layout: 'default',
        auth: false,
        sections: [
          {
            name: 'Schedule',
            type: 'schedule',
            components: [
              { name: 'ScheduleGrid', type: 'grid', props: { columns: '7' } },
            ],
          },
        ],
      });
    }
  }

  return pages;
}

// ============================================================================
// PRIMITIVE-BASED generateFromPrompt BRIDGE
// ============================================================================

/**
 * Bridge function: generateFromPrompt with primitive reasoning fallback.
 * When primitives are available, uses primitive-derived generation.
 * Otherwise, falls back to existing generateFromPrompt.
 */
export function generateFromPromptBridge(
  primitives: BusinessPrimitives | undefined,
  derivedSpec: DerivedSpec | undefined,
  prompt: string,
  existingGenerator: (prompt: string) => any
): any {
  if (primitives && derivedSpec) {
    // Use primitive-based generation
    const analysis = analyzePromptFromPrimitives(primitives, derivedSpec, prompt);
    const pages = generatePagesFromPrimitives(primitives, derivedSpec);

    return {
      manifest: {
        name: analysis.projectName,
        displayName: analysis.projectName,
        slug: analysis.slug,
        description: analysis.description,
        industry: analysis.industry,
        category: analysis.industry,
        complexity: 'moderate',
      },
      pages,
      // Other fields can be populated from derivedSpec as needed
    };
  }
  // Fallback to existing implementation
  return existingGenerator(prompt);
}
