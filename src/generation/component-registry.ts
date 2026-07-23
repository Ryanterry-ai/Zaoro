/**
 * Component Registry — maps business primitives to the exact components
 * a website needs. No hardcoded industry catalogs. Pure primitive reasoning.
 *
 * Given: { valueObject, transactionType, contentShape, aestheticSignals, emotionalIntent }
 * Returns: ordered list of components with props, reasons, and content instructions.
 */

import type { BusinessPrimitives } from './primitive-extractor.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComponentEntry {
  /** PascalCase component name (e.g., SoundwaveHero, AppointmentBooking) */
  name: string;
  /** Component category for template selection */
  category: 'hero' | 'showcase' | 'content' | 'conversion' | 'navigation' | 'footer' | 'specialized';
  /** Why this component is included (shown in agent-task.md) */
  reason: string;
  /** Default props */
  props: Record<string, string>;
  /** Content hints for the agent */
  contentHints: string[];
}

export interface IndustryVocabulary {
  /** Words to USE (industry-specific terms) */
  use: string[];
  /** Words to AVOID (generic filler) */
  avoid: string[];
  /** Example CTAs for this industry */
  ctas: string[];
  /** Example feature names */
  features: string[];
  /** Example testimonial roles */
  roles: string[];
}

// ─── Component Registry ───────────────────────────────────────────────────────

/**
 * Core components that EVERY website gets regardless of industry.
 */
function getCoreComponents(primitives: BusinessPrimitives): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  // Hero — always present, variant depends on signals
  const hasAnimatedVisual = primitives.aestheticSignals.some(s =>
    ['animated-visual', 'scroll-motion', 'electric-blue', 'gradient-mesh'].includes(s)
  );

  if (hasAnimatedVisual) {
    components.push({
      name: 'SoundwaveHero',
      category: 'hero',
      reason: 'aestheticSignals includes animated/immersive element',
      props: { title: '', subtitle: '', cta: '' },
      contentHints: ['SVG morph animation', 'scroll-driven', 'Framer Motion useTransform'],
    });
  } else {
    components.push({
      name: 'HeroBanner',
      category: 'hero',
      reason: 'standard hero for landing page',
      props: { title: '', subtitle: '', cta: '' },
      contentHints: ['clear value proposition', 'single CTA', 'background image or gradient'],
    });
  }

  // CTA — always present
  components.push({
    name: 'CTASection',
    category: 'conversion',
    reason: 'standard conversion element',
    props: { variant: 'centered' },
    contentHints: ['action-oriented headline', 'single button', 'urgency or value'],
  });

  // Footer — always present
  components.push({
    name: 'GlobalFooter',
    category: 'footer',
    reason: 'standard footer',
    props: {},
    contentHints: ['copyright', 'links', 'social media'],
  });

  return components;
}

/**
 * Transaction-based components — what the business sells determines what components it needs.
 */
