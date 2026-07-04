/**
 * Application Graph — Node Type Definitions
 * 
 * This file defines all node types in the Application Graph.
 * It is the canonical source of truth for node schemas.
 * 
 * DO NOT modify this file without updating the Architecture Specification.
 */

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface GraphNodeBase {
  kind: GraphNodeKind;
  id: string;
  data: unknown;
}

export type GraphNodeKind =
  // Domain Nodes
  | 'entity'
  | 'value-object'
  | 'enum'
  // Storage Nodes
  | 'table'
  | 'index'
  | 'view'
  // API Nodes
  | 'endpoint'
  | 'field'
  | 'auth-rule'
  // Process Nodes
  | 'workflow'
  | 'step'
  | 'event'
  // UI Nodes
  | 'page'
  | 'component'
  | 'section'
  | 'layout'
  // Navigation Nodes
  | 'nav-item'
  | 'nav-group'
  // Capability Nodes
  | 'capability'
  | 'feature'
  | 'requirement'
  // Infrastructure Nodes
  | 'service'
  | 'queue'
  | 'cache'
  // Metadata Nodes
  | 'design-token'
  | 'theme'
  | 'i18n-key';

// ─── Shared Field Types ──────────────────────────────────────────────────────

export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
  required: boolean;
  indexed: boolean;
  unique: boolean;
  defaultValue?: unknown;
  constraints?: FieldConstraint[];
}

export interface FieldConstraint {
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value: unknown;
  message?: string;
}

export interface TableIndex {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
}

export interface TableForeignKey {
  column: string;
  references: string;
  onDelete: 'cascade' | 'restrict' | 'set null' | 'no action';
}

