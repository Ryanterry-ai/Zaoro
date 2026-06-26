import { ATOMIC_PRIMITIVES, buildPrimitivesCatalog } from './primitives.js';
import { FullStackBlueprint, DataModel, APIRouteSpec, StateStoreSpec } from '../types/index.js';
import { BusinessIntelligenceEngine, IntelligenceResult } from '../intelligence/business-intelligence-engine.js';
import { CapabilityGraph, CapabilityNode } from '../intelligence/capability-graph.js';
import { BusinessOperatingSystem, type BusinessOperatingSystemReport } from '../business-intelligence/business-operating-system.js';
import type { Pattern } from '../bos/schemas/knowledge/pattern.schema.js';

export interface ArchitectDecision {
  businessType: string;
  capabilities: string[];
  pages: PageDesign[];
  components: ComponentDesign[];
  stateModel: StateModelDesign[];
  colorScheme: ColorScheme;
  name: string;
  description: string;
}

export interface PageDesign {
  route: string;
  name: string;
  type: string;
  sections: string[];
  layout: string;
  description: string;
}

export interface ComponentDesign {
  name: string;
  type: string;
  usedPrimitives: string[];
  props: string[];
  description: string;
}

export interface StateModelDesign {
  name: string;
  fields: string[];
  description: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  mood: string;
}

// Capability → page mapping (no domain names, just capabilities)
const CAPABILITY_PAGES: Record<string, Array<{ route: string; name: string; type: string; sections: string[]; description: string }>> = {
  commerce: [{ route: '/shop', name: 'Shop', type: 'shop', sections: ['filter-bar', 'product-grid', 'pagination'], description: 'Product listing with filters' }],
  marketplace: [{ route: '/marketplace', name: 'Marketplace', type: 'shop', sections: ['filter-bar', 'product-grid', 'pagination'], description: 'Marketplace listings' }],
  booking: [{ route: '/booking', name: 'Book', type: 'booking', sections: ['service-select', 'calendar', 'time-slots', 'booking-form'], description: 'Appointment booking' }],
  'healthcare-clinic': [{ route: '/appointments', name: 'Appointments', type: 'booking', sections: ['service-select', 'calendar', 'time-slots', 'booking-form'], description: 'Patient appointments' }],
  'fitness-wellness': [{ route: '/classes', name: 'Classes', type: 'listing', sections: ['track-filter', 'course-grid'], description: 'Class schedule' }],
  education: [{ route: '/courses', name: 'Courses', type: 'listing', sections: ['track-filter', 'course-grid'], description: 'Course catalog' }],
  content: [{ route: '/blog', name: 'Blog', type: 'listing', sections: ['category-filter', 'post-grid', 'newsletter-cta'], description: 'Blog listing' }],
  crm: [{ route: '/contacts', name: 'Contacts', type: 'listing', sections: ['filter-bar', 'post-grid'], description: 'Contact management' }],
  analytics: [{ route: '/dashboard', name: 'Dashboard', type: 'dashboard', sections: ['stats-cards', 'charts', 'activity-feed'], description: 'Analytics dashboard' }],
  'project-management': [{ route: '/board', name: 'Board', type: 'dashboard', sections: ['stats-cards', 'activity-feed'], description: 'Project board' }],
  saas: [{ route: '/dashboard', name: 'Dashboard', type: 'dashboard', sections: ['stats-cards', 'charts', 'activity-feed'], description: 'SaaS dashboard' }],
  'property-management': [{ route: '/properties', name: 'Properties', type: 'listing', sections: ['filter-bar', 'product-grid', 'pagination'], description: 'Property listings' }],
  'case-management': [{ route: '/cases', name: 'Cases', type: 'listing', sections: ['filter-bar', 'post-grid'], description: 'Case management' }],
  'membership-platform': [{ route: '/community', name: 'Community', type: 'listing', sections: ['post-grid'], description: 'Community hub' }],
  'food-beverage': [{ route: '/menu', name: 'Menu', type: 'listing', sections: ['filter-bar', 'product-grid'], description: 'Menu listings' }],
  catalog: [{ route: '/catalog', name: 'Catalog', type: 'listing', sections: ['filter-bar', 'product-grid', 'pagination'], description: 'Catalog browsing' }],
  portfolio: [{ route: '/work', name: 'Work', type: 'listing', sections: ['project-grid', 'case-studies'], description: 'Portfolio showcase' }],
  agency: [{ route: '/work', name: 'Work', type: 'listing', sections: ['project-grid', 'case-studies'], description: 'Agency work' }],
  subscriptions: [{ route: '/pricing', name: 'Pricing', type: 'listing', sections: ['pricing-table'], description: 'Subscription plans' }],
  luxury: [{ route: '/collections', name: 'Collections', type: 'listing', sections: ['collection-grid', 'product-detail'], description: 'Luxury collections' }],
  watches: [{ route: '/collections', name: 'Collections', type: 'listing', sections: ['collection-grid', 'product-detail'], description: 'Watch collections' }],
  jewelry: [{ route: '/collections', name: 'Collections', type: 'listing', sections: ['collection-grid', 'product-detail'], description: 'Jewelry collections' }],
};

