/**
 * IntakeParser — converts free-text prompt → BREContext.
 *
 * Deterministic keyword matching. Zero LLM calls.
 * The structured intake form (Conversion 1) will bypass this entirely,
 * feeding form fields directly into BREContext. This parser exists for
 * backward compatibility with the free-text prompt path.
 */

import type { BREContext } from './reasoning/rules-engine.js';

interface IndustryMapping {
  industry: string;
  keywords: string[];
  businessModels: string[];
  capabilities: string[];
  entities: string[];
}

const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  {
    industry: 'restaurant',
    keywords: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'menu', 'kitchen', 'chef', 'bistro', 'bakery', 'bar', 'pub', 'eatery', 'catering', 'pizzeria', 'sushi', 'burger'],
    businessModels: ['direct-sales'],
    capabilities: ['booking', 'gallery', 'contact-form', 'map'],
    entities: ['MenuItem', 'Reservation', 'Order'],
  },
  {
    industry: 'healthcare',
    keywords: ['healthcare', 'medical', 'clinic', 'doctor', 'patient', 'dental', 'hospital', 'health', 'wellness', 'therapy', 'psychology', 'veterinary', 'pharmacy'],
    businessModels: ['service-booking'],
    capabilities: ['booking', 'crm', 'analytics', 'contact-form', 'scheduling'],
    entities: ['Patient', 'Appointment', 'MedicalRecord'],
  },
  {
    industry: 'saas',
    keywords: ['saas', 'software', 'platform', 'app', 'application', 'dashboard', 'admin', 'tool', 'api', 'integration', 'webapp', 'web app', 'subscription', 'monthly plan', 'annual plan', 'tier'],
    businessModels: ['subscription'],
    capabilities: ['analytics', 'crm', 'payments', 'subscriptions', 'inventory'],
    entities: ['User', 'Subscription', 'Feature'],
  },
  {
    industry: 'ecommerce',
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'sell', 'product', 'cart', 'buy', 'purchase', 'retail', 'catalog', 'checkout', 'shipping', 'inventory', 'marketplace', 'storefront'],
    businessModels: ['direct-sales', 'marketplace'],
    capabilities: ['commerce', 'payments', 'inventory', 'orders', 'analytics'],
    entities: ['Product', 'Order', 'Customer', 'Category'],
  },
  {
    industry: 'fitness',
    keywords: ['gym', 'fitness', 'workout', 'training', 'personal trainer', 'exercise', 'class', 'membership', 'wellness', 'yoga', 'pilates', 'crossfit', 'studio'],
    businessModels: ['membership', 'service-booking'],
    capabilities: ['booking', 'subscriptions', 'scheduling', 'crm'],
    entities: ['Member', 'Class', 'Trainer', 'Booking'],
  },
  {
    industry: 'education',
    keywords: ['school', 'education', 'course', 'learn', 'teaching', 'tutor', 'university', 'college', 'training', 'workshop', 'academy', 'elearning', 'e-learning', 'student', 'instructor'],
    businessModels: ['subscription', 'direct-sales'],
    capabilities: ['content', 'subscriptions', 'scheduling', 'analytics'],
    entities: ['Course', 'Student', 'Enrollment', 'Lesson'],
  },
  {
    industry: 'realestate',
    keywords: ['real estate', 'property', 'listing', 'agent', 'broker', 'home', 'house', 'apartment', 'rent', 'lease', 'mortgage', 'commercial property', 'residential'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['crm', 'contact-form', 'map', 'gallery', 'search'],
    entities: ['Property', 'Agent', 'Inquiry', 'Showing'],
  },
  {
    industry: 'legal',
    keywords: ['law', 'legal', 'attorney', 'lawyer', 'firm', 'litigation', 'consultation', 'case', 'court', 'compliance', 'contract', 'paralegal'],
    businessModels: ['service-booking'],
    capabilities: ['crm', 'booking', 'contact-form', 'scheduling'],
    entities: ['Client', 'Case', 'Consultation', 'Document'],
  },
  {
    industry: 'agency',
    keywords: ['agency', 'creative', 'design', 'marketing', 'branding', 'advertising', 'digital agency', 'web design', 'content marketing', 'seo agency', 'social media'],
    businessModels: ['service-booking', 'subscription'],
    capabilities: ['crm', 'portfolio', 'contact-form', 'analytics'],
    entities: ['Client', 'Project', 'Proposal', 'Invoice'],
  },
  {
    industry: 'nonprofit',
    keywords: ['nonprofit', 'non-profit', 'charity', 'donation', 'fundraise', 'volunteer', 'cause', 'community', 'impact', 'ngo', 'foundation'],
    businessModels: ['donation'],
    capabilities: ['contact-form', 'content', 'analytics'],
    entities: ['Donor', 'Campaign', 'Volunteer', 'Event'],
  },
  {
    industry: 'media',
    keywords: ['media', 'publishing', 'news', 'magazine', 'journal', 'blog', 'content', 'editorial', 'podcast', 'video', 'newsletter'],
    businessModels: ['subscription', 'advertising'],
    capabilities: ['content', 'subscriptions', 'analytics', 'gallery'],
    entities: ['Article', 'Author', 'Category', 'Subscriber'],
  },
  {
    industry: 'travel',
    keywords: ['travel', 'tour', 'hotel', 'vacation', 'booking', 'trip', 'flight', 'resort', 'airbnb', 'hostel', 'adventure', 'destination'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['booking', 'gallery', 'contact-form', 'map', 'payments'],
    entities: ['Booking', 'Destination', 'Itinerary', 'Guest'],
  },
];

const BUSINESS_MODEL_KEYWORDS: Record<string, string[]> = {
  subscription: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'membership'],
  'direct-sales': ['sell', 'shop', 'store', 'buy', 'purchase', 'product', 'cart', 'checkout', 'ecommerce'],
  marketplace: ['marketplace', 'vendor', 'multi-seller', 'platform', 'connect'],
  'service-booking': ['book', 'appointment', 'schedule', 'consultation', 'session', 'reserve'],
  membership: ['membership', 'member', 'join', 'club', 'access', 'exclusive'],
  donation: ['donate', 'donation', 'fundraise', 'campaign', 'support'],
  advertising: ['advertising', 'ads', 'sponsor', 'promote', 'banner'],
};

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  commerce: ['shop', 'store', 'sell', 'product', 'cart', 'buy', 'purchase', 'catalog', 'checkout', 'inventory'],
  booking: ['book', 'appointment', 'schedule', 'reserve', 'calendar', 'availability', 'slot'],
  analytics: ['analytics', 'dashboard', 'metrics', 'report', 'chart', 'kpi', 'performance'],
  crm: ['crm', 'contact', 'lead', 'pipeline', 'customer', 'client', 'relationship'],
  payments: ['payment', 'stripe', 'checkout', 'invoice', 'billing', 'charge', 'transaction'],
  subscriptions: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'membership'],
  inventory: ['inventory', 'stock', 'warehouse', 'sku', 'quantity', 'supply'],
  content: ['blog', 'article', 'post', 'content', 'publish', 'editor', 'cms'],
  gallery: ['gallery', 'photo', 'image', 'portfolio', 'showcase', 'visual'],
  'contact-form': ['contact', 'inquiry', 'form', 'reach', 'get in touch'],
  map: ['map', 'location', 'direction', 'address', 'near me'],
  scheduling: ['schedule', 'calendar', 'event', 'timeline', 'availability'],
  search: ['search', 'filter', 'find', 'browse', 'discover'],
};

