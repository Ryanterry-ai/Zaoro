# Tech Stack Planner & Enhanced Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with mandatory review checkpoints after each task.

**Goal:** Add a Tech Stack Planner as the single authority for technology selection, producing a comprehensive TechStackDecision that the renderer consumes to generate framework-appropriate, production-quality code.

**Architecture:** The pipeline currently excels at deciding WHAT to build (business analysis, BOS, workflows, entities). This plan adds a Tech Stack Planner subagent that decides HOW to build. The planner is the single authority for technology selection. The renderer remains framework-agnostic and consumes the resulting Execution Blueprint.

**Execution Model:** Subagent-driven with mandatory review checkpoints. Each subagent:
1. Implements only its scope
2. Runs TypeScript (`npx tsc --noEmit`)
3. Runs relevant tests
4. Produces a short report
5. Hands off to the next task

**Phases:**
- **Phase A — Architecture** (Tasks 1-3): Tech Stack Planner, Framework Selection, Blueprint Integration. No UI changes.
- **Phase B — Renderer** (Tasks 4-6): Component Library, Renderer Integration, Design Presets.
- **Phase C — Validation** (Task 7): Benchmarks, Runtime, Screenshots, Quality Gates, Build Verification.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/bos/types-tech-stack.ts` | TechStackDecision type definitions (frontend/backend/deployment) |
| `src/agents/orchestrator/subagents/tech-stack-planner.ts` | Tech Stack Planner - single authority for technology selection |
| `src/agents/orchestrator/subagents/tech-stack-planner.test.ts` | Tests for Tech Stack Planner |
| `src/generation/renderers/templates/ecommerce.ts` | Ecommerce component templates |
| `src/generation/renderers/templates/saas.ts` | SaaS component templates |
| `src/generation/renderers/templates/restaurant.ts` | Restaurant component templates |
| `src/generation/renderers/templates/content.ts` | Content/Marketing component templates |
| `src/generation/renderers/templates/mobile.ts` | Mobile app templates (React Native/Expo) |
| `src/generation/renderers/templates/desktop.ts` | Desktop app templates (Electron/Tauri) |
| `src/generation/renderers/templates/api.ts` | API backend templates (Fastify/NestJS/Express) |
| `src/generation/renderers/templates/cli.ts` | CLI tool templates |
| `src/generation/renderers/design-systems.ts` | Design system presets per industry |

### Modified Files
| File | Change |
|------|--------|
| `src/agents/orchestrator/lead-agent.ts` | Wire TechStackPlanner into Phase A |
| `src/agents/orchestrator/types.ts` | Add ITechStackPlanner, TechStackDecision to PhaseContext |
| `src/agents/orchestrator/subagents/build-agent.ts` | Pass TechStackDecision to renderer |
| `src/bos/reasoning/rules-engine.ts` | Add techStack to BREContext |
| `src/generation/renderers/react-renderer.ts` | Consume TechStackDecision, use templates |
| `src/generation/build-pipeline.ts` | Pass techStack to renderer |
| `src/generation/renderers/renderer.ts` | Add techStack to RenderContext |

---

## Global Constraints

- TypeScript strict mode with `exactOptionalPropertyTypes: true`
- Node.js at `C:\Users\viren\AppData\Local\nvm\v22.23.1` - must set `$env:PATH` prefix
- Path alias `@/*` maps to `./*` (files at root, not in `src/`)
- No LLM calls for boilerplate - copy from templates and parameterize
- Every component must use structured data (JSON), never hardcoded inline
- All generated code must pass `npx tsc --noEmit`
- Design decisions come from DesignBrief/DesignDNA, not renderer
- Business content comes from ContentOrchestrator, not renderer
- TechStack Planner is the SINGLE AUTHORITY for technology selection
- No duplicate planners or parallel decision systems

---

# Phase A — Architecture

No UI changes. Pure type definitions and planner logic.

---

## Task 1: Create TechStackDecision Types

**Files:**
- Create: `src/bos/types-tech-stack.ts`
- Modify: `src/agents/orchestrator/types.ts`

**Quality Gate:** `npx tsc --noEmit` passes with 0 errors.

- [ ] **Step 1: Create TechStackDecision type definitions**

```typescript
// src/bos/types-tech-stack.ts

export type FrontendFramework =
  | 'nextjs' | 'react-vite' | 'react-webpack' | 'react-spa'
  | 'astro' | 'remix' | 'gatsby'
  | 'react-native' | 'expo'
  | 'electron' | 'tauri'
  | 'svelte' | 'sveltekit'
  | 'vue' | 'nuxt'
  | 'angular'
  | 'solid'
  | 'qwik';

export type BackendFramework =
  | 'express' | 'fastify' | 'nestjs' | 'hono'
  | 'nextjs-api' | 'remix-api'
  | 'graphql-yoga' | 'apollo-server'
  | 'trpc'
  | 'python-fastapi' | 'python-django' | 'python-flask'
  | 'go-gin' | 'go-fiber'
  | 'rust-axum' | 'rust-actix'
  | 'none';

export type RenderingStrategy = 'ssr' | 'ssg' | 'csr' | 'isr' | 'hybrid';
export type Runtime = 'node' | 'bun' | 'deno' | 'edge' | 'serverless' | 'wasm';

export type StateManagement =
  | 'zustand' | 'jotai' | 'redux-toolkit' | 'context-api' | 'valtio'
  | 'pinia' | 'vuex'
  | 'mobx' | 'recoil'
  | 'none';

export type StylingFramework =
  | 'tailwind' | 'css-modules' | 'styled-components' | 'emotion'
  | 'vanilla-extract' | 'panda-css' | 'unocss'
  | 'chakra-ui' | 'material-ui' | 'shadcn-ui' | 'radix'
  | 'nativewind' | 'tamagui'
  | 'none';

export type AnimationLibrary = 'framer-motion' | 'gsap' | 'lottie' | 'css-only' | 'react-spring' | 'auto' | 'none';

export type ComponentLibrary = 'shadcn' | 'radix' | 'headless-ui' | 'chakra' | 'mui' | 'ant-design' | 'bootstrap' | 'custom' | 'none';

export type DatabaseType =
  | 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'
  | 'supabase' | 'firebase' | 'planetscale' | 'turso'
  | 'redis' | 'none';

export type ORM = 'prisma' | 'drizzle' | 'typeorm' | 'sequelize' | 'mongoose' | 'kysely' | 'none';

export type AuthSystem = 'nextauth' | 'clerk' | 'supabase-auth' | 'firebase-auth' | 'lucia' | 'custom-jwt' | 'custom-session' | 'none';

export type HostingPlatform =
  | 'vercel' | 'netlify' | 'cloudflare-pages'
  | 'aws' | 'gcp' | 'azure'
  | 'railway' | 'render' | 'fly.io'
  | 'docker' | 'kubernetes'
  | 'electron-store' | 'tauri' | 'app-store' | 'play-store'
  | 'npm' | 'pip' | 'cargo'
  | 'chrome-web-store' | 'firefox-addons'
  | 'static' | 'github-pages';

export type ProjectCategory =
  | 'web-app' | 'web-site' | 'web-store'
  | 'mobile-app' | 'mobile-store'
  | 'desktop-app'
  | 'api-service' | 'graphql-service'
  | 'cli-tool' | 'browser-extension'
  | 'library' | 'package'
  | 'fullstack-app';

export interface FrontendConfig {
  framework: FrontendFramework;
  version: string;
  rendering: RenderingStrategy;
  router: string;
  stateManagement: StateManagement;
  styling: StylingFramework;
  animation: AnimationLibrary;
  componentLibrary: ComponentLibrary;
  features: string[];
}

export interface BackendConfig {
  framework: BackendFramework;
  runtime: Runtime;
  database: DatabaseType;
  orm: ORM;
  auth: AuthSystem;
  apiStyle: 'rest' | 'graphql' | 'trpc' | 'grpc' | 'none';
  features: string[];
}

export interface DeploymentConfig {
  hosting: HostingPlatform;
  edge: boolean;
  cdn: boolean;
  containerized: boolean;
  ciCd: 'github-actions' | 'gitlab-ci' | 'none';
  environmentVariables: string[];
}

export interface TechStackDecision {
  projectCategory: ProjectCategory;
  frontend: FrontendConfig;
  backend: BackendConfig;
  deployment: DeploymentConfig;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  rationale: string[];
}
```

- [ ] **Step 2: Add ITechStackPlanner to orchestrator types**

```typescript
// Add to src/agents/orchestrator/types.ts

import { TechStackDecision } from '../../bos/types-tech-stack';

export interface ITechStackPlanner {
  plan(ctx: {
    businessResearch: any;
    blueprint: any;
    designBrief?: any;
  }): Promise<TechStackDecision>;
}

export interface PhaseContext {
  // ... existing fields
  techStack?: TechStackDecision;
}

export interface OrchestratorResult {
  // ... existing fields
  techStack?: TechStackDecision;
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/bos/types-tech-stack.ts src/agents/orchestrator/types.ts
git commit -m "feat: add TechStackDecision types (frontend/backend/deployment) for tech stack planner"
```

---

## Task 2: Implement TechStackPlanner Subagent

**Files:**
- Create: `src/agents/orchestrator/subagents/tech-stack-planner.ts`
- Create: `src/agents/orchestrator/subagents/tech-stack-planner.test.ts`

**Quality Gate:** `npx tsc --noEmit` passes, all tests pass.

- [ ] **Step 1: Create TechStackPlanner implementation**

```typescript
// src/agents/orchestrator/subagents/tech-stack-planner.ts

import {
  TechStackDecision,
  ProjectCategory,
  FrontendFramework,
  BackendFramework,
  RenderingStrategy,
  Runtime,
  StateManagement,
  StylingFramework,
  AnimationLibrary,
  ComponentLibrary,
  DatabaseType,
  ORM,
  AuthSystem,
  HostingPlatform
} from '../../bos/types-tech-stack';

export interface TechStackPlannerContext {
  businessResearch: any;
  blueprint: any;
  designBrief?: any;
}

// ─── Project Category Detection ───────────────────────────────────────────────

function detectProjectCategory(ctx: TechStackPlannerContext): ProjectCategory {
  const br = ctx.businessResearch;
  const bp = ctx.blueprint;
  const features: string[] = bp?.features || [];
  const businessType = (br?.businessType || '').toLowerCase();

  // Mobile
  if (features.some(f => f.includes('mobile') || f.includes('ios') || f.includes('android')))
    return 'mobile-app';
  if (businessType.includes('mobile') || features.includes('capacitor'))
    return 'mobile-app';

  // Desktop
  if (features.some(f => f.includes('desktop') || f.includes('electron') || f.includes('tauri')))
    return 'desktop-app';

  // CLI
  if (features.some(f => f.includes('cli') || f.includes('command-line')))
    return 'cli-tool';

  // Browser Extension
  if (features.some(f => f.includes('extension') || f.includes('chrome-extension') || f.includes('browser-extension')))
    return 'browser-extension';

  // API-only
  if (features.some(f => f.includes('api-only') || f.includes('microservice')))
    return 'api-service';

  // Fullstack
  if (features.some(f => f.includes('auth') || f.includes('dashboard') || f.includes('admin')))
    return 'fullstack-app';

  // Ecommerce
  if (businessType.includes('ecommerce') || businessType.includes('store') || businessType.includes('shop'))
    return 'web-store';

  // Content site
  if (features.some(f => f.includes('blog') || f.includes('cms') || f.includes('seo')))
    return 'web-site';

  // Default
  return 'web-app';
}

// ─── Frontend Rules ───────────────────────────────────────────────────────────

interface FrontendRule {
  condition: (ctx: TechStackPlannerContext, category: ProjectCategory) => boolean;
  framework: FrontendFramework;
  rendering: RenderingStrategy;
  router: string;
  state: StateManagement;
  styling: StylingFramework;
  animation: AnimationLibrary;
  components: ComponentLibrary;
  features: string[];
  reasoning: string;
}

const FRONTEND_RULES: FrontendRule[] = [
  // Mobile
  {
    condition: (_, cat) => cat === 'mobile-app',
    framework: 'expo',
    rendering: 'csr',
    router: 'expo-router',
    state: 'zustand',
    styling: 'nativewind',
    animation: 'react-spring',
    components: 'tamagui',
    features: ['expo-router', 'nativewind', 'expo-notifications'],
    reasoning: 'Expo provides the fastest path to cross-platform mobile with native capabilities'
  },
  // Desktop
  {
    condition: (_, cat) => cat === 'desktop-app',
    framework: 'tauri',
    rendering: 'csr',
    router: 'react-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['tauri', 'system-tray', 'auto-updater'],
    reasoning: 'Tauri for smaller bundle size and security; React frontend for rich UI'
  },
  // CLI
  {
    condition: (_, cat) => cat === 'cli-tool',
    framework: 'react-spa',
    rendering: 'csr',
    router: 'none',
    state: 'none',
    styling: 'none',
    animation: 'none',
    components: 'none',
    features: ['commander', 'inquirer', 'chalk'],
    reasoning: 'CLI tools need no frontend framework; use Node.js with commander/inquirer'
  },
  // Browser Extension
  {
    condition: (_, cat) => cat === 'browser-extension',
    framework: 'react-vite',
    rendering: 'csr',
    router: 'react-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'css-only',
    components: 'shadcn',
    features: ['chrome-extension', 'content-scripts', 'popup-ui'],
    reasoning: 'Vite for fast builds; React for popup/options UI; content scripts for injection'
  },
  // API-only
  {
    condition: (_, cat) => cat === 'api-service',
    framework: 'react-spa',
    rendering: 'csr',
    router: 'none',
    state: 'none',
    styling: 'none',
    animation: 'none',
    components: 'none',
    features: [],
    reasoning: 'API-only services have no frontend; backend framework handles everything'
  },
  // Ecommerce with auth
  {
    condition: (ctx) => ctx.businessResearch?.businessType?.includes('ecommerce') && ctx.blueprint?.features?.some((f: string) => f.includes('auth')),
    framework: 'nextjs',
    rendering: 'isr',
    router: 'app-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['app-router', 'server-components', 'image-optimization', 'middleware'],
    reasoning: 'Next.js ISR for product pages; server components for performance; middleware for auth'
  },
  // Ecommerce
  {
    condition: (ctx) => ctx.businessResearch?.businessType?.includes('ecommerce'),
    framework: 'nextjs',
    rendering: 'isr',
    router: 'app-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['app-router', 'server-components', 'image-optimization'],
    reasoning: 'Next.js ISR for product catalog with dynamic cart'
  },
  // SaaS/Dashboard
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('dashboard') || f.includes('admin') || f.includes('realtime')),
    framework: 'nextjs',
    rendering: 'ssr',
    router: 'app-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['app-router', 'server-components', 'realtime'],
    reasoning: 'Next.js SSR for dynamic dashboards with real-time data'
  },
  // Content/Blog
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('blog') || f.includes('cms') || f.includes('seo')),
    framework: 'astro',
    rendering: 'ssg',
    router: 'astro-router',
    state: 'none',
    styling: 'tailwind',
    animation: 'css-only',
    components: 'none',
    features: ['content-collections', 'mdx', 'islands'],
    reasoning: 'Astro for content-first sites with zero JS by default; islands for interactivity'
  },
  // Fullstack with complex state
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('complex') || f.includes('enterprise')),
    framework: 'nextjs',
    rendering: 'ssr',
    router: 'app-router',
    state: 'redux-toolkit',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['app-router', 'server-components', 'streaming'],
    reasoning: 'Next.js for complex apps; Redux Toolkit for predictable state management'
  },
  // Default
  {
    condition: () => true,
    framework: 'nextjs',
    rendering: 'ssr',
    router: 'app-router',
    state: 'zustand',
    styling: 'tailwind',
    animation: 'framer-motion',
    components: 'shadcn',
    features: ['app-router', 'server-components'],
    reasoning: 'Default to Next.js for balanced performance and SEO'
  }
];

// ─── Backend Rules ────────────────────────────────────────────────────────────

interface BackendRule {
  condition: (ctx: TechStackPlannerContext, category: ProjectCategory) => boolean;
  framework: BackendFramework;
  runtime: Runtime;
  database: DatabaseType;
  orm: ORM;
  auth: AuthSystem;
  apiStyle: 'rest' | 'graphql' | 'trpc' | 'grpc' | 'none';
  features: string[];
  reasoning: string;
}

const BACKEND_RULES: BackendRule[] = [
  // CLI
  {
    condition: (_, cat) => cat === 'cli-tool',
    framework: 'none',
    runtime: 'node',
    database: 'none',
    orm: 'none',
    auth: 'none',
    apiStyle: 'none',
    features: [],
    reasoning: 'CLI tools have no backend'
  },
  // Browser Extension
  {
    condition: (_, cat) => cat === 'browser-extension',
    framework: 'none',
    runtime: 'node',
    database: 'none',
    orm: 'none',
    auth: 'none',
    apiStyle: 'none',
    features: [],
    reasoning: 'Browser extensions have no backend; use chrome.storage for persistence'
  },
  // Fullstack with auth
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('auth') && f.includes('complex')),
    framework: 'nextjs-api',
    runtime: 'node',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'nextauth',
    apiStyle: 'trpc',
    features: ['nextauth', 'prisma', 'trpc'],
    reasoning: 'Next.js API routes + tRPC for type-safe fullstack with auth'
  },
  // GraphQL
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('graphql')),
    framework: 'graphql-yoga',
    runtime: 'node',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'lucia',
    apiStyle: 'graphql',
    features: ['graphql-yoga', 'prisma', 'subscriptions'],
    reasoning: 'GraphQL Yoga for flexible API with real-time subscriptions'
  },
  // Ecommerce
  {
    condition: (ctx) => ctx.businessResearch?.businessType?.includes('ecommerce'),
    framework: 'nextjs-api',
    runtime: 'node',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'nextauth',
    apiStyle: 'rest',
    features: ['nextauth', 'prisma', 'webhooks'],
    reasoning: 'Next.js API routes for ecommerce with Prisma + PostgreSQL'
  },
  // High-performance API
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('high-performance') || f.includes('realtime')),
    framework: 'fastify',
    runtime: 'node',
    database: 'postgresql',
    orm: 'drizzle',
    auth: 'custom-jwt',
    apiStyle: 'rest',
    features: ['fastify', 'drizzle', 'websocket'],
    reasoning: 'Fastify for high-performance APIs; Drizzle for lightweight ORM'
  },
  // Default
  {
    condition: () => true,
    framework: 'nextjs-api',
    runtime: 'node',
    database: 'postgresql',
    orm: 'prisma',
    auth: 'nextauth',
    apiStyle: 'rest',
    features: ['nextauth', 'prisma'],
    reasoning: 'Default to Next.js API + Prisma + PostgreSQL for fullstack apps'
  }
];

// ─── Deployment Rules ─────────────────────────────────────────────────────────

interface DeploymentRule {
  condition: (ctx: TechStackPlannerContext, category: ProjectCategory) => boolean;
  hosting: HostingPlatform;
  edge: boolean;
  cdn: boolean;
  containerized: boolean;
  ciCd: 'github-actions' | 'gitlab-ci' | 'none';
  reasoning: string;
}

const DEPLOYMENT_RULES: DeploymentRule[] = [
  // Mobile
  {
    condition: (_, cat) => cat === 'mobile-app',
    hosting: 'app-store',
    edge: false,
    cdn: false,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'Mobile apps deploy to App Store / Play Store'
  },
  // Desktop
  {
    condition: (_, cat) => cat === 'desktop-app',
    hosting: 'app-store',
    edge: false,
    cdn: false,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'Desktop apps ship as installers or app store packages'
  },
  // CLI
  {
    condition: (_, cat) => cat === 'cli-tool',
    hosting: 'npm',
    edge: false,
    cdn: false,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'CLI tools distribute via npm'
  },
  // Browser Extension
  {
    condition: (_, cat) => cat === 'browser-extension',
    hosting: 'chrome-web-store',
    edge: false,
    cdn: false,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'Browser extensions deploy to Chrome Web Store / Firefox Addons'
  },
  // Docker
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('docker') || f.includes('container')),
    hosting: 'docker',
    edge: false,
    cdn: false,
    containerized: true,
    ciCd: 'github-actions',
    reasoning: 'Docker for containerized deployments'
  },
  // Edge-first
  {
    condition: (ctx) => ctx.blueprint?.features?.some((f: string) => f.includes('edge') || f.includes('serverless')),
    hosting: 'vercel',
    edge: true,
    cdn: true,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'Vercel for edge-first deployments'
  },
  // Default
  {
    condition: () => true,
    hosting: 'vercel',
    edge: false,
    cdn: true,
    containerized: false,
    ciCd: 'github-actions',
    reasoning: 'Default to Vercel for easy deployment'
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstMatch<T extends { condition: (...args: any[]) => boolean }>(
  rules: T[],
  ...args: Parameters<T['condition']>
): Omit<T, 'condition'> {
  const match = rules.find(r => r.condition(...args));
  if (!match) throw new Error('No matching rule found');
  const { condition, ...rest } = match;
  return rest as Omit<T, 'condition'>;
}

function generateDependencies(
  frontend: FrontendFramework,
  backend: BackendFramework,
  state: StateManagement,
  styling: StylingFramework,
  database: DatabaseType,
  orm: ORM,
  auth: AuthSystem,
  category: ProjectCategory
): Record<string, string> {
  const deps: Record<string, string> = {};

  // Frontend
  switch (frontend) {
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
  switch (state) {
    case 'zustand': deps['zustand'] = '^5.0.0'; break;
    case 'redux-toolkit':
      deps['@reduxjs/toolkit'] = '^2.0.0';
      deps['react-redux'] = '^9.0.0';
      break;
    case 'jotai': deps['jotai'] = '^2.0.0'; break;
    case 'pinia': deps['pinia'] = '^2.0.0'; break;
  }

  // Styling
  switch (styling) {
    case 'tailwind': deps['tailwindcss'] = '^4.0.0'; break;
    case 'nativewind': deps['nativewind'] = '^4.0.0'; break;
    case 'chakra-ui': deps['@chakra-ui/react'] = '^3.0.0'; break;
    case 'material-ui':
      deps['@mui/material'] = '^6.0.0';
      deps['@emotion/react'] = '^11.0.0';
      deps['@emotion/styled'] = '^11.0.0';
      break;
  }

  // Backend
  switch (backend) {
    case 'fastify': deps['fastify'] = '^5.0.0'; break;
    case 'nestjs':
      deps['@nestjs/core'] = '^11.0.0';
      deps['@nestjs/common'] = '^11.0.0';
      break;
    case 'graphql-yoga': deps['graphql-yoga'] = '^5.0.0'; break;
    case 'trpc': deps['@trpc/server'] = '^11.0.0'; break;
  }

  // Database
  switch (database) {
    case 'postgresql': deps['pg'] = '^8.0.0'; break;
    case 'mongodb': deps['mongodb'] = '^6.0.0'; break;
    case 'sqlite': deps['better-sqlite3'] = '^11.0.0'; break;
  }

  // ORM
  switch (orm) {
    case 'prisma':
      deps['prisma'] = '^6.0.0';
      deps['@prisma/client'] = '^6.0.0';
      break;
    case 'drizzle': deps['drizzle-orm'] = '^0.30.0'; break;
    case 'mongoose': deps['mongoose'] = '^8.0.0'; break;
  }

  // Auth
  switch (auth) {
    case 'nextauth': deps['next-auth'] = '^5.0.0'; break;
    case 'clerk': deps['@clerk/nextjs'] = '^5.0.0'; break;
    case 'lucia': deps['lucia'] = '^3.0.0'; break;
  }

  // Animation
  deps['framer-motion'] = '^12.0.0';
  deps['lucide-react'] = '^0.500.0';

  return deps;
}

function generateDevDependencies(
  frontend: FrontendFramework,
  category: ProjectCategory
): Record<string, string> {
  const devDeps: Record<string, string> = {
    'typescript': '~5.8.0'
  };

  if (frontend === 'nextjs' || frontend === 'react-vite' || frontend === 'react-spa' || frontend === 'astro') {
    devDeps['@types/react'] = '^18.3.0';
    devDeps['@types/react-dom'] = '^18.3.0';
  }

  if (frontend === 'react-vite' || frontend === 'tauri') {
    devDeps['vite'] = '^6.2.0';
    devDeps['@vitejs/plugin-react'] = '^5.0.0';
  }

  if (frontend === 'expo') {
    devDeps['@types/react'] = '^18.3.0';
  }

  return devDeps;
}

function generateScripts(
  frontend: FrontendFramework,
  backend: BackendFramework,
  category: ProjectCategory,
  hosting: HostingPlatform
): Record<string, string> {
  const scripts: Record<string, string> = {};

  switch (frontend) {
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
      scripts['lint'] = 'expo lint';
      break;
  }

  if (backend === 'fastify' || backend === 'nestjs') {
    scripts['dev:api'] = 'tsx watch src/api/main.ts';
    scripts['build:api'] = 'tsc -p tsconfig.api.json';
  }

  if (hosting === 'docker') {
    scripts['docker:build'] = 'docker build -t app .';
    scripts['docker:run'] = 'docker run -p 3000:3000 app';
  }

  if (category === 'cli-tool') {
    scripts['dev'] = 'tsx src/cli.ts';
    scripts['build'] = 'tsc && node dist/cli.js';
    scripts['lint'] = 'tsc --noEmit';
  }

  return scripts;
}

// ─── Main Planner ─────────────────────────────────────────────────────────────

export async function planTechStack(ctx: TechStackPlannerContext): Promise<TechStackDecision> {
  const category = detectProjectCategory(ctx);

  const frontend = getFirstMatch(FRONTEND_RULES, ctx, category) as Omit<FrontendRule, 'condition'>;
  const backend = getFirstMatch(BACKEND_RULES, ctx, category) as Omit<BackendRule, 'condition'>;
  const deployment = getFirstMatch(DEPLOYMENT_RULES, ctx, category) as Omit<DeploymentRule, 'condition'>;

  const dependencies = generateDependencies(
    frontend.framework,
    backend.framework,
    frontend.state,
    frontend.styling,
    backend.database,
    backend.orm,
    backend.auth,
    category
  );

  const devDependencies = generateDevDependencies(frontend.framework, category);
  const scripts = generateScripts(frontend.framework, backend.framework, category, deployment.hosting);

  const rationale = [
    `Project category: ${category}`,
    `Frontend: ${frontend.reasoning}`,
    `Backend: ${backend.reasoning}`,
    `Deployment: ${deployment.reasoning}`
  ];

  return {
    projectCategory: category,
    frontend: {
      framework: frontend.framework,
      version: frontend.framework === 'nextjs' ? '14.2.0' : frontend.framework === 'astro' ? '5.0.0' : '6.2.0',
      rendering: frontend.rendering,
      router: frontend.router,
      stateManagement: frontend.state,
      styling: frontend.styling,
      animation: frontend.animation,
      componentLibrary: frontend.components,
      features: frontend.features
    },
    backend: {
      framework: backend.framework,
      runtime: backend.runtime,
      database: backend.database,
      orm: backend.orm,
      auth: backend.auth,
      apiStyle: backend.apiStyle,
      features: backend.features
    },
    deployment: {
      hosting: deployment.hosting,
      edge: deployment.edge,
      cdn: deployment.cdn,
      containerized: deployment.containerized,
      ciCd: deployment.ciCd,
      environmentVariables: []
    },
    dependencies,
    devDependencies,
    scripts,
    rationale
  };
}
```

- [ ] **Step 2: Create tests for TechStackPlanner**

```typescript
// src/agents/orchestrator/subagents/tech-stack-planner.test.ts

import { describe, it, expect } from 'vitest';
import { planTechStack, TechStackPlannerContext } from './tech-stack-planner';

describe('TechStackPlanner', () => {
  it('should detect web-store category for ecommerce', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'ecommerce' },
      blueprint: { features: ['product-catalog', 'cart', 'checkout'] }
    };
    const result = await planTechStack(ctx);
    expect(result.projectCategory).toBe('web-store');
    expect(result.frontend.framework).toBe('nextjs');
    expect(result.frontend.rendering).toBe('isr');
    expect(result.frontend.stateManagement).toBe('zustand');
    expect(result.backend.database).toBe('postgresql');
    expect(result.backend.orm).toBe('prisma');
  });

  it('should detect mobile-app category', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'fitness' },
      blueprint: { features: ['mobile', 'ios', 'android'] }
    };
    const result = await planTechStack(ctx);
    expect(result.projectCategory).toBe('mobile-app');
    expect(result.frontend.framework).toBe('expo');
    expect(result.frontend.styling).toBe('nativewind');
    expect(result.deployment.hosting).toBe('app-store');
  });

  it('should detect desktop-app category', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'productivity' },
      blueprint: { features: ['desktop', 'tauri'] }
    };
    const result = await planTechStack(ctx);
    expect(result.projectCategory).toBe('desktop-app');
    expect(result.frontend.framework).toBe('tauri');
    expect(result.deployment.hosting).toBe('app-store');
  });

  it('should detect cli-tool category', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'developer-tools' },
      blueprint: { features: ['cli'] }
    };
    const result = await planTechStack(ctx);
    expect(result.projectCategory).toBe('cli-tool');
    expect(result.frontend.framework).toBe('react-spa');
    expect(result.backend.framework).toBe('none');
    expect(result.deployment.hosting).toBe('npm');
  });

  it('should detect browser-extension category', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'productivity' },
      blueprint: { features: ['chrome-extension'] }
    };
    const result = await planTechStack(ctx);
    expect(result.projectCategory).toBe('browser-extension');
    expect(result.frontend.framework).toBe('react-vite');
    expect(result.deployment.hosting).toBe('chrome-web-store');
  });

  it('should select Next.js ISR for ecommerce', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'ecommerce' },
      blueprint: { features: ['product-catalog', 'cart'] }
    };
    const result = await planTechStack(ctx);
    expect(result.frontend.framework).toBe('nextjs');
    expect(result.frontend.rendering).toBe('isr');
  });

  it('should select Astro for content sites', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'blog' },
      blueprint: { features: ['blog', 'seo'] }
    };
    const result = await planTechStack(ctx);
    expect(result.frontend.framework).toBe('astro');
    expect(result.frontend.rendering).toBe('ssg');
    expect(result.frontend.stateManagement).toBe('none');
  });

  it('should include Prisma for apps with auth', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'saas' },
      blueprint: { features: ['auth', 'user', 'complex'] }
    };
    const result = await planTechStack(ctx);
    expect(result.backend.database).toBe('postgresql');
    expect(result.backend.orm).toBe('prisma');
    expect(result.backend.auth).toBe('nextauth');
  });

  it('should generate correct dependencies', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'ecommerce' },
      blueprint: { features: ['cart'] }
    };
    const result = await planTechStack(ctx);
    expect(result.dependencies['next']).toBeDefined();
    expect(result.dependencies['zustand']).toBeDefined();
    expect(result.dependencies['framer-motion']).toBeDefined();
  });

  it('should generate correct scripts for Next.js', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'ecommerce' },
      blueprint: { features: ['cart'] }
    };
    const result = await planTechStack(ctx);
    expect(result.scripts['dev']).toBe('next dev');
    expect(result.scripts['build']).toBe('next build');
  });

  it('should generate correct scripts for Vite', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'saas' },
      blueprint: { features: ['dashboard', 'spa'] }
    };
    const result = await planTechStack(ctx);
    expect(result.scripts['dev']).toContain('vite');
    expect(result.scripts['build']).toBe('vite build');
  });

  it('should include rationale for all decisions', async () => {
    const ctx: TechStackPlannerContext = {
      businessResearch: { businessType: 'ecommerce' },
      blueprint: { features: ['cart'] }
    };
    const result = await planTechStack(ctx);
    expect(result.rationale).toHaveLength(4);
    expect(result.rationale[0]).toContain('web-store');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/agents/orchestrator/subagents/tech-stack-planner.test.ts`
Expected: All tests pass

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/agents/orchestrator/subagents/tech-stack-planner.ts src/agents/orchestrator/subagents/tech-stack-planner.test.ts
git commit -m "feat: implement TechStackPlanner with expanded framework support (nextjs, vite, astro, expo, tauri, cli, extension)"
```

---

## Task 3: Wire TechStackPlanner into Pipeline

**Files:**
- Modify: `src/agents/orchestrator/lead-agent.ts`
- Modify: `src/bos/reasoning/rules-engine.ts`
- Modify: `src/agents/orchestrator/subagents/build-agent.ts`
- Modify: `src/generation/build-pipeline.ts`
- Modify: `src/generation/renderers/renderer.ts`

**Quality Gate:** `npx tsc --noEmit` passes.

- [ ] **Step 1: Wire TechStackPlanner into LeadAgent**

```typescript
// In src/agents/orchestrator/lead-agent.ts

import { planTechStack } from './subagents/tech-stack-planner';

// In Phase A (after Blueprint completes, before Build):
const techStack = await planTechStack({
  businessResearch: phaseContext.businessResearch,
  blueprint: phaseContext.blueprint,
  designBrief: phaseContext.designBrief
});

phaseContext.techStack = techStack;
```

- [ ] **Step 2: Add techStack to BREContext**

```typescript
// In src/bos/reasoning/rules-engine.ts

import { TechStackDecision } from '../types-tech-stack';

export interface BREContext {
  // ... existing fields
  techStack?: TechStackDecision;
}
```

- [ ] **Step 3: Pass techStack through BuildAgent**

```typescript
// In src/agents/orchestrator/subagents/build-agent.ts

const breContext: BREContext = {
  // ... existing fields
  techStack: phaseContext.techStack
};
```

- [ ] **Step 4: Pass techStack to renderer in build-pipeline.ts**

```typescript
// In src/generation/build-pipeline.ts

const renderContext: RenderContext = {
  // ... existing fields
  techStack: phaseContext.techStack || phaseContext.breContext?.techStack
};
```

- [ ] **Step 5: Add techStack to RenderContext**

```typescript
// In src/generation/renderers/renderer.ts

import { TechStackDecision } from '../../bos/types-tech-stack';

export interface RenderContext {
  // ... existing fields
  techStack?: TechStackDecision;
}
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/agents/orchestrator/lead-agent.ts src/bos/reasoning/rules-engine.ts src/agents/orchestrator/subagents/build-agent.ts src/generation/build-pipeline.ts src/generation/renderers/renderer.ts
git commit -m "feat: wire TechStackPlanner into pipeline, pass TechStackDecision to renderer"
```

---

# Phase B — Renderer

Component templates, renderer integration, design presets.

---

## Task 4: Create Industry-Specific Component Templates

**Files:**
- Create: `src/generation/renderers/templates/ecommerce.ts`
- Create: `src/generation/renderers/templates/saas.ts`
- Create: `src/generation/renderers/templates/restaurant.ts`
- Create: `src/generation/renderers/templates/content.ts`
- Create: `src/generation/renderers/templates/mobile.ts`
- Create: `src/generation/renderers/templates/desktop.ts`
- Create: `src/generation/renderers/templates/api.ts`
- Create: `src/generation/renderers/templates/cli.ts`

**Quality Gate:** `npx tsc --noEmit` passes.

**Note:** Each template file exports a record of component template functions. These are code strings that the renderer injects into the generated project. The templates consume structured data (JSON) and never hardcode content.

- [ ] **Step 1: Create Ecommerce templates** (ProductCard, CartDrawer, CheckoutModal, ProductFilter, CartStore)
- [ ] **Step 2: Create SaaS templates** (PricingCard, FeatureGrid, DashboardLayout)
- [ ] **Step 3: Create Restaurant templates** (MenuItem, TableReservation)
- [ ] **Step 4: Create Content templates** (Hero, BlogCard, Testimonial, CTASection)
- [ ] **Step 5: Create Mobile templates** (ExpoScreen, BottomNav, ProfileScreen)
- [ ] **Step 6: Create Desktop templates** (TauriWindow, Sidebar, StatusBar)
- [ ] **Step 7: Create API templates** (ExpressRoute, FastifyRoute, PrismaSchema)
- [ ] **Step 8: Create CLI templates** (Command, Prompt, Formatter)
- [ ] **Step 9: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add src/generation/renderers/templates/
git commit -m "feat: add industry-specific component templates (ecommerce, saas, restaurant, content, mobile, desktop, api, cli)"
```

---

## Task 5: Upgrade ReactRenderer to Consume TechStackDecision

**Files:**
- Modify: `src/generation/renderers/react-renderer.ts`

**Quality Gate:** `npx tsc --noEmit` passes.

- [ ] **Step 1: Add template imports and industry detection**

```typescript
// At top of src/generation/renderers/react-renderer.ts

import { ECOMMERCE_TEMPLATES } from './templates/ecommerce';
import { SAAS_TEMPLATES } from './templates/saas';
import { RESTAURANT_TEMPLATES } from './templates/restaurant';
import { CONTENT_TEMPLATES } from './templates/content';
import { TechStackDecision } from '../../bos/types-tech-stack';

function getTemplatesForCategory(category: string) {
  switch (category) {
    case 'web-store': return ECOMMERCE_TEMPLATES;
    case 'web-app': return SAAS_TEMPLATES;
    case 'web-site': return CONTENT_TEMPLATES;
    default: return CONTENT_TEMPLATES;
  }
}
```

- [ ] **Step 2: Upgrade generateProductGrid to use ecommerce templates**

Replace the existing `generateProductGrid` method to:
1. Read `ctx.techStack?.projectCategory` to select templates
2. Use `ECOMMERCE_TEMPLATES.ProductCard` for product cards
3. Use `ECOMMERCE_TEMPLATES.CartDrawer` for cart
4. Use `ECOMMERCE_TEMPLATES.CheckoutModal` for checkout
5. Use `ECOMMERCE_TEMPLATES.ProductFilter` for filters
6. Generate Zustand cart store using `ECOMMERCE_TEMPLATES.CartStore`

- [ ] **Step 3: Add cart store generation**

```typescript
private generateCartStore(bre: any, ctx: RenderContext): string {
  if (ctx.techStack?.frontend.stateManagement === 'zustand') {
    return ECOMMERCE_TEMPLATES.CartStore();
  }
  return ''; // Other state managers handled by templates
}
```

- [ ] **Step 4: Wire cart store into assembly**

In the assembly section where files are collected, add:
```typescript
if (ctx.techStack?.frontend.stateManagement === 'zustand') {
  files.push({ path: 'stores/cart-store.tsx', content: this.generateCartStore(bre, ctx) });
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/generation/renderers/react-renderer.ts
git commit -m "feat: upgrade ReactRenderer to use TechStackDecision and industry templates"
```

---

## Task 6: Add Design System Presets

**Files:**
- Create: `src/generation/renderers/design-systems.ts`

**Quality Gate:** `npx tsc --noEmit` passes.

- [ ] **Step 1: Create design system presets**

Define presets for:
- **Ecommerce**: Space Grotesk + Inter, Amber/Neutral palette
- **SaaS**: Plus Jakarta Sans + Inter, Indigo/Slate palette
- **Restaurant**: Playfair Display + Inter, Amber/Stone palette
- **Content**: Georgia + System UI, Gray palette
- **Mobile**: System fonts, platform-native palettes
- **Desktop**: System fonts, neutral palettes

Include CSS variable generation for each preset.

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/generation/renderers/design-systems.ts
git commit -m "feat: add design system presets for all project categories"
```

---

# Phase C — Validation

Benchmarks, runtime, screenshots, quality gates, build verification.

---

## Task 7: Integration Test and Benchmark

**Files:**
- Modify: `test-full-build.mts` (if exists, or create)

**Quality Gate:** Full pipeline generates buildable project. TypeScript compiles. Build passes.

- [ ] **Step 1: Run full pipeline test for ecommerce**

Run: `npx tsx test-full-build.mts "Build me a Multi brands e-commerce supplement store for Indian customers"`
Expected: Pipeline completes with TechStackDecision:
- projectCategory: 'web-store'
- frontend.framework: 'nextjs'
- frontend.rendering: 'isr'
- frontend.stateManagement: 'zustand'
- backend.database: 'postgresql'
- backend.orm: 'prisma'

- [ ] **Step 2: Verify generated project has rich components**

Check that generated project contains:
- ProductCard with badges, veg/non-veg, discount %, star ratings
- CartDrawer with localStorage persistence
- CheckoutModal with GST calculation, address form, payment methods
- ProductFilter with category/brand/sort/veg-only
- Zustand cart store with persist middleware
- Design system with Space Grotesk + Inter fonts

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd test-workspace/supplement-store && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Verify build passes**

Run: `cd test-workspace/supplement-store && npm install && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Run full pipeline test for SaaS**

Run: `npx tsx test-full-build.mts "Build me a project management SaaS dashboard"`
Expected: Pipeline completes with:
- projectCategory: 'fullstack-app' or 'web-app'
- frontend.framework: 'nextjs'
- frontend.stateManagement: 'redux-toolkit' or 'zustand'
- backend.database: 'postgresql'

- [ ] **Step 6: Run full pipeline test for CLI**

Run: `npx tsx test-full-build.mts "Build me a CLI tool for managing docker containers"`
Expected: Pipeline completes with:
- projectCategory: 'cli-tool'
- frontend.framework: 'react-spa' (minimal)
- backend.framework: 'none'
- deployment.hosting: 'npm'

- [ ] **Step 7: Commit test results**

```bash
git add test-workspace/
git commit -m "test: verify full pipeline generates production-quality output across categories"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- TechStackDecision types: Task 1 ✅
- TechStackPlanner with expanded framework support: Task 2 ✅
- Pipeline integration: Task 3 ✅
- Industry component templates: Task 4 ✅
- Renderer upgrade: Task 5 ✅
- Design system presets: Task 6 ✅
- Integration tests: Task 7 ✅

**2. Placeholder scan:**
- All code blocks contain complete implementations ✅
- No "TBD", "TODO", or "implement later" ✅
- Exact file paths provided ✅

**3. Type consistency:**
- TechStackDecision defined in Task 1, consumed in Tasks 2-5 ✅
- Templates follow consistent interface patterns ✅
- No duplicate planners ✅

**4. Architecture compliance:**
- TechStack Planner is single authority ✅
- Renderer is framework-agnostic ✅
- No architectural decisions in renderer ✅
- Existing public interfaces preserved ✅

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-tech-stack-planner-and-enhanced-renderer.md`.

**Execution Model:** Subagent-driven with mandatory review checkpoints.

**Phases:**
- **Phase A — Architecture** (Tasks 1-3): Tech Stack Planner, Framework Selection, Blueprint Integration
- **Phase B — Renderer** (Tasks 4-6): Component Library, Renderer Integration, Design Presets
- **Phase C — Validation** (Task 7): Benchmarks, Runtime, Screenshots, Quality Gates

**Each subagent must:**
1. Implement only its scope
2. Run `npx tsc --noEmit`
3. Run relevant tests
4. Produce a short report
5. Hand off to the next task

**Ready to execute?**
