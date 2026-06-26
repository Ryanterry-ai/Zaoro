// ─── Knowledge Graph Core ─────────────────────────────────────────
// Fundamental graph data structure for representing business knowledge.
// Supports nodes, edges, properties, and typed relationships.
//
// Design Principles:
// - Typed nodes with properties (no untyped bags)
// - Typed edges with direction and weight
// - Composition over inheritance (500+ industries via primitives)
// - Query-first design (patterns, traversal, aggregation)

// ─── Node Types ───────────────────────────────────────────────────

/** Unique identifier for graph nodes */
export type NodeId = string;

/** Base node interface — all nodes extend this */
export interface BaseNode {
  id: NodeId;
  type: NodeType;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** All supported node types in the knowledge graph */
export type NodeType =
  | 'Industry'        // Top-level industry (SaaS, E-commerce, Healthcare)
  | 'SubIndustry'     // Specific vertical within industry (Dental, Restaurant)
  | 'Capability'      // What the system can do (auth, payments, notifications)
  | 'Feature'         // Concrete feature (user-dashboard, product-catalog)
  | 'Workflow'        // Business process (checkout-flow, patient-intake)
  | 'Entity'          // Domain object (User, Product, Order, Appointment)
  | 'UISection'       // Page section (hero, pricing, testimonials)
  | 'Component'       // UI component (button, modal, form, table)
  | 'Service'         // Backend service (payment-gateway, email-service)
  | 'DataStore'       // Database or storage (postgres, redis, s3)
  | 'Integration'     // Third-party integration (stripe, sendgrid, twilio)
  | 'ComplianceRule'  // Regulatory requirement (gdpr, hipaa, pci)
  | 'RevenueModel'    // Business model (subscription, marketplace, freemium)
  | 'Vocabulary'      // Term mapping (product→timepiece for luxury)
  | 'DesignPattern'   // Visual/interaction pattern (minimal, bold, corporate)
  | 'Primitive';      // Atomic building block (compose into higher-level nodes)

// ─── Typed Node Interfaces ────────────────────────────────────────

export interface IndustryNode extends BaseNode {
  type: 'Industry';
  properties: {
    name: string;                    // "SaaS", "E-Commerce"
    slug: string;                    // "saas", "ecommerce"
    description: string;
    maturity: 'emerging' | 'growth' | 'mature' | 'declining';
    tags: string[];
    compositionPrimitives: NodeId[]; // Primitive nodes that compose this industry
  };
}

export interface SubIndustryNode extends BaseNode {
  type: 'SubIndustry';
  properties: {
    name: string;                    // "Dental Clinic", "Fine Dining"
    slug: string;                    // "dental", "fine-dining"
    parentIndustry: NodeId;          // Reference to Industry node
    description: string;
    tags: string[];
    compositionPrimitives: NodeId[];
  };
}

export interface CapabilityNode extends BaseNode {
  type: 'Capability';
  properties: {
    name: string;                    // "Authentication", "Payments"
    slug: string;                    // "auth", "payments"
    description: string;
    category: 'core' | 'enhancement' | 'integration' | 'compliance';
    complexity: 'simple' | 'moderate' | 'complex';
    requiredPrimitives: NodeId[];    // Primitives needed to implement
    optionalPrimitives: NodeId[];
  };
}

export interface FeatureNode extends BaseNode {
  type: 'Feature';
  properties: {
    name: string;                    // "User Dashboard", "Product Catalog"
    slug: string;                    // "user-dashboard", "product-catalog"
    description: string;
    capability: NodeId;              // Parent capability
    uiSections: NodeId[];            // UI sections needed
    components: NodeId[];            // Components needed
    workflows: NodeId[];             // Workflows involved
    priority: 'must_have' | 'should_have' | 'nice_to_have';
  };
}

export interface WorkflowNode extends BaseNode {
  type: 'Workflow';
  properties: {
    name: string;                    // "Checkout Flow", "Patient Intake"
    slug: string;
    description: string;
    steps: WorkflowStep[];
    entities: NodeId[];              // Entities involved
    services: NodeId[];              // Services involved
    triggers: string[];              // What initiates this workflow
  };
}

export interface WorkflowStep {
  name: string;
  action: string;
  entity?: NodeId;
  service?: NodeId;
  conditional?: string;
}

export interface EntityNode extends BaseNode {
  type: 'Entity';
  properties: {
    name: string;                    // "User", "Product", "Order"
    slug: string;
    description: string;
    fields: EntityField[];
    relationships: EntityRelationship[];
    uiSections: NodeId[];            // Sections that display this entity
    workflows: NodeId[];             // Workflows involving this entity
  };
}

export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
  required: boolean;
  indexed: boolean;
  description?: string;
}

