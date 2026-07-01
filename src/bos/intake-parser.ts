/**
 * IntakeParser — converts free-text prompt → BREContext.
 *
 * Deterministic keyword matching. Zero LLM calls.
 * The structured intake form (Conversion 1) will bypass this entirely,
 * feeding form fields directly into BREContext. This parser exists for
 * backward compatibility with the free-text prompt path.
 *
 * EXPANSION (Phase 4/5 gap-fill):
 * - Unified with domain-detector.ts industry list (was 12, now 22 industries)
 * - Added enterprise/B2B software category (ERP, CRM, HRM, logistics, etc.)
 * - Improved journey detection (operational/staff signals, B2B internal tools)
 * - Industry score is now exported so confidence-gate can use it directly
 * - detectIndustry now returns score alongside mapping for confidence calibration
 * - subIndustry is now populated (was always undefined)
 * - audience is now populated (B2C vs B2B vs internal)
 */

import type { BREContext } from './reasoning/rules-engine.js';

interface IndustryMapping {
  industry: string;
  subIndustries: Record<string, string[]>;
  keywords: string[];
  businessModels: string[];
  capabilities: string[];
  entities: string[];
  audience: 'b2c' | 'b2b' | 'internal' | 'mixed';
}

const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  // ─── Consumer / SMB ─────────────────────────────────────────────────────

  {
    industry: 'restaurant',
    subIndustries: {
      fine_dining: ['fine dining', 'gourmet', 'michelin', 'upscale', 'elegant'],
      cafe: ['cafe', 'coffee shop', 'espresso', 'latte', 'pastry', 'bakery'],
      fast_casual: ['fast', 'quick service', 'takeout', 'delivery', 'drive-through'],
    },
    keywords: ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'menu', 'kitchen', 'chef',
      'bistro', 'bakery', 'bar', 'pub', 'eatery', 'catering', 'pizzeria', 'sushi', 'burger',
      'pizza', 'takeout', 'delivery', 'reservation', 'diner', 'brasserie', 'cantina'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['booking', 'gallery', 'contact-form', 'map'],
    entities: ['MenuItem', 'Reservation', 'Order'],
    audience: 'b2c',
  },
  {
    industry: 'healthcare',
    subIndustries: {
      dental: ['dental', 'dentist', 'teeth', 'smile', 'implant', 'orthodont', 'braces'],
      therapy: ['therapy', 'counseling', 'psychology', 'mental health', 'psychiatry'],
      clinic: ['clinic', 'primary care', 'family practice', 'urgent care'],
      hospital: ['hospital', 'er', 'emergency', 'icu', 'surgical', 'inpatient'],
      pharmacy: ['pharmacy', 'pharmacist', 'prescription', 'drug', 'medication'],
      veterinary: ['vet', 'veterinary', 'animal', 'pet care', 'pet hospital'],
    },
    keywords: ['healthcare', 'medical', 'clinic', 'doctor', 'patient', 'dental', 'hospital',
      'health', 'wellness', 'therapy', 'psychology', 'veterinary', 'pharmacy', 'nurse',
      'physician', 'surgeon', 'specialist', 'diagnosis', 'treatment', 'appointment'],
    businessModels: ['service-booking'],
    capabilities: ['booking', 'crm', 'analytics', 'contact-form', 'scheduling'],
    entities: ['Patient', 'Appointment', 'MedicalRecord'],
    audience: 'b2c',
  },
  {
    industry: 'saas',
    subIndustries: {
      crm: ['crm', 'customer relationship', 'lead', 'pipeline', 'sales'],
      analytics: ['analytics', 'data', 'insights', 'reporting', 'metrics', 'bi'],
      project_management: ['project management', 'task', 'kanban', 'sprint', 'agile'],
      marketing: ['marketing', 'email', 'campaign', 'seo', 'social media', 'automation'],
      hr: ['hr', 'human resource', 'employee', 'payroll', 'recruitment', 'onboarding'],
    },
    keywords: ['saas', 'software', 'platform', 'app', 'application', 'dashboard', 'admin',
      'tool', 'api', 'integration', 'webapp', 'web app', 'subscription', 'monthly plan',
      'annual plan', 'tier', 'cloud', 'automation', 'workflow', 'productivity'],
    businessModels: ['subscription'],
    capabilities: ['analytics', 'crm', 'payments', 'subscriptions', 'inventory'],
    entities: ['User', 'Subscription', 'Feature'],
    audience: 'b2b',
  },
  {
    industry: 'ecommerce',
    subIndustries: {
      fashion: ['fashion', 'clothing', 'apparel', 'wear', 'style', 'outfit'],
      electronics: ['electronics', 'gadget', 'tech', 'device', 'computer', 'phone'],
      beauty: ['beauty', 'cosmetics', 'skincare', 'makeup', 'fragrance'],
      food_beverage: ['food', 'grocery', 'organic', 'snack', 'beverage', 'wine'],
      marketplace: ['marketplace', 'multi-seller', 'vendor', 'platform'],
    },
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'sell', 'product', 'cart',
      'buy', 'purchase', 'retail', 'catalog', 'checkout', 'shipping', 'inventory',
      'marketplace', 'storefront', 'online store', 'dropship', 'fulfillment'],
    businessModels: ['direct-sales', 'marketplace'],
    capabilities: ['commerce', 'payments', 'inventory', 'orders', 'analytics'],
    entities: ['Product', 'Order', 'Customer', 'Category'],
    audience: 'b2c',
  },
  {
    industry: 'fitness',
    subIndustries: {
      gym: ['gym', 'weight', 'strength', 'bodybuilding', 'crossfit', 'weightlifting'],
      yoga: ['yoga', 'pilates', 'meditation', 'mindfulness', 'wellness', 'spiritual'],
      studio: ['studio', 'spin', 'cycling', 'barre', 'dance', 'zumba'],
      personal_training: ['personal trainer', 'one on one', 'coaching', 'athletic'],
    },
    keywords: ['gym', 'fitness', 'workout', 'training', 'personal trainer', 'exercise',
      'class', 'membership', 'wellness', 'yoga', 'pilates', 'crossfit', 'studio',
      'athletic', 'strength', 'cardio', 'nutrition', 'weight loss'],
    businessModels: ['membership', 'service-booking'],
    capabilities: ['booking', 'subscriptions', 'scheduling', 'crm'],
    entities: ['Member', 'Class', 'Trainer', 'Booking'],
    audience: 'b2c',
  },
  {
    industry: 'education',
    subIndustries: {
      online: ['online', 'e-learning', 'digital', 'virtual', 'remote', 'mooc'],
      k12: ['k-12', 'high school', 'elementary', 'middle school', 'children'],
      higher_ed: ['university', 'college', 'degree', 'graduate', 'campus'],
      corporate: ['corporate training', 'employee training', 'upskilling', 'certification'],
    },
    keywords: ['school', 'education', 'course', 'learn', 'teaching', 'tutor', 'university',
      'college', 'training', 'workshop', 'academy', 'elearning', 'e-learning', 'student',
      'instructor', 'curriculum', 'lesson', 'lecture', 'degree', 'certificate'],
    businessModels: ['subscription', 'direct-sales'],
    capabilities: ['content', 'subscriptions', 'scheduling', 'analytics'],
    entities: ['Course', 'Student', 'Enrollment', 'Lesson'],
    audience: 'mixed',
  },
  {
    industry: 'realestate',
    subIndustries: {
      luxury: ['luxury', 'premium', 'high-end', 'exclusive', 'estate', 'villa', 'penthouse'],
      commercial: ['commercial', 'office', 'retail', 'warehouse', 'industrial'],
      residential: ['residential', 'family', 'suburban', 'neighborhood', 'single family'],
      rental: ['rental', 'property management', 'tenant', 'landlord', 'lease'],
    },
    keywords: ['real estate', 'property', 'listing', 'agent', 'broker', 'home', 'house',
      'apartment', 'rent', 'lease', 'mortgage', 'commercial property', 'residential',
      'realtor', 'condo', 'townhouse', 'land', 'foreclosure', 'mls'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['crm', 'contact-form', 'map', 'gallery', 'search'],
    entities: ['Property', 'Agent', 'Inquiry', 'Showing'],
    audience: 'b2c',
  },
  {
    industry: 'legal',
    subIndustries: {
      corporate: ['corporate', 'business', 'mergers', 'acquisitions', 'compliance', 'ip'],
      family: ['family law', 'divorce', 'custody', 'marriage', 'adoption'],
      injury: ['personal injury', 'accident', 'malpractice', 'workers comp'],
      criminal: ['criminal', 'defense', 'dui', 'felony', 'misdemeanor'],
    },
    keywords: ['law', 'legal', 'attorney', 'lawyer', 'firm', 'litigation', 'consultation',
      'case', 'court', 'compliance', 'contract', 'paralegal', 'counsel', 'advocate',
      'practice area', 'legal services', 'law firm', 'justice'],
    businessModels: ['service-booking'],
    capabilities: ['crm', 'booking', 'contact-form', 'scheduling'],
    entities: ['Client', 'Case', 'Consultation', 'Document'],
    audience: 'b2c',
  },
  {
    industry: 'agency',
    subIndustries: {
      marketing: ['marketing', 'advertising', 'social media', 'seo', 'ppc', 'content'],
      creative: ['creative', 'design', 'branding', 'identity', 'visual'],
      technology: ['technology', 'digital', 'transformation', 'innovation', 'it'],
      pr: ['pr', 'public relations', 'communications', 'media'],
    },
    keywords: ['agency', 'creative', 'design', 'marketing', 'branding', 'advertising',
      'digital agency', 'web design', 'content marketing', 'seo agency', 'social media',
      'studio', 'consulting', 'firm', 'services'],
    businessModels: ['service-booking', 'subscription'],
    capabilities: ['crm', 'portfolio', 'contact-form', 'analytics'],
    entities: ['Client', 'Project', 'Proposal', 'Invoice'],
    audience: 'b2b',
  },
  {
    industry: 'nonprofit',
    subIndustries: {
      charity: ['charity', 'fundraise', 'donation', 'give', 'cause'],
      community: ['community', 'volunteer', 'outreach', 'local'],
      advocacy: ['advocacy', 'campaign', 'movement', 'rights', 'policy'],
    },
    keywords: ['nonprofit', 'non-profit', 'charity', 'donation', 'fundraise', 'volunteer',
      'cause', 'community', 'impact', 'ngo', 'foundation', 'mission', 'give', 'helping'],
    businessModels: ['donation'],
    capabilities: ['contact-form', 'content', 'analytics'],
    entities: ['Donor', 'Campaign', 'Volunteer', 'Event'],
    audience: 'b2c',
  },
  {
    industry: 'media',
    subIndustries: {
      news: ['news', 'journalism', 'editorial', 'breaking'],
      podcast: ['podcast', 'audio', 'episode', 'show'],
      magazine: ['magazine', 'journal', 'issue', 'editorial'],
    },
    keywords: ['media', 'publishing', 'news', 'magazine', 'journal', 'blog', 'content',
      'editorial', 'podcast', 'video', 'newsletter', 'publication', 'article', 'post'],
    businessModels: ['subscription', 'advertising'],
    capabilities: ['content', 'subscriptions', 'analytics', 'gallery'],
    entities: ['Article', 'Author', 'Category', 'Subscriber'],
    audience: 'b2c',
  },
  {
    industry: 'travel',
    subIndustries: {
      hotel: ['hotel', 'resort', 'hostel', 'accommodation', 'lodge', 'airbnb'],
      tours: ['tour', 'guide', 'excursion', 'adventure', 'trek', 'safari'],
      airline: ['airline', 'flight', 'aviation', 'airport'],
    },
    keywords: ['travel', 'tour', 'hotel', 'vacation', 'booking', 'trip', 'flight', 'resort',
      'airbnb', 'hostel', 'adventure', 'destination', 'tourism', 'holiday', 'cruise'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['booking', 'gallery', 'contact-form', 'map', 'payments'],
    entities: ['Booking', 'Destination', 'Itinerary', 'Guest'],
    audience: 'b2c',
  },
  {
    industry: 'luxury',
    subIndustries: {
      watches: ['watch', 'timepiece', 'chronograph', 'horology', 'swiss', 'automatic'],
      jewelry: ['jewelry', 'jewellery', 'diamond', 'gold', 'silver', 'necklace', 'ring'],
      fashion: ['fashion', 'couture', 'designer', 'runway', 'collection', 'boutique'],
      automotive: ['automobile', 'supercar', 'exotic', 'classic car'],
    },
    keywords: ['luxury', 'premium', 'high-end', 'exclusive', 'elegant', 'sophisticated',
      'artisan', 'bespoke', 'timepiece', 'watch brand', 'jewelry', 'fine watch',
      'chronograph', 'horology', 'swiss', 'curated', 'maison', 'atelier'],
    businessModels: ['direct-sales'],
    capabilities: ['gallery', 'contact-form'],
    entities: ['Product', 'Collection', 'Customer'],
    audience: 'b2c',
  },
  {
    industry: 'beauty',
    subIndustries: {
      salon: ['hair salon', 'beauty salon', 'nail salon', 'blowout', 'balayage'],
      spa: ['spa', 'massage', 'facial', 'body treatment', 'relaxation'],
      cosmetics: ['cosmetics', 'makeup', 'skincare', 'beauty brand', 'serum'],
    },
    keywords: ['beauty', 'salon', 'spa', 'hair', 'nails', 'manicure', 'pedicure', 'facial',
      'skincare', 'cosmetics', 'makeup', 'grooming', 'waxing', 'lash', 'brow'],
    businessModels: ['service-booking'],
    capabilities: ['booking', 'gallery', 'scheduling'],
    entities: ['Client', 'Appointment', 'Service', 'Staff'],
    audience: 'b2c',
  },
  {
    industry: 'event',
    subIndustries: {
      wedding: ['wedding', 'bride', 'groom', 'ceremony', 'reception', 'bridal'],
      corporate: ['conference', 'summit', 'corporate event', 'seminar', 'expo'],
      music: ['concert', 'festival', 'music', 'live show', 'gig'],
    },
    keywords: ['event', 'conference', 'wedding', 'party', 'festival', 'concert', 'workshop',
      'seminar', 'gala', 'ceremony', 'venue', 'tickets', 'rsvp', 'speakers'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['booking', 'gallery', 'contact-form'],
    entities: ['Event', 'Ticket', 'Attendee', 'Venue'],
    audience: 'b2c',
  },
  {
    industry: 'portfolio',
    subIndustries: {
      design: ['designer', 'graphic', 'ui', 'ux', 'visual'],
      development: ['developer', 'engineer', 'full-stack', 'frontend', 'backend'],
      photography: ['photographer', 'photo', 'camera', 'shot', 'cinematography'],
    },
    keywords: ['portfolio', 'personal', 'freelance', 'resume', 'cv', 'showcase', 'creative',
      'designer', 'developer portfolio', 'projects', 'work samples', 'hire me'],
    businessModels: ['service-booking'],
    capabilities: ['gallery', 'contact-form'],
    entities: ['Project', 'Skill', 'Client'],
    audience: 'b2b',
  },
  {
    industry: 'automotive',
    subIndustries: {
      dealership: ['dealership', 'car dealer', 'showroom', 'inventory', 'financing'],
      repair: ['repair', 'mechanic', 'service center', 'oil change', 'tune up'],
    },
    keywords: ['auto', 'automotive', 'car', 'vehicle', 'dealership', 'mechanic', 'repair',
      'garage', 'service center', 'oil change', 'tire', 'detailing', 'used car', 'new car'],
    businessModels: ['direct-sales', 'service-booking'],
    capabilities: ['inventory', 'booking', 'crm'],
    entities: ['Vehicle', 'Customer', 'ServiceOrder'],
    audience: 'b2c',
  },

  // ─── Enterprise / B2B / Internal Tools ────────────────────────────────

  {
    industry: 'enterprise-software',
    subIndustries: {
      erp: ['erp', 'enterprise resource planning', 'resource planning', 'operations management'],
      crm_enterprise: ['crm', 'customer relationship management', 'sales platform', 'account management'],
      hrm: ['hrm', 'hris', 'human resource management', 'people management', 'talent'],
      finance: ['accounting', 'finance system', 'financial management', 'invoicing', 'accounts payable', 'accounts receivable', 'ledger', 'bookkeeping'],
      project: ['project management', 'portfolio management', 'resource management', 'ppm'],
      supply_chain: ['supply chain', 'procurement', 'vendor management', 'purchase order', 'sourcing'],
    },
    keywords: ['erp', 'enterprise resource planning', 'hrm', 'hris', 'accounting software',
      'finance system', 'procurement', 'supply chain', 'inventory management', 'operations',
      'enterprise', 'internal tool', 'back office', 'admin panel', 'management system',
      'business management', 'operations management', 'workflow management',
      'resource planning', 'asset management', 'compliance management'],
    businessModels: ['subscription', 'wholesale'],
    capabilities: ['analytics', 'crm', 'inventory', 'scheduling', 'analytics'],
    entities: ['Employee', 'Department', 'Record', 'Report'],
    audience: 'internal',
  },
  {
    industry: 'logistics',
    subIndustries: {
      shipping: ['shipping', 'carrier', 'freight', 'courier', 'last mile'],
      warehouse: ['warehouse', 'fulfillment', 'storage', '3pl', 'wms'],
      fleet: ['fleet', 'trucking', 'dispatch', 'routing', 'driver management'],
    },
    keywords: ['logistics', 'shipping', 'freight', 'courier', 'dispatch', 'fleet', 'trucking',
      'warehouse', 'fulfillment', '3pl', 'last mile', 'tracking', 'delivery management',
      'route optimization', 'supply chain', 'carrier', 'transport'],
    businessModels: ['subscription', 'wholesale'],
    capabilities: ['analytics', 'scheduling', 'crm', 'inventory'],
    entities: ['Shipment', 'Driver', 'Route', 'Package'],
    audience: 'b2b',
  },
  {
    industry: 'manufacturing',
    subIndustries: {
      production: ['production', 'manufacturing line', 'assembly', 'fabrication'],
      quality: ['quality control', 'qc', 'inspection', 'iso', 'compliance'],
    },
    keywords: ['manufacturing', 'production', 'factory', 'assembly', 'fabrication',
      'quality control', 'plant', 'machinery', 'industrial', 'bom', 'bill of materials',
      'work order', 'production schedule', 'lean', 'six sigma'],
    businessModels: ['wholesale', 'subscription'],
    capabilities: ['analytics', 'inventory', 'scheduling'],
    entities: ['Product', 'WorkOrder', 'Machine', 'QualityCheck'],
    audience: 'internal',
  },
  {
    industry: 'fintech',
    subIndustries: {
      payments: ['payment gateway', 'payment processing', 'pos', 'point of sale'],
      lending: ['lending', 'loan', 'credit', 'underwriting', 'origination'],
      insurance: ['insurance', 'insurer', 'policy', 'claim', 'underwrite'],
      investment: ['investment', 'trading', 'portfolio', 'wealth management', 'robo-advisor'],
    },
    keywords: ['fintech', 'banking', 'payments', 'lending', 'insurance', 'investment',
      'trading', 'wallet', 'remittance', 'microfinance', 'neobank', 'crypto',
      'financial services', 'wealth management', 'compliance', 'kyc', 'aml'],
    businessModels: ['subscription', 'marketplace'],
    capabilities: ['analytics', 'crm', 'payments'],
    entities: ['Transaction', 'Account', 'Customer', 'Policy'],
    audience: 'mixed',
  },
  {
    industry: 'proptech',
    subIndustries: {
      property_management: ['property management', 'tenant', 'landlord', 'lease', 'maintenance'],
      coworking: ['coworking', 'cowork', 'flexible workspace', 'hot desk', 'office booking'],
    },
    keywords: ['proptech', 'property management', 'tenant', 'landlord', 'lease management',
      'maintenance requests', 'rent collection', 'coworking', 'smart building', 'facilities'],
    businessModels: ['subscription', 'service-booking'],
    capabilities: ['booking', 'analytics', 'crm', 'payments'],
    entities: ['Property', 'Tenant', 'MaintenanceRequest', 'Lease'],
    audience: 'b2b',
  },
];

// ─── Business Model Keywords ─────────────────────────────────────────────────

const BUSINESS_MODEL_KEYWORDS: Record<string, string[]> = {
  subscription: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'membership', 'saas', 'software as a service'],
  'direct-sales': ['sell', 'shop', 'store', 'buy', 'purchase', 'product', 'cart', 'checkout', 'ecommerce', 'order online'],
  marketplace: ['marketplace', 'vendor', 'multi-seller', 'platform', 'connect buyers', 'connect sellers'],
  'service-booking': ['book', 'appointment', 'schedule', 'consultation', 'session', 'reserve', 'slot'],
  membership: ['membership', 'member', 'join', 'club', 'access', 'exclusive', 'vip'],
  donation: ['donate', 'donation', 'fundraise', 'campaign', 'support', 'crowdfund'],
  advertising: ['advertising', 'ads', 'sponsor', 'promote', 'banner', 'monetize'],
  wholesale: ['wholesale', 'b2b', 'bulk', 'distributor', 'reseller', 'supply chain', 'supplier',
    'purchase order', 'volume pricing', 'dealer', 'dealer network', 'procurement',
    'enterprise contract', 'license', 'site license'],
};

// ─── Capability Keywords ─────────────────────────────────────────────────────

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  commerce: ['shop', 'store', 'sell', 'product', 'cart', 'buy', 'purchase', 'catalog', 'checkout', 'inventory'],
  booking: ['book', 'appointment', 'schedule', 'reserve', 'calendar', 'availability', 'slot'],
  analytics: ['analytics', 'dashboard', 'metrics', 'report', 'chart', 'kpi', 'performance', 'insights', 'bi'],
  crm: ['crm', 'contact', 'lead', 'pipeline', 'customer', 'client', 'relationship', 'account management'],
  payments: ['payment', 'stripe', 'checkout', 'invoice', 'billing', 'charge', 'transaction', 'razorpay'],
  subscriptions: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'membership'],
  inventory: ['inventory', 'stock', 'warehouse', 'sku', 'quantity', 'supply', 'bom', 'parts'],
  content: ['blog', 'article', 'post', 'content', 'publish', 'editor', 'cms', 'newsletter'],
  gallery: ['gallery', 'photo', 'image', 'portfolio', 'showcase', 'visual', 'media'],
  'contact-form': ['contact', 'inquiry', 'form', 'reach', 'get in touch', 'feedback'],
  map: ['map', 'location', 'direction', 'address', 'near me', 'find us'],
  scheduling: ['schedule', 'calendar', 'event', 'timeline', 'availability', 'rota', 'shift'],
  search: ['search', 'filter', 'find', 'browse', 'discover', 'explore'],
  hr: ['employee', 'staff', 'payroll', 'leave', 'attendance', 'recruitment', 'onboarding', 'performance review'],
  reporting: ['report', 'export', 'audit', 'compliance', 'regulatory', 'financial report', 'dashboard'],
  workflow: ['workflow', 'approval', 'process', 'automation', 'pipeline', 'task management'],
};

