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

import type { BREContext } from './reasoning/rules-engine';
import type { BusinessIntelligenceProfile } from './schemas/knowledge/business-intelligence.schema';
import type { BusinessResearch, ScrapedContent } from './types';
import { understandBusiness } from '../orchestration/business-intelligence/engine.js';
import { deriveRevenueIntelligence } from '../orchestration/business-intelligence/revenue-intelligence.js';

interface IndustryMapping {
  industry: string;
  subIndustries: Record<string, string[]>;
  keywords: string[];
  businessModels: string[];
  capabilities: string[];
  entities: string[];
  audience: 'b2c' | 'b2b' | 'internal' | 'mixed';
}

// Style/quality modifiers — should lose industry ties to concrete product
// domains (so "luxury headphones" resolves to consumer-electronics, not luxury).
const STYLE_INDUSTRIES = new Set<string>(['luxury']);

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
      'annual plan', 'tier', 'cloud', 'automation', 'workflow', 'productivity',
      'task', 'tracker', 'todo', 'kanban'],
    businessModels: ['subscription'],
    capabilities: ['analytics', 'crm', 'payments', 'subscriptions', 'inventory'],
    entities: ['User', 'Subscription', 'Feature'],
    audience: 'b2b',
  },
  {
    industry: 'perfume',
    subIndustries: {
      niche: ['perfume', 'fragrance', 'scent', 'parfum', 'eau de toilette',
        'eau de parfum', 'niche perfume', 'luxury perfume', 'signature scent',
        'olfactory', 'perfumery'],
    },
    keywords: ['perfume', 'fragrance', 'scent', 'parfum', 'eau de', 'perfumery',
      'olfactory', 'niche perfume', 'luxury perfume', 'signature scent',
      'wearable fragrance', 'bespoke scent'],
    businessModels: ['direct-sales'],
    capabilities: ['commerce', 'payments', 'gallery', 'search', 'reviews'],
    entities: ['Product', 'Scent', 'Collection', 'Order', 'Review'],
    audience: 'b2c',
  },
  {
    industry: 'ecommerce',
    subIndustries: {
      fashion: ['fashion', 'clothing', 'apparel', 'wear', 'style', 'outfit'],
      electronics: ['electronics', 'gadget', 'tech', 'device', 'computer', 'phone'],
      beauty: ['beauty', 'cosmetics', 'skincare', 'makeup', 'fragrance'],
      food_beverage: ['food', 'grocery', 'organic', 'snack', 'beverage', 'wine'],
      marketplace: ['marketplace', 'multi-seller', 'vendor', 'platform'],
      supplement: ['supplement', 'supplements', 'whey', 'protein', 'protein powder',
        'vitamin', 'vitamins', 'creatine', 'bcaa', 'pre-workout', 'fish oil',
        'multivitamin', 'glutamine', 'mass gainer', 'fat burner', 'omega',
        'calcium', 'iron', 'zinc', 'magnesium', 'probiotic', 'collagen',
        'ashwagandha', 'saffron', 'shilajit', 'gokhru', 'yohimbine'],
      footwear: ['footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals', 'sneaker',
        'kicks', 'sole', 'insole', 'outsole', 'running shoes', 'athletic shoes',
        'casual shoes', 'formal shoes', 'leather shoes', 'shoe brand', 'shoe store'],
    },
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'sell', 'product', 'cart',
      'buy', 'purchase', 'retail', 'catalog', 'checkout', 'shipping', 'inventory',
      'marketplace', 'storefront', 'online store', 'dropship', 'fulfillment',
      // Supplement marketplace specific
      'supplement', 'supplements', 'whey protein', 'protein powder', 'gym supplements',
      'bodybuilding supplements', 'nutrition store', 'health store', 'health shop',
      'online supplement', 'supplement store', 'buy supplements',
      // Footwear specific
      'footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals', 'sneaker',
      'kicks', 'running shoes', 'athletic shoes', 'casual shoes', 'formal shoes',
      'leather shoes', 'shoe brand', 'shoe store', 'shop shoes', 'buy shoes',
    ],
    businessModels: ['direct-sales', 'marketplace'],
    capabilities: ['commerce', 'payments', 'inventory', 'orders', 'analytics', 'search',
      'ecommerce-supplement', 'indian-payments', 'fssai-compliance', 'multi-vendor', 'customer-reviews'],
    entities: ['Product', 'Order', 'Customer', 'Category', 'Brand', 'Seller', 'Ingredient'],
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
    keywords: ['school', 'education', 'course', 'learn', 'learning', 'teaching', 'courses',
      'tutor', 'university', 'college', 'training', 'workshop', 'academy', 'elearning',
      'e-learning', 'student', 'instructor', 'curriculum', 'lesson', 'lecture', 'degree',
      'certificate'],
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
      'seminar', 'gala', 'ceremony', 'venue', 'tickets', 'rsvp', 'speakers',
      'event management', 'event platform', 'event planning', 'event creation', 'ticket sales'],
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
  {
    industry: 'consumer-electronics',
    subIndustries: {
      audio: ['headphones', 'earbuds', 'earphones', 'headset', 'speaker', 'speakers',
        'audio', 'sound', 'hi-fi', 'hifi', 'audiophile', 'noise cancelling',
        'noise canceling', 'wireless audio', 'bluetooth audio', 'sound system'],
      wearables: ['smartwatch', 'smart watch', 'fitness tracker', 'wearable', 'activity band'],
      computers: ['laptop', 'computer', 'pc', 'desktop', 'tablet', 'monitor', 'notebook'],
      gaming: ['console', 'gaming', 'gaming headset', 'controller', 'handheld'],
      photography: ['camera', 'mirrorless', 'dslr', 'lens', 'action cam'],
    },
    keywords: ['headphones', 'earbuds', 'earphones', 'headset', 'speaker', 'speakers',
      'audio', 'sound', 'audiophile', 'noise cancelling', 'noise canceling',
      'wireless headphones', 'bluetooth headphones', 'bluetooth', 'electronics',
      'gadget', 'device', 'tech', 'consumer electronics', 'smart device',
      'sound system', 'home audio', 'portable speaker', 'earbuds', 'tws'],
    businessModels: ['direct-sales'],
    capabilities: ['commerce', 'payments', 'gallery', 'search', 'reviews'],
    entities: ['Product', 'Review', 'Collection', 'Order'],
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
      construction: ['construction', 'contractor management', 'job site', 'building project', 'construction project'],
      supply_chain: ['supply chain', 'procurement', 'vendor management', 'purchase order', 'sourcing'],
    },
    keywords: ['erp', 'enterprise resource planning', 'hrm', 'hris', 'accounting software',
      'finance system', 'procurement', 'supply chain', 'inventory management', 'operations',
      'enterprise', 'internal tool', 'back office', 'admin panel', 'management system',
      'business management', 'operations management', 'workflow management',
      'resource planning', 'asset management', 'compliance management',
      'crm', 'sales team', 'customer relationship', 'client management', 'lead tracking'],
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
      'financial services', 'wealth management', 'compliance', 'kyc', 'aml',
      'insurance portal', 'banking dashboard', 'banking system', 'policy management',
      'claims management', 'account management', 'transaction tracking', 'bank account'],
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

