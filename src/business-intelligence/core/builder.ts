import type { Solution, Architecture, BusinessIntelligenceReport } from '../types/index.js';

/**
 * Phase 8: Builder integrates with the existing build.same engine.
 * 
 * This doesn't generate code directly — it produces a structured build manifest
 * that the DeterministicOrchestratorV4 can consume. The actual code generation
 * happens through the existing LLM Gateway + AST patch pipeline.
 */
export interface BuildManifest {
  workspace_name: string;
  pages: Array<{
    route: string;
    name: string;
    description: string;
    components: string[];
    data_requirements: string[];
    is_interactive: boolean;
  }>;
  components: Array<{
    name: string;
    description: string;
    props: Record<string, string>;
    is_interactive: boolean;
  }>;
  data_models: Array<{
    name: string;
    fields: Record<string, string>;
    relationships: string[];
  }>;
  api_routes: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  layout: {
    navigation: Array<{ label: string; href: string }>;
    footer_links: Array<{ label: string; href: string }>;
    theme: 'light' | 'dark';
    color_palette: Record<string, string>;
  };
}

export class Builder {
  generateManifest(
    solution: Solution,
    architecture: Architecture,
    report: BusinessIntelligenceReport
  ): BuildManifest {
    console.log('[phase-8] Generating build manifest...');

    const pages = this.generatePages(solution, architecture);
    const components = this.generateComponents(solution, architecture);
    const dataModels = this.generateDataModels(architecture);
    const apiRoutes = this.generateAPIRoutes(architecture);

    const manifest: BuildManifest = {
      workspace_name: this.slugify(report.business_domain),
      pages,
      components,
      data_models: dataModels,
      api_routes: apiRoutes,
      layout: {
        navigation: pages.map(p => ({ label: p.name, href: p.route })),
        footer_links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Contact', href: '/contact' }
        ],
        theme: 'dark',
        color_palette: this.inferColors(report)
      }
    };

    console.log(`[phase-8] ${pages.length} pages, ${components.length} components, ${dataModels.length} models, ${apiRoutes.length} APIs`);
    return manifest;
  }

  private generatePages(solution: Solution, architecture: Architecture): BuildManifest['pages'] {
    const pages: BuildManifest['pages'] = [];

    // Always include core pages
    pages.push({
      route: '/',
      name: 'Home',
      description: 'Landing page with hero, value proposition, and CTA',
      components: ['Hero', 'ValueProposition', 'Testimonials', 'CTA'],
      data_requirements: [],
      is_interactive: false
    });

    pages.push({
      route: '/about',
      name: 'About',
      description: 'About the business, team, and mission',
      components: ['TeamSection', 'MissionStatement', 'Timeline'],
      data_requirements: [],
      is_interactive: false
    });

    pages.push({
      route: '/contact',
      name: 'Contact',
      description: 'Contact form and information',
      components: ['ContactForm', 'ContactInfo'],
      data_requirements: ['ContactSubmission'],
      is_interactive: true
    });

    // Generate pages from solution components
    for (const component of solution.components) {
      switch (component.type) {
        case 'saas':
        case 'crm':
        case 'erp':
        case 'internal_tool':
          pages.push({
            route: '/dashboard',
            name: 'Dashboard',
            description: `${component.name} dashboard with key metrics`,
            components: ['StatsCards', 'Charts', 'RecentActivity'],
            data_requirements: ['User', 'Analytics'],
            is_interactive: true
          });
          break;
        case 'marketplace':
          pages.push({
            route: '/marketplace',
            name: 'Marketplace',
            description: 'Browse and discover products/services',
            components: ['SearchBar', 'FilterPanel', 'ProductGrid', 'Pagination'],
            data_requirements: ['Product', 'Category'],
            is_interactive: true
          });
          break;
        case 'customer_portal':
          pages.push({
            route: '/portal',
            name: 'Customer Portal',
            description: 'Customer self-service portal',
            components: ['AccountInfo', 'OrderHistory', 'SupportTickets'],
            data_requirements: ['User', 'Order', 'Ticket'],
            is_interactive: true
          });
          break;
        case 'website':
          for (const feature of component.features) {
            pages.push({
              route: `/${this.slugify(feature)}`,
              name: feature,
              description: feature,
              components: [this.pascalCase(feature)],
              data_requirements: [],
              is_interactive: false
            });
          }
          break;
      }
    }

    // Ensure unique routes
    const seen = new Set<string>();
    return pages.filter(p => {
      if (seen.has(p.route)) return false;
      seen.add(p.route);
      return true;
    });
  }

  private generateComponents(solution: Solution, architecture: Architecture): BuildManifest['components'] {
    const components: BuildManifest['components'] = [];
    const seen = new Set<string>();

    for (const page of this.generatePages(solution, architecture)) {
      for (const compName of page.components) {
        if (seen.has(compName)) continue;
        seen.add(compName);
        components.push({
          name: compName,
          description: `${compName} component for ${page.name}`,
          props: {},
          is_interactive: page.is_interactive
        });
      }
    }

    return components;
  }

  private generateDataModels(architecture: Architecture): BuildManifest['data_models'] {
    return architecture.system.database.map(table => ({
      name: table,
      fields: { id: 'String', created_at: 'DateTime', updated_at: 'DateTime' },
      relationships: []
    }));
  }

  private generateAPIRoutes(architecture: Architecture): BuildManifest['api_routes'] {
    const routes: BuildManifest['api_routes'] = [];
    for (const api of architecture.system.apis) {
      const parts = api.split(' ');
      const method = (parts.length > 1 ? parts[0] : 'GET')?.toUpperCase() ?? 'GET';
      const path = parts.length > 1 ? parts[1]! : api;
      routes.push({ method, path, description: `API endpoint for ${path}` });
    }
    return routes;
  }

  private inferColors(report: BusinessIntelligenceReport): Record<string, string> {
    const domainColors: Record<string, Record<string, string>> = {
      'healthcare': { primary: '#0EA5E9', secondary: '#10B981', accent: '#F59E0B' },
      'finance': { primary: '#6366F1', secondary: '#8B5CF6', accent: '#EC4899' },
      'ecommerce': { primary: '#F97316', secondary: '#EF4444', accent: '#10B981' },
      'saas': { primary: '#3B82F6', secondary: '#6366F1', accent: '#06B6D4' },
      'education': { primary: '#10B981', secondary: '#14B8A6', accent: '#F59E0B' },
      'real_estate': { primary: '#1E40AF', secondary: '#7C3AED', accent: '#F59E0B' },
    };
    const key = report.business_domain.toLowerCase();
    return domainColors[key] || { primary: '#3B82F6', secondary: '#6366F1', accent: '#EC4899' };
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private pascalCase(text: string): string {
    return text.split(/[\s-_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }
}
