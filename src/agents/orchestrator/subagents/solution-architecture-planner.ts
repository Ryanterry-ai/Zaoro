/**
 * Solution Architecture Planner (SAP)
 *
 * The SINGLE AUTHORITY for all technology selection decisions.
 * Consumes BusinessResearch + DesignBrief + Blueprint to produce
 * a comprehensive SolutionArchitectureDecision.
 *
 * SAP decides:
 *   - Platform (web, mobile, desktop, cli, extension, api, library)
 *   - Architecture style (monolith, microservices, serverless, edge, etc.)
 *   - Frontend framework, rendering strategy, state management, styling
 *   - Backend framework, runtime, database, ORM, auth
 *   - Deployment target, CI/CD, containerization
 *   - Integrations (payment, email, analytics, storage, etc.)
 *   - Security (auth, input validation, CSRF, rate limiting, etc.)
 *   - Observability (logging, monitoring, tracing, error tracking)
 *   - Scalability (caching, CDN, load balancing, auto-scaling)
 */

import type { PhaseContext, AgentResult } from '../types.js';
import type {
  SolutionArchitectureDecision,
  ProjectCategory,
  Platform,
  ArchitectureStyle,
  FrontendFramework,
  RenderingStrategy,
  Router,
  StateManagement,
  StylingFramework,
  AnimationLibrary,
  ComponentLibrary,
  BackendFramework,
  Runtime,
  ApiStyle,
  DatabaseType,
  ORM,
  AuthSystem,
  HostingPlatform,
  CiCdSystem,
  PaymentProvider,
  EmailProvider,
  StorageProvider,
  AnalyticsProvider,
  SearchProvider,
  CmsProvider,
} from '../../../bos/types-solution-architecture.js';

// ─── Rule Types ───────────────────────────────────────────────────────────────

interface Rule<T> {
  condition: (ctx: PlanningContext) => boolean;
  value: T;
  reasoning: string;
}

interface PlanningContext {
  businessResearch: any;
  blueprint: any;
  designBrief?: any;
}

// ─── Platform Detection ───────────────────────────────────────────────────────

function detectPlatform(ctx: PlanningContext): Platform {
  const bp = ctx.blueprint;
  const br = ctx.businessResearch;
  const features: string[] = bp?.features || [];
  const businessType = (br?.businessType || '').toLowerCase();

  if (features.some((f: string) => f.includes('mobile') || f.includes('ios') || f.includes('android'))) return 'mobile';
  if (features.some((f: string) => f.includes('desktop') || f.includes('electron') || f.includes('tauri'))) return 'desktop';
  if (features.some((f: string) => f.includes('cli') || f.includes('command-line'))) return 'cli';
  if (features.some((f: string) => f.includes('extension') || f.includes('chrome'))) return 'extension';
  if (features.some((f: string) => f.includes('api-only') || f.includes('microservice'))) return 'api';
  if (features.some((f: string) => f.includes('library') || f.includes('package'))) return 'library';
  if (features.some((f: string) => f.includes('auth') || f.includes('dashboard') || f.includes('admin'))) return 'fullstack';
  return 'web';
}

function detectProjectCategory(ctx: PlanningContext, platform: Platform): ProjectCategory {
  const br = ctx.businessResearch;
  const bp = ctx.blueprint;
  const features: string[] = bp?.features || [];
  const businessType = (br?.businessType || '').toLowerCase();

  if (platform === 'mobile') return 'mobile-app';
  if (platform === 'desktop') return 'desktop-app';
  if (platform === 'cli') return 'cli-tool';
  if (platform === 'extension') return 'browser-extension';
  if (platform === 'api') return 'api-service';
  if (platform === 'library') return 'library';

  if (features.some((f: string) => f.includes('saas') || f.includes('multi-tenant'))) return 'saas-app';
  if (features.some((f: string) => f.includes('admin') || f.includes('internal'))) return 'internal-tool';
  if (features.some((f: string) => f.includes('prototype') || f.includes('mvp'))) return 'prototype';
  if (features.some((f: string) => f.includes('enterprise'))) return 'enterprise';
  if (businessType.includes('ecommerce') || businessType.includes('store') || businessType.includes('shop')) return 'web-store';
  if (features.some((f: string) => f.includes('blog') || f.includes('cms') || f.includes('seo'))) return 'web-site';
  if (features.some((f: string) => f.includes('auth') || f.includes('dashboard'))) return 'fullstack-app';
  return 'web-app';
}