// Capability → home page hero sections
const CAPABILITY_HERO_SECTIONS: Record<string, string[]> = {
  commerce: ['featured-products', 'categories', 'testimonials', 'newsletter-cta'],
  marketplace: ['featured-products', 'categories', 'testimonials', 'newsletter-cta'],
  booking: ['services-grid', 'testimonials', 'cta'],
  'healthcare-clinic': ['services-grid', 'team', 'testimonials', 'cta'],
  'fitness-wellness': ['class-schedule', 'trainers', 'membership-plans', 'testimonials'],
  education: ['course-featured', 'stats', 'testimonials', 'cta'],
  content: ['post-grid', 'newsletter-cta', 'testimonials', 'cta'],
  crm: ['features-grid', 'stats', 'testimonials', 'cta'],
  analytics: ['features-grid', 'stats', 'testimonials', 'cta'],
  'project-management': ['features-grid', 'stats', 'testimonials', 'cta'],
  saas: ['features-grid', 'stats', 'pricing-table', 'testimonials', 'cta'],
  'property-management': ['featured-products', 'testimonials', 'cta'],
  'case-management': ['features-grid', 'testimonials', 'cta'],
  'membership-platform': ['features-grid', 'testimonials', 'cta'],
  'food-beverage': ['featured-products', 'categories', 'testimonials', 'cta'],
  catalog: ['featured-products', 'categories', 'testimonials', 'cta'],
  portfolio: ['featured-projects', 'services', 'skills', 'cta'],
  agency: ['services', 'case-studies', 'team', 'clients', 'cta'],
  subscriptions: ['features-grid', 'pricing-table', 'testimonials', 'faq'],
  luxury: ['featured-collections', 'craftsmanship', 'heritage-story', 'testimonials', 'cta'],
  watches: ['featured-collections', 'craftsmanship', 'heritage-story', 'testimonials', 'cta'],
  jewelry: ['featured-collections', 'craftsmanship', 'heritage-story', 'testimonials', 'cta'],
};

// Capability → state stores
const CAPABILITY_STATE_STORES: Record<string, { name: string; fields: string[]; description: string }> = {
  commerce: { name: 'cartState', fields: ['items', 'total', 'count', 'addItem', 'removeItem', 'clearCart'], description: 'Shopping cart state' },
  marketplace: { name: 'cartState', fields: ['items', 'total', 'count', 'addItem', 'removeItem', 'clearCart'], description: 'Marketplace cart state' },
  booking: { name: 'bookingState', fields: ['selectedService', 'selectedDate', 'selectedTime', 'contactInfo', 'isBooked'], description: 'Booking flow state' },
  'healthcare-clinic': { name: 'bookingState', fields: ['selectedService', 'selectedDate', 'selectedTime', 'contactInfo', 'isBooked'], description: 'Appointment state' },
  'fitness-wellness': { name: 'bookingState', fields: ['selectedClass', 'selectedDate', 'selectedTime', 'contactInfo', 'isBooked'], description: 'Class booking state' },
  analytics: { name: 'dashboardState', fields: ['stats', 'activity', 'selectedPeriod'], description: 'Dashboard data state' },
  'project-management': { name: 'boardState', fields: ['columns', 'tasks', 'selectedTask'], description: 'Kanban board state' },
  saas: { name: 'appState', fields: ['user', 'workspace', 'notifications', 'settings'], description: 'SaaS app state' },
  crm: { name: 'crmState', fields: ['contacts', 'deals', 'selectedContact'], description: 'CRM state' },
};