export interface EntityRelationship {
  target: NodeId;
  type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
  foreignKey?: string;
}

export interface UISectionNode extends BaseNode {
  type: 'UISection';
  properties: {
    name: string;                    // "Hero", "Pricing", "Testimonials"
    slug: string;
    description: string;
    category: 'hero' | 'content' | 'conversion' | 'navigation' | 'social' | 'form';
    components: NodeId[];
    layout: 'full' | 'split' | 'grid' | 'card' | 'list';
    required: boolean;
  };
}

export interface ComponentNode extends BaseNode {
  type: 'Component';
  properties: {
    name: string;                    // "Button", "Modal", "Form"
    slug: string;
    description: string;
    category: 'input' | 'display' | 'layout' | 'navigation' | 'feedback' | 'data';
    primitives: NodeId[];            // Primitives that implement this
    variants: string[];              // Size, color, state variants
  };
}

export interface VocabularyNode extends BaseNode {
  type: 'Vocabulary';
  properties: {
    original: string;                // "product"
    replacement: string;             // "timepiece"
    context: string;                 // When to apply this replacement
    industries: NodeId[];            // Which industries use this mapping
  };
}

export interface PrimitiveNode extends BaseNode {
  type: 'Primitive';
  properties: {
    name: string;                    // "Email Authentication", "CRUD Operations"
    slug: string;                    // "email-auth", "crud"
    description: string;
    category: 'auth' | 'data' | 'ui' | 'payment' | 'notification' | 'integration' | 'compliance' | 'analytics';
    industryAffinity: string[];      // Industries that commonly use this primitive
  };
}

// ─── Edge Types ───────────────────────────────────────────────────

export type EdgeType =
  | 'contains'       // A contains B (Industry → Capability)
  | 'requires'       // A requires B (Feature → Capability)
  | 'implements'     // A implements B (Component → Feature)
  | 'uses'           // A uses B (Workflow → Entity)
  | 'triggers'       // A triggers B (Workflow → Workflow)
  | 'displays'       // A displays B (UISection → Entity)
  | 'composes'       // A is composed of B's (Industry → Primitive)
  | 'extends'        // A extends B (SubIndustry → Industry)
  | 'depends_on'     // A depends on B (Service → DataStore)
  | 'overrides'      // A overrides B (Vocabulary → default term)
  | 'related_to';    // General relationship

export interface Edge {
  id: string;
  source: NodeId;
  target: NodeId;
  type: EdgeType;
  weight: number;         // 0-1, strength of relationship
  properties: Record<string, unknown>;
  createdAt: number;
}

// ─── Graph Query Patterns ─────────────────────────────────────────

export interface NodeQuery {
  type?: NodeType | NodeType[];
  properties?: Partial<Record<string, unknown>>;
  limit?: number;
  offset?: number;
}

export interface EdgeQuery {
  source?: NodeId;
  target?: NodeId;
  type?: EdgeType | EdgeType[];
  minWeight?: number;
  limit?: number;
}

export interface TraversalQuery {
  startNode: NodeId;
  edgeTypes: EdgeType[];
  direction: 'outgoing' | 'incoming' | 'both';
  maxDepth: number;
  nodeFilter?: NodeType[];
  limit?: number;
}

export interface PatternQuery {
  nodes: Array<{ variable: string; type: NodeType }>;
  edges: Array<{
    from: string;
    to: string;
    type: EdgeType;
    direction?: 'outgoing' | 'incoming';
  }>;
  where?: Record<string, unknown>;
  limit?: number;
}