// ─── Frontend Rules ───────────────────────────────────────────────────────────

const FRONTEND_RULES: Rule<{ framework: FrontendFramework; rendering: RenderingStrategy; router: Router; state: StateManagement; styling: StylingFramework; animation: AnimationLibrary; components: ComponentLibrary; features: string[] }>[] = [
  // Mobile
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('mobile') || f.includes('ios') || f.includes('android')),
    value: { framework: 'expo', rendering: 'csr', router: 'expo-router', state: 'zustand', styling: 'nativewind', animation: 'react-spring', components: 'custom', features: ['expo-router', 'nativewind'] },
    reasoning: 'Expo for cross-platform mobile with native capabilities'
  },
  // Desktop
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('desktop') || f.includes('tauri')),
    value: { framework: 'tauri', rendering: 'csr', router: 'react-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['tauri', 'system-tray'] },
    reasoning: 'Tauri for smaller bundle size and security'
  },
  // CLI
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('cli')),
    value: { framework: 'none', rendering: 'csr', router: 'none', state: 'none', styling: 'none', animation: 'none', components: 'none', features: [] },
    reasoning: 'CLI tools have no frontend framework'
  },
  // Browser Extension
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('extension') || f.includes('chrome')),
    value: { framework: 'react-vite', rendering: 'csr', router: 'react-router', state: 'zustand', styling: 'tailwind', animation: 'css-only', components: 'shadcn', features: ['chrome-extension'] },
    reasoning: 'Vite for fast builds; React for popup UI'
  },
  // Ecommerce with auth
  {
    condition: (ctx) => ctx.businessResearch?.businessType?.includes('ecommerce') && ctx.blueprint?.features?.some((f: string) => f.includes('auth')),
    value: { framework: 'nextjs', rendering: 'isr', router: 'app-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['app-router', 'server-components', 'middleware'] },
    reasoning: 'Next.js ISR for product pages; middleware for auth'
  },
  // Ecommerce
  {
    condition: (ctx) => ctx.businessResearch?.businessType?.includes('ecommerce'),
    value: { framework: 'nextjs', rendering: 'isr', router: 'app-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['app-router', 'server-components'] },
    reasoning: 'Next.js ISR for product catalog with dynamic cart'
  },
  // SaaS/Dashboard
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('dashboard') || f.includes('admin') || f.includes('realtime')),
    value: { framework: 'nextjs', rendering: 'ssr', router: 'app-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['app-router', 'server-components', 'realtime'] },
    reasoning: 'Next.js SSR for dynamic dashboards'
  },
  // Content/Blog
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('blog') || f.includes('cms') || f.includes('seo')),
    value: { framework: 'astro', rendering: 'ssg', router: 'file-based', state: 'none', styling: 'tailwind', animation: 'css-only', components: 'none', features: ['content-collections', 'mdx'] },
    reasoning: 'Astro for content-first sites with zero JS by default'
  },
  // GraphQL
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('graphql')),
    value: { framework: 'nextjs', rendering: 'ssr', router: 'app-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['app-router', 'graphql'] },
    reasoning: 'Next.js with GraphQL integration'
  },
  // Default
  {
    condition: () => true,
    value: { framework: 'nextjs', rendering: 'ssr', router: 'app-router', state: 'zustand', styling: 'tailwind', animation: 'framer-motion', components: 'shadcn', features: ['app-router', 'server-components'] },
    reasoning: 'Default to Next.js for balanced performance and SEO'
  }
];

// ─── Backend Rules ────────────────────────────────────────────────────────────