/**
 * Canonical business-model keyword map.
 *
 * These are ORTHOGONAL monetization mechanics — independent of vertical and
 * audience. Keys align with the `BUSINESS_MODELS` registry in
 * `src/bos/knowledge/registry.ts`. Detection is keyword-driven and additive: a
 * single prompt may surface several models (e.g. a SaaS with a freemium tier
 * AND usage-based overages), so `detectBusinessModels` returns every match.
 *
 * 35 canonical models are represented below.
 */
const BUSINESS_MODEL_KEYWORDS: Record<string, string[]> = {
  subscription: ['subscription', 'subscribe', 'monthly', 'annual', 'plan', 'tier', 'recurring', 'saas', 'software as a service'],
  'direct-sales': ['sell', 'shop', 'store', 'buy', 'purchase', 'product', 'cart', 'checkout', 'ecommerce', 'order online'],
  marketplace: ['marketplace', 'multi-seller', 'connect buyers', 'connect sellers', 'multi-vendor'],
  'service-booking': ['book', 'appointment', 'schedule a', 'consultation', 'session', 'reserve', 'slot', 'reservation'],
  membership: ['membership', 'member', 'join', 'club', 'access', 'exclusive', 'vip'],
  donation: ['donate', 'donation', 'fundraise', 'campaign', 'support', 'crowdfund', 'nonprofit', 'charity'],
  advertising: ['advertising', 'ads', 'sponsor', 'promote', 'banner', 'monetize', 'ad space'],
  wholesale: ['wholesale', 'b2b', 'bulk', 'distributor', 'reseller', 'supply chain', 'supplier',
    'purchase order', 'volume pricing', 'dealer', 'dealer network', 'procurement',
    'enterprise contract', 'site license'],
  freemium: ['freemium', 'free tier', 'free plan', 'free version', 'free account'],
  'usage-based': ['usage-based', 'pay-as-you-go', 'metered', 'per-use', 'consumption-based', 'by usage'],
  'pay-per-use': ['pay-per-use', 'per-seat', 'per-event', 'per-item', 'per-user pricing'],
  'free-trial': ['free trial', 'trial', 'try free', '14-day', '30-day trial'],
  'franchise': ['franchise', 'franchising', 'licensee', 'own a branch', 'franchisee'],
  licensing: ['licensing', 'license', 'royalty', 'ip', 'rights', 'intellectual property'],
  'transaction-fee': ['transaction fee', 'per-transaction', 'processing fee', 'flat fee per sale'],
  saas: ['saas', 'software platform', 'dashboard preview', 'software as a service'],
  'lead-gen': ['lead', 'lead-gen', 'inquiry', 'quote request', 'contact us', 'get a quote'],
  affiliate: ['affiliate', 'referral link', 'partner program', 'referral commission'],
  'onsite': ['on-demand', 'instant', 'same-day', 'request a courier', 'request now'],
  enterprise: ['enterprise', 'annual agreement', 'custom quote', 'large account', 'contract'],
  d2c: ['d2c', 'direct to consumer', 'direct-to-consumer', 'subscription box', 'own brand'],
  b2c: ['b2c', 'consumer', 'retail store', 'shop for'],
  b2b: ['b2b', 'business to business', 'oem', 'sell to businesses'],
  agency: ['agency', 'retainer', 'studio', 'creative agency', 'marketing agency'],
  consulting: ['consulting', 'advisory', 'consultation', 'expert'],
  'marketplace-saas': ['two-sided marketplace', 'marketplace platform', 'platform and marketplace'],
  'govt-permit': ['permit', 'license application', 'civic', 'government service', 'public sector'],
  crowdfunding: ['crowdfunding', 'backers', 'pledge', 'funding campaign'],
  'data-monetization': ['data', 'insights', 'reports', 'analytics access', 'data product'],
  'freemium-trial': ['freemium trial', 'free plan and trial', 'free tier with trial'],
  hybrid: ['hybrid model', 'multi-model', 'combined model', 'mixed monetization'],
  'agent-builder': ['agent', 'builder', 'no-code platform', 'deploy agents', 'agent platform'],
  community: ['community', 'creator', 'patron', 'tips', 'creator economy'],
  'event-ticketing': ['event', 'ticket', 'ticketing', 'rsvp', 'conference', 'webinar'],
  'placement-fee': ['listing fee', 'featured listing', 'placement', 'promote listing', 'promote your'],
  'subscription-box': ['subscription box', 'monthly box', 'curated box', 'box subscription'],
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

  // Word-boundary match for single-word keywords so short tokens don't false-
  // positive on longer words ("land" must not match "landing", "app" not
  // "happen", "car" not "career", "spa" not "spark"). Multi-word phrases are
  // specific enough to keep substring matching.
  const keywordMatches = (text: string, keyword: string): boolean => {
    if (keyword.includes(' ')) return text.includes(keyword);
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  };

  for (const mapping of INDUSTRY_MAPPINGS) {
    let score = 0;
    for (const keyword of mapping.keywords) {
      if (keywordMatches(lower, keyword)) {
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
    // Strict-greater wins. On a tie, prefer a concrete product/domain industry
    // over a style-modifier industry (e.g. "headphones" should beat "luxury").
    const isStyle = STYLE_INDUSTRIES.has(mapping.industry);
    const bestIsStyle = bestMatch ? STYLE_INDUSTRIES.has(bestMatch.industry) : false;
    if (score > bestScore || (score === bestScore && bestIsStyle && !isStyle)) {
      bestScore = score;
      bestMatch = mapping;
    }
  }

  if (bestScore < 2) {
    return { mapping: undefined, score: 0, subIndustry: undefined };
  }

  // Detect sub-industry
  let subIndustry: string | undefined;
  if (bestMatch) {
    let maxSubScore = 0;
    for (const [sub, subKws] of Object.entries(bestMatch.subIndustries)) {
      let subScore = 0;
      for (const kw of subKws) {
        const kwRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (kwRegex.test(lower)) subScore += kw.split(' ').length;
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
    [/\b(india|indian|mumbai|delhi|bangalore|bengaluru|chennai|kolkata|hyderabad|pune|ahmedabad|jaipur|lucknow|in)\b/, 'IN'],
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

// ─── Design mood detection (vertical-agnostic aesthetic signal) ──────────────

const MOOD_KEYWORDS: Record<string, string> = {
  futuristic: 'futuristic',
  cinematic: 'cinematic',
  immersive: 'immersive',
  calming: 'calming',
  calm: 'calm',
  calmly: 'calm',
  serene: 'calm',
  peaceful: 'calm',
  minimal: 'minimal',
  minimalist: 'minimal',
  bold: 'bold',
  playful: 'playful',
  dark: 'dark',
  light: 'light',
  luxury: 'luxury',
  luxurious: 'luxury',
  premium: 'luxury',
};

function detectDesignMood(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  for (const [kw, mood] of Object.entries(MOOD_KEYWORDS)) {
    if (lower.includes(kw)) return mood;
  }
  return undefined;
}

// ─── App name extraction ─────────────────────────────────────────────────────

function extractAppName(prompt: string): string | undefined {
  const patterns = [
    // "called X" / "named X" — stop before common joiners (with, for, that, and, the)
    /(?:called|named)\s+["']?([A-Z][A-Za-z0-9&'.-]{1,30})["']?(?:\s+(?:with|for|that|and|the)\b|\s*[,.]|\s*$)/,
    // Quoted names: "Build 'MediTrack'"
    /["']([A-Z][A-Za-z0-9\s&'.-]{1,40})["']/,
    // Capital-letter multi-word after "for": "ERP for HospitalOS"
    /(?:for|called|named)\s+([A-Z][A-Za-z0-9]{1,20}(?:\s+[A-Z][A-Za-z0-9]{1,20}){0,2})/,
    // Leading name: "Austin Kitchen, a modern restaurant..." or "Blue Bottle Coffee — specialty..."
    /^([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})(?:\s*[,\u2014\u2013\-:]|\s+(?:a|an|the|is|are|was|serving|specializing|offering|with|for|that)\b)/,
  ];

  // Words that are NOT business names — adjectives, descriptors, generic nouns, action verbs
  const notNames = new Set([
    'indian', 'american', 'chinese', 'japanese', 'korean', 'french', 'german', 'italian',
    'british', 'european', 'african', 'asian', 'australian', 'canadian', 'mexican',
    'spanish', 'russian', 'brazilian', 'thai', 'vietnamese', 'turkish', 'arabic',
    'global', 'local', 'online', 'digital', 'modern', 'smart', 'fast', 'quick',
    'best', 'top', 'good', 'great', 'new', 'old', 'first', 'last', 'next',
    'full', 'complete', 'simple', 'easy', 'advanced', 'premium', 'basic',
    'multi', 'single', 'cross', 'ultra', 'super', 'mega', 'micro', 'mini',
    'real', 'true', 'false', 'yes', 'no', 'all', 'any', 'every', 'each',
    'fully', 'interactive', 'responsive', 'functional', 'dynamic', 'static',
    'small', 'medium', 'large', 'big', 'tiny', 'huge', 'massive',
    'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'our',
    'build', 'create', 'make', 'design', 'develop', 'set', 'get', 'start',
    'need', 'want', 'looking', 'trying', 'help', 'give', 'show', 'find',
    'wanting', 'looking', 'trying', 'thinking', 'planning', 'working',
    // CTA verbs and shopping actions — never brand names
    'shop', 'now', 'buy', 'order', 'purchase', 'try', 'subscribe',
    'shop now', 'buy now', 'order now', 'get started', 'sign up', 'register',
    'book', 'reserve', 'join', 'download', 'explore', 'discover', 'browse',
    'view', 'see', 'check', 'learn', 'read', 'watch', 'listen',
    // Generic product descriptors
    'premium', 'quality', 'best', 'top', 'leading', 'popular', 'trending',
    'affordable', 'cheap', 'expensive', 'luxury', 'budget', 'value',
  ]);

  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1] && m[1].length > 1) {
      const candidate = m[1].trim().slice(0, 60);
      // Reject if the captured name is just an adjective/descriptor
      if (notNames.has(candidate.toLowerCase())) continue;
      return candidate;
    }
  }
  return undefined;
}

/**
 * Generate a brand name from context when no explicit name is provided.
 * NEVER returns a single generic adjective ("Indian", "Local", "Modern").
 * NEVER returns words from the prompt verbatim as a brand name.
 * Combines location + industry keyword creatively to produce brand-sounding names.
 */
function generateAppName(prompt: string, industry: string, country?: string, subIndustry?: string): string {
  const lower = prompt.toLowerCase()

  // Strategy 1: Check for explicit business name in prompt
  const explicitMatch = prompt.match(
    /(?:called|named|brand(?:\s+name)?(?:\s+is)?)\s+["']?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)["']?/
  )
  if (explicitMatch && explicitMatch[1]) {
    const candidate = explicitMatch[1].trim()
    // Reject if it's a single adjective
    const adjectives = new Set(['indian', 'local', 'modern', 'best', 'top', 'great', 'new', 'old',
      'simple', 'easy', 'fast', 'quick', 'smart', 'premium', 'basic', 'mini', 'mega',
      'full', 'complete', 'online', 'digital', 'global', 'multi', 'single', 'real'])
    if (!adjectives.has(candidate.toLowerCase())) return candidate
  }

  // Extract city name if present
  const cityMatch = prompt.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/)
  const city = cityMatch ? cityMatch[1] : ''

  // Niche-specific brand words — detect from prompt text directly, not just industry
  // This ensures "supplement store" gets supplement words even if industry = 'ecommerce'
  const nicheWords: Array<{ keywords: string[]; words: string[] }> = [
    { keywords: ['supplement', 'supplements', 'protein', 'whey', 'creatine', 'vitamin', 'nutrition', 'fitness supplement'], words: ['Nutri', 'Fuel', 'Core', 'Build', 'Vita', 'Peak', 'Forge'] },
    { keywords: ['coffee', 'cafe', 'espresso', 'latte', 'brew', 'roast'], words: ['Brew', 'Roast', 'Grind', 'Press', 'Bean'] },
    { keywords: ['restaurant', 'dining', 'food', 'kitchen', 'menu', 'dish'], words: ['Table', 'Kitchen', 'Feast', 'Plate', 'Spice', 'Savora'] },
    { keywords: ['gym', 'fitness', 'workout', 'exercise', 'training'], words: ['Fit', 'Forge', 'Peak', 'Strong', 'Edge'] },
    { keywords: ['dental', 'dentist', 'teeth', 'oral'], words: ['Smile', 'Dent', 'Care', 'Bright', 'White'] },
    { keywords: ['salon', 'beauty', 'hair', 'style'], words: ['Glow', 'Style', 'Bloom', 'Lux', 'Aura'] },
    { keywords: ['spa', 'wellness', 'massage', 'relax'], words: ['Zen', 'Serene', 'Bliss', 'Pure', 'Tranquil'] },
    { keywords: ['wholesale', 'b2b', 'bulk', 'distributor', 'reseller', 'procurement'], words: ['Supply', 'Trade', 'Source', 'Pro', 'Connect', 'Network'] },
    { keywords: ['perfume', 'fragrance', 'scent', 'parfum', 'eau de', 'olfactory', 'niche perfume', 'luxury perfume', 'bespoke scent'], words: ['Aetheria', 'Maison', 'Noir', 'Essence', 'Oud', 'Velvet', 'Aura', 'Lumière'] },
    { keywords: ['footwear', 'shoes', 'sneakers', 'boots', 'heels', 'sandals', 'sneaker', 'kicks', 'sole', 'insole', 'outsole', 'running shoes', 'athletic shoes', 'casual shoes', 'formal shoes', 'leather shoes'], words: ['Stride', 'Kicks', 'Sole', 'Apex', 'Velo', 'Pace', 'Urban', 'Velocity'] },
    { keywords: ['headphones', 'earbuds', 'earphones', 'headset', 'speaker', 'speakers', 'audio', 'sound', 'audiophile', 'noise cancelling', 'noise canceling', 'bluetooth', 'wireless audio', 'home audio'], words: ['Aura', 'Soniq', 'Wave', 'Resonance', 'Acousti', 'Echo', 'Pulse', 'Lumen'] },
  ]

  // Industry-specific brand words (fallback when no niche matches)
  const industryNames: Record<string, string[]> = {
    coffee: ['Brew', 'Roast', 'Grind', 'Press', 'Bean'],
    restaurant: ['Table', 'Kitchen', 'Feast', 'Plate', 'Spice', 'Savora'],
    cafe: ['Brew', 'Roast', 'Grind', 'Press', 'Bean'],
    gym: ['Fit', 'Forge', 'Peak', 'Strong', 'Edge'],
    fitness: ['Fit', 'Forge', 'Peak', 'Strong', 'Edge'],
    supplement: ['Nutri', 'Fuel', 'Core', 'Build', 'Vita'],
    ecommerce: ['Shop', 'Mart', 'Hub', 'Basket', 'Cart', 'Market'],
    healthcare: ['Med', 'Care', 'Health', 'Life', 'Well', 'Connect'],
    dental: ['Smile', 'Dent', 'Care', 'Bright', 'White'],
    salon: ['Glow', 'Style', 'Bloom', 'Lux', 'Aura'],
    spa: ['Zen', 'Serene', 'Bliss', 'Pure', 'Tranquil'],
    retail: ['Shop', 'Store', 'Market', 'Hub', 'Point'],
    education: ['Learn', 'Edu', 'Academy', 'Skill', 'Mind'],
    saas: ['Nexus', 'Flow', 'Stack', 'Sync', 'Core', 'Pulse'],
    realestate: ['Home', 'Estates', 'Vista', 'Haven', 'Key'],
    legal: ['Lex', 'Law', 'Legal', 'Justice', 'Rights'],
    agency: ['Studio', 'Lab', 'House', 'Collective', 'Group'],
    media: ['Press', 'Media', 'Pulse', 'Daily', 'Scope'],
    travel: ['Voyage', 'Travel', 'Trips', 'Go', 'Wander'],
    technology: ['Tech', 'Digital', 'Sys', 'Net', 'Logic'],
    wholesale: ['Supply', 'Trade', 'Source', 'Pro', 'Connect', 'Network'],
    perfume: ['Aetheria', 'Maison', 'Noir', 'Essence', 'Oud', 'Velvet', 'Lumière', 'Parfum'],
    fragrance: ['Aetheria', 'Maison', 'Noir', 'Essence', 'Oud', 'Velvet', 'Lumière', 'Parfum'],
    beauty: ['Glow', 'Lux', 'Aura', 'Bloom', 'Velvet', 'Lumière'],
    luxury: ['Maison', 'Atelier', 'Noir', 'Velvet', 'Lumière', 'Essence'],
    footwear: ['Stride', 'Kicks', 'Sole', 'Apex', 'Velo', 'Pace', 'Urban', 'Velocity'],
    shoes: ['Stride', 'Kicks', 'Sole', 'Apex', 'Velo', 'Pace', 'Urban', 'Velocity'],
    sneakers: ['Stride', 'Kicks', 'Sole', 'Apex', 'Velo', 'Pace', 'Urban', 'Velocity'],
    'consumer-electronics': ['Aura', 'Soniq', 'Wave', 'Resonance', 'Pulse', 'Lumen', 'Acousti'],
    audio: ['Aura', 'Soniq', 'Wave', 'Resonance', 'Acousti', 'Echo', 'Lumen'],
  }

  // Pick niche words from prompt text, or fall back to industry words
  let words: string[] | undefined
  for (const niche of nicheWords) {
    if (niche.keywords.some(kw => lower.includes(kw))) {
      words = niche.words
      break
    }
  }
  if (!words) {
    words = industryNames[industry] || ['Studio', 'Hub', 'Works', 'Space', 'Co']
  }

  // Deterministic selection — hash the prompt to pick a word index
  const hash = [...lower].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const word = words[Math.abs(hash) % words.length]

  // India-specific brand patterns — always produce two-word brand names
  if (country === 'IN' || lower.includes('india') || lower.includes('indian') || lower.includes('rupee') || lower.includes('₹')) {
    if (lower.includes('supplement') || lower.includes('protein') || lower.includes('nutrition')) return `${city || word} Nutrition`
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('tiffin')) return `${city || word} Kitchen`
    if (lower.includes('fashion') || lower.includes('clothing') || lower.includes('wear')) return `${city || word} Fashion`
    if (lower.includes('fitness') || lower.includes('gym') || lower.includes('workout')) return `${city || word} Fitness`
    if (lower.includes('wholesale') || lower.includes('b2b') || lower.includes('bulk')) return `${city || word} Supply`
    // Fallback: always combine city + word, or word + industry. Never single word.
    if (city && city.length > 2) return `${city}${word}`
    return `${word} ${industry || 'Co'}`
  }

  // Combine city + industry word
  if (city && city.length > 2) {
    const adjectives = new Set(['indian', 'indonesian', 'american', 'british', 'chinese', 'french',
      'german', 'italian', 'spanish', 'european', 'african', 'asian', 'australian',
      'japanese', 'korean', 'mexican', 'russian', 'thai', 'vietnamese', 'turkish'])
    if (!adjectives.has(city.toLowerCase())) {
      return `${city}${word}`
    }
  }

  // Never return a single word — always two words minimum
  const result = `${word} Co`
  return result.length > 2 ? result : `${word} Studio`
}

// ─── Business Research extraction ────────────────────────────────────────────
// Analyzes the prompt to answer the fundamental business questions:
// What is the business? Who are the users? How does revenue flow?
// How does the customer flow? How does the business workflow operate?

const PERSONA_KEYWORDS: Record<string, string[]> = {
  fitness: ['gym enthusiast', 'fitness beginner', 'athlete', 'bodybuilder', 'yoga practitioner', 'health-conscious'],
  ecommerce: ['shopper', 'buyer', 'bargain hunter', 'brand loyalist', 'first-time buyer', 'bulk buyer'],
  restaurant: ['foodie', 'diner', 'takeout customer', 'health-conscious eater', 'family diner'],
  healthcare: ['patient', 'health-conscious', 'senior', 'parent', 'chronic condition manager'],
  saas: ['developer', 'project manager', 'team lead', 'startup founder', 'enterprise admin'],
  realestate: ['home buyer', 'investor', 'renter', 'first-time buyer', 'property developer'],
  education: ['student', 'professional learner', 'career changer', 'certification seeker'],
  legal: ['individual seeking legal help', 'small business owner', 'corporate legal team'],
  salon: ['beauty enthusiast', 'professional', 'bride-to-be', 'regular client'],
  travel: ['adventure traveler', 'business traveler', 'family vacationer', 'budget traveler'],
};

const REVENUE_FLOW_KEYWORDS: Record<string, string[]> = {
  'direct-sales': ['product sales', 'sell products', 'online store', 'shop'],
  'subscription': ['monthly plan', 'annual plan', 'recurring', 'subscribe'],
  'commission': ['marketplace', 'commission', 'platform fee', 'service fee'],
  'freemium': ['free plan', 'premium upgrade', 'basic plan', 'pro plan'],
  'advertising': ['ads', 'sponsorship', 'banner ads', 'affiliate'],
  'service-booking': ['booking', 'appointment', 'consultation', 'session'],
  'membership': ['membership', 'club', 'vip', 'exclusive access'],
};

const PAYMENT_METHOD_KEYWORDS: Record<string, string[]> = {
  upi: ['upi', 'google pay', 'phonepe', 'paytm', 'bhim'],
  'credit-card': ['credit card', 'visa', 'mastercard', 'amex'],
  'debit-card': ['debit card', 'atm card'],
  cod: ['cash on delivery', 'cod', 'pay on delivery'],
  emi: ['emi', 'installment', 'easy payment', 'no cost emi'],
  netbanking: ['net banking', 'online banking', 'bank transfer'],
  wallet: ['wallet', 'digital wallet', 'amazon pay'],
  paypal: ['paypal', 'stripe'],
  crypto: ['bitcoin', 'crypto', 'ethereum', 'usdt'],
};

const WORKFLOW_KEYWORDS: Record<string, string[]> = {
  inventory: ['inventory', 'stock', 'warehouse', 'sku'],
  'order-processing': ['order processing', 'fulfillment', 'shipping', 'dispatch'],
  'customer-support': ['support', 'helpdesk', 'ticket', 'complaint'],
  'quality-check': ['quality', 'inspection', 'qc', 'testing'],
  'marketing': ['marketing', 'campaign', 'promotion', 'social media'],
  accounting: ['accounting', 'invoice', 'billing', 'tax'],
  hr: ['hiring', 'recruitment', 'onboarding', 'payroll'],
  procurement: ['procurement', 'supplier', 'vendor', 'purchase order'],
};

const KPI_KEYWORDS: Record<string, string[]> = {
  revenue: ['revenue', 'sales', 'mrr', 'arr', 'daily orders'],
  customers: ['customers', 'users', 'subscribers', 'members'],
  conversion: ['conversion rate', 'conversion', 'checkout rate'],
  retention: ['retention', 'churn', 'repeat purchase', 'lifetime value'],
  acquisition: ['acquisition', 'cac', 'cost per', 'marketing roi'],
  satisfaction: ['satisfaction', 'nps', 'reviews', 'ratings'],
  inventory: ['stock level', 'inventory turnover', 'out of stock'],
  traffic: ['traffic', 'visitors', 'page views', 'bounce rate'],
};

const VOCABULARY_MAPS: Record<string, Record<string, string>> = {
  restaurant: { product: 'dish', customer: 'guest', order: 'reservation', staff: 'chef' },
  healthcare: { product: 'treatment', customer: 'patient', order: 'appointment', staff: 'provider' },
  fitness: { product: 'membership', customer: 'member', order: 'enrollment', staff: 'trainer' },
  ecommerce: { product: 'product', customer: 'customer', order: 'order', staff: 'team' },
  'ecommerce-supplement': { product: 'supplement', customer: 'athlete', order: 'order', staff: 'nutritionist', category: 'product line', brand: 'brand' },
  saas: { product: 'feature', customer: 'user', order: 'subscription', staff: 'team' },
  realestate: { product: 'property', customer: 'buyer', order: 'offer', staff: 'agent' },
  education: { product: 'course', customer: 'student', order: 'enrollment', staff: 'instructor' },
  legal: { product: 'service', customer: 'client', order: 'case', staff: 'attorney' },
  salon: { product: 'service', customer: 'client', order: 'booking', staff: 'stylist' },
  travel: { product: 'package', customer: 'traveler', order: 'booking', staff: 'guide' },
};

function detectPersonas(prompt: string, industry: string): string[] {
  const lower = prompt.toLowerCase();
  const personas: string[] = [];

  // Check industry-specific personas
  const industryPersonas = PERSONA_KEYWORDS[industry] || [];
  for (const persona of industryPersonas) {
    const firstWord = persona.split(' ')[0] ?? '';
    if (firstWord && lower.includes(firstWord)) {
      personas.push(persona);
    }
  }

  // Sub-industry specific personas (e.g., supplement store → fitness personas)
  if (lower.includes('supplement') || lower.includes('protein') || lower.includes('whey') || lower.includes('nutrition')) {
    personas.push('fitness enthusiast', 'athlete', 'bodybuilder', 'health-conscious consumer');
  }
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout')) {
    personas.push('gym member', 'personal training client');
  }

  // Check for explicit audience mentions
  if (lower.includes('beginner') || lower.includes('new to')) personas.push('beginners');
  if (lower.includes('professional') || lower.includes('expert')) personas.push('professionals');
  if (lower.includes('family') || lower.includes('families')) personas.push('families');
  if (lower.includes('student') || lower.includes('students')) personas.push('students');
  if (lower.includes('senior') || lower.includes('elderly')) personas.push('seniors');
  if (lower.includes('corporate') || lower.includes('enterprise')) personas.push('enterprise clients');

  // B2B signals
  if (lower.includes('b2b') || lower.includes('wholesale') || lower.includes('bulk')) {
    personas.push('business buyers');
  }

  // Multi-brand signals
  if (lower.includes('multi brand') || lower.includes('multi-brand') || lower.includes('multiple brand')) {
    personas.push('brand comparison shopper', 'value-conscious buyer');
  }

  // Indian market signals
  if (lower.includes('indian') || lower.includes('india')) {
    personas.push('Indian consumer', 'price-sensitive buyer');
  }

  return personas.length > 0 ? personas : ['general consumers'];
}

function detectCustomerFlow(prompt: string, industry: string): string[] {
  const lower = prompt.toLowerCase();
  const flow: string[] = [];

  // Universal flow steps
  if (lower.includes('browse') || lower.includes('search') || lower.includes('discover')) {
    flow.push('discover and browse');
  }
  if (lower.includes('compare') || lower.includes('review') || lower.includes('compare prices')) {
    flow.push('compare and evaluate');
  }
  if (lower.includes('cart') || lower.includes('add to') || lower.includes('select')) {
    flow.push('select and add to cart');
  }
  if (lower.includes('checkout') || lower.includes('payment') || lower.includes('pay')) {
    flow.push('checkout and payment');
  }
  if (lower.includes('delivery') || lower.includes('shipping') || lower.includes('fulfillment')) {
    flow.push('receive delivery');
  }
  if (lower.includes('review') || lower.includes('feedback') || lower.includes('rating')) {
    flow.push('leave review');
  }

  // Industry-specific flows
  if (industry === 'restaurant') {
    flow.push('make reservation');
    flow.push('dine in or order takeaway');
  }
  if (industry === 'healthcare') {
    flow.push('book appointment');
    flow.push('consult with provider');
  }
  if (industry === 'saas') {
    flow.push('sign up for trial');
    flow.push('onboard and configure');
  }
  if (industry === 'fitness') {
    flow.push('join membership');
    flow.push('attend classes');
  }

  return flow.length > 0 ? flow : ['discover', 'evaluate', 'purchase', 'receive'];
}

function detectRevenueFlow(prompt: string, industry: string): string[] {
  const lower = prompt.toLowerCase();
  const flows: string[] = [];

  for (const [model, keywords] of Object.entries(REVENUE_FLOW_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        flows.push(model);
        break;
      }
    }
  }

  // Industry defaults if nothing detected
  if (flows.length === 0) {
    if (industry === 'ecommerce' || industry === 'restaurant') flows.push('direct-sales');
    else if (industry === 'saas') flows.push('subscription');
    else if (industry === 'fitness') flows.push('membership');
    else flows.push('direct-sales');
  }

  return flows;
}

function detectPaymentMethods(prompt: string, country?: string): string[] {
  const lower = prompt.toLowerCase();
  const methods: string[] = [];

  for (const [method, keywords] of Object.entries(PAYMENT_METHOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        methods.push(method);
        break;
      }
    }
  }

  // Country defaults
  if (methods.length === 0) {
    if (country === 'IN') {
      methods.push('upi', 'credit-card', 'cod', 'netbanking');
    } else if (country === 'US' || country === 'GB') {
      methods.push('credit-card', 'debit-card', 'paypal');
    } else {
      methods.push('credit-card', 'debit-card');
    }
  }

  return methods;
}

function detectBusinessWorkflow(prompt: string, industry: string): string[] {
  const lower = prompt.toLowerCase();
  const workflow: string[] = [];

  for (const [step, keywords] of Object.entries(WORKFLOW_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        workflow.push(step);
        break;
      }
    }
  }

  // Industry defaults
  if (workflow.length === 0) {
    if (industry === 'ecommerce') {
      workflow.push('inventory', 'order-processing', 'marketing');
    } else if (industry === 'restaurant') {
      workflow.push('order-processing', 'quality-check');
    } else if (industry === 'healthcare') {
      workflow.push('customer-support', 'accounting');
    } else if (industry === 'saas') {
      workflow.push('customer-support', 'marketing');
    } else if (industry === 'perfume' || industry === 'fragrance' || industry === 'luxury') {
      workflow.push('collection-browse', 'vip-inquiry', 'bespoke-consultation');
    }
  }

  return workflow;
}

