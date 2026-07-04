# Application Graph Specification

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04  
**Authors**: Build.same Architecture Team

---

## Table of Contents

1. [Vision and Design Goals](#1-vision-and-design-goals)
2. [Graph Philosophy and Invariants](#2-graph-philosophy-and-invariants)
3. [Complete Node Taxonomy](#3-complete-node-taxonomy)
4. [Complete Edge Taxonomy](#4-complete-edge-taxonomy)
5. [Canonical Schemas](#5-canonical-schemas)
6. [Lifecycle, Mutation, and Ownership Rules](#6-lifecycle-mutation-and-ownership-rules)
7. [Validation and Diagnostics](#7-validation-and-diagnostics)
8. [Serialization and Versioning](#8-serialization-and-versioning)
9. [Compiler Pass Interactions](#9-compiler-pass-interactions)
10. [Query APIs](#10-query-apis)
11. [Replay, Inspection, and Debugging](#11-replay-inspection-and-debugging)
12. [Extension Mechanisms](#12-extension-mechanisms)

---

## 1. Vision and Design Goals

### 1.1 What is the Application Graph?

**Application Graph (AG)**: The canonical, immutable intermediate representation (IR) of a software application produced by the planning pipeline. It is the single source of truth for compilation, validation, rendering, replay, debugging, deployment, and future evolution.

The AG is not just another data structure. It is a **compiler intermediate representation**—the pivot point between planning and execution. Once everyone on the team treats it as the IR, architectural decisions become much clearer:

- **Planners write it**
- **Validators verify it**
- **Renderers read it**
- **Replay serializes it**
- **Inspectors visualize it**
- **Providers consume derived artifacts**

Nothing bypasses the AG.

### 1.2 Design Goals

| Goal | Description |
|------|-------------|
| **Canonical** | Single source of truth for all application structure |
| **Immutable** | Once constructed, never mutated—only replaced |
| **Validated** | Invariants enforced at construction time |
| ** Serializable** | Complete state capture for replay and debugging |
| **Extensible** | New node/edge types added without breaking existing passes |
| **Queryable** | Efficient access patterns for all consumers |
| **Versioned** | Semantic versioning with migration paths |

### 1.3 The One Rule

> **From this point onward, every new feature added to Build.same must first answer one question: "How does this affect the Application Graph?"**
>
> If a feature cannot be represented in the Application Graph—or intentionally remains outside it as infrastructure—it should not be added until its relationship to the AG is understood.

This rule keeps the architecture coherent as the platform grows.

---

## 2. Graph Philosophy and Invariants

### 2.1 Philosophical Principles

#### 2.1.1 The AG as Truth

The Application Graph is the **single source of truth** for what an application *is*. Not the prompt, not the blueprint, not the code—the AG. Everything else is either:

1. **Input to the AG** (prompt, knowledge, rules)
2. **Output from the AG** (code, configuration, deployment)
3. **Derived from the AG** (metrics, visualizations, reports)

#### 2.1.2 Immutability by Construction

The AG is constructed once and never modified. If a compiler pass needs to "change" the graph, it produces a **new version** of the graph. This enables:

- **Replay**: Any previous state can be reconstructed
- **Debugging**: Compare graph versions to find where issues were introduced
- **Optimization**: Cache intermediate results safely
- **Concurrency**: Multiple passes can read the same graph without locks

#### 2.1.3 Separation of Concerns

Each node kind has exactly one responsibility. The AG does not mix domain concepts:

- **Domain nodes** represent business objects (entities, value objects)
- **Storage nodes** represent persistence (tables, indexes)
- **API nodes** represent interfaces (endpoints, fields)
- **Process nodes** represent workflows (steps, events)
- **UI nodes** represent presentation (pages, components)
- **Infrastructure nodes** represent external systems (services, queues)

### 2.2 Invariants (Non-Negotiable)

These invariants **must** hold for every valid Application Graph. Violations indicate bugs in the planner or corruption.

#### 2.2.1 Structural Invariants

| ID | Invariant | Description |
|----|-----------|-------------|
| I-1 | **Single Root** | Every AG has exactly one metadata node (`AGMetadata`). |
| I-2 | **Acyclic Ownership** | Ownership edges (`has_*`) must not form cycles. |
| I-3 | **Referential Integrity** | Every `from`/`to` in an edge must reference an existing node ID. |
| I-4 | **Kind Consistency** | Edge kind constraints must be respected (e.g., `has_table` only from `entity` to `table`). |

#### 2.2.2 Semantic Invariants

| ID | Invariant | Description |
|----|-----------|-------------|
| I-5 | **Immutability** | Once constructed, nodes cannot be modified—only replaced. |
| I-6 | **Version Monotonicity** | Graph version must only increase. |
| I-7 | **Metadata Completeness** | Every graph must have `industry`, `appName`, `databaseEngine`, `createdAt`. |
| I-8 | **Entity-Table Linking** | Every `entity` node must have exactly one `has_table` edge (or be marked as virtual). |

#### 2.2.3 Compiler Invariants

| ID | Invariant | Description |
|----|-----------|-------------|
| I-9 | **Pass Isolation** | Compiler passes cannot read/write arbitrary graph sections—only their declared scope. |
| I-10 | **Deterministic Output** | Same input AG must produce same output AG (for non-random passes). |
| I-11 | **Error Containment** | A failing pass must not corrupt the graph—produce a new graph with error nodes. |

---

## 3. Complete Node Taxonomy

### 3.1 Node Categories

Nodes are organized into 9 categories, each with specific responsibilities:

```
Application Graph
├── Domain Nodes          (business objects)
├── Storage Nodes         (persistence)
├── API Nodes             (interfaces)
├── Process Nodes         (workflows)
├── UI Nodes              (presentation)
├── Navigation Nodes      (routing)
├── Capability Nodes      (features)
├── Infrastructure Nodes  (external systems)
└── Metadata Nodes        (configuration)
```

### 3.2 Domain Nodes

#### 3.2.1 `entity`

**Purpose**: Represents a business object (User, Product, Order).

**Fields**:
```typescript
interface EntityNodeData {
  name: string;           // PascalCase name (e.g., "User")
  slug: string;           // kebab-case slug (e.g., "user")
  fields: EntityField[];  // Fields of this entity
  workflows: string[];    // Associated workflow names
  capabilities: string[]; // Associated capability names
  isVirtual: boolean;     // If true, no table backing
}
```

**Constraints**:
- Must have at least one field
- `name` must be unique across all entities
- `slug` must be URL-safe

**Example**:
```json
{
  "kind": "entity",
  "id": "entity:User",
  "data": {
    "name": "User",
    "slug": "user",
    "fields": [
      { "name": "id", "type": "string", "required": true, "indexed": true, "unique": true },
      { "name": "email", "type": "string", "required": true, "indexed": true, "unique": true },
      { "name": "name", "type": "string", "required": true, "indexed": false, "unique": false }
    ],
    "workflows": ["user-registration", "password-reset"],
    "capabilities": ["authentication", "user-management"],
    "isVirtual": false
  }
}
```

#### 3.2.2 `value-object`

**Purpose**: Represents an immutable domain concept (Address, Money, DateRange).

**Fields**:
```typescript
interface ValueObjectNodeData {
  name: string;           // PascalCase name
  fields: EntityField[];  // Fields of this value object
  parentEntity?: string;  // Entity this belongs to (optional)
}
```

**Constraints**:
- Must have at least one field
- Cannot have workflows or capabilities
- Must be immutable (no update operations)

#### 3.2.3 `enum`

**Purpose**: Represents a constrained value set (Status, Role, Priority).

**Fields**:
```typescript
interface EnumNodeData {
  name: string;           // PascalCase name
  values: string[];       // Allowed values
  parentEntity?: string;  // Entity this belongs to (optional)
}
```

**Constraints**:
- Must have at least one value
- Values must be unique within the enum
- Values should be UPPER_SNAKE_CASE or camelCase

### 3.3 Storage Nodes

#### 3.3.1 `table`

**Purpose**: Represents a database table.

**Fields**:
```typescript
interface TableNodeData {
  name: string;                    // snake_case table name
  columns: EntityField[];          // Table columns
  indexes: TableIndex[];           // Table indexes
  foreignKeys: TableForeignKey[];  // Foreign key constraints
  engine: string;                  // Database engine (postgres, mysql, sqlite)
}
```

**Constraints**:
- `name` must be snake_case
- Must have at least one column (typically `id`)
- Must have a primary key (usually `id`)

#### 3.3.2 `index`

**Purpose**: Represents a database index.

**Fields**:
```typescript
interface IndexNodeData {
  name: string;           // Index name
  table: string;          // Table this index belongs to
  columns: string[];      // Columns in this index
  unique: boolean;        // Whether this is a unique index
  type: string;           // Index type (btree, hash, gin, etc.)
}
```

#### 3.3.3 `view`

**Purpose**: Represents a database view.

**Fields**:
```typescript
interface ViewNodeData {
  name: string;           // View name
  query: string;          // SQL query defining the view
  columns: EntityField[]; // Columns in this view
}
```

### 3.4 API Nodes

#### 3.4.1 `endpoint`

**Purpose**: Represents an HTTP endpoint.

**Fields**:
```typescript
interface EndpointNodeData {
  method: string;         // HTTP method (GET, POST, PUT, DELETE)
  path: string;           // URL path (e.g., "/api/users")
  entity?: string;        // Associated entity name
  auth: boolean;          // Requires authentication
  rateLimit?: number;     // Rate limit (requests per minute)
  inputSchema?: object;   // Request body schema
  outputSchema?: object;  // Response body schema
}
```

**Constraints**:
- `method` must be uppercase HTTP method
- `path` must start with `/`
- `path` must be unique for the same method

#### 3.4.2 `field`

**Purpose**: Represents a request/response field.

**Fields**:
```typescript
interface FieldNodeData {
  name: string;           // Field name
  type: string;           // Field type (string, number, boolean, etc.)
  required: boolean;      // Whether this field is required
  parent: string;         // Parent endpoint ID
  location: 'body' | 'query' | 'path' | 'header';
}
```

#### 3.4.3 `auth-rule`

**Purpose**: Represents an authentication/authorization rule.

**Fields**:
```typescript
interface AuthRuleNodeData {
  name: string;           // Rule name
  type: 'authentication' | 'authorization';
  mechanism: string;      // JWT, OAuth2, API Key, etc.
  permissions: string[];  // Required permissions
  endpoints: string[];    // Endpoints this rule applies to
}
```

### 3.5 Process Nodes

#### 3.5.1 `workflow`

**Purpose**: Represents a business process.

**Fields**:
```typescript
interface WorkflowNodeData {
  name: string;           // PascalCase workflow name
  trigger: string;        // What triggers this workflow
  steps: WorkflowStep[];  // Workflow steps
  entities: string[];     // Entities involved
  timeout?: number;       // Timeout in milliseconds
  retryPolicy?: object;   // Retry configuration
}
```

#### 3.5.2 `step`

**Purpose**: Represents a workflow step.

**Fields**:
```typescript
interface StepNodeData {
  name: string;           // Step name
  action: string;         // Action to perform
  entity?: string;        // Entity this step operates on
  condition?: string;     // Condition for this step
  timeout?: number;       // Step timeout
  compensatingAction?: string; // Rollback action
}
```

#### 3.5.3 `event`

**Purpose**: Represents a domain event.

**Fields**:
```typescript
interface EventNodeData {
  name: string;           // Event name (PascalCase)
  type: 'command' | 'event' | 'query';
  payload: object;        // Event payload schema
  source: string;         // Where this event originates
  consumers: string[];    // Who consumes this event
}
```

### 3.6 UI Nodes

#### 3.6.1 `page`

**Purpose**: Represents an application page.

**Fields**:
```typescript
interface PageNodeData {
  path: string;           // URL path (e.g., "/users")
  name: string;           // Page name
  type: 'home' | 'listing' | 'detail' | 'auth' | 'dashboard' | 'static' | 'page';
  sections: string[];     // Section IDs
  entities: string[];     // Entities displayed on this page
  workflows: string[];    // Workflows triggered from this page
  auth: boolean;          // Requires authentication
  layout?: string;        // Layout ID
}
```

#### 3.6.2 `component`

**Purpose**: Represents a reusable UI component.

**Fields**:
```typescript
interface ComponentNodeData {
  name: string;           // PascalCase component name
  type: 'atom' | 'molecule' | 'organism' | 'template' | 'page';
  props: ComponentProp[]; // Component props
  entities: string[];     // Entities this component displays
  variants: string[];     // Component variants
}
```

#### 3.6.3 `section`

**Purpose**: Represents a page section.

**Fields**:
```typescript
interface SectionNodeData {
  name: string;           // Section name
  type: 'hero' | 'content' | 'sidebar' | 'footer' | 'header' | 'custom';
  components: string[];   // Component IDs in this section
  layout: string;         // Layout for this section
}
```

#### 3.6.4 `layout`

**Purpose**: Represents a page layout.

**Fields**:
```typescript
interface LayoutNodeData {
  id: string;             // Layout identifier
  name: string;           // Layout name
  areas: string[];        // Layout areas (e.g., ["header", "main", "sidebar", "footer"])
  components: string[];   // Components in this layout
}
```

### 3.7 Navigation Nodes

#### 3.7.1 `nav-item`

**Purpose**: Represents a navigation entry.

**Fields**:
```typescript
interface NavItemNodeData {
  label: string;          // Display label
  href: string;           // URL path
  icon?: string;          // Icon name
  children?: NavItem[];   // Nested navigation items
  auth: boolean;          // Requires authentication
  roles?: string[];       // Required roles
}
```

#### 3.7.2 `nav-group`

**Purpose**: Represents a navigation section.

**Fields**:
```typescript
interface NavGroupNodeData {
  name: string;           // Group name
  items: string[];        // NavItem IDs
  order: number;          // Display order
  visible: boolean;       // Whether this group is visible
}
```

### 3.8 Capability Nodes

#### 3.8.1 `capability`

**Purpose**: Represents a system capability.

**Fields**:
```typescript
interface CapabilityNodeData {
  name: string;           // Capability name
  category: 'core' | 'enhancement' | 'integration' | 'compliance';
  features: string[];     // Feature IDs in this capability
  priority: 'must_have' | 'should_have' | 'nice_to_have';
}
```

#### 3.8.2 `feature`

**Purpose**: Represents a specific feature.

**Fields**:
```typescript
interface FeatureNodeData {
  name: string;           // Feature name
  capability: string;     // Parent capability name
  uiSections: string[];   // UI sections for this feature
  entities: string[];     // Entities involved
  requirements: string[]; // Business requirements
}
```

#### 3.8.3 `requirement`

**Purpose**: Represents a business requirement.

**Fields**:
```typescript
interface RequirementNodeData {
  id: string;             // Requirement ID (e.g., "REQ-001")
  title: string;          // Requirement title
  description: string;    // Requirement description
  priority: 'must' | 'should' | 'could' | 'wont';
  status: 'draft' | 'approved' | 'implemented' | 'verified';
}
```

### 3.9 Infrastructure Nodes

#### 3.9.1 `service`

**Purpose**: Represents an external service integration.

**Fields**:
```typescript
interface ServiceNodeData {
  name: string;           // Service name
  type: 'rest' | 'grpc' | 'graphql' | 'websocket';
  baseUrl: string;        // Service base URL
  authentication: string; // Authentication method
  entities: string[];     // Entities this service provides
}
```

#### 3.9.2 `queue`

**Purpose**: Represents a message queue.

**Fields**:
```typescript
interface QueueNodeData {
  name: string;           // Queue name
  type: 'rabbitmq' | 'kafka' | 'redis' | 'sqs';
  messages: string[];     // Message types this queue handles
  consumers: string[];    // Consumers of this queue
}
```

#### 3.9.3 `cache`

**Purpose**: Represents a cache layer.

**Fields**:
```typescript
interface CacheNodeData {
  name: string;           // Cache name
  type: 'redis' | 'memcached' | 'in-memory';
  ttl: number;            // Time-to-live in seconds
  entities: string[];     // Entities cached
}
```

### 3.10 Metadata Nodes

#### 3.10.1 `design-token`

**Purpose**: Represents a design system token.

**Fields**:
```typescript
interface DesignTokenNodeData {
  name: string;           // Token name (e.g., "color-primary")
  category: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
  value: string;          // Token value
  theme?: string;         // Theme this token belongs to
}
```

#### 3.10.2 `theme`

**Purpose**: Represents a visual theme.

**Fields**:
```typescript
interface ThemeNodeData {
  name: string;           // Theme name
  tokens: string[];       // Design token IDs
  isDefault: boolean;     // Whether this is the default theme
}
```

#### 3.10.3 `i18n-key`

**Purpose**: Represents a translation key.

**Fields**:
```typescript
interface I18nKeyNodeData {
  key: string;            // Translation key (e.g., "user.name")
  defaultValue: string;   // Default language value
  languages: Record<string, string>; // Translations
}
```

---

## 4. Complete Edge Taxonomy

### 4.1 Edge Categories

Edges are organized into 8 categories:

```
Application Graph Edges
├── Ownership Edges      (has_*)
├── Relation Edges       (entity_relation, etc.)
├── Dependency Edges     (*_for_entity, *_uses_entity, etc.)
├── Flow Edges           (workflow_step, etc.)
├── Navigation Edges     (nav_item_page, etc.)
├── UI Edges             (page_has_layout, etc.)
├── Capability Edges     (capability_has_feature, etc.)
└── Metadata Edges       (entity_has_token, etc.)
```

### 4.2 Ownership Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `has_table` | entity | table | Entity has a database table |
| `has_endpoint` | entity | endpoint | Entity has an API endpoint |
| `has_workflow` | entity | workflow | Entity has a workflow |
| `has_page` | page | section | Page has a section |
| `has_component` | section | component | Section has a component |
| `has_field` | endpoint | field | Endpoint has a field |
| `has_step` | workflow | step | Workflow has a step |
| `has_feature` | capability | feature | Capability has a feature |
| `has_requirement` | feature | requirement | Feature has a requirement |
| `has_group` | nav-item | nav-group | Navigation group has items |

### 4.3 Relation Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `entity_relation` | entity | entity | Entity-to-entity relationship |
| `value_object_of` | value-object | entity | Value object belongs to entity |
| `enum_used_by` | enum | entity | Enum is used by entity |

### 4.4 Dependency Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `endpoint_for_entity` | endpoint | entity | Endpoint operates on entity |
| `workflow_uses_entity` | workflow | entity | Workflow uses entity |
| `page_uses_entity` | page | entity | Page displays entity |
| `feature_requires_entity` | feature | entity | Feature requires entity |
| `component_uses_entity` | component | entity | Component displays entity |
| `service_consumes` | entity | service | Entity consumed from service |

### 4.5 Flow Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `workflow_step` | workflow | step | Workflow contains step |
| `step_triggers_event` | step | event | Step triggers event |
| `event_consumed_by` | event | workflow | Event consumed by workflow |

### 4.6 Navigation Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `nav_item_page` | nav-item | page | Navigation item links to page |
| `nav_group_item` | nav-group | nav-item | Navigation group contains item |

### 4.7 UI Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `page_has_layout` | page | layout | Page uses layout |
| `layout_has_component` | layout | component | Layout contains component |
| `component_renders_entity` | component | entity | Component renders entity |

### 4.8 Capability Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `capability_has_feature` | capability | feature | Capability contains feature |
| `feature_has_requirement` | feature | requirement | Feature has requirement |

### 4.9 Metadata Edges

| Edge Kind | From | To | Description |
|-----------|------|----|-------------|
| `entity_has_token` | entity | design-token | Entity has design token |
| `page_has_theme` | page | theme | Page uses theme |
| `entity_has_i18n` | entity | i18n-key | Entity has translation key |

---

## 5. Canonical Schemas

### 5.1 Graph Root

```typescript
interface ApplicationGraph {
  version: string;              // Semantic version (e.g., "1.0.0")
  id: string;                   // Unique graph identifier
  metadata: AGMetadata;         // Graph metadata
  nodes: GraphNode[];           // All nodes in the graph
  edges: GraphEdge[];           // All edges in the graph
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
}
```

### 5.2 Graph Metadata

```typescript
interface AGMetadata {
  industry: string;             // Industry (e.g., "ecommerce", "saas")
  subIndustry?: string;         // Sub-industry (e.g., "fashion", "b2b")
  appName: string;              // Application name
  databaseEngine: string;       // Database engine (postgres, mysql, sqlite)
  country?: string;             // Target country
  businessModels: string[];     // Business models (e.g., ["b2c", "subscription"])
  compliancePacks: string[];    // Compliance packs (e.g., ["gdpr", "hipaa"])
  audience?: string;            // Target audience
  description?: string;         // Application description
}
```

### 5.3 Graph Node

```typescript
type GraphNode =
  | EntityNode
  | ValueObjectNode
  | EnumNode
  | TableNode
  | IndexNode
  | ViewNode
  | EndpointNode
  | FieldNode
  | AuthRuleNode
  | WorkflowNode
  | StepNode
  | EventNode
  | PageNode
  | ComponentNode
  | SectionNode
  | LayoutNode
  | NavItemNode
  | NavGroupNode
  | CapabilityNode
  | FeatureNode
  | RequirementNode
  | ServiceNode
  | QueueNode
  | CacheNode
  | DesignTokenNode
  | ThemeNode
  | I18nKeyNode;

interface GraphNodeBase {
  kind: GraphNodeKind;
  id: string;
  data: unknown;
}
```

### 5.4 Graph Edge

```typescript
interface GraphEdge {
  kind: EdgeKind;
  from: string;      // Source node ID
  to: string;        // Target node ID
  label?: string;    // Optional label
  weight?: number;   // Optional weight (0-1)
  metadata?: Record<string, unknown>; // Optional metadata
}
```

---

## 6. Lifecycle, Mutation, and Ownership Rules

### 6.1 Graph Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Graph Lifecycle                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CONSTRUCTION                                                 │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │   Planner    │───▶│   Builder    │───▶│  Validator   │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
│  2. COMPILATION                                                  │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │  Pass 0      │───▶│  Pass 1      │───▶│  Pass N      │   │
│     │  Knowledge   │    │  BRE         │    │  Code Gen    │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
│  3. CONSUMPTION                                                  │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │  Renderer    │    │  Inspector   │    │  Deployer    │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
│  4. PERSISTENCE                                                  │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│     │  Serializer  │    │  Store       │    │  Versioning  │   │
│     └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Mutation Rules

#### 6.2.1 Immutability Principle

The AG is **immutable after construction**. This means:

- **No in-place modifications** to existing nodes
- **No edge rewiring** after construction
- **No metadata updates** after creation

#### 6.2.2 Versioning for Changes

When a change is needed, create a **new version** of the graph:

```typescript
interface GraphVersion {
  version: string;           // New version number
  previousVersion: string;   // Previous version
  changes: GraphChange[];    // What changed
  timestamp: string;         // When the change was made
  reason: string;            // Why the change was made
}

interface GraphChange {
  type: 'add' | 'remove' | 'replace';
  target: 'node' | 'edge';
  id: string;
  before?: unknown;
  after?: unknown;
}
```

#### 6.2.3 Compiler Pass Mutations

Compiler passes that need to modify the graph must:

1. Read the input graph (immutable)
2. Compute the output graph (new version)
3. Return the output graph (never modify input)

```typescript
interface CompilerPass {
  execute(input: ApplicationGraph): Promise<ApplicationGraph>;
}
```

### 6.3 Ownership Rules

#### 6.3.1 Node Ownership

Each node has exactly one **owner**—the compiler pass that created it:

| Pass | Owned Nodes |
|------|-------------|
| Knowledge Enrichment | `capability`, `feature`, `requirement` |
| BRE v2 | `entity`, `value-object`, `enum` |
| Pipeline-v2 | `table`, `endpoint`, `workflow`, `page`, `nav-item` |
| Code Generator | `component`, `section`, `layout` |
| Infrastructure | `service`, `queue`, `cache` |
| Metadata | `design-token`, `theme`, `i18n-key` |

#### 6.3.2 Edge Ownership

Edges are owned by the pass that created the relationship:

| Pass | Owned Edges |
|------|-------------|
| Knowledge Enrichment | `capability_has_feature`, `feature_has_requirement` |
| BRE v2 | `entity_relation`, `value_object_of`, `enum_used_by` |
| Pipeline-v2 | `has_table`, `has_endpoint`, `has_workflow`, `has_page`, `has_nav_item` |
| Code Generator | `has_component`, `has_section`, `has_layout` |

---

## 7. Validation and Diagnostics

### 7.1 Validation Levels

| Level | Description | When |
|-------|-------------|------|
| **L1: Structural** | Basic graph structure (referential integrity, acyclic ownership) | After construction |
| **L2: Semantic** | Domain-specific rules (entity-table linking, endpoint uniqueness) | After construction |
| **L3: Business** | Business logic validation (required fields, workflow completeness) | After compilation |
| **L4: Runtime** | Runtime constraints (API compatibility, database schema) | Before deployment |

### 7.2 Validation Rules

```typescript
interface ValidationRule {
  id: string;
  name: string;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  severity: 'error' | 'warning' | 'info';
  check: (graph: ApplicationGraph) => ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  ruleId: string;
  message: string;
  node?: string;
  edge?: string;
  context?: Record<string, unknown>;
}
```

### 7.3 Diagnostic Output

```typescript
interface DiagnosticReport {
  graphId: string;
  version: string;
  timestamp: string;
  summary: {
    totalNodes: number;
    totalEdges: number;
    errors: number;
    warnings: number;
    info: number;
  };
  results: ValidationResult[];
  recommendations: string[];
}
```

---

## 8. Serialization and Versioning

### 8.1 Serialization Format

The AG supports multiple serialization formats:

| Format | Use Case | Extension |
|--------|----------|-----------|
| **JSON** | Default, human-readable | `.ag.json` |
| **MessagePack** | Binary, compact | `.ag.msgpack` |
| **Protocol Buffers** | High-performance, schema-driven | `.ag.pb` |
| **JSONL** | Streaming, line-by-line | `.ag.jsonl` |

### 8.2 Serialization Schema

```typescript
interface SerializedGraph {
  format: 'json' | 'msgpack' | 'protobuf' | 'jsonl';
  version: string;
  checksum: string;           // SHA-256 checksum
  size: number;               // Size in bytes
  data: ApplicationGraph | Uint8Array;
  metadata: {
    serializedAt: string;
    serializer: string;       // Serializer version
    compression?: string;     // Compression algorithm
  };
}
```

### 8.3 Versioning Strategy

#### 8.3.1 Semantic Versioning

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (node/edge removal, schema changes)
MINOR: New features (new node/edge types, new fields)
PATCH: Bug fixes (validation rule corrections, serialization fixes)
```

#### 8.3.2 Version Compatibility

| Change Type | Version Impact | Migration Required |
|-------------|----------------|-------------------|
| New node kind | MINOR | No |
| New edge kind | MINOR | No |
| New field on node | PATCH | No |
| Node kind removal | MAJOR | Yes |
| Edge kind removal | MAJOR | Yes |
| Schema change | MAJOR | Yes |

---

## 9. Compiler Pass Interactions

### 9.1 Pass Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Compiler Pass Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input AG ──▶ [Pass] ──▶ Output AG                              │
│                                                                  │
│  Each pass:                                                      │
│  1. Reads from input AG (immutable)                              │
│  2. Computes output AG (new version)                             │
│  3. Validates output AG (invariants)                             │
│  4. Returns output AG (never modifies input)                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Pass Contract

```typescript
interface CompilerPassContract {
  id: string;
  name: string;
  version: string;
  
  // What this pass can READ from the graph
  reads: {
    nodeKinds: GraphNodeKind[];
    edgeKinds: EdgeKind[];
    metadata: string[];
  };
  
  // What this pass can WRITE to the graph
  writes: {
    nodeKinds: GraphNodeKind[];
    edgeKinds: EdgeKind[];
  };
  
  // What this pass VALIDATES
  validates: {
    invariants: string[];
    customRules: string[];
  };
  
  // What this pass can MUTATE
  mutates: {
    allowed: boolean;
    scope: 'none' | 'add-only' | 'replace' | 'full';
  };
}
```

### 9.3 Pass Execution Order

```
Pass 0: Knowledge Enrichment
  └── Reads: context
  └── Writes: capability, feature, requirement

Pass 1: BRE v2 → Application Blueprint
  └── Reads: context, knowledge
  └── Writes: blueprint

Pass 2: Pipeline-v2 Enrichment
  └── Reads: blueprint, context
  └── Writes: entity, table, endpoint, workflow, page, nav-item

Pass 3: ApplicationGraph Construction
  └── Reads: all pipeline-v2 outputs
  └── Writes: ApplicationGraph (canonical IR)

Pass 4: Content Resolution
  └── Reads: ApplicationGraph
  └── Writes: resolved content

Pass 5: Rendering
  └── Reads: ApplicationGraph, resolved content
  └── Writes: component, section, layout

Pass 6: Code Generation
  └── Reads: ApplicationGraph
  └── Writes: source files

Pass 7: Quality Gate
  └── Reads: ApplicationGraph, source files
  └── Writes: validation results

Pass 8: Self-Healing
  └── Reads: validation results, source files
  └── Writes: fixed source files
```

---

## 10. Query APIs

### 10.1 Graph Query Interface

```typescript
interface GraphQuery {
  // Node queries
  getNode(id: string): GraphNode | undefined;
  getNodesByKind(kind: GraphNodeKind): GraphNode[];
  getNodesByProperty<K extends keyof GraphNode>(
    property: K,
    value: GraphNode[K]
  ): GraphNode[];
  
  // Edge queries
  getEdgesFrom(nodeId: string): GraphEdge[];
  getEdgesTo(nodeId: string): GraphEdge[];
  getEdgesByKind(kind: EdgeKind): GraphEdge[];
  
  // Relationship queries
  getRelatedNodes(nodeId: string, edgeKind?: EdgeKind): GraphNode[];
  getRelatedEdges(nodeId: string, edgeKind?: EdgeKind): GraphEdge[];
  
  // Path queries
  findPath(from: string, to: string): GraphEdge[];
  findShortestPath(from: string, to: string): GraphEdge[];
  
  // Subgraph queries
  getSubgraph(nodeIds: string[]): ApplicationGraph;
  getSubgraphByKind(kind: GraphNodeKind): ApplicationGraph;
  
  // Statistics
  getStats(): AppGraphStats;
}
```

### 10.2 Query Examples

```typescript
// Get all entities
const entities = graph.getNodesByKind('entity');

// Get all endpoints for a specific entity
const userEndpoints = graph.getEdgesFrom('entity:User')
  .filter(e => e.kind === 'has_endpoint')
  .map(e => graph.getNode(e.to));

// Find all pages that use the User entity
const userPages = graph.getEdgesTo('entity:User')
  .filter(e => e.kind === 'page_uses_entity')
  .map(e => graph.getNode(e.from));

// Get the shortest path between two entities
const path = graph.findShortestPath('entity:User', 'entity:Order');
```

---

## 11. Replay, Inspection, and Debugging

### 11.1 Replay System

The AG serialization enables complete state reconstruction:

```typescript
interface ReplaySession {
  graphId: string;
  versions: ApplicationGraph[];
  currentTime: number;
  
  // Navigate to specific version
  goToVersion(version: string): ApplicationGraph;
  
  // Compare versions
  diffVersions(v1: string, v2: string): GraphDiff;
  
  // Step through compilation
  stepForward(): ApplicationGraph;
  stepBackward(): ApplicationGraph;
}
```

### 11.2 Inspector Interface

```typescript
interface GraphInspector {
  // Visual inspection
  visualize(graph: ApplicationGraph): Visualization;
  
  // Node inspection
  inspectNode(id: string): NodeDetails;
  
  // Edge inspection
  inspectEdge(from: string, to: string): EdgeDetails;
  
  // Path inspection
  inspectPath(path: GraphEdge[]): PathDetails;
  
  // Validation inspection
  inspectValidation(graph: ApplicationGraph): ValidationReport;
}
```

### 11.3 Debugging Tools

```typescript
interface GraphDebugger {
  // Set breakpoints
  breakpointOnNode(kind: GraphNodeKind): void;
  breakpointOnEdge(kind: EdgeKind): void;
  breakpointOnValidation(ruleId: string): void;
  
  // Step through
  stepThroughPass(passId: string): void;
  
  // Inspect state
  getState(): ApplicationGraph;
  getDiff(): GraphDiff;
  
  // Export for analysis
  exportSession(): ReplaySession;
}
```

---

## 12. Extension Mechanisms

### 12.1 Adding New Node Types

To add a new node type:

1. **Define the node data interface**
   ```typescript
   interface NewNodeData {
     // Required fields
     name: string;
     // ... other fields
   }
   ```

2. **Add to GraphNode union**
   ```typescript
   type GraphNode = ... | NewNode;
   
   interface NewNode extends GraphNodeBase {
     kind: 'new-node';
     data: NewNodeData;
   }
   ```

3. **Define edge constraints**
   ```typescript
   // Which edges can connect to this node
   const NEW_NODE_EDGES = {
     incoming: ['has_new_node'],
     outgoing: ['new_node_uses_entity'],
   };
   ```

4. **Update validation rules**
   ```typescript
   const NEW_NODE_VALIDATION: ValidationRule[] = [
     // ... validation rules
   ];
   ```

5. **Update compiler pass contracts**
   ```typescript
   // Which passes can read/write this node
   const NEW_NODE_PASSES = {
     reads: ['pass-0', 'pass-1'],
     writes: ['pass-2'],
   };
   ```

### 12.2 Adding New Edge Types

To add a new edge type:

1. **Define the edge kind**
   ```typescript
   type EdgeKind = ... | 'new_edge_kind';
   ```

2. **Define source/target constraints**
   ```typescript
   const NEW_EDGE_CONSTRAINTS = {
     source: ['entity', 'table'],
     target: ['endpoint', 'workflow'],
   };
   ```

3. **Update validation rules**
   ```typescript
   const NEW_EDGE_VALIDATION: ValidationRule[] = [
     // ... validation rules
   ];
   ```

### 12.3 Backward Compatibility

When extending the AG:

- **Never remove** existing node or edge kinds
- **Never change** existing field types or semantics
- **Never break** existing compiler pass contracts
- **Always add** new kinds as optional
- **Always version** changes appropriately

### 12.4 Forward Compatibility

Older versions of the system should:

- **Ignore** unknown node kinds
- **Ignore** unknown edge kinds
- **Skip** unknown fields
- **Log** warnings for unrecognized data
- **Continue** processing known data

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **AG** | Application Graph — the canonical IR |
| **IR** | Intermediate Representation |
| **Compiler Pass** | A transformation step that reads/writes the AG |
| **Node** | A vertex in the graph representing a concept |
| **Edge** | A directed connection between two nodes |
| **Ownership** | An edge indicating "has" relationship |
| **Dependency** | An edge indicating "uses" or "requires" relationship |
| **Metadata** | Information about the graph itself |
| **Validation** | Checking invariants and rules |
| **Serialization** | Converting the graph to a storable format |
| **Replay** | Reconstructing a previous graph state |
| **Extension** | Adding new node/edge types |
| **Backward Compatibility** | Old code works with new graphs |
| **Forward Compatibility** | New code works with old graphs |

---

## Appendix B: References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [JSON Schema Specification](https://json-schema.org/)
- [Semantic Versioning](https://semver.org/)
- [Graph Theory Basics](https://en.wikipedia.org/wiki/Graph_theory)
- [Compiler Design Principles](https://en.wikipedia.org/wiki/Compiler_construction)

---

**End of Application Graph Specification v1.0.0-draft**
