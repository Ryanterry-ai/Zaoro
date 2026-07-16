// ─── Business Operating System (BOS) ──────────────────────────────
// Three-layer architecture for scalable business knowledge:
//
// Evidence Layer → Knowledge Layer → Reasoning Layer → Generation
//
// Usage:
//   const bos = await BOS.initialize();
//   const { blueprint, reasoning } = await bos.deriveBlueprint(intent);

import { KnowledgeGraph } from './graph/engine.js';
import { EvidenceStore, createEvidenceItem, EVIDENCE_TTL } from './evidence/types.js';
import { EvidenceCollectorManager } from './evidence/collectors.js';
import { KnowledgeBuilder, KnowledgeQuery } from './knowledge/builder.js';
import { BusinessReasoningEngine, BusinessIntent, ReasoningResult } from './reasoning/engine.js';
import { Blueprint, BlueprintCompiler, serializeBlueprint } from './reasoning/blueprint-compiler.js';
import { GraphGovernor } from './graph/governor.js';
import {
  PrimitiveCapability, IndustryTemplate,
} from './knowledge/builder.js';

// ─── Seed Data ────────────────────────────────────────────────────

const PRIMITIVE_CAPABILITIES: PrimitiveCapability[] = [
  // Auth primitives
  { id: 'email-auth', name: 'Email Authentication', description: 'Email/password login', category: 'auth', industryAffinity: ['saas', 'ecommerce', 'healthcare'] },
  { id: 'social-auth', name: 'Social Login', description: 'OAuth social login', category: 'auth', industryAffinity: ['saas', 'ecommerce'] },
  { id: 'rbac', name: 'Role-Based Access', description: 'Role-based access control', category: 'auth', industryAffinity: ['saas', 'healthcare'] },

  // Data primitives
  { id: 'crud', name: 'CRUD Operations', description: 'Basic create/read/update/delete', category: 'data', industryAffinity: ['saas', 'ecommerce', 'healthcare', 'restaurant', 'realestate'] },
  { id: 'search', name: 'Search & Filter', description: 'Full-text search and filtering', category: 'data', industryAffinity: ['ecommerce', 'realestate'] },
  { id: 'analytics', name: 'Analytics Dashboard', description: 'Data visualization and reports', category: 'data', industryAffinity: ['saas', 'ecommerce'] },
  { id: 'export', name: 'Data Export', description: 'CSV/PDF export', category: 'data', industryAffinity: ['saas', 'healthcare'] },

  // UI primitives
  { id: 'hero', name: 'Hero Section', description: 'Main hero/banner', category: 'ui', industryAffinity: ['saas', 'ecommerce', 'restaurant', 'realestate', 'luxury'] },
  { id: 'pricing', name: 'Pricing Table', description: 'Pricing comparison', category: 'ui', industryAffinity: ['saas'] },
  { id: 'testimonials', name: 'Testimonials', description: 'Customer testimonials', category: 'ui', industryAffinity: ['saas', 'ecommerce', 'restaurant'] },
  { id: 'gallery', name: 'Image Gallery', description: 'Photo/video gallery', category: 'ui', industryAffinity: ['restaurant', 'realestate', 'luxury'] },
  { id: 'contact-form', name: 'Contact Form', description: 'Contact/inquiry form', category: 'ui', industryAffinity: ['realestate', 'restaurant', 'healthcare'] },
  { id: 'calendar', name: 'Calendar Booking', description: 'Appointment scheduling', category: 'ui', industryAffinity: ['healthcare', 'restaurant'] },
  { id: 'map', name: 'Map Integration', description: 'Location map', category: 'ui', industryAffinity: ['restaurant', 'realestate'] },

  // Payment primitives
  { id: 'stripe', name: 'Stripe Payments', description: 'Stripe payment processing', category: 'payment', industryAffinity: ['saas', 'ecommerce', 'restaurant'] },
  { id: 'subscriptions', name: 'Subscription Billing', description: 'Recurring billing', category: 'payment', industryAffinity: ['saas'] },
  { id: 'inventory', name: 'Inventory Management', description: 'Stock tracking', category: 'payment', industryAffinity: ['ecommerce', 'restaurant'] },

  // Notification primitives
  { id: 'email-notif', name: 'Email Notifications', description: 'Transactional emails', category: 'notification', industryAffinity: ['saas', 'ecommerce', 'healthcare'] },
  { id: 'sms-notif', name: 'SMS Notifications', description: 'SMS alerts', category: 'notification', industryAffinity: ['healthcare', 'restaurant'] },
  { id: 'push-notif', name: 'Push Notifications', description: 'Browser push notifications', category: 'notification', industryAffinity: ['saas', 'ecommerce'] },

  // Compliance primitives
  { id: 'gdpr', name: 'GDPR Compliance', description: 'Data privacy compliance', category: 'compliance', industryAffinity: ['saas', 'ecommerce', 'healthcare'] },
  { id: 'hipaa', name: 'HIPAA Compliance', description: 'Healthcare data compliance', category: 'compliance', industryAffinity: ['healthcare'] },
  { id: 'pci', name: 'PCI Compliance', description: 'Payment card compliance', category: 'compliance', industryAffinity: ['ecommerce'] },
];

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Software as a Service application',
    primitives: ['email-auth', 'social-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'hero', 'pricing', 'testimonials', 'stripe', 'subscriptions', 'email-notif', 'push-notif', 'gdpr'],
    vocabulary: { product: 'platform', buy: 'subscribe', cart: 'subscription', price: 'plan' },
    requiredFeatures: ['Dashboard', 'Settings', 'Billing'],
    optionalFeatures: ['Integrations', 'API', 'Webhooks'],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store',
    primitives: ['email-auth', 'social-auth', 'crud', 'search', 'gallery', 'stripe', 'inventory', 'email-notif', 'gdpr', 'pci'],
    vocabulary: { product: 'item', buy: 'purchase', cart: 'basket', price: 'cost' },
    requiredFeatures: ['Product Catalog', 'Shopping Cart', 'Checkout'],
    optionalFeatures: ['Wishlist', 'Reviews', 'Loyalty'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical/dental practice',
    primitives: ['email-auth', 'rbac', 'crud', 'calendar', 'contact-form', 'email-notif', 'sms-notif', 'hipaa', 'gdpr'],
    vocabulary: { product: 'service', buy: 'book', customer: 'patient', order: 'appointment' },
    requiredFeatures: ['Appointment Booking', 'Patient Portal', 'Medical Records'],
    optionalFeatures: ['Telehealth', 'Prescriptions', 'Billing'],
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Food service business',
    primitives: ['email-auth', 'gallery', 'contact-form', 'map', 'calendar', 'email-notif', 'sms-notif'],
    vocabulary: { product: 'dish', buy: 'order', customer: 'guest', price: 'menu_price' },
    requiredFeatures: ['Menu', 'Reservations', 'Online Ordering'],
    optionalFeatures: ['Delivery', 'Loyalty', 'Catering'],
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Property business',
    primitives: ['email-auth', 'search', 'gallery', 'contact-form', 'map', 'email-notif'],
    vocabulary: { product: 'property', buy: 'inquire', customer: 'buyer', price: 'listing_price' },
    requiredFeatures: ['Property Listings', 'Search & Filter', 'Agent Contact'],
    optionalFeatures: ['Virtual Tours', 'Mortgage Calculator', 'Saved Searches'],
  },
  {
    id: 'luxury',
    name: 'Luxury Retail',
    description: 'Premium/luxury brand',
    primitives: ['email-auth', 'gallery', 'testimonials', 'contact-form', 'stripe', 'email-notif'],
    vocabulary: { product: 'timepiece', buy: 'acquire', store: 'atelier', price: 'investment' },
    requiredFeatures: ['Product Showcase', 'Brand Story', 'Private Shopping'],
    optionalFeatures: ['Concierge', 'Appointments', 'VIP Access'],
  },
  // ── Enterprise Templates (Phase 2 sync) ──
  {
    id: 'hospital',
    name: 'Hospital Management',
    description: 'Full hospital ERP with patient management, appointments, wards, pharmacy, lab, billing',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'calendar', 'analytics', 'email-notif', 'sms-notif', 'export', 'hipaa', 'gdpr'],
    vocabulary: { Customer: 'Patient', User: 'Staff', Product: 'Medicine', Order: 'Prescription' },
    requiredFeatures: ['Patient Registry', 'Appointment Booking', 'Doctor Directory', 'Pharmacy', 'Billing'],
    optionalFeatures: ['Lab Reports', 'Ward Management', 'Insurance', 'Telehealth'],
  },
  {
    id: 'education',
    name: 'Education / School Management',
    description: 'School administration with students, classes, teachers, attendance, exams, fees',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'email-notif'],
    vocabulary: { Customer: 'Student', User: 'Teacher', Product: 'Course', Order: 'Admission' },
    requiredFeatures: ['Student Registry', 'Class Management', 'Attendance', 'Exams & Grades', 'Fees'],
    optionalFeatures: ['Timetable', 'Parent Portal', 'Transport', 'Library'],
  },
  {
    id: 'logistics',
    name: 'Logistics & Fleet Management',
    description: 'End-to-end logistics with shipment management, driver tracking, route optimization',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'map', 'export', 'email-notif', 'sms-notif'],
    vocabulary: { Customer: 'Client', User: 'Driver', Product: 'Shipment', Order: 'Trip' },
    requiredFeatures: ['Shipment Tracking', 'Driver Management', 'Route Planning', 'Live Tracking', 'Reports'],
    optionalFeatures: ['Warehouse Management', 'POD Upload', 'Customer Portal', 'Fleet Analytics'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing ERP',
    description: 'Production-focused ERP with work orders, BOM, scheduling, quality control, machine management',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'email-notif'],
    vocabulary: { Customer: 'Client', User: 'Operator', Product: 'Finished Good', Order: 'Work Order' },
    requiredFeatures: ['Work Orders', 'Production Log', 'Raw Material Inventory', 'Quality Control', 'Reports'],
    optionalFeatures: ['Machine Management', 'BOM Viewer', 'Shift Management', 'Maintenance'],
  },
  {
    id: 'enterprise-erp',
    name: 'Enterprise ERP',
    description: 'Full-stack ERP with inventory, procurement, finance, HR, and reporting modules',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'email-notif', 'gdpr'],
    vocabulary: { Customer: 'Account', User: 'Employee', Product: 'Item', Order: 'Purchase Order' },
    requiredFeatures: ['Dashboard', 'Inventory', 'Procurement', 'Finance', 'HR', 'CRM', 'Reports'],
    optionalFeatures: ['Settings', 'Audit Trail', 'Multi-company', 'Integrations'],
  },
  {
    id: 'hrm',
    name: 'Human Resource Management',
    description: 'Complete HRMS with employee master, attendance, leave, payroll, recruitment, performance',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'email-notif'],
    vocabulary: { Customer: 'Employee', User: 'HR Admin', Product: 'Position', Order: 'Leave Request' },
    requiredFeatures: ['Employee Directory', 'Attendance', 'Leave Management', 'Payroll', 'Recruitment'],
    optionalFeatures: ['Performance Reviews', 'Training', 'Asset Management', 'Timesheets'],
  },
  {
    id: 'crm',
    name: 'Enterprise CRM',
    description: 'Full-featured CRM with lead management, pipeline, accounts, contacts, and sales reporting',
    primitives: ['email-auth', 'rbac', 'crud', 'search', 'analytics', 'export', 'email-notif'],
    vocabulary: { Customer: 'Account', User: 'Sales Rep', Product: 'Deal', Order: 'Proposal' },
    requiredFeatures: ['Dashboard', 'Leads', 'Pipeline', 'Accounts', 'Contacts', 'Reports'],
    optionalFeatures: ['Tasks', 'Email Integration', 'Settings', 'Forecasting'],
  },
];