export interface WorkflowStep {
  name: string;
  action: string;
  entity?: string;
  condition?: string;
  timeout?: number;
  compensatingAction?: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

// ─── Domain Nodes ────────────────────────────────────────────────────────────

export interface EntityNodeData {
  name: string;
  slug: string;
  fields: EntityField[];
  workflows: string[];
  capabilities: string[];
  isVirtual: boolean;
}

export interface ValueObjectNodeData {
  name: string;
  fields: EntityField[];
  parentEntity?: string;
}

export interface EnumNodeData {
  name: string;
  values: string[];
  parentEntity?: string;
}

// ─── Storage Nodes ───────────────────────────────────────────────────────────

export interface TableNodeData {
  name: string;
  columns: EntityField[];
  indexes: TableIndex[];
  foreignKeys: TableForeignKey[];
  engine: string;
}

export interface IndexNodeData {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ViewNodeData {
  name: string;
  query: string;
  columns: EntityField[];
}

// ─── API Nodes ───────────────────────────────────────────────────────────────

export interface EndpointNodeData {
  method: string;
  path: string;
  entity?: string;
  auth: boolean;
  rateLimit?: number;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface FieldNodeData {
  name: string;
  type: string;
  required: boolean;
  parent: string;
  location: 'body' | 'query' | 'path' | 'header';
}

export interface AuthRuleNodeData {
  name: string;
  type: 'authentication' | 'authorization';
  mechanism: string;
  permissions: string[];
  endpoints: string[];
}

// ─── Process Nodes ───────────────────────────────────────────────────────────

export interface WorkflowNodeData {
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  entities: string[];
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface StepNodeData {
  name: string;
  action: string;
  entity?: string;
  condition?: string;
  timeout?: number;
  compensatingAction?: string;
}

export interface EventNodeData {
  name: string;
  type: 'command' | 'event' | 'query';
  payload: Record<string, unknown>;
  source: string;
  consumers: string[];
}

// ─── UI Nodes ────────────────────────────────────────────────────────────────

export interface PageNodeData {
  path: string;
  name: string;
  type: 'home' | 'listing' | 'detail' | 'auth' | 'dashboard' | 'static' | 'page';
  sections: string[];
  entities: string[];
  workflows: string[];
  auth: boolean;
  layout?: string;
}

export interface ComponentNodeData {
  name: string;
  type: 'atom' | 'molecule' | 'organism' | 'template' | 'page';
  props: ComponentProp[];
  entities: string[];
  variants: string[];
}

export interface SectionNodeData {
  name: string;
  type: 'hero' | 'content' | 'sidebar' | 'footer' | 'header' | 'custom';
  components: string[];
  layout: string;
}

export interface LayoutNodeData {
  id: string;
  name: string;
  areas: string[];
  components: string[];
}

// ─── Navigation Nodes ────────────────────────────────────────────────────────

export interface NavItemNodeData {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
  auth: boolean;
  roles?: string[];
}

export interface NavGroupNodeData {
  name: string;
  items: string[];
  order: number;
  visible: boolean;
}

// ─── Capability Nodes ────────────────────────────────────────────────────────

export interface CapabilityNodeData {
  name: string;
  category: 'core' | 'enhancement' | 'integration' | 'compliance';
  features: string[];
  priority: 'must_have' | 'should_have' | 'nice_to_have';
}

export interface FeatureNodeData {
  name: string;
  capability: string;
  uiSections: string[];
  entities: string[];
  requirements: string[];
}

export interface RequirementNodeData {
  id: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could' | 'wont';
  status: 'draft' | 'approved' | 'implemented' | 'verified';
}

// ─── Infrastructure Nodes ────────────────────────────────────────────────────

export interface ServiceNodeData {
  name: string;
  type: 'rest' | 'grpc' | 'graphql' | 'websocket';
  baseUrl: string;
  authentication: string;
  entities: string[];
}

export interface QueueNodeData {
  name: string;
  type: 'rabbitmq' | 'kafka' | 'redis' | 'sqs';
  messages: string[];
  consumers: string[];
}

export interface CacheNodeData {
  name: string;
  type: 'redis' | 'memcached' | 'in-memory';
  ttl: number;
  entities: string[];
}

// ─── Metadata Nodes ──────────────────────────────────────────────────────────

export interface DesignTokenNodeData {
  name: string;
  category: 'color' | 'typography' | 'spacing' | 'shadow' | 'border';
  value: string;
  theme?: string;
}

export interface ThemeNodeData {
  name: string;
  tokens: string[];
  isDefault: boolean;
}

export interface I18nKeyNodeData {
  key: string;
  defaultValue: string;
  languages: Record<string, string>;
}

// ─── Node Type Definitions ───────────────────────────────────────────────────

export interface EntityNode extends GraphNodeBase {
  kind: 'entity';
  data: EntityNodeData;
}

export interface ValueObjectNode extends GraphNodeBase {
  kind: 'value-object';
  data: ValueObjectNodeData;
}

export interface EnumNode extends GraphNodeBase {
  kind: 'enum';
  data: EnumNodeData;
}

export interface TableNode extends GraphNodeBase {
  kind: 'table';
  data: TableNodeData;
}

export interface IndexNode extends GraphNodeBase {
  kind: 'index';
  data: IndexNodeData;
}

export interface ViewNode extends GraphNodeBase {
  kind: 'view';
  data: ViewNodeData;
}

export interface EndpointNode extends GraphNodeBase {
  kind: 'endpoint';
  data: EndpointNodeData;
}

export interface FieldNode extends GraphNodeBase {
  kind: 'field';
  data: FieldNodeData;
}

export interface AuthRuleNode extends GraphNodeBase {
  kind: 'auth-rule';
  data: AuthRuleNodeData;
}

export interface WorkflowNode extends GraphNodeBase {
  kind: 'workflow';
  data: WorkflowNodeData;
}

export interface StepNode extends GraphNodeBase {
  kind: 'step';
  data: StepNodeData;
}

export interface EventNode extends GraphNodeBase {
  kind: 'event';
  data: EventNodeData;
}

export interface PageNode extends GraphNodeBase {
  kind: 'page';
  data: PageNodeData;
}

export interface ComponentNode extends GraphNodeBase {
  kind: 'component';
  data: ComponentNodeData;
}

export interface SectionNode extends GraphNodeBase {
  kind: 'section';
  data: SectionNodeData;
}

export interface LayoutNode extends GraphNodeBase {
  kind: 'layout';
  data: LayoutNodeData;
}

export interface NavItemNode extends GraphNodeBase {
  kind: 'nav-item';
  data: NavItemNodeData;
}

export interface NavGroupNode extends GraphNodeBase {
  kind: 'nav-group';
  data: NavGroupNodeData;
}

export interface CapabilityNode extends GraphNodeBase {
  kind: 'capability';
  data: CapabilityNodeData;
}

export interface FeatureNode extends GraphNodeBase {
  kind: 'feature';
  data: FeatureNodeData;
}

export interface RequirementNode extends GraphNodeBase {
  kind: 'requirement';
  data: RequirementNodeData;
}

export interface ServiceNode extends GraphNodeBase {
  kind: 'service';
  data: ServiceNodeData;
}

export interface QueueNode extends GraphNodeBase {
  kind: 'queue';
  data: QueueNodeData;
}

export interface CacheNode extends GraphNodeBase {
  kind: 'cache';
  data: CacheNodeData;
}

export interface DesignTokenNode extends GraphNodeBase {
  kind: 'design-token';
  data: DesignTokenNodeData;
}

export interface ThemeNode extends GraphNodeBase {
  kind: 'theme';
  data: ThemeNodeData;
}

export interface I18nKeyNode extends GraphNodeBase {
  kind: 'i18n-key';
  data: I18nKeyNodeData;
}

// ─── Union Type ──────────────────────────────────────────────────────────────

export type GraphNode =
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

// ─── Helper Types ────────────────────────────────────────────────────────────

export type NodeDataMap = {
  [K in GraphNodeKind]: Extract<GraphNode, { kind: K }>['data'];
};

export type NodeKindData<K extends GraphNodeKind> = NodeDataMap[K];
