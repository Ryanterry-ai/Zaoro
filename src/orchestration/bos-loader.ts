// ─── BOS Loader ───────────────────────────────────────────────────────────────
//
// Business Operating System (BOS) loader. Detects the industry from the
// project manifest and loads reusable knowledge packs that enrich every
// stage of the pipeline.
//
// Knowledge packs provide:
//   - Industry-specific entities and relationships
//   - Compliance requirements and checklists
//   - Common integrations (payment, auth, analytics)
//   - Typical user journeys and conversion goals
//   - Domain-specific prompts for each stage
//   - Example artifacts for few-shot learning
//
// The loader runs BEFORE research begins, so stages have access to
// industry knowledge from the start.
// ──────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import type {
  BOSPack,
  BOSContext,
  Industry,
  ProjectManifest,
  LLMAdapterInterface,
  LLMTaskType,
} from './types.js';

// ─── Built-in BOS Packs ───────────────────────────────────────────────────────

const BUILTIN_PACKS: BOSPack[] = [
  {
    id: 'ecommerce',
    industry: 'ecommerce',
    name: 'E-Commerce',
    version: '1.0.0',
    detectionKeywords: ['shop', 'store', 'product', 'cart', 'checkout', 'ecommerce', 'e-commerce', 'marketplace', 'buy', 'sell', 'order', 'inventory'],
    entities: [
      {
        name: 'Product',
        description: 'A sellable item',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'price', type: 'decimal', required: true },
          { name: 'compareAtPrice', type: 'decimal', required: false },
          { name: 'sku', type: 'string', required: false },
          { name: 'inventory', type: 'integer', required: true },
          { name: 'images', type: 'json', required: false },
          { name: 'categoryId', type: 'relation', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Category', type: 'many-to-one' },
          { to: 'OrderItem', type: 'one-to-many' },
          { to: 'Review', type: 'one-to-many' },
        ],
      },
      {
        name: 'Category',
        description: 'Product grouping',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'parentId', type: 'relation', required: false },
        ],
        relationships: [
          { to: 'Product', type: 'one-to-many' },
        ],
      },
      {
        name: 'Order',
        description: 'A customer purchase',
        fields: [
          { name: 'orderNumber', type: 'string', required: true },
          { name: 'userId', type: 'relation', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'total', type: 'decimal', required: true },
          { name: 'shippingAddress', type: 'json', required: true },
          { name: 'paymentIntentId', type: 'string', required: false },
        ],
        relationships: [
          { to: 'OrderItem', type: 'one-to-many' },
          { to: 'User', type: 'many-to-one' },
        ],
      },
      {
        name: 'User',
        description: 'Customer account',
        fields: [
          { name: 'email', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'passwordHash', type: 'string', required: true },
          { name: 'role', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Order', type: 'one-to-many' },
        ],
      },
    ],
    compliance: [
      {
        id: 'pci',
        name: 'PCI DSS',
        description: 'Payment Card Industry compliance for handling credit cards',
        required: true,
        checklist: [
          'Never store raw credit card numbers',
          'Use a PCI-compliant payment processor (Stripe, Square)',
          'Enable HTTPS on all pages',
          'Implement CVV verification',
        ],
      },
    ],
    integrations: [
      { name: 'Stripe', category: 'payment', purpose: 'Payment processing', apiType: 'REST' },
      { name: 'ShipStation', category: 'shipping', purpose: 'Shipping label generation', apiType: 'REST' },
      { name: 'SendGrid', category: 'email', purpose: 'Transaction emails', apiType: 'REST' },
    ],
    kpis: ['conversion rate', 'average order value', 'cart abandonment rate', 'customer lifetime value', 'return rate'],
    journeys: [
      {
        id: 'visitor-to-customer',
        name: 'Visitor to Customer',
        role: 'visitor',
        steps: ['browse products', 'view product detail', 'add to cart', 'checkout', 'payment', 'order confirmation'],
        conversionGoal: 'completed purchase',
      },
      {
        id: 'repeat-customer',
        name: 'Repeat Customer',
        role: 'customer',
        steps: ['log in', 'view order history', 'reorder', 'leave review'],
        conversionGoal: 'repeat purchase',
      },
    ],
    stagePrompts: {
      'research': 'Focus on e-commerce trends, product-market fit, and competitor pricing strategies.',
      'architecture': 'Design for high-traffic product pages, cart persistence, and secure checkout flows.',
      'database': 'Optimize for product catalog queries, inventory tracking, and order processing.',
      'api-design': 'Include product search, cart management, checkout, and webhook endpoints.',
      'frontend-design': 'Prioritize product discovery, fast checkout, and mobile-first design.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'saas',
    industry: 'saas',
    name: 'SaaS',
    version: '1.0.0',
    detectionKeywords: ['saas', 'subscription', 'dashboard', 'analytics', 'b2b', 'enterprise', 'tenant', 'multi-tenant', 'plan', 'pricing', 'trial'],
    entities: [
      {
        name: 'Organization',
        description: 'A tenant/customer organization',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'plan', type: 'enum', required: true },
          { name: 'settings', type: 'json', required: false },
        ],
        relationships: [
          { to: 'User', type: 'one-to-many' },
          { to: 'Subscription', type: 'one-to-one' },
        ],
      },
      {
        name: 'User',
        description: 'User within an organization',
        fields: [
          { name: 'email', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'role', type: 'enum', required: true },
          { name: 'organizationId', type: 'relation', required: true },
        ],
        relationships: [
          { to: 'Organization', type: 'many-to-one' },
        ],
      },
      {
        name: 'Subscription',
        description: 'Billing subscription',
        fields: [
          { name: 'organizationId', type: 'relation', required: true },
          { name: 'plan', type: 'enum', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'stripeSubscriptionId', type: 'string', required: false },
          { name: 'currentPeriodEnd', type: 'datetime', required: true },
        ],
        relationships: [
          { to: 'Organization', type: 'one-to-one' },
        ],
      },
    ],
    compliance: [],
    integrations: [
      { name: 'Stripe', category: 'billing', purpose: 'Subscription billing', apiType: 'REST' },
      { name: 'Auth0', category: 'auth', purpose: 'Enterprise SSO', apiType: 'SDK' },
      { name: 'PostHog', category: 'analytics', purpose: 'Product analytics', apiType: 'SDK' },
    ],
    kpis: ['MRR', 'churn rate', 'activation rate', 'DAU/MAU ratio', 'NPS score'],
    journeys: [
      {
        id: 'trial-to-paid',
        name: 'Trial to Paid Conversion',
        role: 'trial-user',
        steps: ['sign up', 'onboarding', 'create first project', 'invite team', 'upgrade to paid'],
        conversionGoal: 'subscription purchase',
      },
    ],
    stagePrompts: {
      'research': 'Focus on SaaS metrics, pricing models, and competitive positioning.',
      'architecture': 'Design for multi-tenancy, feature flags, and usage-based billing.',
      'database': 'Model organizations, tenants, and subscription lifecycle.',
      'api-design': 'Include tenant-scoped endpoints, billing webhooks, and admin APIs.',
      'frontend-design': 'Design for dashboard-heavy UX, data visualization, and team collaboration.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'restaurant',
    industry: 'restaurant',
    name: 'Restaurant',
    version: '1.0.0',
    detectionKeywords: ['restaurant', 'food', 'menu', 'dining', 'reservation', 'order food', 'delivery', 'cafe', 'pizza', 'sushi'],
    entities: [
      {
        name: 'MenuItem',
        description: 'A menu item',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'price', type: 'decimal', required: true },
          { name: 'category', type: 'string', required: true },
          { name: 'imageUrl', type: 'string', required: false },
          { name: 'available', type: 'boolean', required: true },
        ],
        relationships: [],
      },
      {
        name: 'Reservation',
        description: 'Table reservation',
        fields: [
          { name: 'customerName', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
          { name: 'date', type: 'datetime', required: true },
          { name: 'partySize', type: 'integer', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [],
      },
    ],
    compliance: [
      {
        id: 'food-safety',
        name: 'Food Safety',
        description: 'Food safety and hygiene regulations',
        required: true,
        checklist: [
          'Display food hygiene rating',
          'Allergen information for all menu items',
          'Nutritional information if required',
        ],
      },
    ],
    integrations: [
      { name: 'OpenTable', category: 'reservations', purpose: 'Table booking', apiType: 'REST' },
      { name: 'DoorDash', category: 'delivery', purpose: 'Food delivery', apiType: 'API' },
    ],
    kpis: ['reservation rate', 'table turnover', 'average spend per cover', 'delivery order value'],
    journeys: [
      {
        id: 'browse-to-order',
        name: 'Browse to Order',
        role: 'customer',
        steps: ['view menu', 'select items', 'add to cart', 'checkout', 'order confirmation'],
        conversionGoal: 'order placed',
      },
    ],
    stagePrompts: {
      'research': 'Focus on local SEO, food delivery trends, and reservation management.',
      'architecture': 'Design for menu management, online ordering, and table reservations.',
      'database': 'Model menu items, categories, orders, and reservations.',
      'api-design': 'Include menu CRUD, order placement, and reservation endpoints.',
      'frontend-design': 'Mobile-first menu browsing, easy reorder, and visual food presentation.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'fintech',
    industry: 'fintech',
    name: 'Fintech',
    version: '1.0.0',
    detectionKeywords: ['fintech', 'banking', 'payment', 'wallet', 'neobank', 'lending', 'investment', 'trading', 'kyc', 'finance'],
    entities: [
      {
        name: 'Account',
        description: 'A financial account',
        fields: [
          { name: 'userId', type: 'relation', required: true },
          { name: 'type', type: 'enum', required: true },
          { name: 'balance', type: 'decimal', required: true },
          { name: 'currency', type: 'string', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'User', type: 'many-to-one' },
          { to: 'Transaction', type: 'one-to-many' },
        ],
      },
      {
        name: 'Transaction',
        description: 'A financial transaction',
        fields: [
          { name: 'accountId', type: 'relation', required: true },
          { name: 'type', type: 'enum', required: true },
          { name: 'amount', type: 'decimal', required: true },
          { name: 'currency', type: 'string', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'reference', type: 'string', required: false },
        ],
        relationships: [
          { to: 'Account', type: 'many-to-one' },
        ],
      },
      {
        name: 'User',
        description: 'Platform user with KYC status',
        fields: [
          { name: 'email', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'phone', type: 'string', required: false },
          { name: 'kycStatus', type: 'enum', required: true },
          { name: 'role', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Account', type: 'one-to-many' },
        ],
      },
    ],
    compliance: [
      {
        id: 'pci',
        name: 'PCI DSS',
        description: 'Payment Card Industry compliance',
        required: true,
        checklist: ['Never store raw card numbers', 'Use PCI-compliant processor', 'Enable HTTPS everywhere'],
      },
      {
        id: 'kyc',
        name: 'KYC/AML',
        description: 'Know Your Customer and Anti-Money Laundering',
        required: true,
        checklist: ['Identity verification required', 'Transaction monitoring', 'Suspicious activity reporting'],
      },
    ],
    integrations: [
      { name: 'Stripe', category: 'payment', purpose: 'Payment processing', apiType: 'REST' },
      { name: 'Plaid', category: 'banking', purpose: 'Bank account linking', apiType: 'REST' },
      { name: 'Twilio', category: 'sms', purpose: 'OTP and alerts', apiType: 'REST' },
    ],
    kpis: ['transaction volume', 'active accounts', 'kyc completion rate', 'funding rate', 'arpu'],
    journeys: [
      {
        id: 'signup-to-funded',
        name: 'Signup to Funded Account',
        role: 'user',
        steps: ['download app', 'complete kyc', 'link bank account', 'fund account', 'first transaction'],
        conversionGoal: 'funded account',
      },
    ],
    stagePrompts: {
      'research': 'Focus on fintech regulations, payment flows, and competitive landscape.',
      'architecture': 'Design for PCI compliance, multi-currency support, and real-time transaction processing.',
      'database': 'Model accounts, transactions, and audit trails with proper decimal precision.',
      'api-design': 'Include transaction endpoints, account management, and webhook handlers.',
      'frontend-design': 'Design for trust, security indicators, and clear financial data presentation.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'healthcare',
    industry: 'healthcare',
    name: 'Healthcare',
    version: '1.0.0',
    detectionKeywords: ['healthcare', 'medical', 'clinic', 'hospital', 'patient', 'doctor', 'appointment', 'health', 'dental', 'telehealth'],
    entities: [
      {
        name: 'Patient',
        description: 'A patient record',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
          { name: 'dateOfBirth', type: 'date', required: true },
          { name: 'medicalRecordNumber', type: 'string', required: true },
        ],
        relationships: [
          { to: 'Appointment', type: 'one-to-many' },
        ],
      },
      {
        name: 'Appointment',
        description: 'A patient appointment',
        fields: [
          { name: 'patientId', type: 'relation', required: true },
          { name: 'doctorId', type: 'relation', required: true },
          { name: 'dateTime', type: 'datetime', required: true },
          { name: 'type', type: 'enum', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'notes', type: 'text', required: false },
        ],
        relationships: [
          { to: 'Patient', type: 'many-to-one' },
          { to: 'Doctor', type: 'many-to-one' },
        ],
      },
      {
        name: 'Doctor',
        description: 'A healthcare provider',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'specialty', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
        ],
        relationships: [
          { to: 'Appointment', type: 'one-to-many' },
        ],
      },
    ],
    compliance: [
      {
        id: 'hipaa',
        name: 'HIPAA',
        description: 'Health Insurance Portability and Accountability Act',
        required: true,
        checklist: ['Encrypt PHI at rest and in transit', 'Access controls for patient data', 'Audit logging'],
      },
    ],
    integrations: [
      { name: 'Twilio', category: 'sms', purpose: 'Appointment reminders', apiType: 'REST' },
      { name: 'SendGrid', category: 'email', purpose: 'Patient communications', apiType: 'REST' },
    ],
    kpis: ['appointment booking rate', 'patient retention', 'no-show rate', 'average wait time'],
    journeys: [
      {
        id: 'patient-onboarding',
        name: 'Patient Onboarding',
        role: 'patient',
        steps: ['find practice', 'book appointment', 'complete intake', 'first visit', 'follow-up'],
        conversionGoal: 'completed first visit',
      },
    ],
    stagePrompts: {
      'research': 'Focus on healthcare compliance, patient experience, and telehealth trends.',
      'architecture': 'Design for HIPAA compliance, PHI encryption, and audit logging.',
      'database': 'Model patients, appointments, and medical records with proper access controls.',
      'api-design': 'Include patient management, appointment scheduling, and secure record access.',
      'frontend-design': 'Design for accessibility, patient portals, and clear medical information.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'education',
    industry: 'education',
    name: 'Education',
    version: '1.0.0',
    detectionKeywords: ['education', 'school', 'university', 'course', 'student', 'teacher', 'learning', 'e-learning', 'lms', 'classroom'],
    entities: [
      {
        name: 'Course',
        description: 'An educational course',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'teacherId', type: 'relation', required: true },
          { name: 'capacity', type: 'integer', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Teacher', type: 'many-to-one' },
          { to: 'Enrollment', type: 'one-to-many' },
        ],
      },
      {
        name: 'Student',
        description: 'A student enrolled in courses',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'grade', type: 'string', required: false },
        ],
        relationships: [
          { to: 'Enrollment', type: 'one-to-many' },
        ],
      },
      {
        name: 'Enrollment',
        description: 'Student course enrollment',
        fields: [
          { name: 'studentId', type: 'relation', required: true },
          { name: 'courseId', type: 'relation', required: true },
          { name: 'enrolledAt', type: 'datetime', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Student', type: 'many-to-one' },
          { to: 'Course', type: 'many-to-one' },
        ],
      },
    ],
    compliance: [
      {
        id: 'ferpa',
        name: 'FERPA',
        description: 'Family Educational Rights and Privacy Act',
        required: true,
        checklist: ['Protect student records', 'Parent access rights', 'Directory information opt-out'],
      },
    ],
    integrations: [
      { name: 'Google Classroom', category: 'lms', purpose: 'Course management', apiType: 'REST' },
      { name: 'Zoom', category: 'video', purpose: 'Virtual classes', apiType: 'SDK' },
    ],
    kpis: ['enrollment rate', 'course completion rate', 'student satisfaction', 'retention rate'],
    journeys: [
      {
        id: 'enrollment-flow',
        name: 'Student Enrollment',
        role: 'student',
        steps: ['browse courses', 'view details', 'enroll', 'access materials', 'complete course'],
        conversionGoal: 'course completion',
      },
    ],
    stagePrompts: {
      'research': 'Focus on e-learning trends, student engagement, and competitive platforms.',
      'architecture': 'Design for course management, progress tracking, and content delivery.',
      'database': 'Model courses, enrollments, and student progress.',
      'api-design': 'Include course CRUD, enrollment, and progress tracking endpoints.',
      'frontend-design': 'Design for learning experience, progress dashboards, and content consumption.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'fitness',
    industry: 'fitness',
    name: 'Fitness',
    version: '1.0.0',
    detectionKeywords: ['fitness', 'gym', 'workout', 'training', 'membership', 'class', 'trainer', 'exercise', 'wellness', 'yoga'],
    entities: [
      {
        name: 'Member',
        description: 'A gym/fitness member',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
          { name: 'membershipType', type: 'enum', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Booking', type: 'one-to-many' },
          { to: 'Membership', type: 'one-to-one' },
        ],
      },
      {
        name: 'Class',
        description: 'A fitness class',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'trainerId', type: 'relation', required: true },
          { name: 'capacity', type: 'integer', required: true },
          { name: 'schedule', type: 'datetime', required: true },
          { name: 'duration', type: 'integer', required: true },
        ],
        relationships: [
          { to: 'Booking', type: 'one-to-many' },
        ],
      },
      {
        name: 'Booking',
        description: 'Class booking by a member',
        fields: [
          { name: 'memberId', type: 'relation', required: true },
          { name: 'classId', type: 'relation', required: true },
          { name: 'bookedAt', type: 'datetime', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Member', type: 'many-to-one' },
          { to: 'Class', type: 'many-to-one' },
        ],
      },
    ],
    compliance: [],
    integrations: [
      { name: 'Mindbody', category: 'scheduling', purpose: 'Class booking', apiType: 'REST' },
      { name: 'Stripe', category: 'payment', purpose: 'Membership billing', apiType: 'REST' },
    ],
    kpis: ['membership retention', 'class attendance', 'new member sign-ups', 'churn rate'],
    journeys: [
      {
        id: 'trial-to-member',
        name: 'Trial to Membership',
        role: 'prospect',
        steps: ['visit website', 'book trial', 'attend class', 'sign up', 'regular attendance'],
        conversionGoal: 'membership purchase',
      },
    ],
    stagePrompts: {
      'research': 'Focus on fitness trends, membership models, and competitor analysis.',
      'architecture': 'Design for class scheduling, membership management, and booking systems.',
      'database': 'Model members, classes, bookings, and membership plans.',
      'api-design': 'Include member management, class booking, and membership endpoints.',
      'frontend-design': 'Design for class schedules, booking flow, and member dashboards.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'real-estate',
    industry: 'real-estate',
    name: 'Real Estate',
    version: '1.0.0',
    detectionKeywords: ['real estate', 'property', 'listing', 'agent', 'broker', 'mortgage', 'home', 'apartment', 'rental', 'commercial'],
    entities: [
      {
        name: 'Property',
        description: 'A real estate listing',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'address', type: 'string', required: true },
          { name: 'price', type: 'decimal', required: true },
          { name: 'bedrooms', type: 'integer', required: true },
          { name: 'bathrooms', type: 'integer', required: true },
          { name: 'squareFeet', type: 'integer', required: true },
          { name: 'type', type: 'enum', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Agent', type: 'many-to-one' },
          { to: 'Inquiry', type: 'one-to-many' },
        ],
      },
      {
        name: 'Agent',
        description: 'A real estate agent',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: true },
          { name: 'license', type: 'string', required: true },
        ],
        relationships: [
          { to: 'Property', type: 'one-to-many' },
        ],
      },
      {
        name: 'Inquiry',
        description: 'A property inquiry',
        fields: [
          { name: 'propertyId', type: 'relation', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'message', type: 'text', required: false },
          { name: 'createdAt', type: 'datetime', required: true },
        ],
        relationships: [
          { to: 'Property', type: 'many-to-one' },
        ],
      },
    ],
    compliance: [
      {
        id: 'fair-housing',
        name: 'Fair Housing Act',
        description: 'Anti-discrimination in property listings',
        required: true,
        checklist: ['No discriminatory language', 'Equal housing opportunity', 'ADA accessibility'],
      },
    ],
    integrations: [
      { name: 'Zillow API', category: 'listings', purpose: 'Property syndication', apiType: 'REST' },
      { name: 'Google Maps', category: 'maps', purpose: 'Location display', apiType: 'SDK' },
    ],
    kpis: ['listing views', 'inquiry rate', 'days on market', 'lead conversion rate'],
    journeys: [
      {
        id: 'search-to-inquiry',
        name: 'Search to Inquiry',
        role: 'buyer',
        steps: ['search properties', 'view listing', 'save favorite', 'schedule viewing', 'submit inquiry'],
        conversionGoal: 'property inquiry',
      },
    ],
    stagePrompts: {
      'research': 'Focus on real estate trends, search behavior, and listing optimization.',
      'architecture': 'Design for property search, geolocation, and listing management.',
      'database': 'Model properties, agents, and inquiries with geospatial support.',
      'api-design': 'Include property search, listing CRUD, and inquiry endpoints.',
      'frontend-design': 'Design for property galleries, map views, and search filters.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'media',
    industry: 'media',
    name: 'Media',
    version: '1.0.0',
    detectionKeywords: ['media', 'news', 'blog', 'content', 'publishing', 'editorial', 'magazine', 'journalism', 'article', 'podcast'],
    entities: [
      {
        name: 'Article',
        description: 'A published article',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'content', type: 'text', required: true },
          { name: 'authorId', type: 'relation', required: true },
          { name: 'category', type: 'string', required: true },
          { name: 'publishedAt', type: 'datetime', required: false },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Author', type: 'many-to-one' },
        ],
      },
      {
        name: 'Author',
        description: 'A content author',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'bio', type: 'text', required: false },
          { name: 'avatarUrl', type: 'string', required: false },
        ],
        relationships: [
          { to: 'Article', type: 'one-to-many' },
        ],
      },
      {
        name: 'Subscriber',
        description: 'A newsletter subscriber',
        fields: [
          { name: 'email', type: 'string', required: true },
          { name: 'name', type: 'string', required: false },
          { name: 'preferences', type: 'json', required: false },
        ],
        relationships: [],
      },
    ],
    compliance: [
      {
        id: 'copyright',
        name: 'Copyright Compliance',
        description: 'Content copyright and fair use',
        required: true,
        checklist: ['Original content only', 'Proper attribution', 'DMCA compliance'],
      },
    ],
    integrations: [
      { name: 'Mailchimp', category: 'email', purpose: 'Newsletter delivery', apiType: 'REST' },
      { name: 'Google Analytics', category: 'analytics', purpose: 'Content performance', apiType: 'SDK' },
    ],
    kpis: ['page views', 'time on page', 'subscriber growth', 'engagement rate'],
    journeys: [
      {
        id: 'reader-to-subscriber',
        name: 'Reader to Subscriber',
        role: 'reader',
        steps: ['discover article', 'read content', 'subscribe', 'become regular reader'],
        conversionGoal: 'newsletter subscription',
      },
    ],
    stagePrompts: {
      'research': 'Focus on content strategy, SEO trends, and audience engagement.',
      'architecture': 'Design for CMS, SEO optimization, and newsletter delivery.',
      'database': 'Model articles, authors, subscribers, and content categories.',
      'api-design': 'Include article CRUD, subscription management, and content search.',
      'frontend-design': 'Design for readability, content discovery, and newsletter signup.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'portfolio',
    industry: 'portfolio',
    name: 'Portfolio',
    version: '1.0.0',
    detectionKeywords: ['portfolio', 'personal site', 'showcase', 'freelancer', 'creative', 'designer', 'developer portfolio', 'resume', 'cv'],
    entities: [
      {
        name: 'Project',
        description: 'A portfolio project',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'category', type: 'string', required: true },
          { name: 'imageUrl', type: 'string', required: false },
          { name: 'projectUrl', type: 'string', required: false },
          { name: 'featured', type: 'boolean', required: true },
        ],
        relationships: [],
      },
      {
        name: 'Skill',
        description: 'A professional skill',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'category', type: 'string', required: true },
          { name: 'proficiency', type: 'enum', required: true },
        ],
        relationships: [],
      },
      {
        name: 'Testimonial',
        description: 'A client testimonial',
        fields: [
          { name: 'clientName', type: 'string', required: true },
          { name: 'clientRole', type: 'string', required: false },
          { name: 'content', type: 'text', required: true },
          { name: 'rating', type: 'integer', required: false },
        ],
        relationships: [],
      },
    ],
    compliance: [],
    integrations: [
      { name: 'GitHub', category: 'social', purpose: 'Code showcase', apiType: 'REST' },
      { name: 'LinkedIn', category: 'social', purpose: 'Professional profile', apiType: 'SDK' },
    ],
    kpis: ['project views', 'contact form submissions', 'time on site', 'social clicks'],
    journeys: [
      {
        id: 'visitor-to-contact',
        name: 'Visitor to Contact',
        role: 'visitor',
        steps: ['view portfolio', 'explore projects', 'read about', 'contact form', 'hire'],
        conversionGoal: 'contact form submission',
      },
    ],
    stagePrompts: {
      'research': 'Focus on portfolio best practices, creative trends, and personal branding.',
      'architecture': 'Design for project showcase, smooth animations, and fast loading.',
      'database': 'Model projects, skills, and testimonials.',
      'api-design': 'Include project CRUD, contact form, and testimonial endpoints.',
      'frontend-design': 'Design for visual impact, smooth transitions, and creative presentation.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'marketplace',
    industry: 'marketplace',
    name: 'Marketplace',
    version: '1.0.0',
    detectionKeywords: ['marketplace', 'multi-vendor', 'seller', 'buyer', 'commission', 'vendor', 'listing fee', 'platform'],
    entities: [
      {
        name: 'Vendor',
        description: 'A marketplace seller',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'storeName', type: 'string', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'commission', type: 'decimal', required: true },
        ],
        relationships: [
          { to: 'Product', type: 'one-to-many' },
        ],
      },
      {
        name: 'Product',
        description: 'A vendor product',
        fields: [
          { name: 'vendorId', type: 'relation', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'decimal', required: true },
          { name: 'category', type: 'string', required: true },
          { name: 'inventory', type: 'integer', required: true },
          { name: 'status', type: 'enum', required: true },
        ],
        relationships: [
          { to: 'Vendor', type: 'many-to-one' },
          { to: 'Order', type: 'one-to-many' },
        ],
      },
      {
        name: 'Order',
        description: 'A marketplace order',
        fields: [
          { name: 'buyerId', type: 'relation', required: true },
          { name: 'vendorId', type: 'relation', required: true },
          { name: 'total', type: 'decimal', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'commission', type: 'decimal', required: true },
        ],
        relationships: [
          { to: 'Vendor', type: 'many-to-one' },
        ],
      },
    ],
    compliance: [
      {
        id: 'seller-protection',
        name: 'Seller Protection',
        description: 'Marketplace seller protection',
        required: true,
        checklist: ['Clear refund policy', 'Dispute resolution', 'Payment protection'],
      },
    ],
    integrations: [
      { name: 'Stripe Connect', category: 'payment', purpose: 'Multi-vendor payments', apiType: 'REST' },
      { name: 'SendGrid', category: 'email', purpose: 'Order notifications', apiType: 'REST' },
    ],
    kpis: ['vendor sign-ups', 'listing count', 'commission revenue', 'buyer retention'],
    journeys: [
      {
        id: 'vendor-onboarding',
        name: 'Vendor Onboarding',
        role: 'vendor',
        steps: ['apply to sell', 'complete profile', 'list product', 'receive order', 'get paid'],
        conversionGoal: 'first sale',
      },
    ],
    stagePrompts: {
      'research': 'Focus on marketplace dynamics, vendor acquisition, and competitive platforms.',
      'architecture': 'Design for multi-vendor support, commission tracking, and escrow.',
      'database': 'Model vendors, products, orders with proper isolation.',
      'api-design': 'Include vendor management, product listing, order processing, payout endpoints.',
      'frontend-design': 'Design for vendor dashboards, product discovery, and trust signals.',
    },
    exampleArtifacts: {},
  },
  {
    id: 'nonprofit',
    industry: 'nonprofit',
    name: 'Nonprofit',
    version: '1.0.0',
    detectionKeywords: ['nonprofit', 'charity', 'donation', 'ngo', 'fundraising', 'volunteer', 'cause', 'community', 'grant'],
    entities: [
      {
        name: 'Donor',
        description: 'A donor or supporter',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'totalDonated', type: 'decimal', required: true },
          { name: 'lastDonationAt', type: 'datetime', required: false },
        ],
        relationships: [
          { to: 'Donation', type: 'one-to-many' },
        ],
      },
      {
        name: 'Donation',
        description: 'A donation record',
        fields: [
          { name: 'donorId', type: 'relation', required: true },
          { name: 'amount', type: 'decimal', required: true },
          { name: 'campaignId', type: 'relation', required: false },
          { name: 'method', type: 'enum', required: true },
          { name: 'status', type: 'enum', required: true },
          { name: 'createdAt', type: 'datetime', required: true },
        ],
        relationships: [
          { to: 'Donor', type: 'many-to-one' },
          { to: 'Campaign', type: 'many-to-one' },
        ],
      },
      {
        name: 'Campaign',
        description: 'A fundraising campaign',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'goal', type: 'decimal', required: true },
          { name: 'raised', type: 'decimal', required: true },
          { name: 'startDate', type: 'datetime', required: true },
          { name: 'endDate', type: 'datetime', required: true },
        ],
        relationships: [
          { to: 'Donation', type: 'one-to-many' },
        ],
      },
    ],
    compliance: [
      {
        id: 'tax-exempt',
        name: 'Tax Exempt Status',
        description: '501(c)(3) compliance',
        required: true,
        checklist: ['Display tax-exempt status', 'Provide receipts', 'Annual reporting'],
      },
    ],
    integrations: [
      { name: 'Stripe', category: 'payment', purpose: 'Donation processing', apiType: 'REST' },
      { name: 'Mailchimp', category: 'email', purpose: 'Donor communications', apiType: 'REST' },
    ],
    kpis: ['donation amount', 'donor retention', 'campaign performance', 'volunteer sign-ups'],
    journeys: [
      {
        id: 'visitor-to-donor',
        name: 'Visitor to Donor',
        role: 'visitor',
        steps: ['discover cause', 'read impact', 'choose campaign', 'make donation', 'share'],
        conversionGoal: 'donation completed',
      },
    ],
    stagePrompts: {
      'research': 'Focus on nonprofit trends, donor psychology, and fundraising campaigns.',
      'architecture': 'Design for donation processing, campaign management, donor relations.',
      'database': 'Model donors, donations, campaigns with reporting.',
      'api-design': 'Include donation processing, campaign management, donor endpoints.',
      'frontend-design': 'Design for emotional impact, trust building, easy donation flow.',
    },
    exampleArtifacts: {},
  },
];

