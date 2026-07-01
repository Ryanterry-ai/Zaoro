import type { BREContext, RuleDecision } from '../reasoning/rules-engine.js';
import type { ConstraintReport } from '../reasoning/constraint-solver.js';
import type { ScoredOption } from '../reasoning/scorer.js';
import type { Pattern } from '../schemas/knowledge/pattern.schema.js';
import type { DesignProfile } from '../schemas/knowledge/design-profile.schema.js';
import type {
  ApplicationBlueprint,
  PagePlan,
  EntityPlan,
  WorkflowPlan,
  DatabasePlan,
  ApiPlan,
  NavPlan,
} from '../schemas/blueprint/application-blueprint.schema.js';
import type { ExecutionBlueprint } from '../schemas/blueprint/execution-blueprint.schema.js';

export interface StageInput {
  context: BREContext;
  decisions: RuleDecision[];
  constraintReport: ConstraintReport;
  selectedDesignProfile?: ScoredOption;
  selectedPattern?: ScoredOption;
  fullSelectedPattern?: Pattern;
  vocabulary: Record<string, string>;
  knowledgeRefs: Array<{ id: string; version: string }>;
  fullDesignProfile?: DesignProfile;
}

export interface StageOutput {
  capabilityGraph?: CapabilityGraph;
  entityGraph?: EntityGraph;
  workflowGraph?: WorkflowGraph;
  navigationGraph?: NavigationGraph;
  databaseGraph?: DatabaseGraph;
  apiGraph?: APIGraph;
  blueprint?: ApplicationBlueprint;
  executionDAG?: ExecutionBlueprint;
}

export interface CapabilityGraph {
  capabilities: CapabilityNode[];
  requiredIntegrations: string[];
  features: FeatureDef[];
}

export interface CapabilityNode {
  name: string;
  category: 'core' | 'enhancement' | 'integration' | 'compliance';
  features: string[];
  priority: 'must_have' | 'should_have' | 'nice_to_have';
}

export interface FeatureDef {
  name: string;
  capability: string;
  uiSections: string[];
  entities: string[];
}

export interface EntityGraph {
  entities: EntityDef[];
  relationships: EntityRelation[];
}

export interface EntityDef {
  name: string;
  slug: string;
  fields: EntityField[];
  workflows: string[];
  capabilities: string[];
}

export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
  required: boolean;
  indexed: boolean;
  unique: boolean;
}

export interface EntityRelation {
  source: string;
  target: string;
  type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
  foreignKey?: string;
}

export interface WorkflowGraph {
  workflows: WorkflowDef[];
}

export interface WorkflowDef {
  name: string;
  trigger: string;
  steps: WorkflowStepDef[];
  entities: string[];
}

export interface WorkflowStepDef {
  name: string;
  action: string;
  entity?: string;
  condition?: string;
}

export interface NavigationGraph {
  pages: PageDef[];
  navItems: NavItemDef[];
  layouts: LayoutDef[];
}

export interface PageDef {
  path: string;
  name: string;
  type: 'home' | 'listing' | 'detail' | 'auth' | 'dashboard' | 'static' | 'page';
  sections: string[];
  entities: string[];
  workflows: string[];
}

export interface NavItemDef {
  label: string;
  href: string;
  icon?: string;
  children?: { label: string; href: string }[];
}

export interface LayoutDef {
  id: string;
  areas: string[];
  components: string[];
}

export interface DatabaseGraph {
  engine: string;
  tables: TableDef[];
}

export interface TableDef {
  name: string;
  columns: EntityField[];
  indexes: { columns: string[]; unique: boolean }[];
  foreignKeys: { column: string; references: string; onDelete: string }[];
}

export interface APIGraph {
  endpoints: EndpointDef[];
}

export interface EndpointDef {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  auth: boolean;
  entity?: string;
  description: string;
}

export interface PipelineEvent {
  stage: string;
  status: 'running' | 'completed' | 'failed';
  duration: number;
  output?: string;
  error?: string;
}