// ─── B2B signal detection ────────────────────────────────────────────────────

function detectB2BSignal(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const b2bKeywords = [
    'wholesale', 'wholesaler', 'b2b', 'bulk', 'distributor', 'distribution',
    'reseller', 'supply chain', 'supplier', 'procurement', 'purchase order',
    'volume pricing', 'tiered pricing', 'dealer', 'dealer network',
    'sell to', 'selling to', 'supplies to', 'supplied to',
    'businesses', 'other businesses', 'retailers', 'stores',
    'inventory management', 'warehouse', 'warehousing', 'erp', 'hris', 'hrm',
    'enterprise', 'internal tool', 'back office', 'operations management',
    'manufacturing', 'logistics', 'fleet management', 'dispatch',
  ];
  return b2bKeywords.some(kw => lower.includes(kw));
}

// ─── Industry detection with score export ───────────────────────────────────

export interface IndustryDetectionResult {
  mapping: IndustryMapping | undefined;
  score: number;
  subIndustry: string | undefined;
}

export function detectIndustryWithScore(prompt: string): IndustryDetectionResult {
  const lower = prompt.toLowerCase();
  const isB2B = detectB2BSignal(lower);
  let bestMatch: IndustryMapping | undefined;
  let bestScore = 0;

  for (const mapping of INDUSTRY_MAPPINGS) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (lower.includes(keyword)) {
        score += keyword.split(' ').length * 2; // multi-word keywords score higher
      }
    }
    // B2B guard: halve scores for B2C industries when B2B signals present,
    // so enterprise keywords don't get drowned out by incidental B2C matches.
    if (isB2B && score > 0 && mapping.audience === 'b2c') {
      score = Math.floor(score / 2);
    }
    // Boost enterprise-software industry when B2B signals are present
    if (isB2B && mapping.industry === 'enterprise-software') {
      score = Math.ceil(score * 1.5);
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = mapping;
    }
  }

  if (bestScore < 3) {
    return { mapping: undefined, score: 0, subIndustry: undefined };
  }

  // Detect sub-industry
  let subIndustry: string | undefined;
  if (bestMatch) {
    let maxSubScore = 0;
    for (const [sub, subKws] of Object.entries(bestMatch.subIndustries)) {
      let subScore = 0;
      for (const kw of subKws) {
        if (lower.includes(kw)) subScore += kw.split(' ').length;
      }
      if (subScore > maxSubScore) {
        maxSubScore = subScore;
        subIndustry = sub;
      }
    }
  }

  return { mapping: bestMatch, score: bestScore, subIndustry };
}