// ─── Industry Detection ───────────────────────────────────────────────────────

function detectIndustryFromManifest(manifest: ProjectManifest): { industry: Industry; confidence: number } {
  const text = `${manifest.description} ${manifest.domain ?? ''} ${manifest.name ?? ''}`.toLowerCase();

  let bestMatch: Industry = 'other';
  let bestScore = 0;

  for (const pack of BUILTIN_PACKS) {
    const score = pack.detectionKeywords.filter(k => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pack.industry;
    }
  }

  const confidence = bestScore >= 3 ? 0.9 : bestScore >= 2 ? 0.7 : bestScore >= 1 ? 0.5 : 0.2;
  return { industry: bestMatch, confidence };
}

async function detectIndustryWithLLM(
  manifest: ProjectManifest,
  llm: LLMAdapterInterface,
): Promise<{ industry: Industry; confidence: number }> {
  const prompt = `Determine the industry for this project.

## Project
Name: ${manifest.name ?? 'unnamed'}
Description: ${manifest.description}
Domain hint: ${manifest.domain ?? 'none'}

## Available industries:
ecommerce, saas, fintech, healthcare, education, restaurant, fitness, real-estate, media, portfolio, marketplace, nonprofit, other

Output JSON:
{
  "industry": "one of the above",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

  const result = await llm.call({
    taskType: 'structured-extraction' as LLMTaskType,
    systemPrompt: 'Classify the project industry. Output only valid JSON.',
    prompt,
    temperature: 0.1,
  });

  try {
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    return {
      industry: (parsed.industry as Industry) || 'other',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch {
    return { industry: 'other', confidence: 0.3 };
  }
}

// ─── BOS Loader ───────────────────────────────────────────────────────────────

export class BOSLoader {
  private packsDir: string;
  private loadedPacks: Map<string, BOSPack> = new Map();

  constructor(packsDir: string) {
    this.packsDir = packsDir;
    // Register built-in packs
    for (const pack of BUILTIN_PACKS) {
      this.loadedPacks.set(pack.id, pack);
    }
  }

  /**
   * Load BOS knowledge for a project. Detects industry and returns
   * the appropriate knowledge pack.
   */
  async load(manifest: ProjectManifest, llm?: LLMAdapterInterface): Promise<BOSContext> {
    // Phase 1: Heuristic detection
    const heuristic = detectIndustryFromManifest(manifest);

    // Phase 2: LLM detection for ambiguous cases
    let industry = heuristic.industry;
    let confidence = heuristic.confidence;

    if (llm && heuristic.confidence < 0.7) {
      const llmResult = await detectIndustryWithLLM(manifest, llm);
      if (llmResult.confidence > heuristic.confidence) {
        industry = llmResult.industry;
        confidence = llmResult.confidence;
      }
    }

    // Load from disk if not a built-in pack
    const pack = this.loadedPacks.get(industry) ?? this.loadFromDisk(industry);

    return {
      pack: pack ?? undefined,
      industry,
      detectionConfidence: confidence,
    };
  }

  /**
   * Get a loaded pack by industry.
   */
  getPack(industry: Industry): BOSPack | undefined {
    return this.loadedPacks.get(industry) ?? this.loadFromDisk(industry);
  }

  /**
   * Get all available industries.
   */
  getAvailableIndustries(): Industry[] {
    return Array.from(this.loadedPacks.keys()) as Industry[];
  }

  /**
   * Register a custom BOS pack.
   */
  registerPack(pack: BOSPack): void {
    this.loadedPacks.set(pack.id, pack);
  }

  /**
   * Get domain-specific prompt injection for a stage.
   */
  getStagePrompt(pack: BOSPack | undefined, stageId: string): string {
    if (!pack) return '';
    return pack.stagePrompts[stageId] ?? '';
  }

  /**
   * Get entity definitions for a pack.
   */
  getEntities(pack: BOSPack | undefined): BOSPack['entities'] {
    return pack?.entities ?? [];
  }

  /**
   * Get compliance requirements for a pack.
   */
  getCompliance(pack: BOSPack | undefined): BOSPack['compliance'] {
    return pack?.compliance ?? [];
  }

  /**
   * Get recommended integrations for a pack.
   */
  getIntegrations(pack: BOSPack | undefined): BOSPack['integrations'] {
    return pack?.integrations ?? [];
  }

  /**
   * Load a pack from disk (custom packs directory).
   */
  private loadFromDisk(industry: string): BOSPack | undefined {
    const packFile = path.join(this.packsDir, industry, 'pack.json');
    if (!fs.existsSync(packFile)) return undefined;
    try {
      const raw = fs.readFileSync(packFile, 'utf-8');
      const pack = JSON.parse(raw) as BOSPack;
      this.loadedPacks.set(pack.id, pack);
      return pack;
    } catch {
      return undefined;
    }
  }
}