// Capability → color scheme
const CAPABILITY_COLORS: Record<string, ColorScheme> = {
  commerce: { primary: 'violet', secondary: 'fuchsia', accent: 'purple', gradient: 'from-violet-400 to-fuchsia-400', mood: 'premium' },
  marketplace: { primary: 'purple', secondary: 'pink', accent: 'fuchsia', gradient: 'from-purple-400 to-pink-400', mood: 'vibrant' },
  booking: { primary: 'cyan', secondary: 'blue', accent: 'teal', gradient: 'from-cyan-400 to-blue-400', mood: 'tech' },
  'healthcare-clinic': { primary: 'emerald', secondary: 'teal', accent: 'green', gradient: 'from-emerald-400 to-teal-400', mood: 'calming' },
  'fitness-wellness': { primary: 'red', secondary: 'orange', accent: 'amber', gradient: 'from-red-400 to-orange-400', mood: 'energetic' },
  education: { primary: 'blue', secondary: 'indigo', accent: 'sky', gradient: 'from-blue-400 to-indigo-400', mood: 'trustworthy' },
  content: { primary: 'rose', secondary: 'pink', accent: 'red', gradient: 'from-rose-400 to-pink-400', mood: 'editorial' },
  crm: { primary: 'sky', secondary: 'cyan', accent: 'blue', gradient: 'from-sky-400 to-cyan-400', mood: 'professional' },
  analytics: { primary: 'cyan', secondary: 'blue', accent: 'teal', gradient: 'from-cyan-400 to-blue-400', mood: 'tech' },
  'project-management': { primary: 'amber', secondary: 'orange', accent: 'yellow', gradient: 'from-amber-400 to-orange-400', mood: 'productive' },
  saas: { primary: 'indigo', secondary: 'violet', accent: 'purple', gradient: 'from-indigo-400 to-violet-400', mood: 'tech' },
  'property-management': { primary: 'emerald', secondary: 'teal', accent: 'green', gradient: 'from-emerald-400 to-teal-400', mood: 'trustworthy' },
  'case-management': { primary: 'slate', secondary: 'gray', accent: 'zinc', gradient: 'from-slate-400 to-gray-400', mood: 'authoritative' },
  'membership-platform': { primary: 'indigo', secondary: 'violet', accent: 'purple', gradient: 'from-indigo-400 to-violet-400', mood: 'community' },
  'food-beverage': { primary: 'amber', secondary: 'orange', accent: 'yellow', gradient: 'from-amber-400 to-orange-400', mood: 'warm' },
  catalog: { primary: 'teal', secondary: 'cyan', accent: 'emerald', gradient: 'from-teal-400 to-cyan-400', mood: 'clean' },
  portfolio: { primary: 'emerald', secondary: 'cyan', accent: 'teal', gradient: 'from-emerald-400 to-cyan-400', mood: 'creative' },
  agency: { primary: 'violet', secondary: 'purple', accent: 'indigo', gradient: 'from-violet-400 to-purple-400', mood: 'premium' },
  subscriptions: { primary: 'cyan', secondary: 'blue', accent: 'teal', gradient: 'from-cyan-400 to-blue-400', mood: 'tech' },
};

