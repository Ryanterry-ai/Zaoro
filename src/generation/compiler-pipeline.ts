import { FullStackBlueprint, WorkspaceConfig } from '../types/index.js';
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
  }

  private static compilePrismaSchema(rootPath: string, blueprint: FullStackBlueprint): void {
    const prismaDir = path.join(rootPath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });

    let schemaContent = `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}\n\ngenerator client {\n  provider = "prisma-client-js"\n}\n\n`;

    for (const model of blueprint.dataModels) {
      schemaContent += `model ${model.name} {\n`;
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
import { prisma } from '@/lib/db.js';

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
}
