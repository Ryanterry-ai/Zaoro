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
import { getDomainData, type DomainMockData } from '../generation/domain-data.js';
import { mergeScrapedContent } from '../generation/content-scraper.js';
import type { TableDef } from '../bos/pipeline-v2/stages.js';
import type { BusinessResearch } from '../bos/types.js';

function pluralize(name: string): string {
  if (name.endsWith('y') && !/[aeiou]y$/.test(name)) return name.slice(0, -1) + 'ies';
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('z') || name.endsWith('ch') || name.endsWith('sh')) return name + 'es';
  return name + 's';
}

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

  // 5. Generate prisma/seed.ts with domain-specific data
  const seedFile = generateSeedFile(graph);
  if (seedFile) files.push(seedFile);

  return { files, stats, warnings };
}

// ─── Prisma Schema Generator ─────────────────────────────────────────────────

function generatePrismaSchema(graph: ApplicationGraph): RenderedFile | null {
  const tables = graph.nodes.filter((n): n is TableNode => n.kind === 'table');
  if (tables.length === 0) return null;

  const engine = graph.metadata.databaseEngine || 'postgresql';

  // Build reverse relation map: targetModel → [{ sourceModel, fieldName }]
  const reverseRelations = new Map<string, Array<{ sourceModel: string; fieldName: string }>>();
  for (const table of tables) {
    const t = table.data;
    const sourceModel = t.name.charAt(0).toUpperCase() + t.name.slice(1);
    for (const fk of t.foreignKeys ?? []) {
      const rawRef = fk.references.split('.').pop() ?? fk.references;
      const refTable = rawRef.replace(/\(.*\)/, '');
      const refModel = refTable.charAt(0).toUpperCase() + refTable.slice(1);
      if (!reverseRelations.has(refModel)) reverseRelations.set(refModel, []);
      reverseRelations.get(refModel)!.push({ sourceModel, fieldName: sourceModel.toLowerCase() });
    }
  }

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
    const modelName = t.name.charAt(0).toUpperCase() + t.name.slice(1);
    schema += `model ${modelName} {\n`;

    const hasId = t.columns.some(c => c.name === 'id');
    if (!hasId) {
      schema += `  id String @id @default(uuid())\n`;
    }

    for (const col of t.columns) {
      const typeStr = mapFieldType(col.type, col.name);
      const optionalChar = col.required ? '' : '?';
      const idSuffix = col.name === 'id' ? ' @id @default(uuid())' : '';
      const uniqueSuffix = col.unique && col.name !== 'id' ? ' @unique' : '';
      schema += `  ${col.name} ${typeStr}${optionalChar}${idSuffix}${uniqueSuffix}\n`;
    }

    // Add foreign key relations (relation field must be optional if FK column is optional)
    for (const fk of t.foreignKeys ?? []) {
      const rawRef = fk.references.split('.').pop() ?? fk.references;
      const refTable = rawRef.replace(/\(.*\)/, '');
      const refModel = refTable.charAt(0).toUpperCase() + refTable.slice(1);
      const fkField = refTable.toLowerCase();
      const fkCol = t.columns.find(c => c.name === fk.column);
      const optional = fkCol && !fkCol.required ? '?' : '';
      const onDelete = (fk.onDelete ?? 'Cascade').replace(/^[a-z]/, c => c.toUpperCase());
      schema += `  ${fkField} ${refModel}${optional} @relation(fields: [${fk.column}], references: [id], onDelete: ${onDelete})\n`;
    }

    // Add reverse relation fields (one-to-many: e.g., users has products Products[])
    const revRels = reverseRelations.get(modelName) ?? [];
    for (const rel of revRels) {
      schema += `  ${rel.fieldName} ${rel.sourceModel}[]\n`;
    }

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
    // Find matching table to get the plural name used in Prisma schema
    const tableNode = graph.nodes.find((n): n is TableNode => n.kind === 'table' && n.data.name.toLowerCase().startsWith(name.toLowerCase()));
    const tableName = tableNode?.data.name ?? pluralize(name.toLowerCase());
    const camelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
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
    // Find matching table to get the plural name used in Prisma schema
    const tableNode = graph.nodes.find((n): n is TableNode => n.kind === 'table' && n.data.name.toLowerCase().startsWith(name.toLowerCase()));
    const tableName = tableNode?.data.name ?? pluralize(name.toLowerCase());
    const camelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

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

// ─── Seed File Generator ────────────────────────────────────────────────────

function generateSeedFile(graph: ApplicationGraph): RenderedFile | null {
  const tables = graph.nodes.filter((n): n is TableNode => n.kind === 'table');
  if (tables.length === 0) return null;

  const { industry, subIndustry, appName, scrapedContent, businessResearch } = graph.metadata;
  // Start with hardcoded domain data, then merge scraped content on top
  let domainData = getDomainData(industry, subIndustry);
  if (scrapedContent) {
    domainData = mergeScrapedContent(domainData, scrapedContent);
  }

  // Enrich domain data with BusinessResearch dynamic data
  if (businessResearch) {
    // Use real products from research if available
    if (businessResearch.realProducts.length > 0) {
      domainData.items = businessResearch.realProducts.map(p => ({
        name: p.name,
        description: p.description || '',
        price: parseFloat(p.price.replace(/[^0-9.]/g, '')) || 0,
        emoji: '📦',
      }));
    }
    // Use real testimonials from research if available
    if (businessResearch.realTestimonials.length > 0) {
      domainData.testimonials = businessResearch.realTestimonials.map(t => ({
        name: t.author,
        text: t.text,
        role: t.role || '',
        rating: 5,
      }));
    }
  }

  let seed = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
`;

  for (const table of tables) {
    const t = table.data;
    const modelName = t.name.charAt(0).toUpperCase() + t.name.slice(1);
    const camelName = t.name.charAt(0).toLowerCase() + t.name.slice(1);
    const records = mapTableToSeedRecords(t, domainData, appName, industry);

    if (records.length === 0) continue;

    seed += `
  // ${modelName}
  const ${camelName}Data = ${JSON.stringify(records, null, 4)};
  for (const data of ${camelName}Data) {
    await prisma.${camelName}.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
  }
  console.log(\`  ✓ ${modelName}: \${${camelName}Data.length} records\`);
`;
  }

  seed += `
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

  return {
    path: 'prisma/seed.ts',
    content: seed,
    type: 'config',
  };
}

/**
 * Map a table's columns to realistic seed records using domain data.
 * Uses column name heuristics to infer what data goes where.
 */
function mapTableToSeedRecords(
  table: TableDef,
  domainData: DomainMockData,
  appName: string,
  industry: string,
): Record<string, unknown>[] {
  const cols = table.columns.filter(c => c.name !== 'id');
  const tableName = table.name.toLowerCase();

  // Determine what kind of entity this table represents
  const entityKind = inferEntityKind(tableName, cols);

  // Pick the right domain data source
  const sourceItems = getSourceItems(entityKind, domainData);

  const records: Record<string, unknown>[] = [];
  const count = sourceItems.length > 0 ? Math.min(sourceItems.length, 5) : 5;

  for (let i = 0; i < count; i++) {
    const record: Record<string, unknown> = {};
    record['id'] = `seed-${tableName}-${i + 1}`;

    for (const col of cols) {
      if (col.name === 'id') continue;
      record[col.name] = generateColumnValue(col.name, col.type, entityKind, sourceItems[i], i, appName, industry);
    }

    records.push(record);
  }

  return records;
}

type EntityKind = 'product' | 'user' | 'order' | 'category' | 'testimonial' | 'team' | 'feature' | 'service' | 'pricing' | 'generic';

function inferEntityKind(tableName: string, columns: Array<{ name: string; type: string }>): EntityKind {
  const lower = tableName.toLowerCase();
  const colNames = columns.map(c => c.name.toLowerCase());

  if (lower.includes('product') || lower.includes('item') || lower.includes('listing') || lower.includes('property') || lower.includes('dish') || lower.includes('menu')) return 'product';
  if (lower.includes('user') || lower.includes('customer') || lower.includes('account') || lower.includes('member')) return 'user';
  if (lower.includes('order') || lower.includes('purchase') || lower.includes('transaction') || lower.includes('booking') || lower.includes('reservation')) return 'order';
  if (lower.includes('category') || lower.includes('collection') || lower.includes('tag')) return 'category';
  if (lower.includes('testimonial') || lower.includes('review') || lower.includes('feedback')) return 'testimonial';
  if (lower.includes('team') || lower.includes('staff') || lower.includes('agent') || lower.includes('doctor') || lower.includes('trainer')) return 'team';
  if (lower.includes('feature') || lower.includes('capability')) return 'feature';
  if (lower.includes('service')) return 'service';
  if (lower.includes('pricing') || lower.includes('plan') || lower.includes('tier') || lower.includes('membership')) return 'pricing';

  // Heuristic: if it has price/amount columns, treat as product
  if (colNames.some(n => n.includes('price') || n.includes('amount'))) return 'product';
  // If it has email, treat as user
  if (colNames.some(n => n.includes('email'))) return 'user';

  return 'generic';
}

function getSourceItems(kind: EntityKind, data: DomainMockData): DomainMockData['items'] {
  switch (kind) {
    case 'product': return data.items;
    case 'testimonial': return data.testimonials.map(t => ({ name: t.name, description: t.text, emoji: '★'.repeat(t.rating), tag: t.role, rating: t.rating }));
    case 'team': return data.team.map(t => ({ name: t.name, description: t.bio, emoji: t.emoji, tag: t.role }));
    case 'feature': return data.features.map(f => ({ name: f.title, description: f.description, emoji: f.icon }));
    case 'service': return data.services.map(s => ({ name: s.name, description: s.description, emoji: s.icon }));
    case 'pricing': return data.items.filter(i => i.price !== undefined);
    case 'category': return data.features.map(f => ({ name: f.title, description: f.description, emoji: f.icon }));
    case 'user': return data.team.map(t => ({ name: t.name, description: t.email ?? '', emoji: t.emoji, tag: t.role }));
    case 'order': return []; // synthetic — generateColumnValue handles these per-field
    default: return data.items;
  }
}

function generateColumnValue(
  colName: string,
  colType: string,
  entityKind: EntityKind,
  sourceItem: DomainMockData['items'][number] | DomainMockData['testimonials'][number] | DomainMockData['team'][number] | DomainMockData['features'][number] | DomainMockData['services'][number] | undefined,
  index: number,
  appName: string,
  industry: string,
): unknown {
  const lower = colName.toLowerCase();

  // ID fields
  if (lower === 'id') return `seed-${index + 1}`;

  // Name/title fields — use source item name
  if (lower.includes('name') || lower.includes('title')) {
    if (entityKind === 'user' && sourceItem && 'name' in sourceItem) return sourceItem.name;
    if (entityKind === 'order') {
      const guestNames = ['James Mitchell', 'Sarah Chen', 'David Park', 'Maria Garcia', 'Alex Thompson'];
      return guestNames[index % guestNames.length];
    }
    if (sourceItem && 'name' in sourceItem) return sourceItem.name;
    return `${appName} Item ${index + 1}`;
  }

  // Description fields
  if (lower.includes('description') || lower.includes('bio') || lower.includes('text') || lower.includes('about') || lower.includes('content') || lower.includes('body')) {
    if (sourceItem && 'description' in sourceItem) return sourceItem.description;
    return `Details about ${appName} ${colName}.`;
  }

  // Price/cost/amount fields
  if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('fee') || lower.includes('rate')) {
    if (sourceItem && 'price' in sourceItem && sourceItem.price != null) return sourceItem.price;
    return 49.99 + index * 20;
  }

  // Email fields
  if (lower.includes('email')) {
    const roles = ['admin', 'user', 'contact', 'support'];
    return `${roles[index % roles.length]}@${appName.toLowerCase().replace(/\s+/g, '')}.com`;
  }

  // Image/photo/url/avatar fields
  if (lower.includes('image') || lower.includes('photo') || lower.includes('url') || lower.includes('avatar') || lower.includes('thumbnail') || lower.includes('cover')) {
    return `https://placehold.co/400x300?text=${encodeURIComponent(colName + ' ' + (index + 1))}`;
  }

  // Status fields
  if (lower.includes('status')) {
    const statuses = ['active', 'published', 'approved', 'in_stock'];
    return statuses[index % statuses.length];
  }

  // Type/category/kind fields
  if (lower.includes('type') || lower.includes('category') || lower.includes('kind') || lower.includes('tag') || lower.includes('role')) {
    if (entityKind === 'user') {
      const roles = ['admin', 'staff', 'customer'];
      return roles[index % roles.length];
    }
    if (sourceItem && 'tag' in sourceItem && sourceItem.tag) return sourceItem.tag;
    const tags = ['premium', 'standard', 'featured', 'new'];
    return tags[index % tags.length];
  }

  // Rating fields
  if (lower.includes('rating') || lower.includes('score')) {
    if (sourceItem && 'rating' in sourceItem && sourceItem.rating != null) return sourceItem.rating;
    return 4.5 + (index % 5) * 0.1;
  }

  // Count/review/quantity fields
  if (lower.includes('count') || lower.includes('review') || lower.includes('quantity') || lower.includes('stock') || lower.includes('inventory')) {
    return 10 + index * 15;
  }

  // Guests field (reservations/orders)
  if (lower.includes('guest') || lower.includes('party') || lower.includes('party_size') || lower.includes('party-size')) {
    return (2 + index).toString();
  }

  // Phone fields
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('telephone')) {
    return `+1-512-${555 + index * 11}`;
  }

  // Notes/special instructions
  if (lower.includes('note') || lower.includes('instruction') || lower.includes('comment') || lower.includes('special')) {
    const notes = ['Window seat preferred', 'No allergies', 'Birthday celebration', 'Anniversary dinner', 'Quiet table please'];
    return notes[index % notes.length];
  }

  // Boolean fields
  if (colType === 'boolean' || lower.includes('active') || lower.includes('enabled') || lower.includes('verified') || lower.includes('featured')) {
    return index < 2;
  }

  // Date fields
  if (colType === 'date' || lower.includes('date') || lower.includes('at') || lower.includes('created') || lower.includes('updated')) {
    const now = new Date();
    now.setDate(now.getDate() - index * 7);
    return now.toISOString();
  }

  // Enum or string fields with no clear match
  if (colType === 'enum') {
    return 'default';
  }

  // Foreign key fields (reference type)
  if (colType === 'reference' || lower.endsWith('id') && lower !== 'id') {
    return null;
  }

  // Number fields
  if (colType === 'number') {
    return index + 1;
  }

  // Fallback: generate a descriptive string
  return `${appName} ${colName} ${index + 1}`;
}