// Section → primitives mapping
const SECTION_PRIMITIVES: Record<string, string[]> = {
  hero: ['Hero', 'Container', 'Stack', 'Button', 'Badge'],
  'stats-bar': ['Grid', 'StatCard', 'Container'],
  'featured-products': ['Grid', 'ProductCard', 'Container'],
  'product-grid': ['Grid', 'ProductCard', 'FilterBar', 'Container'],
  categories: ['Grid', 'Card', 'Container'],
  testimonials: ['Grid', 'Card', 'StarRating', 'Container'],
  'newsletter-cta': ['Container', 'InputField', 'Button', 'Card'],
  'features-grid': ['Grid', 'Card', 'Container'],
  'pricing-table': ['Grid', 'Card', 'Button', 'Badge', 'Container'],
  faq: ['Stack', 'Card', 'Container'],
  services: ['Grid', 'Card', 'Container'],
  'services-grid': ['Grid', 'Card', 'Button', 'Container'],
  team: ['Grid', 'Card', 'Avatar', 'Container'],
  'class-schedule': ['Grid', 'Card', 'Badge', 'Container'],
  trainers: ['Grid', 'Card', 'Avatar', 'Container'],
  'membership-plans': ['Grid', 'Card', 'Button', 'Badge', 'Container'],
  'course-featured': ['Grid', 'Card', 'Badge', 'Container'],
  'menu-highlights': ['Stack', 'Card', 'Container'],
  gallery: ['Grid', 'ImagePlaceholder', 'Container'],
  'featured-projects': ['Grid', 'Card', 'Container'],
  caseStudies: ['Grid', 'Card', 'Container'],
  clients: ['Stack', 'Card', 'Container'],
  cta: ['CTASection', 'Container'],
  'contact-form': ['InputField', 'Textarea', 'Button', 'Stack', 'Card', 'Container'],
  'contact-info': ['Stack', 'Card', 'Container'],
  'filter-bar': ['FilterBar', 'Container'],
  pagination: ['Stack', 'Button', 'Container'],
  'service-select': ['Card', 'Grid', 'Container'],
  calendar: ['InputField', 'Container'],
  'time-slots': ['TimeSlotPicker', 'Container'],
  'booking-form': ['BookingForm', 'Container'],
  'stats-cards': ['Grid', 'StatCard', 'Container'],
  charts: ['Card', 'Container'],
  'activity-feed': ['Stack', 'Card', 'Container'],
  'track-filter': ['ChipGroup', 'Container'],
  'course-grid': ['Grid', 'Card', 'Badge', 'Container'],
  'post-grid': ['Grid', 'Card', 'Container'],
  skills: ['Stack', 'Badge', 'Container'],
  'project-grid': ['Grid', 'Card', 'Container'],
};

// Section → props mapping
const SECTION_PROPS: Record<string, string[]> = {
  hero: ['title', 'highlight', 'subtitle', 'ctaText', 'onCtaClick', 'badge'],
  'stats-bar': ['stats'],
  'featured-products': ['products', 'onAddToCart'],
  'product-grid': ['products', 'onAddToCart', 'selectedCategory', 'onCategoryChange'],
  categories: ['categories', 'onSelect'],
  testimonials: ['testimonials'],
  'newsletter-cta': ['email', 'onEmailChange', 'onSubmit', 'submitted'],
  'features-grid': ['features'],
  'pricing-table': ['plans', 'selected', 'onSelect', 'billingCycle'],
  faq: ['faqs', 'expanded', 'onToggle'],
  services: ['services'],
  'services-grid': ['services', 'onBook'],
  team: ['members', 'onSelect'],
  'class-schedule': ['classes', 'onBook'],
  trainers: ['trainers'],
  'membership-plans': ['plans', 'selected', 'onSelect'],
  'course-featured': ['courses', 'selectedTrack', 'onTrackChange', 'onSelect'],
  'menu-highlights': ['menu', 'selectedCategory', 'onCategoryChange'],
  gallery: ['images'],
  'featured-projects': ['projects', 'onSelect'],
  caseStudies: ['caseStudies'],
  clients: ['clients'],
  cta: ['title', 'subtitle', 'ctaText', 'onCtaClick'],
  'contact-form': ['onSubmit', 'sent'],
  'contact-info': ['address', 'email', 'phone', 'hours'],
  'booking-form': ['services', 'onSubmit', 'booked'],
  'stats-cards': ['stats'],
};

export class ArchitectAgent {
  private intelEngine = new BusinessIntelligenceEngine();

