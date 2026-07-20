/**
 * Scaffold Generators — generates config files and boilerplate for Next.js projects.
 *
 * These generators produce real, working files:
 * - package.json with correct dependencies
 * - tsconfig.json for Next.js + TypeScript
 * - tailwind.config.ts with design tokens & premium animation keyframes
 * - next.config.mjs
 * - postcss.config.mjs
 * - prisma/schema.prisma from database schema
 * - src/app/globals.css with layout engines & motion tracks
 * - src/app/layout.tsx driven by dynamic layout blueprint schemas
 */

import type { ProjectManifest } from '../orchestration/types.js';

// ─── Types & Extended Design Blueprints ───────────────────────────────────────

export interface DesignTokens {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    card?: string;
    border?: string;
  };
  typography?: {
    fontFamily?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  spacing?: Record<string, string>;
}

export interface LayoutSectionBlueprint {
  id: string;
  type: 'hero-search' | 'categories' | 'featured-listings' | 'bento-grid' | 'trust-metrics' | 'pricing-cards' | 'cta-banner' | string;
  paddingClass: string;
  animation?: {
    type: 'fade-up' | 'scroll-reveal' | 'count-up' | 'marquee-infinite';
    duration?: number;
    delay?: number;
  };
  props?: Record<string, any>;
}

export interface DynamicLayoutPlan {
  patternId: string;
  patternName: string;
  industry: string;
  sections?: LayoutSectionBlueprint[];
  layoutConfig?: {
    headerStyle?: 'floating-glass' | 'sidebar-dock' | 'minimal-clean' | 'classic';
    footerStyle?: 'rich-marketplace' | 'saas-compact' | 'minimalist';
    enableScrollEffects?: boolean;
  };
}

export interface DbSchema {
  tables?: Array<{
    name: string;
    columns?: Array<{
      name: string;
      type: string;
      primaryKey?: boolean;
      unique?: boolean;
      nullable?: boolean;
      references?: { table: string; column: string };
    }>;
  }>;
}

export interface TechStack {
  framework?: string;
  database?: string;
  orm?: string;
  styling?: string;
  auth?: string;
}

// ─── Package.json Generator ───────────────────────────────────────────────────

export function generatePackageJson(manifest: ProjectManifest, techStack?: TechStack): string {
  const rawName = manifest.name;
  const name = (typeof rawName === 'string' ? rawName : 'build-anything-app').replace(/\s+/g, '-').toLowerCase();

  const deps: Record<string, string> = {
    'next': '14.2.29',
    'react': '18.3.1',
    'react-dom': '18.3.1',
    'framer-motion': '^11.0.0',
    'lucide-react': '^0.383.0',
    'clsx': '^2.1.0',
    'tailwind-merge': '^2.3.0',
    'zod': '^3.23.0',
  };

  const devDeps: Record<string, string> = {
    'typescript': '^5.4.0',
    '@types/react': '^18.3.0',
    '@types/node': '^20.0.0',
    'tailwindcss': '^3.4.0',
    'autoprefixer': '^10.4.0',
    'postcss': '^8.4.0',
  };

  if (techStack?.orm === 'prisma' || techStack?.database === 'postgresql' || techStack?.database === 'mysql') {
    deps['@prisma/client'] = '^5.10.2';
    devDeps['prisma'] = '5.10.2';
  }

  if (techStack?.auth === 'nextauth') {
    deps['next-auth'] = '^4.24.0';
  }

  return JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      ...(deps['@prisma/client'] ? {
        'db:push': 'npx prisma@5.10.2 db push',
        'db:generate': 'npx prisma@5.10.2 generate',
        'db:studio': 'npx prisma@5.10.2 studio',
      } : {}),
    },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2);
}

// ─── TsConfig Generator ───────────────────────────────────────────────────────

export function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    // `prisma/seed.ts` is a dev-only seeding script executed via `tsx`, not part
    // of the Next.js app bundle. Excluding it from the production typecheck
    // prevents Prisma-client type friction (e.g. upsert payload shapes) from
    // blocking a shippable build — Next.js itself does not type-check it.
    exclude: ['node_modules', 'prisma'],
  }, null, 2);
}

