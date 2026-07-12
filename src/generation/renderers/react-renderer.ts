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
import { SkillIntegrator } from '../skill-integrator.js';
import type { PageLayout, SectionLayout } from '../skill-integrator.js';
import { stageLogger } from '../../core/debug-logger.js';
import { ECOMMERCE_TEMPLATES } from './templates/ecommerce.js';
import { SAAS_TEMPLATES } from './templates/saas.js';
import { RESTAURANT_TEMPLATES } from './templates/restaurant.js';
import { CONTENT_TEMPLATES } from './templates/content.js';
import { HEALTHCARE_TEMPLATES } from './templates/healthcare.js';
import { LEGAL_TEMPLATES } from './templates/legal.js';
import { REALESTATE_TEMPLATES } from './templates/realestate.js';
import { FITNESS_TEMPLATES } from './templates/fitness.js';

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

  /** Current section index during rendering — used by Experience Blueprint scene lookup */
  private currentSectionIndex = 0;

  /** Current render context — set per render cycle for engine token access */
  private currentContext?: RenderContext;

  private readonly skillIntegrator = new SkillIntegrator();

  renderComponent(spec: ComponentSpec, context: RenderContext): RenderedFile {
    log.debug('Rendering component', { type: spec.type });
    this.currentContext = context;
    const componentName = spec.type;

    // All components are generated inline and self-contained. We never import
    // from third-party component registries at runtime (AGENTS.md hard rule #4).
    const code = this.generateComponentCode(spec, context);
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
    const componentMap = new Map<string, { type: string }>();
    for (const c of spec.components) {
      componentMap.set(c.type, c);
    }
    const uniqueComponents = [...componentMap.values()];
    const componentImports = uniqueComponents.map(c => `import ${c.type} from '@/components/${c.type}';`).join('\n');
    const componentRenders = spec.components.map((c: { type: string }) => {
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
    <div className="min-h-screen bg-background text-foreground font-sans">
${componentRenders}
    </div>
  );
}
`;

    // Convert Express-style :param to Next.js App Router [param] for dynamic routes
    const nextPath = spec.path.replace(/:([a-zA-Z]+)/g, '[$1]');
    files.push({
      path: `app${nextPath === '/' ? '' : nextPath}/page.tsx`,
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
      .filter((p: { type: string }) => p.type !== 'auth' && p.type !== 'detail')
      .map((p: { name: string; path: string }) => `  { label: '${p.name}', href: '${p.path}' }`)
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
   * (Design Brief > Design Intelligence > Design DNA > Skill Integrator theme), with only the
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

    const brief = context?.designBrief;
    const dd = context?.designDecision;
    const dna = context?.designDNA;
    const sr = context?.skillRecommendations;

    // Color precedence: Design Brief > Design Intelligence > Design DNA > Skill Integrator > default
    const ct = (dd?.colorTokens ?? {}) as Record<string, string | undefined>;
    const dc = dna?.colors;
    const bc = brief?.colors;
    const sc = sr?.colors;
    const pick = (...vals: (string | undefined)[]): string | undefined =>
      vals.find(v => typeof v === 'string' && v.length > 0);

    const primary = pick(bc?.primary, ct.primary, dc?.primary, sc?.primary, themeColors.primary) ?? '#6366f1';
    const secondary = pick(bc?.secondary, ct.secondary, dc?.secondary, sc?.secondary, themeColors.secondary) ?? primary;
    const accent = pick(bc?.accent, ct.accent, dc?.accent, sc?.accent, themeColors.accent) ?? primary;
    const background = pick(bc?.background, ct.background, dc?.background, sc?.background, themeColors.background) ?? '#0a0a0b';
    const foreground = pick(bc?.foreground, ct.text, dc?.foreground, sc?.foreground, themeColors.foreground) ?? '#fafafa';
    const card = pick(bc?.card, dc?.card, sc?.card, themeColors.card) ?? '#18181b';
    const cardForeground = pick(dc?.cardForeground, sc?.cardForeground, themeColors.cardForeground) ?? foreground;
    const muted = pick(bc?.muted, dc?.muted, sc?.muted, themeColors.muted) ?? card;
    const mutedForeground = pick(dc?.mutedForeground, ct.textMuted, sc?.mutedForeground, themeColors.mutedForeground) ?? '#a1a1aa';
    const border = pick(bc?.border, dc?.border, ct.border, sc?.border, themeColors.border) ?? '#27272a';
    const input = pick(dc?.input, ct.border, sc?.input, themeColors.input) ?? border;
    const ring = pick(ct.ring, dc?.ring, sc?.ring, themeColors.ring) ?? primary;
    const destructive = pick(bc?.destructive, ct.error, dc?.destructive, sc?.destructive, themeColors.destructive) ?? '#ef4444';
    const success = pick(bc?.success, ct.success, dc?.success, sc?.success, themeColors.success) ?? '#22c55e';
    const warning = pick(bc?.warning, ct.warning, dc?.warning, sc?.warning, themeColors.warning) ?? '#f59e0b';
    const info = pick(ct.info, dc?.info, sc?.info, themeColors.info) ?? '#3b82f6';

    // Typography precedence: Design Brief > Design Intelligence > Design DNA > Skill Integrator theme > system
    const tt = (dd?.typographyTokens?.fontFamily ?? {}) as Record<string, string | undefined>;
    const dt = dna?.typography;
    const bt = brief?.typography;
    const heading = pick(bt?.headingFont, tt.heading, dt?.heading, themeType.heading) ?? 'Inter';
    const body = pick(bt?.bodyFont, tt.body, dt?.body, themeType.body) ?? 'Inter';
    const mono = pick(bt?.monoFont, tt.mono, dt?.mono, themeType.mono) ?? 'ui-monospace';

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

  /**
   * Get component templates based on solutionArchitecture.projectCategory and industry.
   * Returns the appropriate template set for the project type.
   */
  private getTemplatesForProject(context: RenderContext): Record<string, () => string> | null {
    const sa = context?.solutionArchitecture;
    if (!sa) return null;

    // Check industry-specific templates first using designBrief
    const industry = context?.designBrief?.industry ?? '';
    const subIndustry = context?.designBrief?.subIndustry ?? '';

    if (industry === 'healthcare' || subIndustry.includes('health')) {
      return HEALTHCARE_TEMPLATES;
    }
    if (industry === 'legal' || subIndustry.includes('legal') || subIndustry.includes('law')) {
      return LEGAL_TEMPLATES;
    }
    if (industry === 'realestate' || subIndustry.includes('real') || subIndustry.includes('property')) {
      return REALESTATE_TEMPLATES;
    }
    if (industry === 'fitness' || subIndustry.includes('fitness') || subIndustry.includes('gym')) {
      return FITNESS_TEMPLATES;
    }
    if (industry === 'restaurant' || subIndustry.includes('restaurant') || subIndustry.includes('cafe') || subIndustry.includes('coffee')) {
      return RESTAURANT_TEMPLATES;
    }

    // Fall back to project category
    switch (sa.projectCategory) {
      case 'web-store':
      case 'mobile-store':
        return ECOMMERCE_TEMPLATES;
      case 'saas-app':
      case 'internal-tool':
        return SAAS_TEMPLATES;
      case 'web-site':
        return CONTENT_TEMPLATES;
      default:
        return null;
    }
  }

  /**
   * Get a specific component template by name from the current project's templates.
   */
  private getComponentTemplate(componentType: string, context: RenderContext): (() => string) | null {
    const templates = this.getTemplatesForProject(context);
    if (!templates) return null;

    // Map component types to template names
    const templateMap: Record<string, string> = {
      'ProductGrid': 'ProductCard',
      'ProductCard': 'ProductCard',
      'CartDrawer': 'CartDrawer',
      'CheckoutModal': 'CheckoutModal',
      'ProductFilter': 'ProductFilter',
      'CartStore': 'CartStore',
      'ProductDetailModal': 'ProductDetailModal',
      'PricingCard': 'PricingCard',
      'FeatureGrid': 'FeatureGrid',
      'DashboardLayout': 'DashboardLayout',
      'StatsCard': 'StatsCard',
      'Hero': 'Hero',
      'BlogCard': 'BlogCard',
      'Testimonial': 'Testimonial',
      'CTASection': 'CTASection',
      'FAQ': 'FAQ',
      'Newsletter': 'Newsletter',
      'MenuItem': 'MenuItem',
      'TableReservation': 'TableReservation',
      'MenuCategory': 'MenuCategory',
      'OrderStatus': 'OrderStatus',
    };

    const templateName = templateMap[componentType];
    if (templateName && templates[templateName]) {
      return templates[templateName];
    }
    return null;
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
    const navPages = spec.pages.filter((p: { type: string }) => p.type !== 'auth' && p.type !== 'detail');
    const links = navPages.map((p: { name: string; path: string }) =>
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-black text-xl text-foreground">${appName}</Link>
        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={\`text-sm font-medium transition \${pathname === item.href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}\`}>
              {item.label}
            </Link>
          ))}
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden text-muted-foreground">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 flex flex-col gap-4">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="text-sm text-muted-foreground">{item.label}</Link>
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
  'flask-conical': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>,
  repeat: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  'check-circle': <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  sparkles: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  tag: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  home: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  target: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  workflow: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>,
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
    <footer className="border-t border-border bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">\u00A9 {new Date().getFullYear()} ${spec.appName}. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-muted-foreground transition">Privacy</Link>
          <Link href="/terms" className="hover:text-muted-foreground transition">Terms</Link>
          <Link href="/contact" className="hover:text-muted-foreground transition">Contact</Link>
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
    const ds = this.resolveDesignSystem(context ?? {} as RenderContext);

    // Build Google Fonts URL from resolved fonts (Design Intelligence > DesignDNA)
    const fontsToLoad = new Set<string>();
    if (ds.fonts.heading && !ds.fonts.heading.includes('system-ui')) {
      fontsToLoad.add(ds.fonts.heading.split(',')[0].trim().replace(/ /g, '+'));
    }
    if (ds.fonts.body && !ds.fonts.body.includes('system-ui')) {
      fontsToLoad.add(ds.fonts.body.split(',')[0].trim().replace(/ /g, '+'));
    }
    // Fallback to DesignDNA if Design Intelligence didn't provide fonts
    if (fontsToLoad.size === 0 && dna?.typography?.googleFontsUrl) {
      return {
        path: 'app/layout.tsx',
        content: '',
        type: 'page' as const,
      };
    }

    const fontFamilies = Array.from(fontsToLoad).map(f => `family=${f}:wght@400;500;600;700;800`).join('&');
    const googleFontsUrl = fontsToLoad.size > 0
      ? `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`
      : dna?.typography?.googleFontsUrl ?? '';

    const fontLink = googleFontsUrl
      ? `<link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />\n    <link href="${googleFontsUrl}" rel="stylesheet" />`
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
      <body className="bg-background text-foreground antialiased">
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
      case 'surface':    return 'bg-card/50';
      case 'primary':    return 'bg-primary text-white';
      case 'gradient':   return primaryColor
        ? `bg-gradient-to-br from-zinc-900 via-zinc-900 to-[${primaryColor}]/20`
        : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-primary/20';
      case 'image':      return 'bg-cover bg-center bg-no-repeat';
      case 'transparent':
      default:           return '';
    }
  }

  private resolveCurrentScene(context?: RenderContext): import('../../orchestration/design-intelligence/types-experience').Scene | undefined {
    const bp = context?.experienceBlueprint;
    if (!bp?.scenes) return undefined;
    return bp.scenes[this.currentSectionIndex] ?? bp.scenes[0];
  }

  private resolveHoverProps(context?: RenderContext): string {
    const bp = context?.experienceBlueprint;
    if (!bp?.hoverBehaviors) return '';
    const hover = bp.hoverBehaviors[this.currentSectionIndex] ?? bp.hoverBehaviors[0];
    if (!hover || hover.strategy === 'none') return '';
    const dur = `${(hover.animation.duration / 1000).toFixed(2)}`;
    const ease = hover.animation.easing;
    const feedback = hover.feedback;
    switch (hover.strategy) {
      case 'magnetic':
        return `whileHover={{ scale: ${feedback.scale ?? 1.02}, x: 4, y: 4 }}`;
      case 'elevation':
        return `whileHover={{ y: -4, boxShadow: "${feedback.shadow ?? '0 12px 24px rgba(0,0,0,0.12)'}" }}`;
      case 'glow':
        return `whileHover={{ boxShadow: "0 0 20px ${feedback.backgroundShift ?? 'rgba(124,58,237,0.4)'}" }}`;
      case 'image-zoom':
        return `whileHover={{ scale: ${feedback.scale ?? 1.05} }}`;
      case 'tilt-3d':
        return `whileHover={{ rotateY: 5, rotateX: -3, scale: ${feedback.scale ?? 1.02} }}`;
      case 'glass-movement':
        return `whileHover={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)", scale: ${feedback.scale ?? 1.01} }}`;
      case 'text-reveal':
        return `whileHover={{ letterSpacing: "0.05em" }}`;
      case 'border-draw':
        return `whileHover={{ borderColor: "${feedback.borderColor ?? 'currentColor'}" }}`;
      case 'background-shift':
        return `whileHover={{ backgroundColor: "${feedback.backgroundShift ?? 'var(--primary)'}" }}`;
      case 'scale-subtle':
        return `whileHover={{ scale: ${feedback.scale ?? 1.02} }}`;
      case 'depth-shift':
        return `whileHover={{ y: -2 }}`;
      case 'icon-movement':
        return `whileHover={{ x: 4 }}`;
      case 'cursor-follow':
        return `whileHover={{ scale: ${feedback.scale ?? 1.02} }}`;
      default:
        return `whileHover={{ scale: ${feedback.scale ?? 1.02} }}`;
    }
  }

  private resolveAnimationProps(animation: SectionLayout['animation'], context?: RenderContext): string {
    const scene = this.resolveCurrentScene(context);
    const motion = context?.designDecision?.motionTokens;
    const dur = motion?.duration ?? {};
    const ease = motion?.easing ?? {};
    const reduced = motion?.reducedMotion ?? false;

    // Check for industry-specific animation suggestions from MotionEngine
    const animSuggestions = context?.designDecision?.recommendations
      ?.filter(r => r.domain === 'motion' && r.animations)
      .flatMap(r => r.animations ?? []) ?? [];

    if (reduced) {
      return `initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.2 }}`;
    }

    const fast = dur.fast ?? '150ms';
    const normal = dur.normal ?? '250ms';
    const slow = dur.slow ?? '400ms';
    const easeOut = ease.out ?? 'cubic-bezier(0, 0, 0.2, 1)';
    const easeDefault = ease.default ?? 'cubic-bezier(0.4, 0, 0.2, 1)';

    // Experience Intelligence: use scene-specific animation config when available
    const sceneEntry = scene?.entry;
    const sceneScroll = scene?.scrollTrigger;
    const sceneDurMs = sceneEntry?.duration ?? 500;
    const sceneDur = `${(sceneDurMs / 1000).toFixed(2)}`;
    const sceneEase = sceneEntry?.easing ?? easeOut;
    const sceneType = sceneEntry?.type ?? animation;

    // Build viewport string from scroll trigger
    const viewportAmount = sceneScroll?.start ? parseFloat(sceneScroll.start) / 100 : 0.3;
    const viewportOnce = true;
    const viewportParts = [`once: ${viewportOnce}`, `amount: ${viewportAmount}`];
    const viewportStr = viewportParts.join(', ');

    // Get stagger delay from choreography
    const staggerDelay = scene?.choreography?.stagger?.childDelay ? scene.choreography.stagger.childDelay / 1000 : 0.08;

    // Use scene motion type to override animation, falling back to layout animation
    const motionType = (sceneType as string) ?? animation;

    switch (motionType) {
      case 'fade-up':
      case 'fade-up':
        return `initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'fade-down':
        return `initial={{ opacity: 0, y: -24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'fade-left':
        return `initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'fade-right':
        return `initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'stagger':
        return `initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}", staggerChildren: ${staggerDelay} }}`;
      case 'scale-in':
      case 'scale-up':
        return `initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'slide-left':
        return `initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'slide-right':
        return `initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'slide-up':
        return `initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'slide-down':
        return `initial={{ opacity: 0, y: -32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'zoom-in':
        return `initial={{ opacity: 0, scale: 1.1 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'bounce-in':
        return `initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ ${viewportStr} }} transition={{ type: "spring", stiffness: 400, damping: 15 }}`;
      case 'parallax':
        return `initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'card-lift':
        return `whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'text-reveal':
        return `initial={{ clipPath: "inset(0 100% 0 0)" }} whileInView={{ clipPath: "inset(0 0% 0 0)" }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'marquee':
        return `animate={{ x: [0, -1000] }} transition={{ duration: 20, ease: "linear", repeat: Infinity }}`;
      case 'countup':
        return `initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'unveil':
        return `initial={{ clipPath: "inset(100% 0 0 0)" }} whileInView={{ clipPath: "inset(0% 0 0 0)" }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'glitch':
        return `initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'blur-in':
        return `initial={{ opacity: 0, filter: "blur(8px)" }} whileInView={{ opacity: 1, filter: "blur(0px)" }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'rotate-in':
        return `initial={{ opacity: 0, rotate: -8 }} whileInView={{ opacity: 1, rotate: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
      case 'none':
        return '';
      default:
        return `initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ ${viewportStr} }} transition={{ duration: ${sceneDur}, ease: "${sceneEase}" }}`;
    }
  }

  private generateComponentCode(spec: ComponentSpec, context?: RenderContext): string {
    const componentName = spec.type;

    // Check if we have a production-quality template for this component
    const templateFn = context ? this.getComponentTemplate(componentName, context) : null;
    if (templateFn) {
      return templateFn();
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

import React, { useState } from 'react';
import { motion } from 'framer-motion';
${body.includes('<Icon') ? "import Icon from './Icon';\n" : ''}
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
    const ds = this.currentContext ? this.resolveDesignSystem(this.currentContext) : null;
    const primaryColor = ds?.colors.primary ?? '#6366f1';
    const bgColor = ds?.colors.background ?? '#0a0a0b';
    const bgClass = this.resolveBackgroundClass(layout.background, primaryColor);
    const hasOverlay = layout.flags?.darkOverlay;
    const isSplit = layout.heroVariant === 'split';
    const isFullscreen = layout.heroVariant === 'fullscreen';

    if (isFullscreen) {
      return [
        `  return (`,
        `    <motion.section ${animProps} className="relative ${layout.spacing} ${bgClass} min-h-screen px-0 bg-cover bg-center bg-no-repeat flex items-end" style={{ background: 'linear-gradient(135deg, ${bgColor} 0%, ${primaryColor}33 60%, ${bgColor} 100%)' }}>`,
        hasOverlay ? `      <div className="absolute inset-0 bg-background/60 z-10" />` : '',
        `      <div className="relative z-20 max-w-4xl mx-auto px-8 pb-20 w-full">`,
        badge !== '{badge}' ? `        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-white/20 bg-white/10 text-white mb-6">{badge}</div>` : '',
        `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">{title}</h1>`,
        `        <p className="text-muted-foreground text-xl max-w-2xl mb-8">{subtitle}</p>`,
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
        `          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">{title}</h1>`,
        `          <p className="text-muted-foreground text-lg">{subtitle}</p>`,
        ...this.generateActionButtons(spec),
        `        </div>`,
        `        <div className="bg-card border border-border rounded-2xl aspect-video flex items-center justify-center text-muted-foreground">`,
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
      `        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground">{title}</h1>`,
      `        <p className="text-muted-foreground text-lg max-w-xl mx-auto">{subtitle}</p>`,
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
      const cardHover = this.resolveHoverProps(this.currentContext);
      return [
        `  return (`,
        `    <motion.section ${animProps} className="${layout.spacing} ${bgClass}">`,
        `      <div className="max-w-6xl mx-auto">`,
        `        <div className="text-center mb-12">`,
        `          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>`,
        `          <p className="text-muted-foreground">{subtitle}</p>`,
        `        </div>`,
        `        <div className="grid grid-cols-4 grid-rows-2 gap-4 auto-rows-[200px]">`,
        `          {items?.map((feature, i) => (`,
        `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} ${cardHover ? cardHover : ''} className={\`bg-card border border-border rounded-2xl p-6 transition \${i === 0 ? 'col-span-2 row-span-2' : i === 3 ? 'col-span-2' : ''}\`}>`,
        `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
        `                <Icon name={feature.icon || 'layers'} />`,
        `              </div>`,
        `              <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>`,
        `              <p className="text-sm text-muted-foreground">{feature.description}</p>`,
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
        `          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>`,
        `          <p className="text-muted-foreground">{subtitle}</p>`,
        `        </div>`,
        `        <div className="space-y-16">`,
        `          {items?.map((feature, i) => (`,
        `            <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -32 : 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }} className={\`grid grid-cols-1 md:grid-cols-2 gap-10 items-center \${i % 2 !== 0 ? 'md:[direction:rtl]' : ''}\`}>`,
        `              <div className={\`bg-card border border-border rounded-2xl aspect-video \${i % 2 !== 0 ? 'md:[direction:ltr]' : ''}\`} />`,
        `              <div className={\`space-y-4 \${i % 2 !== 0 ? 'md:[direction:ltr]' : ''}\`}>`,
        `                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
        `                  <Icon name={feature.icon || 'layers'} />`,
        `                </div>`,
        `                <h3 className="text-2xl font-black text-foreground">{feature.title}</h3>`,
        `                <p className="text-muted-foreground">{feature.description}</p>`,
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
    const cardHover = this.resolveHoverProps(this.currentContext);
    return [
      `  return (`,
      `    <motion.section ${animProps} className="${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>`,
      `          <p className="text-muted-foreground">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${layout.gridCols ?? '3'} gap-6">`,
      `          {items?.map((feature, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} ${cardHover ? cardHover : ''} className="bg-card border border-border rounded-2xl p-6 transition">`,
      `              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`,
      `                <Icon name={feature.icon || 'layers'} />`,
      `              </div>`,
      `              <h3 className="font-bold text-lg text-foreground mb-2">{feature.title}</h3>`,
      `              <p className="text-sm text-muted-foreground">{feature.description}</p>`,
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

    const cardHover = this.resolveHoverProps(this.currentContext);
    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-20">`,
      `      <div className="max-w-6xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>`,
      `          <p className="text-muted-foreground">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {tiers?.map((tier, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }} ${cardHover ? cardHover : ''} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'bg-card border-border'}\`}>`,
      `              <h3 className="text-xl font-black text-foreground mb-2">{tier.name}</h3>`,
      `              <div className="mb-6">`,
      `                <span className="text-4xl font-black text-foreground">{tier.price}</span>`,
      `                <span className="text-muted-foreground text-sm">{tier.period}</span>`,
      `              </div>`,
      `              <ul className="space-y-3 mb-8">`,
      `                {tier.features?.map((feature, j) => (`,
      `                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">`,
      `                    <span className="text-primary">✓</span>`,
      `                    {feature}`,
      `                  </li>`,
      `                ))}`,
      `              </ul>`,
      `              <button className={\`w-full py-3 rounded-xl font-bold transition \${tier.highlighted ? 'bg-primary text-white' : 'border border-border text-muted-foreground'}\`}>`,
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
        `        <h2 className="text-3xl font-black text-foreground mb-2">{title}</h2>`,
        `        <p className="text-muted-foreground">{subtitle}</p>`,
        `      </div>`,
        `      <div className="flex gap-6 w-max animate-[marquee_${speed}_linear_infinite]">`,
        `        {[...(items ?? []), ...(items ?? [])].map((testimonial, i) => (`,
        `          <div key={i} className="w-80 bg-card border border-border rounded-2xl p-6 flex-shrink-0">`,
        `            <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>`,
        `            <p className="text-sm text-muted-foreground mb-4">"{testimonial.metadata?.quote}"</p>`,
        `            <div>`,
        `              <div className="font-bold text-foreground text-sm">{testimonial.title}</div>`,
        `              <div className="text-xs text-muted-foreground">{testimonial.description}</div>`,
        `            </div>`,
        `          </div>`,
        `        ))}`,
        `      </div>`,
        `    </section>`,
        `  );`,
      ];
    }

    // Static grid
    const cardHover = this.resolveHoverProps(this.currentContext);
    return [
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="${layout.spacing} ${bgClass}">`,
      `      <div className="max-w-5xl mx-auto">`,
      `        <div className="text-center mb-12">`,
      `          <h2 className="text-3xl font-black text-foreground mb-3">{title}</h2>`,
      `          <p className="text-muted-foreground">{subtitle}</p>`,
      `        </div>`,
      `        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`,
      `          {items?.map((testimonial, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} ${cardHover ? cardHover : ''} className="bg-card border border-border rounded-2xl p-6">`,
      `              <div className="flex items-center gap-1 mb-3 text-yellow-400 text-sm">★★★★★</div>`,
      `              <p className="text-sm text-muted-foreground mb-4">"{testimonial.metadata?.quote}"</p>`,
      `              <div>`,
      `                <div className="font-bold text-foreground">{testimonial.title}</div>`,
      `                <div className="text-sm text-muted-foreground">{testimonial.description}</div>`,
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
      `      <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-xl mx-auto text-center p-8 bg-card border border-border rounded-2xl">`,
      `        <h2 className="text-xl font-black text-foreground mb-3">{title}</h2>`,
      `        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>`,
      `        {items?.length ? (`,
      `          <div className="flex items-center justify-center gap-4 mb-6">`,
      `            {items?.map((item, i) => (`,
      `              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">`,
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
      `        <h2 className="text-3xl font-black text-foreground text-center mb-12">{title}</h2>`,
      `        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, staggerChildren: 0.08 }} className="space-y-4">`,
      `          {items?.map((faq, i) => (`,
      `            <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-6">`,
      `              <h3 className="font-bold text-foreground mb-2">{faq.title}</h3>`,
      `              <p className="text-sm text-muted-foreground">{faq.description}</p>`,
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
        `            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="${isPrimary ? 'bg-primary' : 'bg-card'} p-8 text-center">`,
        `              <div className="text-4xl font-black ${isPrimary ? 'text-white' : 'text-primary'} mb-2">{stat.value}</div>`,
        `              <div className="text-sm ${isPrimary ? 'text-white/70' : 'text-muted-foreground'}">{stat.label}</div>`,
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
      `          <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="bg-card border border-border rounded-2xl p-5 text-center">`,
      `            <div className="text-2xl font-black text-primary mb-1">{stat.value}</div>`,
      `            <div className="text-xs text-muted-foreground">{stat.label}</div>`,
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
      `    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen flex items-center justify-center px-6 bg-background">`,
      `      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="w-full max-w-sm">`,
      `        <h1 className="text-2xl font-black text-foreground text-center mb-2">{title}</h1>`,
      `        <p className="text-muted-foreground text-center mb-8">{subtitle}</p>`,
      `        <form className="space-y-4 bg-card border border-border rounded-2xl p-6">`,
      ...(spec.fields ?? []).map((f: { label: string; type: string; name: string; required?: boolean }) => `          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
            <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition" />
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
    const fields = spec.fields ?? [];

    // Build initial state from fields
    const initialState = fields.map(f => `    ${f.name}: ''`).join(',\n');

    // Build field names for state destructuring
    const fieldNames = fields.map(f => f.name).join(', ');

    // Determine API endpoint from component metadata or default to /api/contact
    const apiEndpoint = spec.metadata?.apiEndpoint ?? '/api/contact';

    return [
      `  const [formData, setFormData] = useState({`,
      ...fields.map(f => `    ${f.name}: '',`),
      `  })`,
      `  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')`,
      ``,
      `  const handleSubmit = async (e: React.FormEvent) => {`,
      `    e.preventDefault()`,
      `    setStatus('loading')`,
      `    try {`,
      `      const res = await fetch('${apiEndpoint}', {`,
      `        method: 'POST',`,
      `        headers: { 'Content-Type': 'application/json' },`,
      `        body: JSON.stringify(formData),`,
      `      })`,
      `      if (!res.ok) throw new Error('Submission failed')`,
      `      setStatus('success')`,
      `      setFormData({`,
      ...fields.map(f => `        ${f.name}: '',`),
      `      })`,
      `    } catch (err) {`,
      `      setStatus('error')`,
      `    }`,
      `  }`,
      ``,
      `  return (`,
      `    <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }} className="px-6 pb-16">`,
      `      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="max-w-2xl mx-auto">`,
      `        <h2 className="text-3xl font-black text-foreground text-center mb-3">{title}</h2>`,
      `        <p className="text-muted-foreground text-center mb-8">{subtitle}</p>`,
      `        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">`,
      ...fields.map((f: { type: string; label: string; name: string; required?: boolean }) => f.type === 'textarea'
        ? `          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
            <textarea name="${f.name}" value={formData.${f.name}} onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} ${f.required ? 'required' : ''} rows={4} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition resize-none" />
          </div>`
        : `          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
            <input type="${f.type}" name="${f.name}" value={formData.${f.name}} onChange={e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))} ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition" />
          </div>`),
      `          {status === 'success' && <p className="text-green-400 text-sm">Message sent successfully!</p>}`,
      `          {status === 'error' && <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>}`,
      `          <button type="submit" disabled={status === 'loading'} className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition disabled:opacity-50">`,
      `            {status === 'loading' ? 'Sending...' : '${spec.actions?.[0]?.label ?? 'Send Message'}'}`,
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
      `    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5 }} className="bg-card border border-border rounded-2xl overflow-hidden">`,
      `      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: 0.1 }} className="px-4 py-3 flex items-center justify-between border-b border-border">`,
      `        <h3 className="font-semibold text-card-foreground">{title}</h3>`,
      `        {actions?.map((action, i) => (`,
      `          <button key={i} className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-white">{action.label}</button>`,
      `        ))}`,
      `      </motion.div>`,
      `      <table className="w-full text-sm">`,
      `        <thead>`,
      `          <tr className="border-b border-border text-muted-foreground">`,
      `            {columns?.map((col, i) => (<th key={i} className="px-4 py-3 text-left font-medium">{col.label}</th>))}`,
      `          </tr>`,
      `        </thead>`,
      `        <tbody>`,
      `          {items?.map((item, i) => (`,
      `            <tr key={i} className="border-b border-border/50 hover:bg-muted/30">`,
      `              {columns?.map((col, j) => (<td key={j} className="px-4 py-3 text-muted-foreground">{String(item[col.key] ?? item.title ?? '—')}</td>))}`,
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
      `    <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="border-t border-border py-12 px-6 text-center text-sm text-muted-foreground">`,
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
      `          <h2 className="text-3xl font-black text-foreground mb-2">{title}</h2>`,
      `          <p className="text-muted-foreground">{subtitle}</p>`,
      `        </div>`,
      `        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="bg-card border border-border rounded-2xl p-6">`,
      `          <div className="flex items-center justify-between mb-4">`,
      `            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-zinc-200 transition">← {actions?.[0]?.label ?? 'Prev'}</button>`,
      `            <span className="text-sm font-bold text-foreground">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>`,
      `            <button className="px-3 py-1 text-sm text-muted-foreground hover:text-zinc-200 transition">{actions?.[1]?.label ?? 'Next'} →</button>`,
      `          </div>`,
      `          <div className="grid grid-cols-7 gap-2 text-center text-xs">`,
      `            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (`,
      `              <div key={day} className="text-muted-foreground font-medium py-1">{day}</div>`,
      `            ))}`,
      `            {items?.map((item, i) => (`,
      `              <button key={i} disabled={item.metadata?.available === 'false'} className={\`py-2 rounded-lg transition \${item.metadata?.available === 'false' ? 'text-muted-foreground cursor-not-allowed' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}\`}>`,
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
      `          <h2 className="text-3xl font-black text-foreground mb-2">{title}</h2>`,
      `          <p className="text-muted-foreground">{subtitle}</p>`,
      `        </div>`,
      `        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, staggerChildren: 0.08 }} className="space-y-6">`,
      `          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="grid grid-cols-3 gap-4">`,
      `            {items?.map((slot, i) => (`,
      `              <motion.button key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.05 }} className="p-4 bg-card border border-border rounded-xl text-left hover:border-primary/50 transition">`,
      `                <div className="font-bold text-foreground mb-1">{slot.title}</div>`,
      `                <div className="text-sm text-muted-foreground">{slot.description}</div>`,
      `                <div className="text-xs text-primary mt-2">{slot.metadata?.slots} slots available</div>`,
      `              </motion.button>`,
      `            ))}`,
      `          </motion.div>`,
      `          <form className="bg-card border border-border rounded-2xl p-6 space-y-4">`,
      ...(spec.fields ?? []).map((f: { type: string; label: string; name: string; required?: boolean; options?: Array<{ value: string; label: string }> }) => f.type === 'select'
        ? `            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
              <select name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white focus:outline-none focus:border-primary transition">
                ${f.options?.map((o: { value: string; label: string }) => `<option value="${o.value}">${o.label}</option>`).join('\n                ') ?? ''}
              </select>
            </div>`
        : f.type === 'textarea'
        ? `            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
              <textarea name="${f.name}" ${f.required ? 'required' : ''} rows={3} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition resize-none" />
            </div>`
        : `            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">${f.label}</label>
              <input type="${f.type}" name="${f.name}" ${f.required ? 'required' : ''} className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition" />
            </div>`),
      `            <button type="submit" className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition">`,
      `              ${spec.actions?.[0]?.label ?? 'Book Now'}`,
      `            </button>`,
      `          </form>`,
      `        </motion.div>`,
      `      </div>`,
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
      lines.push(`        <p className="text-muted-foreground mt-2">${subtitle}</p>`);
    }

    // Render items grid (for about, team, mission, activity, features, etc.)
    if (hasItems) {
      lines.push(`        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">`);
      lines.push(`          {items?.map((item, i) => (`);
      lines.push(`            <div key={i} className="p-6 rounded-2xl bg-card border border-border">`);
      lines.push(`              <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary">`);
      lines.push(`                <span className="text-lg font-bold">{item.icon ? '★' : '→'}</span>`);
      lines.push(`              </div>`);
      lines.push(`              <h3 className="text-lg font-semibold text-card-foreground mb-2">{item.title}</h3>`);
      lines.push(`              <p className="text-muted-foreground text-sm">{item.description}</p>`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    // Render fields form (for profile, billing, auth, etc.)
    if (hasFields && !hasItems) {
      lines.push(`        <div className="mt-8 space-y-4 max-w-lg">`);
      lines.push(`          {fields?.map((field, i) => (`);
      lines.push(`            <div key={i}>`);
      lines.push(`              <label className="block text-sm font-medium text-muted-foreground mb-1">{field.label}</label>`);
      lines.push(`              {field.type === 'textarea' ? (`);
      lines.push(`                <textarea className="w-full px-4 py-2 bg-card border border-border rounded-lg text-card-foreground" rows={3} />`);
      lines.push(`              ) : field.type === 'select' ? (`);
      lines.push(`                <select className="w-full px-4 py-2 bg-card border border-border rounded-lg text-card-foreground">`);
      lines.push(`                  {field.options?.map((opt, j) => <option key={j} value={opt.value}>{opt.label}</option>)}`);
      lines.push(`                </select>`);
      lines.push(`              ) : (`);
      lines.push(`                <input type={field.type || 'text'} className="w-full px-4 py-2 bg-card border border-border rounded-lg text-card-foreground" placeholder={field.placeholder} />`);
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
      lines.push(`              {columns?.map((col, i) => <th key={i} className="px-4 py-3 text-left font-medium text-muted-foreground">{col.label}</th>)}`);
      lines.push(`            </tr></thead>`);
      lines.push(`            <tbody>`);
      lines.push(`              {items?.map((row, i) => (`);
      lines.push(`                <tr key={i} className="border-t border-border">`);
      lines.push(`                  <td className="px-4 py-3 text-card-foreground">{row.title}</td>`);
      lines.push(`                  {columns?.slice(1).map((col, j) => <td key={j} className="px-4 py-3 text-muted-foreground">{(row.metadata as any)?.[col.key] ?? '—'}</td>)}`);
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
      lines.push(`            <div key={i} className="p-6 rounded-2xl bg-card border border-border text-center">`);
      lines.push(`              <div className="text-3xl font-black text-foreground">{stat.value}</div>`);
      lines.push(`              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>`);
      lines.push(`            </div>`);
      lines.push(`          ))}`);
      lines.push(`        </div>`);
    }

    // Render pricing tiers
    if (hasTiers) {
      lines.push(`        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">`);
      lines.push(`          {tiers?.map((tier, i) => (`);
      lines.push(`            <div key={i} className={\`p-8 rounded-2xl border \${tier.highlighted ? 'border-primary bg-primary/5' : 'border-border bg-card'}\`}>`);
      lines.push(`              <h3 className="text-xl font-bold text-card-foreground">{tier.name}</h3>`);
      lines.push(`              <div className="mt-4 text-4xl font-black text-foreground">{tier.price}<span className="text-sm text-muted-foreground">{tier.period}</span></div>`);
      lines.push(`              <ul className="mt-6 space-y-3">`);
      lines.push(`                {tier.features?.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">✓ {f}</li>)}`);
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
      const val = (content as { value?: string })?.value;
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

    const hoverProps = this.resolveHoverProps(this.currentContext);
    const useMotion = hoverProps && this.currentContext?.experienceBlueprint;

    const buttons = (spec.actions ?? []).map((action: { label: string; style?: string }) => {
      const styleClass = action.style === 'primary'
        ? 'bg-primary text-white'
        : action.style === 'ghost'
        ? 'border border-border text-muted-foreground'
        : 'border border-border text-muted-foreground';

      if (useMotion) {
        return `          <motion.a href="${(action as { action?: string }).action ?? '#'}" ${hoverProps} className="px-8 py-4 rounded-xl font-bold transition-all ${styleClass}">
            ${action.label}
          </motion.a>`;
      }

      return `          <a href="${(action as { action?: string }).action ?? '#'}" className="px-8 py-4 rounded-xl font-bold transition-all ${styleClass} hover:bg-primary/90">
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

  private resolveStaggerProps(context?: RenderContext): string {
    const scene = this.resolveCurrentScene(context);
    const stagger = scene?.choreography?.stagger;
    if (!stagger) return '';
    const delayMs = stagger.childDelay ?? 80;
    const delay = (delayMs / 1000).toFixed(2);
    const fromCenter = stagger.direction === 'center-out';
    return `transition={{ staggerChildren: ${delay}, delayChildren: ${fromCenter ? delay : 0} }}`;
  }

  private resolveChildMotion(context?: RenderContext): string {
    const scene = this.resolveCurrentScene(context);
    const stagger = scene?.choreography?.stagger;
    if (!stagger) return '';
    const dist = 20;
    return `initial={{ opacity: 0, y: ${dist} }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}`;
  }

  private resolveParallaxLayer(context?: RenderContext, depth: number = 0): { open: string; close: string } {
    const scene = this.resolveCurrentScene(context);
    const layers = scene?.parallaxLayers;
    if (!layers || layers.length === 0) return { open: '', close: '' };
    const layer = layers[depth] ?? layers[0];
    const speed = layer.speed ?? 0.3;
    const depthVal = layer.depth ?? 0;
    if (depth === 0) {
      return {
        open: `<motion.div style={{ perspective: 1000 }} className="relative">`,
        close: '</motion.div>',
      };
    }
    return {
      open: `<motion.div initial={{ y: ${40 * speed}, z: ${depthVal * 100} }} whileInView={{ y: 0, z: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative">`,
      close: '</motion.div>',
    };
  }
}
