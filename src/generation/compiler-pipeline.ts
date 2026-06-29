import { FullStackBlueprint, WorkspaceConfig } from '../types/index.js';
import type { ApplicationBlueprint } from '../bos/schemas/blueprint/application-blueprint.schema.js';
import * as fs from 'fs';
import * as path from 'path';

export class FullStackCompilerPipeline {
  public static compile(workspace: WorkspaceConfig, blueprint: FullStackBlueprint): void {
    const srcPath = path.join(workspace.rootPath, 'src');
    const appPath = path.join(srcPath, 'app');
    const compPath = path.join(srcPath, 'components');
    const libPath = path.join(srcPath, 'lib');

    fs.mkdirSync(appPath, { recursive: true });
    fs.mkdirSync(compPath, { recursive: true });
    fs.mkdirSync(libPath, { recursive: true });

    this.compileFrontendPages(appPath, blueprint);

    if (blueprint.dataModels.length > 0) {
      this.compilePrismaSchema(workspace.rootPath, blueprint);
      // DEFERRED: compileDatabaseClient and compileAPIRoutes generate code that imports
      // @prisma/client, which is not installed in the workspace scaffold. These will be
      // wired in Phase 2.3 after Prisma is added to the workspace dependency list.
      // this.compileDatabaseClient(libPath);
    }

    if (blueprint.stateStores.length > 0) {
      this.compileStateStores(libPath, blueprint);
    }

    // DEFERRED: compileAPIRoutes generates route handlers that import from @/lib/db.js
    // (which requires @prisma/client). Wire in Phase 2.3 alongside compileDatabaseClient.
    // if (blueprint.apiRoutes.length > 0) {
    //   this.compileAPIRoutes(appPath, blueprint);
    // }
  }

  /**
   * Compile from ApplicationBlueprint (BRE v2 rich output).
   * Produces richer pages with named sections, navigation, forms, tables.
   */
  public static compileRich(workspace: WorkspaceConfig, blueprint: ApplicationBlueprint): void {
    const srcPath = path.join(workspace.rootPath, 'src');
    const appPath = path.join(srcPath, 'app');
    const compPath = path.join(srcPath, 'components');
    const libPath = path.join(srcPath, 'lib');

    fs.mkdirSync(appPath, { recursive: true });
    fs.mkdirSync(compPath, { recursive: true });
    fs.mkdirSync(libPath, { recursive: true });

    this.compileRichNavigation(appPath, blueprint);
    this.compileRichPages(appPath, blueprint);
    this.compileRichPrismaSchema(workspace.rootPath, blueprint);
    this.compileRichStateStores(libPath, blueprint);

    if (blueprint.forms.length > 0) {
      this.compileRichForms(compPath, blueprint);
    }

    if (blueprint.tables.length > 0) {
      this.compileRichTables(compPath, blueprint);
    }
  }

  private static compilePrismaSchema(rootPath: string, blueprint: FullStackBlueprint): void {
    const prismaDir = path.join(rootPath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });

    let schemaContent = `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n`;

    for (const model of blueprint.dataModels) {
      schemaContent += `model ${model.name} {\n`;
      const hasId = model.fields.some(f => f.isId);
      if (!hasId) {
        schemaContent += `  id String @id @default(uuid())\n`;
      }
      for (const field of model.fields) {
        let fieldLine = `  ${field.name} ${field.type}`;
        if (field.isId) {
          fieldLine += ' @id @default(uuid())';
        }
        if (!field.isRequired && !field.isId) {
          fieldLine += '?';
        }
        schemaContent += fieldLine + '\n';
      }
      schemaContent += '}\n\n';
    }

    fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schemaContent.trim());
  }

  private static compileDatabaseClient(libPath: string): void {
    const clientCode = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;`;

    fs.writeFileSync(path.join(libPath, 'db.ts'), clientCode);
  }

  private static compileStateStores(libPath: string, blueprint: FullStackBlueprint): void {
    let stateCode = `import React, { createContext, useContext, useState } from 'react';\n\n`;

    for (const store of blueprint.stateStores) {
      stateCode += `export interface ${store.name}State {\n`;
      for (const prop of store.properties) {
        stateCode += `  ${prop.name}: ${prop.type};\n`;
      }
      stateCode += `}\n\n`;

      stateCode += `const ${store.name}Context = createContext<any>(null);\n\n`;

      stateCode += `export function ${store.name}Provider({ children }: { children: React.ReactNode }) {\n`;
      for (const prop of store.properties) {
        const capitalized = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
        stateCode += `  const [${prop.name}, set${capitalized}] = useState<${prop.type}>(${prop.initialValue});\n`;
      }
      stateCode += '\n';

      for (const action of store.actions) {
        stateCode += `  const ${action.name} = (${action.params}) => {\n    ${action.logic}\n  };\n\n`;
      }

      const exports = [...store.properties.map(p => p.name), ...store.actions.map(a => a.name)];
      stateCode += `  return (\n    <${store.name}Context.Provider value={{ ${exports.join(', ')} }}>\n      {children}\n    </${store.name}Context.Provider>\n  );\n}\n\n`;

      stateCode += `export function use${store.name}() {\n  return useContext(${store.name}Context);\n}\n\n`;
    }

    fs.writeFileSync(path.join(libPath, 'store.tsx'), stateCode.trim());
  }

  private static compileAPIRoutes(appPath: string, blueprint: FullStackBlueprint): void {
    for (const route of blueprint.apiRoutes) {
      const endpointParts = route.endpoint.split('/').filter(Boolean);
      const targetDir = path.join(appPath, ...endpointParts);
      fs.mkdirSync(targetDir, { recursive: true });

      const routeCode = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const data = await (prisma as any).${route.targetModel.toLowerCase()}.findMany();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await (prisma as any).${route.targetModel.toLowerCase()}.create({ data: body });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`;

      fs.writeFileSync(path.join(targetDir, 'route.ts'), routeCode);
    }
  }

  private static compileFrontendPages(appPath: string, blueprint: FullStackBlueprint): void {
    const color = blueprint.colorScheme;

    for (const page of blueprint.pages) {
      const pageDir = page.path === '/' ? appPath : path.join(appPath, page.path);
      fs.mkdirSync(pageDir, { recursive: true });

      const routeFuncMap: Record<string, string> = {
        '/': 'Home',
        '/shop': 'Shop',
        '/booking': 'Book',
        '/dashboard': 'Dashboard',
        '/courses': 'Courses',
        '/blog': 'Blog',
        '/work': 'Work',
        '/contact': 'Contact',
      };
      const funcName = routeFuncMap[page.path] || page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');

      const pageCode = `import React from 'react';

export default function ${funcName}() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-${color}-500" />
            <span className="font-black text-lg uppercase">${blueprint.appName}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400">
              Active Module: ${page.title}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        <section className="text-center space-y-6 max-w-4xl mx-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border border-${color}-500/20 bg-${color}-500/5">
            <span className="text-${color}-400">JIT Full-Stack Blueprint Synced</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Tailored Domain Solutions. <span className="text-${color}-500">Zero Regressions.</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
            Database models, state contexts, REST endpoints, and custom layouts generated instantly from semantic intent.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          ${blueprint.dataModels.map(model => `
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              Database Model: ${model.name}
            </h3>
            <ul className="text-xs space-y-2 font-mono text-zinc-400">
              ${model.fields.map(f => `<li>- ${f.name}: ${f.type}${f.isRequired ? '!' : ''}</li>`).join('\n              ')}
            </ul>
          </div>`).join('')}
        </section>
      </main>
    </div>
  );
}`;

      fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageCode);
    }
  }

  // ─── Rich Compilation (ApplicationBlueprint) ───────────────────────

  private static compileRichNavigation(appPath: string, blueprint: ApplicationBlueprint): void {
    const nav = blueprint.navigation;
    const items = nav.items.map(item =>
      `  { label: '${item.label}', href: '${item.href}' }`
    ).join(',\n');

    const navCode = `export const navItems = [
${items}
] as const;

export type NavItem = (typeof navItems)[number];`;

    fs.writeFileSync(path.join(appPath, 'nav-data.ts'), navCode);
  }

  private static compileRichPages(appPath: string, blueprint: ApplicationBlueprint): void {
    const tokens = blueprint.designTokens as Record<string, unknown>;
    const colors = (tokens?.colors ?? {}) as Record<string, string>;
    const primary = colors.primary ?? '#6366F1';
    const secondary = colors.secondary ?? '#3B82F6';
    const bg = colors.background ?? '#09090B';
    const fg = colors.foreground ?? '#FAFAFA';

    for (const page of blueprint.pages) {
      const pageDir = page.path === '/' ? appPath : path.join(appPath, page.path);
      fs.mkdirSync(pageDir, { recursive: true });

      const funcName = page.path === '/'
        ? 'Home'
        : page.path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');

      const sections = page.sections.map(section => {
        const sectionName = section.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `
        <section data-section="${section}" className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-8">${sectionName}</h2>
            {/* ${section} content */}
          </div>
        </section>`;
      }).join('\n');

      const seo = page.seo ?? {};
      const seoTitle = seo.title ?? page.name;
      const seoDesc = seo.description ?? `${page.name} — ${blueprint.name}`;

      const pageCode = `import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${seoTitle}',
  description: '${seoDesc}',
};

export default function ${funcName}() {
  return (
    <div style={{ backgroundColor: '${bg}', color: '${fg}' }} className="min-h-screen font-sans">
      <nav className="border-b border-zinc-800 sticky top-0 z-50" style={{ backgroundColor: '${bg}cc', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: '${primary}' }} />
            <span className="font-black text-lg uppercase">${blueprint.name}</span>
          </div>
          <div className="flex gap-4 text-sm text-zinc-400">
            <span>${page.name}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        <section className="text-center space-y-6 max-w-4xl mx-auto py-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: '${primary}33', backgroundColor: '${primary}0d' }}>
            <span style={{ color: '${primary}' }}>${blueprint.industry} — ${page.type}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
            ${page.name}
          </h1>
          ${page.description ? `<p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">${page.description}</p>` : ''}
        </section>
${sections}
      </main>

      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-500">
          ${blueprint.name} — Powered by build.same.engine
        </div>
      </footer>
    </div>
  );
}`;

      fs.writeFileSync(path.join(pageDir, 'page.tsx'), pageCode);
    }
  }

  private static compileRichPrismaSchema(rootPath: string, blueprint: ApplicationBlueprint): void {
    if (blueprint.entities.length === 0) return;

    const prismaDir = path.join(rootPath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });

    const dbProvider = blueprint.database.engine === 'mongodb' ? 'mongodb' : 'postgresql';
    const dbUrl = dbProvider === 'mongodb' ? 'env("DATABASE_URL")' : 'env("DATABASE_URL")';
    let schemaContent = `datasource db {\n  provider = "${dbProvider}"\n  url      = ${dbUrl}\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n`;

    for (const entity of blueprint.entities) {
      schemaContent += `model ${entity.name} {\n`;
      const hasId = entity.fields.some(f => f.name === 'id');
      if (!hasId) {
        schemaContent += `  id String @id @default(uuid())\n`;
      }
      for (const field of entity.fields) {
        const typeMap: Record<string, string> = {
          string: 'String',
          number: 'Float',
          boolean: 'Boolean',
          date: 'DateTime',
          datetime: 'DateTime',
          reference: 'String',
          rich_text: 'String',
          image: 'String',
          file: 'String',
          json: 'Json',
          enum: 'String',
        };
        const prismaType = typeMap[field.type] ?? 'String';
        let fieldLine = `  ${field.name} ${prismaType}`;
        if (field.name === 'id') {
          fieldLine += ' @id @default(uuid())';
        }
        if (!field.required && field.name !== 'id') {
          fieldLine += '?';
        }
        if (field.indexed && field.name !== 'id') {
          fieldLine += ' @index';
        }
        if (field.unique && field.name !== 'id') {
          fieldLine += ' @unique';
        }
        schemaContent += fieldLine + '\n';
      }

      for (const rel of entity.relationships) {
        if (rel.foreignKey) {
          const targetType = rel.target;
          if (rel.type === 'belongs_to') {
            schemaContent += `  ${rel.foreignKey} String\n`;
            schemaContent += `  ${rel.target.toLowerCase()} ${targetType}? @relation(fields: [${rel.foreignKey}], references: [id])\n`;
          } else if (rel.type === 'has_many') {
            schemaContent += `  ${rel.target.toLowerCase()}s ${targetType}[]\n`;
          }
        }
      }

      schemaContent += '}\n\n';
    }

    fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schemaContent.trim());
  }

  private static compileRichStateStores(libPath: string, blueprint: ApplicationBlueprint): void {
    if (blueprint.workflows.length === 0 && blueprint.entities.length === 0) return;

    let stateCode = `'use client';\n\nimport React, { createContext, useContext, useState, useCallback } from 'react';\n\n`;

    const entities = blueprint.entities.length > 0 ? blueprint.entities : [];
    for (const entity of entities.slice(0, 5)) {
      const name = entity.name;
      stateCode += `export interface ${name} {\n`;
      for (const field of entity.fields) {
        const tsType = field.type === 'number' ? 'number' : field.type === 'boolean' ? 'boolean' : field.type === 'date' ? 'string' : 'string';
        stateCode += `  ${field.name}${field.required ? '' : '?'}: ${tsType};\n`;
      }
      stateCode += `}\n\n`;
    }

    if (blueprint.workflows.length > 0) {
      for (const workflow of blueprint.workflows) {
        const safeName = workflow.name.replace(/[^a-zA-Z0-9]/g, '');
        stateCode += `const ${safeName}Context = createContext<any>(null);\n\n`;
        stateCode += `export function ${safeName}Provider({ children }: { children: React.ReactNode }) {\n`;
        stateCode += `  const [loading, setLoading] = useState(false);\n`;
        stateCode += `  const [error, setError] = useState<string | null>(null);\n\n`;
        for (const step of workflow.steps) {
          const stepName = step.name.replace(/[^a-zA-Z0-9]/g, '');
          stateCode += `  const ${stepName} = useCallback(async () => {\n    setLoading(true);\n    try {\n      // ${step.action}\n    } catch (e: any) {\n      setError(e.message);\n    } finally {\n      setLoading(false);\n    }\n  }, []);\n\n`;
        }
        const stepExports = workflow.steps.map(s => s.name.replace(/[^a-zA-Z0-9]/g, '')).join(', ');
        stateCode += `  return (\n    <${safeName}Context.Provider value={{ loading, error, ${stepExports} }}>\n      {children}\n    </${safeName}Context.Provider>\n  );\n}\n\n`;
        stateCode += `export function use${safeName}() {\n  return useContext(${safeName}Context);\n}\n\n`;
      }
    } else if (entities.length > 0) {
      const firstEntity = entities[0]!;
      const safeName = firstEntity.name;
      stateCode += `const ${safeName}Context = createContext<any>(null);\n\n`;
      stateCode += `export function ${safeName}Provider({ children }: { children: React.ReactNode }) {\n`;
      stateCode += `  const [selected, setSelected] = useState<${safeName} | null>(null);\n`;
      stateCode += `  const [list, setList] = useState<${safeName}[]>([]);\n`;
      stateCode += `  const [loading, setLoading] = useState(false);\n\n`;
      stateCode += `  const fetchList = useCallback(async () => {\n    setLoading(true);\n    try {\n      const res = await fetch('/api/${firstEntity.slug}');\n      const data = await res.json();\n      setList(data);\n    } catch (e: any) {\n      console.error(e);\n    } finally {\n      setLoading(false);\n    }\n  }, []);\n\n`;
      stateCode += `  return (\n    <${safeName}Context.Provider value={{ selected, setSelected, list, loading, fetchList }}>\n      {children}\n    </${safeName}Context.Provider>\n  );\n}\n\n`;
      stateCode += `export function use${safeName}() {\n  return useContext(${safeName}Context);\n}\n\n`;
    }

    fs.writeFileSync(path.join(libPath, 'store.tsx'), stateCode.trim());
  }

  private static compileRichForms(compPath: string, blueprint: ApplicationBlueprint): void {
    for (const form of blueprint.forms) {
      const componentName = `${form.entity}Form`;
      let fieldsCode = '';
      for (const field of form.fields) {
        if (field.name === 'id' || field.name === 'createdAt' || field.name === 'updatedAt') continue;
        const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
        fieldsCode += `          <div key="${field.name}" className="space-y-1">
            <label className="text-sm font-medium text-zinc-300">${field.name}</label>
            <input
              type="${inputType}"
              name="${field.name}"
              ${field.required ? 'required' : ''}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>\n`;
      }

      const formCode = `'use client';

import React, { useState } from 'react';

export function ${componentName}({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const data = Object.fromEntries(form.entries());
      await fetch('${form.submitAction}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onSuccess?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <h3 className="text-lg font-bold">${form.entity} Form</h3>
${fieldsCode}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`;

      fs.writeFileSync(path.join(compPath, `${componentName}.tsx`), formCode);
    }
  }

  private static compileRichTables(compPath: string, blueprint: ApplicationBlueprint): void {
    for (const table of blueprint.tables) {
      const componentName = `${table.entity}Table`;
      const columns = table.columns.map(col =>
        `    { key: '${col.field}', label: '${col.header}' }`
      ).join(',\n');

      const tableCode = `'use client';

import React, { useEffect, useState } from 'react';

const columns = [
${columns}
] as const;

export function ${componentName}() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/${table.entity.toLowerCase()}')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-zinc-400">Loading...</div>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-zinc-300">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-zinc-100">{String(row[col.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;

      fs.writeFileSync(path.join(compPath, `${componentName}.tsx`), tableCode);
    }
  }
}