  designArchitecture(prompt: string, resolvedPattern?: Pattern | null): ArchitectDecision {
    // Run BOS first for business intelligence
    let biReport: BusinessOperatingSystemReport | undefined;
    try {
      const bos = new BusinessOperatingSystem();
      biReport = bos.analyze(prompt);
      console.log(`[architect] BOS: ${biReport.blueprint.pages.length} pages, ${biReport.blueprint.entities.length} entities`);
    } catch (err: any) {
      console.warn(`[architect] BOS failed, falling back to capability graph: ${err.message}`);
    }

    const intelligence = this.intelEngine.analyze(prompt);
    const capabilities = this.intelEngine.getTopCapabilities(intelligence, 0.1);
    const name = this.extractName(prompt);
    const colorScheme = this.inferColorScheme(prompt, capabilities);

    // Use resolved BOS pattern pages if available (single source of truth)
    // Otherwise use BOS blueprint, then capability graph fallback
    let pages: PageDesign[];
    if (resolvedPattern?.pages?.length) {
      pages = this.designPagesFromPattern(resolvedPattern, name);
      console.log(`[architect] Using resolved pattern: ${resolvedPattern.name} (${resolvedPattern.pages.length} pages)`);
    } else if (biReport) {
      pages = this.designPagesFromBlueprint(biReport, name);
    } else {
      pages = this.designPages(prompt, capabilities);
    }

    const components = this.designComponents(pages);
    const stateModel = this.designStateModel(capabilities);

    return {
      businessType: capabilities[0] || 'general',
      capabilities,
      pages,
      components,
      stateModel,
      colorScheme,
      name,
      description: `${name} — ${capabilities.join(', ')} application`,
    };
  }

  private designPagesFromPattern(pattern: Pattern, appName: string): PageDesign[] {
    const pages: PageDesign[] = [];
    const seenRoutes = new Set<string>();

    for (const patternPage of pattern.pages) {
      if (seenRoutes.has(patternPage.path)) continue;
      seenRoutes.add(patternPage.path);

      pages.push({
        route: patternPage.path,
        name: patternPage.name,
        type: patternPage.type,
        sections: patternPage.sections,
        layout: patternPage.type === 'home' ? 'hero' : patternPage.type === 'auth' ? 'centered' : 'standard',
        description: `${patternPage.name} page for ${appName}`,
      });
    }

    return pages;
  }

  private designPagesFromBlueprint(report: BusinessOperatingSystemReport, appName: string): PageDesign[] {
    const pages: PageDesign[] = [];
    const seenRoutes = new Set<string>();

    // Home page from blueprint
    pages.push({
      route: '/',
      name: 'Home',
      type: 'home',
      sections: this.determineHeroSections(report.capabilities),
      layout: 'default',
      description: `Landing page for ${appName}`,
    });
    seenRoutes.add('/');

    // Pages from BOS blueprint
    for (const page of report.blueprint.pages) {
      if (!seenRoutes.has(page.route)) {
        seenRoutes.add(page.route);
        pages.push({
          route: page.route,
          name: page.name,
          type: page.type,
          sections: page.requiredFeatures,
          layout: 'default',
          description: page.purpose,
        });
      }
    }

    // Contact page always exists
    if (!seenRoutes.has('/contact')) {
      pages.push({
        route: '/contact',
        name: 'Contact',
        type: 'static',
        sections: ['contact-form', 'contact-info'],
        layout: 'default',
        description: 'Contact page',
      });
    }

    return pages;
  }

  private designPages(prompt: string, capabilities: string[]): PageDesign[] {
    const pages: PageDesign[] = [];
    const seenRoutes = new Set<string>();

    // Home page always exists
    pages.push({
      route: '/',
      name: 'Home',
      type: 'home',
      sections: this.determineHeroSections(capabilities),
      layout: 'default',
      description: `Landing page for ${this.extractName(prompt)}`,
    });
    seenRoutes.add('/');

    // Add pages from capabilities
    for (const cap of capabilities) {
      const capPages = CAPABILITY_PAGES[cap] || [];
      for (const p of capPages) {
        if (!seenRoutes.has(p.route)) {
          seenRoutes.add(p.route);
          pages.push({ ...p, layout: 'default' });
        }
      }
    }

    // Contact page always exists
    if (!seenRoutes.has('/contact')) {
      pages.push({
        route: '/contact',
        name: 'Contact',
        type: 'static',
        sections: ['contact-form', 'contact-info'],
        layout: 'default',
        description: 'Contact page',
      });
    }

    return pages;
  }

