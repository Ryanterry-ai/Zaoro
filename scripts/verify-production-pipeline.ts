/**
 * Verification script for Production Pipeline (Upgrades 1-4).
 */

import { ProductionPipeline } from '../src/pipeline/orchestrator.js';
import { MockDataValidator } from '../src/pipeline/mock-data-validator.js';
import { StateSyncValidator } from '../src/pipeline/state-sync-validator.js';
import { DependencyResolver } from '../src/pipeline/dependency-resolver.js';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testDir = path.join(process.cwd(), 'test-pipeline-output');

  // Clean up
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Test 1: Schema Generator
  try {
    const { SchemaGenerator } = await import('../src/pipeline/schema-generator.js');
    const gen = new SchemaGenerator();
    const output = gen.generate('TestApp', ['commerce'], [
      { name: 'Product', fields: [
        { name: 'id', type: 'string', required: true, isId: true },
        { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true },
      ]},
      { name: 'Order', fields: [
        { name: 'id', type: 'string', required: true, isId: true },
        { name: 'productId', type: 'string', required: true },
        { name: 'quantity', type: 'number', required: true },
      ]},
    ], [
      { path: '/api/products', method: 'GET', description: 'List products', auth: false },
      { path: '/api/products', method: 'POST', description: 'Create product', auth: true },
    ], testDir);

    const prismaExists = fs.existsSync(path.join(testDir, 'prisma', 'schema.prisma'));
    const typesExists = fs.existsSync(path.join(testDir, 'src', 'types', 'generated.ts'));

    results.push({
      name: 'Schema Generator',
      passed: prismaExists && typesExists && output.models.length === 2,
      detail: `${output.models.length} models, ${output.interfaces.length} interfaces, ${output.apiContracts.length} contracts`,
    });
  } catch (e: any) {
    results.push({ name: 'Schema Generator', passed: false, detail: e.message });
  }

  // Test 2: Business Logic Generator
  try {
    const { SchemaGenerator } = await import('../src/pipeline/schema-generator.js');
    const { BusinessLogicGenerator } = await import('../src/pipeline/business-logic-generator.js');
    const schemaGen = new SchemaGenerator();
    const schemaOutput = schemaGen.generate('TestApp', ['commerce'], [
      { name: 'Product', fields: [
        { name: 'id', type: 'string', required: true, isId: true },
        { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true },
      ]},
    ], [], testDir);

    const logicGen = new BusinessLogicGenerator();
    const logicOutput = logicGen.generate('TestApp', schemaOutput.models, ['commerce'], testDir);

    const serviceExists = fs.existsSync(path.join(testDir, 'src', 'lib', 'services', 'product.ts'));
    const stateExists = fs.existsSync(path.join(testDir, 'src', 'lib', 'state', 'product.ts'));

    results.push({
      name: 'Business Logic Generator',
      passed: serviceExists && stateExists && logicOutput.services.length === 1,
      detail: `${logicOutput.services.length} services, ${logicOutput.stateSlices.length} state slices, ${logicOutput.serverActions.length} server actions`,
    });
  } catch (e: any) {
    results.push({ name: 'Business Logic Generator', passed: false, detail: e.message });
  }

  // Test 3: Component Fusion
  try {
    const { SchemaGenerator } = await import('../src/pipeline/schema-generator.js');
    const { BusinessLogicGenerator } = await import('../src/pipeline/business-logic-generator.js');
    const { ComponentFusion } = await import('../src/pipeline/component-fusion.js');

    const schemaGen = new SchemaGenerator();
    const schemaOutput = schemaGen.generate('TestApp', ['commerce'], [
      { name: 'Product', fields: [
        { name: 'id', type: 'string', required: true, isId: true },
        { name: 'name', type: 'string', required: true },
        { name: 'price', type: 'number', required: true },
      ]},
    ], [
      { path: '/api/products', method: 'GET', description: 'List products', auth: false },
    ], testDir);

    const logicGen = new BusinessLogicGenerator();
    const logicOutput = logicGen.generate('TestApp', schemaOutput.models, ['commerce'], testDir);

    const fusion = new ComponentFusion();
    const fusionOutput = fusion.generate('TestApp', schemaOutput.models, logicOutput.services, logicOutput.serverActions, logicOutput.stateSlices, [
      { route: '/', name: 'Home', type: 'home' },
      { route: '/products', name: 'Products', type: 'list' },
    ], testDir);

    const homeExists = fs.existsSync(path.join(testDir, 'src', 'app', 'page.tsx'));
    const productsExists = fs.existsSync(path.join(testDir, 'src', 'app', 'products', 'page.tsx'));
    const apiExists = fs.existsSync(path.join(testDir, 'src', 'app', 'api', 'products', 'route.ts'));

    results.push({
      name: 'Component Fusion',
      passed: homeExists && productsExists && apiExists && fusionOutput.pages.length === 2,
      detail: `${fusionOutput.pages.length} pages, ${fusionOutput.apiRoutes.length} API routes`,
    });
  } catch (e: any) {
    results.push({ name: 'Component Fusion', passed: false, detail: e.message });
  }

  // Test 4: Full Pipeline
  try {
    const { ProductionPipeline } = await import('../src/pipeline/orchestrator.js');
    const pipeline = new ProductionPipeline();
    const output = await pipeline.run(
      'FullTestApp',
      'ecommerce store with products and orders',
      ['commerce'],
      {
        models: [
          { name: 'Product', fields: [
            { name: 'id', type: 'string', required: true, isId: true },
            { name: 'name', type: 'string', required: true },
            { name: 'price', type: 'number', required: true },
          ]},
          { name: 'Order', fields: [
            { name: 'id', type: 'string', required: true, isId: true },
            { name: 'productId', type: 'string', required: true },
            { name: 'quantity', type: 'number', required: true },
          ]},
        ],
        apis: [
          { path: '/api/products', method: 'GET', description: 'List products', auth: false },
          { path: '/api/orders', method: 'POST', description: 'Create order', auth: true },
        ],
        pages: [
          { route: '/', name: 'Home', type: 'home' },
          { route: '/products', name: 'Products', type: 'list' },
          { route: '/orders', name: 'Orders', type: 'list' },
        ],
      },
      testDir,
    );

    results.push({
      name: 'Full Pipeline',
      passed: output.totalFiles > 0 && output.stage1.models.length === 2,
      detail: `${output.totalFiles} files, ${output.durationMs}ms — ${output.stage1.models.length} models, ${output.stage2.services.length} services, ${output.stage3.pages.length} pages`,
    });
  } catch (e: any) {
    results.push({ name: 'Full Pipeline', passed: false, detail: e.message });
  }

  // Test 5: Mock Data Validator (no violations in generated code)
  try {
    const { MockDataValidator } = await import('../src/pipeline/mock-data-validator.js');
    const validator = new MockDataValidator();
    const validation = validator.validate(testDir);

    results.push({
      name: 'Mock Data Validator (clean code)',
      passed: validation.passed,
      detail: `${validation.violations.length} violations, ${validation.filesChecked} files checked`,
    });
  } catch (e: any) {
    results.push({ name: 'Mock Data Validator (clean code)', passed: false, detail: e.message });
  }

  // Test 6: State Sync Validator
  try {
    const { StateSyncValidator } = await import('../src/pipeline/state-sync-validator.js');
    const validator = new StateSyncValidator();
    const validation = validator.validate(testDir);

    results.push({
      name: 'State Sync Validator',
      passed: validation.passed,
      detail: `${validation.handlersChecked} handlers, ${validation.connectedHandlers} connected, ${validation.disconnectedHandlers} disconnected`,
    });
  } catch (e: any) {
    results.push({ name: 'State Sync Validator', passed: false, detail: e.message });
  }

  // Test 7: Dependency Resolver
  try {
    const { DependencyResolver } = await import('../src/pipeline/dependency-resolver.js');
    const resolver = new DependencyResolver(testDir);
    const resolution = resolver.resolve();

    results.push({
      name: 'Dependency Resolver',
      passed: resolution.failed.length === 0 || resolution.newlyInstalled.length > 0,
      detail: `${resolution.newlyInstalled.length} installed, ${resolution.alreadyInstalled.length} pre-installed, ${resolution.failed.length} failed`,
    });
  } catch (e: any) {
    results.push({ name: 'Dependency Resolver', passed: false, detail: e.message });
  }

  // Test 8: Generated code has no mock data
  try {
    const productsPagePath = path.join(testDir, 'src', 'app', 'products', 'page.tsx');
    if (fs.existsSync(productsPagePath)) {
      const generatedCode = fs.readFileSync(productsPagePath, 'utf-8');
      const hasNoHardcodedArrays = !generatedCode.match(/const\s+\w+\s*=\s*\[[\s\S]*?{[\s\S]*?}/);
      const hasFetchCall = generatedCode.includes('fetch(');
      const hasStateStore = generatedCode.includes('useStore') || generatedCode.includes('Store');

      results.push({
        name: 'No Mock Data in Generated Code',
        passed: hasNoHardcodedArrays && (hasFetchCall || hasStateStore),
        detail: `Hardcoded arrays: ${!hasNoHardcodedArrays}, Has fetch: ${hasFetchCall}, Has state: ${hasStateStore}`,
      });
    } else {
      results.push({ name: 'No Mock Data in Generated Code', passed: false, detail: 'Products page not found' });
    }
  } catch (e: any) {
    results.push({ name: 'No Mock Data in Generated Code', passed: false, detail: e.message });
  }

  // Test 9: Generated code uses server actions
  try {
    const actionsDir = path.join(testDir, 'src', 'app', 'actions');
    const hasActions = fs.existsSync(actionsDir);
    let actionCount = 0;
    if (hasActions) {
      actionCount = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts')).length;
    }

    results.push({
      name: 'Server Actions Generated',
      passed: hasActions && actionCount > 0,
      detail: `${actionCount} server action files`,
    });
  } catch (e: any) {
    results.push({ name: 'Server Actions Generated', passed: false, detail: e.message });
  }

  // Clean up (after all tests)
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }

  return results;
}

async function main() {
  console.log('=== Production Pipeline Verification (Upgrades 1-4) ===\n');

  const results = await runTests();

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.name}: ${result.detail}`);
    if (result.passed) passed++; else failed++;
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