const BACKEND_RULES: Rule<{ framework: BackendFramework; runtime: Runtime; apiStyle: ApiStyle; features: string[] }>[] = [
  // CLI
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('cli')),
    value: { framework: 'none', runtime: 'node', apiStyle: 'none', features: [] },
    reasoning: 'CLI tools have no backend'
  },
  // Extension
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('extension')),
    value: { framework: 'none', runtime: 'node', apiStyle: 'none', features: [] },
    reasoning: 'Browser extensions have no backend'
  },
  // GraphQL
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('graphql')),
    value: { framework: 'graphql-yoga', runtime: 'node', apiStyle: 'graphql', features: ['graphql-yoga', 'subscriptions'] },
    reasoning: 'GraphQL Yoga for flexible API with subscriptions'
  },
  // tRPC
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('trpc') || f.includes('type-safe')),
    value: { framework: 'trpc', runtime: 'node', apiStyle: 'trpc', features: ['trpc', 'type-safety'] },
    reasoning: 'tRPC for end-to-end type safety'
  },
  // High-performance
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('high-performance') || f.includes('realtime')),
    value: { framework: 'fastify', runtime: 'node', apiStyle: 'rest', features: ['fastify', 'websocket'] },
    reasoning: 'Fastify for high-performance APIs'
  },
  // Python
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('python') || f.includes('fastapi') || f.includes('django')),
    value: { framework: 'python-fastapi', runtime: 'python', apiStyle: 'rest', features: ['pydantic', 'async'] },
    reasoning: 'FastAPI for Python-based backends'
  },
  // Go
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('go') || f.includes('golang')),
    value: { framework: 'go-gin', runtime: 'go', apiStyle: 'rest', features: ['gin', 'middleware'] },
    reasoning: 'Gin for Go-based backends'
  },
  // Rust
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('rust') || f.includes('axum')),
    value: { framework: 'rust-axum', runtime: 'rust', apiStyle: 'rest', features: ['axum', 'tower'] },
    reasoning: 'Axum for Rust-based backends'
  },
  // Default
  {
    condition: () => true,
    value: { framework: 'nextjs-api', runtime: 'node', apiStyle: 'rest', features: ['nextauth', 'prisma'] },
    reasoning: 'Default to Next.js API routes for fullstack apps'
  }
];

// ─── Database Rules ───────────────────────────────────────────────────────────

const DATABASE_RULES: Rule<{ type: DatabaseType; orm: ORM; features: string[] }>[] = [
  // No backend
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('cli') || f.includes('extension')),
    value: { type: 'none', orm: 'none', features: [] },
    reasoning: 'No database needed for CLI/extension'
  },
  // MongoDB preference
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('mongodb') || f.includes('nosql')),
    value: { type: 'mongodb', orm: 'mongoose', features: ['schema-validation'] },
    reasoning: 'MongoDB for flexible document storage'
  },
  // SQLite for lightweight
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('sqlite') || f.includes('lightweight')),
    value: { type: 'sqlite', orm: 'drizzle', features: ['embedded-db'] },
    reasoning: 'SQLite for lightweight embedded database'
  },
  // Supabase for quick setup
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('supabase') || f.includes('quick-setup')),
    value: { type: 'supabase', orm: 'prisma', features: ['realtime', 'auth'] },
    reasoning: 'Supabase for quick setup with built-in auth'
  },
  // Default
  {
    condition: () => true,
    value: { type: 'postgresql', orm: 'prisma', features: ['migrations', 'type-safety'] },
    reasoning: 'PostgreSQL for robust relational database'
  }
];

// ─── Auth Rules ───────────────────────────────────────────────────────────────

const AUTH_RULES: Rule<{ system: AuthSystem; providers: string[]; mfa: boolean; sessionStrategy: 'jwt' | 'database'; features: string[] }>[] = [
  // No auth needed
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('no-auth') || f.includes('public')),
    value: { system: 'none', providers: [], mfa: false, sessionStrategy: 'jwt', features: [] },
    reasoning: 'No authentication required'
  },
  // Enterprise SSO
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('sso') || f.includes('saml') || f.includes('enterprise')),
    value: { system: 'saml', providers: ['okta', 'azure-ad'], mfa: true, sessionStrategy: 'database', features: ['sso', 'mfa', 'audit-log'] },
    reasoning: 'SAML for enterprise SSO requirements'
  },
  // Clerk for modern apps
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('clerk')),
    value: { system: 'clerk', providers: ['google', 'github', 'email'], mfa: true, sessionStrategy: 'jwt', features: ['social-login', 'mfa'] },
    reasoning: 'Clerk for modern authentication'
  },
  // NextAuth for Next.js
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('auth') || f.includes('login')),
    value: { system: 'nextauth', providers: ['google', 'github', 'credentials'], mfa: false, sessionStrategy: 'jwt', features: ['social-login', 'session'] },
    reasoning: 'NextAuth for Next.js authentication'
  },
  // Default
  {
    condition: () => true,
    value: { system: 'nextauth', providers: ['google', 'credentials'], mfa: false, sessionStrategy: 'jwt', features: ['session'] },
    reasoning: 'Default to NextAuth for session management'
  }
];

