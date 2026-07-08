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
  ComponentSourceRec,
} from './renderer.js';
import { SkillIntegrator } from '../skill-integrator.js';
import type { PageLayout, SectionLayout } from '../skill-integrator.js';
import { stageLogger } from '../../core/debug-logger.js';

const log = stageLogger('render');

// Inline SVG icons for preview rendering — maps Lucide icon names to SVG paths
const INLINE_ICONS: Record<string, string> = {
  'layers': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  'zap': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  'shield': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  'lock': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  'database': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  'grid': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  'truck': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  'calendar': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  'book-open': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'shopping-bag': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  'credit-card': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  'heart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  'users': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'bar-chart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  'activity': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  'search': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  'eye': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  'video': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  'code': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  'award': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
  'star': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  'check': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  'mail': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  'phone': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  'map-pin': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  'clock': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  'briefcase': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  'map': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  'compass': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  'chef-hat': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V20H6v-6.13z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>',
  'leaf': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  'dollar-sign': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  'package': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  'refresh-cw': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  'settings': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  'headphones': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
};

function getInlineIcon(name: string): string {
  const svg = INLINE_ICONS[name] ?? INLINE_ICONS['layers'] ?? '';
  return svg.replace(/width="\d+"/, 'width="20"').replace(/height="\d+"/, 'height="20"');
}

export class ReactRenderer implements Renderer {
  readonly platform = 'react';
  readonly componentExtension = '.tsx';
  readonly pageExtension = '.tsx';

  /** External packages collected during rendering for package.json */
  private externalPackages: Record<string, string> = {};

  /** Current render context — set per render cycle for engine token access */
  private currentContext?: RenderContext;

  private readonly skillIntegrator = new SkillIntegrator();

  renderComponent(spec: ComponentSpec, context: RenderContext): RenderedFile {
    log.debug('Rendering component', { type: spec.type });
    this.currentContext = context;
    const componentName = spec.type;

    // Check if this component has an external source recommendation
    const sourceRec = context.componentSources?.find(
      (s: ComponentSourceRec) => s.type === spec.type && s.source !== 'custom',
    );
    if (sourceRec) {
      this.externalPackages[sourceRec.packageName] = '^1.0.0';
    }

    const code = this.generateComponentCode(spec, sourceRec, context);
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
    this.currentContext = context;

    const t = Date.now();
    const files: RenderedFile[] = [];
    const warnings: string[] = [];
    const skipSingletons = context.skipSingletons === true;

    // Generate shell (config files, CSS, layout) — the runnable scaffolding
    if (!skipSingletons) {
      files.push(...this.renderShell(spec, context));
    }

    // Generate Icon helper component for preview rendering
    if (!skipSingletons) {
      files.push(this.renderIconComponent());
    }

    // Agent mode: generate components from resolved content (agent can override later)
    if (context.agentMode) {
      // Generate nav data (needed for shell completeness)
      if (!skipSingletons) {
        files.push(...this.renderNavData(spec, context));
      }

      // Generate components from the resolved application spec
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

      log.info('Agent mode: rendered from resolved content (agent can override)', {
        files: files.length,
        components: generatedComponents.size,
        duration: Date.now() - t,
      });
      return { files, warnings };
    }

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
    if (!skipSingletons) {
      files.push(...this.renderNavData(spec, context));
    }

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

    return [
      this.renderPackageJson(appName),
      this.renderTsConfig(),
      this.renderGlobalsCSS(context),
      this.renderTailwindConfig(context),
      this.renderPostCSSConfig(),
      this.renderNextConfig(),
      this.renderNavbar(spec),
      this.renderGlobalFooter(spec),
      this.renderRootLayout(appName, context),
    ];
  }