function getTransactionComponents(primitives: BusinessPrimitives): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  switch (primitives.transactionType) {
    case 'product-purchase':
      components.push({
        name: 'ProductShowcase',
        category: 'showcase',
        reason: 'transactionType is product-purchase — show products with specs and pricing',
        props: { columns: '3', gap: '8' },
        contentHints: ['product cards with images', 'prices in ' + (primitives.currency ?? 'USD'), 'specs table', 'add to cart button'],
      });
      if (primitives.contentShape.includes('specs-table')) {
        components.push({
          name: 'SpecsTable',
          category: 'content',
          reason: 'contentShape includes specs-table — detailed product specifications',
          props: { variant: 'detailed' },
          contentHints: ['technical specifications', 'comparison rows', 'highlight key specs'],
        });
      }
      if (primitives.contentShape.includes('image-gallery')) {
        components.push({
          name: 'GallerySection',
          category: 'content',
          reason: 'contentShape includes image-gallery — product images',
          props: { columns: '3', lightbox: 'true' },
          contentHints: ['product photos', 'lifestyle shots', 'close-up details'],
        });
      }
      break;

    case 'service-booking':
      components.push({
        name: 'ServiceMenu',
        category: 'specialized',
        reason: 'transactionType is service-booking — list services with prices and durations',
        props: { variant: 'cards' },
        contentHints: ['service names', 'durations', 'prices', 'descriptions'],
      });
      components.push({
        name: 'AppointmentBooking',
        category: 'specialized',
        reason: 'transactionType is service-booking — calendar with time slots',
        props: { variant: 'inline' },
        contentHints: ['available dates', 'time slots', 'service selection', 'staff selection'],
      });
      if (primitives.contentShape.includes('team-profiles')) {
        components.push({
          name: 'TeamGrid',
          category: 'content',
          reason: 'contentShape includes team-profiles — staff/team members',
          props: { columns: '3', showBio: 'true' },
          contentHints: ['professional photos', 'names', 'titles', 'specialties', 'bios'],
        });
      }
      if (primitives.contentShape.includes('schedule-times')) {
        components.push({
          name: 'ScheduleGrid',
          category: 'specialized',
          reason: 'contentShape includes schedule-times — weekly availability',
          props: { columns: '7', timeSlot: '30' },
          contentHints: ['days of week', 'time slots', 'bookable slots'],
        });
      }
      break;

    case 'subscription':
      components.push({
        name: 'PricingTable',
        category: 'conversion',
        reason: 'transactionType is subscription — pricing tiers',
        props: { columns: '3', highlight: 'middle' },
        contentHints: ['3 tiers', 'feature comparison', 'monthly/annual toggle', 'highlight recommended'],
      });
      components.push({
        name: 'FeatureGrid',
        category: 'content',
        reason: 'subscription needs feature comparison',
        props: { columns: '3', gap: '8' },
        contentHints: ['feature names', 'descriptions', 'icons', 'checkmarks'],
      });
      break;

    case 'lead-capture':
      components.push({
        name: 'ContactForm',
        category: 'conversion',
        reason: 'transactionType is lead-capture — capture leads',
        props: { variant: 'full' },
        contentHints: ['name', 'email', 'phone', 'message', 'submit button'],
      });
      components.push({
        name: 'TrustBadges',
        category: 'content',
        reason: 'lead-capture needs trust signals',
        props: { count: '3' },
        contentHints: ['certifications', 'awards', 'client logos', 'years in business'],
      });
      break;

    case 'marketplace':
      components.push({
        name: 'ProductGrid',
        category: 'showcase',
        reason: 'transactionType is marketplace — multi-vendor product grid',
        props: { columns: '3', gap: '8' },
        contentHints: ['product cards', 'vendor names', 'prices', 'ratings'],
      });
      components.push({
        name: 'VendorSpotlight',
        category: 'specialized',
        reason: 'marketplace needs vendor highlighting',
        props: { variant: 'carousel' },
        contentHints: ['vendor logos', 'specialties', 'ratings', 'product count'],
      });
      break;

    case 'community':
      components.push({
        name: 'FeatureGrid',
        category: 'content',
        reason: 'community needs feature highlights',
        props: { columns: '3', gap: '8' },
        contentHints: ['community features', 'member benefits', 'engagement tools'],
      });
      components.push({
        name: 'StatsSection',
        category: 'content',
        reason: 'community needs social proof',
        props: { variant: 'horizontal' },
        contentHints: ['member count', 'posts per day', 'engagement rate'],
      });
      break;

    case 'information':
      components.push({
        name: 'FeatureGrid',
        category: 'content',
        reason: 'information site needs content sections',
        props: { columns: '3', gap: '8' },
        contentHints: ['content categories', 'article previews', 'resource types'],
      });
      components.push({
        name: 'NewsletterSignup',
        category: 'conversion',
        reason: 'information site needs subscriber capture',
        props: { variant: 'inline' },
        contentHints: ['email input', 'subscribe button', 'value proposition'],
      });
      break;
  }

  return components;
}

/**
 * Content-shape based components — what the business needs to display.
 */