  private determineHeroSections(capabilities: string[]): string[] {
    const sections: string[] = ['hero', 'stats-bar'];

    // Collect hero sections from all capabilities, pick the most relevant
    const allHeroSections: string[] = [];
    for (const cap of capabilities) {
      const capSections = CAPABILITY_HERO_SECTIONS[cap] || [];
      allHeroSections.push(...capSections);
    }

    // Deduplicate and pick top 4 unique sections
    const seen = new Set<string>();
    for (const s of allHeroSections) {
      if (!seen.has(s) && sections.length < 6) {
        seen.add(s);
        sections.push(s);
      }
    }

    // Always end with cta if not already present
    if (!sections.includes('cta')) sections.push('cta');

    return sections;
  }

  private designComponents(pages: PageDesign[]): ComponentDesign[] {
    const components: ComponentDesign[] = [];
    const seen = new Set<string>();

    for (const page of pages) {
      for (const section of page.sections) {
        const compName = this.sectionToComponentName(section);
        if (!seen.has(compName)) {
          seen.add(compName);
          components.push({
            name: compName,
            type: section,
            usedPrimitives: SECTION_PRIMITIVES[section] || ['Card', 'Container'],
            props: SECTION_PROPS[section] || [],
            description: `Section: ${section}`,
          });
        }
      }
    }

    return components;
  }

  private sectionToComponentName(section: string): string {
    return section
      .split(/[-/]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
  }

  private designStateModel(capabilities: string[]): StateModelDesign[] {
    const models: StateModelDesign[] = [];

    models.push({
      name: 'appState',
      fields: ['currentView', 'isLoading', 'notification'],
      description: 'Global app state',
    });

    const seenStores = new Set<string>();
    for (const cap of capabilities) {
      const store = CAPABILITY_STATE_STORES[cap];
      if (store && !seenStores.has(store.name)) {
        seenStores.add(store.name);
        models.push(store);
      }
    }

    return models;
  }

  private inferColorScheme(prompt: string, capabilities: string[]): ColorScheme {
    const lower = prompt.toLowerCase();

    // Prompt-level color overrides (semantic keywords)
    if (lower.includes('green') || lower.includes('organic') || lower.includes('eco') || lower.includes('sustainable')) {
      return { primary: 'emerald', secondary: 'green', accent: 'lime', gradient: 'from-emerald-400 to-green-400', mood: 'eco' };
    }
    if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-end')) {
      return { primary: 'amber', secondary: 'yellow', accent: 'gold', gradient: 'from-amber-400 to-yellow-400', mood: 'luxury' };
    }
    if (lower.includes('dark') || lower.includes('gothic') || lower.includes('bold')) {
      return { primary: 'red', secondary: 'orange', accent: 'amber', gradient: 'from-red-400 to-orange-400', mood: 'bold' };
    }
    if (lower.includes('minimal') || lower.includes('clean') || lower.includes('simple')) {
      return { primary: 'zinc', secondary: 'neutral', accent: 'stone', gradient: 'from-zinc-400 to-neutral-400', mood: 'minimal' };
    }

    // Capability-based color (first matching capability wins)
    for (const cap of capabilities) {
      if (CAPABILITY_COLORS[cap]) return CAPABILITY_COLORS[cap];
    }

    return { primary: 'violet', secondary: 'purple', accent: 'indigo', gradient: 'from-violet-400 to-purple-400', mood: 'premium' };
  }

