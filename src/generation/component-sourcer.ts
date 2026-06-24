import { ArchitectDecision, PageDesign } from './architect.js';
import { DesignSystem } from './design-system-generator.js';
import { ResearchResult } from './research-agent.js';
import { ATOMIC_PRIMITIVES, AtomicPrimitive, getPrimitiveByName } from './primitives.js';

export interface ComponentSource {
  name: string;
  category: string;
  source: 'primitive' | 'pattern' | 'composed';
  primitives: string[];
  code: string;
  props: string[];
  motionProfile?: string;
  accessibilityNotes: string[];
}

export interface ComponentPlan {
  sections: SectionComponent[];
  sharedComponents: SharedComponent[];
  layoutComponents: LayoutComponent[];
}

export interface SectionComponent {
  sectionType: string;
  componentName: string;
  sources: ComponentSource[];
  layout: string;
  responsive: string;
  composition: string;
  motionProfile: string;
}

export interface SharedComponent {
  name: string;
  type: 'navbar' | 'footer' | 'button' | 'card' | 'input' | 'modal' | 'badge' | 'avatar';
  source: ComponentSource;
  variants: string[];
}

export interface LayoutComponent {
  name: string;
  type: 'container' | 'grid' | 'stack' | 'section';
  source: ComponentSource;
}

// ─── Section → Component Composition Patterns ─────────────────────