// ─── Deployment Rules ─────────────────────────────────────────────────────────

const DEPLOYMENT_RULES: Rule<{ hosting: HostingPlatform; edge: boolean; cdn: boolean; containerized: boolean; ciCd: CiCdSystem }>[] = [
  // Mobile
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('mobile') || f.includes('ios') || f.includes('android')),
    value: { hosting: 'app-store', edge: false, cdn: false, containerized: false, ciCd: 'github-actions' },
    reasoning: 'Mobile apps deploy to app stores'
  },
  // Desktop
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('desktop') || f.includes('tauri')),
    value: { hosting: 'app-store', edge: false, cdn: false, containerized: false, ciCd: 'github-actions' },
    reasoning: 'Desktop apps ship as installers'
  },
  // CLI
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('cli')),
    value: { hosting: 'npm', edge: false, cdn: false, containerized: false, ciCd: 'github-actions' },
    reasoning: 'CLI tools distribute via npm'
  },
  // Extension
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('extension')),
    value: { hosting: 'chrome-web-store', edge: false, cdn: false, containerized: false, ciCd: 'github-actions' },
    reasoning: 'Extensions deploy to Chrome Web Store'
  },
  // Docker
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('docker') || f.includes('container')),
    value: { hosting: 'docker', edge: false, cdn: false, containerized: true, ciCd: 'github-actions' },
    reasoning: 'Docker for containerized deployments'
  },
  // Edge-first
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('edge') || f.includes('serverless')),
    value: { hosting: 'vercel', edge: true, cdn: true, containerized: false, ciCd: 'github-actions' },
    reasoning: 'Vercel for edge-first deployments'
  },
  // Default
  {
    condition: () => true,
    value: { hosting: 'vercel', edge: false, cdn: true, containerized: false, ciCd: 'github-actions' },
    reasoning: 'Default to Vercel for easy deployment'
  }
];

// ─── Integration Rules ────────────────────────────────────────────────────────

function determineIntegrations(ctx: PlanningContext): SolutionArchitectureDecision['integrations'] {
  const features: string[] = ctx.blueprint?.features || [];
  const businessType = (ctx.businessResearch?.businessType || '').toLowerCase();

  // Payment
  const payment: PaymentProvider[] = [];
  if (businessType.includes('ecommerce') || businessType.includes('store') || features.some((f: string) => f.includes('payment') || f.includes('checkout'))) {
    payment.push('stripe');
    if (businessType.includes('india') || features.some((f: string) => f.includes('india') || f.includes('razorpay'))) {
      payment.push('razorpay');
    }
  }

  // Email
  let email: EmailProvider = 'none';
  if (features.some((f: string) => f.includes('email') || f.includes('notification'))) {
    email = 'resend';
  }

  // Storage
  let storage: StorageProvider = 'none';
  if (features.some((f: string) => f.includes('upload') || f.includes('file') || f.includes('image'))) {
    storage = 's3';
  }

  // Analytics
  let analytics: AnalyticsProvider = 'none';
  if (features.some((f: string) => f.includes('analytics') || f.includes('tracking'))) {
    analytics = 'plausible';
  }

  // Search
  let search: SearchProvider = 'none';
  if (features.some((f: string) => f.includes('search') || f.includes('filter'))) {
    search = 'meilisearch';
  }

  // CMS
  let cms: CmsProvider = 'none';
  if (features.some((f: string) => f.includes('cms') || f.includes('content'))) {
    cms = 'mdx';
  }

  return {
    payment,
    email,
    storage,
    analytics,
    search,
    cms,
    custom: []
  };
}

// ─── Security Rules ───────────────────────────────────────────────────────────

