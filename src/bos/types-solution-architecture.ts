/**
 * Solution Architecture Decision (SAD)
 *
 * The SolutionArchitecturePlanner (SAP) is the SINGLE AUTHORITY for all
 * technology selection decisions. It produces a SolutionArchitectureDecision
 * that feeds the Execution Blueprint. The renderer remains framework-agnostic
 * and only consumes the blueprint.
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

// ─── Platform ─────────────────────────────────────────────────────────────────

export type Platform =
  | 'web'           // Browser-based applications
  | 'mobile'        // Native/cross-platform mobile
  | 'desktop'       // Desktop applications
  | 'cli'           // Command-line tools
  | 'extension'     // Browser extensions
  | 'api'           // API-only services (no UI)
  | 'library'       // Reusable packages/libraries
  | 'fullstack';    // Full-stack web (frontend + backend)

export type ProjectCategory =
  | 'web-app'           // Interactive web application
  | 'web-site'          // Content/marketing site
  | 'web-store'         // E-commerce store
  | 'mobile-app'        // Mobile application
  | 'mobile-store'      // Mobile commerce
  | 'desktop-app'       // Desktop application
  | 'cli-tool'          // Command-line tool
  | 'browser-extension' // Chrome/Firefox extension
  | 'api-service'       // REST/GraphQL API
  | 'graphql-service'   // GraphQL-specific API
  | 'library'           // Reusable package
  | 'fullstack-app'     // Full-stack with auth/dashboard
  | 'saas-app'          // SaaS multi-tenant
  | 'internal-tool'     // Admin panel/dashboard
  | 'prototype'         // Quick MVP/prototype
  | 'enterprise';       // Enterprise-grade application

// ─── Architecture Style ───────────────────────────────────────────────────────

export type ArchitectureStyle =
  | 'monolith'         // Single deployable unit
  | 'modular-monolith' // Modular but single deploy
  | 'microservices'    // Independent services
  | 'serverless'       // Function-as-a-service
  | 'edge'             // Edge-first computing
  | 'jamstack'         // Static + API
  | 'islands'          // Astro-style interactive islands
  | 'spa'              // Single-page application
  | 'mpa';             // Multi-page application

// ─── Frontend ─────────────────────────────────────────────────────────────────

export type FrontendFramework =
  | 'nextjs'           // Next.js (React)
  | 'remix'            // Remix (React)
  | 'gatsby'           // Gatsby (React)
  | 'react-vite'       // React + Vite
  | 'react-webpack'    // React + Webpack
  | 'react-spa'        // Plain React SPA
  | 'astro'            // Astro (islands)
  | 'svelte'           // Svelte
  | 'sveltekit'        // SvelteKit
  | 'vue'              // Vue 3
  | 'nuxt'             // Nuxt 3
  | 'angular'          // Angular
  | 'solid'            // SolidJS
  | 'qwik'             // Qwik
  | 'react-native'     // React Native
  | 'expo'             // Expo (React Native)
  | 'flutter'          // Flutter
  | 'tauri'            // Tauri (Rust + Web)
  | 'electron'         // Electron
  | 'vanilla'          // No framework
  | 'none';            // No frontend (API/CLI)

export type RenderingStrategy =
  | 'ssr'    // Server-side rendering
  | 'ssg'    // Static site generation
  | 'csr'    // Client-side rendering
  | 'isr'    // Incremental static regeneration
  | 'hybrid' // Mixed strategies
  | 'prd';   // Pre-rendered (Astro-style)

export type Router =
  | 'app-router'     // Next.js App Router
  | 'pages-router'   // Next.js Pages Router
  | 'file-based'     // File-based routing (Astro, SvelteKit, Nuxt)
  | 'react-router'   // React Router
  | 'tanstack-router'// TanStack Router
  | 'expo-router'    // Expo Router
  | 'angular-router' // Angular Router
  | 'vue-router'     // Vue Router
  | 'hono-router'    // Hono RPC
  | 'none';          // No routing (SPA, CLI, API)

export type StateManagement =
  | 'zustand'        // Zustand
  | 'jotai'          // Jotai (atomic)
  | 'redux-toolkit'  // Redux Toolkit
  | 'context-api'    // React Context
  | 'valtio'         // Valtio (proxy)
  | 'pinia'          // Pinia (Vue)
  | 'vuex'           // Vuex (Vue)
  | 'mobx'           // MobX
  | 'recoil'         // Recoil
  | 'signals'        // Signals (framework-native)
  | 'none';          // No state management needed

export type StylingFramework =
  | 'tailwind'        // Tailwind CSS
  | 'css-modules'     // CSS Modules
  | 'styled-components' // Styled Components
  | 'emotion'         // Emotion
  | 'vanilla-extract' // Vanilla Extract
  | 'panda-css'       // Panda CSS
  | 'unocss'          // UnoCSS
  | 'chakra-ui'       // Chakra UI
  | 'material-ui'     // Material UI
  | 'shadcn-ui'       // shadcn/ui
  | 'radix'           // Radix UI
  | 'nativewind'      // NativeWind (React Native)
  | 'tamagui'         // Tamagui
  | 'styled-system'   // Styled System
  | 'windicss'        // Windi CSS
  | 'bootstrap'       // Bootstrap
  | 'none';           // No styling framework

export type AnimationLibrary =
  | 'framer-motion'   // Framer Motion
  | 'gsap'            // GSAP
  | 'lottie'          // Lottie
  | 'css-only'        // CSS animations only
  | 'react-spring'    // React Spring
  | 'auto'            // Auto-select based on needs
  | 'none';           // No animations

export type ComponentLibrary =
  | 'shadcn'          // shadcn/ui
  | 'radix'           // Radix UI primitives
  | 'headless-ui'     // Headless UI
  | 'chakra'          // Chakra UI
  | 'mui'             // Material UI
  | 'ant-design'      // Ant Design
  | 'bootstrap'       // Bootstrap
  | 'mantine'         // Mantine
  | 'nextui'          // NextUI
  | 'arco'            // Arco Design
  | 'custom'          // Custom components
  | 'none';           // No component library

export interface FrontendConfig {
  framework: FrontendFramework;
  version: string;
  rendering: RenderingStrategy;
  router: Router;
  stateManagement: StateManagement;
  styling: StylingFramework;
  animation: AnimationLibrary;
  componentLibrary: ComponentLibrary;
  features: string[];
}

// ─── Backend ──────────────────────────────────────────────────────────────────

export type BackendFramework =
  | 'nextjs-api'      // Next.js API Routes
  | 'remix-api'       // Remix API
  | 'express'         // Express.js
  | 'fastify'         // Fastify
  | 'hono'            // Hono
  | 'nestjs'          // NestJS
  | 'adonis'          // AdonisJS
  | 'graphql-yoga'    // GraphQL Yoga
  | 'apollo-server'   // Apollo Server
  | 'trpc'            // tRPC
  | 'strapi'          // Strapi CMS
  | 'payload'         // Payload CMS
  | 'python-fastapi'  // FastAPI (Python)
  | 'python-django'   // Django (Python)
  | 'python-flask'    // Flask (Python)
  | 'go-gin'          // Gin (Go)
  | 'go-fiber'        // Fiber (Go)
  | 'go-echo'         // Echo (Go)
  | 'rust-axum'       // Axum (Rust)
  | 'rust-actix'      // Actix (Rust)
  | 'ruby-rails'      // Rails (Ruby)
  | 'laravel'         // Laravel (PHP)
  | 'spring-boot'     // Spring Boot (Java)
  | 'dotnet'          // .NET (C#)
  | 'none';           // No backend

export type Runtime =
  | 'node'            // Node.js
  | 'bun'             // Bun
  | 'deno'            // Deno
  | 'edge'            // Edge runtime (Vercel, Cloudflare)
  | 'serverless'      // AWS Lambda, etc.
  | 'wasm'            // WebAssembly
  | 'python'          // Python runtime
  | 'go'              // Go runtime
  | 'rust'            // Rust runtime
  | 'jvm'             // JVM (Java/Kotlin)
  | 'dotnet';         // .NET runtime

export type ApiStyle =
  | 'rest'            // REST API
  | 'graphql'         // GraphQL
  | 'trpc'            // tRPC (type-safe RPC)
  | 'grpc'            // gRPC
  | 'websocket'       // WebSocket
  | 'sse'             // Server-Sent Events
  | '混合'            // Mixed (REST + WebSocket)
  | 'none';           // No API

export interface BackendConfig {
  framework: BackendFramework;
  runtime: Runtime;
  apiStyle: ApiStyle;
  features: string[];
}

// ─── Database ─────────────────────────────────────────────────────────────────

export type DatabaseType =
  | 'postgresql'      // PostgreSQL
  | 'mysql'           // MySQL
  | 'sqlite'          // SQLite
  | 'mongodb'         // MongoDB
  | 'supabase'        // Supabase (hosted Postgres)
  | 'firebase'        // Firebase Firestore
  | 'planetscale'     // PlanetScale (hosted MySQL)
  | 'turso'           // Turso (edge SQLite)
  | 'redis'           // Redis (cache)
  | 'dynamodb'        // DynamoDB
  | 'cockroachdb'     // CockroachDB
  | 'mariadb'         // MariaDB
  | 'memcached'       // Memcached
  | 'none';           // No database

export type ORM =
  | 'prisma'          // Prisma
  | 'drizzle'         // Drizzle ORM
  | 'typeorm'         // TypeORM
  | 'sequelize'       // Sequelize
  | 'mongoose'        // Mongoose
  | 'kysely'          // Kysely (type-safe SQL)
  | 'knex'            // Knex.js
  | 'bookshelf'       // Bookshelf
  | 'active-record'   // ActiveRecord pattern
  | 'data-mapper'     // Data Mapper pattern
  | 'raw'             // Raw SQL/query builder
  | 'none';           // No ORM

export interface DatabaseConfig {
  type: DatabaseType;
  orm: ORM;
  caching?: 'redis' | 'memcached' | 'in-memory' | 'none';
  features: string[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type AuthSystem =
  | 'nextauth'        // NextAuth.js
  | 'clerk'           // Clerk
  | 'supabase-auth'   // Supabase Auth
  | 'firebase-auth'   // Firebase Auth
  | 'lucia'           // Lucia Auth
  | 'better-auth'     // Better Auth
  | 'custom-jwt'      // Custom JWT
  | 'custom-session'  // Custom session-based
  | 'oauth2'          // OAuth 2.0
  | 'oidc'            // OpenID Connect
  | 'saml'            // SAML (enterprise)
  | 'api-key'         // API key auth
  | 'magic-link'      // Magic link
  | 'passkey'         // WebAuthn/Passkey
  | 'none';           // No auth

export interface AuthConfig {
  system: AuthSystem;
  providers: string[]; // e.g., ['google', 'github', 'email']
  mfa: boolean;
  sessionStrategy: 'jwt' | 'database';
  features: string[];
}

// ─── Deployment ───────────────────────────────────────────────────────────────

export type HostingPlatform =
  | 'vercel'          // Vercel
  | 'netlify'         // Netlify
  | 'cloudflare'      // Cloudflare Pages/Workers
  | 'aws'             // AWS (EC2, ECS, Lambda)
  | 'gcp'             // Google Cloud
  | 'azure'           // Azure
  | 'railway'         // Railway
  | 'render'          // Render
  | 'fly-io'          // Fly.io
  | 'docker'          // Docker
  | 'kubernetes'      // Kubernetes
  | 'digital-ocean'   // DigitalOcean
  | 'heroku'          // Heroku
  | 'app-store'       // Apple App Store
  | 'play-store'      // Google Play Store
  | 'npm'             // npm registry
  | 'pip'             // PyPI
  | 'cargo'           // crates.io
  | 'chrome-web-store'// Chrome Web Store
  | 'firefox-addons'  // Firefox Add-ons
  | 'github-pages'    // GitHub Pages
  | 'static';         // Static file hosting

export type CiCdSystem =
  | 'github-actions'  // GitHub Actions
  | 'gitlab-ci'       // GitLab CI
  | 'circleci'        // CircleCI
  | 'travis'          // Travis CI
  | 'jenkins'         // Jenkins
  | 'bitbucket'       // Bitbucket Pipelines
  | 'none';           // No CI/CD

export interface DeploymentConfig {
  hosting: HostingPlatform;
  edge: boolean;
  cdn: boolean;
  containerized: boolean;
  ciCd: CiCdSystem;
  environmentVariables: string[];
  domains?: string[];
  ssl: boolean;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export type PaymentProvider =
  | 'stripe'          // Stripe
  | 'razorpay'        // Razorpay (India)
  | 'paypal'          // PayPal
  | 'square'          // Square
  | 'paddle'          // Paddle
  | 'lemonsqueezy'    // Lemon Squeezy
  | 'cashfree'        // Cashfree (India)
  | 'phonepe'         // PhonePe (India)
  | 'gpay'            // Google Pay
  | 'upi'             // UPI
  | 'cod'             // Cash on Delivery
  | 'crypto'          // Cryptocurrency
  | 'custom'          // Custom payment integration
  | 'none';           // No payment

export type EmailProvider =
  | 'sendgrid'        // SendGrid
  | 'ses'             // AWS SES
  | 'mailgun'         // Mailgun
  | 'postmark'        // Postmark
  | 'resend'          // Resend
  | 'nodemailer'      // Nodemailer
  | 'firebase-email'  // Firebase Email Extensions
  | 'none';           // No email

export type StorageProvider =
  | 's3'              // AWS S3
  | 'gcs'             // Google Cloud Storage
  | 'azure-blob'      // Azure Blob
  | 'cloudinary'      // Cloudinary
  | 'uploadthing'     // UploadThing
  | 'supabase-storage'// Supabase Storage
  | 'firebase-storage'// Firebase Storage
  | 'local'           // Local filesystem
  | 'none';           // No storage

export type AnalyticsProvider =
  | 'google-analytics'// Google Analytics
  | 'mixpanel'        // Mixpanel
  | 'amplitude'       // Amplitude
  | 'posthog'         // PostHog
  | 'plausible'       // Plausible
  | 'fathom'          // Fathom
  | 'segment'         // Segment
  | 'hotjar'          // Hotjar
  | 'none';           // No analytics

export type SearchProvider =
  | 'algolia'         // Algolia
  | 'meilisearch'     // Meilisearch
  | 'typesense'       // Typesense
  | 'elasticsearch'   // Elasticsearch
  | 'opensearch'      // OpenSearch
  | 'tantivy'         // Tantivy (Rust)
  | 'none';           // No search

export type CmsProvider =
  | 'strapi'          // Strapi
  | 'payload'         // Payload CMS
  | 'sanity'          // Sanity
  | 'contentful'      // Contentful
  | 'datocms'         // DatoCMS
  | 'keystone'        // KeystoneJS
  | 'directus'        // Directus
  | 'wordpress'       // WordPress
  | 'mdx'             // MDX (file-based)
  | 'none';           // No CMS

export interface IntegrationsConfig {
  payment: PaymentProvider[];
  email: EmailProvider;
  storage: StorageProvider;
  analytics: AnalyticsProvider;
  search: SearchProvider;
  cms: CmsProvider;
  custom: Array<{
    name: string;
    type: 'api' | 'webhook' | 'sdk';
    purpose: string;
  }>;
}

// ─── Security ─────────────────────────────────────────────────────────────────

export interface SecurityConfig {
  authentication: AuthSystem;
  authorization: 'rbac' | 'abac' | 'role-based' | 'none';
  inputValidation: 'zod' | 'joi' | 'yup' | 'valibot' | 'class-validator' | 'none';
  outputEncoding: boolean;
  csrfProtection: boolean;
  rateLimiting: boolean;
  helmet: boolean;
  cors: boolean;
  contentSecurityPolicy: boolean;
  sqlInjectionPrevention: boolean;
  xssPrevention: boolean;
  httpsRedirect: boolean;
  secureCookies: boolean;
  features: string[];
}

// ─── Observability ────────────────────────────────────────────────────────────

export type LoggingProvider =
  | 'winston'         // Winston
  | 'pino'            // Pino
  | 'bunyan'          // Bunyan
  | 'console'         // Console only
  | 'cloudwatch'      // AWS CloudWatch
  | 'datadog'         // Datadog
  | 'none';           // No logging

export type MonitoringProvider =
  | 'sentry'          // Sentry
  | 'datadog'         // Datadog
  | 'newrelic'        // New Relic
  | 'grafana'         // Grafana
  | 'prometheus'      // Prometheus
  | 'vercel-analytics'// Vercel Analytics
  | 'none';           // No monitoring

export interface ObservabilityConfig {
  logging: LoggingProvider;
  monitoring: MonitoringProvider;
  tracing: 'opentelemetry' | 'jaeger' | 'zipkin' | 'none';
  errorTracking: boolean;
  performanceMonitoring: boolean;
  uptimeMonitoring: boolean;
  features: string[];
}

// ─── Scalability ──────────────────────────────────────────────────────────────

export type CacheStrategy =
  | 'redis'           // Redis cache
  | 'memcached'       // Memcached
  | 'in-memory'       // In-memory cache
  | 'cdn'             // CDN edge caching
  | 'swr'             // Stale-while-revalidate
  | 'isr'             // Incremental static regeneration
  | 'none';           // No caching

export type ScalingStrategy =
  | 'vertical'        // Scale up (bigger instance)
  | 'horizontal'      // Scale out (more instances)
  | 'auto'            // Auto-scaling
  | 'serverless'      // Auto-scale to zero
  | 'edge'            // Edge distribution
  | 'none';           // No scaling strategy

export interface ScalabilityConfig {
  caching: CacheStrategy;
  scaling: ScalingStrategy;
  cdn: boolean;
  loadBalancing: boolean;
  databaseReplication: boolean;
  queueSystem: 'bullmq' | 'bull' | 'rabbitmq' | 'kafka' | 'sqs' | 'none';
  searchEngine: SearchProvider;
  features: string[];
}

// ─── Solution Architecture Decision (Master Type) ─────────────────────────────

export interface SolutionArchitectureDecision {
  /** Project classification */
  projectCategory: ProjectCategory;
  /** Target platform */
  platform: Platform;
  /** Architecture style */
  architectureStyle: ArchitectureStyle;

  /** Frontend configuration */
  frontend: FrontendConfig;
  /** Backend configuration */
  backend: BackendConfig;
  /** Database configuration */
  database: DatabaseConfig;
  /** Authentication configuration */
  auth: AuthConfig;
  /** Deployment configuration */
  deployment: DeploymentConfig;
  /** Third-party integrations */
  integrations: IntegrationsConfig;
  /** Security configuration */
  security: SecurityConfig;
  /** Observability configuration */
  observability: ObservabilityConfig;
  /** Scalability configuration */
  scalability: ScalabilityConfig;

  /** Package.json dependencies */
  dependencies: Record<string, string>;
  /** Package.json devDependencies */
  devDependencies: Record<string, string>;
  /** Package.json scripts */
  scripts: Record<string, string>;

  /** Why this architecture was chosen (for transparency) */
  rationale: string[];
  /** Key trade-offs acknowledged */
  tradeoffs: string[];
  /** Estimated complexity (1-10) */
  complexity: number;
  /** Estimated development time (hours) */
  estimatedHours: number;
}

// ─── Backward Compatibility Alias ─────────────────────────────────────────────

/**
 * @deprecated Use SolutionArchitectureDecision instead.
 * Kept for backward compatibility during migration.
 */
export type TechStackDecision = SolutionArchitectureDecision;
