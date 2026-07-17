/**
 * Business Intelligence Engine — Canonical Model
 * ===============================================
 *
 * This module is the SINGLE SOURCE OF TRUTH for everything the engine knows
 * about a business. It is deliberately VERTICAL-AGNOSTIC: it reasons about a
 * business in terms of orthogonal primitives (workflows, customer roles, goals,
 * revenue, compliance, …) rather than matching keywords to a fixed list of
 * industries/templates.
 *
 * No downstream layer (Knowledge Acquisition, Content Intelligence, Design
 * Intelligence, Experience Intelligence, Technology Planner, Blueprint
 * Generator, Renderer) infers business logic. They all read `BusinessKnowledge`.
 *
 * The engine understands "Coffee Shop" instead of "Restaurant" by composing a
 * business-type descriptor from primitive signals — never by looking up a
 * "coffee" template.
 *
 * Ownership boundaries
 * --------------------
 * - BusinessDiscovery   : WHAT the business is (intent, type, domain, signals)
 * - BusinessKnowledge   : the full aggregated understanding (single authority)
 * - CustomerJourney     : how customers move through the business
 * - BusinessWorkflow    : operational + customer-facing processes
 * - RevenueFlow         : how money moves
 * - ExperienceGoals     : desired emotional / interaction outcomes
 * - BusinessVocabulary  : term mapping (generic -> domain)
 * - BusinessEntities    : data model
 *
 * Future knowledge sources (OpenClaw Ultra Scraper, uploads, screenshots, APIs,
 * databases, Figma, websites, MCP tools, research agents) plug in via
 * `KnowledgeSource` and feed the same model. No consumer knows the origin.
 */

// ─── Knowledge source (extensibility boundary) ──────────────────────────────

export type KnowledgeSourceType =
  | 'prompt'
  | 'openclaw-scraper'
  | 'upload'
  | 'screenshot'
  | 'api'
  | 'database'
  | 'figma'
  | 'website'
  | 'mcp'
  | 'research-agent';

export interface KnowledgeSource {
  type: KnowledgeSourceType;
  /** Human label, e.g. "OpenClaw Ultra Scraper — competitor analysis" */
  label: string;
  /** Confidence 0..1 of the signal derived from this source */
  confidence: number;
  /** Opaque provenance token (url, file id, tool call id) */
  ref?: string;
}

// ─── Discovery: WHAT the business is ────────────────────────────────────────

export interface BusinessDiscovery {
  /** One-line intent extracted from the prompt */
  intent: string;

  /**
   * Composed business-type descriptor, e.g. "Specialty Coffee Cafe".
   * Built from primitive signals + the user's own domain noun — never a
   * hardcoded vertical template.
   */
  businessType: string;

  /**
   * Broad category derived from product-nature primitives, e.g.
   * "food-and-beverage" | "retail" | "services" | "software" | "media" |
   * "nonprofit". Deliberately coarse — replaces fragile "industry" enums.
   */
  industry: string;

  /** Refinement of industry from signals, e.g. "cafe" | "roastery" | "clinic" */
  subIndustry?: string;

  /** Narrow positioning, e.g. "subscription" | "wholesale" | "marketplace" */
  niche?: string;

  /** Conceptual domain, e.g. "beverages", "health", "education" */
  domain: string;

  /** Raw primitive signals that produced this understanding (auditable) */
  signals: DiscoveredSignal[];
}

export interface DiscoveredSignal {
  dimension: SignalDimension;
  value: string;
  weight: number;
  source: KnowledgeSourceType;
}

export type SignalDimension =
  | 'product-nature'
  | 'channel'
  | 'fulfillment'
  | 'monetization'
  | 'audience'
  | 'goal'
  | 'quality'
  | 'locale'
  // ── Intent dimensions (signal-derived, vertical-agnostic) ──
  // These capture WHAT the user wants the experience to DO / FEEL, derived
  // purely from prompt cues. They replace any need for industry→experience
  // templates. A headphone brand and a funeral home both express an emotional
  // intent; only the signal values differ.
  | 'experience-intent'
  | 'interaction-intent'
  | 'motion-intent'
  | 'conversion-intent'
  | 'emotional-intent'
  | 'content-intent';

/**
 * Explicit, structured intents extracted from ANY prompt. Every downstream
 * layer (Creative Strategy, Experience Compiler, Renderer, Verification Loop)
 * reads these instead of inferring business logic from an industry label.
 */
