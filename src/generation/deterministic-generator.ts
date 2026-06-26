import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import type { ApplicationBlueprint, PagePlan, EntityPlan, IntegrationPlan, LayoutPlan, RoutePlan, NavPlan, PermissionPlan, WidgetPlan, TokenSet } from '../bos/schemas/blueprint/application-blueprint.schema.js';

export interface GenerationOptions {
  framework: 'nextjs' | 'remix' | 'solid' | 'vanilla';
  styling: 'tailwind' | 'css-modules' | 'styled-components';
  typescript: boolean;
  outputDir: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'page' | 'component' | 'api' | 'config' | 'layout' | 'style' | 'type';
}

export class DeterministicCodeGenerator {
  generate(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push(...this.generateConfig(blueprint, options));
    files.push(...this.generateTypes(blueprint, options));
    files.push(...this.generateLayouts(blueprint, options));
    files.push(...this.generatePages(blueprint, options));
    files.push(...this.generateComponents(blueprint, options));
    files.push(...this.generateAPIs(blueprint, options));
    files.push(...this.generateStyles(blueprint, options));

    return files;
  }

  writeFiles(files: GeneratedFile[], outputDir: string): void {
    for (const file of files) {
      const filePath = join(outputDir, file.path);
      const dir = join(outputDir, file.path.split('/').slice(0, -1).join('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, file.content);
    }
  }

  private generateConfig(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (options.framework === 'nextjs') {
      files.push({
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
};

module.exports = nextConfig;
`,
        type: 'config',
      });

      files.push({
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: ${JSON.stringify(this.extractThemeExtensions(blueprint), null, 2)},
  },
  plugins: [],
};
`,
        type: 'config',
      });
    }

    files.push({
      path: 'package.json',
      content: JSON.stringify({
        name: blueprint.name.toLowerCase().replace(/\s+/g, '-'),
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.0',
          typescript: '^5.0.0',
          tailwindcss: '^3.0.0',
          autoprefixer: '^10.0.0',
          postcss: '^8.0.0',
        },
      }, null, 2),
      type: 'config',
    });

    return files;
  }

  private generateTypes(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const ext = options.typescript ? 'ts' : 'js';

    const typeContent = blueprint.entities.map((entity: EntityPlan) => {
      const fields = entity.fields.map((f: EntityPlan['fields'][number]) => {
        const tsType = this.mapFieldTypeToTS(f.type);
        return `  ${f.name}: ${tsType}${f.required ? '' : ' | null'};`;
      }).join('\n');

      return `export interface ${entity.name} {\n  id: string;\n${fields}\n  createdAt: string;\n  updatedAt: string;\n}`;
    }).join('\n\n');

    files.push({
      path: `src/types/entities.${ext}`,
      content: typeContent,
      type: 'type',
    });

    return files;
  }

  private generateLayouts(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const ext = options.typescript ? 'tsx' : 'jsx';

    for (const layout of blueprint.layouts) {
      const areas = layout.areas.map((a: string) => `      {/* ${a} area */}`).join('\n');

      files.push({
        path: `src/app/${layout.name.toLowerCase().replace(/\s+/g, '-')}/layout.${ext}`,
        content: `export default function ${layout.name.replace(/\s+/g, '')}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header>{/* Header */}</header>
      <main>
${areas}
        {children}
      </main>
      <footer>{/* Footer */}</footer>
    </div>
  );
}
`,
        type: 'layout',
      });
    }

    return files;
  }

  private generatePages(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const ext = options.typescript ? 'tsx' : 'jsx';

    for (const page of blueprint.pages) {
      const sections = page.sections.map((s: string) => {
        const componentName = this.toPascalCase(s);
        return `      <${componentName} />`;
      }).join('\n');

      const imports = page.sections.map((s: string) => {
        const componentName = this.toPascalCase(s);
        return `import { ${componentName} } from '@/components/${componentName}';`;
      }).join('\n');

      files.push({
        path: `src/app${page.path === '/' ? '/page' : `${page.path}/page`}.${ext}`,
        content: `${imports}

export default function ${this.toPascalCase(page.name)}Page() {
  return (
    <div className="min-h-screen">
${sections}
    </div>
  );
}
`,
        type: 'page',
      });
    }

    return files;
  }

  private generateComponents(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const ext = options.typescript ? 'tsx' : 'jsx';
    const allSections = new Set<string>();

    for (const page of blueprint.pages) {
      for (const section of page.sections) {
        allSections.add(section);
      }
    }

    for (const section of allSections) {
      const componentName = this.toPascalCase(section);
      files.push({
        path: `src/components/${componentName}.${ext}`,
        content: `export function ${componentName}() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h2>
        {/* ${componentName} content */}
      </div>
    </section>
  );
}
`,
        type: 'component',
      });
    }

    return files;
  }

  private generateAPIs(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const ext = options.typescript ? 'ts' : 'js';

    for (const entity of blueprint.entities) {
      const routePath = entity.slug;

      files.push({
        path: `src/app/api/${routePath}/route.${ext}`,
        content: `import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Implement ${entity.name} list
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: Implement ${entity.name} create
  return NextResponse.json(body, { status: 201 });
}
`,
        type: 'api',
      });

      files.push({
        path: `src/app/api/${routePath}/[id]/route.${ext}`,
        content: `import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // TODO: Implement ${entity.name} get by id
  return NextResponse.json({ id: params.id });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  // TODO: Implement ${entity.name} update
  return NextResponse.json({ id: params.id, ...body });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // TODO: Implement ${entity.name} delete
  return NextResponse.json({ deleted: true });
}
`,
        type: 'api',
      });
    }

    return files;
  }

  private generateStyles(blueprint: ApplicationBlueprint, options: GenerationOptions): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (options.styling === 'tailwind') {
      files.push({
        path: 'src/app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: ${blueprint.designTokens?.colors?.foreground ?? '#FAFAFA'};
  --background: ${blueprint.designTokens?.colors?.background ?? '#09090B'};
  --primary: ${blueprint.designTokens?.colors?.primary ?? '#7C3AED'};
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: ${blueprint.designTokens?.typography?.body ?? 'Inter'}, sans-serif;
}
`,
        type: 'style',
      });
    }

    return files;
  }

  private extractThemeExtensions(blueprint: ApplicationBlueprint): Record<string, unknown> {
    const tokens = blueprint.designTokens as Record<string, unknown>;
    return {
      colors: tokens?.colors ?? {},
      fontFamily: tokens?.typography ?? {},
    };
  }

  private mapFieldTypeToTS(type: string): string {
    const map: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'string',
      enum: 'string',
      reference: 'string',
      rich_text: 'string',
      image: 'string',
      file: 'string',
      json: 'Record<string, unknown>',
    };
    return map[type] ?? 'unknown';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase())
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
  }
}