// ─── BOS Main Class ───────────────────────────────────────────────

export class BOS {
  private graph: KnowledgeGraph;
  private governor: GraphGovernor;
  private evidenceStore: EvidenceStore;
  private evidenceManager: EvidenceCollectorManager;
  private knowledgeBuilder: KnowledgeBuilder;
  private knowledgeQuery: KnowledgeQuery;
  private reasoningEngine: BusinessReasoningEngine;
  private blueprintCompiler: BlueprintCompiler;

  private constructor() {
    this.graph = new KnowledgeGraph();
    this.governor = new GraphGovernor(this.graph);
    this.evidenceStore = new EvidenceStore();
    this.evidenceManager = new EvidenceCollectorManager(this.evidenceStore);
    this.knowledgeBuilder = new KnowledgeBuilder(this.graph, this.evidenceStore);
    this.knowledgeQuery = new KnowledgeQuery(this.graph);
    this.reasoningEngine = new BusinessReasoningEngine(this.graph);
    this.blueprintCompiler = new BlueprintCompiler();
  }

  /**
   * Initialize BOS with seed data
   */
  static async initialize(): Promise<BOS> {
    const bos = new BOS();
    await bos.knowledgeBuilder.buildFromSeeds(PRIMITIVE_CAPABILITIES, INDUSTRY_TEMPLATES);
    console.log(`[BOS] Initialized with ${bos.graph.stats().nodes} nodes and ${bos.graph.stats().edges} edges`);
    return bos;
  }

