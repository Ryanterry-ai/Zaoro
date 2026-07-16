/**
 * Benchmark Suite - Standardized test cases for pipeline validation
 *
 * Each benchmark represents a real-world business type that the pipeline
 * should be able to generate correctly.
 */

// ============================================================================
// BENCHMARK TYPES
// ============================================================================

/**
 * A single benchmark test case
 */
export interface BenchmarkCase {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Business category */
  category: string;

  /** The prompt to feed the pipeline */
  prompt: string;

  /** Expected outcomes */
  expected: {
    /** Expected industry */
    industry: string;

    /** Expected business model */
    businessModel: string;

    /** Minimum number of pages */
    minPages: number;

    /** Expected page types */
    pageTypes: string[];

    /** Expected entities (for database) */
    entities: string[];

    /** Expected workflows */
    workflows: string[];

    /** Minimum confidence score */
    minConfidence: number;
  };

  /** Tags for filtering */
  tags: string[];

  /** Priority (1 = highest) */
  priority: number;
}

// ============================================================================
// BENCHMARK DEFINITIONS
// ============================================================================

export const BENCHMARK_SUITE: BenchmarkCase[] = [
  // Coffee website
  {
    id: 'coffee-shop',
    name: 'Coffee Shop Website',
    category: 'restaurant',
    prompt: 'Build a website for a specialty coffee shop called "Bean & Brew" with menu, online ordering, and loyalty program',
    expected: {
      industry: 'food-beverage',
      businessModel: 'b2c',
      minPages: 5,
      pageTypes: ['home', 'menu', 'order', 'loyalty', 'about'],
      entities: ['Product', 'Order', 'Customer', 'LoyaltyProgram'],
      workflows: ['online-ordering', 'loyalty-tracking'],
      minConfidence: 0.7,
    },
    tags: ['restaurant', 'food', 'ordering', 'loyalty'],
    priority: 1,
  },

  // Restaurant
  {
    id: 'restaurant',
    name: 'Italian Restaurant',
    category: 'restaurant',
    prompt: 'Create a website for an Italian restaurant "La Bella Cucina" with reservations, menu, and event booking',
    expected: {
      industry: 'food-beverage',
      businessModel: 'b2c',
      minPages: 6,
      pageTypes: ['home', 'menu', 'reservations', 'events', 'about', 'contact'],
      entities: ['MenuItem', 'Reservation', 'Event', 'Customer'],
      workflows: ['reservation-booking', 'event-booking'],
      minConfidence: 0.7,
    },
    tags: ['restaurant', 'food', 'reservations', 'events'],
    priority: 1,
  },

  // Hospital ERP
  {
    id: 'hospital-erp',
    name: 'Hospital Management System',
    category: 'healthcare',
    prompt: 'Build a hospital management system with patient records, appointment scheduling, doctor management, billing, and pharmacy integration',
    expected: {
      industry: 'healthcare',
      businessModel: 'b2b',
      minPages: 10,
      pageTypes: ['dashboard', 'patients', 'appointments', 'doctors', 'billing', 'pharmacy', 'reports'],
      entities: ['Patient', 'Doctor', 'Appointment', 'Bill', 'Prescription', 'MedicalRecord'],
      workflows: ['patient-registration', 'appointment-scheduling', 'billing-process', 'prescription-management'],
      minConfidence: 0.6,
    },
    tags: ['healthcare', 'erp', 'hospital', 'medical'],
    priority: 1,
  },

  // Fitness SaaS
  {
    id: 'fitness-saas',
    name: 'Fitness Studio Management',
    category: 'fitness',
    prompt: 'Create a SaaS platform for fitness studios with class scheduling, membership management, trainer profiles, and payment processing',
    expected: {
      industry: 'fitness',
      businessModel: 'b2b-saas',
      minPages: 8,
      pageTypes: ['home', 'classes', 'trainers', 'membership', 'schedule', 'pricing', 'dashboard'],
      entities: ['Class', 'Trainer', 'Member', 'Membership', 'Booking', 'Payment'],
      workflows: ['class-booking', 'membership-management', 'payment-processing'],
      minConfidence: 0.7,
    },
    tags: ['fitness', 'saas', 'membership', 'scheduling'],
    priority: 2,
  },

  // Marketplace
  {
    id: 'marketplace',
    name: 'Multi-Vendor Marketplace',
    category: 'ecommerce',
    prompt: 'Build a multi-vendor marketplace like Etsy for handmade crafts with vendor dashboards, product listings, and secure checkout',
    expected: {
      industry: 'ecommerce',
      businessModel: 'marketplace',
      minPages: 10,
      pageTypes: ['home', 'browse', 'product', 'vendor-dashboard', 'cart', 'checkout', 'orders'],
      entities: ['Product', 'Vendor', 'Order', 'Category', 'Review', 'Cart'],
      workflows: ['product-listing', 'order-management', 'vendor-onboarding', 'secure-checkout'],
      minConfidence: 0.6,
    },
    tags: ['marketplace', 'ecommerce', 'multi-vendor', 'handmade'],
    priority: 2,
  },

  // CRM
  {
    id: 'crm',
    name: 'Customer Relationship Management',
    category: 'business',
    prompt: 'Create a CRM system with contact management, deal tracking, email integration, and sales pipeline visualization',
    expected: {
      industry: 'business',
      businessModel: 'b2b-saas',
      minPages: 8,
      pageTypes: ['dashboard', 'contacts', 'deals', 'emails', 'pipeline', 'reports', 'settings'],
      entities: ['Contact', 'Deal', 'Email', 'Pipeline', 'Activity', 'Report'],
      workflows: ['contact-management', 'deal-tracking', 'email-sync', 'pipeline-management'],
      minConfidence: 0.6,
    },
    tags: ['crm', 'sales', 'business', 'saas'],
    priority: 2,
  },

  // HRMS
  {
    id: 'hrms',
    name: 'Human Resource Management System',
    category: 'business',
    prompt: 'Build an HRMS with employee records, leave management, payroll, performance reviews, and recruitment tracking',
    expected: {
      industry: 'business',
      businessModel: 'b2b-saas',
      minPages: 10,
      pageTypes: ['dashboard', 'employees', 'leave', 'payroll', 'performance', 'recruitment'],
      entities: ['Employee', 'Leave', 'Payroll', 'PerformanceReview', 'JobPosting', 'Application'],
      workflows: ['leave-management', 'payroll-processing', 'performance-review', 'recruitment'],
      minConfidence: 0.6,
    },
    tags: ['hrms', 'hr', 'business', 'saas'],
    priority: 2,
  },

  // ATS
  {
    id: 'ats',
    name: 'Applicant Tracking System',
    category: 'recruitment',
    prompt: 'Create an ATS with job postings, candidate management, interview scheduling, and offer letter generation',
    expected: {
      industry: 'recruitment',
      businessModel: 'b2b-saas',
      minPages: 7,
      pageTypes: ['dashboard', 'jobs', 'candidates', 'interviews', 'offers', 'reports'],
      entities: ['JobPosting', 'Candidate', 'Interview', 'Offer', 'Application', 'Assessment'],
      workflows: ['job-posting', 'candidate-screening', 'interview-scheduling', 'offer-management'],
      minConfidence: 0.6,
    },
    tags: ['recruitment', 'ats', 'hiring', 'saas'],
    priority: 2,
  },

  // Pharmacy
  {
    id: 'pharmacy',
    name: 'Pharmacy Management System',
    category: 'healthcare',
    prompt: 'Build a pharmacy management system with inventory tracking, prescription processing, billing, and supplier management',
    expected: {
      industry: 'healthcare',
      businessModel: 'b2b',
      minPages: 8,
      pageTypes: ['dashboard', 'inventory', 'prescriptions', 'billing', 'suppliers', 'reports'],
      entities: ['Medication', 'Prescription', 'Supplier', 'Invoice', 'Stock', 'Customer'],
      workflows: ['prescription-processing', 'inventory-management', 'billing', 'supplier-ordering'],
      minConfidence: 0.6,
    },
    tags: ['pharmacy', 'healthcare', 'inventory', 'medical'],
    priority: 2,
  },

  // Hotel
  {
    id: 'hotel',
    name: 'Hotel Booking System',
    category: 'hospitality',
    prompt: 'Create a hotel booking website with room listings, reservation management, guest services, and payment processing',
    expected: {
      industry: 'hospitality',
      businessModel: 'b2c',
      minPages: 8,
      pageTypes: ['home', 'rooms', 'booking', 'guest-services', 'about', 'contact', 'admin'],
      entities: ['Room', 'Reservation', 'Guest', 'Service', 'Payment', 'Review'],
      workflows: ['room-booking', 'guest-checkin', 'service-request', 'payment-processing'],
      minConfidence: 0.7,
    },
    tags: ['hotel', 'hospitality', 'booking', 'reservation'],
    priority: 2,
  },

  // Logistics
  {
    id: 'logistics',
    name: 'Logistics Management Platform',
    category: 'logistics',
    prompt: 'Build a logistics platform with shipment tracking, route optimization, fleet management, and delivery confirmation',
    expected: {
      industry: 'logistics',
      businessModel: 'b2b',
      minPages: 8,
      pageTypes: ['dashboard', 'shipments', 'routes', 'fleet', 'tracking', 'reports'],
      entities: ['Shipment', 'Route', 'Vehicle', 'Driver', 'Delivery', 'TrackingEvent'],
      workflows: ['shipment-tracking', 'route-optimization', 'fleet-management', 'delivery-confirmation'],
      minConfidence: 0.6,
    },
    tags: ['logistics', 'shipping', 'fleet', 'tracking'],
    priority: 2,
  },

  // Accounting
  {
    id: 'accounting',
    name: 'Accounting Software',
    category: 'finance',
    prompt: 'Create accounting software with invoicing, expense tracking, financial reports, and tax preparation',
    expected: {
      industry: 'finance',
      businessModel: 'b2b-saas',
      minPages: 8,
      pageTypes: ['dashboard', 'invoices', 'expenses', 'reports', 'tax', 'settings'],
      entities: ['Invoice', 'Expense', 'Account', 'Report', 'Tax', 'Client'],
      workflows: ['invoicing', 'expense-tracking', 'report-generation', 'tax-preparation'],
      minConfidence: 0.6,
    },
    tags: ['accounting', 'finance', 'invoicing', 'saas'],
    priority: 2,
  },

  // Learning Platform
  {
    id: 'learning-platform',
    name: 'Online Learning Platform',
    category: 'education',
    prompt: 'Build an LMS with course management, student progress tracking, quizzes, and certificates',
    expected: {
      industry: 'education',
      businessModel: 'b2b-saas',
      minPages: 9,
      pageTypes: ['home', 'courses', 'course-detail', 'quiz', 'progress', 'certificates', 'admin'],
      entities: ['Course', 'Module', 'Student', 'Quiz', 'Certificate', 'Progress'],
      workflows: ['course-enrollment', 'quiz-taking', 'progress-tracking', 'certificate-generation'],
      minConfidence: 0.6,
    },
    tags: ['education', 'lms', 'learning', 'saas'],
    priority: 2,
  },

  // Portfolio
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    category: 'creative',
    prompt: 'Create a portfolio website for a graphic designer with project galleries, case studies, and contact form',
    expected: {
      industry: 'creative',
      businessModel: 'b2c',
      minPages: 5,
      pageTypes: ['home', 'projects', 'project-detail', 'about', 'contact'],
      entities: ['Project', 'Category', 'Testimonial', 'Contact'],
      workflows: ['project-browsing', 'contact-form'],
      minConfidence: 0.8,
    },
    tags: ['portfolio', 'creative', 'designer', 'personal'],
    priority: 3,
  },

  // Agency
  {
    id: 'agency',
    name: 'Digital Marketing Agency',
    category: 'agency',
    prompt: 'Build a website for a digital marketing agency with services, case studies, team profiles, and lead capture',
    expected: {
      industry: 'agency',
      businessModel: 'b2b',
      minPages: 7,
      pageTypes: ['home', 'services', 'case-studies', 'team', 'about', 'contact', 'blog'],
      entities: ['Service', 'CaseStudy', 'TeamMember', 'Lead', 'BlogPost'],
      workflows: ['lead-capture', 'case-study-browsing'],
      minConfidence: 0.7,
    },
    tags: ['agency', 'marketing', 'b2b', 'services'],
    priority: 3,
  },

  // Supplement Store
  {
    id: 'supplement-store',
    name: 'Supplement E-commerce',
    category: 'ecommerce',
    prompt: 'Create an e-commerce store for fitness supplements with product categories, subscription options, and reviews',
    expected: {
      industry: 'ecommerce',
      businessModel: 'b2c',
      minPages: 7,
      pageTypes: ['home', 'products', 'product-detail', 'cart', 'checkout', 'account', 'reviews'],
      entities: ['Product', 'Category', 'Subscription', 'Review', 'Order', 'Customer'],
      workflows: ['product-browsing', 'subscription-management', 'checkout', 'review-submission'],
      minConfidence: 0.7,
    },
    tags: ['ecommerce', 'supplements', 'fitness', 'subscription'],
    priority: 3,
  },

  // Fintech
  {
    id: 'fintech',
    name: 'Personal Finance App',
    category: 'fintech',
    prompt: 'Build a personal finance app with budget tracking, investment portfolio, bill reminders, and financial goals',
    expected: {
      industry: 'fintech',
      businessModel: 'b2c',
      minPages: 8,
      pageTypes: ['dashboard', 'budget', 'investments', 'bills', 'goals', 'settings'],
      entities: ['Transaction', 'Budget', 'Investment', 'Bill', 'Goal', 'Account'],
      workflows: ['budget-tracking', 'investment-monitoring', 'bill-reminders', 'goal-tracking'],
      minConfidence: 0.6,
    },
    tags: ['fintech', 'finance', 'budgeting', 'investing'],
    priority: 2,
  },

  // Healthcare
  {
    id: 'healthcare-portal',
    name: 'Patient Healthcare Portal',
    category: 'healthcare',
    prompt: 'Create a patient portal with medical records, appointment booking, prescription refills, and telehealth integration',
    expected: {
      industry: 'healthcare',
      businessModel: 'b2c',
      minPages: 7,
      pageTypes: ['dashboard', 'records', 'appointments', 'prescriptions', 'telehealth', 'messages'],
      entities: ['Patient', 'MedicalRecord', 'Appointment', 'Prescription', 'Message', 'Provider'],
      workflows: ['appointment-booking', 'prescription-refill', 'telehealth-session', 'message-sending'],
      minConfidence: 0.6,
    },
    tags: ['healthcare', 'patient', 'portal', 'telehealth'],
    priority: 2,
  },

  // Real Estate
  {
    id: 'real-estate',
    name: 'Real Estate Listing Platform',
    category: 'realestate',
    prompt: 'Build a real estate platform with property listings, agent profiles, virtual tours, and mortgage calculator',
    expected: {
      industry: 'realestate',
      businessModel: 'marketplace',
      minPages: 8,
      pageTypes: ['home', 'listings', 'property-detail', 'agents', 'virtual-tours', 'mortgage', 'contact'],
      entities: ['Property', 'Agent', 'Listing', 'VirtualTour', 'Inquiry', 'MortgageCalculation'],
      workflows: ['property-search', 'virtual-tour-viewing', 'inquiry-submission', 'mortgage-calculation'],
      minConfidence: 0.7,
    },
    tags: ['realestate', 'property', 'listing', 'agents'],
    priority: 2,
  },

  // Nonprofit
  {
    id: 'nonprofit',
    name: 'Nonprofit Organization',
    category: 'nonprofit',
    prompt: 'Create a website for a nonprofit with donation processing, volunteer signup, event calendar, and impact reports',
    expected: {
      industry: 'nonprofit',
      businessModel: 'nonprofit',
      minPages: 7,
      pageTypes: ['home', 'about', 'donate', 'volunteer', 'events', 'impact', 'contact'],
      entities: ['Donation', 'Volunteer', 'Event', 'ImpactReport', 'Donor', 'Campaign'],
      workflows: ['donation-processing', 'volunteer-signup', 'event-registration'],
      minConfidence: 0.7,
    },
    tags: ['nonprofit', 'charity', 'donation', 'volunteer'],
    priority: 3,
  },
];

// ============================================================================
// BENCHMARK UTILITIES
// ============================================================================

/**
 * Get benchmarks by category
 */
export function getBenchmarksByCategory(category: string): BenchmarkCase[] {
  return BENCHMARK_SUITE.filter(b => b.category === category);
}

/**
 * Get benchmarks by priority
 */
export function getBenchmarksByPriority(priority: number): BenchmarkCase[] {
  return BENCHMARK_SUITE.filter(b => b.priority === priority);
}

/**
 * Get benchmarks by tag
 */
export function getBenchmarksByTag(tag: string): BenchmarkCase[] {
  return BENCHMARK_SUITE.filter(b => b.tags.includes(tag));
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return [...new Set(BENCHMARK_SUITE.map(b => b.category))];
}

/**
 * Get all unique tags
 */
export function getTags(): string[] {
  return [...new Set(BENCHMARK_SUITE.flatMap(b => b.tags))];
}