  private extractName(prompt: string): string {
    const patterns = [
      /called\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      /named\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      /for\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      // Match "Build a <Industry> landing page" — capture the industry word
      /(?:build|create|make)\s+(?:a\s+)?(\w+)\s+(?:landing|website|app|page|platform|dashboard|store|site)/i,
      // Match "Build a <Industry> <Type>" — capture first meaningful word (NO /i — require uppercase)
      /(?:build|create|make)\s+(?:a\s+)?([A-Z][A-Za-z0-9]+)/,
    ];

    // Industry words that should NOT be used as app names — use keyword fallback instead
    const industryWords = new Set([
      'saas', 'ecommerce', 'e-commerce', 'fitness', 'healthcare', 'restaurant',
      'portfolio', 'agency', 'education', 'blog', 'news', 'law', 'legal',
      'travel', 'booking', 'hotel', 'cafe', 'food', 'dental', 'medical',
      'real estate', 'property', 'gym', 'yoga', 'store', 'shop', 'dashboard',
      'analytics', 'crm', 'ecommerce', 'luxury', 'premium', 'boutique', 'elite',
      'deluxe', 'watch', 'watches', 'jewelry', 'jewellery', 'timepiece', 'horology',
      'artisan', 'bespoke', 'haute', 'couture', 'fine', 'elegant', 'sophisticated',
      'chronograph', 'swiss', 'heritage', 'collection', 'brand', 'company', 'agency',
      'studio', 'firm', 'consulting', 'services', 'platform', 'solution', 'system',
      'tool', 'app', 'website', 'site', 'web', 'digital', 'online',
    ]);

    for (const pat of patterns) {
      const m = prompt.match(pat);
      if (m && m[1]) {
        const captured = m[1].trim();
        // Skip generic words and industry words
        const skip = ['a', 'an', 'the', 'with', 'for', 'that', 'and', 'or', 'landing', 'website', 'app', 'page', 'platform', 'dashboard', 'store', 'site'];
        if (!skip.includes(captured.toLowerCase()) && !industryWords.has(captured.toLowerCase())) {
          // Capitalize first letter
          return captured.charAt(0).toUpperCase() + captured.slice(1);
        }
      }
    }

    // Fallback: generate a name based on keywords in the prompt
    const lower = prompt.toLowerCase();
    const nameMap: Record<string, string> = {
      'saas': 'Nexus', 'dashboard': 'Insight', 'analytics': 'Metric',
      'ecommerce': 'ShopFlow', 'store': 'ShopFlow', 'shop': 'ShopFlow',
      'restaurant': 'Savora', 'cafe': 'Brew & Co', 'food': 'Savora',
      'fitness': 'FitForge', 'gym': 'FitForge', 'yoga': 'ZenFlow',
      'healthcare': 'MedConnect', 'dental': 'SmileCare', 'medical': 'MedConnect',
      'real estate': 'HomeVista', 'property': 'HomeVista',
      'portfolio': 'Craftfolio', 'agency': 'StudioNova',
      'education': 'LearnHub', 'course': 'LearnHub', 'academy': 'LearnHub',
      'blog': 'BlogEngine', 'news': 'NewsFlow',
      'law': 'LexFirm', 'legal': 'LexFirm', 'attorney': 'LexFirm',
      'travel': 'Wanderly', 'booking': 'BookEase', 'hotel': 'Hospita',
      'luxury': 'Chronos', 'watch': 'Chronos', 'timepiece': 'Chronos', 'jewelry': 'Aurum',
      'boutique': 'Atelier', 'premium': 'Apex', 'artisan': 'Atelier',
    };
    for (const [keyword, name] of Object.entries(nameMap)) {
      if (lower.includes(keyword)) return name;
    }
    return 'Your Brand';
  }

  buildArchitecturePrompt(decision: ArchitectDecision): string {
    const primitivesCatalog = buildPrimitivesCatalog(decision.businessType);

    return `
## Architecture Decision for ${decision.name}

**Capabilities**: ${decision.capabilities.join(', ')}
**Description**: ${decision.description}
**Color Scheme**: ${decision.colorScheme.primary} primary, ${decision.colorScheme.mood} mood

### Pages to Generate
${decision.pages.map(p => `- **${p.route}** (${p.type}): ${p.description}\n  Sections: ${p.sections.join(', ')}`).join('\n')}

### Components to Create
${decision.components.map(c => `- **${c.name}** (${c.type}): ${c.description}\n  Primitives: ${c.usedPrimitives.join(', ')}\n  Props: ${c.props.join(', ')}`).join('\n')}

### State Model
${decision.stateModel.map(m => `- **${m.name}**: ${m.fields.join(', ')} — ${m.description}`).join('\n')}

### Available Atomic Primitives (use these to compose)
${primitivesCatalog}

### Design Tokens
Primary: ${decision.colorScheme.primary}
Gradient: bg-gradient-to-r ${decision.colorScheme.gradient}
Background: bg-zinc-950
Surface: bg-zinc-900
Border: border-zinc-800
Text: text-zinc-50 (headings), text-zinc-400 (body), text-zinc-500 (muted)
`;
  }
}

