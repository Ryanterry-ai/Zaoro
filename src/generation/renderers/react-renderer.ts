/**
 * ReactRenderer — translates ComponentSpecs into React/TSX code.
 *
 * This is the first concrete renderer implementation.
 * It produces Next.js App Router compatible code with Tailwind CSS.
 *
 * Usage:
 *   import { ReactRenderer } from './react-renderer.js';
 *   registerRenderer(new ReactRenderer());
 */

import type {
  ComponentSpec,
  PageSpec,
  ApplicationSpec,
} from '../../bos/schemas/blueprint/execution-blueprint.schema.js';
import type {
  Renderer,
  RenderContext,
  RenderedFile,
  RenderResult,
} from './renderer.js';
import { stageLogger } from '../../core/debug-logger.js';

const log = stageLogger('render');

export class ReactRenderer implements Renderer {
  readonly platform = 'react';
  readonly componentExtension = '.tsx';
  readonly pageExtension = '.tsx';

  renderComponent(spec: ComponentSpec, _context: RenderContext): RenderedFile {
    log.debug('Rendering component', { type: spec.type });
    const componentName = spec.type;
    const code = this.generateComponentCode(spec);
    return {
      path: `components/${componentName}.tsx`,
      content: code,
      type: 'component',
    };
  }

  renderPage(spec: PageSpec, context: RenderContext): RenderedFile[] {
    const files: RenderedFile[] = [];
    const pageName = spec.path === '/' ? 'Home' : this.toPascalCase(spec.path);

    // Deduplicate components by type (same component can appear multiple times in a page)
    const uniqueComponents = [...new Map(spec.components.map(c => [c.type, c])).values()];
    const componentImports = uniqueComponents.map(c => `import ${c.type} from '@/components/${c.type}';`).join('\n');
    const componentRenders = spec.components.map(c => {
      const props = this.buildComponentProps(c);
      return `      <${c.type}${props ? ` ${props}` : ''} />`;
    }).join('\n');

    const seo = spec.seo ?? {};
    const seoTitle = seo.title ?? spec.name;
    const seoDesc = seo.description ?? spec.name;

    const pageCode = `'use client';

import React from 'react';
${componentImports}

export default function ${pageName}Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
${componentRenders}
    </div>
  );
}
`;

    files.push({
      path: `app${spec.path === '/' ? '' : spec.path}/page.tsx`,
      content: pageCode,
      type: 'page',
    });

    return files;
  }

  renderApplication(spec: ApplicationSpec, context: RenderContext): RenderResult {
    log.info('Rendering application', {
      pages: spec.pages.length,
      appName: spec.appName,
    });

    const t = Date.now();
    const files: RenderedFile[] = [];
    const warnings: string[] = [];

    // Generate shell (config files, CSS, layout) — the runnable scaffolding
    files.push(...this.renderShell(spec, context));

    // Generate components
    const generatedComponents = new Set<string>();
    for (const page of spec.pages) {
      for (const component of page.components) {
        if (!generatedComponents.has(component.type)) {
          generatedComponents.add(component.type);
          files.push(this.renderComponent(component, context));
        }
      }
    }

    // Generate pages
    for (const page of spec.pages) {
      files.push(...this.renderPage(page, context));
    }

    // Generate nav data
    files.push(...this.renderNavData(spec, context));

    log.info('Application rendered', {
      files: files.length,
      components: generatedComponents.size,
      duration: Date.now() - t,
    });

    return { files, warnings };
  }

  renderLayout(spec: ApplicationSpec, context: RenderContext): RenderedFile[] {
    return this.renderShell(spec, context);
  }

  renderNavData(spec: ApplicationSpec, _context: RenderContext): RenderedFile[] {
    const navItems = spec.pages
      .filter(p => p.type !== 'auth' && p.type !== 'detail')
      .map(p => `  { label: '${p.name}', href: '${p.path}' }`)
      .join(',\n');

    const layoutCode = `export const navItems = [
${navItems}
] as const;

export type NavItem = (typeof navItems)[number];
`;

    return [{
      path: 'app/nav-data.ts',
      content: layoutCode,
      type: 'data',
    }];
  }

  // ─── Shell Generation ─────────────────────────────────────────────────────

