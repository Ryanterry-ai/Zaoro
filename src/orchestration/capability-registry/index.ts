// ─── Capability Registry — Universal Industry/Domain Catalog ──────────────────
//
// @deprecated (Phase R2, 2026-07-15) — Page/section-level capability vocabulary.
// The canonical, single-vocabulary Capability Registry now lives at
// `src/bos/capabilities/` (CapabilityRegistry). This file is dead (never
// imported by any runtime path) and kept only as reference data. Do NOT
// extend it; add capabilities to `src/bos/capabilities/registry-data.ts`.
//
// Every business type has a measurable completeness score.
// No hardcoded templates — a universal catalog of expected capabilities
// per industry/domain, used by Prompt Fulfillment to score coverage.
// ─────────────────────────────────────────────────────────────────────────────

/** A single expected capability for an industry */
export interface IndustryCapability {
  /** Unique capability ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category */
  category: 'core' | 'engagement' | 'conversion' | 'support' | 'content';
  /** Priority: must-have, should-have, nice-to-have */
  priority: 'must' | 'should' | 'nice';
  /** Keywords for matching against prompt/requirements */
  keywords: string[];
  /** Which layer owns implementing this capability */
  owner: string;
}

/** Industry entry in the registry */
export interface IndustryEntry {
  /** Industry ID (e.g., 'restaurant', 'saas') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Parent domain (e.g., 'food', 'technology') */
  domain: string;
  /** Expected capabilities */
  capabilities: IndustryCapability[];
}

// ─── Registry Data ───────────────────────────────────────────────────────────