function getContentComponents(primitives: BusinessPrimitives): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  if (primitives.contentShape.includes('reviews')) {
    components.push({
      name: 'TestimonialCarousel',
      category: 'content',
      reason: 'contentShape includes reviews — customer testimonials',
      props: { items: '5' },
      contentHints: ['customer quotes', 'names', 'roles', 'ratings', 'photos'],
    });
  }

  if (primitives.contentShape.includes('pricing-table')) {
    components.push({
      name: 'PricingTable',
      category: 'conversion',
      reason: 'contentShape includes pricing-table — pricing tiers',
      props: { columns: '3', highlight: 'middle' },
      contentHints: ['tier names', 'prices', 'feature lists', 'CTA buttons'],
    });
  }

  if (primitives.contentShape.includes('location-map')) {
    components.push({
      name: 'LocationMap',
      category: 'specialized',
      reason: 'contentShape includes location-map — business locations',
      props: { zoom: '14' },
      contentHints: ['address', 'phone', 'hours', 'embedded map'],
    });
  }

  if (primitives.contentShape.includes('dashboard')) {
    components.push({
      name: 'DashboardPreview',
      category: 'specialized',
      reason: 'contentShape includes dashboard — product preview',
      props: { variant: 'mockup' },
      contentHints: ['screenshot', 'feature callouts', 'UI highlights'],
    });
  }

  if (primitives.contentShape.includes('form')) {
    components.push({
      name: 'ContactForm',
      category: 'conversion',
      reason: 'contentShape includes form — contact/inquiry form',
      props: { variant: 'full' },
      contentHints: ['relevant fields', 'validation', 'submit action'],
    });
  }

  return components;
}

/**
 * Aesthetic-based components — visual flourishes based on design signals.
 */
function getAestheticComponents(primitives: BusinessPrimitives): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  if (primitives.aestheticSignals.includes('image-gallery') ||
      primitives.aestheticSignals.some(s => ['premium', 'luxury'].includes(s))) {
    components.push({
      name: 'GallerySection',
      category: 'content',
      reason: 'aestheticSignals suggests visual showcase',
      props: { columns: '3', lightbox: 'true' },
      contentHints: ['high-quality images', 'lifestyle shots', 'product details'],
    });
  }

  if (primitives.aestheticSignals.includes('glassmorphism')) {
    components.push({
      name: 'FeatureGrid',
      category: 'content',
      reason: 'aestheticSignals includes glassmorphism — glass card design',
      props: { columns: '3', variant: 'glass' },
      contentHints: ['frosted glass cards', 'backdrop-blur', 'subtle borders'],
    });
  }

  return components;
}

// ─── Industry Vocabulary ──────────────────────────────────────────────────────

