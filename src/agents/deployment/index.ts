/**
 * Deployment Agent — handles deployment to various hosting platforms.
 *
 * Supports:
 * - Vercel (Next.js, React)
 * - Cloudflare Pages
 * - Docker (any framework)
 * - Netlify
 * - Manual deployment
 */

export { DeployExecutor } from './deploy-executor.js';
export { DeployConfigGenerator } from './config-generator.js';
export { detectDeploymentPlatform, getPlatformInstructions } from './platform-detect.js';
export type { DeployTarget, DeployConfig, DeployResult, DeployProgress } from './types.js';