function determineSecurity(ctx: PlanningContext, authSystem: AuthSystem): SolutionArchitectureDecision['security'] {
  const features: string[] = ctx.blueprint?.features || [];
  const isEcommerce = ctx.businessResearch?.businessType?.includes('ecommerce');
  const isEnterprise = features.some((f: string) => f.includes('enterprise') || f.includes('compliance'));

  return {
    authentication: authSystem,
    authorization: isEnterprise ? 'rbac' : 'none',
    inputValidation: 'zod',
    outputEncoding: true,
    csrfProtection: authSystem !== 'none',
    rateLimiting: isEcommerce || isEnterprise,
    helmet: true,
    cors: true,
    contentSecurityPolicy: isEnterprise,
    sqlInjectionPrevention: true,
    xssPrevention: true,
    httpsRedirect: true,
    secureCookies: authSystem !== 'none',
    features: [
      'input-validation',
      'output-encoding',
      'xss-prevention',
      ...(authSystem !== 'none' ? ['csrf-protection', 'secure-cookies'] : []),
      ...(isEnterprise ? ['rate-limiting', 'csp'] : [])
    ]
  };
}

// ─── Observability Rules ──────────────────────────────────────────────────────

function determineObservability(ctx: PlanningContext): SolutionArchitectureDecision['observability'] {
  const features: string[] = ctx.blueprint?.features || [];
  const isEnterprise = features.some((f: string) => f.includes('enterprise') || f.includes('monitoring'));

  return {
    logging: isEnterprise ? 'pino' : 'console',
    monitoring: isEnterprise ? 'sentry' : 'none',
    tracing: isEnterprise ? 'opentelemetry' : 'none',
    errorTracking: isEnterprise,
    performanceMonitoring: isEnterprise,
    uptimeMonitoring: false,
    features: [
      ...(isEnterprise ? ['structured-logging', 'error-tracking'] : ['console-logging'])
    ]
  };
}

// ─── Scalability Rules ────────────────────────────────────────────────────────

function determineScalability(ctx: PlanningContext): SolutionArchitectureDecision['scalability'] {
  const features: string[] = ctx.blueprint?.features || [];
  const isHighTraffic = features.some((f: string) => f.includes('scale') || f.includes('high-traffic'));
  const needsSearch = features.some((f: string) => f.includes('search'));

  return {
    caching: isHighTraffic ? 'redis' : 'swr',
    scaling: isHighTraffic ? 'auto' : 'none',
    cdn: true,
    loadBalancing: isHighTraffic,
    databaseReplication: isHighTraffic,
    queueSystem: isHighTraffic ? 'bullmq' : 'none',
    searchEngine: needsSearch ? 'meilisearch' : 'none',
    features: [
      'cdn',
      ...(isHighTraffic ? ['auto-scaling', 'load-balancing', 'caching'] : ['swr-caching'])
    ]
  };
}

// ─── Dependency Generation ────────────────────────────────────────────────────

