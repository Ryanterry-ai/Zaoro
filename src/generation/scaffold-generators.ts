/**
 * Scaffold Generators — generates config files and boilerplate for Next.js projects.
 *
 * These generators produce real, working files:
 * - package.json with correct dependencies
 * - tsconfig.json for Next.js + TypeScript
 * - tailwind.config.ts with design tokens
 * - next.config.mjs
 * - postcss.config.mjs
 * - prisma/schema.prisma from database schema
 * - src/app/globals.css
 * - src/app/layout.tsx
 */

import type { ProjectManifest } from '../orchestration/types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

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

  // Add database-specific deps
  if (techStack?.orm === 'prisma' || techStack?.database === 'postgresql' || techStack?.database === 'mysql') {
    deps['@prisma/client'] = '^5.10.2';
    devDeps['prisma'] = '5.10.2';
  }

  // Add auth if needed
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
    exclude: ['node_modules'],
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
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
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

// ─── Root Layout Generator ────────────────────────────────────────────────────

export function generateRootLayout(manifest: ProjectManifest, tokens?: DesignTokens, pages?: Array<{name: string; path: string}>, biz?: { description?: string; contact?: { email?: string; phone?: string; address?: string; city?: string } }): string {
  const rawTitle = manifest.name;
  const title = (typeof rawTitle === 'string' ? rawTitle : 'Build Anything App');
  const rawDesc = manifest.description;
  // Use clean description, not raw prompt text
  const description = biz?.description ?? (typeof rawDesc === 'string' ? rawDesc : 'Built with Build.Anything');
  const primaryColor = tokens?.colors?.primary ?? '#1a1a2e';
  
  // Contact info from business content, not hardcoded
  const contactEmail = biz?.contact?.email ?? `info@${title.toLowerCase().replace(/\s+/g, '')}.com`;
  const contactPhone = biz?.contact?.phone ?? '(555) 000-0000';
  const contactAddress = biz?.contact?.address ?? '';
  const contactCity = biz?.contact?.city ?? '';
  const contactLine = [contactAddress, contactCity].filter(Boolean).join(', ') ?? 'Location TBD';

  // Nav pages — use actual generated pages, not hardcoded links
  const navPages = (pages ?? [])
    .filter(p => p.path && !p.path.includes('['))
    .slice(0, 5);
  
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

  // Convert font name to Next.js import name (remove spaces, capitalize each word)
  const fontImportName = headingFont
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');

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
    <html lang="en" className={font.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-[${primaryColor}]">
              ${title}
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {navPages.map((p) => (
                <Link key={p.path} href={p.path} className="text-gray-600 hover:text-gray-900 transition-colors">{p.name}</Link>
              ))}
            </div>
            <Link
              href="/contact"
              className="px-5 py-2 bg-[${primaryColor}] text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Get in Touch
            </Link>
          </div>
        </nav>
        {children}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-bold mb-4">${title}</h3>
                <p className="text-gray-400 text-sm">${description}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Quick Links</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  {navPages.map((p) => (
                    <Link key={p.path} href={p.path} className="block hover:text-white transition-colors">{p.name}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Contact</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  ${contactAddress ? `<p>${'${contactAddress}'}</p>` : ''}
                  ${contactCity ? `<p>${'${contactCity}'}</p>` : ''}
                  <p>${'${contactEmail}'}</p>
                  <p>${'${contactPhone}'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Follow Us</h4>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <span className="sr-only">Instagram</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <span className="sr-only">Twitter</span>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} ${title}. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}`;
}

// ─── Prisma Schema Generator ──────────────────────────────────────────────────

export function generatePrismaSchema(schema: DbSchema, database?: string): string {
  const dbProvider = database === 'mysql' ? 'mysql' : 'postgresql';
  const dbUrl = database === 'mysql'
    ? 'env("DATABASE_URL")'
    : 'env("DATABASE_URL")';

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

      // Add decorators for timestamp fields if missing
      if (col.name === 'createdAt' && !modifiers.some(m => m.includes('default'))) {
        modifiers.push('@default(now())');
      }
      if (col.name === 'updatedAt' && !modifiers.some(m => m.includes('updatedAt'))) {
        modifiers.push('@updatedAt');
      }

      const modifierStr = modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';
      lines.push(`  ${col.name.padEnd(24)} ${prismaType}${col.nullable ? '?' : ''}${modifierStr}`);
    }

    // Add timestamps only if not already present
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

export function generateApiRoute(endpoint: { method: string; path: string; description?: string }): string {
  const method = endpoint.method.toUpperCase();
  const pathParts = endpoint.path.replace(/^\//, '').split('/');
  const routeName = pathParts[pathParts.length - 1] ?? 'index';

  // Map reserved keywords to valid function names
  const methodMap: Record<string, string> = {
    'DELETE': 'DELETE',
    'NEW': 'CREATE',
  };
  const funcName = methodMap[method] ?? method;

  return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * ${endpoint.description ?? `${endpoint.method} ${endpoint.path}`}
 */
export async function ${funcName}(request: NextRequest) {
  try {
    // TODO: Implement ${endpoint.method} ${endpoint.path}
    return NextResponse.json({ message: '${endpoint.method} ${endpoint.path} - not yet implemented' })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`;
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
