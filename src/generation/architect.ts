import { BusinessClassifier } from './business-classifier.js';
import { ATOMIC_PRIMITIVES, buildPrimitivesCatalog } from './primitives.js';
import { FullStackBlueprint, DataModel, APIRouteSpec, StateStoreSpec } from '../types/index.js';
import { BusinessIntelligenceEngine, IntelligenceResult } from '../intelligence/business-intelligence-engine.js';
import { CapabilityGraph, CapabilityNode } from '../intelligence/capability-graph.js';

export interface ArchitectDecision {
  businessType: string;
  subDomains: string[];
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
  type: 'home' | 'listing' | 'detail' | 'auth' | 'dashboard' | 'static' | 'booking' | 'shop' | 'profile';
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

export class ArchitectAgent {
  private classifier: BusinessClassifier;

  constructor() {
    this.classifier = new BusinessClassifier();
  }

  designArchitecture(prompt: string): ArchitectDecision {
    const classification = this.classifier.classifyFromPrompt(prompt);
    const businessType = classification.type;
    const name = this.extractName(prompt);
    const subDomains = this.detectSubDomains(prompt, businessType);
    const colorScheme = this.inferColorScheme(prompt, businessType);

    const pages = this.designPages(prompt, businessType, subDomains);
    const components = this.designComponents(pages, businessType, subDomains);
    const stateModel = this.designStateModel(prompt, businessType, subDomains);

    return {
      businessType,
      subDomains,
      pages,
      components,
      stateModel,
      colorScheme,
      name,
      description: this.generateDescription(prompt, businessType, subDomains),
    };
  }

  private detectSubDomains(prompt: string, primaryType: string): string[] {
    const subs: string[] = [primaryType];
    const lower = prompt.toLowerCase();

    const keywords: Record<string, string[]> = {
      ecommerce: ['shop', 'store', 'sell', 'product', 'cart', 'buy', 'purchase', 'e-commerce', 'merchandise', 'retail'],
      booking: ['book', 'appointment', 'schedule', 'reserve', 'calendar', 'availability'],
      blog: ['blog', 'article', 'post', 'newsletter', 'content', 'write', 'publish'],
      saas: ['dashboard', 'analytics', 'subscription', 'plan', 'pricing', 'api', 'platform'],
      education: ['course', 'lesson', 'teach', 'learn', 'student', 'curriculum', 'training', 'class'],
      fitness: ['gym', 'workout', 'fitness', 'exercise', 'training', 'trainer', 'class'],
      healthcare: ['clinic', 'doctor', 'medical', 'health', 'patient', 'appointment', 'therapy', 'physical therapy'],
      marketplace: ['marketplace', 'listing', 'seller', 'buyer', 'vendor'],
      portfolio: ['portfolio', 'showcase', 'projects', 'freelance', 'hire'],
      agency: ['agency', 'client', 'service', 'consulting', 'digital'],
      restaurant: ['restaurant', 'menu', 'food', 'dining', 'cuisine', 'chef', 'kitchen'],
      tea: ['tea', 'organic', 'herbal', 'matcha', 'wellness'],
      martialarts: ['martial arts', 'karate', 'judo', 'taekwondo', 'mma', 'combat', 'dojo'],
    };

    for (const [domain, words] of Object.entries(keywords)) {
      if (words.some(w => lower.includes(w))) {
        if (!subs.includes(domain)) subs.push(domain);
      }
    }

    return subs;
  }

