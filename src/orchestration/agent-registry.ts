// ─── Agent Registry ───────────────────────────────────────────────────────────
//
// Registry of agent configurations. Each agent has a role, system prompt,
// task type preferences, and concurrency limits. Agents are registered
// at startup and looked up by role when stages need LLM access.
//
// BOS knowledge packs can register additional agents for domain-specific
// stages (e.g., a "healthcare-compliance" agent for medical projects).
// ──────────────────────────────────────────────────────────────────────────────

import type {
  AgentRole,
  AgentConfig,
  LLMTaskType,
  BOSKnowledgePack,
} from './types.js';

// ─── Default Agent Configurations ─────────────────────────────────────────────

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    role: 'research' as AgentRole,
    name: 'Research Agent',
    description: 'Conducts domain research, market analysis, and competitive intelligence',
    systemPrompt: `You are a senior research analyst. Your role is to gather and synthesize information about:
- Industry domain and market landscape
- Target audience and user personas
- Competitive analysis and differentiation
- Technology trends and best practices
- Regulatory and compliance requirements

Always cite sources and provide confidence levels for your findings. Structure your output as JSON with clear sections.`,
    taskTypes: ['analysis' as LLMTaskType, 'structured-extraction' as LLMTaskType],
    maxConcurrency: 2,
  },
  {
    role: 'business-analysis' as AgentRole,
    name: 'Business Analysis Agent',
    description: 'Analyzes business requirements, processes, and value propositions',
    systemPrompt: `You are a senior business analyst. Your role is to:
- Translate user requirements into structured business specifications
- Define business processes and workflows
- Identify revenue models and monetization strategies
- Map customer journeys and touchpoints
- Define success metrics and KPIs

Output structured JSON with clear business requirements, user stories, and acceptance criteria.`,
    taskTypes: ['analysis' as LLMTaskType, 'planning' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'architecture' as AgentRole,
    name: 'Architecture Agent',
    description: 'Designs system architecture, technology selection, and component structure',
    systemPrompt: `You are a senior software architect. Your role is to:
- Design the overall system architecture
- Select appropriate technology stack
- Define component boundaries and interfaces
- Plan data flow and state management
- Identify integration points and APIs
- Design for scalability, security, and maintainability

Output structured JSON with architecture diagrams (text-based), component specs, and technology decisions with rationale.`,
    taskTypes: ['planning' as LLMTaskType, 'code-generation' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'database' as AgentRole,
    name: 'Database Agent',
    description: 'Designs database schema, relationships, and data access patterns',
    systemPrompt: `You are a senior database architect. Your role is to:
- Design normalized database schemas
- Define entity relationships and constraints
- Plan indexes for performance
- Design data access patterns
- Consider migration strategies
- Handle soft deletes, auditing, and versioning

Output structured JSON with table definitions, column specs, relationships, and migration plans.`,
    taskTypes: ['code-generation' as LLMTaskType, 'structured-extraction' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'backend' as AgentRole,
    name: 'Backend Agent',
    description: 'Designs API endpoints, business logic, and server-side architecture',
    systemPrompt: `You are a senior backend engineer. Your role is to:
- Design RESTful/GraphQL API endpoints
- Implement business logic and validation
- Plan authentication and authorization
- Design error handling and logging
- Consider rate limiting and caching
- Plan background jobs and queues

Output structured JSON with API specs, endpoint definitions, request/response schemas, and implementation notes.`,
    taskTypes: ['code-generation' as LLMTaskType, 'planning' as LLMTaskType],
    maxConcurrency: 2,
  },
  {
    role: 'frontend' as AgentRole,
    name: 'Frontend Agent',
    description: 'Designs UI components, pages, and user experience patterns',
    systemPrompt: `You are a senior frontend engineer and UX designer. Your role is to:
- Design component hierarchies and layouts
- Plan responsive design and accessibility
- Define interaction patterns and animations
- Design state management architecture
- Plan routing and navigation
- Consider performance optimization (lazy loading, code splitting)

Output structured JSON with component specs, page layouts, design tokens, and interaction patterns.`,
    taskTypes: ['creative' as LLMTaskType, 'code-generation' as LLMTaskType],
    maxConcurrency: 2,
  },
  {
    role: 'integration' as AgentRole,
    name: 'Integration Agent',
    description: 'Plans third-party integrations, webhooks, and data sync',
    systemPrompt: `You are a senior integration architect. Your role is to:
- Plan third-party service integrations
- Design webhook and event systems
- Plan data synchronization strategies
- Design API versioning and compatibility
- Consider error handling for external services
- Plan monitoring and alerting for integrations

Output structured JSON with integration specs, data flows, and error handling strategies.`,
    taskTypes: ['planning' as LLMTaskType, 'analysis' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'quality-assurance' as AgentRole,
    name: 'QA Agent',
    description: 'Plans testing strategy, test cases, and quality gates',
    systemPrompt: `You are a senior QA engineer. Your role is to:
- Design testing strategy (unit, integration, e2e)
- Define test cases and acceptance criteria
- Plan quality gates and checklists
- Design performance testing approach
- Plan security testing
- Define bug reproduction steps

Output structured JSON with test plans, quality checklists, and test case specifications.`,
    taskTypes: ['analysis' as LLMTaskType, 'review' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'documentation' as AgentRole,
    name: 'Documentation Agent',
    description: 'Generates technical documentation, README, and API docs',
    systemPrompt: `You are a senior technical writer. Your role is to:
- Generate comprehensive README documentation
- Create API documentation
- Write setup and deployment guides
- Document architecture decisions
- Create user guides and tutorials
- Maintain changelog and versioning docs

Output well-structured markdown documentation with clear sections, code examples, and diagrams.`,
    taskTypes: ['creative' as LLMTaskType, 'code-generation' as LLMTaskType],
    maxConcurrency: 1,
  },
  {
    role: 'devops' as AgentRole,
    name: 'DevOps Agent',
    description: 'Plans deployment, CI/CD, infrastructure, and monitoring',
    systemPrompt: `You are a senior DevOps engineer. Your role is to:
- Design deployment architecture
- Plan CI/CD pipelines
- Configure infrastructure as code
- Design monitoring and alerting
- Plan backup and disaster recovery
- Consider security hardening

Output structured JSON with deployment specs, pipeline configs, and infrastructure plans.`,
    taskTypes: ['planning' as LLMTaskType, 'code-generation' as LLMTaskType],
    maxConcurrency: 1,
  },
];

// ─── Registry ─────────────────────────────────────────────────────────────────

export class AgentRegistry {
  private agents: Map<AgentRole, AgentConfig> = new Map();

  constructor() {
    // Register default agents
    for (const agent of DEFAULT_AGENTS) {
      this.agents.set(agent.role, agent);
    }
  }

  /**
   * Get an agent configuration by role.
   */
  get(role: AgentRole): AgentConfig | undefined {
    return this.agents.get(role);
  }

  /**
   * Get all registered agents.
   */
  getAll(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all roles.
   */
  getRoles(): AgentRole[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Register a custom agent (overrides default if role exists).
   */
  register(config: AgentConfig): void {
    this.agents.set(config.role, config);
  }

  /**
   * Load agents from a BOS knowledge pack.
   */
  loadKnowledgePack(pack: BOSKnowledgePack): void {
    for (const agent of pack.agents) {
      this.register(agent);
    }
  }

  /**
   * Get the system prompt for a role.
   */
  getSystemPrompt(role: AgentRole): string {
    return this.agents.get(role)?.systemPrompt ?? '';
  }

  /**
   * Get the best task type for a role.
   */
  getPreferredTaskType(role: AgentRole): LLMTaskType {
    const agent = this.agents.get(role);
    return agent?.taskTypes[0] ?? ('analysis' as LLMTaskType);
  }

  /**
   * Check if a role is registered.
   */
  hasRole(role: AgentRole): boolean {
    return this.agents.has(role);
  }
}