export interface BusinessIntents {
  /** High-level experience shape, e.g. "immersive-scroll" | "utility" | "editorial" */
  experience: string[];
  /** Interaction patterns requested, e.g. "configurator" | "builder" | "booking" | "quiz" | "calculator" | "hud" */
  interaction: string[];
  /** Motion language demanded, e.g. "scroll-driven" | "calm" | "energetic" | "cinematic" */
  motion: string[];
  /** Conversion mechanics, e.g. "checkout" | "lead-form" | "booking" | "subscribe" */
  conversion: string[];
  /** Emotional arc, e.g. "chaos-to-calm" | "trust" | "excitement" | "serenity" */
  emotional: string[];
  /** Content posture, e.g. "storytelling" | "minimal" | "educational" | "bold" */
  content: string[];
}

// ─── People: personas, roles ────────────────────────────────────────────────

export interface CustomerPersona {
  id: string;
  /** Human label, composed from role + segment, e.g. "Walk-in guest" */
  label: string;
  /** Generic role primitive, e.g. "guest" | "member" | "client" */
  role: string;
  /** What they want (derived from goals) */
  needs: string[];
  /** What blocks them (derived) */
  friction: string[];
  /** Acquisition + retention signals relevant to them */
  lifecycle: 'acquire' | 'activate' | 'retain' | 'advocate';
}

export interface BusinessPersona {
  id: string;
  label: string;
  role: 'owner' | 'admin' | 'staff' | 'operator';
  responsibilities: string[];
}

export interface UserRole {
  id: string;
  label: string;
  /** permission tier */
  tier: 'public' | 'authenticated' | 'member' | 'staff' | 'admin';
  capabilities: string[];
}

// ─── Journey + workflow ─────────────────────────────────────────────────────

export type JourneyStageName =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'onboarding'
  | 'retention'
  | 'advocacy';

export interface JourneyStage {
  stage: JourneyStageName;
  /** What the customer is doing here */
  action: string;
  /** Workflows active in this stage */
  workflows: string[];
  /** Emotional target (feeds Experience Intelligence) */
  emotionalTarget: string;
}

export interface CustomerJourney {
  stages: JourneyStage[];
  /** Loops, e.g. "purchase -> retention -> repurchase" */
  loops: string[];
}

export interface BusinessWorkflow {
  id: string;
  /** Primitive workflow kind, e.g. "cart-checkout" | "booking" | "content-publishing" */
  kind: string;
  /** customer-facing or operational */
  scope: 'customer' | 'operational';
  description: string;
  /** Steps derived from primitives */
  steps: string[];
  automationCandidate: boolean;
}

// ─── Revenue ────────────────────────────────────────────────────────────────

export interface RevenueFlow {
  model: string; // one-time | subscription | service-fee | marketplace-take-rate | advertising | donation | freemium
  /** Where revenue originates */
  source: string;
  /** Pricing shape */
  pricing: PricingModel;
  /** Payment mechanics */
  payment: PaymentFlow;
  /** Estimated primary currency / region */
  currency: string;
}

export interface PricingModel {
  structure: 'flat' | 'tiered' | 'usage-based' | 'per-seat' | 'bundle' | 'custom';
  tiers?: Array<{ name: string; price: string; includes: string[] }>;
}

export interface PaymentFlow {
  methods: string[];
  /** Checkout steps */
  steps: string[];
  /** Compliance-gated behaviours, e.g. PCI scope */
  considerations: string[];
}

// ─── Growth ─────────────────────────────────────────────────────────────────

export interface AcquisitionChannel {
  channel: string; // seo | social | referral | paid-ads | email | marketplace | direct
  rationale: string;
}

export interface RetentionModel {
  strategy: string; // loyalty | subscription | email-nurture | community | none
  mechanisms: string[];
}

// ─── Compliance / KPIs ──────────────────────────────────────────────────────

export interface ComplianceRequirement {
  pack: string; // compliance.fssai | compliance.gdpr | compliance.pci-dss | compliance.hipaa | compliance.soc2 | accessibility
  trigger: string; // why it applies (primitive-based, not vertical)
  severity: 'required' | 'recommended';
}

export interface Kpi {
  name: string;
  /** business question it answers */
  question: string;
  /** dashboard it belongs to */
  dashboard: string;
}

// ─── Data model ─────────────────────────────────────────────────────────────

export interface BusinessEntity {
  name: string;
  /** generic archetype, e.g. "User" | "Order" | "Product" | "Booking" | "Content" */
  archetype: string;
  fields: string[];
  /** relationships expressed as strings, e.g. "User places Order" */
  relationships: string[];
}

export interface EntityRelationship {
  from: string;
  to: string;
  type: 'one-to-many' | 'many-to-many' | 'one-to-one';
  label: string;
}

// ─── Required surfaces ───────────────────────────────────────────────────────

export interface RequiredPage {
  path: string;
  purpose: string;
  /** workflows this page fulfils */
  workflows: string[];
}

export interface RequiredDashboard {
  id: string;
  audience: 'owner' | 'staff' | 'admin';
  widgets: string[];
}

// ─── Automations + integrations ─────────────────────────────────────────────

