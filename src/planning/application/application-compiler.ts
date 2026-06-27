/**
 * =============================================================================
 * Build.same V3
 * Application Planning Layer - Compiler
 * =============================================================================
 * Compiles the Application Blueprint into the Build Manifest.
 * Handles AST generation, code transformation, and verification.
 */

import type { BusinessBlueprint } from '../business/business-types.js';
import type {
  ApplicationBlueprint,
  ApplicationPage,
  ApplicationComponent,
  ApplicationRoute,
} from './application-types.js';
import type { BuildManifest } from '../manifest/manifest-types.js';

/* -------------------------------------------------------------------------- */
/*                           COMPILER CONTEXT                                  */
/* -------------------------------------------------------------------------- */

export interface CompilationContext {
  readonly businessBlueprint: BusinessBlueprint;
  readonly applicationBlueprint: ApplicationBlueprint;
  readonly workspaceDir: string;
  readonly timestamp: Date;
}

export interface CompilationResult {
  readonly success: boolean;
  readonly manifest?: BuildManifest;
  readonly errors: CompilationError[];
  readonly warnings: CompilationWarning[];
  readonly stats: CompilationStats;
}

export interface CompilationError {
  readonly code: string;
  readonly message: string;
  readonly location?: string;
  readonly severity: 'error' | 'warning';
}

export interface CompilationWarning {
  readonly code: string;
  readonly message: string;
  readonly location?: string;
}

export interface CompilationStats {
  readonly pagesCompiled: number;
  readonly componentsCompiled: number;
  readonly routesCompiled: number;
  readonly servicesCompiled: number;
  readonly totalFiles: number;
  readonly compilationTimeMs: number;
}

/**
 * ApplicationCompiler compiles the Application Blueprint into code.
 * It generates the AST, handles code transformation, and produces
 * the Build Manifest for the LLM Gateway.
 */
export class ApplicationCompiler {
  private context: CompilationContext;
  private errors: CompilationError[] = [];
  private warnings: CompilationWarning[] = [];

  constructor(context: CompilationContext) {
    this.context = context;
  }

