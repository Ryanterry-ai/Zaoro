/**
 * Renderer Engine
 *
 * A DETERMINISTIC EXECUTION ENGINE that consumes ExecutionBlueprint
 * and produces generated code files. It does NOT think, decide, or infer.
 *
 * CONSTRAINTS:
 * - MUST NOT decide business logic
 * - MUST NOT decide experience flow
 * - MUST NOT decide content strategy
 * - MUST NOT decide visual system
 * - MUST NOT decide technology stack
 * - MUST render blueprints deterministically
 */

import type { ExecutionBlueprint } from '../execution-blueprint/types.js';
import type {
  RendererOutput,
  GeneratedFile,
  BuildResult,
  QualityGateResult,
  RendererConfiguration,
  IRendererEngineLayer,
} from './types.js';

export class RendererEngine implements IRendererEngineLayer {
  readonly id = 'renderer' as const;
  readonly name = 'Renderer Engine';
  readonly version = '1.0.0';

  async process(
    execBlueprint: ExecutionBlueprint,
    config: RendererConfiguration,
  ): Promise<RendererOutput> {
    const files: GeneratedFile[] = [];
    const rendererConfig = execBlueprint.renderer?.value;
    const buildConfig = execBlueprint.buildConfig?.value;
    const fileRules = execBlueprint.fileGenerationRules?.value || [];
    const componentRules = execBlueprint.componentGenerationRules?.value || [];
    const contentRules = execBlueprint.contentGenerationRules?.value || [];

    // Generate config files deterministically from buildConfig
    if (buildConfig) {
      files.push(this.generatePackageJson(buildConfig, rendererConfig));
      files.push(this.generateTsConfig());
      files.push(this.generateNextConfig(rendererConfig));
      files.push(this.generatePostcssConfig());
      files.push(this.generateTailwindConfig());
    }

    // Generate component files from componentGenerationRules
    for (const rule of componentRules) {
      files.push(this.generateComponent(rule.name, rule.type, rule.strategy));
    }

    // Generate page files from fileGenerationRules
    for (const rule of fileRules) {
      if (rule.strategy === 'page') {
        files.push(this.generatePage(rule.name, rule.pattern));
      }
    }

    // Generate globals.css
    files.push(this.generateGlobalsCss());

    // Run build if configured
    let buildResult: BuildResult = { success: true, command: '', output: '', errors: [], warnings: [], duration: 0 };
    if (config.runBuild && buildConfig) {
      buildResult = await this.runBuild(buildConfig.buildCommand);
    }

    // Run quality gates
    const qualityResults: QualityGateResult[] = [];
    const gates = execBlueprint.qualityGates?.value || [];
    for (const gate of gates) {
      if (
        (config.runLint && gate.type === 'lint') ||
        (config.runTypecheck && gate.type === 'typecheck') ||
        (config.runBuild && gate.type === 'build')
      ) {
        qualityResults.push(await this.runQualityGate(gate.name, gate.command, gate.timeout));
      }
    }

    return {
      id: `render-${Date.now()}`,
      createdAt: new Date(),
      executionBlueprintId: execBlueprint.id || '',
      files,
      buildResult,
      qualityGateResults: qualityResults,
    };
  }

  validate(output: RendererOutput): { valid: boolean; issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; field?: string }> } {
    const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; field?: string }> = [];

    if (!output.files?.length) {
      issues.push({ severity: 'error', message: 'No files generated', field: 'files' });
    }
    if (!output.buildResult?.success) {
      issues.push({ severity: 'error', message: `Build failed: ${output.buildResult?.errors?.join(', ')}`, field: 'buildResult' });
    }

    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues };
  }

  // ─── Deterministic File Generators ──────────────────────────────────────

  private generatePackageJson(build: any, renderer: any): GeneratedFile {
    const deps: Record<string, string> = {
      next: '^14.1.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    };
    return {
      path: 'package.json',
      content: JSON.stringify({
        name: 'generated-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: build?.devCommand || 'next dev',
          build: build?.buildCommand || 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: deps,
        devDependencies: {
          '@types/node': '^20',
          '@types/react': '^18',
          '@types/react-dom': '^18',
          typescript: '^5',
        },
      }, null, 2),
      type: 'config',
      purpose: 'Package configuration',
      created: true,
      modified: false,
    };
  }

  private generateTsConfig(): GeneratedFile {
    return {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'es5',
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
          increment: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./src/*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules', 'prisma'],
      }, null, 2),
      type: 'config',
      purpose: 'TypeScript configuration',
      created: true,
      modified: false,
    };
  }

  private generateNextConfig(renderer: any): GeneratedFile {
    return {
      path: 'next.config.mjs',
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`,
      type: 'config',
      purpose: 'Next.js configuration',
      created: true,
      modified: false,
    };
  }

  private generatePostcssConfig(): GeneratedFile {
    return {
      path: 'postcss.config.mjs',
      content: `const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
`,
      type: 'config',
      purpose: 'PostCSS configuration',
      created: true,
      modified: false,
    };
  }

  private generateTailwindConfig(): GeneratedFile {
    return {
      path: 'tailwind.config.ts',
      content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
`,
      type: 'config',
      purpose: 'Tailwind CSS configuration',
      created: true,
      modified: false,
    };
  }

  private generateComponent(name: string, type: string, strategy: string): GeneratedFile {
    return {
      path: `src/components/${name}.tsx`,
      content: `import React from 'react';

export default function ${name}() {
  return (
    <section>
      <h2>${name}</h2>
    </section>
  );
}
`,
      type: 'component',
      purpose: `${name} ${type} component`,
      created: true,
      modified: false,
    };
  }

  private generatePage(name: string, pattern: string): GeneratedFile {
    const route = name === 'home' ? '' : name;
    return {
      path: `src/app/${route}/page.tsx`,
      content: `export default function ${name.charAt(0).toUpperCase() + name.slice(1)}Page() {
  return (
    <div>
      <h1>${name}</h1>
    </div>
  );
}
`,
      type: 'page',
      purpose: `${name} page`,
      created: true,
      modified: false,
    };
  }

  private generateGlobalsCss(): GeneratedFile {
    return {
      path: 'src/app/globals.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
`,
      type: 'style',
      purpose: 'Global styles',
      created: true,
      modified: false,
    };
  }

  // ─── Build Execution ───────────────────────────────────────────────────

  private async runBuild(command: string): Promise<BuildResult> {
    const start = Date.now();
    try {
      const { execSync } = await import('child_process');
      const output = execSync(command, { encoding: 'utf-8', timeout: 120000 });
      return { success: true, command, output, errors: [], warnings: [], duration: Date.now() - start };
    } catch (err: any) {
      return { success: false, command, output: err.stdout || '', errors: [err.message], warnings: [], duration: Date.now() - start };
    }
  }

  private async runQualityGate(name: string, command: string, timeout: number): Promise<QualityGateResult> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync(command, { encoding: 'utf-8', timeout });
      return { name, type: 'lint', passed: true, output, errors: [], warnings: [] };
    } catch (err: any) {
      return { name, type: 'lint', passed: false, output: err.stdout || '', errors: [err.message], warnings: [] };
    }
  }
}
