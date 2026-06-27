/**
 * =============================================================================
 * Build.same V3
 * Manifest Planning Layer - Build Manifest Builder
 * =============================================================================
 * Constructs the Build Manifest from Application Blueprint.
 * The manifest is consumed by the LLM Gateway for code generation.
 */

import type { ApplicationBlueprint } from '../application/application-types.js';
import type {
  BuildManifest,
  ManifestFile,
  ManifestStats,
} from './manifest-types.js';

/* -------------------------------------------------------------------------- */
/*                           MANIFEST BUILDER                                 */
/* -------------------------------------------------------------------------- */

export interface BuildManifestBuilderConfig {
  readonly applicationBlueprint: ApplicationBlueprint;
  readonly workspaceDir: string;
}

/**
 * BuildManifestBuilder constructs the Build Manifest
 * from the Application Blueprint.
 */
export class BuildManifestBuilder {
  private config: BuildManifestBuilderConfig;
  private files: ManifestFile[] = [];

  constructor(config: BuildManifestBuilderConfig) {
    this.config = config;
  }

  /**
   * Build the final immutable Build Manifest.
   */
  build(): BuildManifest {
    const now = new Date().toISOString();
    const blueprint = this.config.applicationBlueprint;

    const stats: ManifestStats = {
      totalPages: blueprint.pages.length,
      totalComponents: blueprint.components.length,
      totalRoutes: blueprint.routes.length,
      totalServices: blueprint.services.length,
    };

    return {
      id: `manifest-${Date.now()}`,
      applicationBlueprintId: blueprint.metadata.id,
      businessBlueprintId: blueprint.metadata.businessBlueprintId,
      workspaceDir: this.config.workspaceDir,
      createdAt: now,
      updatedAt: now,
      files: this.files,
      stats,
    };
  }

  /**
   * Add file to the manifest.
   */
  addFile(file: ManifestFile): this {
    this.files.push(file);
    return this;
  }

  /**
   * Add multiple files to the manifest.
   */
  addFiles(files: ManifestFile[]): this {
    this.files.push(...files);
    return this;
  }

  /**
   * Generate all files from the Application Blueprint.
   */
  generateFromBlueprint(): this {
    const blueprint = this.config.applicationBlueprint;

    // Generate page files
    for (const page of blueprint.pages) {
      this.files.push(this.generatePageFile(page));
    }

    // Generate component files
    for (const component of blueprint.components) {
      this.files.push(this.generateComponentFile(component));
    }

    // Generate route configuration
    this.files.push(this.generateRouteConfig(blueprint));

    // Generate index file
    this.files.push(this.generateIndexFile(blueprint));

    return this;
  }

  /* ---------------------------------------------------------------------- */
  /*                           FILE GENERATORS                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Generate a page file.
   */
  private generatePageFile(page: ApplicationBlueprint['pages'][0]): ManifestFile {
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
  private generateComponentFile(component: ApplicationBlueprint['components'][0]): ManifestFile {
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
  private generateRouteConfig(blueprint: ApplicationBlueprint): ManifestFile {
    const content = `export const routes = [
${blueprint.routes.map(route => `  {
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
  private generateIndexFile(blueprint: ApplicationBlueprint): ManifestFile {
    const content = `// Auto-generated by Build.same V3
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
   * Convert string to PascalCase.
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