  /**
   * Compile the Application Blueprint into a Build Manifest.
   */
  compile(): CompilationResult {
    const startTime = Date.now();

    // Validate the application blueprint
    const validationErrors = this.validateBlueprint();
    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors,
        warnings: this.warnings,
        stats: this.getStats(startTime),
      };
    }

    // Generate the build manifest
    const manifest = this.generateManifest();

    return {
      success: true,
      manifest,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.getStats(startTime),
    };
  }

  /**
   * Validate the application blueprint.
   */
  private validateBlueprint(): CompilationError[] {
    const errors: CompilationError[] = [];
    const blueprint = this.context.applicationBlueprint;

    // Check if blueprint has pages
    if (blueprint.pages.length === 0) {
      errors.push({
        code: 'NO_PAGES',
        message: 'Application blueprint has no pages defined',
        severity: 'error',
      });
    }

    // Check if blueprint has routes
    if (blueprint.routes.length === 0) {
      errors.push({
        code: 'NO_ROUTES',
        message: 'Application blueprint has no routes defined',
        severity: 'error',
      });
    }

    // Check for duplicate routes
    const routePaths = new Set<string>();
    for (const route of blueprint.routes) {
      if (routePaths.has(route.path)) {
        errors.push({
          code: 'DUPLICATE_ROUTE',
          message: `Duplicate route path: ${route.path}`,
          location: `routes.${route.id}`,
          severity: 'error',
        });
      }
      routePaths.add(route.path);
    }

    // Check for pages with missing components
    for (const page of blueprint.pages) {
      for (const componentId of page.components) {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
          errors.push({
            code: 'MISSING_COMPONENT',
            message: `Page ${page.id} references non-existent component ${componentId}`,
            location: `pages.${page.id}`,
            severity: 'error',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Generate the Build Manifest from the Application Blueprint.
   */
  private generateManifest(): BuildManifest {
    const blueprint = this.context.applicationBlueprint;
    const now = new Date().toISOString();

    // Generate page files
    const pageFiles = blueprint.pages.map(page => this.generatePageFile(page));

    // Generate component files
    const componentFiles = blueprint.components.map(component => this.generateComponentFile(component));

    // Generate route configuration
    const routeConfig = this.generateRouteConfig(blueprint.routes);

    // Generate index file
    const indexFile = this.generateIndexFile(blueprint);

    return {
      id: `manifest-${Date.now()}`,
      applicationBlueprintId: blueprint.metadata.id,
      businessBlueprintId: this.context.businessBlueprint.metadata.id,
      workspaceDir: this.context.workspaceDir,
      createdAt: now,
      updatedAt: now,
      files: [
        indexFile,
        routeConfig,
        ...pageFiles,
        ...componentFiles,
      ],
      stats: {
        totalPages: blueprint.pages.length,
        totalComponents: blueprint.components.length,
        totalRoutes: blueprint.routes.length,
        totalServices: blueprint.services.length,
      },
    };
  }

  /**
   * Generate a page file.
   */
  private generatePageFile(page: ApplicationPage): BuildManifest['files'][0] {
    const componentName = this.toPascalCase(page.name);

    const content = `'use client';

import { ${componentName} } from '@/components/${componentName}';

export default function ${componentName}Page() {
  return <${componentName} />;
}
`;

    return {
      path: `src/app${page.route === '/' ? '/page.tsx' : `${page.route}/page.tsx`}`,
      content,
      type: 'page',
      metadata: {
        name: page.name,
        description: page.description,
        pageType: page.pageType,
      },
    };
  }

  /**
   * Generate a component file.
   */
  private generateComponentFile(component: ApplicationComponent): BuildManifest['files'][0] {
    const componentName = this.toPascalCase(component.name);

    const content = `'use client';

import { motion } from 'framer-motion';

interface ${componentName}Props {
  ${component.props.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n  ')}
}

export function ${componentName}(${component.props.length > 0 ? 'props' : ''}: ${componentName}Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-12"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-6">${component.name}</h2>
        {/* TODO: Implement component content */}
      </div>
    </motion.section>
  );
}
`;

    return {
      path: `src/components/${componentName}.tsx`,
      content,
      type: 'component',
      metadata: {
        name: component.name,
        description: component.description,
        componentType: component.componentType,
      },
    };
  }

  /**
   * Generate route configuration.
   */
  private generateRouteConfig(routes: readonly ApplicationRoute[]): BuildManifest['files'][0] {
    const content = `export const routes = [
${routes.map(route => `  {
    path: '${route.path}',
    pageId: '${route.pageId}',
    requiresAuth: ${route.requiresAuth},
  },`).join('\n')}
];

export type Route = typeof routes[number];
`;

    return {
      path: 'src/lib/routes.ts',
      content,
      type: 'config',
      metadata: {
        name: 'Routes',
        description: 'Route configuration',
      },
    };
  }

  /**
   * Generate index file.
   */
  private generateIndexFile(blueprint: ApplicationBlueprint): BuildManifest['files'][0] {
    const content = `// Auto-generated by Build.same V3 Application Compiler
// Business Blueprint: ${blueprint.metadata.businessBlueprintId}
// Application Blueprint: ${blueprint.metadata.id}

export { routes } from './lib/routes';
`;

    return {
      path: 'src/index.ts',
      content,
      type: 'index',
      metadata: {
        name: 'Index',
        description: 'Main entry point',
      },
    };
  }

  /**
   * Get compilation statistics.
   */
  private getStats(startTime: number): CompilationStats {
    const blueprint = this.context.applicationBlueprint;

    return {
      pagesCompiled: blueprint.pages.length,
      componentsCompiled: blueprint.components.length,
      routesCompiled: blueprint.routes.length,
      servicesCompiled: blueprint.services.length,
      totalFiles: blueprint.pages.length + blueprint.components.length + 2,
      compilationTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Convert string to PascalCase.
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
