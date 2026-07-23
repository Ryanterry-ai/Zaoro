/**
 * Primitive Adapter — translates Primitive Reasoning Engine output
 * into the format the React renderer expects.
 *
 * This file owns the translation between two contracts:
 *   PrimitiveGenerator → PageSpec[]
 *   ReactRenderer → ComponentSpec[]
 *
 * Neither side knows about the other. This adapter bridges them.
 */

import type { BusinessPrimitives } from './primitive-extractor.js';
import type { DerivedSpec, EntityDef, SectionDef } from './primitive-reasoner.js';
import type { PageSpec, SectionSpec, ComponentSpec } from './agent-generators.js';

// ============================================================================
// TYPES
// ============================================================================

export interface RendererInput {
  pages: PageSpec[];
  components: ComponentSpec[];
}

// ============================================================================
// MAIN ADAPTER
// ============================================================================

/**
 * Translate primitive output into renderer-ready ComponentSpec[].
 * Each section becomes a ComponentSpec with props that exactly match
 * what the React renderer template expects.
 */
export function adaptPrimitiveOutput(
  pages: PageSpec[],
  primitives: BusinessPrimitives,
  derivedSpec: DerivedSpec,
): RendererInput {
  const components: ComponentSpec[] = [];

  for (const page of pages) {
    for (const section of page.sections) {
      const component = adaptSection(section, primitives, derivedSpec);
      if (component) {
        components.push(component);
      }
    }
  }

  return { pages, components };
}

// ============================================================================
// SECTION ADAPTER
// ============================================================================

function adaptSection(
  section: SectionSpec,
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec | null {
  switch (section.type) {
    case 'hero':
      return adaptHero(primitives, derived, section);
    case 'features':
      return adaptFeatures(primitives, derived);
    case 'product-showcase':
      return adaptProductShowcase(primitives, derived);
    case 'testimonials':
      return adaptTestimonials(primitives, derived);
    case 'cta':
      return adaptCTA(primitives, derived);
    case 'deals':
      return adaptDeals(primitives, derived);
    case 'gallery':
      return adaptGallery(primitives, derived);
    case 'contact':
      return adaptContact(primitives, derived);
    case 'schedule':
      return adaptSchedule(primitives, derived);
    case 'pricing':
      return adaptPricing(primitives, derived);
    default:
      return null;
  }
}

// ============================================================================
// COMPONENT ADAPTERS
// ============================================================================

function adaptHero(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
  section?: SectionSpec,
): ComponentSpec {
  // Use component name from section if available, otherwise select based on signals
  const sectionComponent = section?.components?.[0]?.name;
  const componentName = sectionComponent === 'SoundwaveHero'
    ? 'SoundwaveHero'
    : selectHeroComponent(primitives.aestheticSignals);

  return {
    name: componentName,
    type: componentName,
    props: {
      title: derived.brandName,
      subtitle: derived.copy.heroSubtitle,
      cta: derived.copy.ctaText,
    },
    content: {
      title: { value: derived.brandName, type: 'text' },
      subtitle: { value: derived.copy.heroSubtitle, type: 'text' },
      cta: { value: derived.copy.ctaText, type: 'text' },
    },
  };
}

function adaptFeatures(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  // Generate feature items from entities
  const items = derived.entities.map(entity => ({
    title: entity.name,
    description: `Manage your ${entity.name.toLowerCase()}s with ease`,
    icon: getEntityIcon(entity),
  }));

  return {
    name: 'FeatureGrid',
    type: 'FeatureGrid',
    props: {
      title: derived.copy.heroTitle,
      subtitle: derived.copy.heroSubtitle,
      columns: '3',
    },
    content: {
      title: { value: derived.copy.heroTitle, type: 'text' },
      subtitle: { value: derived.copy.heroSubtitle, type: 'text' },
      items,
    },
  };
}

function adaptProductShowcase(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  // Find product entity
  const productEntity = derived.entities.find(e =>
    e.slug === 'product' || e.slug === 'listing'
  );

  // Generate mock product items
  const items = productEntity
    ? generateMockProducts(productEntity, primitives.currency)
    : [];

  return {
    name: 'ProductShowcase',
    type: 'ProductShowcase',
    props: {
      title: 'Our Products',
      subtitle: 'Explore our collection',
      currency: primitives.currency ?? 'USD',
      columns: '3',
    },
    content: {
      title: { value: 'Our Products', type: 'text' },
      subtitle: { value: 'Explore our collection', type: 'text' },
      items,
    },
  };
}

function adaptTestimonials(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  // Generate mock testimonials
  const items = [
    { quote: 'Exceptional quality and service.', author: 'Sarah M.', role: 'Customer', rating: 5 },
    { quote: 'Exceeded all expectations.', author: 'James R.', role: 'Client', rating: 5 },
    { quote: 'A true partner in success.', author: 'Emily T.', role: 'Partner', rating: 5 },
  ];

  return {
    name: 'CarouselSection',
    type: 'CarouselSection',
    props: {
      title: 'Testimonials',
    },
    content: {
      title: { value: 'Testimonials', type: 'text' },
      items,
    },
  };
}

function adaptCTA(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'CTASection',
    type: 'CTASection',
    props: {
      title: derived.copy.ctaText,
      button: derived.copy.ctaText,
      variant: 'centered',
    },
    content: {
      title: { value: derived.copy.ctaText, type: 'text' },
      button: { value: derived.copy.ctaText, type: 'text' },
    },
  };
}