const SECTION_COMPOSITIONS: Record<string, { primitives: string[]; layout: string; responsive: string; motion: string }> = {
  hero: {
    primitives: ['Hero', 'Container', 'Stack', 'Button', 'Badge'],
    layout: 'centered',
    responsive: 'text scales from 3xl to 5xl-7xl, CTA stacks on mobile',
    motion: 'fade-in + slide-up on mount, stagger children',
  },
  'stats-bar': {
    primitives: ['Grid', 'StatCard', 'Container'],
    layout: '4-column grid',
    responsive: '2 cols on mobile, 4 on desktop',
    motion: 'stagger fade-in, count-up animation on numbers',
  },
  'featured-products': {
    primitives: ['Grid', 'ProductCard', 'Container'],
    layout: '4-column grid',
    responsive: '1 col mobile, 2 col tablet, 4 col desktop',
    motion: 'stagger slide-up, hover scale on cards',
  },
  'product-grid': {
    primitives: ['Grid', 'ProductCard', 'FilterBar', 'Container'],
    layout: 'filter bar + 4-column grid',
    responsive: 'filter wraps, grid adapts',
    motion: 'filter transition, card stagger',
  },
  categories: {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger fade-in, hover lift',
  },
  testimonials: {
    primitives: ['Grid', 'Card', 'StarRating', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger slide-up',
  },
  'newsletter-cta': {
    primitives: ['Container', 'InputField', 'Button', 'Card'],
    layout: 'centered card with form',
    responsive: 'input + button stack on mobile',
    motion: 'fade-in, input focus glow',
  },
  'features-grid': {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 2-3 col desktop',
    motion: 'stagger fade-in, icon bounce on hover',
  },
  'pricing-table': {
    primitives: ['Grid', 'Card', 'Button', 'Badge', 'Container'],
    layout: '3-column, middle highlighted',
    responsive: 'stack on mobile, side-by-side on desktop',
    motion: 'stagger scale-in, highlight pulse',
  },
  faq: {
    primitives: ['Stack', 'Card', 'Container'],
    layout: 'vertical stack',
    responsive: 'full width',
    motion: 'accordion expand/collapse',
  },
  services: {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger fade-in',
  },
  'services-grid': {
    primitives: ['Grid', 'Card', 'Button', 'Container'],
    layout: '3-column grid with CTAs',
    responsive: 'stack on mobile',
    motion: 'stagger slide-up, hover border glow',
  },
  team: {
    primitives: ['Grid', 'Card', 'Avatar', 'Container'],
    layout: '4-column grid',
    responsive: '2 col mobile, 4 col desktop',
    motion: 'stagger fade-in, avatar scale on hover',
  },
  'class-schedule': {
    primitives: ['Grid', 'Card', 'Badge', 'Container'],
    layout: '4-column grid',
    responsive: '1 col mobile, 2-4 col desktop',
    motion: 'stagger fade-in, button hover',
  },
  trainers: {
    primitives: ['Grid', 'Card', 'Avatar', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger fade-in',
  },
  'membership-plans': {
    primitives: ['Grid', 'Card', 'Button', 'Badge', 'Container'],
    layout: '3-column pricing',
    responsive: 'stack on mobile',
    motion: 'scale-in, highlighted card pulse',
  },
  'course-featured': {
    primitives: ['Grid', 'Card', 'Badge', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger fade-in',
  },
  'menu-highlights': {
    primitives: ['Stack', 'Card', 'Container'],
    layout: 'vertical list with images',
    responsive: 'full width',
    motion: 'stagger slide-in',
  },
  gallery: {
    primitives: ['Grid', 'ImagePlaceholder', 'Container'],
    layout: 'masonry grid',
    responsive: '2 col mobile, 3-4 col desktop',
    motion: 'stagger fade-in, lightbox on click',
  },
  'featured-projects': {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '2-column large cards',
    responsive: '1 col mobile, 2 col desktop',
    motion: 'stagger slide-up, hover parallax',
  },
  caseStudies: {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '2-column grid',
    responsive: '1 col mobile, 2 col desktop',
    motion: 'stagger fade-in',
  },
  clients: {
    primitives: ['Stack', 'Card', 'Container'],
    layout: 'horizontal logo bar',
    responsive: 'wrap on mobile',
    motion: 'fade-in, scroll reveal',
  },
  cta: {
    primitives: ['CTASection', 'Container'],
    layout: 'centered card',
    responsive: 'full width',
    motion: 'fade-in, button hover glow',
  },
  'contact-form': {
    primitives: ['InputField', 'Textarea', 'Button', 'Stack', 'Card', 'Container'],
    layout: 'centered form card',
    responsive: 'full width on mobile',
    motion: 'fade-in, input focus transitions',
  },
  'contact-info': {
    primitives: ['Stack', 'Card', 'Container'],
    layout: '2-column info cards',
    responsive: 'stack on mobile',
    motion: 'stagger fade-in',
  },
  'filter-bar': {
    primitives: ['FilterBar', 'Container'],
    layout: 'horizontal scrollable',
    responsive: 'wrap on mobile',
    motion: 'chip selection transition',
  },
  pagination: {
    primitives: ['Stack', 'Button', 'Container'],
    layout: 'centered row',
    responsive: 'full width',
    motion: 'button hover',
  },
  'service-select': {
    primitives: ['Card', 'Grid', 'Container'],
    layout: '3-column selectable cards',
    responsive: 'stack on mobile',
    motion: 'selection highlight, stagger fade-in',
  },
  calendar: {
    primitives: ['InputField', 'Container'],
    layout: 'date picker',
    responsive: 'full width',
    motion: 'date selection transition',
  },
  'time-slots': {
    primitives: ['TimeSlotPicker', 'Container'],
    layout: 'grid of time slots',
    responsive: 'wrap on mobile',
    motion: 'selection highlight',
  },
  'booking-form': {
    primitives: ['BookingForm', 'Container'],
    layout: 'centered form card',
    responsive: 'full width on mobile',
    motion: 'fade-in, success animation',
  },
  'stats-cards': {
    primitives: ['Grid', 'StatCard', 'Container'],
    layout: '4-column grid',
    responsive: '2 col mobile, 4 col desktop',
    motion: 'stagger count-up',
  },
  charts: {
    primitives: ['Card', 'Container'],
    layout: 'card with chart area',
    responsive: 'full width',
    motion: 'chart reveal animation',
  },
  'activity-feed': {
    primitives: ['Stack', 'Card', 'Container'],
    layout: 'vertical feed',
    responsive: 'full width',
    motion: 'stagger slide-in',
  },
  'track-filter': {
    primitives: ['ChipGroup', 'Container'],
    layout: 'horizontal chips',
    responsive: 'scroll on mobile',
    motion: 'chip selection',
  },
  'course-grid': {
    primitives: ['Grid', 'Card', 'Badge', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 3 col desktop',
    motion: 'stagger fade-in',
  },
  'post-grid': {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '3-column grid',
    responsive: '1 col mobile, 2-3 col desktop',
    motion: 'stagger fade-in',
  },
  skills: {
    primitives: ['Stack', 'Badge', 'Container'],
    layout: 'flex wrap badges',
    responsive: 'wrap on mobile',
    motion: 'stagger fade-in',
  },
  'project-grid': {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '2-column grid',
    responsive: '1 col mobile, 2 col desktop',
    motion: 'stagger slide-up',
  },
  'practice-areas': {
    primitives: ['Grid', 'Card', 'Container'],
    layout: '3-column grid',
    responsive: 'stack on mobile',
    motion: 'stagger fade-in',
  },
  mission: {
    primitives: ['Container', 'Stack'],
    layout: 'centered text section',
    responsive: 'full width',
    motion: 'fade-in',
  },
  about: {
    primitives: ['Grid', 'Card', 'Container'],
    layout: 'text + image split',
    responsive: 'stack on mobile',
    motion: 'fade-in',
  },
};

// ─── Component Sourcer ────────────────────────────────────────────

export class ComponentSourcer {
  sourceComponents(
    decision: ArchitectDecision,
    designSystem: DesignSystem,
    research: ResearchResult,
  ): ComponentPlan {
    console.log(`[component-sourcer] Planning components for ${decision.pages.length} pages`);

    const sections = this.planSections(decision, designSystem);
    const sharedComponents = this.planSharedComponents(decision, designSystem);
    const layoutComponents = this.planLayoutComponents(designSystem);

    console.log(`[component-sourcer] ${sections.length} sections, ${sharedComponents.length} shared, ${layoutComponents.length} layout`);

    return { sections, sharedComponents, layoutComponents };
  }

  private planSections(decision: ArchitectDecision, ds: DesignSystem): SectionComponent[] {
    const sections: SectionComponent[] = [];
    const seen = new Set<string>();

    for (const page of decision.pages) {
      for (const sectionType of page.sections) {
        if (seen.has(sectionType)) continue;
        seen.add(sectionType);

        const composition = SECTION_COMPOSITIONS[sectionType] || SECTION_COMPOSITIONS['features-grid'] || { primitives: [], layout: 'grid', responsive: 'responsive', motion: 'subtle' };
        const sources = composition.primitives.map(pName => this.sourcePrimitive(pName, ds)).filter(Boolean) as ComponentSource[];

        sections.push({
          sectionType,
          componentName: this.toPascalCase(sectionType),
          sources,
          layout: composition.layout,
          responsive: composition.responsive,
          composition: sectionType,
          motionProfile: composition.motion,
        });
      }
    }

    return sections;
  }

  private sourcePrimitive(name: string, ds: DesignSystem): ComponentSource | null {
    const primitive = getPrimitiveByName(name);
    if (!primitive) return null;

    return {
      name: primitive.name,
      category: primitive.category,
      source: 'primitive',
      primitives: [primitive.name],
      code: primitive.exampleCode,
      props: primitive.props,
      motionProfile: ds.motion.hoverScale !== '1.01' ? 'hover-scale' : 'subtle',
      accessibilityNotes: this.getAccessibilityNotes(primitive),
    };
  }

  private planSharedComponents(decision: ArchitectDecision, ds: DesignSystem): SharedComponent[] {
    const shared: SharedComponent[] = [];
    const primary = ds.colors.primary;

    shared.push({
      name: 'Navbar',
      type: 'navbar',
      source: {
        name: 'Navbar',
        category: 'navigation',
        source: 'composed',
        primitives: ['Navbar', 'Button', 'Container'],
        code: `<nav className="${ds.layout.containerClass} fixed top-0 w-full z-50 backdrop-blur-md border-b border-${ds.colors.border.default} bg-${ds.colors.surface.bg}/80">
  <div className="flex items-center justify-between py-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-${primary[500]} to-${ds.colors.secondary[500]} flex items-center justify-center font-black text-sm text-white">${decision.name.charAt(0)}</div>
      <span className="font-black text-lg">${decision.name}</span>
    </div>
    <div className="hidden md:flex items-center gap-8 text-sm text-${ds.colors.text.muted}">
      <a href="/" className="text-${ds.colors.text.heading} cursor-pointer">Home</a>
      <a href="/about" className="hover:text-${ds.colors.text.heading} transition cursor-pointer">About</a>
      <a href="/contact" className="hover:text-${ds.colors.text.heading} transition cursor-pointer">Contact</a>
    </div>
    <button className="px-5 py-2.5 rounded-xl bg-${primary[600]} hover:bg-${primary[700]} text-sm font-bold text-white transition">Get Started</button>
  </div>
</nav>`,
        props: ['logo', 'links', 'cta'],
        motionProfile: 'backdrop-blur transition',
        accessibilityNotes: ['Use semantic nav element', 'ARIA labels for mobile menu', 'Keyboard navigation support'],
      },
      variants: ['default', 'transparent', 'sticky'],
    });

    shared.push({
      name: 'Footer',
      type: 'footer',
      source: {
        name: 'Footer',
        category: 'navigation',
        source: 'composed',
        primitives: ['Footer', 'Container'],
        code: `<footer className="border-t border-${ds.colors.border.default} py-12 px-6">
  <div className="${ds.layout.containerClass}">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-${primary[500]} to-${ds.colors.secondary[500]} flex items-center justify-center font-black text-sm text-white">${decision.name.charAt(0)}</div>
        <span className="font-black text-lg">${decision.name}</span>
      </div>
      <div className="flex items-center gap-6 text-sm text-${ds.colors.text.muted}">
        <a href="/privacy" className="hover:text-${ds.colors.text.heading} transition">Privacy</a>
        <a href="/terms" className="hover:text-${ds.colors.text.heading} transition">Terms</a>
        <a href="/contact" className="hover:text-${ds.colors.text.heading} transition">Contact</a>
      </div>
    </div>
    <div className="mt-8 pt-8 border-t border-${ds.colors.border.default} text-center text-xs text-${ds.colors.text.muted}">
      &copy; ${new Date().getFullYear()} ${decision.name}. All rights reserved.
    </div>
  </div>
</footer>`,
        props: ['links', 'copyright'],
        motionProfile: 'none',
        accessibilityNotes: ['Use semantic footer element', 'Copyright notice', 'Accessible link contrast'],
      },
      variants: ['default', 'minimal', 'multi-column'],
    });

    return shared;
  }

  private planLayoutComponents(ds: DesignSystem): LayoutComponent[] {
    return [
      {
        name: 'Container',
        type: 'container',
        source: {
          name: 'Container',
          category: 'layout',
          source: 'primitive',
          primitives: ['Container'],
          code: `<div className="${ds.layout.containerClass}">{children}</div>`,
          props: ['maxWidth', 'padding'],
          accessibilityNotes: ['Consistent horizontal rhythm'],
        },
      },
      {
        name: 'Grid',
        type: 'grid',
        source: {
          name: 'Grid',
          category: 'layout',
          source: 'primitive',
          primitives: ['Grid'],
          code: `<div className="${ds.layout.gridClass}">{children}</div>`,
          props: ['columns', 'gap'],
          accessibilityNotes: ['Logical reading order', 'Screen reader friendly'],
        },
      },
      {
        name: 'Section',
        type: 'section',
        source: {
          name: 'Section',
          category: 'layout',
          source: 'primitive',
          primitives: ['Section'],
          code: `<section className="${ds.layout.sectionClass}"><div className="${ds.layout.containerClass}">{children}</div></section>`,
          props: ['padding', 'background'],
          accessibilityNotes: ['Use semantic section element', 'ARIA landmark if needed'],
        },
      },
    ];
  }

  private getAccessibilityNotes(primitive: AtomicPrimitive): string[] {
    const notes: string[] = [];
    if (primitive.category === 'ui') notes.push('Ensure focus states are visible', 'Minimum 44px touch target');
    if (primitive.category === 'input') notes.push('Associate labels with inputs', 'Describe error states');
    if (primitive.category === 'navigation') notes.push('Use semantic nav element', 'Skip navigation link');
    if (primitive.category === 'content') notes.push('Proper heading hierarchy', 'Alt text for images');
    return notes;
  }

  private toPascalCase(str: string): string {
    return str.split(/[-/]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }
}
