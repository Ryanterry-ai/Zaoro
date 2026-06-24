import { ArchitectDecision } from './architect.js';
import { DesignSystem } from './design-system-generator.js';
import { ComponentPlan } from './component-sourcer.js';

export interface MotionProfile {
  name: string;
  trigger: 'mount' | 'hover' | 'click' | 'scroll' | 'stagger' | 'loop';
  animation: string;
  duration: string;
  easing: string;
  delay?: string;
}

export interface MotionPlan {
  sectionAnimations: SectionMotion[];
  globalMotion: GlobalMotion;
  microInteractions: MicroInteraction[];
}

export interface SectionMotion {
  sectionType: string;
  enter: MotionProfile;
  children: MotionProfile | undefined;
  hover: MotionProfile | undefined;
}

export interface GlobalMotion {
  pageTransition: string;
  scrollReveal: string;
  loadingState: string;
  staggerDefault: string;
}

export interface MicroInteraction {
  component: string;
  interaction: string;
  animation: string;
  css: string;
}

// ─── Section motion profiles ──────────────────────────────────────

const SECTION_MOTION_PROFILES: Record<string, { enter: MotionProfile; children?: MotionProfile; hover?: MotionProfile }> = {
  hero: {
    enter: { name: 'hero-enter', trigger: 'mount', animation: 'fade-in + slide-up', duration: '600ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: '100ms' },
    children: { name: 'hero-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '500ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-75ms' },
  },
  'stats-bar': {
    enter: { name: 'stats-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'stats-count', trigger: 'mount', animation: 'count-up', duration: '1200ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-100ms' },
  },
  'featured-products': {
    enter: { name: 'products-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'products-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
    hover: { name: 'product-hover', trigger: 'hover', animation: 'scale(1.02) + shadow-lg', duration: '200ms', easing: 'ease-out' },
  },
  'product-grid': {
    enter: { name: 'grid-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'grid-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '350ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-60ms' },
    hover: { name: 'card-hover', trigger: 'hover', animation: 'scale(1.02) + border-highlight', duration: '200ms', easing: 'ease-out' },
  },
  categories: {
    enter: { name: 'categories-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'categories-stagger', trigger: 'stagger', animation: 'scale-in + fade-in', duration: '350ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
  },
  testimonials: {
    enter: { name: 'testimonials-enter', trigger: 'mount', animation: 'fade-in', duration: '500ms', easing: 'ease-out' },
    children: { name: 'testimonials-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-100ms' },
  },
  'newsletter-cta': {
    enter: { name: 'cta-enter', trigger: 'mount', animation: 'scale-in + fade-in', duration: '500ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  'features-grid': {
    enter: { name: 'features-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'features-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
  },
  'pricing-table': {
    enter: { name: 'pricing-enter', trigger: 'mount', animation: 'fade-in', duration: '500ms', easing: 'ease-out' },
    children: { name: 'pricing-stagger', trigger: 'stagger', animation: 'slide-up + scale-in', duration: '450ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-100ms' },
  },
  faq: {
    enter: { name: 'faq-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'faq-stagger', trigger: 'stagger', animation: 'slide-up', duration: '300ms', easing: 'ease-out', delay: 'stagger-60ms' },
  },
  team: {
    enter: { name: 'team-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'team-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
    hover: { name: 'avatar-hover', trigger: 'hover', animation: 'scale(1.05)', duration: '200ms', easing: 'ease-out' },
  },
  'class-schedule': {
    enter: { name: 'schedule-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'schedule-stagger', trigger: 'stagger', animation: 'slide-up', duration: '350ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-60ms' },
  },
  services: {
    enter: { name: 'services-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'services-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
  },
  cta: {
    enter: { name: 'cta-final-enter', trigger: 'mount', animation: 'scale-in + fade-in', duration: '500ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  'contact-form': {
    enter: { name: 'form-enter', trigger: 'mount', animation: 'slide-up + fade-in', duration: '500ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  'contact-info': {
    enter: { name: 'info-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'info-stagger', trigger: 'stagger', animation: 'slide-up', duration: '350ms', easing: 'ease-out', delay: 'stagger-80ms' },
  },
  gallery: {
    enter: { name: 'gallery-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'gallery-stagger', trigger: 'stagger', animation: 'scale-in + fade-in', duration: '350ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-60ms' },
  },
  'featured-projects': {
    enter: { name: 'projects-enter', trigger: 'mount', animation: 'fade-in', duration: '500ms', easing: 'ease-out' },
    children: { name: 'projects-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '450ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-100ms' },
    hover: { name: 'project-hover', trigger: 'hover', animation: 'scale(1.02) + shadow-xl', duration: '300ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  },
  clients: {
    enter: { name: 'clients-enter', trigger: 'mount', animation: 'fade-in', duration: '500ms', easing: 'ease-out' },
    children: { name: 'clients-stagger', trigger: 'stagger', animation: 'fade-in', duration: '300ms', easing: 'ease-out', delay: 'stagger-100ms' },
  },
  'post-grid': {
    enter: { name: 'posts-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'posts-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
  },
  skills: {
    enter: { name: 'skills-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'skills-stagger', trigger: 'stagger', animation: 'scale-in', duration: '250ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-40ms' },
  },
  'project-grid': {
    enter: { name: 'projectgrid-enter', trigger: 'mount', animation: 'fade-in', duration: '400ms', easing: 'ease-out' },
    children: { name: 'projectgrid-stagger', trigger: 'stagger', animation: 'slide-up + fade-in', duration: '400ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 'stagger-80ms' },
  },
};

// ─── Micro-interactions ───────────────────────────────────────────

const MICRO_INTERACTIONS: MicroInteraction[] = [
  { component: 'Button', interaction: 'hover', animation: 'scale(1.02) + shadow-md', css: 'hover:scale-[1.02] hover:shadow-md transition-all duration-200' },
  { component: 'Button', interaction: 'active', animation: 'scale(0.98)', css: 'active:scale-[0.98] transition-transform duration-100' },
  { component: 'Card', interaction: 'hover', animation: 'translateY(-2px) + border-highlight', css: 'hover:-translate-y-0.5 hover:border-zinc-700 transition-all duration-200' },
  { component: 'InputField', interaction: 'focus', animation: 'border-glow + ring', css: 'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200' },
  { component: 'Link', interaction: 'hover', animation: 'color-shift + underline', css: 'hover:text-white transition-colors duration-150' },
  { component: 'Badge', interaction: 'mount', animation: 'scale-in', css: 'animate-scale-in' },
  { component: 'Modal', interaction: 'enter', animation: 'fade-in + scale-in', css: 'animate-in fade-in zoom-in-95 duration-200' },
  { component: 'Modal', interaction: 'exit', animation: 'fade-out + scale-out', css: 'animate-out fade-out zoom-out-95 duration-150' },
  { component: 'Toast', interaction: 'enter', animation: 'slide-in-from-right + fade-in', css: 'animate-in slide-in-from-right-4 fade-in duration-300' },
  { component: 'Toast', interaction: 'exit', animation: 'slide-out-to-right + fade-out', css: 'animate-out slide-out-to-right-4 fade-out duration-200' },
  { component: 'Accordion', interaction: 'toggle', animation: 'height-transition', css: 'transition-all duration-300 ease-in-out overflow-hidden' },
  { component: 'Image', interaction: 'hover', animation: 'scale(1.05)', css: 'group-hover:scale-105 transition-transform duration-500' },
  { component: 'Avatar', interaction: 'hover', animation: 'scale(1.1)', css: 'hover:scale-110 transition-transform duration-200' },
  { component: 'ChipGroup', interaction: 'select', animation: 'background-shift + scale', css: 'transition-all duration-150' },
];

// ─── Motion Engine ────────────────────────────────────────────────

export class MotionEngine {
  planMotion(
    decision: ArchitectDecision,
    designSystem: DesignSystem,
    componentPlan: ComponentPlan,
  ): MotionPlan {
    const mood = designSystem.motion;

    console.log(`[motion-engine] Planning animations for ${decision.pages.length} pages`);

    const sectionAnimations = this.planSectionAnimations(decision);
    const globalMotion = this.planGlobalMotion(mood);
    const microInteractions = this.planMicroInteractions();

    console.log(`[motion-engine] ${sectionAnimations.length} section animations, ${microInteractions.length} micro-interactions`);

    return { sectionAnimations, globalMotion, microInteractions };
  }

  private planSectionAnimations(decision: ArchitectDecision): SectionMotion[] {
    const sections: SectionMotion[] = [];
    const seen = new Set<string>();

    for (const page of decision.pages) {
      for (const sectionType of page.sections) {
        if (seen.has(sectionType)) continue;
        seen.add(sectionType);

        const profile = SECTION_MOTION_PROFILES[sectionType];
        if (profile) {
          sections.push({
            sectionType,
            enter: profile.enter,
            children: profile.children,
            hover: profile.hover,
          });
        }
      }
    }

    return sections;
  }

  private planGlobalMotion(motion: DesignSystem['motion']): GlobalMotion {
    return {
      pageTransition: `transition-opacity ${motion.transitionDuration} ${motion.transitionEasing}`,
      scrollReveal: `opacity-0 translate-y-4 → opacity-1 translate-y-0 (${motion.transitionDuration})`,
      loadingState: `animate-pulse bg-zinc-800 rounded`,
      staggerDefault: motion.staggerDelay,
    };
  }

  private planMicroInteractions(): MicroInteraction[] {
    return MICRO_INTERACTIONS;
  }

  // ─── CSS Output ────────────────────────────────────────────────

  generateMotionCss(plan: MotionPlan, ds: DesignSystem): string {
    const lines: string[] = [];

    lines.push(`/* ─── Motion System ─── */`);
    lines.push(`/* Auto-generated by MotionEngine */`);
    lines.push('');

    lines.push(`@layer utilities {`);
    lines.push(`  .animate-hero-enter {`);
    lines.push(`    animation: heroEnter 600ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both;`);
    lines.push(`  }`);
    lines.push(`  .animate-stagger > * {`);
    lines.push(`    animation: slideUpFade 400ms cubic-bezier(0.16, 1, 0.3, 1) both;`);
    lines.push(`  }`);
    lines.push(`  .animate-stagger > *:nth-child(1) { animation-delay: 0ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(2) { animation-delay: ${ds.motion.staggerDelay}; }`);
    lines.push(`  .animate-stagger > *:nth-child(3) { animation-delay: calc(${ds.motion.staggerDelay} * 2); }`);
    lines.push(`  .animate-stagger > *:nth-child(4) { animation-delay: calc(${ds.motion.staggerDelay} * 3); }`);
    lines.push(`  .animate-stagger > *:nth-child(5) { animation-delay: calc(${ds.motion.staggerDelay} * 4); }`);
    lines.push(`  .animate-stagger > *:nth-child(6) { animation-delay: calc(${ds.motion.staggerDelay} * 5); }`);
    lines.push(``);
    lines.push(`  .hover-lift {`);
    lines.push(`    transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out;`);
    lines.push(`  }`);
    lines.push(`  .hover-lift:hover {`);
    lines.push(`    transform: translateY(-2px);`);
    lines.push(`    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.3);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  .hover-scale {`);
    lines.push(`    transition: transform 200ms ease-out;`);
    lines.push(`  }`);
    lines.push(`  .hover-scale:hover {`);
    lines.push(`    transform: scale(${ds.motion.hoverScale});`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  .hover-glow {`);
    lines.push(`    transition: box-shadow 300ms ease-out, border-color 300ms ease-out;`);
    lines.push(`  }`);
    lines.push(`  .hover-glow:hover {`);
    lines.push(`    box-shadow: 0 0 20px -5px var(--color-primary);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  .focus-glow:focus {`);
    lines.push(`    outline: none;`);
    lines.push(`    box-shadow: 0 0 0 3px var(--color-primary), 0 0 20px -5px var(--color-primary);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  .image-hover-zoom {`);
    lines.push(`    overflow: hidden;`);
    lines.push(`  }`);
    lines.push(`  .image-hover-zoom img {`);
    lines.push(`    transition: transform 500ms ease-out;`);
    lines.push(`  }`);
    lines.push(`  .image-hover-zoom:hover img {`);
    lines.push(`    transform: scale(1.05);`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  .count-up {`);
    lines.push(`    animation: countUp 1200ms cubic-bezier(0.16, 1, 0.3, 1) both;`);
    lines.push(`  }`);
    lines.push(`}`);

    lines.push('');
    lines.push(`@keyframes heroEnter {`);
    lines.push(`  from { opacity: 0; transform: translateY(24px); }`);
    lines.push(`  to { opacity: 1; transform: translateY(0); }`);
    lines.push(`}`);
    lines.push('');
    lines.push(`@keyframes slideUpFade {`);
    lines.push(`  from { opacity: 0; transform: translateY(16px); }`);
    lines.push(`  to { opacity: 1; transform: translateY(0); }`);
    lines.push(`}`);
    lines.push('');
    lines.push(`@keyframes scaleIn {`);
    lines.push(`  from { opacity: 0; transform: scale(0.95); }`);
    lines.push(`  to { opacity: 1; transform: scale(1); }`);
    lines.push(`}`);
    lines.push('');
    lines.push(`@keyframes countUp {`);
    lines.push(`  from { opacity: 0; transform: translateY(8px); }`);
    lines.push(`  to { opacity: 1; transform: translateY(0); }`);
    lines.push(`}`);

    return lines.join('\n');
  }

  // ─── Component motion class mapping ─────────────────────────────

  getMotionClasses(sectionType: string): { container: string; children: string; hover: string } {
    const profile = SECTION_MOTION_PROFILES[sectionType];
    if (!profile) return { container: '', children: '', hover: '' };

    const container = profile.enter ? `animate-fade-in` : '';
    const children = profile.children ? `animate-stagger` : '';
    const hover = profile.hover ? this.getHoverClass(sectionType) : '';

    return { container, children, hover };
  }

  private getHoverClass(sectionType: string): string {
    if (['featured-products', 'product-grid', 'featured-projects'].includes(sectionType)) return 'hover-lift image-hover-zoom';
    if (['team', 'trainers'].includes(sectionType)) return 'hover-scale';
    if (['categories', 'services', 'features-grid'].includes(sectionType)) return 'hover-lift';
    if (['testimonials', 'clients'].includes(sectionType)) return '';
    return 'hover-lift';
  }
}