// ─── Business model detection ────────────────────────────────────────────────

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

  // Empty array correctly represents "no business model detected"
  // — removing the old 'direct-sales' default that was causing /shop and /cart
  //   to be added to every unmatched build (including ERP systems).
  return models;
}

// ─── Capability detection ────────────────────────────────────────────────────

function detectCapabilities(prompt: string, industry?: IndustryMapping): string[] {
  const lower = prompt.toLowerCase();
  const capabilities = new Set<string>();

  // Prompt-derived capabilities
  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        capabilities.add(capability);
        break;
      }
    }
  }

  // Industry-default capabilities (so a healthcare build always gets booking
  // even if the word "booking" never appears in the prompt)
  if (industry) {
    for (const cap of industry.capabilities) {
      capabilities.add(cap);
    }
  }

  return [...capabilities];
}

// ─── Journey detection (expanded) ───────────────────────────────────────────

function detectJourneys(prompt: string, industry?: IndustryMapping): string[] {
  const lower = prompt.toLowerCase();
  const journeys = new Set<string>(['visitor']);

  // Customer-facing signals
  if (lower.includes('customer') || lower.includes('user') || lower.includes('client') ||
    lower.includes('member') || lower.includes('login') || lower.includes('account') ||
    lower.includes('sign up') || lower.includes('register') || lower.includes('buyer') ||
    lower.includes('patient') || lower.includes('guest') || lower.includes('subscriber')) {
    journeys.add('customer');
  }

  // Admin / operational signals — EXPANDED to catch ERP/enterprise intent
  if (lower.includes('admin') || lower.includes('management') || lower.includes('backoffice') ||
    lower.includes('back office') || lower.includes('dashboard') || lower.includes('panel') ||
    lower.includes('staff') || lower.includes('employee') || lower.includes('operator') ||
    lower.includes('manager') || lower.includes('supervisor') || lower.includes('erp') ||
    lower.includes('internal') || lower.includes('operations') || lower.includes('workflow') ||
    lower.includes('dispatch') || lower.includes('control') || lower.includes('monitor') ||
    lower.includes('manage') || lower.includes('track') || lower.includes('report')) {
    journeys.add('admin');
  }

  // B2B internal tools always get admin journey — if no explicit signal, infer from audience
  if (industry?.audience === 'internal') {
    journeys.add('admin');
  }

  return [...journeys];
}