  renderShell(spec: ApplicationSpec, context: RenderContext): RenderedFile[] {
    const appName = spec.appName || 'My App';
    const theme = (context?.theme ?? {}) as Record<string, unknown>;

    return [
      this.renderPackageJson(appName),
      this.renderGlobalsCSS(theme),
      this.renderTailwindConfig(theme),
      this.renderPostCSSConfig(),
      this.renderNextConfig(),
      this.renderRootLayout(appName),
    ];
  }

  private renderPackageJson(appName: string): RenderedFile {
    return {
      path: '../package.json',
      content: JSON.stringify({
        name: 'build-same-sandbox-instance',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          '@prisma/client': '^5.10.2',
          'autoprefixer': '^10.4.17',
          'next': '^14.1.0',
          'postcss': '^8.4.35',
          'prisma': '^5.10.2',
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'tailwindcss': '^3.4.1',
        },
        devDependencies: {
          '@types/node': '^20.11.0',
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          'typescript': '^5.3.3',
        },
      }, null, 2),
      type: 'config',
    };
  }

  private renderGlobalsCSS(theme: Record<string, unknown>): RenderedFile {
    const colors = (theme.colors ?? {}) as Record<string, string>;
    const c = {
      background: colors.background ?? '#09090b',
      foreground: colors.foreground ?? '#fafafa',
      primary: colors.primary ?? '#10b981',
      secondary: colors.secondary ?? colors.primary ?? '#10b981',
      muted: colors.muted ?? '#27272a',
      mutedForeground: '#a1a1aa',
      border: colors.muted ?? '#27272a',
      destructive: colors.destructive ?? '#ef4444',
      success: colors.success ?? '#22c55e',
      warning: colors.warning ?? '#f59e0b',
      info: colors.info ?? '#3b82f6',
    };

    return {
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --primary: ${c.primary};
  --primary-foreground: #ffffff;
  --secondary: ${c.secondary};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --border: ${c.border};
  --ring: ${c.primary};
  --destructive: ${c.destructive};
  --success: ${c.success};
  --warning: ${c.warning};
  --info: ${c.info};
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`,
      type: 'style',
    };
  }

  private renderTailwindConfig(theme: Record<string, unknown>): RenderedFile {
    const typography = (theme.typography ?? {}) as Record<string, string>;
    const headingFont = typography.heading ?? 'Inter';
    const bodyFont = typography.body ?? 'Inter';

    return {
      path: '../tailwind.config.ts',
      content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: 'var(--secondary)',
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        border: 'var(--border)',
        destructive: 'var(--destructive)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },
      fontFamily: {
        heading: ['${headingFont}', 'sans-serif'],
        body: ['${bodyFont}', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
`,
      type: 'config',
    };
  }

  private renderPostCSSConfig(): RenderedFile {
    return {
      path: '../postcss.config.mjs',
      content: `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
`,
      type: 'config',
    };
  }

  private renderNextConfig(): RenderedFile {
    return {
      path: '../next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`,
      type: 'config',
    };
  }

  private renderRootLayout(appName: string): RenderedFile {
    return {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} — built with Build Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
      type: 'layout',
    };
  }

  // ─── Code Generation Helpers ───────────────────────────────────────────────

  private generateComponentCode(spec: ComponentSpec): string {
    const componentName = spec.type;

    // Build props interface
    const propsInterface = this.generatePropsInterface(spec);

    // Build component body
    const body = this.generateComponentBody(spec);

    return `'use client';

import React from 'react';

${propsInterface}

export default function ${componentName}(${this.hasProps(spec) ? `props: ${componentName}Props` : ''}) {
${body}
}
`;
  }

  private generatePropsInterface(spec: ComponentSpec): string {
    const lines: string[] = [];

    if (!this.hasProps(spec)) return '';

    lines.push(`export interface ${spec.type}Props {`);

    // Content props
    for (const [key, content] of Object.entries(spec.content ?? {})) {
      lines.push(`  ${key}?: string;`);
    }

    // Items prop
    if ((spec.items?.length ?? 0) > 0 || (spec.columns?.length ?? 0) > 0) {
      lines.push(`  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string>; [key: string]: unknown }>;`);
    }

    // Tiers prop
    if ((spec.tiers?.length ?? 0) > 0) {
      lines.push(`  tiers?: Array<{ name: string; price: string; period?: string; features?: string[]; highlighted?: boolean; [key: string]: unknown }>;`);
    }

    // Stats prop
    if ((spec.stats?.length ?? 0) > 0) {
      lines.push(`  stats?: Array<{ label: string; value: string; change?: string; trend?: 'up' | 'down' | 'neutral'; [key: string]: unknown }>;`);
    }

    // Columns prop
    if ((spec.columns?.length ?? 0) > 0) {
      lines.push(`  columns?: Array<{ key: string; label: string; [key: string]: unknown }>;`);
    }

    // Fields prop
    if ((spec.fields?.length ?? 0) > 0) {
      lines.push(`  fields?: Array<{ name: string; label: string; type?: string; required?: boolean; placeholder?: string; options?: Array<{ label: string; value: string }>; [key: string]: unknown }>;`);
    }

    // Actions prop
    if ((spec.actions?.length ?? 0) > 0) {
      lines.push(`  actions?: Array<{ label: string; action: string; style?: string; [key: string]: unknown }>;`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  private generateComponentBody(spec: ComponentSpec): string {
    const lines: string[] = [];

    // Destructure props
    if (this.hasProps(spec)) {
      lines.push(`  const { ${this.getPropNames(spec).join(', ')} } = props;`);
      lines.push('');
    }

    // Generate JSX based on component type
    switch (spec.type) {
      case 'HeroBanner':
        lines.push(...this.generateHeroBannerBody(spec));
        break;
      case 'FeatureGrid':
        lines.push(...this.generateFeatureGridBody(spec));
        break;
      case 'PricingTable':
        lines.push(...this.generatePricingTableBody(spec));
        break;
      case 'Testimonials':
        lines.push(...this.generateTestimonialsBody(spec));
        break;
      case 'CTASection':
        lines.push(...this.generateCTASectionBody(spec));
        break;
      case 'FAQSection':
        lines.push(...this.generateFAQSectionBody(spec));
        break;
      case 'StatsCards':
        lines.push(...this.generateStatsCardsBody(spec));
        break;
      case 'AuthForm':
        lines.push(...this.generateAuthFormBody(spec));
        break;
      case 'ContactForm':
        lines.push(...this.generateContactFormBody(spec));
        break;
      case 'DataTable':
        lines.push(...this.generateDataTableBody(spec));
        break;
      case 'Footer':
        lines.push(...this.generateFooterBody(spec));
        break;
      case 'CalendarWidget':
        lines.push(...this.generateCalendarWidgetBody(spec));
        break;
      case 'BookingCalendar':
        lines.push(...this.generateBookingCalendarBody(spec));
        break;
      default:
        lines.push(...this.generateGenericBody(spec));
        break;
    }

    return lines.join('\n');
  }

  private generateHeroBannerBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');
    const badge = this.getContentView(spec, 'badge');

    return [
      `  return (`,
      `    <section className="relative pt-32 pb-20 px-6 overflow-hidden">`,
      `      <div className="max-w-4xl mx-auto text-center space-y-6">`,
      badge ? `        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-primary/20 bg-primary/10 text-primary">` : '',
      badge ? `          <span>{badge}</span>` : '',
      badge ? `        </div>` : '',
      `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-50">`,
      `          {title}`,
      `        </h1>`,
      `        <p className="text-zinc-400 text-lg max-w-xl mx-auto">`,
      `          {subtitle}`,
      `        </p>`,
      ...this.generateActionButtons(spec),
      `        {items?.length ? (`,
      `          <div className="flex items-center justify-center gap-8 pt-8">`,
      `            {items?.map((item, i) => (`,
      `              <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">`,
      `                <span className="text-primary">{item.icon === 'shield' ? '🛡' : item.icon === 'trending-up' ? '📈' : item.icon === 'lock' ? '🔒' : '✓'}</span>`,
      `                <span>{item.title}</span>`,
      `              </div>`,
      `            ))}`,
      `          </div>`,
      `        ) : null}`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateFeatureGridBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="px-6 pb-20">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">`,
      `          {items?.map((feature, i) => (`,
      `            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">`,
      `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">`,
      `                <span>{feature.icon}</span>`,
      `              </div>`,
      `              <h3 className="font-bold text-lg text-zinc-50 mb-2">{feature.title}</h3>`,
      `              <p className="text-sm text-zinc-400">{feature.description}</p>`,
      `            </div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generatePricingTableBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="px-6 pb-20">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {tiers?.map((tier, i) => (`,
      `            <div key={i} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'bg-zinc-900 border-zinc-800'}\`}>`,
      `              <h3 className="text-xl font-black text-zinc-50 mb-2">{tier.name}</h3>`,
      `              <div className="mb-6">`,
      `                <span className="text-4xl font-black text-zinc-50">{tier.price}</span>`,
      `                <span className="text-zinc-400 text-sm">{tier.period}</span>`,
      `              </div>`,
      `              <ul className="space-y-3 mb-8">`,
      `                {tier.features?.map((feature, j) => (`,
      `                  <li key={j} className="flex items-center gap-2 text-sm text-zinc-400">`,
      `                    <span className="text-primary">✓</span>`,
      `                    {feature}`,
      `                  </li>`,
      `                ))}`,
      `              </ul>`,
      `              <button className={\`w-full py-3 rounded-xl font-bold transition \${tier.highlighted ? 'bg-primary hover:bg-primary/90 text-white' : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'}\`}>`,
      `                Get Started`,
      `              </button>`,
      `            </div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateTestimonialsBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="px-6 pb-20 bg-zinc-900/50">`,
      `      <div className="max-w-5xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {items?.map((testimonial, i) => (`,
      `            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      `              <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>`,
      `              <p className="text-sm text-zinc-400 mb-4">"{testimonial.metadata?.quote}"</p>`,
      `              <div>`,
      `                <div className="font-bold text-zinc-50">{testimonial.title}</div>`,
      `                <div className="text-sm text-zinc-500">{testimonial.description}</div>`,
      `              </div>`,
      `            </div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateCTASectionBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="px-6 pb-20">`,
      `      <div className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">`,
      `        <h2 className="text-xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `        <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>`,
      `        {items?.length ? (`,
      `          <div className="flex items-center justify-center gap-4 mb-6">`,
      `            {items?.map((item, i) => (`,
      `              <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">`,
      `                <span className="text-primary">✓</span>`,
      `                <span>{item.title}</span>`,
      `              </div>`,
      `            ))}`,
      `          </div>`,
      `        ) : null}`,
      ...this.generateActionButtons(spec),
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateFAQSectionBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');

    return [
      `  return (`,
      `    <section className="px-6 pb-20">`,
      `      <div className="max-w-3xl mx-auto">`,
      `        <h2 className="text-3xl font-black text-zinc-50 text-center mb-12">{title}</h2>`,
      `        <div className="space-y-4">`,
      `          {items?.map((faq, i) => (`,
      `            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      `              <h3 className="font-bold text-zinc-50 mb-2">{faq.title}</h3>`,
      `              <p className="text-sm text-zinc-400">{faq.description}</p>`,
      `            </div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateStatsCardsBody(_spec: ComponentSpec): string[] {
    return [
      `  return (`,
      `    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">`,
      `      {stats?.map((stat, i) => (`,
      `        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">`,
      `          <div className="text-2xl font-black text-primary mb-1">{stat.value}</div>`,
      `          <div className="text-xs text-zinc-500">{stat.label}</div>`,
      `        </div>`,
      `      ))}`,
      `    </div>`,
      `  );`,
    ];
  }

  private generateAuthFormBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <div className="min-h-screen flex items-center justify-center px-6 bg-zinc-950">`,
      `      <div className="w-full max-w-sm">`,
      `        <h1 className="text-2xl font-black text-zinc-50 text-center mb-2">{title}</h1>`,
      `        <p className="text-zinc-400 text-center mb-8">{subtitle}</p>`,
      `        <form className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      ...(spec.fields ?? []).map(f => `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">`,
      `            ${spec.actions?.[0]?.label ?? 'Submit'}`,
      `          </button>`,
      `        </form>`,
      `      </div>`,
      `    </div>`,
      `  );`,
    ];
  }

  private generateContactFormBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="px-6 pb-16">`,
      `      <div className="max-w-2xl mx-auto">`,
      `        <h2 className="text-3xl font-black text-zinc-50 text-center mb-3">{title}</h2>`,
      `        <p className="text-zinc-400 text-center mb-8">{subtitle}</p>`,
      `        <form className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      ...(spec.fields ?? []).map(f => f.type === 'textarea'
        ? `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
            <textarea name="${f.name}" ${f.required ? 'required' : ''} rows={4} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition resize-none" />
          </div>`
        : `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">`,
      `            ${spec.actions?.[0]?.label ?? 'Send Message'}`,
      `          </button>`,
      `        </form>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateDataTableBody(spec: ComponentSpec): string[] {
    const entity = this.getContentView(spec, 'entity');
    const title = this.getContentView(spec, 'title');

    return [
      `  return (`,
      `    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">`,
      `      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">`,
      `        <h3 className="font-semibold text-zinc-100">{title}</h3>`,
      `        {actions?.map((action, i) => (`,
      `          <button key={i} className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white">{action.label}</button>`,
      `        ))}`,
      `      </div>`,
      `      <table className="w-full text-sm">`,
      `        <thead>`,
      `          <tr className="border-b border-zinc-800 text-zinc-400">`,
      `            {columns?.map((col, i) => (<th key={i} className="px-4 py-3 text-left font-medium">{col.label}</th>))}`,
      `          </tr>`,
      `        </thead>`,
      `        <tbody>`,
      `          {items?.map((item, i) => (`,
      `            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">`,
      `              {columns?.map((col, j) => (<td key={j} className="px-4 py-3 text-zinc-300">{String(item[col.key] ?? item.title ?? '—')}</td>))}`,
      `            </tr>`,
      `          ))}`,
      `        </tbody>`,
      `      </table>`,
      `    </div>`,
      `  );`,
    ];
  }

  private generateFooterBody(spec: ComponentSpec): string[] {
    const companyName = this.getContentView(spec, 'companyName');

    return [
      `  return (`,
      `    <footer className="border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600">`,
      `      <p>© 2024 {${companyName}}. All rights reserved.</p>`,
      `    </footer>`,
      `  );`,
    ];
  }

  private generateCalendarWidgetBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="py-16 px-6">`,
      `      <div className="max-w-2xl mx-auto">`,
      `        <div className="text-center mb-8">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-2">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      `          <div className="flex items-center justify-between mb-4">`,
      `            <button className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 transition">← {actions?.[0]?.label ?? 'Prev'}</button>`,
      `            <span className="text-sm font-bold text-zinc-50">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>`,
      `            <button className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 transition">{actions?.[1]?.label ?? 'Next'} →</button>`,
      `          </div>`,
      `          <div className="grid grid-cols-7 gap-2 text-center text-xs">`,
      `            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (`,
      `              <div key={day} className="text-zinc-500 font-medium py-1">{day}</div>`,
      `            ))}`,
      `            {items?.map((item, i) => (`,
      `              <button key={i} disabled={item.metadata?.available === 'false'} className={\`py-2 rounded-lg transition \${item.metadata?.available === 'false' ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50'}\`}>`,
      `                {item.metadata?.day}`,
      `              </button>`,
      `            ))}`,
      `          </div>`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateBookingCalendarBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <section className="py-16 px-6">`,
      `      <div className="max-w-2xl mx-auto">`,
      `        <div className="text-center mb-8">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-2">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="space-y-6">`,
      `          <div className="grid grid-cols-3 gap-4">`,
      `            {items?.map((slot, i) => (`,
      `              <button key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left hover:border-primary/50 transition">`,
      `                <div className="font-bold text-zinc-50 mb-1">{slot.title}</div>`,
      `                <div className="text-sm text-zinc-400">{slot.description}</div>`,
      `                <div className="text-xs text-primary mt-2">{slot.metadata?.slots} slots available</div>`,
      `              </button>`,
      `            ))}`,
      `          </div>`,
      `          <form className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">`,
      ...(spec.fields ?? []).map(f => f.type === 'select'
        ? `            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
              <select name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-primary transition">
                ${f.options?.map(o => `<option value="${o.value}">${o.label}</option>`).join('\n                ') ?? ''}
              </select>
            </div>`
        : f.type === 'textarea'
        ? `            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
              <textarea name="${f.name}" ${f.required ? 'required' : ''} rows={3} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition resize-none" />
            </div>`
        : `            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
              <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary transition" />
            </div>`),
      `            <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">`,
      `              ${spec.actions?.[0]?.label ?? 'Book Now'}`,
      `            </button>`,
      `          </form>`,
      `        </div>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
  }

  private generateGenericBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');
    const hasItems = (spec.items?.length ?? 0) > 0;
    const hasFields = (spec.fields?.length ?? 0) > 0;
    const hasColumns = (spec.columns?.length ?? 0) > 0;
    const hasStats = (spec.stats?.length ?? 0) > 0;
    const hasTiers = (spec.tiers?.length ?? 0) > 0;

    const lines: string[] = [
      `  return (`,
      `    <section className="py-16">`,
      `      <div className="max-w-7xl mx-auto px-6">`,
      `        <h2 className="text-2xl font-bold">${title}</h2>`,
    ];

    if (subtitle !== `{subtitle}`) {
      lines.push(`        <p className="text-zinc-400 mt-2">${subtitle}</p>`);
    }

    // Render items grid (for about, team, mission, activity, features, etc.)
    if (hasItems) {
      lines.push(`        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">`);
      lines.push(`          {items?.map((item, i) => (`);
      lines.push(`            <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">`);
      lines.push(`              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`);
      lines.push(`                <span className="text-lg font-bold">{item.icon ? '★' : '→'}</span>`);
      lines.push(`              </div>`);
      lines.push(`              <h3 className="text-lg font-semibold text-zinc-100 mb-2">{item.title}</h3>`);
      lines.push(`              <p className="text-zinc-400 text-sm">{item.description}</p>`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    // Render fields form (for profile, billing, auth, etc.)
    if (hasFields && !hasItems) {
      lines.push(`        <div className="mt-8 space-y-4 max-w-lg">`);
      lines.push(`          {fields?.map((field, i) => (`);
      lines.push(`            <div key={i}>`);
      lines.push(`              <label className="block text-sm font-medium text-zinc-300 mb-1">{field.label}</label>`);
      lines.push(`              {field.type === 'textarea' ? (`);
      lines.push(`                <textarea className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100" rows={3} />`);
      lines.push(`              ) : field.type === 'select' ? (`);
      lines.push(`                <select className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100">`);
      lines.push(`                  {field.options?.map((opt, j) => <option key={j} value={opt.value}>{opt.label}</option>)}`);
      lines.push(`                </select>`);
      lines.push(`              ) : (`);
      lines.push(`                <input type={field.type || 'text'} className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100" placeholder={field.placeholder} />`);
      lines.push(`              )}`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    // Render columns table (for data tables, feature comparison, etc.)
    if (hasColumns) {
      lines.push(`        <div className="mt-8 overflow-x-auto">`);
      lines.push(`          <table className="w-full">`);
      lines.push(`            <thead><tr>`);
      lines.push(`              {columns?.map((col, i) => <th key={i} className="px-4 py-3 text-left font-medium text-zinc-300">{col.label}</th>)}`);
      lines.push(`            </tr></thead>`);
      lines.push(`            <tbody>`);
      lines.push(`              {items?.map((row, i) => (`);
      lines.push(`                <tr key={i} className="border-t border-zinc-800">`);
      lines.push(`                  <td className="px-4 py-3 text-zinc-100">{row.title}</td>`);
      lines.push(`                  {columns?.slice(1).map((col, j) => <td key={j} className="px-4 py-3 text-zinc-400">{(row.metadata as any)?.[col.key] ?? '—'}</td>)}`);
      lines.push(`                </tr>`);
      lines.push(`              ))}`);
      lines.push(`            </tbody>`);
      lines.push(`          </table>`);
      lines.push(`        </div>`);
    }

    // Render stats cards
    if (hasStats) {
      lines.push(`        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">`);
      lines.push(`          {stats?.map((stat, i) => (`);
      lines.push(`            <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">`);
      lines.push(`              <div className="text-3xl font-black text-zinc-50">{stat.value}</div>`);
      lines.push(`              <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    // Render pricing tiers
    if (hasTiers) {
      lines.push(`        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">`);
      lines.push(`          {tiers?.map((tier, i) => (`);
      lines.push(`            <div key={i} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'border-zinc-800 bg-zinc-900'}\`}>`);
      lines.push(`              <h3 className="text-xl font-bold text-zinc-100">{tier.name}</h3>`);
      lines.push(`              <div className="mt-4 text-4xl font-black text-zinc-50">{tier.price}<span className="text-sm text-zinc-400">{tier.period}</span></div>`);
      lines.push(`              <ul className="mt-6 space-y-3">`);
      lines.push(`                {tier.features?.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm text-zinc-400">✓ {f}</li>)}`);
      lines.push(`              </ul>`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    lines.push(`      </div>`);
    lines.push(`    </section>`);
    lines.push(`  );`);

    return lines;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private hasProps(spec: ComponentSpec): boolean {
    return (
      Object.keys(spec.content ?? {}).length > 0 ||
      (spec.items?.length ?? 0) > 0 ||
      (spec.tiers?.length ?? 0) > 0 ||
      (spec.stats?.length ?? 0) > 0 ||
      (spec.columns?.length ?? 0) > 0 ||
      (spec.fields?.length ?? 0) > 0 ||
      (spec.actions?.length ?? 0) > 0
    );
  }

  private getPropNames(spec: ComponentSpec): string[] {
    const names: string[] = [];
    for (const key of Object.keys(spec.content ?? {})) {
      names.push(key);
    }
    if ((spec.items?.length ?? 0) > 0 || (spec.columns?.length ?? 0) > 0) names.push('items');
    if ((spec.tiers?.length ?? 0) > 0) names.push('tiers');
    if ((spec.stats?.length ?? 0) > 0) names.push('stats');
    if ((spec.columns?.length ?? 0) > 0) names.push('columns');
    if ((spec.fields?.length ?? 0) > 0) names.push('fields');
    if ((spec.actions?.length ?? 0) > 0) names.push('actions');
    return names;
  }

  private getContentView(spec: ComponentSpec, key: string): string {
    const content = spec.content?.[key];
    return content?.value ?? `{${key}}`;
  }

  private buildComponentProps(spec: ComponentSpec): string {
    const parts: string[] = [];

    // Content props
    for (const [key, content] of Object.entries(spec.content ?? {})) {
      const val = content?.value;
      if (val !== undefined && val !== null) {
        parts.push(`${key}="${val.replace(/"/g, '&quot;')}"`);
      }
    }

    // Items as JSON
    if ((spec.items?.length ?? 0) > 0) {
      parts.push(`items={${JSON.stringify(spec.items)}}`);
    }

    // Tiers as JSON
    if ((spec.tiers?.length ?? 0) > 0) {
      parts.push(`tiers={${JSON.stringify(spec.tiers)}}`);
    }

    // Stats as JSON
    if ((spec.stats?.length ?? 0) > 0) {
      parts.push(`stats={${JSON.stringify(spec.stats)}}`);
    }

    // Columns as JSON
    if ((spec.columns?.length ?? 0) > 0) {
      parts.push(`columns={${JSON.stringify(spec.columns)}}`);
    }

    // Fields as JSON
    if ((spec.fields?.length ?? 0) > 0) {
      parts.push(`fields={${JSON.stringify(spec.fields)}}`);
    }

    // Actions as JSON
    if ((spec.actions?.length ?? 0) > 0) {
      parts.push(`actions={${JSON.stringify(spec.actions)}}`);
    }

    return parts.join(' ');
  }

  private generateActionButtons(spec: ComponentSpec): string[] {
    if ((spec.actions?.length ?? 0) === 0) return [];

    const buttons = (spec.actions ?? []).map(action => {
      const styleClass = action.style === 'primary'
        ? 'bg-primary hover:bg-primary/90 text-white'
        : action.style === 'ghost'
        ? 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'
        : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300';

      return `          <a href="${action.action}" className="px-8 py-4 rounded-xl font-bold transition-all ${styleClass}">
            ${action.label}
          </a>`;
    });

    return [
      `        <div className="flex items-center justify-center gap-4">`,
      ...buttons,
      `        </div>`,
    ];
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/^\//, '')
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
