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
    const componentImports = spec.components.map(c => `import { ${c.type} } from '@/components/${c.type}';`).join('\n');
    const componentRenders = spec.components.map(c => `      <${c.type} />`).join('\n');

    const seo = spec.seo ?? {};
    const seoTitle = seo.title ?? spec.name;
    const seoDesc = seo.description ?? spec.name;

    const pageCode = `'use client';

import React from 'react';
${componentImports}

export default function ${pageName}Page() {
  return (
    <div className="min-h-screen">
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

    // Generate layout
    files.push(...this.renderLayout(spec, context));

    log.info('Application rendered', {
      files: files.length,
      components: generatedComponents.size,
      duration: Date.now() - t,
    });

    return { files, warnings };
  }

  renderLayout(spec: ApplicationSpec, _context: RenderContext): RenderedFile[] {
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

export function ${componentName}(${this.hasProps(spec) ? `props: ${componentName}Props` : ''}) {
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
    if ((spec.items?.length ?? 0) > 0) {
      lines.push(`  items?: Array<{ title?: string; description?: string; icon?: string; metadata?: Record<string, string> }>;`);
    }

    // Tiers prop
    if ((spec.tiers?.length ?? 0) > 0) {
      lines.push(`  tiers?: Array<{ name: string; price: string; period?: string; features?: string[]; highlighted?: boolean }>;`);
    }

    // Stats prop
    if ((spec.stats?.length ?? 0) > 0) {
      lines.push(`  stats?: Array<{ label: string; value: string; change?: string }>;`);
    }

    // Columns prop
    if ((spec.columns?.length ?? 0) > 0) {
      lines.push(`  columns?: Array<{ key: string; label: string }>;`);
    }

    // Fields prop
    if ((spec.fields?.length ?? 0) > 0) {
      lines.push(`  fields?: Array<{ name: string; label: string; type?: string; required?: boolean }>;`);
    }

    // Actions prop
    if ((spec.actions?.length ?? 0) > 0) {
      lines.push(`  actions?: Array<{ label: string; action: string; style?: string }>;`);
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
      `    <section className="relative py-24 lg:py-32 overflow-hidden">`,
      `      <div className="max-w-7xl mx-auto px-6 text-center">`,
      badge ? `        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-white/10 bg-white/5 mb-8">` : '',
      badge ? `          <span>${badge}</span>` : '',
      badge ? `        </div>` : '',
      `        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">`,
      `          ${title}`,
      `        </h1>`,
      `        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">`,
      `          ${subtitle}`,
      `        </p>`,
      ...this.generateActionButtons(spec),
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
      `    <section className="py-24">`,
      `      <div className="max-w-7xl mx-auto px-6">`,
      `        <div className="text-center mb-16">`,
      `          <h2 className="text-3xl font-bold mb-4">${title}</h2>`,
      `          <p className="text-muted-foreground">${subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">`,
      `          {items?.map((feature, i) => (`,
      `            <div key={i} className="p-6 rounded-xl border bg-card">`,
      `              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">`,
      `                <span className="text-primary text-xl">{feature.icon}</span>`,
      `              </div>`,
      `              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>`,
      `              <p className="text-muted-foreground text-sm">{feature.description}</p>`,
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
      `    <section className="py-24">`,
      `      <div className="max-w-6xl mx-auto px-6">`,
      `        <div className="text-center mb-16">`,
      `          <h2 className="text-3xl font-bold mb-4">${title}</h2>`,
      `          <p className="text-muted-foreground">${subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">`,
      `          {tiers?.map((tier, i) => (`,
      `            <div key={i} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'bg-card'}\`}>`,
      `              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>`,
      `              <div className="mb-6">`,
      `                <span className="text-4xl font-bold">{tier.price}</span>`,
      `                <span className="text-muted-foreground">{tier.period}</span>`,
      `              </div>`,
      `              <ul className="space-y-3 mb-8">`,
      `                {tier.features?.map((feature, j) => (`,
      `                  <li key={j} className="flex items-center gap-2 text-sm">`,
      `                    <span className="text-primary">✓</span>`,
      `                    {feature}`,
      `                  </li>`,
      `                ))}`,
      `              </ul>`,
      `              <button className={\`w-full py-3 rounded-lg font-medium \${tier.highlighted ? 'bg-primary text-primary-foreground' : 'border bg-background hover:bg-muted'}\`}>`,
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
      `    <section className="py-24 bg-muted/50">`,
      `      <div className="max-w-7xl mx-auto px-6">`,
      `        <div className="text-center mb-16">`,
      `          <h2 className="text-3xl font-bold mb-4">${title}</h2>`,
      `          <p className="text-muted-foreground">${subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">`,
      `          {items?.map((testimonial, i) => (`,
      `            <div key={i} className="p-6 rounded-2xl border bg-card">`,
      `              <p className="text-muted-foreground mb-4">"{testimonial.metadata?.quote}"</p>`,
      `              <div>`,
      `                <div className="font-semibold">{testimonial.title}</div>`,
      `                <div className="text-sm text-muted-foreground">{testimonial.description}</div>`,
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
      `    <section className="py-24">`,
      `      <div className="max-w-4xl mx-auto px-6 text-center">`,
      `        <h2 className="text-3xl font-bold mb-4">${title}</h2>`,
      `        <p className="text-lg text-muted-foreground mb-8">${subtitle}</p>`,
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
      `    <section className="py-24">`,
      `      <div className="max-w-3xl mx-auto px-6">`,
      `        <h2 className="text-3xl font-bold text-center mb-12">${title}</h2>`,
      `        <div className="space-y-4">`,
      `          {items?.map((faq, i) => (`,
      `            <div key={i} className="p-6 rounded-xl border bg-card">`,
      `              <h3 className="font-semibold mb-2">{faq.title}</h3>`,
      `              <p className="text-muted-foreground text-sm">{faq.description}</p>`,
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
      `    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">`,
      `      {stats?.map((stat, i) => (`,
      `        <div key={i} className="p-6 rounded-xl border bg-card">`,
      `          <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>`,
      `          <div className="text-3xl font-bold">{stat.value}</div>`,
      `          {stat.change && (`,
      `            <div className="text-sm text-primary mt-1">{stat.change}</div>`,
      `          )}`,
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
      `    <div className="min-h-screen flex items-center justify-center px-6">`,
      `      <div className="w-full max-w-sm">`,
      `        <h1 className="text-2xl font-bold text-center mb-2">${title}</h1>`,
      `        <p className="text-muted-foreground text-center mb-8">${subtitle}</p>`,
      `        <form className="space-y-4">`,
      ...(spec.fields ?? []).map(f => `          <div>
            <label className="text-sm font-medium mb-1 block">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-lg border bg-background" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium">`,
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
      `    <section className="py-24">`,
      `      <div className="max-w-2xl mx-auto px-6">`,
      `        <h2 className="text-3xl font-bold text-center mb-4">${title}</h2>`,
      `        <p className="text-muted-foreground text-center mb-8">${subtitle}</p>`,
      `        <form className="space-y-4">`,
      ...(spec.fields ?? []).map(f => f.type === 'textarea'
        ? `          <div>
            <label className="text-sm font-medium mb-1 block">${f.label}</label>
            <textarea name="${f.name}" ${f.required ? 'required' : ''} rows={4} className="w-full px-4 py-3 rounded-lg border bg-background resize-none" />
          </div>`
        : `          <div>
            <label className="text-sm font-medium mb-1 block">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-lg border bg-background" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium">`,
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

    return [
      `  return (`,
      `    <div className="rounded-xl border bg-card overflow-hidden">`,
      `      <table className="w-full text-sm">`,
      `        <thead>`,
      `          <tr className="border-b bg-muted/50">`,
      ...(spec.columns ?? []).map(c => `            <th className="px-4 py-3 text-left font-medium">${c.label}</th>`),
      `          </tr>`,
      `        </thead>`,
      `        <tbody>`,
      `          {/* Data rows will be populated from API */}`,
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
      `    <footer className="border-t py-12">`,
      `      <div className="max-w-7xl mx-auto px-6">`,
      `        <div className="flex flex-col md:flex-row justify-between items-center gap-6">`,
      `          <div className="font-semibold">${companyName}</div>`,
      `          <nav className="flex gap-6 text-sm text-muted-foreground">`,
      ...(spec.items ?? []).map(i => `            <a href="${(i.metadata as Record<string, string>)?.href ?? '#'}" className="hover:text-foreground transition-colors">${i.title}</a>`),
      `          </nav>`,
      `        </div>`,
      `      </div>`,
      `    </footer>`,
      `  );`,
    ];
  }

  private generateGenericBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');

    return [
      `  return (`,
      `    <section className="py-16">`,
      `      <div className="max-w-7xl mx-auto px-6">`,
      `        <h2 className="text-2xl font-bold">${title}</h2>`,
      `      </div>`,
      `    </section>`,
      `  );`,
    ];
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
    if ((spec.items?.length ?? 0) > 0) names.push('items');
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

  private generateActionButtons(spec: ComponentSpec): string[] {
    if ((spec.actions?.length ?? 0) === 0) return [];

    const buttons = (spec.actions ?? []).map(action => {
      const styleClass = action.style === 'primary'
        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : action.style === 'ghost'
        ? 'hover:bg-muted'
        : 'border hover:bg-muted';

      return `          <a href="${action.action}" className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium ${styleClass} transition-colors">
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
