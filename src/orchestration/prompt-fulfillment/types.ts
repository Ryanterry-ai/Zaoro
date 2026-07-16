export type FulfillmentStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_ASSESSED';

export interface RequirementFulfillment {
  requirementId: string;
  description: string;
  owner: string;
  category: string;
  priority: 'must' | 'should' | 'nice';
  status: FulfillmentStatus;
  score: number;
  evidence: string[];
  failures: string[];
}

export interface PromptFulfillmentScore {
  overallScore: number;
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  totalRequirements: number;
  fulfilledCount: number;
  partialCount: number;
  failedCount: number;
  requirementFulfillments: RequirementFulfillment[];
  summary: string;
  timestamp: string;
}

export interface PromptFulfillmentConfig {
  passThreshold: number;
  partialThreshold: number;
}