const INDUSTRY_VOCABULARY: Record<string, IndustryVocabulary> = {
  // ─── Home Services ────────────────────────────────────────────────
  'plumber': {
    use: ['pipe repair', 'drain cleaning', 'water heater', 'leak detection', 'sewer line', 'fixture installation', 'emergency service'],
    avoid: ['solutions', 'services', 'features', 'products'],
    ctas: ['Schedule Repair', 'Get Free Quote', 'Call Now', 'Book Service'],
    features: ['24/7 Emergency Service', 'Free Estimates', 'Licensed & Insured', 'Same-Day Service'],
    roles: ['Homeowner', 'Property Manager', 'Business Owner'],
  },
  'electrician': {
    use: ['wiring', 'panel upgrade', 'circuit breaker', 'outlet installation', 'lighting design', 'generator install', 'EV charger'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Get Estimate', 'Schedule Service', 'Call Now', 'Book electrician'],
    features: ['Licensed Electrician', 'Free Inspections', 'Emergency Service', 'Code Compliance'],
    roles: ['Homeowner', 'Contractor', 'Business Owner'],
  },
  'hvac': {
    use: ['air conditioning', 'furnace', 'heat pump', 'duct cleaning', 'thermostat', 'AC repair', 'furnace install'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Schedule Service', 'Get Quote', 'Call Now', 'Book HVAC'],
    features: ['Same-Day Service', 'Free Estimates', '24/7 Emergency', 'Maintenance Plans'],
    roles: ['Homeowner', 'Property Manager', 'Business Owner'],
  },
  'landscaping': {
    use: ['lawn care', 'landscape design', 'tree trimming', 'irrigation', 'hardscaping', 'mulching', 'snow removal'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Get Free Quote', 'Schedule Service', 'Book Consultation', 'Call Now'],
    features: ['Free Estimates', 'Licensed & Insured', 'Seasonal Programs', 'Eco-Friendly'],
    roles: ['Homeowner', 'Property Manager', 'HOA'],
  },
  'cleaning': {
    use: ['house cleaning', 'deep clean', 'move-in/out', 'office cleaning', 'carpet cleaning', 'window cleaning', 'sanitize'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Cleaning', 'Get Quote', 'Schedule Now', 'Call Today'],
    features: ['Eco-Friendly Products', 'Insured & Bonded', 'Same-Day Service', 'Satisfaction Guarantee'],
    roles: ['Homeowner', 'Tenant', 'Office Manager'],
  },

  // ─── Health & Wellness ────────────────────────────────────────────
  'dentist': {
    use: ['dental implant', 'teeth whitening', 'root canal', 'crown', 'filling', 'cleaning', 'orthodontics', ' veneer'],
    avoid: ['solutions', 'services', 'features', 'products'],
    ctas: ['Book Appointment', 'Schedule Consultation', 'Call Now', 'Request Appointment'],
    features: ['Accepting New Patients', 'Insurance Accepted', 'Sedation Dentistry', 'Same-Day Crowns'],
    roles: ['Patient', 'Parent', 'New Patient'],
  },
  'chiropractor': {
    use: ['spinal adjustment', 'back pain', 'neck pain', 'sciatica', 'headache', 'posture', 'wellness plan'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Appointment', 'Schedule Visit', 'Call Now', 'Request Consultation'],
    features: ['New Patient Special', 'Accepting New Patients', 'Insurance Accepted', 'Same-Day Appointments'],
    roles: ['Patient', 'Athlete', 'Office Worker'],
  },
  'physical-therapy': {
    use: ['rehabilitation', 'mobility', 'strength training', 'manual therapy', 'sports injury', 'post-surgery', 'balance'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Evaluation', 'Schedule Session', 'Call Now', 'Request Appointment'],
    features: ['Insurance Accepted', 'One-on-One Care', 'Home Exercise Programs', 'Sports Rehabilitation'],
    roles: ['Patient', 'Athlete', 'Post-Surgery'],
  },
  'mental-health': {
    use: ['therapy', 'counseling', 'anxiety', 'depression', 'trauma', 'CBT', 'mindfulness', 'EMDR'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Session', 'Schedule Consultation', 'Call Now', 'Request Appointment'],
    features: ['Accepting New Clients', 'Telehealth Available', 'Insurance Accepted', 'Sliding Scale'],
    roles: ['Client', 'Individual', 'Couple', 'Family'],
  },

  // ─── Auto & Transport ────────────────────────────────────────────
  'auto-repair': {
    use: ['oil change', 'brake repair', 'engine diagnostics', 'transmission', 'tire rotation', 'alignment', 'AC repair'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Schedule Service', 'Get Estimate', 'Book Appointment', 'Call Now'],
    features: ['ASE Certified', 'Free Diagnostics', 'Same-Day Service', 'Warranty Included'],
    roles: ['Vehicle Owner', 'Fleet Manager'],
  },
  'car-dealer': {
    use: ['new cars', 'used cars', 'financing', 'trade-in', 'test drive', 'inventory', 'certified pre-owned'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Browse Inventory', 'Schedule Test Drive', 'Get Financing', 'Value Trade-In'],
    features: ['Financing Available', 'Trade-In Program', 'Certified Pre-Owned', 'Warranty Coverage'],
    roles: ['Buyer', 'First-Time Buyer', 'Fleet Buyer'],
  },

  // ─── Food & Beverage ─────────────────────────────────────────────
  'bakery': {
    use: ['custom cakes', 'pastries', 'bread', 'wedding cakes', 'cookies', 'catering', 'fresh baked'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Order Now', 'View Menu', 'Place Order', 'Call Now'],
    features: ['Custom Orders', 'Same-Day Pickup', 'Catering Available', 'Fresh Daily'],
    roles: ['Customer', 'Event Planner', 'Wedding Client'],
  },
  'coffee-shop': {
    use: ['espresso', 'latte', 'cold brew', 'specialty drinks', 'pastries', 'beans', 'roasting'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['View Menu', 'Order Online', 'Find Us', 'Join Rewards'],
    features: ['Loyalty Program', 'Mobile Ordering', 'Local Roasting', 'Wifi Available'],
    roles: ['Customer', 'Coffee Lover', 'Remote Worker'],
  },
  'food-truck': {
    use: ['street food', 'food truck', 'catering', 'events', 'menu', 'location', 'schedule'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['View Menu', 'Find Us Today', 'Book for Event', 'Order Now'],
    features: ['Daily Locations', 'Event Catering', 'Mobile Ordering', 'Seasonal Menu'],
    roles: ['Customer', 'Event Organizer', 'Corporate Client'],
  },

  // ─── Professional Services ────────────────────────────────────────
  'accountant': {
    use: ['tax preparation', 'bookkeeping', 'audit', 'payroll', 'tax planning', 'IRS', 'financial statement'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Schedule Consultation', 'Get Quote', 'Call Now', 'Request Appointment'],
    features: ['Free Consultation', 'Certified Public Accountant', 'Year-Round Service', 'IRS Representation'],
    roles: ['Individual', 'Small Business', 'Corporation'],
  },
  'lawyer': {
    use: ['legal consultation', 'case evaluation', 'litigation', 'settlement', 'contract review', 'representation'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Free Consultation', 'Call Now', 'Schedule Consultation', 'Case Evaluation'],
    features: ['Free Initial Consultation', 'Contingency Fee', 'Proven Track Record', 'Client-Focused'],
    roles: ['Individual', 'Business Owner', 'Injured Party'],
  },
  'real-estate-agent': {
    use: ['homes for sale', 'listings', 'open house', 'property search', 'market analysis', 'buyer agent', 'seller agent'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Search Listings', 'Schedule Viewing', 'Get Market Report', 'List Your Home'],
    features: ['Free Market Analysis', 'Local Expertise', 'Staging Services', 'Negotiation Skills'],
    roles: ['Buyer', 'Seller', 'Investor'],
  },
  'insurance-agent': {
    use: ['auto insurance', 'home insurance', 'life insurance', 'health insurance', 'coverage', 'quote', 'policy'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Get Quote', 'Compare Plans', 'Call Now', 'Request Consultation'],
    features: ['Free Quotes', 'Multiple Carriers', 'Claims Assistance', 'Bundle Discounts'],
    roles: ['Individual', 'Family', 'Business Owner'],
  },

  // ─── Education ───────────────────────────────────────────────────
  'tutoring': {
    use: ['math tutoring', 'SAT prep', 'ACT prep', 'homework help', 'test prep', 'academic coaching'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Schedule Session', 'Get Started', 'Book Tutor', 'Free Assessment'],
    features: ['Free Assessment', 'Personalized Plans', 'All Subjects', 'Online & In-Person'],
    roles: ['Student', 'Parent', 'Adult Learner'],
  },
  'music-school': {
    use: ['piano lessons', 'guitar lessons', 'music theory', 'voice lessons', 'instrument', 'recital', 'ensemble'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Lesson', 'Schedule Trial', 'View Schedule', 'Call Now'],
    features: ['Free Trial Lesson', 'All Ages', 'All Skill Levels', 'Recital Opportunities'],
    roles: ['Student', 'Parent', 'Adult Learner'],
  },

  // ─── Events & Entertainment ──────────────────────────────────────
  'wedding-photographer': {
    use: ['wedding photography', 'engagement session', 'bridal portrait', 'reception', 'ceremony', 'candid', 'editorial'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Check Availability', 'View Portfolio', 'Book Consultation', 'Inquire Now'],
    features: ['Second Shooter Included', 'Online Gallery', 'Print Release', 'Engagement Session'],
    roles: ['Bride', 'Groom', 'Wedding Planner'],
  },
  'dj-event': {
    use: ['DJ services', 'wedding DJ', 'event DJ', 'sound system', 'lighting', 'MC services', 'dance floor'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Check Availability', 'Get Quote', 'Book Now', 'Call Today'],
    features: ['Free Consultation', 'Custom Playlists', 'Professional Equipment', 'MC Services'],
    roles: ['Bride', 'Groom', 'Event Planner'],
  },
  'event-venue': {
    use: ['event space', 'wedding venue', 'corporate events', 'banquet hall', 'capacity', 'catering', 'packages'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Schedule Tour', 'Check Availability', 'View Packages', 'Book Now'],
    features: ['All-Inclusive Packages', 'Custom Floor Plans', 'On-Site Catering', 'Valet Parking'],
    roles: ['Bride', 'Corporate Event Planner', 'Party Host'],
  },

  // ─── Retail & E-Commerce ─────────────────────────────────────────
  'boutique': {
    use: ['fashion', 'clothing', 'accessories', 'new arrivals', 'collections', 'style', 'boutique'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Shop Now', 'View Collection', 'New Arrivals', 'Shop Sale'],
    features: ['Free Shipping', 'Easy Returns', 'New Arrivals Weekly', 'Styling Advice'],
    roles: ['Shopper', 'Fashion Lover', 'Gift Buyer'],
  },
  'jewelry-store': {
    use: ['engagement rings', 'fine jewelry', 'watches', 'custom design', 'gemstones', 'gold', 'diamond'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Shop Collection', 'Book Appointment', 'View Rings', 'Custom Design'],
    features: ['Free Appraisal', 'Custom Design', 'Lifetime Warranty', 'Financing Available'],
    roles: ['Engaged Couple', 'Gift Buyer', 'Collector'],
  },
  'pet-store': {
    use: ['pet supplies', 'dog food', 'cat toys', 'grooming', 'pet adoption', 'veterinary', 'treats'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Shop Now', 'View Products', 'Book Grooming', 'Adopt Now'],
    features: ['Expert Advice', 'Local Delivery', 'Grooming Services', 'Adoption Events'],
    roles: ['Dog Owner', 'Cat Owner', 'New Pet Parent'],
  },

  // ─── Fitness & Sports ────────────────────────────────────────────
  'gym': {
    use: ['gym membership', 'personal training', 'group fitness', 'weight room', 'cardio', 'classes', 'facilities'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Join Now', 'Start Free Trial', 'View Classes', 'Tour Facility'],
    features: ['Free Trial', 'Personal Training', 'Group Classes', '24/7 Access'],
    roles: ['Member', 'Beginner', 'Athlete'],
  },
  'crossfit': {
    use: ['CrossFit', 'WOD', 'box', 'functional fitness', 'Olympic lifting', 'metcon', 'community'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Start Free Trial', 'Book Class', 'View Schedule', 'Join the Box'],
    features: ['Free Trial Class', 'All Levels Welcome', 'Community Events', 'Coach-Led Sessions'],
    roles: ['Member', 'Newcomer', 'Competitor'],
  },
  'sports-complex': {
    use: ['fields', 'courts', 'facility rental', 'leagues', 'tournaments', 'training', 'camp'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Book Facility', 'View Schedule', 'Register Now', 'Contact Us'],
    features: ['Multiple Sports', 'Youth Programs', 'Leagues', 'Tournament Hosting'],
    roles: ['Player', 'Team Manager', 'Event Organizer'],
  },

  // ─── Technology ──────────────────────────────────────────────────
  'software-company': {
    use: ['software', 'platform', 'API', 'integration', 'automation', 'workflow', 'analytics'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Start Free Trial', 'View Demo', 'Get Started', 'Book Demo'],
    features: ['Free Tier', 'API Access', 'Integrations', '24/7 Support'],
    roles: ['Developer', 'Business User', 'IT Manager'],
  },
  'ai-company': {
    use: ['artificial intelligence', 'machine learning', 'neural network', 'model', 'training', 'inference', 'deployment'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Try Demo', 'Get API Access', 'View Documentation', 'Contact Sales'],
    features: ['Pre-trained Models', 'Custom Training', 'API Access', 'Scalable Infrastructure'],
    roles: ['Developer', 'Data Scientist', 'Enterprise'],
  },

  // ─── Non-Profit ──────────────────────────────────────────────────
  'nonprofit': {
    use: ['donation', 'volunteer', 'mission', 'impact', 'community', 'programs', 'fundraiser'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Donate Now', 'Volunteer', 'Learn More', 'Get Involved'],
    features: ['Tax-Deductible', 'Volunteer Opportunities', 'Community Impact', 'Transparency'],
    roles: ['Donor', 'Volunteer', 'Beneficiary'],
  },

  // ─── Agriculture & Food Production ───────────────────────────────
  'farm': {
    use: ['farm fresh', 'organic', 'produce', 'CSA', 'farmers market', 'seasonal', 'harvest'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Shop Produce', 'Join CSA', 'Visit Farm', 'Order Now'],
    features: ['Certified Organic', 'Farm Tours', 'CSA Memberships', 'Seasonal Selection'],
    roles: ['Customer', 'CSA Member', 'Restaurant Chef'],
  },
  'brewery': {
    use: ['craft beer', 'brewing', 'taproom', 'IPA', 'stout', 'lager', 'tasting room', 'flights'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['View Menu', 'Visit Taproom', 'Book Tour', 'Order Beer'],
    features: ['Taproom', 'Brewery Tours', 'Seasonal Releases', 'Event Space'],
    roles: ['Beer Lover', 'Tourist', 'Event Organizer'],
  },

  // ─── Manufacturing & Industrial ──────────────────────────────────
  'manufacturing': {
    use: ['custom manufacturing', 'CNC', 'fabrication', 'assembly', 'production', 'tolerances', 'materials'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Request Quote', 'View Capabilities', 'Contact Us', 'Get Estimate'],
    features: ['ISO Certified', 'Custom Solutions', 'Rapid Prototyping', 'Quality Assurance'],
    roles: ['Buyer', 'Engineer', 'Procurement'],
  },

  // ─── Real Estate & Property ──────────────────────────────────────
  'property-management': {
    use: ['rental properties', 'tenant screening', 'maintenance', 'lease', 'vacancy', 'rent collection'],
    avoid: ['solutions', 'services', 'features'],
    ctas: ['Apply Now', 'View Properties', 'Contact Us', 'Schedule Viewing'],
    features: ['Online Payments', '24/7 Maintenance', 'Tenant Portal', 'Free Screening'],
    roles: ['Tenant', 'Landlord', 'Property Owner'],
  },
};

/**
 * Get industry vocabulary based on valueObject.
 * Falls back to generic vocabulary for unknown industries.
 */
export function getIndustryVocabulary(valueObject: string): IndustryVocabulary {
  return INDUSTRY_VOCABULARY[valueObject] ?? {
    use: ['professional', 'expert', 'quality', 'trusted', 'established'],
    avoid: ['solutions', 'services', 'features', 'products'],
    ctas: ['Get Started', 'Contact Us', 'Learn More', 'Call Now'],
    features: ['Professional Service', 'Quality Work', 'Customer Satisfaction', 'Free Estimates'],
    roles: ['Customer', 'Client', 'Partner'],
  };
}

/**
 * Main entry point — given primitives, returns ordered list of components.
 * This is the single source of truth for what components a website needs.
 */
export function resolveComponents(primitives: BusinessPrimitives): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  // 1. Core components (hero, CTA, footer)
  components.push(...getCoreComponents(primitives));

  // 2. Transaction-based components
  components.push(...getTransactionComponents(primitives));

  // 3. Content-shape based components
  components.push(...getContentComponents(primitives));

  // 4. Aesthetic-based components
  components.push(...getAestheticComponents(primitives));

  // Deduplicate by name
  const seen = new Set<string>();
  return components.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}