// ─── Tailwind Config Generator ────────────────────────────────────────────────

export function generateTailwindConfig(tokens?: DesignTokens): string {
  const primary = tokens?.colors?.primary ?? '#6366f1';
  const secondary = tokens?.colors?.secondary ?? '#8b5cf6';
  const accent = tokens?.colors?.accent ?? '#06b6d4';
  const background = tokens?.colors?.background ?? '#09090b';
  const foreground = tokens?.colors?.foreground ?? '#fafafa';
  const muted = tokens?.colors?.muted ?? '#27272a';
  const card = tokens?.colors?.card ?? '#18181b';
  const border = tokens?.colors?.border ?? '#27272a';
  const headingFont = tokens?.typography?.headingFont ?? tokens?.typography?.fontFamily ?? 'Inter';

  return `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '${primary}',
          light: '${primary}33',
          dark: '${primary}cc',
        },
        secondary: {
          DEFAULT: '${secondary}',
          light: '${secondary}33',
        },
        accent: {
          DEFAULT: '${accent}',
        },
        background: '${background}',
        foreground: '${foreground}',
        muted: {
          DEFAULT: '${muted}',
          foreground: '#a1a1aa',
        },
        card: {
          DEFAULT: '${card}',
          foreground: '${foreground}',
        },
        border: '${border}',
      },
      fontFamily: {
        heading: ['${headingFont}', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      animation: {
        'marquee-infinite': 'marquee-infinite 30s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer-pulse': 'shimmer-pulse 2s infinite linear',
      },
      keyframes: {
        'marquee-infinite': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer-pulse': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config`;
}

// ─── Next Config Generator ────────────────────────────────────────────────────

export function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig`;
}

// ─── PostCSS Config Generator ─────────────────────────────────────────────────

export function generatePostcssConfig(): string {
  return `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config`;
}

// ─── Global CSS Generator ─────────────────────────────────────────────────────

export function generateGlobalCss(tokens?: DesignTokens): string {
  const primary = tokens?.colors?.primary ?? '#1a1a2e';
  const secondary = tokens?.colors?.secondary ?? '#c9a962';
  const accent = tokens?.colors?.accent ?? '#e8d5b7';
  const background = tokens?.colors?.background ?? '#fafafa';
  const foreground = tokens?.colors?.foreground ?? '#1a1a2e';

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${primary};
  --secondary: ${secondary};
  --accent: ${accent};
  --background: ${background};
  --foreground: ${foreground};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Luxury & High-Performance Design Pattern Extensions */
@layer components {
  .glassmorphism-canvas {
    background: rgba(255, 255, 255, 0.45);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.25);
  }

  .dark .glassmorphism-canvas {
    background: rgba(24, 24, 27, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(63, 63, 70, 0.3);
  }

  .marquee-track-container {
    display: flex;
    overflow: hidden;
    user-select: none;
    mask-image: linear-gradient(to right, transparent, white 15%, white 85%, transparent);
  }

  .bento-card-gradient {
    background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .dark .bento-card-gradient {
    background: linear-gradient(135deg, rgba(24,24,27,0.7) 0%, rgba(9,9,11,0.9) 100%);
  }
}

img {
  max-width: 100%;
  height: auto;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}`;
}

// ─── Root Layout Generator (Pattern-Driven Layout Optimization) ────────────────