  private designPages(prompt: string, businessType: string, subDomains: string[]): PageDesign[] {
    const pages: PageDesign[] = [];

    pages.push({
      route: '/',
      name: 'Home',
      type: 'home',
      sections: this.determineHeroSections(subDomains),
      layout: 'default',
      description: `Landing page for ${this.extractName(prompt)}`,
    });

    if (subDomains.includes('ecommerce') || subDomains.includes('shop') || subDomains.includes('marketplace')) {
      pages.push({
        route: '/shop',
        name: 'Shop',
        type: 'shop',
        sections: ['filter-bar', 'product-grid', 'pagination'],
        layout: 'sidebar',
        description: 'Product listing with filters',
      });
    }

    if (subDomains.includes('booking') || subDomains.includes('healthcare') || subDomains.includes('fitness')) {
      pages.push({
        route: '/booking',
        name: 'Book',
        type: 'booking',
        sections: ['service-select', 'calendar', 'time-slots', 'booking-form'],
        layout: 'default',
        description: 'Appointment booking',
      });
    }

    if (subDomains.includes('saas') || subDomains.includes('dashboard')) {
      pages.push({
        route: '/dashboard',
        name: 'Dashboard',
        type: 'dashboard',
        sections: ['stats-cards', 'charts', 'activity-feed'],
        layout: 'sidebar',
        description: 'Main dashboard',
      });
    }

    if (subDomains.includes('education') || subDomains.includes('course')) {
      pages.push({
        route: '/courses',
        name: 'Courses',
        type: 'listing',
        sections: ['track-filter', 'course-grid'],
        layout: 'default',
        description: 'Course catalog',
      });
    }

    if (subDomains.includes('blog') || subDomains.includes('content')) {
      pages.push({
        route: '/blog',
        name: 'Blog',
        type: 'listing',
        sections: ['category-filter', 'post-grid', 'newsletter-cta'],
        layout: 'default',
        description: 'Blog listing',
      });
    }

    if (subDomains.includes('portfolio') || subDomains.includes('agency')) {
      pages.push({
        route: '/work',
        name: 'Work',
        type: 'listing',
        sections: ['project-grid', 'case-studies'],
        layout: 'default',
        description: 'Portfolio / case studies',
      });
    }

    pages.push({
      route: '/contact',
      name: 'Contact',
      type: 'static',
      sections: ['contact-form', 'contact-info'],
      layout: 'default',
      description: 'Contact page',
    });

    return pages;
  }

  private determineHeroSections(subDomains: string[]): string[] {
    const sections: string[] = ['hero', 'stats-bar'];

    if (subDomains.includes('ecommerce')) {
      sections.push('featured-products', 'categories', 'testimonials', 'newsletter-cta');
    } else if (subDomains.includes('saas')) {
      sections.push('features-grid', 'pricing-table', 'testimonials', 'faq');
    } else if (subDomains.includes('booking') || subDomains.includes('healthcare')) {
      sections.push('services-grid', 'team/doctors', 'testimonials', 'cta');
    } else if (subDomains.includes('fitness')) {
      sections.push('class-schedule', 'trainers', 'membership-plans', 'testimonials');
    } else if (subDomains.includes('education')) {
      sections.push('course-featured', 'stats', 'testimonials', 'cta');
    } else if (subDomains.includes('restaurant')) {
      sections.push('menu-highlights', 'gallery', 'testimonials', 'cta');
    } else if (subDomains.includes('portfolio')) {
      sections.push('featured-projects', 'services', 'skills', 'cta');
    } else if (subDomains.includes('agency')) {
      sections.push('services', 'case-studies', 'team', 'clients', 'cta');
    } else {
      sections.push('features', 'testimonials', 'cta');
    }

    return sections;
  }

