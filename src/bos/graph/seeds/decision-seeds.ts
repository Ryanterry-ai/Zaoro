// ─── Decision Seeds ──────────────────────────────────────────────────────────
//
// Seed data for Decision Engine knowledge graph nodes:
// - Technology stacks per industry
// - LLM provider capabilities
// - Architectural patterns
// ──────────────────────────────────────────────────────────────────────────────

import type {
  BaseNode,
  NodeType,
  EdgeType,
  Edge,
  TechnologyStackNode,
  ProviderCapabilityNode,
  ArchitecturalPatternNode,
} from '../types.js';

// ─── Technology Stack Nodes ──────────────────────────────────────────────────

export const TECHNOLOGY_STACKS: TechnologyStackNode[] = [
  {
    id: 'techstack-ecommerce',
    type: 'TechnologyStack',
    properties: { name: 'E-Commerce Stack', frontend: ['Next.js', 'React', 'Tailwind CSS'], backend: ['Node.js', 'Express'], database: ['PostgreSQL', 'Redis'], hosting: ['Vercel', 'AWS'], industry: 'ecommerce', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-saas',
    type: 'TechnologyStack',
    properties: { name: 'SaaS Stack', frontend: ['Next.js', 'React', 'Tailwind CSS'], backend: ['Node.js', 'tRPC'], database: ['PostgreSQL', 'Redis'], hosting: ['Vercel', 'Railway'], industry: 'saas', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-healthcare',
    type: 'TechnologyStack',
    properties: { name: 'Healthcare Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL'], hosting: ['AWS', 'HIPAA-compliant'], industry: 'healthcare', maturity: 'growth' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-fintech',
    type: 'TechnologyStack',
    properties: { name: 'Fintech Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'NestJS'], database: ['PostgreSQL', 'Redis'], hosting: ['AWS', 'PCI-compliant'], industry: 'fintech', maturity: 'growth' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-education',
    type: 'TechnologyStack',
    properties: { name: 'Education Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL', 'MongoDB'], hosting: ['Vercel', 'AWS'], industry: 'education', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-restaurant',
    type: 'TechnologyStack',
    properties: { name: 'Restaurant Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL'], hosting: ['Vercel'], industry: 'restaurant', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-fitness',
    type: 'TechnologyStack',
    properties: { name: 'Fitness Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL'], hosting: ['Vercel', 'Railway'], industry: 'fitness', maturity: 'growth' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-realestate',
    type: 'TechnologyStack',
    properties: { name: 'Real Estate Stack', frontend: ['Next.js', 'React', 'Mapbox'], backend: ['Node.js', 'Express'], database: ['PostgreSQL', 'Elasticsearch'], hosting: ['Vercel', 'AWS'], industry: 'real-estate', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-media',
    type: 'TechnologyStack',
    properties: { name: 'Media Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL', 'Redis'], hosting: ['Vercel', 'Cloudflare'], industry: 'media', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-portfolio',
    type: 'TechnologyStack',
    properties: { name: 'Portfolio Stack', frontend: ['Next.js', 'React', 'Framer Motion'], backend: ['Node.js'], database: ['PostgreSQL'], hosting: ['Vercel'], industry: 'portfolio', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-marketplace',
    type: 'TechnologyStack',
    properties: { name: 'Marketplace Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL', 'Redis'], hosting: ['Vercel', 'AWS'], industry: 'marketplace', maturity: 'growth' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'techstack-nonprofit',
    type: 'TechnologyStack',
    properties: { name: 'Nonprofit Stack', frontend: ['Next.js', 'React'], backend: ['Node.js', 'Express'], database: ['PostgreSQL'], hosting: ['Vercel'], industry: 'nonprofit', maturity: 'mature' },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
];

// ─── Provider Capability Nodes ───────────────────────────────────────────────

export const PROVIDER_CAPABILITIES: ProviderCapabilityNode[] = [
  {
    id: 'provider-groq',
    type: 'ProviderCapability',
    properties: { provider: 'groq', taskTypes: ['structured-extraction', 'analysis', 'code-generation'], strengths: ['speed', 'cost-efficiency'], latency: 'low', costTier: 'low', maxTokens: 8192 },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'provider-gemini',
    type: 'ProviderCapability',
    properties: { provider: 'gemini', taskTypes: ['structured-extraction', 'analysis', 'creative', 'code-generation', 'planning'], strengths: ['versatility', 'large-context'], latency: 'medium', costTier: 'low', maxTokens: 8192 },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'provider-anthropic',
    type: 'ProviderCapability',
    properties: { provider: 'anthropic', taskTypes: ['analysis', 'creative', 'code-generation', 'review', 'planning'], strengths: ['quality', 'reasoning', 'safety'], latency: 'high', costTier: 'high', maxTokens: 8192 },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'provider-openai',
    type: 'ProviderCapability',
    properties: { provider: 'openai', taskTypes: ['structured-extraction', 'analysis', 'creative', 'code-generation', 'review', 'planning'], strengths: ['versatility', 'json-mode', 'ecosystem'], latency: 'medium', costTier: 'high', maxTokens: 16384 },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
];

// ─── Architectural Pattern Nodes ─────────────────────────────────────────────

export const ARCHITECTURAL_PATTERNS: ArchitecturalPatternNode[] = [
  {
    id: 'pattern-monolith',
    type: 'ArchitecturalPattern',
    properties: { name: 'Monolith', description: 'Single deployable unit with modular internal structure', complexity: 'simple', scalability: 'low', industries: ['portfolio', 'nonprofit', 'restaurant'], components: ['api', 'database', 'auth', 'ui'] },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'pattern-modular-monolith',
    type: 'ArchitecturalPattern',
    properties: { name: 'Modular Monolith', description: 'Single deployable with strict module boundaries', complexity: 'moderate', scalability: 'medium', industries: ['saas', 'ecommerce', 'education', 'media'], components: ['api', 'database', 'auth', 'ui', 'modules'] },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'pattern-microservices',
    type: 'ArchitecturalPattern',
    properties: { name: 'Microservices', description: 'Independent services with API communication', complexity: 'complex', scalability: 'high', industries: ['fintech', 'marketplace'], components: ['api-gateway', 'services', 'database', 'message-queue', 'auth'] },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'pattern-serverless',
    type: 'ArchitecturalPattern',
    properties: { name: 'Serverless', description: 'Function-as-a-service with event-driven architecture', complexity: 'moderate', scalability: 'high', industries: ['saas', 'media', 'portfolio'], components: ['functions', 'api-gateway', 'database', 'auth', 'cdn'] },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
  {
    id: 'pattern-jamstack',
    type: 'ArchitecturalPattern',
    properties: { name: 'Jamstack', description: 'Static generation with API routes and serverless functions', complexity: 'simple', scalability: 'medium', industries: ['portfolio', 'media', 'nonprofit', 'restaurant'], components: ['static-site', 'api-routes', 'database', 'auth', 'cdn'] },
    createdAt: Date.now(), updatedAt: Date.now(),
  },
];

// ─── Edge Seeds ──────────────────────────────────────────────────────────────

export interface SeedEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
}

export const DECISION_SEED_EDGES: SeedEdge[] = [
  ...TECHNOLOGY_STACKS.map(ts => ({
    source: ts.id,
    target: `industry-${ts.properties.industry}`,
    type: 'recommended_for' as EdgeType,
    weight: 0.9,
  })),
  ...ARCHITECTURAL_PATTERNS.flatMap(p =>
    p.properties.industries.map(ind => ({
      source: p.id,
      target: `industry-${ind}`,
      type: 'suited_for' as EdgeType,
      weight: 0.8,
    }))
  ),
];

// ─── Helper ──────────────────────────────────────────────────────────────────

export function isTechnologyStackNode(node: BaseNode): node is TechnologyStackNode {
  return node.type === 'TechnologyStack';
}

export function isProviderCapabilityNode(node: BaseNode): node is ProviderCapabilityNode {
  return node.type === 'ProviderCapability';
}

export function isArchitecturalPatternNode(node: BaseNode): node is ArchitecturalPatternNode {
  return node.type === 'ArchitecturalPattern';
}