const INDUSTRIES: IndustryEntry[] = [
  {
    id: 'restaurant', name: 'Restaurant / Cafe', domain: 'food',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero', 'banner', 'landing'], owner: 'experience-intelligence' },
      { id: 'menu', name: 'Menu Display', category: 'core', priority: 'must', keywords: ['menu', 'food', 'dishes'], owner: 'application-blueprint' },
      { id: 'order', name: 'Online Ordering', category: 'conversion', priority: 'must', keywords: ['order', 'cart', 'checkout'], owner: 'application-blueprint' },
      { id: 'reservation', name: 'Table Reservation', category: 'core', priority: 'should', keywords: ['reservation', 'booking', 'table'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing Display', category: 'core', priority: 'must', keywords: ['price', 'pricing', 'cost'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Customer Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings', 'testimonials'], owner: 'content-intelligence' },
      { id: 'location', name: 'Location / Map', category: 'support', priority: 'should', keywords: ['location', 'address', 'map'], owner: 'application-blueprint' },
      { id: 'loyalty', name: 'Loyalty Program', category: 'engagement', priority: 'nice', keywords: ['loyalty', 'rewards', 'points'], owner: 'application-blueprint' },
      { id: 'nutrition', name: 'Nutrition Info', category: 'content', priority: 'nice', keywords: ['nutrition', 'calories', 'ingredients'], owner: 'content-intelligence' },
      { id: 'offers', name: 'Special Offers', category: 'conversion', priority: 'should', keywords: ['offers', 'deals', 'promotions', 'coupons'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'burger', name: 'Burger Restaurant', domain: 'food',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero', 'banner'], owner: 'experience-intelligence' },
      { id: 'menu', name: 'Burger Menu', category: 'core', priority: 'must', keywords: ['menu', 'burgers'], owner: 'application-blueprint' },
      { id: 'builder', name: 'Burger Builder', category: 'core', priority: 'must', keywords: ['builder', 'custom', 'build'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Real-time Pricing', category: 'core', priority: 'must', keywords: ['pricing', 'price', 'cost'], owner: 'application-blueprint' },
      { id: 'order', name: 'Online Ordering', category: 'conversion', priority: 'must', keywords: ['order', 'cart', 'checkout'], owner: 'application-blueprint' },
      { id: 'nutrition', name: 'Nutrition Info', category: 'content', priority: 'should', keywords: ['nutrition', 'calories'], owner: 'content-intelligence' },
      { id: 'reviews', name: 'Customer Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings'], owner: 'content-intelligence' },
      { id: 'location', name: 'Locations', category: 'support', priority: 'should', keywords: ['location', 'addresses'], owner: 'application-blueprint' },
      { id: 'loyalty', name: 'Loyalty Program', category: 'engagement', priority: 'nice', keywords: ['loyalty', 'rewards'], owner: 'application-blueprint' },
      { id: 'offers', name: 'Special Offers', category: 'conversion', priority: 'should', keywords: ['offers', 'deals'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'coffee', name: 'Coffee Shop', domain: 'food',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero', 'banner'], owner: 'experience-intelligence' },
      { id: 'menu', name: 'Coffee Menu', category: 'core', priority: 'must', keywords: ['menu', 'coffee', 'drinks'], owner: 'application-blueprint' },
      { id: 'order', name: 'Online Ordering', category: 'conversion', priority: 'must', keywords: ['order', 'cart'], owner: 'application-blueprint' },
      { id: 'loyalty', name: 'Loyalty Program', category: 'engagement', priority: 'must', keywords: ['loyalty', 'rewards', 'stamps'], owner: 'application-blueprint' },
      { id: 'location', name: 'Store Locations', category: 'support', priority: 'should', keywords: ['location', 'stores'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'luxury-perfume', name: 'Luxury Perfume', domain: 'fashion',
    capabilities: [
      { id: 'hero', name: 'Cinematic Hero', category: 'core', priority: 'must', keywords: ['hero', 'cinematic'], owner: 'experience-intelligence' },
      { id: 'products', name: 'Product Showcase', category: 'core', priority: 'must', keywords: ['products', 'collection', 'fragrances'], owner: 'application-blueprint' },
      { id: 'story', name: 'Brand Story', category: 'content', priority: 'must', keywords: ['story', 'heritage', 'brand'], owner: 'content-intelligence' },
      { id: 'shop', name: 'Shop / E-commerce', category: 'conversion', priority: 'must', keywords: ['shop', 'buy', 'cart'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
      { id: 'store-locator', name: 'Store Locator', category: 'support', priority: 'should', keywords: ['store', 'locator', 'find'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'dental', name: 'Dental Clinic', domain: 'healthcare',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'services', name: 'Services List', category: 'core', priority: 'must', keywords: ['services', 'treatments'], owner: 'application-blueprint' },
      { id: 'appointment', name: 'Appointment Booking', category: 'core', priority: 'must', keywords: ['appointment', 'booking'], owner: 'application-blueprint' },
      { id: 'doctors', name: 'Doctor Profiles', category: 'core', priority: 'should', keywords: ['doctors', 'team', 'dentists'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing / Insurance', category: 'support', priority: 'should', keywords: ['pricing', 'insurance'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Patient Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
      { id: 'contact', name: 'Contact / Map', category: 'support', priority: 'must', keywords: ['contact', 'map', 'location'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'gym', name: 'Gym / Fitness', domain: 'fitness',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'classes', name: 'Class Schedule', category: 'core', priority: 'must', keywords: ['classes', 'schedule', 'timetable'], owner: 'application-blueprint' },
      { id: 'membership', name: 'Membership Plans', category: 'conversion', priority: 'must', keywords: ['membership', 'plans', 'pricing'], owner: 'application-blueprint' },
      { id: 'trainers', name: 'Trainer Profiles', category: 'core', priority: 'should', keywords: ['trainers', 'coaches', 'team'], owner: 'application-blueprint' },
      { id: 'booking', name: 'Class Booking', category: 'core', priority: 'must', keywords: ['booking', 'register'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Testimonials', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'hotel', name: 'Hotel / Hospitality', domain: 'travel',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'rooms', name: 'Room Listings', category: 'core', priority: 'must', keywords: ['rooms', 'suites'], owner: 'application-blueprint' },
      { id: 'booking', name: 'Room Booking', category: 'conversion', priority: 'must', keywords: ['booking', 'reservation'], owner: 'application-blueprint' },
      { id: 'amenities', name: 'Amenities', category: 'content', priority: 'should', keywords: ['amenities', 'facilities'], owner: 'content-intelligence' },
      { id: 'gallery', name: 'Photo Gallery', category: 'engagement', priority: 'should', keywords: ['gallery', 'photos', 'images'], owner: 'experience-intelligence' },
      { id: 'reviews', name: 'Guest Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings'], owner: 'content-intelligence' },
      { id: 'location', name: 'Location / Map', category: 'support', priority: 'must', keywords: ['location', 'map', 'directions'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'real-estate', name: 'Real Estate', domain: 'property',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'listings', name: 'Property Listings', category: 'core', priority: 'must', keywords: ['listings', 'properties'], owner: 'application-blueprint' },
      { id: 'search', name: 'Property Search', category: 'core', priority: 'must', keywords: ['search', 'filter'], owner: 'application-blueprint' },
      { id: 'agents', name: 'Agent Profiles', category: 'core', priority: 'should', keywords: ['agents', 'brokers'], owner: 'application-blueprint' },
      { id: 'mortgage', name: 'Mortgage Calculator', category: 'conversion', priority: 'should', keywords: ['mortgage', 'calculator'], owner: 'application-blueprint' },
      { id: 'contact', name: 'Contact / Inquiry', category: 'conversion', priority: 'must', keywords: ['contact', 'inquiry'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'hospital', name: 'Hospital / Healthcare', domain: 'healthcare',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'departments', name: 'Departments', category: 'core', priority: 'must', keywords: ['departments', 'specialties'], owner: 'application-blueprint' },
      { id: 'doctors', name: 'Doctor Directory', category: 'core', priority: 'must', keywords: ['doctors', 'physicians'], owner: 'application-blueprint' },
      { id: 'appointment', name: 'Appointment Booking', category: 'conversion', priority: 'must', keywords: ['appointment', 'booking'], owner: 'application-blueprint' },
      { id: 'services', name: 'Services', category: 'core', priority: 'should', keywords: ['services', 'treatments'], owner: 'application-blueprint' },
      { id: 'emergency', name: 'Emergency Contact', category: 'support', priority: 'must', keywords: ['emergency', 'helpline'], owner: 'application-blueprint' },
      { id: 'insurance', name: 'Insurance Info', category: 'support', priority: 'should', keywords: ['insurance', 'coverage'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'school', name: 'School / University', domain: 'education',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'courses', name: 'Course Catalog', category: 'core', priority: 'must', keywords: ['courses', 'programs'], owner: 'application-blueprint' },
      { id: 'admissions', name: 'Admissions', category: 'conversion', priority: 'must', keywords: ['admissions', 'apply', 'enroll'], owner: 'application-blueprint' },
      { id: 'faculty', name: 'Faculty Directory', category: 'core', priority: 'should', keywords: ['faculty', 'teachers', 'professors'], owner: 'application-blueprint' },
      { id: 'campus', name: 'Campus Info', category: 'content', priority: 'should', keywords: ['campus', 'facilities'], owner: 'content-intelligence' },
      { id: 'events', name: 'Events', category: 'engagement', priority: 'should', keywords: ['events', 'calendar'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'law-firm', name: 'Law Firm', domain: 'legal',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'services', name: 'Practice Areas', category: 'core', priority: 'must', keywords: ['services', 'practice', 'areas'], owner: 'application-blueprint' },
      { id: 'attorneys', name: 'Attorney Profiles', category: 'core', priority: 'must', keywords: ['attorneys', 'lawyers', 'team'], owner: 'application-blueprint' },
      { id: 'consultation', name: 'Free Consultation', category: 'conversion', priority: 'must', keywords: ['consultation', 'contact'], owner: 'application-blueprint' },
      { id: 'cases', name: 'Case Results', category: 'content', priority: 'should', keywords: ['cases', 'results', 'verdicts'], owner: 'content-intelligence' },
      { id: 'blog', name: 'Legal Blog', category: 'content', priority: 'should', keywords: ['blog', 'articles', 'insights'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'insurance', name: 'Insurance', domain: 'finance',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'products', name: 'Insurance Products', category: 'core', priority: 'must', keywords: ['products', 'plans', 'policies'], owner: 'application-blueprint' },
      { id: 'quote', name: 'Get a Quote', category: 'conversion', priority: 'must', keywords: ['quote', 'calculator'], owner: 'application-blueprint' },
      { id: 'claims', name: 'Claims Portal', category: 'core', priority: 'must', keywords: ['claims', 'file claim'], owner: 'application-blueprint' },
      { id: 'agents', name: 'Agent Directory', category: 'support', priority: 'should', keywords: ['agents', 'advisors'], owner: 'application-blueprint' },
      { id: 'faq', name: 'FAQ / Resources', category: 'content', priority: 'should', keywords: ['faq', 'resources', 'guides'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'accounting', name: 'Accounting / CPA', domain: 'finance',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'services', name: 'Services', category: 'core', priority: 'must', keywords: ['services', 'tax', 'audit'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing / Plans', category: 'conversion', priority: 'must', keywords: ['pricing', 'plans'], owner: 'application-blueprint' },
      { id: 'team', name: 'Team / CPAs', category: 'core', priority: 'should', keywords: ['team', 'cpas', 'accountants'], owner: 'application-blueprint' },
      { id: 'contact', name: 'Contact / Consultation', category: 'conversion', priority: 'must', keywords: ['contact', 'consultation'], owner: 'application-blueprint' },
      { id: 'resources', name: 'Resources / Blog', category: 'content', priority: 'should', keywords: ['resources', 'blog', 'articles'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'logistics', name: 'Logistics / Shipping', domain: 'logistics',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'tracking', name: 'Shipment Tracking', category: 'core', priority: 'must', keywords: ['tracking', 'track'], owner: 'application-blueprint' },
      { id: 'quote', name: 'Get a Quote', category: 'conversion', priority: 'must', keywords: ['quote', 'estimate'], owner: 'application-blueprint' },
      { id: 'fleet', name: 'Fleet Management', category: 'core', priority: 'should', keywords: ['fleet', 'vehicles'], owner: 'application-blueprint' },
      { id: 'dashboard', name: 'Dashboard', category: 'core', priority: 'should', keywords: ['dashboard', 'analytics'], owner: 'application-blueprint' },
      { id: 'contact', name: 'Contact / Support', category: 'support', priority: 'must', keywords: ['contact', 'support'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'car-dealership', name: 'Car Dealership', domain: 'automotive',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'inventory', name: 'Vehicle Inventory', category: 'core', priority: 'must', keywords: ['inventory', 'vehicles', 'cars'], owner: 'application-blueprint' },
      { id: 'search', name: 'Vehicle Search', category: 'core', priority: 'must', keywords: ['search', 'filter'], owner: 'application-blueprint' },
      { id: 'financing', name: 'Financing Calculator', category: 'conversion', priority: 'should', keywords: ['financing', 'calculator', 'loan'], owner: 'application-blueprint' },
      { id: 'test-drive', name: 'Book Test Drive', category: 'conversion', priority: 'must', keywords: ['test drive', 'book'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Customer Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'ev-company', name: 'EV Company', domain: 'automotive',
    capabilities: [
      { id: 'hero', name: 'Cinematic Hero', category: 'core', priority: 'must', keywords: ['hero', 'cinematic'], owner: 'experience-intelligence' },
      { id: 'models', name: 'Vehicle Models', category: 'core', priority: 'must', keywords: ['models', 'vehicles'], owner: 'application-blueprint' },
      { id: 'configurator', name: 'Vehicle Configurator', category: 'core', priority: 'must', keywords: ['configurator', 'build', 'customize'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing / Financing', category: 'conversion', priority: 'must', keywords: ['pricing', 'financing'], owner: 'application-blueprint' },
      { id: 'charging', name: 'Charging Network', category: 'support', priority: 'should', keywords: ['charging', 'stations', 'network'], owner: 'application-blueprint' },
      { id: 'test-drive', name: 'Book Test Drive', category: 'conversion', priority: 'must', keywords: ['test drive', 'book'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'saas', name: 'SaaS / Software', domain: 'technology',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'features', name: 'Features', category: 'core', priority: 'must', keywords: ['features', 'capabilities'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing Plans', category: 'conversion', priority: 'must', keywords: ['pricing', 'plans'], owner: 'application-blueprint' },
      { id: 'demo', name: 'Demo / Trial', category: 'conversion', priority: 'must', keywords: ['demo', 'trial', 'signup'], owner: 'application-blueprint' },
      { id: 'docs', name: 'Documentation', category: 'content', priority: 'should', keywords: ['docs', 'documentation', 'guides'], owner: 'content-intelligence' },
      { id: 'integrations', name: 'Integrations', category: 'support', priority: 'should', keywords: ['integrations', 'connect'], owner: 'application-blueprint' },
      { id: 'changelog', name: 'Changelog', category: 'content', priority: 'nice', keywords: ['changelog', 'updates'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'erp', name: 'ERP System', domain: 'technology',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'dashboard', name: 'Dashboard', category: 'core', priority: 'must', keywords: ['dashboard', 'overview'], owner: 'application-blueprint' },
      { id: 'modules', name: 'ERP Modules', category: 'core', priority: 'must', keywords: ['modules', 'finance', 'hr', 'inventory'], owner: 'application-blueprint' },
      { id: 'reporting', name: 'Reporting', category: 'core', priority: 'must', keywords: ['reports', 'analytics'], owner: 'application-blueprint' },
      { id: 'settings', name: 'Settings / Config', category: 'support', priority: 'should', keywords: ['settings', 'configuration'], owner: 'application-blueprint' },
      { id: 'users', name: 'User Management', category: 'core', priority: 'must', keywords: ['users', 'roles', 'permissions'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'marketplace', name: 'Marketplace', domain: 'ecommerce',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'listings', name: 'Product Listings', category: 'core', priority: 'must', keywords: ['listings', 'products'], owner: 'application-blueprint' },
      { id: 'search', name: 'Search & Filter', category: 'core', priority: 'must', keywords: ['search', 'filter'], owner: 'application-blueprint' },
      { id: 'cart', name: 'Shopping Cart', category: 'conversion', priority: 'must', keywords: ['cart', 'checkout'], owner: 'application-blueprint' },
      { id: 'seller', name: 'Seller Portal', category: 'core', priority: 'should', keywords: ['seller', 'vendor'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Reviews & Ratings', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'ai-startup', name: 'AI Startup', domain: 'technology',
    capabilities: [
      { id: 'hero', name: 'Cinematic Hero', category: 'core', priority: 'must', keywords: ['hero', 'cinematic'], owner: 'experience-intelligence' },
      { id: 'features', name: 'Product Features', category: 'core', priority: 'must', keywords: ['features', 'capabilities'], owner: 'application-blueprint' },
      { id: 'demo', name: 'Live Demo', category: 'conversion', priority: 'must', keywords: ['demo', 'try', 'interactive'], owner: 'application-blueprint' },
      { id: 'pricing', name: 'Pricing', category: 'conversion', priority: 'must', keywords: ['pricing', 'plans'], owner: 'application-blueprint' },
      { id: 'docs', name: 'Documentation', category: 'content', priority: 'should', keywords: ['docs', 'api', 'guides'], owner: 'content-intelligence' },
      { id: 'blog', name: 'Blog / Research', category: 'content', priority: 'should', keywords: ['blog', 'research', 'articles'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'manufacturing', name: 'Manufacturing', domain: 'industrial',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'products', name: 'Product Catalog', category: 'core', priority: 'must', keywords: ['products', 'catalog'], owner: 'application-blueprint' },
      { id: 'quote', name: 'Request a Quote', category: 'conversion', priority: 'must', keywords: ['quote', 'inquiry'], owner: 'application-blueprint' },
      { id: 'capabilities', name: 'Manufacturing Capabilities', category: 'content', priority: 'should', keywords: ['capabilities', 'processes'], owner: 'content-intelligence' },
      { id: 'quality', name: 'Quality Certifications', category: 'content', priority: 'should', keywords: ['quality', 'certifications', 'iso'], owner: 'content-intelligence' },
      { id: 'contact', name: 'Contact / Support', category: 'support', priority: 'must', keywords: ['contact', 'support'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'ngo', name: 'NGO / Nonprofit', domain: 'nonprofit',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'mission', name: 'Mission / Impact', category: 'content', priority: 'must', keywords: ['mission', 'impact', 'cause'], owner: 'content-intelligence' },
      { id: 'donate', name: 'Donation Portal', category: 'conversion', priority: 'must', keywords: ['donate', 'donation'], owner: 'application-blueprint' },
      { id: 'campaigns', name: 'Campaigns', category: 'core', priority: 'should', keywords: ['campaigns', 'projects'], owner: 'application-blueprint' },
      { id: 'volunteer', name: 'Volunteer Signup', category: 'conversion', priority: 'should', keywords: ['volunteer', 'signup'], owner: 'application-blueprint' },
      { id: 'stories', name: 'Success Stories', category: 'content', priority: 'should', keywords: ['stories', 'testimonials'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'government', name: 'Government Portal', domain: 'government',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'services', name: 'Public Services', category: 'core', priority: 'must', keywords: ['services', 'departments'], owner: 'application-blueprint' },
      { id: 'forms', name: 'Online Forms', category: 'core', priority: 'must', keywords: ['forms', 'applications'], owner: 'application-blueprint' },
      { id: 'schemes', name: 'Schemes / Programs', category: 'content', priority: 'should', keywords: ['schemes', 'programs'], owner: 'content-intelligence' },
      { id: 'grievance', name: 'Grievance Portal', category: 'support', priority: 'should', keywords: ['grievance', 'complaint'], owner: 'application-blueprint' },
      { id: 'contact', name: 'Contact Directory', category: 'support', priority: 'must', keywords: ['contact', 'directory'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'fashion', name: 'Fashion Brand', domain: 'fashion',
    capabilities: [
      { id: 'hero', name: 'Cinematic Hero', category: 'core', priority: 'must', keywords: ['hero', 'cinematic'], owner: 'experience-intelligence' },
      { id: 'collection', name: 'Collection Showcase', category: 'core', priority: 'must', keywords: ['collection', 'products'], owner: 'application-blueprint' },
      { id: 'shop', name: 'Shop / E-commerce', category: 'conversion', priority: 'must', keywords: ['shop', 'buy', 'cart'], owner: 'application-blueprint' },
      { id: 'story', name: 'Brand Story', category: 'content', priority: 'should', keywords: ['story', 'brand', 'heritage'], owner: 'content-intelligence' },
      { id: 'lookbook', name: 'Lookbook', category: 'engagement', priority: 'should', keywords: ['lookbook', 'gallery'], owner: 'experience-intelligence' },
      { id: 'store-locator', name: 'Store Locator', category: 'support', priority: 'should', keywords: ['store', 'locator'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'cosmetics', name: 'Cosmetics / Beauty', domain: 'fashion',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'products', name: 'Product Catalog', category: 'core', priority: 'must', keywords: ['products', 'catalog'], owner: 'application-blueprint' },
      { id: 'shop', name: 'Shop / E-commerce', category: 'conversion', priority: 'must', keywords: ['shop', 'buy'], owner: 'application-blueprint' },
      { id: 'ingredients', name: 'Ingredients Info', category: 'content', priority: 'should', keywords: ['ingredients', 'formulas'], owner: 'content-intelligence' },
      { id: 'reviews', name: 'Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'ratings'], owner: 'content-intelligence' },
      { id: 'store-locator', name: 'Store Locator', category: 'support', priority: 'should', keywords: ['store', 'locator'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'furniture', name: 'Furniture Store', domain: 'interior',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'catalog', name: 'Product Catalog', category: 'core', priority: 'must', keywords: ['catalog', 'products'], owner: 'application-blueprint' },
      { id: 'configurator', name: 'Room Configurator', category: 'core', priority: 'should', keywords: ['configurator', 'room', 'design'], owner: 'application-blueprint' },
      { id: 'shop', name: 'Shop / E-commerce', category: 'conversion', priority: 'must', keywords: ['shop', 'buy', 'cart'], owner: 'application-blueprint' },
      { id: 'inspiration', name: 'Design Inspiration', category: 'content', priority: 'should', keywords: ['inspiration', 'ideas'], owner: 'content-intelligence' },
      { id: 'store-locator', name: 'Store Locator', category: 'support', priority: 'should', keywords: ['store', 'showroom'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'interior-design', name: 'Interior Design Studio', domain: 'interior',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'portfolio', name: 'Portfolio', category: 'core', priority: 'must', keywords: ['portfolio', 'projects'], owner: 'application-blueprint' },
      { id: 'services', name: 'Services', category: 'core', priority: 'must', keywords: ['services', 'offerings'], owner: 'application-blueprint' },
      { id: 'consultation', name: 'Book Consultation', category: 'conversion', priority: 'must', keywords: ['consultation', 'book'], owner: 'application-blueprint' },
      { id: 'team', name: 'Team / Designers', category: 'core', priority: 'should', keywords: ['team', 'designers'], owner: 'application-blueprint' },
      { id: 'testimonials', name: 'Client Testimonials', category: 'engagement', priority: 'should', keywords: ['testimonials', 'reviews'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'architecture', name: 'Architecture Studio', domain: 'interior',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'projects', name: 'Project Showcase', category: 'core', priority: 'must', keywords: ['projects', 'portfolio'], owner: 'application-blueprint' },
      { id: 'services', name: 'Services', category: 'core', priority: 'must', keywords: ['services', 'offerings'], owner: 'application-blueprint' },
      { id: 'team', name: 'Team / Architects', category: 'core', priority: 'should', keywords: ['team', 'architects'], owner: 'application-blueprint' },
      { id: 'contact', name: 'Contact / Inquiry', category: 'conversion', priority: 'must', keywords: ['contact', 'inquiry'], owner: 'application-blueprint' },
      { id: 'awards', name: 'Awards / Recognition', category: 'content', priority: 'nice', keywords: ['awards', 'recognition'], owner: 'content-intelligence' },
    ],
  },
  {
    id: 'travel', name: 'Travel Agency', domain: 'travel',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'packages', name: 'Travel Packages', category: 'core', priority: 'must', keywords: ['packages', 'tours'], owner: 'application-blueprint' },
      { id: 'booking', name: 'Booking System', category: 'conversion', priority: 'must', keywords: ['booking', 'reserve'], owner: 'application-blueprint' },
      { id: 'destinations', name: 'Destinations', category: 'content', priority: 'should', keywords: ['destinations', 'places'], owner: 'content-intelligence' },
      { id: 'reviews', name: 'Traveler Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
      { id: 'contact', name: 'Contact / Support', category: 'support', priority: 'must', keywords: ['contact', 'support'], owner: 'application-blueprint' },
    ],
  },
  {
    id: 'event', name: 'Event Company', domain: 'travel',
    capabilities: [
      { id: 'hero', name: 'Hero Section', category: 'core', priority: 'must', keywords: ['hero'], owner: 'experience-intelligence' },
      { id: 'events', name: 'Event Listings', category: 'core', priority: 'must', keywords: ['events', 'listings'], owner: 'application-blueprint' },
      { id: 'ticketing', name: 'Ticket Sales', category: 'conversion', priority: 'must', keywords: ['tickets', 'ticketing'], owner: 'application-blueprint' },
      { id: 'portfolio', name: 'Past Events', category: 'content', priority: 'should', keywords: ['portfolio', 'past events'], owner: 'content-intelligence' },
      { id: 'contact', name: 'Contact / Inquiry', category: 'conversion', priority: 'must', keywords: ['contact', 'inquiry'], owner: 'application-blueprint' },
      { id: 'reviews', name: 'Client Reviews', category: 'engagement', priority: 'should', keywords: ['reviews', 'testimonials'], owner: 'content-intelligence' },
    ],
  },
];

// ─── Registry API ────────────────────────────────────────────────────────────

export class CapabilityRegistry {
  private industries: Map<string, IndustryEntry>;

  constructor() {
    this.industries = new Map(INDUSTRIES.map(i => [i.id, i]));
  }

  /** Get an industry by ID */
  get(id: string): IndustryEntry | undefined {
    return this.industries.get(id);
  }

  /** Get all industries */
  getAll(): IndustryEntry[] {
    return [...this.industries.values()];
  }

  /** Search industries by keyword in name/id/domain */
  search(query: string): IndustryEntry[] {
    const q = query.toLowerCase();
    return [...this.industries.values()].filter(
      i => i.id.includes(q) || i.name.toLowerCase().includes(q) || i.domain.includes(q),
    );
  }

  /** Compute coverage score for a set of fulfilled capability IDs */
  coverageScore(industryId: string, fulfilledIds: string[]): {
    score: number;         // 0-1
    total: number;
    fulfilled: number;
    missing: IndustryCapability[];
    covered: IndustryCapability[];
  } {
    const industry = this.industries.get(industryId);
    if (!industry) {
      return { score: 0, total: 0, fulfilled: 0, missing: [], covered: [] };
    }

    const fulfilledSet = new Set(fulfilledIds);
    const covered = industry.capabilities.filter(c => fulfilledSet.has(c.id));
    const missing = industry.capabilities.filter(c => !fulfilledSet.has(c.id));

    // Weighted score: must=3, should=2, nice=1
    const weights = { must: 3, should: 2, nice: 1 };
    const totalWeight = industry.capabilities.reduce((s, c) => s + weights[c.priority], 0);
    const coveredWeight = covered.reduce((s, c) => s + weights[c.priority], 0);

    return {
      score: totalWeight > 0 ? coveredWeight / totalWeight : 0,
      total: industry.capabilities.length,
      fulfilled: covered.length,
      missing,
      covered,
    };
  }

  /** Get expected capabilities for an industry */
  getCapabilities(industryId: string): IndustryCapability[] {
    return this.industries.get(industryId)?.capabilities ?? [];
  }

  /** Get all unique owners across all industries */
  getOwners(): string[] {
    const owners = new Set<string>();
    for (const i of this.industries.values()) {
      for (const c of i.capabilities) owners.add(c.owner);
    }
    return [...owners];
  }
}

/** Singleton for production use */
export const capabilityRegistry = new CapabilityRegistry();