  /**
   * Resolve the complete design-system token set consumed by globals.css and
   * tailwind.config. Every value originates from an engine output
   * (Design Intelligence > Design DNA > Skill Integrator theme), with only the
   * final fallback being a neutral default. No hardcoded brand palettes remain
   * in the render path.
   */
  private resolveDesignSystem(context: RenderContext): {
    colors: {
      background: string; foreground: string; primary: string; primaryForeground: string;
      secondary: string; secondaryForeground: string; accent: string; muted: string;
      mutedForeground: string; card: string; cardForeground: string; border: string;
      input: string; ring: string; destructive: string; success: string; warning: string; info: string;
    };
    fonts: { heading: string; body: string; mono: string };
    radius: string;
  } {
    const theme = (context?.theme ?? {}) as Record<string, unknown>;
    const themeColors = (theme.colors ?? {}) as Record<string, string>;
    const themeType = (theme.typography ?? {}) as Record<string, string>;

    const dd = context?.designDecision;
    const dna = context?.designDNA;

    // Color precedence: Design Intelligence > Design DNA > Skill Integrator theme > default
    const ct = (dd?.colorTokens ?? {}) as Record<string, string | undefined>;
    const dc = dna?.colors;
    const pick = (...vals: (string | undefined)[]): string | undefined =>
      vals.find(v => typeof v === 'string' && v.length > 0);

    const primary = pick(ct.primary, dc?.primary, themeColors.primary) ?? '#6366f1';
    const secondary = pick(ct.secondary, dc?.secondary, themeColors.secondary) ?? primary;
    const accent = pick(ct.accent, dc?.accent, themeColors.accent) ?? primary;
    const background = pick(ct.background, dc?.background, themeColors.background) ?? '#0a0a0b';
    const foreground = pick(ct.text, dc?.foreground, themeColors.foreground) ?? '#fafafa';
    const card = pick(dc?.card, themeColors.card) ?? '#18181b';
    const cardForeground = pick(dc?.cardForeground, themeColors.cardForeground) ?? foreground;
    const muted = pick(dc?.muted, themeColors.muted) ?? card;
    const mutedForeground = pick(dc?.mutedForeground, ct.textMuted, themeColors.mutedForeground) ?? '#a1a1aa';
    const border = pick(dc?.border, ct.border, themeColors.border) ?? '#27272a';
    const input = pick(dc?.input, ct.border, themeColors.input) ?? border;
    const ring = pick(ct.ring, dc?.ring, themeColors.ring) ?? primary;
    const destructive = pick(ct.error, dc?.destructive, themeColors.destructive) ?? '#ef4444';
    const success = pick(ct.success, dc?.success, themeColors.success) ?? '#22c55e';
    const warning = pick(ct.warning, dc?.warning, themeColors.warning) ?? '#f59e0b';
    const info = pick(ct.info, dc?.info, themeColors.info) ?? '#3b82f6';

    // Typography precedence: Design Intelligence > Design DNA > Skill Integrator theme > system
    const tt = (dd?.typographyTokens?.fontFamily ?? {}) as Record<string, string | undefined>;
    const dt = dna?.typography;
    const heading = pick(tt.heading, dt?.heading, themeType.heading) ?? 'Inter';
    const body = pick(tt.body, dt?.body, themeType.body) ?? 'Inter';
    const mono = pick(tt.mono, dt?.mono, themeType.mono) ?? 'ui-monospace';

    const radius = pick(
      typeof dd?.layoutTokens?.borderRadius === 'string' ? dd.layoutTokens.borderRadius : undefined,
      typeof dna?.radius === 'string' ? dna.radius : undefined,
      themeColors.radius,
    ) ?? '0.75rem';

    return {
      colors: {
        background, foreground, primary, primaryForeground: '#ffffff',
        secondary, secondaryForeground: '#ffffff', accent, muted, mutedForeground,
        card, cardForeground, border, input, ring, destructive, success, warning, info,
      },
      fonts: { heading, body, mono },
      radius,
    };
  }