function generateDependencies(decision: SolutionArchitectureDecision): Record<string, string> {
  const deps: Record<string, string> = {};

  // Frontend
  switch (decision.frontend.framework) {
    case 'nextjs':
      deps['next'] = '^14.2.0';
      deps['react'] = '^18.3.0';
      deps['react-dom'] = '^18.3.0';
      break;
    case 'react-vite':
    case 'react-spa':
      deps['vite'] = '^6.2.0';
      deps['react'] = '^19.0.0';
      deps['react-dom'] = '^19.0.0';
      deps['@vitejs/plugin-react'] = '^5.0.0';
      deps['react-router-dom'] = '^7.0.0';
      break;
    case 'astro':
      deps['astro'] = '^5.0.0';
      deps['@astrojs/react'] = '^4.0.0';
      deps['react'] = '^18.3.0';
      deps['react-dom'] = '^18.3.0';
      break;
    case 'expo':
      deps['expo'] = '~52.0.0';
      deps['react'] = '^18.3.0';
      deps['react-native'] = '^0.76.0';
      deps['expo-router'] = '~4.0.0';
      break;
    case 'tauri':
      deps['@tauri-apps/api'] = '^2.0.0';
      deps['react'] = '^19.0.0';
      deps['react-dom'] = '^19.0.0';
      deps['react-router-dom'] = '^7.0.0';
      break;
  }

  // State
  switch (decision.frontend.stateManagement) {
    case 'zustand': deps['zustand'] = '^5.0.0'; break;
    case 'redux-toolkit':
      deps['@reduxjs/toolkit'] = '^2.0.0';
      deps['react-redux'] = '^9.0.0';
      break;
    case 'jotai': deps['jotai'] = '^2.0.0'; break;
    case 'pinia': deps['pinia'] = '^2.0.0'; break;
  }

  // Styling
  switch (decision.frontend.styling) {
    case 'tailwind': deps['tailwindcss'] = '^4.0.0'; break;
    case 'nativewind': deps['nativewind'] = '^4.0.0'; break;
    case 'chakra-ui': deps['@chakra-ui/react'] = '^3.0.0'; break;
    case 'material-ui':
      deps['@mui/material'] = '^6.0.0';
      deps['@emotion/react'] = '^11.0.0';
      deps['@emotion/styled'] = '^11.0.0';
      break;
  }

  // Animation
  if (decision.frontend.animation === 'framer-motion') deps['framer-motion'] = '^12.0.0';
  if (decision.frontend.animation === 'gsap') deps['gsap'] = '^3.12.0';
  if (decision.frontend.animation === 'react-spring') deps['@react-spring/web'] = '^9.7.0';

  // Icons
  deps['lucide-react'] = '^0.500.0';

  // Backend
  switch (decision.backend.framework) {
    case 'fastify': deps['fastify'] = '^5.0.0'; break;
    case 'nestjs':
      deps['@nestjs/core'] = '^11.0.0';
      deps['@nestjs/common'] = '^11.0.0';
      break;
    case 'graphql-yoga': deps['graphql-yoga'] = '^5.0.0'; break;
    case 'trpc': deps['@trpc/server'] = '^11.0.0'; break;
    case 'express': deps['express'] = '^4.21.0'; break;
    case 'hono': deps['hono'] = '^4.0.0'; break;
  }

  // Database
  switch (decision.database.type) {
    case 'postgresql': deps['pg'] = '^8.0.0'; break;
    case 'mongodb': deps['mongodb'] = '^6.0.0'; break;
    case 'sqlite': deps['better-sqlite3'] = '^11.0.0'; break;
  }

  // ORM
  switch (decision.database.orm) {
    case 'prisma':
      deps['prisma'] = '^6.0.0';
      deps['@prisma/client'] = '^6.0.0';
      break;
    case 'drizzle': deps['drizzle-orm'] = '^0.30.0'; break;
    case 'mongoose': deps['mongoose'] = '^8.0.0'; break;
  }

  // Auth
  switch (decision.auth.system) {
    case 'nextauth': deps['next-auth'] = '^5.0.0'; break;
    case 'clerk': deps['@clerk/nextjs'] = '^5.0.0'; break;
    case 'lucia': deps['lucia'] = '^3.0.0'; break;
    case 'better-auth': deps['better-auth'] = '^1.0.0'; break;
  }

  // Payment
  if (decision.integrations.payment.includes('stripe')) deps['stripe'] = '^17.0.0';
  if (decision.integrations.payment.includes('razorpay')) deps['razorpay'] = '^2.8.0';

  // Email
  if (decision.integrations.email === 'resend') deps['resend'] = '^4.0.0';
  if (decision.integrations.email === 'sendgrid') deps['@sendgrid/mail'] = '^8.0.0';

  // Storage
  if (decision.integrations.storage === 's3') deps['@aws-sdk/client-s3'] = '^3.0.0';
  if (decision.integrations.storage === 'cloudinary') deps['cloudinary'] = '^2.0.0';

  // Monitoring
  if (decision.observability.monitoring === 'sentry') deps['@sentry/nextjs'] = '^8.0.0';

  return deps;
}

function generateDevDependencies(decision: SolutionArchitectureDecision): Record<string, string> {
  const devDeps: Record<string, string> = {
    'typescript': '~5.8.0'
  };

  if (decision.frontend.framework !== 'none') {
    devDeps['@types/react'] = '^18.3.0';
    devDeps['@types/react-dom'] = '^18.3.0';
  }

  if (decision.frontend.framework === 'react-vite' || decision.frontend.framework === 'tauri') {
    devDeps['vite'] = '^6.2.0';
    devDeps['@vitejs/plugin-react'] = '^5.0.0';
  }

  return devDeps;
}

