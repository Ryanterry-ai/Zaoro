import crypto from 'node:crypto';
import type { Industry, ProjectReference } from '../types.js';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

const INDUSTRY_KEYWORDS: Record<string, Industry> = {
  shop: 'ecommerce', store: 'ecommerce', product: 'ecommerce', cart: 'ecommerce',
  checkout: 'ecommerce', buy: 'ecommerce', order: 'ecommerce',
  blog: 'media', news: 'media', article: 'media', magazine: 'media',
  restaurant: 'restaurant', menu: 'restaurant', food: 'restaurant', cafe: 'restaurant',
  hotel: 'real-estate', property: 'real-estate', rent: 'real-estate', listing: 'real-estate',
  doctor: 'healthcare', clinic: 'healthcare', hospital: 'healthcare', patient: 'healthcare',
  course: 'education', learn: 'education', class: 'education', tutorial: 'education',
  dashboard: 'saas', analytics: 'saas', login: 'saas', subscription: 'saas',
  portfolio: 'portfolio', resume: 'portfolio', 'case study': 'portfolio',
  donate: 'nonprofit', charity: 'nonprofit', volunteer: 'nonprofit',
  fitness: 'fitness', workout: 'fitness', gym: 'fitness', trainer: 'fitness',
  bank: 'fintech', invest: 'fintech', payment: 'fintech',
  marketplace: 'marketplace', seller: 'marketplace', vendor: 'marketplace',
};

export class WebsiteAdapter implements InputAdapter {
  readonly type = IntentType.Website;

  canHandle(input: string): boolean {
    const trimmed = input.trim();
    if (!URL_PATTERN.test(trimmed)) return false;
    // Figma URLs are handled by FigmaAdapter
    if (/figma\.com\/(file|design|proto)/i.test(trimmed)) return false;
    return true;
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const url = input.trim();
    const domain = new URL(url).hostname.replace('www.', '');
    const pathSegments = new URL(url).pathname.split('/').filter(Boolean);

    const lowerDomain = domain.toLowerCase();
    const lowerPath = pathSegments.join(' ').toLowerCase();
    const combined = `${lowerDomain} ${lowerPath}`;

    let detectedIndustry: Industry | undefined;
    for (const [keyword, industry] of Object.entries(INDUSTRY_KEYWORDS)) {
      if (combined.includes(keyword)) {
        detectedIndustry = industry;
        break;
      }
    }

    const nameParts = domain.replace(/\.(com|org|net|io|app|dev|co|in|uk|au|ca)$/i, '').split('.');
    const projectName = nameParts[0]
      ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)
      : 'Website Project';

    const techStack: string[] = [];
    if (pathSegments.some(p => ['api', 'graphql', 'rest'].includes(p))) {
      techStack.push('API-backed');
    }
    if (pathSegments.some(p => ['wp-content', 'wp-admin'].includes(p))) {
      techStack.push('WordPress');
    }

    const id = `web-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const ref: ProjectReference = { type: 'url' as const, url, description: domain };

    const manifest = {
      id,
      description: `Website project cloned from ${url}`,
      userInput: input,
      name: projectName,
      ...(detectedIndustry ? { domain: detectedIndustry } : {}),
      references: [ref],
      createdAt: new Date().toISOString(),
      version: 1,
    };

    const pages = this.inferPages(detectedIndustry);
    const entities = this.inferEntities(detectedIndustry);
    const integrations = this.inferIntegrations(detectedIndustry);

    return {
      manifest,
      adapterType: IntentType.Website,
      confidence: 0.85,
      detectedIndustry,
      detectedName: projectName,
      entities,
      pages,
      integrations,
      metadata: {
        url,
        domain,
        techStack,
        pathSegments,
        detectedIndustry,
      },
    };
  }

  private inferPages(industry?: Industry): string[] {
    const common = ['/', '/about', '/contact', '/privacy', '/terms'];
    const industryPages: Record<string, string[]> = {
      ecommerce: ['/shop', '/cart', '/checkout', '/product/:id', '/account', '/orders', '/wishlist'],
      restaurant: ['/menu', '/reservations', '/gallery', '/events'],
      saas: ['/features', '/pricing', '/dashboard', '/login', '/signup', '/docs'],
      healthcare: ['/services', '/doctors', '/appointments', '/patient-portal'],
      education: ['/courses', '/lessons', '/enroll', '/certificate'],
      fintech: ['/accounts', '/transfers', '/invest', '/statements'],
      'real-estate': ['/listings', '/property/:id', '/agents', '/mortgage-calculator'],
      media: ['/articles', '/category/:slug', '/article/:slug'],
      portfolio: ['/work', '/case-studies', '/services'],
      marketplace: ['/browse', '/sell', '/seller/:id', '/messages'],
      fitness: ['/workouts', '/trainers', '/plans', '/progress'],
      nonprofit: ['/donate', '/events', '/volunteer', '/impact'],
    };
    return [...new Set([...common, ...(industry ? industryPages[industry] ?? [] : [])])];
  }

  private inferEntities(industry?: Industry): string[] {
    const common = ['User'];
    const industryEntities: Record<string, string[]> = {
      ecommerce: ['Product', 'Category', 'Order', 'Cart', 'Review', 'Payment'],
      restaurant: ['MenuItem', 'Reservation', 'Table', 'Review'],
      saas: ['Account', 'Subscription', 'Plan', 'Team', 'Invoice'],
      healthcare: ['Doctor', 'Appointment', 'Patient', 'Prescription'],
      education: ['Course', 'Lesson', 'Enrollment', 'Certificate'],
      fintech: ['Account', 'Transaction', 'Investment', 'Statement'],
      'real-estate': ['Property', 'Listing', 'Agent', 'Tour'],
      media: ['Article', 'Author', 'Category', 'Comment'],
      portfolio: ['Project', 'Service', 'Testimonial'],
      marketplace: ['Product', 'Seller', 'Order', 'Review', 'Message'],
      fitness: ['Workout', 'Plan', 'Trainer', 'Progress'],
      nonprofit: ['Donation', 'Event', 'Volunteer', 'Impact'],
    };
    return [...new Set([...common, ...(industry ? industryEntities[industry] ?? [] : [])])];
  }

  private inferIntegrations(industry?: Industry): string[] {
    const common = ['analytics', 'email'];
    const industryIntegrations: Record<string, string[]> = {
      ecommerce: ['payment-gateway', 'shipping', 'inventory'],
      restaurant: ['reservation-system', 'payment-gateway'],
      saas: ['payment-gateway', 'oauth', 'webhooks'],
      healthcare: ['hipaa-compliance', 'payment-gateway'],
      education: ['payment-gateway', 'video-hosting'],
      fintech: ['payment-gateway', 'plaid', 'compliance'],
      'real-estate': ['maps', 'payment-gateway'],
      media: ['cdn', 'newsletter'],
      marketplace: ['payment-gateway', 'messaging', 'rating-system'],
      fitness: ['payment-gateway', 'video-hosting'],
      nonprofit: ['payment-gateway', 'crm'],
    };
    return [...new Set([...common, ...(industry ? industryIntegrations[industry] ?? [] : [])])];
  }
}