  private renderTsConfig(): RenderedFile {
    return {
      path: '../tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2017',
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
          paths: { '@/*': ['./src/*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      }, null, 2),
      type: 'config',
    };
  }

  private renderPackageJson(appName: string): RenderedFile {
    const deps: Record<string, string> = {
      '@prisma/client': '^5.10.2',
      'autoprefixer': '^10.4.17',
      'class-variance-authority': '^0.7.1',
      'clsx': '^2.1.1',
      'framer-motion': '^11.0.0',
      'lucide-react': '^0.468.0',
      'next': '^14.1.0',
      'postcss': '^8.4.35',
      'prisma': '^5.10.2',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'tailwind-merge': '^2.5.4',
      'tailwindcss': '^3.4.1',
    };

    // Merge any externally-sourced component packages
    for (const [pkg, ver] of Object.entries(this.externalPackages)) {
      if (!deps[pkg]) {
        deps[pkg] = ver;
      }
    }

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
        dependencies: deps,
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

  private renderGlobalsCSS(context: RenderContext): RenderedFile {
    const ds = this.resolveDesignSystem(context);
    const c = ds.colors;

    return {
      path: 'app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: ${c.background};
  --foreground: ${c.foreground};
  --primary: ${c.primary};
  --primary-foreground: ${c.primaryForeground};
  --secondary: ${c.secondary};
  --secondary-foreground: ${c.secondaryForeground};
  --accent: ${c.accent};
  --muted: ${c.muted};
  --muted-foreground: ${c.mutedForeground};
  --card: ${c.card};
  --card-foreground: ${c.cardForeground};
  --border: ${c.border};
  --input: ${c.input};
  --ring: ${c.ring};
  --destructive: ${c.destructive};
  --success: ${c.success};
  --warning: ${c.warning};
  --info: ${c.info};
  --radius: ${ds.radius};
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: ${ds.fonts.body}, ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${ds.fonts.heading}, ui-sans-serif, system-ui, -apple-system, sans-serif;
}

@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
`,
      type: 'style',
    };
  }

  private renderTailwindConfig(context: RenderContext): RenderedFile {
    const ds = this.resolveDesignSystem(context);

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
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        accent: 'var(--accent)',
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        destructive: 'var(--destructive)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        info: 'var(--info)',
      },
      fontFamily: {
        heading: ['${ds.fonts.heading}', 'sans-serif'],
        body: ['${ds.fonts.body}', 'sans-serif'],
        mono: ['${ds.fonts.mono}', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
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
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
    unoptimized: true,
  },
};
export default nextConfig;
`,
      type: 'config',
    };
  }

  private renderNavbar(spec: ApplicationSpec): RenderedFile {
    const appName = spec.appName || 'App';
    const navPages = spec.pages.filter(p => p.type !== 'auth' && p.type !== 'detail');
    const links = navPages.map(p =>
      `    { label: '${p.name}', href: '${p.path}' }`
    ).join(',\n');

    return {
      path: 'components/Navbar.tsx',
      content: `'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
${links}
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-black text-xl text-zinc-50">${appName}</Link>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={\`text-sm font-medium transition \${pathname === item.href ? 'text-primary' : 'text-zinc-400 hover:text-zinc-50'}\`}>
              {item.label}
            </Link>
          ))}
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-zinc-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-6 py-4 flex flex-col gap-4">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="text-sm text-zinc-300">{item.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
`,
      type: 'component',
    };
  }

  private renderIconComponent(): RenderedFile {
    return {
      path: 'components/Icon.tsx',
      content: `'use client';

import React from 'react';

const icons: Record<string, React.ReactNode> = {
  layers: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  zap: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  shield: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  'trending-up': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  lock: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  database: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  grid: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  truck: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  calendar: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  'book-open': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  'shopping-bag': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  'credit-card': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  heart: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  'bar-chart': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  activity: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  eye: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  video: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  code: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  award: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  star: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  mail: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  'map-pin': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  clock: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  briefcase: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  'file-text': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  map: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  compass: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  'chef-hat': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V20H6v-6.13z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>,
  leaf: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  'dollar-sign': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  package: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  'refresh-cw': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  settings: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  headphones: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>,
};

const fallback = <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

export default function Icon({ name }: { name: string }) {
  return <>{icons[name] ?? fallback}</>;
}
`,
      type: 'component',
    };
  }

  private renderGlobalFooter(spec: ApplicationSpec): RenderedFile {
    return {
      path: 'components/GlobalFooter.tsx',
      content: `'use client';
import React from 'react';
import Link from 'next/link';

export default function GlobalFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">\u00A9 {new Date().getFullYear()} ${spec.appName}. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition">Terms</Link>
          <Link href="/contact" className="hover:text-zinc-300 transition">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
`,
      type: 'component',
    };
  }

  private renderRootLayout(appName: string, context?: RenderContext): RenderedFile {
    const dna = context?.designDNA;
    const fontLink = dna?.typography?.googleFontsUrl
      ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />\n    <link href="${dna.typography.googleFontsUrl}" rel="stylesheet" />`
      : '';

    return {
      path: 'app/layout.tsx',
      content: `import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} — built with Build Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        ${fontLink}
      </head>
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        <Navbar />
        <main className="pt-16">{children}</main>
        <GlobalFooter />
      </body>
    </html>
  );
}
`,
      type: 'layout',
    };
  }

  // ─── Code Generation Helpers ───────────────────────────────────────────────

  /**
   * Resolve the SectionLayout for a component in the current render context.
   * Falls back to a default if no pageLayout is in context.
   */
  private getSectionLayout(
    spec: ComponentSpec,
    context: RenderContext,
  ): SectionLayout {
    if (context.pageLayout) {
      const found = context.pageLayout.sections.find(s => s.componentType === spec.type);
      if (found) return found;
    }
    // Fallback defaults
    return {
      componentType: spec.type,
      spacing: 'py-16 px-6',
      background: 'transparent',
      animation: 'fade-up',
      showHeading: true,
    };
  }

  private resolveBackgroundClass(background: SectionLayout['background'], primaryColor: string): string {
    switch (background) {
      case 'surface':    return 'bg-zinc-900/50';
      case 'primary':    return 'bg-primary text-white';
      case 'gradient':   return primaryColor
        ? `bg-gradient-to-br from-zinc-900 via-zinc-900 to-[${primaryColor}]/20`
        : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-primary/20';
      case 'image':      return 'bg-cover bg-center bg-no-repeat';
      case 'transparent':
      default:           return '';
    }
  }

  private resolveAnimationProps(animation: SectionLayout['animation'], context?: RenderContext): string {
    const motion = context?.designDecision?.motionTokens;
    const dur = motion?.duration ?? {};
    const ease = motion?.easing ?? {};
    const reduced = motion?.reducedMotion ?? false;

    if (reduced) {
      return `initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.2 }}`;
    }

    const fast = dur.fast ?? '0.3s';
    const normal = dur.normal ?? '0.5s';
    const slow = dur.slow ?? '0.8s';
    const easeOut = ease.out ?? 'ease-out';
    const easeInOut = ease.inOut ?? 'ease-in-out';

    switch (animation) {
      case 'fade-up':
        return `initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: ${normal}, ease: "${easeOut}" }}`;
      case 'stagger':
        return `initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: ${fast}, ease: "${easeOut}", staggerChildren: 0.08 }}`;
      case 'scale-in':
        return `initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: ${normal}, ease: "${easeOut}" }}`;
      case 'slide-left':
        return `initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: ${normal}, ease: "${easeInOut}" }}`;
      case 'parallax':
        return `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: ${slow}, ease: "${easeInOut}" }}`;
      case 'marquee':
      case 'countup':
      case 'none':
      default:
        return `initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: ${fast}, ease: "${easeOut}" }}`;
    }
  }

  private generateComponentCode(spec: ComponentSpec, sourceRec?: ComponentSourceRec, context?: RenderContext): string {
    const componentName = spec.type;

    // If this component comes from an external source, generate a re-export wrapper
    if (sourceRec) {
      const exportName = sourceRec.exportName || componentName;
      const propsInterface = this.generatePropsInterface(spec);
      return `'use client';