  /**
   * Derive a blueprint from business intent
   * This is the main entry point for the Reasoning Layer
   */
  async deriveBlueprint(intent: BusinessIntent): Promise<ReasoningResult> {
    return this.reasoningEngine.deriveBlueprint(intent);
  }

  /**
   * Collect evidence from a URL (Evidence Layer)
   * Note: This is an offline operation, not called during generation
   */
  async collectEvidence(url: string): Promise<void> {
    await this.evidenceManager.collect('scrape', url);
  }

  /**
   * Get knowledge graph query interface
   */
  get knowledge(): KnowledgeQuery {
    return this.knowledgeQuery;
  }

  /**
   * Get raw knowledge graph
   * @deprecated Use `graph` (the immutable runtime view) or the Promotion
   * Pipeline via `governor` to update it. The Business Graph is immutable at
   * runtime; this getter returns the read-only proxy.
   */
  get graphInstance(): KnowledgeGraph {
    return this.governor.getReadonlyGraph();
  }

  /**
   * The governor is the only runtime path that may mutate the Business Graph.
   */
  get governorInstance(): GraphGovernor {
    return this.governor;
  }

  /**
   * Get evidence store
   */
  get evidence(): EvidenceStore {
    return this.evidenceStore;
  }

  /**
   * Get statistics
   */
  stats(): {
    graph: { nodes: number; edges: number; byType: Record<string, number> };
    evidence: { total: number; byType: Record<string, number>; byStatus: Record<string, number> };
  } {
    return {
      graph: this.graph.stats(),
      evidence: this.evidenceStore.stats(),
    };
  }
}