  private designComponents(pages: PageDesign[], businessType: string, subDomains: string[]): ComponentDesign[] {
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
            usedPrimitives: this.getPrimitivesForSection(section),
            props: this.getPropsForSection(section),
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

  private getPrimitivesForSection(section: string): string[] {
    const map: Record<string, string[]> = {
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
      'team/doctors': ['Grid', 'Card', 'Avatar', 'Container'],
      'class-schedule': ['Grid', 'Card', 'Badge', 'Container'],
      trainers: ['Grid', 'Card', 'Avatar', 'Container'],
      'membership-plans': ['Grid', 'Card', 'Button', 'Badge', 'Container'],
      'course-featured': ['Grid', 'Card', 'Badge', 'Container'],
      'menu-highlights': ['Stack', 'Card', 'Container'],
      gallery: ['Grid', 'ImagePlaceholder', 'Container'],
      'featured-projects': ['Grid', 'Card', 'Container'],
      caseStudies: ['Grid', 'Card', 'Container'],
      team: ['Grid', 'Card', 'Avatar', 'Container'],
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
    };

    return map[section] || ['Card', 'Container'];
  }

  private getPropsForSection(section: string): string[] {
    const map: Record<string, string[]> = {
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
      'team/doctors': ['members', 'onSelect'],
      'class-schedule': ['classes', 'onBook'],
      trainers: ['trainers'],
      'membership-plans': ['plans', 'selected', 'onSelect'],
      'course-featured': ['courses', 'selectedTrack', 'onTrackChange', 'onSelect'],
      'menu-highlights': ['menu', 'selectedCategory', 'onCategoryChange'],
      gallery: ['images'],
      'featured-projects': ['projects', 'onSelect'],
      caseStudies: ['caseStudies'],
      team: ['team'],
      clients: ['clients'],
      cta: ['title', 'subtitle', 'ctaText', 'onCtaClick'],
      'contact-form': ['onSubmit', 'sent'],
      'contact-info': ['address', 'email', 'phone', 'hours'],
      'booking-form': ['services', 'onSubmit', 'booked'],
      'stats-cards': ['stats'],
    };

    return map[section] || [];
  }

  private designStateModel(prompt: string, businessType: string, subDomains: string[]): StateModelDesign[] {
    const models: StateModelDesign[] = [];

    models.push({
      name: 'appState',
      fields: ['currentView', 'isLoading', 'notification'],
      description: 'Global app state',
    });

    if (subDomains.includes('ecommerce') || subDomains.includes('shop') || subDomains.includes('marketplace')) {
      models.push({
        name: 'cartState',
        fields: ['items', 'total', 'count', 'addItem', 'removeItem', 'clearCart'],
        description: 'Shopping cart state with items, quantities, and totals',
      });
    }

    if (subDomains.includes('booking') || subDomains.includes('healthcare') || subDomains.includes('fitness')) {
      models.push({
        name: 'bookingState',
        fields: ['selectedService', 'selectedDate', 'selectedTime', 'contactInfo', 'isBooked'],
        description: 'Booking flow state',
      });
    }

    if (subDomains.includes('saas')) {
      models.push({
        name: 'dashboardState',
        fields: ['stats', 'activity', 'selectedPeriod'],
        description: 'Dashboard data state',
      });
    }

    return models;
  }

  private inferColorScheme(prompt: string, businessType: string): ColorScheme {
    const lower = prompt.toLowerCase();

    const moodMap: Record<string, ColorScheme> = {
      ecommerce: { primary: 'violet', secondary: 'fuchsia', accent: 'purple', gradient: 'from-violet-400 to-fuchsia-400', mood: 'premium' },
      saas: { primary: 'cyan', secondary: 'blue', accent: 'teal', gradient: 'from-cyan-400 to-blue-400', mood: 'tech' },
      restaurant: { primary: 'amber', secondary: 'orange', accent: 'yellow', gradient: 'from-amber-400 to-orange-400', mood: 'warm' },
      portfolio: { primary: 'emerald', secondary: 'cyan', accent: 'teal', gradient: 'from-emerald-400 to-cyan-400', mood: 'creative' },
      blog: { primary: 'rose', secondary: 'pink', accent: 'red', gradient: 'from-rose-400 to-pink-400', mood: 'editorial' },
      fitness: { primary: 'red', secondary: 'orange', accent: 'amber', gradient: 'from-red-400 to-orange-400', mood: 'energetic' },
      education: { primary: 'blue', secondary: 'indigo', accent: 'sky', gradient: 'from-blue-400 to-indigo-400', mood: 'trustworthy' },
      healthcare: { primary: 'emerald', secondary: 'teal', accent: 'green', gradient: 'from-emerald-400 to-teal-400', mood: 'calming' },
      marketplace: { primary: 'purple', secondary: 'pink', accent: 'fuchsia', gradient: 'from-purple-400 to-pink-400', mood: 'vibrant' },
      'local-business': { primary: 'sky', secondary: 'cyan', accent: 'blue', gradient: 'from-sky-400 to-cyan-400', mood: 'friendly' },
      agency: { primary: 'violet', secondary: 'purple', accent: 'indigo', gradient: 'from-violet-400 to-purple-400', mood: 'premium' },
    };

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

    return moodMap[businessType] || { primary: 'violet', secondary: 'purple', accent: 'indigo', gradient: 'from-violet-400 to-purple-400', mood: 'premium' };
  }

  private generateDescription(prompt: string, businessType: string, subDomains: string[]): string {
    const name = this.extractName(prompt);
    const uniqueDomains = subDomains.filter(d => d !== businessType);
    const domainStr = uniqueDomains.length > 0 ? ` with ${uniqueDomains.join(' and ')}` : '';
    return `A ${businessType}${domainStr} application for ${name}. Built with Next.js, TypeScript, and Tailwind CSS.`;
  }

  private extractName(prompt: string): string {
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
    return 'Your Brand';
  }

  buildArchitecturePrompt(decision: ArchitectDecision): string {
    const primitivesCatalog = buildPrimitivesCatalog(decision.businessType);

    return `
## Architecture Decision for ${decision.name}

**Business Type**: ${decision.businessType}
**Sub-domains**: ${decision.subDomains.join(', ')}
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
    if (lower.includes('gym') || lower.includes('fitness') || lower.includes('martial')) return 'rose';
    if (lower.includes('tea') || lower.includes('coffee') || lower.includes('roast')) return 'amber';
    if (lower.includes('luxury') || lower.includes('premium')) return 'violet';
    if (capabilities.includes('crm') || capabilities.includes('analytics')) return 'sky';
    if (capabilities.includes('commerce') || capabilities.includes('marketplace')) return 'indigo';
    return 'indigo';
  }
}