import React from 'react';
import { ${exportName} } from '${sourceRec.packageName}';

${propsInterface}

export default function ${componentName}(${this.hasProps(spec) ? `props: ${componentName}Props` : ''}) {
  return <${exportName} {...props} />;
}
`;
    }

    // Build props interface
    const propsInterface = this.generatePropsInterface(spec);

    // Resolve SectionLayout from SkillIntegrator — drives visual treatment
    const layout = context ? this.getSectionLayout(spec, context) : {
      componentType: spec.type,
      spacing: 'py-16 px-6',
      background: 'transparent' as const,
      animation: 'fade-up' as const,
      showHeading: true,
    };

    // Build component body
    const body = this.generateComponentBody(spec, layout);

    return `'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';

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

  private generateComponentBody(spec: ComponentSpec, layout: SectionLayout): string {
    const lines: string[] = [];

    // Destructure props
    if (this.hasProps(spec)) {
      lines.push(`  const { ${this.getPropNames(spec).join(', ')} } = props;`);
      lines.push('');
    }

    // Generate JSX based on component type
    switch (spec.type) {
      case 'HeroBanner':      lines.push(...this.generateHeroBannerBody(spec, layout)); break;
      case 'FeatureGrid':     lines.push(...this.generateFeatureGridBody(spec, layout)); break;
      case 'StatsCards':      lines.push(...this.generateStatsCardsBody(spec, layout)); break;
      case 'Testimonials':    lines.push(...this.generateTestimonialsBody(spec, layout)); break;
      case 'PricingTable':    lines.push(...this.generatePricingTableBody(spec)); break;
      case 'CTASection':      lines.push(...this.generateCTASectionBody(spec)); break;
      case 'FAQSection':      lines.push(...this.generateFAQSectionBody(spec)); break;
      case 'AuthForm':        lines.push(...this.generateAuthFormBody(spec)); break;
      case 'ContactForm':     lines.push(...this.generateContactFormBody(spec)); break;
      case 'DataTable':       lines.push(...this.generateDataTableBody(spec)); break;
      case 'Footer':          lines.push(...this.generateFooterBody(spec)); break;
      case 'CalendarWidget':  lines.push(...this.generateCalendarWidgetBody(spec)); break;
      case 'BookingCalendar': lines.push(...this.generateBookingCalendarBody(spec)); break;
      default:                lines.push(...this.generateGenericBody(spec)); break;
    }

    return lines.join('\n');
  }

  private generateHeroBannerBody(spec: ComponentSpec, layout: SectionLayout): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');
    const badge = this.getContentView(spec, 'badge');
    const animProps = this.resolveAnimationProps(layout.animation, this.currentContext);
    const primaryColor = this.currentContext ? this.resolveDesignSystem(this.currentContext).colors.primary : '';
    const bgClass = this.resolveBackgroundClass(layout.background, primaryColor);
    const hasOverlay = layout.flags?.darkOverlay;
    const isSplit = layout.heroVariant === 'split';
    const isFullscreen = layout.heroVariant === 'fullscreen';

    if (isFullscreen) {
      return [
        `  return (`,
        `    <motion.section ${animProps} className="relative ${layout.spacing} ${bgClass} flex items-end">`,
        hasOverlay ? `      <div className="absolute inset-0 bg-zinc-950/60 z-10" />` : '',
        `      <div className="relative z-20 max-w-4xl mx-auto px-8 pb-20 w-full">`,
        badge !== '{badge}' ? `        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-white/20 bg-white/10 text-white mb-6">{badge}</div>` : '',
        `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">{title}</h1>`,
        `        <p className="text-zinc-300 text-xl max-w-2xl mb-8">{subtitle}</p>`,
        ...this.generateActionButtons(spec),
        `      </div>`,
        `    </motion.section>`,
        `  );`,
      ].filter(Boolean);
    }

    if (isSplit) {
      return [
        `  return (`,
        `    <motion.section ${animProps} className="relative ${layout.spacing} ${bgClass}">`,
        `      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">`,
        `        <div className="space-y-6">`,
        badge !== '{badge}' ? `          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-primary/20 bg-primary/10 text-primary">{badge}</div>` : '',
        `          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-50">{title}</h1>`,
        `          <p className="text-zinc-400 text-lg">{subtitle}</p>`,
        ...this.generateActionButtons(spec),
        `        </div>`,
        `        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl aspect-video flex items-center justify-center text-zinc-600">`,
        `          <span className="text-sm">Preview</span>`,
        `        </div>`,
        `      </div>`,
        `    </motion.section>`,
        `  );`,
      ].filter(Boolean);
    }

    // Default: centered hero
    return [
      `  return (`,
      `    <motion.section ${animProps} className="relative ${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-4xl mx-auto text-center space-y-6">`,
      badge !== '{badge}' ? `        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-primary/20 bg-primary/10 text-primary">{badge}</div>` : '',
      `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-50">{title}</h1>`,
      `        <p className="text-zinc-400 text-lg max-w-xl mx-auto">{subtitle}</p>`,
      ...this.generateActionButtons(spec),
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ].filter(Boolean);
  }

  private generateFeatureGridBody(spec: ComponentSpec, layout: SectionLayout): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');
    const animProps = this.resolveAnimationProps(layout.animation, this.currentContext);
    const primaryColor = this.currentContext ? this.resolveDesignSystem(this.currentContext).colors.primary : '';
    const bgClass = this.resolveBackgroundClass(layout.background, primaryColor);
    const isBento = layout.gridCols === 'bento';
    const isAlternating = layout.gridCols === undefined && layout.animation === 'slide-left';

    if (isBento) {
      return [
        `  return (`,
        `    <motion.section ${animProps} className="${layout.spacing} ${bgClass}">`,
        `      <div className="max-w-6xl mx-auto">`,
        `        <div className="text-center mb-12">`,
        `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
        `          <p className="text-zinc-400">{subtitle}</p>`,
        `        </div>`,
        `        <div className="grid grid-cols-4 grid-rows-2 gap-4 auto-rows-[200px]">`,
        `          {items?.map((feature, i) => (`,
        `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={\`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition \${i === 0 ? 'col-span-2 row-span-2' : i === 3 ? 'col-span-2' : ''}\`}>`,
        `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
        `                <Icon name={feature.icon || 'layers'} />`,
        `              </div>`,
        `              <h3 className="font-bold text-zinc-50 mb-2">{feature.title}</h3>`,
        `              <p className="text-sm text-zinc-400">{feature.description}</p>`,
        `            </motion.div>`,
        `          ))}`,
        `        </div>`,
        `      </div>`,
        `    </motion.section>`,
        `  );`,
      ];
    }

    if (isAlternating) {
      return [
        `  return (`,
        `    <motion.section ${animProps} className="${layout.spacing} ${bgClass}">`,
        `      <div className="max-w-6xl mx-auto">`,
        `        <div className="text-center mb-16">`,
        `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
        `          <p className="text-zinc-400">{subtitle}</p>`,
        `        </div>`,
        `        <div className="space-y-16">`,
        `          {items?.map((feature, i) => (`,
        `            <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -32 : 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }} className={\`grid grid-cols-1 md:grid-cols-2 gap-10 items-center \${i % 2 !== 0 ? 'md:[direction:rtl]' : ''}\`}>`,
        `              <div className={\`bg-zinc-900 border border-zinc-800 rounded-2xl aspect-video \${i % 2 !== 0 ? 'md:[direction:ltr]' : ''}\`} />`,
        `              <div className={\`space-y-4 \${i % 2 !== 0 ? 'md:[direction:ltr]' : ''}\`}>`,
        `                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
        `                  <Icon name={feature.icon || 'layers'} />`,
        `                </div>`,
        `                <h3 className="text-2xl font-black text-zinc-50">{feature.title}</h3>`,
        `                <p className="text-zinc-400">{feature.description}</p>`,
        `              </div>`,
        `            </motion.div>`,
        `          ))}`,
        `        </div>`,
        `      </div>`,
        `    </motion.section>`,
        `  );`,
      ];
    }

    // Default: standard 3-col stagger grid
    return [
      `  return (`,
      `    <motion.section ${animProps} className="${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${layout.gridCols ?? '3'} gap-6">`,
      `          {items?.map((feature, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition">`,
      `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
      `                <Icon name={feature.icon || 'layers'} />`,
      `              </div>`,
      `              <h3 className="font-bold text-lg text-zinc-50 mb-2">{feature.title}</h3>`,
      `              <p className="text-sm text-zinc-400">{feature.description}</p>`,
      `            </motion.div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generatePricingTableBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-20">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {tiers?.map((tier, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'bg-zinc-900 border-zinc-800'}\`}>`,
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
      `            </motion.div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateTestimonialsBody(spec: ComponentSpec, layout: SectionLayout): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');
    const primaryColor = this.currentContext ? this.resolveDesignSystem(this.currentContext).colors.primary : '';
    const bgClass = this.resolveBackgroundClass(layout.background, primaryColor);
    const isMarquee = layout.animation === 'marquee';
    const speed = layout.flags?.marqueeSpeed === 'slow' ? '60s' : layout.flags?.marqueeSpeed === 'fast' ? '20s' : '35s';

    if (isMarquee) {
      return [
        `  return (`,
        `    <section className="${layout.spacing} ${bgClass} overflow-hidden">`,
        `      <div className="mb-10 text-center px-6">`,
        `        <h2 className="text-3xl font-black text-zinc-50 mb-2">{title}</h2>`,
        `        <p className="text-zinc-400">{subtitle}</p>`,
        `      </div>`,
        `      <div className="flex gap-6 w-max animate-[marquee_${speed}_linear_infinite]">`,
        `        {[...(items ?? []), ...(items ?? [])].map((testimonial, i) => (`,
        `          <div key={i} className="w-80 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex-shrink-0">`,
        `            <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>`,
        `            <p className="text-sm text-zinc-400 mb-4">"{testimonial.metadata?.quote}"</p>`,
        `            <div>`,
        `              <div className="font-bold text-zinc-50 text-sm">{testimonial.title}</div>`,
        `              <div className="text-xs text-zinc-500">{testimonial.description}</div>`,
        `            </div>`,
        `          </div>`,
        `        ))}`,
        `      </div>`,
        `    </section>`,
        `  );`,
      ];
    }

    // Static grid
    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-5xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-3">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {items?.map((testimonial, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      `              <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>`,
      `              <p className="text-sm text-zinc-400 mb-4">"{testimonial.metadata?.quote}"</p>`,
      `              <div>`,
      `                <div className="font-bold text-zinc-50">{testimonial.title}</div>`,
      `                <div className="text-sm text-zinc-500">{testimonial.description}</div>`,
      `              </div>`,
      `            </motion.div>`,
      `          ))}`,
      `        </div>`,
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateCTASectionBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-20">`,
      `      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-xl mx-auto text-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">`,
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
      `      </motion.div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateFAQSectionBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-20">`,
      `      <div className="max-w-3xl mx-auto">`,
      `        <h2 className="text-3xl font-black text-zinc-50 text-center mb-12">{title}</h2>`,
      `        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, staggerChildren: 0.08 }} className="space-y-4">`,
      `          {items?.map((faq, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
      `              <h3 className="font-bold text-zinc-50 mb-2">{faq.title}</h3>`,
      `              <p className="text-sm text-zinc-400">{faq.description}</p>`,
      `            </motion.div>`,
      `          ))}`,
      `        </motion.div>`,
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateStatsCardsBody(spec: ComponentSpec, layout: SectionLayout): string[] {
    const isCountup = layout.animation === 'countup';
    const isPrimary = layout.background === 'primary';
    const primaryColor = this.currentContext ? this.resolveDesignSystem(this.currentContext).colors.primary : '';
    const bgClass = this.resolveBackgroundClass(layout.background, primaryColor);

    if (isCountup) {
      return [
        `  return (`,
        `    <section className="${layout.spacing} ${bgClass}">`,
        `      <div className="max-w-6xl mx-auto">`,
        `        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">`,
        `          {stats?.map((stat, i) => (`,
        `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="${isPrimary ? 'bg-primary' : 'bg-zinc-900'} p-8 text-center">`,
        `              <div className="text-4xl font-black ${isPrimary ? 'text-white' : 'text-primary'} mb-2">{stat.value}</div>`,
        `              <div className="text-sm ${isPrimary ? 'text-white/70' : 'text-zinc-500'}">{stat.label}</div>`,
        `            </motion.div>`,
        `          ))}`,
        `        </div>`,
        `      </div>`,
        `    </section>`,
        `  );`,
      ];
    }

    return [
      `  return (`,
      `    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">`,
      `        {stats?.map((stat, i) => (`,
      `          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">`,
      `            <div className="text-2xl font-black text-primary mb-1">{stat.value}</div>`,
      `            <div className="text-xs text-zinc-500">{stat.label}</div>`,
      `          </motion.div>`,
      `        ))}`,
      `      </div>`,
      `    </motion.div>`,
      `  );`,
    ];
  }

  private generateAuthFormBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen flex items-center justify-center px-6 bg-zinc-950">`,
      `      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="w-full max-w-sm">`,
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
      `      </motion.div>`,
      `    </motion.div>`,
      `  );`,
    ];
  }

  private generateContactFormBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-16">`,
      `      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-2xl mx-auto">`,
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
      `      </motion.div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateDataTableBody(spec: ComponentSpec): string[] {
    const entity = this.getContentView(spec, 'entity');
    const title = this.getContentView(spec, 'title');

    return [
      `  return (`,
      `    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">`,
      `      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.1 }} className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">`,
      `        <h3 className="font-semibold text-zinc-100">{title}</h3>`,
      `        {actions?.map((action, i) => (`,
      `          <button key={i} className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white">{action.label}</button>`,
      `        ))}`,
      `      </motion.div>`,
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
      `    </motion.div>`,
      `  );`,
    ];
  }

  private generateFooterBody(spec: ComponentSpec): string[] {
    const companyName = this.getContentView(spec, 'companyName');

    return [
      `  return (`,
      `    <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="border-t border-zinc-800 py-12 px-6 text-center text-sm text-zinc-600">`,
      `      <p>© 2024 {${companyName}}. All rights reserved.</p>`,
      `    </motion.footer>`,
      `  );`,
    ];
  }

  private generateCalendarWidgetBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16 px-6">`,
      `      <div className="max-w-2xl mx-auto">`,
      `        <div className="text-center mb-8">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-2">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">`,
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
      `        </motion.div>`,
      `      </div>`,
      `    </motion.section>`,
      `  );`,
    ];
  }

  private generateBookingCalendarBody(spec: ComponentSpec): string[] {
    const title = this.getContentView(spec, 'title');
    const subtitle = this.getContentView(spec, 'subtitle');

    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16 px-6">`,
      `      <div className="max-w-2xl mx-auto">`,
      `        <div className="text-center mb-8">`,
      `          <h2 className="text-3xl font-black text-zinc-50 mb-2">{title}</h2>`,
      `          <p className="text-zinc-400">{subtitle}</p>`,
      `        </div>`,
      `        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, staggerChildren: 0.08 }} className="space-y-6">`,
      `          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="grid grid-cols-3 gap-4">`,
      `            {items?.map((slot, i) => (`,
      `              <motion.button key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left hover:border-primary/50 transition">`,
      `                <div className="font-bold text-zinc-50 mb-1">{slot.title}</div>`,
      `                <div className="text-sm text-zinc-400">{slot.description}</div>`,
      `                <div className="text-xs text-primary mt-2">{slot.metadata?.slots} slots available</div>`,
      `              </motion.button>`,
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
      `        </motion.div>`,
      `      </motion.div>`,
      `    </motion.section>`,
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
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="py-16">`,
      `      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-7xl mx-auto px-6">`,
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

    lines.push(`      </motion.div>`);
    lines.push(`    </motion.section>`);
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
