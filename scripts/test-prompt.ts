import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import fs from 'fs';
import path from 'path';

const WS = path.join(process.cwd(), 'sandbox_workspaces', process.argv[2] || 'ws-test1-coffee');
const PROMPT = process.argv[3] || 'a coffee shop in Austin with online ordering and loyalty rewards';

async function main() {
  console.log('=== TEST ===');
  console.log('Prompt:', PROMPT);

  const ctx = await buildBREContext(PROMPT);
  console.log('Industry:', ctx.industry);
  console.log('App Name:', ctx.appName);
  console.log('Entities:', ctx.entities.map((e: any) => e.name));

  const result = await runBuildPipeline(ctx, {
    platform: 'react',
    outputDir: path.join(WS, 'src'),
    workspaceDir: WS,
  });

  // Check a) appName
  const appName = ctx.appName;
  const hasSpaceOrCamel = appName.includes(' ') || /[a-z][A-Z]/.test(appName);
  console.log('\n--- CHECK a) appName ---');
  console.log('Value:', appName);
  console.log('Not single word:', hasSpaceOrCamel ? 'PASS' : 'FAIL');

  // Check b) hero subtitle
  const heroFiles = result.renderResult.files.filter((f: any) => f.path.endsWith('page.tsx') && !f.path.includes('api'));
  let subtitle = 'NOT FOUND';
  for (const f of heroFiles) {
    const m = f.content.match(/subtitle.*?["']([^"']{10,})["']/);
    if (m) { subtitle = m[1]; break; }
  }
  const hasPromptWords = /build|create|functional|responsive/i.test(subtitle);
  console.log('\n--- CHECK b) hero subtitle ---');
  console.log('Value:', subtitle.substring(0, 150));
  console.log('No prompt words:', hasPromptWords ? 'FAIL' : 'PASS');

  // Check c) icons
  const iconFile = result.renderResult.files.find((f: any) => f.path.includes('Icon.tsx'));
  const hasIconImport = heroFiles.some((f: any) => f.content.includes("import Icon"));
  console.log('\n--- CHECK c) icons ---');
  console.log('Icon.tsx exists:', iconFile ? 'PASS' : 'FAIL');
  console.log('Icon used in pages:', hasIconImport ? 'PASS' : 'WARN');

  // Write files
  fs.mkdirSync(WS, { recursive: true });
  for (const file of result.renderResult.files) {
    const safePath = file.path.replace(/:/g, '_');
    const isRoot = safePath.startsWith('../') || safePath.startsWith('prisma/');
    const relPath = isRoot ? safePath.replace(/^\.\.\//, '') : safePath;
    const filePath = path.join(WS, isRoot ? '' : 'src', relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  // Scaffold
  const pkg = {
    name: 'test-workspace', version: '1.0.0', private: true,
    scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: { next: '14.2.35', react: '^18.3.1', 'react-dom': '^18.3.1', 'framer-motion': '^11.18.2', '@prisma/client': '^5.22.0', 'lucide-react': '^0.468.0' },
    devDependencies: { '@types/node': '^22.0.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', autoprefixer: '^10.4.20', postcss: '^8.4.49', prisma: '^5.22.0', tailwindcss: '^3.4.17', typescript: '^5.7.0' }
  };
  fs.writeFileSync(path.join(WS, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(WS, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true, strict: false, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] } },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], exclude: ['node_modules', 'prisma']
  }, null, 2));
  fs.writeFileSync(path.join(WS, 'next.config.js'), '/** @type {import("next").NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n');
  fs.writeFileSync(path.join(WS, 'tailwind.config.ts'), 'import type { Config } from "tailwindcss";\nconst config: Config = {\n  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\nexport default config;\n');
  fs.writeFileSync(path.join(WS, 'postcss.config.js'), 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n');
  fs.writeFileSync(path.join(WS, '.env'), 'DATABASE_URL="postgresql://user:password@localhost:5432/dummy?schema=public"\n');

  console.log('\nFiles written:', result.renderResult.files.length);
  console.log('Workspace:', WS);
}

main().catch(e => { console.error(e); process.exit(1); });
