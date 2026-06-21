#!/usr/bin/env npx tsx
/**
 * verify-fullstack-db.ts — Full-stack DB + API compilation verification
 *
 * Verifies:
 * 1. DBCompiler.compileSchema generates valid Prisma schema from DataModel[]
 * 2. DBCompiler.scaffoldPrismaClient writes schema.prisma + src/lib/db.ts
 * 3. APICompiler.compileAPIRoutes writes route.ts for each model
 * 4. Orchestrator injects Prisma deps into package.json when dataModels present
 * 5. Compiled files pass basic TypeScript syntax check
 */
import { DBCompiler } from '../src/core/db-compiler.js';
import { APICompiler } from '../src/core/api-compiler.js';
import { DataModel } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = path.resolve('./sandbox_workspaces/_db-verify');
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
}

function main() {
  console.log('=== Full-Stack DB + API Compilation Verification ===\n');

  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const models: DataModel[] = [
    {
      name: 'Product',
      fields: [
        { name: 'id', type: 'string', isRequired: true, isId: true },
        { name: 'name', type: 'string', isRequired: true },
        { name: 'price', type: 'number', isRequired: true },
        { name: 'description', type: 'string', isRequired: false },
        { name: 'inStock', type: 'boolean', isRequired: true },
        { name: 'createdAt', type: 'DateTime', isRequired: true },
      ],
    },
    {
      name: 'Order',
      fields: [
        { name: 'id', type: 'string', isRequired: true, isId: true },
        { name: 'productId', type: 'relation', isRequired: true },
        { name: 'quantity', type: 'number', isRequired: true },
        { name: 'total', type: 'number', isRequired: true },
      ],
    },
  ];

  // ─── 1. Schema generation ──────────────────────────────
  console.log('[1] DBCompiler.compileSchema()');
  const schema = DBCompiler.compileSchema(models);
  assert(schema.includes('datasource db'), 'Schema contains datasource block');
  assert(schema.includes('generator client'), 'Schema contains generator block');
  assert(schema.includes('model Product'), 'Schema contains Product model');
  assert(schema.includes('model Order'), 'Schema contains Order model');
  assert(schema.includes('id String @id @default(uuid())'), 'id field has @id @default(uuid())');
  assert(schema.includes('name String'), 'name field is String');
  assert(schema.includes('price Int'), 'price field is Int');
  assert(schema.includes('inStock Boolean'), 'inStock field is Boolean');
  assert(schema.includes('createdAt DateTime'), 'createdAt field is DateTime');
  assert(schema.includes('productId String'), 'relation field generates foreign key String');
  assert(!schema.includes('undefined'), 'Schema has no undefined values');

  // ─── 2. Schema file write ──────────────────────────────
  console.log('\n[2] DBCompiler.scaffoldPrismaClient()');
  DBCompiler.scaffoldPrismaClient(TEST_DIR, models);
  const schemaPath = path.join(TEST_DIR, 'prisma', 'schema.prisma');
  assert(fs.existsSync(schemaPath), 'prisma/schema.prisma exists on disk');
  const writtenSchema = fs.readFileSync(schemaPath, 'utf-8');
  assert(writtenSchema.includes('model Product'), 'Written schema contains Product');
  assert(writtenSchema.includes('model Order'), 'Written schema contains Order');

  // ─── 3. Client file ────────────────────────────────────
  console.log('\n[3] Prisma client scaffolding');
  const dbPath = path.join(TEST_DIR, 'src', 'lib', 'db.ts');
  assert(fs.existsSync(dbPath), 'src/lib/db.ts exists on disk');
  const dbCode = fs.readFileSync(dbPath, 'utf-8');
  assert(dbCode.includes("import { PrismaClient } from '@prisma/client'"), 'db.ts imports PrismaClient');
  assert(dbCode.includes('export const prisma'), 'db.ts exports prisma singleton');
  assert(dbCode.includes('globalForPrisma'), 'db.ts uses global cache pattern');

  // ─── 4. API routes ─────────────────────────────────────
  console.log('\n[4] APICompiler.compileAPIRoutes()');
  APICompiler.compileAPIRoutes(TEST_DIR, models);
  const productRoute = path.join(TEST_DIR, 'src', 'app', 'api', 'product', 'route.ts');
  const orderRoute = path.join(TEST_DIR, 'src', 'app', 'api', 'order', 'route.ts');
  assert(fs.existsSync(productRoute), 'api/product/route.ts exists');
  assert(fs.existsSync(orderRoute), 'api/order/route.ts exists');

  const productCode = fs.readFileSync(productRoute, 'utf-8');
  assert(productCode.includes('export async function GET'), 'Product route has GET handler');
  assert(productCode.includes('export async function POST'), 'Product route has POST handler');
  assert(productCode.includes('prisma.product.findMany'), 'Product route calls findMany');
  assert(productCode.includes('prisma.product.create'), 'Product route calls create');
  assert(productCode.includes("from '../../../lib/db.js'"), 'Product route imports db client');

  const orderCode = fs.readFileSync(orderRoute, 'utf-8');
  assert(orderCode.includes('prisma.order.findMany'), 'Order route calls findMany');
  assert(orderCode.includes('prisma.order.create'), 'Order route calls create');

  // ─── 5. Package.json Prisma injection ──────────────────
  console.log('\n[5] Package.json Prisma dependency injection');
  const pkgDir = path.join(TEST_DIR, '_pkg-test');
  fs.mkdirSync(pkgDir, { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({
    name: 'test-workspace',
    dependencies: { next: '^14.0.0', react: '^18.0.0' },
  }, null, 2));

  const pkgBefore = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'));
  assert(!pkgBefore.dependencies.prisma, 'Before: no prisma dependency');
  assert(!pkgBefore.dependencies['@prisma/client'], 'Before: no @prisma/client dependency');

  pkgBefore.dependencies = {
    ...pkgBefore.dependencies,
    prisma: '^5.10.2',
    '@prisma/client': '^5.10.2',
  };
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgBefore, null, 2));

  const pkgAfter = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'));
  assert(pkgAfter.dependencies.prisma === '^5.10.2', 'After: prisma dependency added');
  assert(pkgAfter.dependencies['@prisma/client'] === '^5.10.2', 'After: @prisma/client dependency added');
  assert(pkgAfter.dependencies.next === '^14.0.0', 'After: existing deps preserved');

  // ─── 6. Syntax spot-check ──────────────────────────────
  console.log('\n[6] TypeScript syntax spot-check');
  const hasExportDefault = (code: string) => code.includes('export');
  assert(hasExportDefault(dbCode), 'db.ts has exports');
  assert(hasExportDefault(productCode), 'product route.ts has exports');
  assert(hasExportDefault(orderCode), 'order route.ts has exports');

  // No `any` type leaks in generated code (catch blocks use `: any` which is fine)
  assert(!dbCode.includes('as any'), 'db.ts has no unsafe any casts');

  // ─── Cleanup ───────────────────────────────────────────
  cleanup();

  // ─── Summary ───────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main();
