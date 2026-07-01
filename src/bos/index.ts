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
];

// ─── BOS Main Class ───────────────────────────────────────────────

export class BOS {
  private graph: KnowledgeGraph;
  private evidenceStore: EvidenceStore;
  private evidenceManager: EvidenceCollectorManager;
  private knowledgeBuilder: KnowledgeBuilder;
  private knowledgeQuery: KnowledgeQuery;
  private reasoningEngine: BusinessReasoningEngine;
  private blueprintCompiler: BlueprintCompiler;

  private constructor() {
    this.graph = new KnowledgeGraph();
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
   */
  get graphInstance(): KnowledgeGraph {
    return this.graph;
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