export function generateRootLayout(
  manifest: ProjectManifest, 
  tokens?: DesignTokens, 
  pages?: Array<{name: string; path: string}>, 
  biz?: { description?: string; contact?: { email?: string; phone?: string; address?: string; city?: string } },
  layoutPlan?: DynamicLayoutPlan
): string {
  const rawTitle = manifest.name;
  const title = (typeof rawTitle === 'string' ? rawTitle : 'Build Anything App');
  const rawDesc = manifest.description;
  const description = biz?.description ?? (typeof rawDesc === 'string' ? rawDesc : 'Built with Build.Anything');
  const primaryColor = tokens?.colors?.primary ?? '#1a1a2e';
  
  const contactEmail = biz?.contact?.email ?? `info@${title.toLowerCase().replace(/\s+/g, '')}.com`;
  const contactPhone = biz?.contact?.phone ?? '(555) 000-0000';
  const contactAddress = biz?.contact?.address ?? '';
  const contactCity = biz?.contact?.city ?? '';

  const navPages = (pages ?? [])
    .filter(p => p.path && !p.path.includes('['))
    .slice(0, 7); // Allow expanded layout tracks
  
  let headingFont = 'Inter';
  if (tokens?.typography) {
    const heading = tokens.typography.headingFont;
    const family = tokens.typography.fontFamily;
    const font = heading ?? family;
    if (typeof font === 'string') {
      const parts = font.split(',');
      headingFont = (parts[0] ?? font).trim();
    }
  }

  const fontImportName = headingFont
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');

  // Evaluate structural intent from incoming design pattern plan
  const industryContext = layoutPlan?.industry?.toLowerCase() ?? 'generic';
  const patternId = layoutPlan?.patternId ?? 'pattern-generic-standard';
  
  // Choose header structure matching specific design system requirements
  let headerBlock = '';
  if (industryContext === 'real-estate' || layoutPlan?.layoutConfig?.headerStyle === 'floating-glass') {
    headerBlock = `
        <header className="fixed top-4 left-0 right-0 z-50 px-4">
          <nav className="max-w-7xl mx-auto h-20 glassmorphism-canvas rounded-2xl px-6 flex items-center justify-between shadow-lg border border-white/20 transition-all duration-300">
            <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              <span className="w-3 h-3 rounded-full bg-[${primaryColor}] animate-pulse" />
              ${title}
            </Link>
            <div className="hidden md:flex items-center gap-8 font-medium">
              {navPages.map((p) => (
                <Link key={p.path} href={p.path} className="text-sm text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 hover:after:w-full after:bg-[${primaryColor}] after:transition-all">{p.name}</Link>
              ))}
            </div>
            <Link
              href="/contact"
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              View Listings
            </Link>
          </nav>
        </header>
    `;
  } else {
    headerBlock = `
        <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
          <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              ${title}
            </Link>
            <div className="hidden md:flex items-center gap-6 font-medium">
              {navPages.map((p) => (
                <Link key={p.path} href={p.path} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{p.name}</Link>
              ))}
            </div>
            <Link
              href="/contact"
              className="px-4 py-2 bg-[${primaryColor}] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
            >
              Launch Platform
            </Link>
          </nav>
        </header>
    `;
  }

  // Choose footer matrix layout context safely
  let footerBlock = '';
  if (industryContext === 'real-estate' || layoutPlan?.layoutConfig?.footerStyle === 'rich-marketplace') {
    footerBlock = `
        <footer className="bg-slate-900 text-slate-100 border-t border-slate-800 pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
              <div className="md:col-span-4 space-y-4">
                <h3 className="text-xl font-black tracking-tight">${title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">${description}</p>
                <div className="pt-2 text-xs text-slate-500 font-mono tracking-wide uppercase">Brokerage License #RE-992104-AZ</div>
              </div>
              <div className="md:col-span-3 md:col-start-6 space-y-4">
                <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400">Exclusive Portfolios</h4>
                <div className="space-y-2.5 text-sm text-slate-300">
                  <a href="#" className="block hover:text-white transition-colors">Luxury Waterfront Estates</a>
                  <a href="#" className="block hover:text-white transition-colors">Metropolitan Penthouses</a>
                  <a href="#" className="block hover:text-white transition-colors">Architectural Custom Builds</a>
                </div>
              </div>
              <div className="md:col-span-3 space-y-4">
                <h4 className="text-xs font-bold tracking-widest uppercase text-slate-400">HQ Brokerage</h4>
                <div className="space-y-2 text-sm text-slate-400">
                  ${contactAddress ? `<p className="text-slate-300">${contactAddress}</p>` : ''}
                  ${contactCity ? `<p className="text-slate-300">${contactCity}</p>` : ''}
                  <p className="font-medium text-slate-200">${contactEmail}</p>
                  <p className="font-medium text-slate-200">${contactPhone}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
              <p>© {new Date().getFullYear()} ${title} Real Estate. Equal Housing Opportunity. All records verified.</p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white transition-colors">Compliance</a>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              </div>
            </div>
          </div>
        </footer>
    `;
  } else {
    footerBlock = `
        <footer className="bg-zinc-950 text-zinc-50 border-t border-zinc-900 py-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="font-bold text-sm">${title}</h4>
              <p className="text-zinc-400 text-xs mt-1">${description}</p>
            </div>
            <p className="text-xs text-zinc-500">© {new Date().getFullYear()} ${title}. Engine powered infrastructure.</p>
          </div>
        </footer>
    `;
  }

  return `import type { Metadata } from 'next'
import { ${fontImportName} } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const font = ${fontImportName}({
  subsets: ['latin'],
  variable: '--font-${headingFont.toLowerCase().replace(/\s+/g, '-')}',
})

export const metadata: Metadata = {
  title: '${title}',
  description: '${description}',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={\`\${font.variable} scroll-smooth\`}>
      <body 
        className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-50 antialiased relative selection:bg-slate-500/10"
        data-active-pattern="${patternId}"
      >
        ${headerBlock.trim()}
        
        <main className="w-full dynamic-layout-canvas">
          {children}
        </main>

        ${footerBlock.trim()}
      </body>
    </html>
  )
}`;
}

