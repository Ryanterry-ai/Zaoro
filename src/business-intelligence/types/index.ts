export interface BusinessIntelligenceReport {
  business_domain: string;
  industry: string;
  business_model: string;
  customer_type: string;
  primary_problem: string;
  desired_outcome: string;
  revenue_model: string;
  raw_prompt: string;
  detected_language: string;
}

export interface IntentMap {
  explicit_requests: string[];
  actual_needs: string[];
  hidden_opportunities: string[];
  operational_bottlenecks: string[];
  revenue_leakages: string[];
  conversion_bottlenecks: string[];
  acquisition_challenges: string[];
  retention_challenges: string[];
}

export interface IndustryKnowledgeBase {
  market_leaders: string[];
  industry_standards: string[];
  best_practices: string[];
  customer_expectations: string[];
  typical_workflows: string[];
  common_software_solutions: string[];
  conversion_funnels: string[];
  revenue_models: string[];
}

export interface BusinessFlowStage {
  name: string;
  user_actions: string[];
  business_actions: string[];
  data_required: string[];
  systems_required: string[];
  automation_opportunities: string[];
  revenue_opportunities: string[];
  failure_points: string[];
}

export interface BusinessFlow {
  stages: BusinessFlowStage[];
  total_automation_opportunities: number;
  total_revenue_opportunities: number;
  total_failure_points: number;
}

export type ProblemSeverity = 'critical' | 'important' | 'future';
export type ImpactCategory = 'revenue' | 'customer' | 'operational' | 'technical';

export interface Problem {
  id: string;
  title: string;
  description: string;
  severity: ProblemSeverity;
  impact_scores: Record<ImpactCategory, number>;
  total_impact: number;
  affected_stages: string[];
  root_cause: string;
}

export interface SolutionComponent {
  type: 'website' | 'saas' | 'crm' | 'erp' | 'marketplace' | 'mobile_app' | 'ai_agent' | 'automation' | 'workflow' | 'internal_tool' | 'customer_portal';
  name: string;
  description: string;
  solves_problems: string[];
  revenue_impact: number;
  priority: number;
  features: string[];
}

export interface Solution {
  components: SolutionComponent[];
  summary: string;
  total_revenue_impact: number;
  implementation_order: string[];
}

export interface BusinessArchitecture {
  departments: Array<{ name: string; responsibilities: string[]; stakeholders: string[] }>;
  workflows: Array<{ name: string; steps: string[]; automation_level: number }>;
}

export interface SystemArchitecture {
  frontend: string[];
  backend: string[];
  database: string[];
  apis: string[];
  integrations: string[];
  infrastructure: string[];
}

export interface AIArchitecture {
  agents: Array<{ name: string; purpose: string; capabilities: string[] }>;
  reasoning_systems: string[];
  evaluation_systems: string[];
  automation_systems: string[];
}

export interface Architecture {
  business: BusinessArchitecture;
  system: SystemArchitecture;
  ai: AIArchitecture;
}

export interface ValidationResult {
  score: number;
  checks: Array<{ question: string; passed: boolean; details: string }>;
  deficiencies: string[];
  passed: boolean;
}

export interface BIPipelineResult {
  report: BusinessIntelligenceReport;
  intent: IntentMap;
  knowledge: IndustryKnowledgeBase;
  flow: BusinessFlow;
  problems: Problem[];
  solution: Solution;
  architecture: Architecture;
  validation: ValidationResult;
  correction_iterations: number;
  total_duration_ms: number;
}