function adaptDeals(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'DealsSection',
    type: 'DealsSection',
    props: {
      title: 'Special Offers',
      subtitle: 'Limited time deals',
    },
    content: {
      title: { value: 'Special Offers', type: 'text' },
      subtitle: { value: 'Limited time deals', type: 'text' },
      items: [
        { title: 'Deal 1', description: 'Save 20% today' },
        { title: 'Deal 2', description: 'Free shipping' },
      ],
    },
  };
}

function adaptGallery(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'GallerySection',
    type: 'GallerySection',
    props: {
      title: 'Gallery',
      columns: '3',
      lightbox: 'true',
    },
    content: {
      title: { value: 'Gallery', type: 'text' },
    },
  };
}

function adaptContact(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'ContactForm',
    type: 'ContactForm',
    props: {
      title: 'Contact Us',
      variant: 'full',
    },
    content: {
      title: { value: 'Contact Us', type: 'text' },
    },
  };
}

function adaptSchedule(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'ScheduleGrid',
    type: 'ScheduleGrid',
    props: {
      title: 'Schedule',
      columns: '7',
    },
    content: {
      title: { value: 'Schedule', type: 'text' },
    },
  };
}

function adaptPricing(
  primitives: BusinessPrimitives,
  derived: DerivedSpec,
): ComponentSpec {
  return {
    name: 'PricingTable',
    type: 'PricingTable',
    props: {
      title: 'Pricing',
    },
    content: {
      title: { value: 'Pricing', type: 'text' },
      tiers: [
        { name: 'Basic', price: '$9', period: '/mo', features: ['Feature 1', 'Feature 2'] },
        { name: 'Pro', price: '$29', period: '/mo', features: ['Feature 1', 'Feature 2', 'Feature 3'], highlighted: true },
        { name: 'Enterprise', price: '$99', period: '/mo', features: ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'] },
      ],
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function selectHeroComponent(signals: string[]): string {
  if (signals.includes('soundwave') || signals.includes('scroll-animation')) {
    return 'SoundwaveHero';
  }
  if (signals.includes('video-background')) return 'VideoBanner';
  if (signals.includes('immersive-scroll')) return 'ParallaxHero';
  return 'HeroBanner';
}

function getEntityIcon(entity: EntityDef): string {
  const iconMap: Record<string, string> = {
    product: 'shopping-bag',
    listing: 'tag',
    appointment: 'calendar',
    service: 'briefcase',
    subscription: 'credit-card',
    lead: 'user',
    member: 'users',
    article: 'file-text',
  };
  return iconMap[entity.slug] ?? 'layers';
}

function generateMockProducts(
  entity: EntityDef,
  currency: string | undefined,
): Array<{ title: string; description: string; price: string; icon: string }> {
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  return [
    {
      title: `${entity.name} One`,
      description: `Premium ${entity.name.toLowerCase()} with advanced features`,
      price: `${currencySymbol}99`,
      icon: 'star',
    },
    {
      title: `${entity.name} Two`,
      description: `Professional ${entity.name.toLowerCase()} for everyday use`,
      price: `${currencySymbol}149`,
      icon: 'zap',
    },
    {
      title: `${entity.name} Three`,
      description: `Elite ${entity.name.toLowerCase()} for the discerning user`,
      price: `${currencySymbol}199`,
      icon: 'crown',
    },
  ];
}
