/**
 * Stage 3: Component Fusion
 * Connects UI components to business logic via API routes, server actions, and state.
 * The frontend becomes a consumer of generated logic.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SchemaModel } from './schema-generator.js';
import type { ServiceClass, ServerAction, StateSlice } from './business-logic-generator.js';

export interface UIPage {
  route: string;
  name: string;
  type: string;
  content: string;
}

export interface APIRoute {
  path: string;
  method: string;
  content: string;
}

export interface FusionOutput {
  pages: UIPage[];
  apiRoutes: APIRoute[];
  generatedFiles: string[];
}

export class ComponentFusion {
  /**
   * Generate UI components connected to business logic.
   */
  generate(
    appName: string,
    models: SchemaModel[],
    services: ServiceClass[],
    serverActions: ServerAction[],
    stateSlices: StateSlice[],
    pages: Array<{ route: string; name: string; type: string }>,
    workspacePath: string,
  ): FusionOutput {
    console.log('[fusion] Stage 3: Fusing components to business logic...');

    const uiPages = this.generatePages(appName, models, stateSlices, pages);
    const apiRoutes = this.generateAPIRoutes(models, services);

    const generatedFiles: string[] = [];

    // Write UI pages
    for (const page of uiPages) {
      const dir = path.join(workspacePath, 'src', 'app', ...page.route.split('/').filter(Boolean));
      fs.mkdirSync(dir, { recursive: true });
      const fileName = page.route === '/' ? 'page.tsx' : 'page.tsx';
      fs.writeFileSync(path.join(dir, fileName), page.content, 'utf-8');
      generatedFiles.push(`src/app/${page.route}/${fileName}`);
    }

    // Write API routes
    for (const route of apiRoutes) {
      const dir = path.join(workspacePath, 'src', 'app', 'api', ...route.path.split('/').filter(Boolean));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'route.ts'), route.content, 'utf-8');
      generatedFiles.push(`src/app/api/${route.path}/route.ts`);
    }

    console.log(`[fusion] Generated ${uiPages.length} pages, ${apiRoutes.length} API routes`);
    console.log(`[fusion] Files: ${generatedFiles.join(', ')}`);

    return { pages: uiPages, apiRoutes, generatedFiles };
  }

  private generatePages(
    appName: string,
    models: SchemaModel[],
    stateSlices: StateSlice[],
    pages: Array<{ route: string; name: string; type: string }>,
  ): UIPage[] {
    const result: UIPage[] = [];

    for (const page of pages) {
      let content: string;

      // Use landing page for home route
      if (page.route === '/') {
        content = this.generateLandingPage(appName, pages);
      } else {
        content = this.generatePageContent(appName, page, models, stateSlices);
      }

      result.push({ ...page, content });
    }

    return result;
  }

  private generatePageContent(
    appName: string,
    page: { route: string; name: string; type: string },
    models: SchemaModel[],
    stateSlices: StateSlice[],
  ): string {
    const lines: string[] = [];

    lines.push("'use client';");
    lines.push('');
    lines.push('import { useState, useEffect } from "react";');
    lines.push('import { useRouter } from "next/navigation";');

    // Import state stores
    const relevantModels = models.filter(m =>
      page.name.toLowerCase().includes(m.name.toLowerCase()) ||
      page.route.includes(m.name.toLowerCase())
    );

    for (const model of relevantModels) {
      const slice = stateSlices.find(s => s.name === model.name);
      if (slice) {
        lines.push(`import { use${slice.name}Store } from '@/lib/state/${slice.name.toLowerCase()}';`);
      }
    }

    lines.push('');
    lines.push(`export default function ${page.name.replace(/[^a-zA-Z0-9]/g, '')}Page() {`);
    lines.push('  const router = useRouter();');

    // State
    if (relevantModels.length > 0) {
      const model = relevantModels[0]!;
      const slice = stateSlices.find(s => s.name === model.name);
      if (slice) {
        lines.push(`  const { ${model.name.toLowerCase()}s, loading, error, fetch${model.name}s, create${model.name}, delete${model.name} } = use${slice.name}Store();`);
        lines.push('');
        lines.push('  useEffect(() => {');
        lines.push(`    fetch${model.name}s();`);
        lines.push('  }, []);');
      }
    }

    // Local state for forms
    lines.push('  const [showForm, setShowForm] = useState(false);');
    if (relevantModels.length > 0) {
      const model = relevantModels[0]!;
      const formFields = model.fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt');
      for (const field of formFields) {
        lines.push(`  const [${field.name}, set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}] = useState('');`);
      }
    }
    lines.push('');

    // Render
    lines.push('  return (');
    lines.push('    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">');
    lines.push(`      <h1 className="text-3xl font-bold mb-8">${page.name}</h1>`);
    lines.push('');

    // Loading state
    if (relevantModels.length > 0) {
      lines.push('      {loading && <p className="text-zinc-400">Loading...</p>}');
      lines.push('      {error && <p className="text-red-400">{error}</p>}');
      lines.push('');
    }

    // Data table
    if (relevantModels.length > 0) {
      const model = relevantModels[0]!;
      lines.push('      <div className="grid gap-4 mb-8">');
      lines.push(`        {${model.name.toLowerCase()}s.map((item) => (`);
      lines.push(`          <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">`);
      lines.push('            <div className="flex justify-between items-start">');
      lines.push('              <div>');

      // Show first few fields
      const displayFields = model.fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt').slice(0, 3);
      for (const field of displayFields) {
        lines.push(`                <p className="text-sm"><span className="text-zinc-400">${field.name}:</span> {item.${field.name} || '-'}</p>`);
      }

      lines.push('              </div>');
      lines.push(`              <button onClick={() => delete${model.name}(item.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>`);
      lines.push('            </div>');
      lines.push('          </div>');
      lines.push('        ))}');
      lines.push('      </div>');
      lines.push('');
    }

    // Add button
    lines.push('      <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">');
    lines.push(`        {showForm ? 'Cancel' : 'Add ${relevantModels[0]?.name || 'Item'}'}`);
    lines.push('      </button>');
    lines.push('');

    // Form
    lines.push('      {showForm && (');
    lines.push('        <form onSubmit={async (e) => {');
    lines.push('          e.preventDefault();');
    if (relevantModels.length > 0) {
      const model = relevantModels[0]!;
      const formFields = model.fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt');
      const createParams = formFields.map(f => `${f.name}`).join(', ');
      lines.push(`          await create${model.name}({ ${createParams} });`);
      lines.push('          setShowForm(false);');
      for (const field of formFields) {
        lines.push(`          set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}('');`);
      }
    }
    lines.push('        }} className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">');

    // Form fields
    if (relevantModels.length > 0) {
      const model = relevantModels[0]!;
      const formFields = model.fields.filter(f => !f.isId && f.name !== 'createdAt' && f.name !== 'updatedAt');
      for (const field of formFields) {
        lines.push(`          <div>`);
        lines.push(`            <label className="block text-sm text-zinc-400 mb-1">${field.name}</label>`);
        lines.push(`            <input`);
        lines.push(`              type="${field.type === 'String' ? 'text' : field.type === 'Int' || field.type === 'Float' ? 'number' : 'text'}"`);
        lines.push(`              value={${field.name}}`);
        lines.push(`              onChange={(e) => set${field.name.charAt(0).toUpperCase() + field.name.slice(1)}(e.target.value)}`);
        lines.push(`              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"`);
        lines.push(`              required`);
        lines.push(`            />`);
        lines.push(`          </div>`);
      }
    }

    lines.push('          <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">Save</button>');
    lines.push('        </form>');
    lines.push('      )}');
    lines.push('');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate a landing page with navigation links for pages without specific models.
   */
  private generateLandingPage(
    appName: string,
    pages: Array<{ route: string; name: string; type: string }>,
  ): string {
    const lines: string[] = [];

    lines.push("'use client';");
    lines.push('');
    lines.push('import { useRouter } from "next/navigation";');
    lines.push('');
    lines.push(`export default function HomePage() {`);
    lines.push('  const router = useRouter();');
    lines.push('');
    lines.push('  return (');
    lines.push('    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">');
    lines.push(`      <h1 className="text-3xl font-bold mb-8">${appName}</h1>`);
    lines.push('      <div className="grid gap-4 max-w-md">');

    for (const page of pages.filter(p => p.route !== '/')) {
      lines.push(`        <button`);
      lines.push(`          onClick={() => router.push('${page.route}')}`);
      lines.push(`          className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-left hover:border-zinc-700 transition"`);
      lines.push(`        >`);
      lines.push(`          <h2 className="font-bold">${page.name}</h2>`);
      lines.push(`          <p className="text-sm text-zinc-400">${page.route}</p>`);
      lines.push(`        </button>`);
    }

    lines.push('      </div>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push('}');

    return lines.join('\n');
  }

  private generateAPIRoutes(
    models: SchemaModel[],
    services: ServiceClass[],
  ): APIRoute[] {
    const routes: APIRoute[] = [];

    for (const model of models) {
      const nameLower = model.name.toLowerCase();

      // GET /api/{model}s — list all
      routes.push({
        path: `${nameLower}s`,
        method: 'GET',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const items = await prisma.${nameLower}.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${model.name.toLowerCase()}s' }, { status: 500 });
  }
}`,
      });

      // POST /api/{model}s — create
      routes.push({
        path: `${nameLower}s`,
        method: 'POST',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await prisma.${nameLower}.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ${model.name.toLowerCase()}' }, { status: 500 });
  }
}`,
      });

      // GET /api/{model}s/[id] — get one
      routes.push({
        path: `${nameLower}s/[id]`,
        method: 'GET',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.${nameLower}.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${model.name.toLowerCase()}' }, { status: 500 });
  }
}`,
      });

      // PATCH /api/{model}s/[id] — update
      routes.push({
        path: `${nameLower}s/[id]`,
        method: 'PATCH',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const item = await prisma.${nameLower}.update({ where: { id: params.id }, data: body });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update ${model.name.toLowerCase()}' }, { status: 500 });
  }
}`,
      });

      // DELETE /api/{model}s/[id] — delete
      routes.push({
        path: `${nameLower}s/[id]`,
        method: 'DELETE',
        content: `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.${nameLower}.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete ${model.name.toLowerCase()}' }, { status: 500 });
  }
}`,
      });
    }

    return routes;
  }
}