/**
 * Format a workflow key into human-readable text.
 * e.g. "vip-inquiry" → "VIP Inquiry", "order-processing" → "Order Processing"
 */
function formatWorkflowKey(key: string): string {
  return key
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectKPIs(prompt: string, industry: string): string[] {
  const lower = prompt.toLowerCase();
  const kpis: string[] = [];

  for (const [kpi, keywords] of Object.entries(KPI_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        kpis.push(kpi);
        break;
      }
    }
  }

  // Industry defaults
  if (kpis.length === 0) {
    kpis.push('revenue', 'customers');
    if (industry === 'ecommerce') kpis.push('conversion', 'inventory');
    if (industry === 'saas') kpis.push('retention', 'acquisition');
    if (industry === 'restaurant') kpis.push('satisfaction');
  }

  return kpis;
}

/**
 * Build a BusinessResearch object from the user's prompt.
 * Extracts business context: what the business is, who the users are,
 * how revenue flows, how customers interact, and how the business operates.
 *
 * This is the FOUNDATION — all downstream consumers read from this.
 */
export function buildBusinessResearch(prompt: string, industry: string, subIndustry?: string, country?: string): BusinessResearch {
  const lower = prompt.toLowerCase();

  // Business type from prompt
  const businessType = lower
    .replace(/\b(build|create|make|a|an|the|for|with|that|and|or|but|in|on|at|to|of|is|it|my|our|your|want|need|looking|site|website|app|application|platform|system|store|shop|business|company|brand|customer|customers|client|clients|people|users|user|audience|market|industry|type|kind|best|top|new|online|local|small|large|great|good|better|perfect|indian|india|american|us|usa|uk|british|dubai|uae|australian|canadian|german|french|japanese|chinese)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || `${industry} business`;

  // User personas
  const userPersonas = detectPersonas(prompt, industry);

  // Customer flow
  const customerFlow = detectCustomerFlow(prompt, industry);

  // Revenue flow
  const revenueFlow = detectRevenueFlow(prompt, industry);

  // Payment methods
  const paymentMethods = detectPaymentMethods(prompt, country);

  // Business workflow
  const businessWorkflow = detectBusinessWorkflow(prompt, industry);

  // KPIs
  const kpis = detectKPIs(prompt, industry);

  // Vocabulary — check sub-industry first, then industry
  const vocabulary = (subIndustry && VOCABULARY_MAPS[`${industry}-${subIndustry}`]) || VOCABULARY_MAPS[industry] || {};

  return {
    businessType,
    industry,
    subIndustry: subIndustry || industry,
    domain: industry,
    userPersonas,
    customerFlow,
    revenueFlow,
    paymentMethods,
    businessWorkflow,
    kpis,
    vocabulary,
    referenceUrls: [],
    realProducts: [],
    realTestimonials: [],
  };
}

// ─── Scraped Data Merge ───────────────────────────────────────────────────────

/**
 * Merge scraped content back into BusinessResearch.
 * After the scraper succeeds, this populates realProducts, realTestimonials,
 * and extracts domain vocabulary (customer term, currency, CTAs) from scraped text.
 */
export function mergeScrapedIntoResearch(ctx: BREContext, scraped: ScrapedContent): void {
  if (!ctx.businessResearch) return;

  ctx.businessResearch.realProducts = scraped.prices.map(p => ({
    name: p.name,
    price: p.price,
    description: p.description,
  }));
  ctx.businessResearch.realTestimonials = scraped.testimonials.map(t => ({
    text: t.text,
    author: t.author,
    role: t.role,
  }));
  ctx.businessResearch.scrapedContent = scraped;

  // Extract domain vocabulary from scraped text
  const allText = [
    scraped.heroHeadline,
    scraped.aboutText,
    scraped.contactAddress,
    ...scraped.prices.map(p => `${p.name} ${p.description ?? ''}`),
    ...scraped.teamMembers.map(t => `${t.name} ${t.role}`),
    ...scraped.productSpecs,
  ].join(' ').toLowerCase();

  // Detect customer term from scraped content
  const customerTerms = ['member', 'patient', 'client', 'guest', 'student', 'subscriber', 'rider', 'learner'];
  const detectedCustomerTerm = customerTerms.find(t => allText.includes(t));

  // Detect currency from prices
  const hasRupee = scraped.prices.some(p => p.price?.includes('₹') || p.price?.includes('Rs'));
  const hasEuro = scraped.prices.some(p => p.price?.includes('€'));

  ctx.businessResearch.vocabulary = {
    ...ctx.businessResearch.vocabulary,
    customerTerm: detectedCustomerTerm ?? ctx.businessResearch.vocabulary?.customerTerm ?? 'customer',
    currency: hasRupee ? 'INR' : hasEuro ? 'EUR' : 'USD',
    currencySymbol: hasRupee ? '₹' : hasEuro ? '€' : '$',
    primaryCTA: ctx.businessResearch.vocabulary?.primaryCTA ?? 'Get in Touch',
    secondaryCTA: 'Learn More',
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Convert a free-text prompt into a BREContext using deterministic keyword matching.
 * Zero LLM calls.
 *
 * Returns both the BREContext and the raw industry score so the confidence gate
 * can evaluate match quality without re-running detection.
 */
export async function buildBREContext(prompt: string): Promise<BREContext> {
  const lower = prompt.toLowerCase();
  const { mapping: industryMapping, score: industryScore, subIndustry } = detectIndustryWithScore(prompt);

  const industry = industryMapping?.industry ?? 'general';
  const businessModels = detectBusinessModels(prompt);
  const capabilities = detectCapabilities(prompt, industryMapping);
  const journeys = detectJourneys(prompt, industryMapping);
  const country = detectCountry(prompt);
  const appName = extractAppName(prompt) ?? generateAppName(prompt, industry, country, subIndustry);
  const entities = industryMapping?.entities ?? ['User'];
  const audience = industryMapping?.audience ?? 'mixed';

  const compliancePacks: string[] = [];
  if (country === 'EU' || country === 'DE' || country === 'FR' || country === 'GB') {
    compliancePacks.push('compliance.gdpr');
  }
  if (industry === 'healthcare') compliancePacks.push('compliance.hipaa');
  if (industry === 'fintech') compliancePacks.push('compliance.pci-dss');
  if (industry === 'enterprise-software') compliancePacks.push('compliance.soc2');
  // FSSAI compliance for Indian supplement/food/health product marketplaces
  if (country === 'IN' && (
    subIndustry === 'supplement' ||
    industry === 'ecommerce-supplement' ||
    (industry === 'ecommerce' && (
      lower.includes('supplement') || lower.includes('protein') || lower.includes('vitamin') ||
      lower.includes('whey') || lower.includes('gym supplement') || lower.includes('nutrition store') ||
      lower.includes('health store') || lower.includes('fssai')
    ))
  )) {
    compliancePacks.push('compliance.fssai');
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
  // Store a cleaned description — NOT the raw prompt (which leaks into UI)
  if (prompt) {
    const cleaned = prompt
      .replace(/\b(build|create|make|design|develop|set up)\b/gi, '')
      .replace(/\b(for|a|an|the|that|with|and|or)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    result.description = cleaned || `${appName ?? 'the business'} — ${industry}`;
  }
  if (subIndustry) result.subIndustry = subIndustry;
  if (audience === 'b2b' || audience === 'internal') result.audience = audience;

  // Build business research — the FOUNDATION for all downstream consumers.
  // Extracts: what the business is, who the users are, how revenue flows,
  // how customers interact, how the business operates.
  result.businessResearch = buildBusinessResearch(prompt, industry, subIndustry, country);

  // Extract explicit design mood from prompt adjectives (vertical-agnostic).
  const designMood = detectDesignMood(prompt);
  if (designMood) result.designMood = designMood;

  // Attach raw industry score as a hidden signal for the confidence gate.
  // We use the description field to pass it through without changing BREContext schema.
  // The confidence gate reads it via the exported detectIndustryWithScore function.
  // This keeps BREContext clean while still making the score available.
  (result as any).__industryScore = industryScore;

// ── Business Intelligence Engine (Layer 1) ───────────────────────────────
  // Produce the single source of truth for business understanding. This is
  // vertical-agnostic: it reasons about workflows / customers / goals from
  // primitive signals, never a keyword→vertical lookup. Legacy fields above
  // are preserved for compatibility; downstream layers migrate to read this.
  try {
    result.businessKnowledge = understandBusiness(prompt);
  } catch (biErr) {
    console.warn('[BI Engine] failed (continuing without):', (biErr as Error).message);
  }

  // Fold the explicit design mood into BusinessKnowledge intents so the
  // signal-driven design path honors creative direction (futuristic →
  // cinematic motion + dark palette; calming → calm motion + muted palette).
  if (result.businessKnowledge && designMood) {
    const bk = result.businessKnowledge;
    const moodToMotion: Record<string, string> = {
      futuristic: 'cinematic',
      cinematic: 'cinematic',
      immersive: 'scroll-driven',
      calming: 'calm',
      calm: 'calm',
      bold: 'energetic',
      playful: 'energetic',
      minimal: 'calm',
      dark: 'cinematic',
      luxury: 'cinematic',
    };
    const motion = moodToMotion[designMood];
    if (motion && !bk.intents.motion.includes(motion)) {
      bk.intents.motion = [...bk.intents.motion, motion];
    }
    if (!bk.intents.emotional.includes(designMood) && ['luxury', 'calm', 'serenity', 'excitement', 'trust'].includes(designMood)) {
      bk.intents.emotional = [designMood, ...bk.intents.emotional];
    }
  }

  // Derive revenue intelligence from signal-driven BusinessKnowledge — the
  // vertical-agnostic replacement for the old hardcoded BOS entry lookup. This
  // guarantees EVERY business (not just 7 verticals or scraped sites) gets a
  // revenue model, KPIs, funnel, churn signals and dashboard widgets. The
  // scraper path (bre-v2-pipeline) may still overwrite this later with live
  // evidence when a real reference site is available.
  if (!result.revenueIntelligence && result.businessKnowledge) {
    try {
      result.revenueIntelligence = deriveRevenueIntelligence(result.businessKnowledge);
    } catch (riErr) {
      console.warn('[Revenue Intelligence] derivation failed (continuing without):', (riErr as Error).message);
    }
  }

  return result;
}

/**
 * Get the industry detection score for a pre-built BREContext.
 * Used by the confidence gate to evaluate match quality.
 */
export function getIndustryScore(ctx: BREContext): number {
  return (ctx as any).__industryScore ?? 0;
}