// ─── Country detection ───────────────────────────────────────────────────────

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
    [/\b(uae|dubai|emirates)\b/, 'AE'],
    [/\b(singapore|sg)\b/, 'SG'],
    [/\b(brazil|brasil|br)\b/, 'BR'],
    [/\b(japan|jp)\b/, 'JP'],
  ];

  for (const [pattern, country] of countryPatterns) {
    if (pattern.test(lower)) return country;
  }
  return undefined;
}

// ─── App name extraction ─────────────────────────────────────────────────────

function extractAppName(prompt: string): string | undefined {
  const patterns = [
    // "called X" / "named X"
    /(?:called|named)\s+["']?([A-Z][A-Za-z0-9\s&'.-]{1,40})["']?(?:\s+(?:with|for|that|and|the)|\s*[,.]|\s*$)/,
    // Quoted names: "Build 'MediTrack'"
    /["']([A-Z][A-Za-z0-9\s&'.-]{1,40})["']/,
    // Capital-letter multi-word after "for": "ERP for HospitalOS"
    /(?:for|called|named)\s+([A-Z][A-Za-z0-9]{1,20}(?:\s+[A-Z][A-Za-z0-9]{1,20}){0,2})/,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1] && m[1].length > 1) return m[1].trim().slice(0, 60);
  }
  return undefined;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Convert a free-text prompt into a BREContext using deterministic keyword matching.
 * Zero LLM calls.
 *
 * Returns both the BREContext and the raw industry score so the confidence gate
 * can evaluate match quality without re-running detection.
 */
export function buildBREContext(prompt: string): BREContext {
  const { mapping: industryMapping, score: industryScore, subIndustry } = detectIndustryWithScore(prompt);

  const industry = industryMapping?.industry ?? 'general';
  const businessModels = detectBusinessModels(prompt);
  const capabilities = detectCapabilities(prompt, industryMapping);
  const journeys = detectJourneys(prompt, industryMapping);
  const country = detectCountry(prompt);
  const appName = extractAppName(prompt);
  const entities = industryMapping?.entities ?? ['User'];
  const audience = industryMapping?.audience ?? 'mixed';

  const compliancePacks: string[] = [];
  if (country === 'EU' || country === 'DE' || country === 'FR' || country === 'GB') {
    compliancePacks.push('compliance.gdpr');
  }
  if (industry === 'healthcare') compliancePacks.push('compliance.hipaa');
  if (industry === 'fintech') compliancePacks.push('compliance.pci-dss');
  if (industry === 'enterprise-software') compliancePacks.push('compliance.soc2');

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
  if (subIndustry) result.subIndustry = subIndustry;
  if (audience === 'b2b' || audience === 'internal') result.audience = audience;

  // Attach raw industry score as a hidden signal for the confidence gate.
  // We use the description field to pass it through without changing BREContext schema.
  // The confidence gate reads it via the exported detectIndustryWithScore function.
  // This keeps BREContext clean while still making the score available.
  (result as any).__industryScore = industryScore;

  return result;
}

/**
 * Get the industry detection score for a pre-built BREContext.
 * Used by the confidence gate to evaluate match quality.
 */
export function getIndustryScore(ctx: BREContext): number {
  return (ctx as any).__industryScore ?? 0;
}