function generateScripts(decision: SolutionArchitectureDecision): Record<string, string> {
  const scripts: Record<string, string> = {};

  switch (decision.frontend.framework) {
    case 'nextjs':
      scripts['dev'] = 'next dev';
      scripts['build'] = 'next build';
      scripts['start'] = 'next start';
      scripts['lint'] = 'next lint';
      break;
    case 'react-vite':
    case 'react-spa':
    case 'tauri':
      scripts['dev'] = 'vite --port=3000 --host=0.0.0.0';
      scripts['build'] = 'vite build';
      scripts['preview'] = 'vite preview';
      scripts['lint'] = 'tsc --noEmit';
      break;
    case 'astro':
      scripts['dev'] = 'astro dev';
      scripts['build'] = 'astro build';
      scripts['preview'] = 'astro preview';
      scripts['lint'] = 'astro check';
      break;
    case 'expo':
      scripts['dev'] = 'expo start';
      scripts['android'] = 'expo run:android';
      scripts['ios'] = 'expo run:ios';
      break;
    case 'none':
      if (decision.projectCategory === 'cli-tool') {
        scripts['dev'] = 'tsx src/cli.ts';
        scripts['build'] = 'tsc && node dist/cli.js';
        scripts['lint'] = 'tsc --noEmit';
      }
      break;
  }

  if (decision.deployment.containerized) {
    scripts['docker:build'] = 'docker build -t app .';
    scripts['docker:run'] = 'docker run -p 3000:3000 app';
  }

  return scripts;
}

// ─── Main Planner ─────────────────────────────────────────────────────────────

function getFirstMatchingRule<T>(rules: Rule<T>[], ctx: PlanningContext): { value: T; reasoning: string } {
  for (const rule of rules) {
    if (rule.condition(ctx)) {
      return { value: rule.value, reasoning: rule.reasoning };
    }
  }
  // Should never happen if there's a default rule
  throw new Error('No matching rule found');
}

export class SolutionArchitecturePlanner {
  name = 'solution-architecture-planner';