export interface Automation {
  id: string;
  trigger: string;
  action: string;
  channel: string;
}

export interface Integration {
  category: string; // payments | email | analytics | crm | storage | auth | search
  /** provider-agnostic requirement; concrete provider chosen by Tech Planner */
  requirement: string;
  required: boolean;
}

// ─── Vocabulary / strategy ──────────────────────────────────────────────────

export interface BusinessVocabulary {
  /** generic term -> domain term, e.g. { "product": "menu item" } */
  terms: Record<string, string>;
  /** domain nouns extracted from the user's own prompt (their words, not ours) */
  domainNouns: string[];
  /** tone of voice derived from goals + quality signals */
  tone: string[];
}

export interface ContentStrategy {
  pillars: string[];
  formats: string[];
  cadence: string;
  voice: string;
}

export interface DesignStrategy {
  /** abstract direction, not a hardcoded palette */
  direction: string;
  density: 'minimal' | 'balanced' | 'rich';
  emphasis: string[];
}

export interface ExperienceGoals {
  /** emotional arc the Experience Intelligence layer should realise */
  arc: string[];
  interactionDensity: 'calm' | 'moderate' | 'energetic';
  motionLanguage: string[];
  /** primary feeling per stage (handed to Experience Intelligence) */
  perStage: Record<string, string>;
}

// ─── The single authority ───────────────────────────────────────────────────

export interface BusinessKnowledge {
  /** Schema version for migrations */
  version: string;
  /** Provenance of every signal */
  sources: KnowledgeSource[];

  discovery: BusinessDiscovery;

  // People
  customerPersonas: CustomerPersona[];
  businessPersonas: BusinessPersona[];
  userRoles: UserRole[];

  // Flow
  customerJourney: CustomerJourney;
  workflows: BusinessWorkflow[];

  // Money
  revenue: RevenueFlow;

  // Growth
  acquisition: AcquisitionChannel[];
  retention: RetentionModel;

  // Guardrails
  compliance: ComplianceRequirement[];
  kpis: Kpi[];

  // Data
  entities: BusinessEntity[];
  relationships: EntityRelationship[];

  // Surfaces
  pages: RequiredPage[];
  dashboards: RequiredDashboard[];

  // Ops
  automations: Automation[];
  integrations: Integration[];

  // Language + strategy
  vocabulary: BusinessVocabulary;
  contentStrategy: ContentStrategy;
  designStrategy: DesignStrategy;
  experienceGoals: ExperienceGoals;

  /**
   * Explicit signal-derived intents. The single contract the Experience
   * Compiler, Renderer, and Verification Loop reason from. No industry label
   * is ever read downstream — only these primitives.
   */
  intents: BusinessIntents;

  /**
   * Live evidence collected by the Knowledge Acquisition layer (web research,
   * competitor analysis). Optional — absent when acquisition is offline.
   */
  evidence?: import('../knowledge-acquisition/types.js').EvidenceCollection;

  /**
   * The original user prompt that produced this understanding. Carried so the
   * Knowledge Acquisition layer can mine explicit reference URLs / brand terms
   * from the user's own words. Never used for branching — signal extraction
   * only.
   */
  originalPrompt?: string;

  /**
   * Reference material the user supplied alongside the prompt: a reference
   * website to learn real tokens/assets from, attached images (brand boards,
   * screenshots, mood references), and requirement documents (briefs, specs,
   * PDFs). Consumed by the Knowledge Acquisition layer as evidence — never as
   * a substitute for signal extraction. Text extracted from documents is
   * merged into BusinessKnowledge without bias.
   */
  references?: ReferenceInputs;
}

/**
 * Anything the user attaches to ground the build in reality: a live reference
 * site, images, or documents. All optional; the engine degrades gracefully
 * when none are present (pure signal-driven generation).
 */
export interface ReferenceInputs {
  /** Reference website URLs to scrape real tokens/assets/brand signals from. */
  referenceUrls?: string[];
  /** Local filesystem paths to attached images (brand boards, screenshots). */
  images?: string[];
  /** Local filesystem paths to requirement documents (briefs, specs, PDFs). */
  documents?: string[];
}

/** Input to the engine. Minimal today (prompt); extensible tomorrow. */
export interface BusinessIntelligenceInput {
  prompt: string;
  /** Pre-existing context (e.g. scraped content) merged in without bias */
  prior?: Partial<BusinessKnowledge>;
  /** Declared knowledge sources (future: OpenClaw, uploads, …) */
  sources?: KnowledgeSource[];
}

/**
 * Structural view of any context that may carry a BusinessKnowledge.
 * Kept loose so legacy BREContext (defined elsewhere) satisfies it without
 * a hard import cycle.
 */
export interface BREContextLike {
  businessKnowledge?: BusinessKnowledge;
  [key: string]: unknown;
}