function detectIndustry(prompt: string): IndustryMapping | undefined {
  const lower = prompt.toLowerCase();
  let bestMatch: IndustryMapping | undefined;
  let bestScore = 0;

  for (const mapping of INDUSTRY_MAPPINGS) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
    }
  }

  return bestScore >= 3 ? bestMatch : undefined;
}

function detectBusinessModels(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const models: string[] = [];

  for (const [model, keywords] of Object.entries(BUSINESS_MODEL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        models.push(model);
        break;
      }
    }
  }

  return models.length > 0 ? models : ['direct-sales'];
}

function detectCapabilities(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const capabilities: string[] = [];

  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        capabilities.push(capability);
        break;
      }
    }
  }

  return capabilities;
}

function extractAppName(prompt: string): string | undefined {
  const patterns = [
    /(?:called|named)\s+([A-Z][A-Za-z0-9\s&'.-]+?)(?:\s+(?:with|for|that|and|the)|\s*[,.]|\s*$)/,
    /(?:build|create|make)\s+(?:a\s+)?(?:\w+\s+){0,3}([A-Z][A-Za-z0-9\s&'.-]+?)(?:\s+(?:with|for|that|called|named|website|app|platform|and|the)|\s*[,.]|\s*$)/i,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1]) return m[1].trim().slice(0, 60);
  }
  return undefined;
}

function detectJourneys(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const journeys: string[] = ['visitor'];

  if (lower.includes('customer') || lower.includes('user') || lower.includes('client') || lower.includes('member') || lower.includes('login') || lower.includes('account')) {
    journeys.push('customer');
  }
  if (lower.includes('admin') || lower.includes('management') || lower.includes('backoffice') || lower.includes('dashboard')) {
    journeys.push('admin');
  }

  return journeys;
}

function detectCountry(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  const countryPatterns: [RegExp, string][] = [
    [/\b(usa|united states|us)\b/, 'US'],
    [/\b(uk|united kingdom|britain|england)\b/, 'GB'],
    [/\b(germany|deutschland|de)\b/, 'DE'],
    [/\b(france|fr)\b/, 'FR'],
    [/\b(india|in)\b/, 'IN'],
    [/\b(canada|ca)\b/, 'CA'],
    [/\b(australia|au)\b/, 'AU'],
    [/\b(eu|europe|european)\b/, 'EU'],
  ];

  for (const [pattern, country] of countryPatterns) {
    if (pattern.test(lower)) return country;
  }
  return undefined;
}

/**
 * Convert a free-text prompt into a BREContext using deterministic keyword matching.
 * Zero LLM calls.
 */
export function buildBREContext(prompt: string): BREContext {
  const industryMapping = detectIndustry(prompt);
  const industry = industryMapping?.industry ?? 'general';
  const businessModels = detectBusinessModels(prompt);
  const capabilities = detectCapabilities(prompt);
  const journeys = detectJourneys(prompt);
  const country = detectCountry(prompt);
  const appName = extractAppName(prompt);
  const entities = industryMapping?.entities ?? ['User'];

  const compliancePacks: string[] = [];
  if (country === 'EU' || country === 'DE' || country === 'FR' || country === 'GB') {
    compliancePacks.push('compliance.gdpr');
  }
  if (industry === 'healthcare') {
    compliancePacks.push('compliance.hipaa');
  }

  const result: BREContext = {
    industry,
    businessModels,
    capabilities,
    journeys,
    entities,
    compliancePacks,
  };

  if (country) result.country = country;
  if (appName) result.appName = appName;
  if (prompt) result.description = prompt.slice(0, 200);

  return result;
}
