export type DeployTarget = 'vercel' | 'cloudflare' | 'docker' | 'netlify' | 'manual';

export interface DeployConfig {
  target: DeployTarget;
  projectName: string;
  region?: string | undefined;
  environment?: Record<string, string> | undefined;
  buildCommand?: string | undefined;
  outputDir?: string | undefined;
  nodeVersion?: string | undefined;
}

export interface DeployResult {
  success: boolean;
  url?: string | undefined;
  deployId?: string | undefined;
  logs: string[];
  errors: string[];
  duration: number;
}

export interface DeployProgress {
  phase: 'configuring' | 'building' | 'deploying' | 'verifying' | 'complete' | 'failed';
  message: string;
  percent?: number | undefined;
}

export interface AuthConfig {
  provider?: string | undefined;
  clientId?: string | undefined;
  redirectUrl?: string | undefined;
}

export interface PaymentConfig {
  provider?: string | undefined;
  currency?: string | undefined;
  webhookSecret?: string | undefined;
}
