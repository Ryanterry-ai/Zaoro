/**
 * Verification script for Production Manifest.
 * Tests manifest generation, route scanning, and model parsing.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProductionManifestGenerator } from '../src/pipeline/production-manifest.js';
import type { ProductionManifest } from '../src/pipeline/production-manifest.js';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function createTestWorkspace(): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));

  // Create package.json
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      'next': '16.0.0',
      'react': '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      'typescript': '^5.4.0',
    },
  }, null, 2), 'utf-8');

  // Create Prisma schema
  fs.mkdirSync(path.join(tmpDir, 'prisma'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'prisma', 'schema.prisma'), `
generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
`, 'utf-8');

  // Create app routes
  fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), 'export default function Home() {}', 'utf-8');
  fs.mkdirSync(path.join(tmpDir, 'src', 'app', 'about'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'about', 'page.tsx'), 'export default function About() {}', 'utf-8');
  fs.mkdirSync(path.join(tmpDir, 'src', 'app', 'blog'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'blog', 'page.tsx'), 'export default function Blog() {}', 'utf-8');

  // Create API routes
  fs.mkdirSync(path.join(tmpDir, 'src', 'app', 'api', 'users'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'api', 'users', 'route.ts'), `
export async function GET() {}
export async function POST() {}
`, 'utf-8');
  fs.mkdirSync(path.join(tmpDir, 'src', 'app', 'api', 'posts'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'api', 'posts', 'route.ts'), `
export async function GET() {}
export async function PUT() {}
export async function DELETE() {}
`, 'utf-8');

  // Create .env.example
  fs.writeFileSync(path.join(tmpDir, '.env.example'), `
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Auth
NEXTAUTH_SECRET="secret"
NEXTAUTH_URL="http://localhost:3000"

# API
OPENAI_API_KEY="sk-..."
`, 'utf-8');

  return tmpDir;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Basic manifest generation
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({
      name: 'Test App',
      description: 'A test application',
      buildId: 'build-123',
    });

    assert(manifest.metadata.name === 'Test App', 'Name should match');
    assert(manifest.metadata.description === 'A test application', 'Description should match');
    assert(manifest.metadata.buildId === 'build-123', 'Build ID should match');
    assert(manifest.framework.name === 'next', 'Framework should be next');
    assert(manifest.$schema.includes('manifest.json'), 'Should have schema URL');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Basic manifest generation', passed: true, detail: 'Metadata and framework correct' });
  } catch (e: any) {
    results.push({ name: 'Basic manifest generation', passed: false, detail: e.message });
  }

  // Test 2: Route scanning
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert(manifest.routes.length >= 3, `Should have at least 3 routes, got ${manifest.routes.length}`);
    assert(manifest.routes.some(r => r.path === '/'), 'Should have home route');
    assert(manifest.routes.some(r => r.path === '/about'), 'Should have about route');
    assert(manifest.routes.some(r => r.path === '/blog'), 'Should have blog route');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Route scanning', passed: true, detail: `${manifest.routes.length} routes found` });
  } catch (e: any) {
    results.push({ name: 'Route scanning', passed: false, detail: e.message });
  }

  // Test 3: API endpoint scanning
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert(manifest.apiEndpoints.length >= 5, `Should have at least 5 API endpoints, got ${manifest.apiEndpoints.length}`);

    // Check specific endpoints
    const usersGet = manifest.apiEndpoints.find(e => e.path === '/api/users' && e.method === 'GET');
    assert(usersGet !== undefined, 'Should have GET /api/users');

    const postsPost = manifest.apiEndpoints.find(e => e.path === '/api/posts' && e.method === 'POST');
    assert(postsPost === undefined, 'Should not have POST /api/posts (only GET, PUT, DELETE)');

    const postsDelete = manifest.apiEndpoints.find(e => e.path === '/api/posts' && e.method === 'DELETE');
    assert(postsDelete !== undefined, 'Should have DELETE /api/posts');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'API endpoint scanning', passed: true, detail: `${manifest.apiEndpoints.length} endpoints found` });
  } catch (e: any) {
    results.push({ name: 'API endpoint scanning', passed: false, detail: e.message });
  }

  // Test 4: Prisma model parsing
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert(manifest.database.models.length === 2, `Should have 2 models, got ${manifest.database.models.length}`);

    const userModel = manifest.database.models.find(m => m.name === 'User');
    assert(userModel !== undefined, 'Should have User model');
    assert(userModel?.fields.some(f => f.name === 'id'), 'User should have id field');
    assert(userModel?.fields.some(f => f.name === 'email'), 'User should have email field');
    assert(userModel?.relations?.some(r => r.name === 'posts'), 'User should have posts relation');

    const postModel = manifest.database.models.find(m => m.name === 'Post');
    assert(postModel !== undefined, 'Should have Post model');
    assert(postModel?.relations?.some(r => r.name === 'author'), 'Post should have author relation');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Prisma model parsing', passed: true, detail: `${manifest.database.models.length} models parsed` });
  } catch (e: any) {
    results.push({ name: 'Prisma model parsing', passed: false, detail: e.message });
  }

  // Test 5: Environment variable extraction
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert(manifest.environment.length >= 3, `Should have at least 3 env vars, got ${manifest.environment.length}`);
    assert(manifest.environment.some(e => e.key === 'DATABASE_URL'), 'Should have DATABASE_URL');
    assert(manifest.environment.some(e => e.key === 'NEXTAUTH_SECRET'), 'Should have NEXTAUTH_SECRET');
    assert(manifest.environment.some(e => e.key === 'OPENAI_API_KEY'), 'Should have OPENAI_API_KEY from .env.example');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Environment variable extraction', passed: true, detail: `${manifest.environment.length} env vars found` });
  } catch (e: any) {
    results.push({ name: 'Environment variable extraction', passed: false, detail: e.message });
  }

  // Test 6: Manifest writing
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifestPath = generator.generateAndWrite({
      name: 'Test App',
      description: 'Written manifest test',
    });

    assert(fs.existsSync(manifestPath), 'Manifest file should exist');

    const written = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as ProductionManifest;
    assert(written.metadata.name === 'Test App', 'Written manifest should have correct name');
    assert(written.routes.length > 0, 'Written manifest should have routes');
    assert(written.apiEndpoints.length > 0, 'Written manifest should have API endpoints');
    assert(written.database.models.length > 0, 'Written manifest should have database models');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Manifest writing', passed: true, detail: `Written to ${manifestPath}` });
  } catch (e: any) {
    results.push({ name: 'Manifest writing', passed: false, detail: e.message });
  }

  // Test 7: Deployment targets
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert(manifest.deployment.length >= 2, 'Should have at least 2 deployment targets');
    assert(manifest.deployment.some(d => d.platform === 'vercel'), 'Should have Vercel target');
    assert(manifest.deployment.some(d => d.platform === 'node'), 'Should have Node target');

    const vercelTarget = manifest.deployment.find(d => d.platform === 'vercel');
    assert(vercelTarget?.config.framework === 'nextjs', 'Vercel should use Next.js framework');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Deployment targets', passed: true, detail: `${manifest.deployment.length} targets configured` });
  } catch (e: any) {
    results.push({ name: 'Deployment targets', passed: false, detail: e.message });
  }

  // Test 8: Dependencies extraction
  try {
    const tmpDir = await createTestWorkspace();
    const generator = new ProductionManifestGenerator(tmpDir);

    const manifest = generator.generate({ name: 'Test App' });

    assert('next' in manifest.dependencies, 'Should include next');
    assert('react' in manifest.dependencies, 'Should include react');
    assert('typescript' in manifest.dependencies, 'Should include typescript (devDep)');

    fs.rmSync(tmpDir, { recursive: true, force: true });

    results.push({ name: 'Dependencies extraction', passed: true, detail: `${Object.keys(manifest.dependencies).length} dependencies` });
  } catch (e: any) {
    results.push({ name: 'Dependencies extraction', passed: false, detail: e.message });
  }

  return results;
}

async function main() {
  console.log('=== Production Manifest Verification ===\n');

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
