// Direct build: BRE context → render → scaffold → npm build
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import fs from 'fs';
import path from 'path';

const WS = path.join(process.cwd(), 'sandbox_workspaces', 'ws-verify-direct');
const PROMPT = "Austin Kitchen, a modern restaurant in Austin TX serving contemporary American cuisine with seasonal ingredients. Open for lunch and dinner. Reservations available.";

async function main() {
  console.log('1. Building BRE context...');
  const ctx = await buildBREContext(PROMPT);
  console.log(`   Industry: ${ctx.industry}, Entities: ${ctx.entities.length}`);

  console.log('2. Running build pipeline...');
  const result = await runBuildPipeline(ctx, {
    platform: 'react',
    outputDir: path.join(WS, 'src'),
    workspaceDir: WS,
  });

  console.log(`   Files: ${result.renderResult.files.length}`);

  // Write files
  console.log('3. Writing files...');
  for (const file of result.renderResult.files) {
    const safePath = file.path.replace(/:/g, '_');
    const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
    const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
    const filePath = path.join(WS, isRoot ? '' : 'src', relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  // Scaffold files
  console.log('4. Writing scaffold...');
  const pkg = {
    name: 'build-same-sandbox-instance', version: '1.0.0', private: true,
    scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: {
      next: '14.2.35', react: '^18.3.1', 'react-dom': '^18.3.1',
      'framer-motion': '^11.18.2', '@prisma/client': '^5.22.0', 'lucide-react': '^0.468.0'
    },
    devDependencies: {
      '@types/node': '^22.0.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0',
      autoprefixer: '^10.4.20', postcss: '^8.4.49', prisma: '^5.22.0',
      tailwindcss: '^3.4.17', typescript: '^5.7.0'
    }
  };
  fs.writeFileSync(path.join(WS, 'package.json'), JSON.stringify(pkg, null, 2));

  fs.writeFileSync(path.join(WS, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true,
      skipLibCheck: true, strict: false, noEmit: true, esModuleInterop: true,
      module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true,
      isolatedModules: true, jsx: 'preserve', incremental: true,
      plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules', 'prisma']
  }, null, 2));

  fs.writeFileSync(path.join(WS, 'next.config.js'), `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n`);
  fs.writeFileSync(path.join(WS, 'tailwind.config.ts'), `import type { Config } from "tailwindcss";\nconst config: Config = {\n  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\nexport default config;\n`);
  fs.writeFileSync(path.join(WS, 'postcss.config.js'), `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`);
  fs.writeFileSync(path.join(WS, '.env'), `DATABASE_URL="postgresql://user:password@localhost:5432/dummy?schema=public"\n`);

  console.log(`Done. Workspace: ${WS}`);
}

main().catch(e => { console.error(e); process.exit(1); });