  async run(ctx: PhaseContext): Promise<AgentResult<SolutionArchitectureDecision>> {
    const start = Date.now();

    try {
      const planningCtx: PlanningContext = {
        businessResearch: ctx.businessResearch,
        blueprint: ctx.breResult?.blueprint,
        designBrief: ctx.designBrief
      };

      // Detect platform and category
      const platform = detectPlatform(planningCtx);
      const projectCategory = detectProjectCategory(planningCtx, platform);

      // Get frontend config
      const frontendRule = getFirstMatchingRule(FRONTEND_RULES, planningCtx);

      // Get backend config
      const backendRule = getFirstMatchingRule(BACKEND_RULES, planningCtx);

      // Get database config
      const databaseRule = getFirstMatchingRule(DATABASE_RULES, planningCtx);

      // Get auth config
      const authRule = getFirstMatchingRule(AUTH_RULES, planningCtx);

      // Get deployment config
      const deploymentRule = getFirstMatchingRule(DEPLOYMENT_RULES, planningCtx);

      // Determine integrations
      const integrations = determineIntegrations(planningCtx);

      // Determine security
      const security = determineSecurity(planningCtx, authRule.value.system);

      // Determine observability
      const observability = determineObservability(planningCtx);

      // Determine scalability
      const scalability = determineScalability(planningCtx);

      // Determine architecture style
      let architectureStyle: ArchitectureStyle = 'monolith';
      if (platform === 'api') architectureStyle = 'monolith';
      else if (projectCategory === 'saas-app') architectureStyle = 'modular-monolith';
      else if (scalability.scaling === 'auto') architectureStyle = 'microservices';

      // Build the decision
      const decision: SolutionArchitectureDecision = {
        projectCategory,
        platform,
        architectureStyle,
        frontend: {
          framework: frontendRule.value.framework,
          version: frontendRule.value.framework === 'nextjs' ? '14.2.0' : frontendRule.value.framework === 'astro' ? '5.0.0' : '6.2.0',
          rendering: frontendRule.value.rendering,
          router: frontendRule.value.router,
          stateManagement: frontendRule.value.state,
          styling: frontendRule.value.styling,
          animation: frontendRule.value.animation,
          componentLibrary: frontendRule.value.components,
          features: frontendRule.value.features
        },
        backend: {
          framework: backendRule.value.framework,
          runtime: backendRule.value.runtime,
          apiStyle: backendRule.value.apiStyle,
          features: backendRule.value.features
        },
        database: {
          type: databaseRule.value.type,
          orm: databaseRule.value.orm,
          caching: scalability.caching === 'redis' ? 'redis' : 'none',
          features: databaseRule.value.features
        },
        auth: {
          system: authRule.value.system,
          providers: authRule.value.providers,
          mfa: authRule.value.mfa,
          sessionStrategy: authRule.value.sessionStrategy,
          features: authRule.value.features
        },
        deployment: {
          hosting: deploymentRule.value.hosting,
          edge: deploymentRule.value.edge,
          cdn: deploymentRule.value.cdn,
          containerized: deploymentRule.value.containerized,
          ciCd: deploymentRule.value.ciCd,
          environmentVariables: [],
          ssl: true
        },
        integrations,
        security,
        observability,
        scalability,
        dependencies: {},
        devDependencies: {},
        scripts: {},
        rationale: [
          `Platform: ${platform}`,
          `Category: ${projectCategory}`,
          `Architecture: ${architectureStyle}`,
          `Frontend: ${frontendRule.reasoning}`,
          `Backend: ${backendRule.reasoning}`,
          `Database: ${databaseRule.reasoning}`,
          `Auth: ${authRule.reasoning}`,
          `Deployment: ${deploymentRule.reasoning}`
        ],
        tradeoffs: [
          architectureStyle === 'monolith' ? 'Monolith: simpler deployment but harder to scale individual components' : 'Modular: better separation but more complexity',
          frontendRule.value.framework === 'nextjs' ? 'Next.js: great DX but vendor lock-in' : 'Alternative framework: more flexibility but less ecosystem'
        ],
        complexity: calculateComplexity(projectCategory, frontendRule.value.framework, backendRule.value.framework, databaseRule.value.type),
        estimatedHours: estimateHours(projectCategory, frontendRule.value.framework, backendRule.value.framework)
      };

      // Generate dependencies
      decision.dependencies = generateDependencies(decision);
      decision.devDependencies = generateDevDependencies(decision);
      decision.scripts = generateScripts(decision);

      return {
        status: 'completed',
        data: decision,
        duration: Date.now() - start,
        attempts: 1
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
        attempts: 1
      };
    }
  }
}

function calculateComplexity(category: ProjectCategory, frontend: FrontendFramework, backend: BackendFramework, database: DatabaseType): number {
  let score = 3; // Base complexity

  // Category
  if (category === 'enterprise') score += 4;
  else if (category === 'saas-app') score += 3;
  else if (category === 'fullstack-app') score += 2;
  else if (category === 'web-store') score += 2;
  else if (category === 'web-app') score += 1;
  else if (category === 'cli-tool') score -= 1;

  // Frontend
  if (frontend === 'nextjs') score += 1;
  if (frontend === 'astro') score -= 1;

  // Backend
  if (backend === 'nestjs') score += 2;
  if (backend === 'fastify') score += 1;
  if (backend === 'none') score -= 2;

  // Database
  if (database === 'postgresql') score += 1;
  if (database === 'mongodb') score += 1;
  if (database === 'none') score -= 1;

  return Math.max(1, Math.min(10, score));
}

function estimateHours(category: ProjectCategory, frontend: FrontendFramework, backend: BackendFramework): number {
  let hours = 8; // Base

  // Category
  if (category === 'enterprise') hours += 40;
  else if (category === 'saas-app') hours += 24;
  else if (category === 'fullstack-app') hours += 16;
  else if (category === 'web-store') hours += 12;
  else if (category === 'web-app') hours += 8;
  else if (category === 'web-site') hours += 4;
  else if (category === 'cli-tool') hours += 6;
  else if (category === 'mobile-app') hours += 20;
  else if (category === 'desktop-app') hours += 16;

  // Backend complexity
  if (backend !== 'none') hours += 8;

  return hours;
}