// ─── Convenience Exports ──────────────────────────────────────────

export { KnowledgeGraph } from './graph/engine.js';
export { KnowledgeBuilder, KnowledgeQuery } from './knowledge/builder.js';
export { EvidenceStore } from './evidence/types.js';
export { EvidenceCollectorManager } from './evidence/collectors.js';
export { BusinessReasoningEngine } from './reasoning/engine.js';
export { BlueprintCompiler, serializeBlueprint, deserializeBlueprint } from './reasoning/blueprint-compiler.js';

export type { Blueprint, BlueprintInput } from './reasoning/blueprint-compiler.js';
export type { BusinessIntent, ReasoningResult } from './reasoning/engine.js';
export type { PrimitiveCapability, IndustryTemplate } from './knowledge/builder.js';
export { runNormalizedPipeline } from './pipeline-v2/pipeline.js';
export type { PipelineResult } from './pipeline-v2/pipeline.js';
export type { StageInput, StageOutput, PipelineEvent } from './pipeline-v2/stages.js';
export type {
  CapabilityGraph, CapabilityNode,
  EntityGraph, EntityDef,
  WorkflowGraph, WorkflowDef,
  NavigationGraph, PageDef,
  DatabaseGraph, TableDef,
  APIGraph, EndpointDef,
} from './pipeline-v2/stages.js';