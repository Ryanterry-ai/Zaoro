/**
 * Pass 3: Code Generation / File Tree Mapping
 *
 * Reads the final ApplicationGraph and emits the exact file array payload
 * (e.g., src/app/api/[entity]/route.ts, prisma/schema.prisma) directly
 * to the Renderer. The Renderer no longer has to guess table schemas,
 * look up API routes, or speculate on CRUD endpoints.
 *
 * This pass replaces the ad-hoc DBCompiler + APICompiler with a single
 * graph-driven code generator that produces RenderedFile[].
 */

import type { RenderedFile } from '../generation/renderers/renderer.js';
import type {
  ApplicationGraph,
  EntityNode,
  TableNode,
  EndpointNode,
  AppGraphStats,
} from '../bos/graph/application-graph.js';
import { computeAppGraphStats } from '../bos/graph/application-graph.js';

// ─── Pass 3 Entry Point ──────────────────────────────────────────────────────

export interface Pass3Result {
  files: RenderedFile[];
  stats: AppGraphStats;
  warnings: string[];
}

/**
 * Run Pass 3: generate infrastructure files from the ApplicationGraph.
 *
 * Emits:
 *   - prisma/schema.prisma
 *   - src/lib/db.ts
 *   - src/app/api/[entity]/route.ts (for each entity with endpoints)
 */
export function runPass3CodeGeneration(graph: ApplicationGraph): Pass3Result {
  const files: RenderedFile[] = [];
  const warnings: string[] = [];
  const stats = computeAppGraphStats(graph);

  // 1. Generate Prisma schema from table nodes
  const schemaFile = generatePrismaSchema(graph);
  if (schemaFile) files.push(schemaFile);

  // 2. Generate Prisma client singleton
  files.push(generateDbClient());

  // 3. Generate API route handlers from endpoint nodes
  const apiFiles = generateAPIRoutes(graph);
  files.push(...apiFiles);

  // 4. Generate [id] dynamic route handlers for entities with GET/PUT/DELETE
  const dynamicFiles = generateDynamicRoutes(graph);
  files.push(...dynamicFiles);

  return { files, stats, warnings };
}

// ─── Prisma Schema Generator ─────────────────────────────────────────────────

function generatePrismaSchema(graph: ApplicationGraph): RenderedFile | null {
  const tables = graph.nodes.filter((n): n is TableNode => n.kind === 'table');
  if (tables.length === 0) return null;

  const engine = graph.metadata.databaseEngine || 'postgresql';

  let schema = `datasource db {
  provider = "${engine}"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

`;

  for (const table of tables) {
    const t = table.data;
    schema += `model ${t.name} {\n`;

    // Ensure id field exists
    const hasId = t.columns.some(c => c.name === 'id');
    if (!hasId) {
      schema += `  id String @id @default(uuid())\n`;
    }

    for (const col of t.columns) {
      const typeStr = mapFieldType(col.type, col.name);
      const optionalChar = col.required ? '' : '?';
      const idSuffix = col.name === 'id' ? ' @id @default(uuid())' : '';
      const indexSuffix = col.indexed && col.name !== 'id' ? ' @index' : '';
      const uniqueSuffix = col.unique && col.name !== 'id' ? ' @unique' : '';
      schema += `  ${col.name} ${typeStr}${optionalChar}${idSuffix}${indexSuffix}${uniqueSuffix}\n`;
    }

    // Add foreign key relations
    for (const fk of t.foreignKeys ?? []) {
      const refTable = fk.references.split('.').pop() ?? fk.references;
      schema += `  ${refTable.toLowerCase()} ${refTable} @relation(fields: [${fk.column}], references: [id], onDelete: ${fk.onDelete ?? 'Cascade'})\n`;
    }

    // Add @@index for indexed columns
    const indexedCols = t.columns.filter(c => c.indexed && c.name !== 'id');
    if (indexedCols.length > 0) {
      schema += `\n  @@index([${indexedCols.map(c => c.name).join(', ')}])\n`;
    }

    schema += `}\n\n`;
  }

  return {
    path: 'prisma/schema.prisma',
    content: schema.trim() + '\n',
    type: 'config',
  };
}

function mapFieldType(type: string, name: string): string {
  // Map pipeline-v2 field types to Prisma types
  switch (type) {
    case 'string': return 'String';
    case 'number': return 'Int';
    case 'boolean': return 'Boolean';
    case 'date': return 'DateTime';
    case 'enum': return 'String';
    case 'reference': return 'String';
    default: return 'String';
  }
}

// ─── Prisma Client Generator ─────────────────────────────────────────────────

function generateDbClient(): RenderedFile {
  return {
    path: 'lib/db.ts',
    content: `import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`,
    type: 'config',
  };
}

// ─── API Route Generator ─────────────────────────────────────────────────────

function generateAPIRoutes(graph: ApplicationGraph): RenderedFile[] {
  const files: RenderedFile[] = [];
  const entities = graph.nodes.filter((n): n is EntityNode => n.kind === 'entity');

  for (const entity of entities) {
    const name = entity.data.name;
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);
    const fields = entity.data.fields;

    // Find endpoints for this entity
    const endpoints = graph.nodes
      .filter((n): n is EndpointNode => n.kind === 'endpoint')
      .filter(e => e.data.entity?.toLowerCase() === name.toLowerCase());

    // Determine which methods are needed
    const methods = new Set(endpoints.map(e => e.data.method));
    // Always generate full CRUD if entity exists
    methods.add('GET');
    methods.add('POST');

    const hasId = fields.some(f => f.name === 'id');

    // Build field list for POST body validation
    const bodyFields = fields.filter(f => f.name !== 'id');

    let routeContent = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

`;

    // GET handler
    if (methods.has('GET')) {
      routeContent += `export async function GET(req: NextRequest) {
  try {
    const items = await prisma.${camelName}.findMany();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

`;
    }

    // POST handler
    if (methods.has('POST')) {
      routeContent += `export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await prisma.${camelName}.create({
      data: body,
    });
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`;
    }

    files.push({
      path: `app/api/${camelName}/route.ts`,
      content: routeContent,
      type: 'route',
    });
  }

  return files;
}

// ─── Dynamic Route Generator (GET/PUT/DELETE by ID) ──────────────────────────

function generateDynamicRoutes(graph: ApplicationGraph): RenderedFile[] {
  const files: RenderedFile[] = [];
  const entities = graph.nodes.filter((n): n is EntityNode => n.kind === 'entity');

  for (const entity of entities) {
    const name = entity.data.name;
    const camelName = name.charAt(0).toLowerCase() + name.slice(1);

    // Check if any endpoint requires PUT or DELETE
    const endpoints = graph.nodes
      .filter((n): n is EndpointNode => n.kind === 'endpoint')
      .filter(e => e.data.entity?.toLowerCase() === name.toLowerCase());

    const needsPUT = endpoints.some(e => e.data.method === 'PUT');
    const needsDELETE = endpoints.some(e => e.data.method === 'DELETE');

    // Always generate dynamic route for detail views
    let routeContent = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.${camelName}.findUnique({
      where: { id: params.id },
    });
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

`;

    if (needsPUT) {
      routeContent += `export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const item = await prisma.${camelName}.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

`;
    }

    if (needsDELETE) {
      routeContent += `export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.${camelName}.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`;
    }

    files.push({
      path: `app/api/${camelName}/[id]/route.ts`,
      content: routeContent,
      type: 'route',
    });
  }

  return files;
}