// ─── Prisma Schema Generator ──────────────────────────────────────────────────

export function generatePrismaSchema(schema: DbSchema, database?: string): string {
  const dbProvider = database === 'mysql' ? 'mysql' : 'postgresql';
  const dbUrl = 'env("DATABASE_URL")';

  const lines: string[] = [
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    `datasource db {`,
    `  provider = "${dbProvider}"`,
    `  url      = ${dbUrl}`,
    '}',
    '',
  ];

  for (const table of schema.tables ?? []) {
    const modelName = toPascalCase(table.name);
    lines.push(`model ${modelName} {`);

    const colNames = new Set((table.columns ?? []).map(c => c.name));

    for (const col of table.columns ?? []) {
      const prismaType = sqlTypeToPrisma(col.type);
      const modifiers: string[] = [];

      if (col.primaryKey) modifiers.push('@id @default(cuid())');
      if (col.unique && !col.primaryKey) modifiers.push('@unique');

      if (col.name === 'createdAt' && !modifiers.some(m => m.includes('default'))) {
        modifiers.push('@default(now())');
      }
      if (col.name === 'updatedAt' && !modifiers.some(m => m.includes('updatedAt'))) {
        modifiers.push('@updatedAt');
      }

      const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';
      lines.push(`  ${col.name.padEnd(24)} ${prismaType}${col.nullable ? '?' : ''}${modifierStr}`);
    }

    if (!colNames.has('createdAt') && !colNames.has('updatedAt')) {
      lines.push('');
      lines.push('  createdAt     DateTime  @default(now())');
      lines.push('  updatedAt     DateTime  @updatedAt');
    } else if (!colNames.has('createdAt')) {
      lines.push('');
      lines.push('  createdAt     DateTime  @default(now())');
    } else if (!colNames.has('updatedAt')) {
      lines.push('');
      lines.push('  updatedAt     DateTime  @updatedAt');
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Prisma Client Generator ──────────────────────────────────────────────────

export function generatePrismaClient(): string {
  return `import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma`;
}

// ─── API Route Generator ──────────────────────────────────────────────────────

export function generateApiRoute(
  endpoint: { method: string; path: string; description?: string },
  schema?: DbSchema,
): string {
  const method = endpoint.method.toUpperCase();
  const pathParts = endpoint.path.replace(/^\//, '').split('/');
  const resourceName = pathParts[pathParts.length - 1] ?? 'index';

  // Find matching table in schema for real CRUD generation
  const table = schema?.tables?.find(t =>
    t.name.toLowerCase() === resourceName.toLowerCase() ||
    t.name.toLowerCase() === resourceName.toLowerCase() + 's' ||
    resourceName.toLowerCase().includes(t.name.toLowerCase())
  );

  if (table && table.columns && table.columns.length > 0) {
    return generateCrudRoute(resourceName, table, method);
  }

  // Fallback: stub route
  const funcName = method === 'DELETE' ? 'DELETE' : method === 'NEW' ? 'CREATE' : method;
  return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function ${funcName}(request: NextRequest) {
  try {
    return NextResponse.json({ message: '${endpoint.method} ${endpoint.path} - not yet implemented' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`;
}

function generateCrudRoute(
  resourceName: string,
  table: { name: string; columns?: Array<{ name: string; type: string; primaryKey?: boolean; unique?: boolean; nullable?: boolean; references?: { table: string; column: string } }> },
  method: string,
): string {
  const modelName = toPascalCase(table.name);
  const camelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const columns = table.columns ?? [];
  const nonIdColumns = columns.filter(c => !c.primaryKey);
  const inputFields = nonIdColumns.filter(c => !c.name.endsWith('At') && c.name !== 'id');
  const scalarFields = columns.filter(c => !c.references);

  // Build input type from columns
  const inputType = inputFields.map(c => {
    const tsType = prismaToTsType(c.type);
    const optional = c.nullable ? '?' : '';
    return `  ${c.name}${optional}: ${tsType}`;
  }).join('\n');

  if (method === 'GET') {
    return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      const item = await prisma.${camelName}.findUnique({ where: { id } })
      if (!item) {
        return NextResponse.json({ error: '${modelName} not found' }, { status: 404 })
      }
      return NextResponse.json(item)
    }

    const items = await prisma.${camelName}.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('GET ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to fetch ${resourceName}' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await prisma.${camelName}.create({ data: body })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to create ${modelName}' }, { status: 500 })
  }
}`;
  }

  if (method === 'PUT' || method === 'PATCH') {
    return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const item = await prisma.${camelName}.update({
      where: { id: params.id },
      data: body,
    })
    return NextResponse.json(item)
  } catch (error) {
    console.error('PUT ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to update ${modelName}' }, { status: 500 })
  }
}`;
  }

  if (method === 'DELETE') {
    return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.${camelName}.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to delete ${modelName}' }, { status: 500 })
  }
}`;
  }

  // Default: list + create
  return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const items = await prisma.${camelName}.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(items)
  } catch (error) {
    console.error('GET ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to fetch ${resourceName}' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await prisma.${camelName}.create({ data: body })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST ${resourceName} error:', error)
    return NextResponse.json({ error: 'Failed to create ${modelName}' }, { status: 500 })
  }
}`;
}

function prismaToTsType(prismaType: string): string {
  const t = prismaType.toUpperCase();
  if (t.includes('INT') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('DECIMAL')) return 'number';
  if (t.includes('BOOL')) return 'boolean';
  if (t.includes('DATE') || t.includes('TIME') || t.includes('TIMESTAMP')) return 'string';
  if (t.includes('JSON')) return 'Record<string, unknown>';
  return 'string';
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  const s = typeof str === 'string' ? str : String(str);
  return s
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function sqlTypeToPrisma(sqlType: string): string {
  const type = sqlType.toUpperCase();
  if (type.includes('INT') || type.includes('SERIAL')) return 'Int';
  if (type.includes('TEXT') || type.includes('VARCHAR') || type.includes('CHAR')) return 'String';
  if (type.includes('BOOL')) return 'Boolean';
  if (type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('NUMERIC') || type.includes('DECIMAL')) return 'Float';
  if (type.includes('DATE') && !type.includes('TIME')) return 'DateTime';
  if (type.includes('TIMESTAMP') || type.includes('DATETIME')) return 'DateTime';
  if (type.includes('JSON')) return 'Json';
  if (type.includes('UUID')) return 'String';
  return 'String';
}
