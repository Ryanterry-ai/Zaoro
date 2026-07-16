export type GateCheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

export interface GateCheck {
  name: string;
  status: GateCheckStatus;
  score: number;
  message: string;
}

export interface AcceptanceGateResult {
  overallPassed: boolean;
  checks: GateCheck[];
  overallScore: number;
  timestamp: string;
  summary: string;
}

export interface AcceptanceGateConfig {
  architectureScoreMin: number;
  promptFulfillmentMin: number;
  capabilityCoverageMin: number;
  visualScoreMin: number;
  experienceScoreMin: number;
  accessibilityMin: number;
  performanceMin: number;
  reviewScoreMin: number;
}