export class FullStackArchitect {
  private static intelEngine = new BusinessIntelligenceEngine();
  private static capGraph = new CapabilityGraph();

  public static design(prompt: string): FullStackBlueprint {
    const intelligence = this.intelEngine.analyze(prompt);
    const topCapabilities = this.intelEngine.getTopCapabilities(intelligence, 0.1);

    console.log(`[build.same.intelligence] Capabilities detected: ${topCapabilities.join(', ')}`);
    console.log(`[build.same.intelligence] Hybrid models: ${intelligence.hybridModels.join(', ') || 'none'}`);
    console.log(`[build.same.intelligence] Summary: ${intelligence.promptSummary}`);

    const resolvedNodes = this.capGraph.resolve(topCapabilities);

    const appName = this.extractName(prompt);
    const colorScheme = this.inferColorScheme(prompt, topCapabilities);

    const mergedDataModels = this.capGraph.mergeDataModels(resolvedNodes);
    const dataModels: DataModel[] = mergedDataModels.map(m => ({
      name: m.name,
      fields: m.fields.map(f => ({
        name: f.name,
        type: f.type as DataModel['fields'][0]['type'],
        isRequired: f.required,
        isId: f.isId ?? false,
      })),
    }));

    const mergedAPIEndpoints = this.capGraph.mergeAPIEndpoints(resolvedNodes);
    const apiRoutes: APIRouteSpec[] = mergedAPIEndpoints.map(ep => ({
      endpoint: ep.endpoint,
      method: ep.method,
      targetModel: ep.endpoint.split('/').pop() || '',
      description: ep.description,
    }));

    const mergedStateStores = this.capGraph.mergeStateStores(resolvedNodes);
    const stateStores: StateStoreSpec[] = mergedStateStores.map(s => ({
      name: s.name,
      properties: s.properties.map(p => ({ name: p.name, type: p.type, initialValue: p.initialValue })),
      actions: s.actions.map(a => ({ name: a.name, params: a.params, logic: a.logic })),
    }));

    const mergedPages = this.capGraph.mergePages(resolvedNodes);
    const pages: Array<{ path: string; title: string; layout: string; blocks: string[] }> = [
      { path: '/', title: appName, layout: 'default', blocks: ['hero', 'stats'] },
    ];

    for (const page of mergedPages) {
      if (!pages.some(p => p.path === page.route)) {
        pages.push({
          path: page.route,
          title: page.title,
          layout: 'default',
          blocks: page.blocks,
        });
      }
    }

    pages.push({ path: '/contact', title: 'Contact', layout: 'default', blocks: ['contact-form', 'contact-info'] });

    return {
      appName,
      colorScheme,
      dataModels,
      apiRoutes,
      stateStores,
      pages,
    };
  }

  private static extractName(prompt: string): string {
    const patterns = [
      /called\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      /named\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      /for\s+([A-Z][A-Za-z0-9\s&'.-]+)/,
      /(?:build|create|make)\s+(?:a\s+)?(?:\w+\s+){0,3}([A-Z][A-Za-z0-9\s&'.-]+?)(?:\s+(?:with|for|that|called|named)|\s*$)/i,
    ];
    for (const pat of patterns) {
      const m = prompt.match(pat);
      if (m && m[1]) return m[1].trim();
    }
    return 'Your App';
  }

  private static inferColorScheme(prompt: string, capabilities: string[]): 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' {
    const lower = prompt.toLowerCase();
    if (lower.includes('green') || lower.includes('organic') || lower.includes('eco')) return 'emerald';
    if (lower.includes('luxury') || lower.includes('premium')) return 'violet';
    if (capabilities.includes('crm') || capabilities.includes('analytics')) return 'sky';
    if (capabilities.includes('commerce') || capabilities.includes('marketplace')) return 'indigo';
    if (capabilities.includes('fitness-wellness')) return 'rose';
    if (capabilities.includes('food-beverage')) return 'amber';
    if (capabilities.includes('healthcare-clinic')) return 'emerald';
    return 'indigo';
  }
}
