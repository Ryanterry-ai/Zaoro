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
    const componentRenders = spec.components.map(c => `      <${c.type} />`).join('\n');

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
      `    <section className="relative pt-32 pb-20 px-6 overflow-hidden">`,
      `      <div className="max-w-4xl mx-auto text-center space-y-6">`,
      badge ? `        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">` : '',
      badge ? `          <span>{badge}</span>` : '',
      badge ? `        </div>` : '',
      `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-50">`,
      `          {title}`,
      `        </h1>`,
      `        <p className="text-zinc-400 text-lg max-w-xl mx-auto">`,
      `          {subtitle}`,
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
      `    <section className="px-6 pb-20">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">`,
      `          {items?.map((feature, i) => (`,
      `            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">`,
      `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-lg">`,
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
      `            <div key={i} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-emerald-500 bg-emerald-500/5' : 'bg-zinc-900 border-zinc-800'}\`}>`,
      `              <h3 className="text-xl font-black text-zinc-50 mb-2">{tier.name}</h3>`,
      `              <div className="mb-6">`,
      `                <span className="text-4xl font-black text-zinc-50">{tier.price}</span>`,
      `                <span className="text-zinc-400 text-sm">{tier.period}</span>`,
      `              </div>`,
      `              <ul className="space-y-3 mb-8">`,
      `                {tier.features?.map((feature, j) => (`,
      `                  <li key={j} className="flex items-center gap-2 text-sm text-zinc-400">`,
      `                    <span className="text-emerald-400">✓</span>`,
      `                    {feature}`,
      `                  </li>`,
      `                ))}`,
      `              </ul>`,
      `              <button className={\`w-full py-3 rounded-xl font-bold transition \${tier.highlighted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'}\`}>`,
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
      `          <div className="text-2xl font-black text-emerald-400 mb-1">{stat.value}</div>`,
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
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">`,
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
            <textarea name="${f.name}" ${f.required ? 'required' : ''} rows={4} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition resize-none" />
          </div>`
        : `          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition" />
          </div>`),
      `          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">`,
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
      `    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">`,
      `      <table className="w-full text-sm">`,
      `        <thead>`,
      `          <tr className="border-b border-zinc-800 text-zinc-400">`,
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
      `    <footer className="border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600">`,
      `      <p>© 2024 {${companyName}}. All rights reserved.</p>`,
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
        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
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
