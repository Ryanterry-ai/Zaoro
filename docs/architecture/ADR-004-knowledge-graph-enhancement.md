# ADR-004: Knowledge Graph Enhancement

## Status

Accepted

## Context

The existing `bos/graph/` knowledge graph has 18 node types and 14 edge types covering industry knowledge, capabilities, entities, and UI patterns. The Decision Engine needs additional graph structure to make technology recommendations, provider selection, and architectural pattern matching.

## Decision

Extend the existing knowledge graph with 3 new node types and 3 new edge types, plus seed data for technology stacks, LLM provider capabilities, and architectural patterns.

## New Node Types

### TechnologyStack
Represents a recommended technology combination for a specific industry.
```ts
interface TechnologyStackNode extends BaseNode {
  type: 'TechnologyStack'
  properties: {
    name: string
    frontend: string[]
    backend: string[]
    database: string[]
    hosting: string[]
    industry: NodeId
    maturity: 'emerging' | 'growth' | 'mature'
  }
}
```

### ProviderCapability
Represents what an LLM provider excels at.
```ts
interface ProviderCapabilityNode extends BaseNode {
  type: 'ProviderCapability'
  properties: {
    provider: string
    taskTypes: LLMTaskType[]
    strengths: string[]
    latency: 'low' | 'medium' | 'high'
    costTier: 'low' | 'medium' | 'high'
    maxTokens: number
  }
}
```

### ArchitecturalPattern
Represents a common architecture pattern with适用场景.
```ts
interface ArchitecturalPatternNode extends BaseNode {
  type: 'ArchitecturalPattern'
  properties: {
    name: string
    description: string
    complexity: 'simple' | 'moderate' | 'complex'
    scalability: 'low' | 'medium' | 'high'
    industries: NodeId[]
    components: string[]
  }
}
```

## New Edge Types

| Edge Type | Source | Target | Meaning |
|-----------|--------|--------|---------|
| `recommended_for` | TechnologyStack | Industry | Technology is recommended for this industry |
| `performs_well_for` | ProviderCapability | LLMTaskType (via properties) | Provider excels at this task type |
| `suited_for` | ArchitecturalPattern | Industry | Pattern is suited for this industry |

## Public Interfaces

```ts
// Extensions to KnowledgeGraph class:
addTechnologyStack(node: TechnologyStackNode): void
addProviderCapability(node: ProviderCapabilityNode): void
addArchitecturalPattern(node: ArchitecturalPatternNode): void
getRecommendationsForIndustry(industryId: string): TechnologyStackNode[]
getProvidersForTaskType(taskType: string): ProviderCapabilityNode[]
getPatternsForIndustry(industryId: string): ArchitecturalPatternNode[]
```

## Dependencies

- Existing `bos/graph/engine.ts` and `bos/graph/types.ts`

## Extension Points

- Custom node types via `NodeType` union
- Custom edge types via `EdgeType` union
- Custom query methods

## Risks

- Graph size increase mitigated by lazy loading
- Seed data staleness mitigated by versioned seeds

## Future Evolution

- Dynamic graph updates from experience data
- Graph-based reasoning for architecture decisions
- Automatic pattern discovery from successful builds
