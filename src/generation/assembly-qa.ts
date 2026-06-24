import * as fs from 'fs';
import * as path from 'path';
import { ArchitectDecision, PageDesign } from './architect.js';
import { DesignSystem, designSystemToCss, designSystemToTailwindConfig } from './design-system-generator.js';
import { ComponentPlan } from './component-sourcer.js';
import { AssetPlan } from './asset-intelligence.js';
import { MotionPlan, MotionEngine } from './motion-engine.js';
import { UXAuditResult } from './ux-evaluator.js';
import { BusinessValidation } from './business-validator.js';

export interface AssemblyResult {
  success: boolean;
  filesWritten: string[];
  checks: AssemblyCheck[];
  overallScore: number;
  duration: number;
  error?: string;
}

export interface AssemblyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

// ─── Assembly QA Agent ────────────────────────────────────────────

export class AssemblyQA {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async assemble(
    decision: ArchitectDecision,
    designSystem: DesignSystem,
    componentPlan: ComponentPlan,
    assetPlan: AssetPlan,
    motionPlan: MotionPlan,
    uxResult: UXAuditResult,
    businessResult: BusinessValidation,
    generatedSections: Map<string, string>,
  ): Promise<AssemblyResult> {
    const startTime = Date.now();
    const checks: AssemblyCheck[] = [];
    const filesWritten: string[] = [];

    console.log(`[assembly-qa] Assembling ${decision.pages.length} pages`);

    try {
      // 1. Write globals.css with design system
      const globalsCss = this.generateGlobalsCss(designSystem, motionPlan);
      this.writeFile('src/app/globals.css', globalsCss);
      filesWritten.push('src/app/globals.css');
      checks.push({ name: 'globals.css', passed: true, detail: 'Design system CSS written' });

      // 2. Write tailwind.config.ts
      const tailwindConfig = designSystemToTailwindConfig(designSystem);
      this.writeFile('tailwind.config.ts', tailwindConfig);
      filesWritten.push('tailwind.config.ts');
      checks.push({ name: 'tailwind.config.ts', passed: true, detail: 'Tailwind config written' });

      // 3. Write layout.tsx
      const layout = this.generateLayout(decision, designSystem, componentPlan);
      this.writeFile('src/app/layout.tsx', layout);
      filesWritten.push('src/app/layout.tsx');
      checks.push({ name: 'layout.tsx', passed: true, detail: 'Root layout written' });

      // 4. Write page.tsx files
      for (const page of decision.pages) {
        const pageCode = this.generatePage(page, designSystem, generatedSections);
        const routePath = page.route === '/' ? 'src/app/page.tsx' : `src/app${page.route}/page.tsx`;
        this.writeFile(routePath, pageCode);
        filesWritten.push(routePath);
        checks.push({ name: routePath, passed: true, detail: `Page "${page.name}" written` });
      }

      // 5. Write shared components
      for (const shared of componentPlan.sharedComponents) {
        const compPath = `src/components/${shared.name}.tsx`;
        const compCode = this.generateSharedComponent(shared, designSystem);
        this.writeFile(compPath, compCode);
        filesWritten.push(compPath);
        checks.push({ name: compPath, passed: true, detail: `Shared component "${shared.name}" written` });
      }

      // 6. Write next.config.ts
      const nextConfig = this.generateNextConfig(assetPlan);
      this.writeFile('next.config.ts', nextConfig);
      filesWritten.push('next.config.ts');
      checks.push({ name: 'next.config.ts', passed: true, detail: 'Next.js config written' });

      // 7. Run integrity checks
      const integrityChecks = this.runIntegrityChecks(filesWritten, designSystem, decision);
      checks.push(...integrityChecks);

      // 8. Calculate overall score
      const passedChecks = checks.filter(c => c.passed).length;
      const overallScore = Math.round(
        (passedChecks / Math.max(checks.length, 1)) * 60 +
        uxResult.overall * 0.25 +
        businessResult.overall * 0.15
      );

      const duration = Date.now() - startTime;

      console.log(`[assembly-qa] ${filesWritten.length} files written, ${passedChecks}/${checks.length} checks passed, score: ${overallScore}/100, ${duration}ms`);

      return { success: true, filesWritten, checks, overallScore, duration };
    } catch (err: any) {
      console.error(`[assembly-qa] Assembly failed: ${err.message}`);
      return {
        success: false,
        filesWritten,
        checks,
        overallScore: 0,
        duration: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  // ─── File generators ──────────────────────────────────────────

  private generateGlobalsCss(ds: DesignSystem, motionPlan: MotionPlan): string {
    const lines: string[] = [];

    lines.push(`@tailwind base;`);
    lines.push(`@tailwind components;`);
    lines.push(`@tailwind utilities;`);
    lines.push('');

    lines.push(`:root {`);
    for (const [key, value] of Object.entries(ds.colors.cssVariables)) {
      lines.push(`  ${key}: ${value};`);
    }
    lines.push(`  --font-heading: ${ds.typography.fontFamily.heading};`);
    lines.push(`  --font-body: ${ds.typography.fontFamily.body};`);
    lines.push(`  --font-mono: ${ds.typography.fontFamily.mono};`);
    lines.push(`  --transition-duration: ${ds.motion.transitionDuration};`);
    lines.push(`  --transition-easing: ${ds.motion.transitionEasing};`);
    lines.push(`}`);
    lines.push('');

    lines.push(`body {`);
    lines.push(`  font-family: var(--font-body);`);
    lines.push(`  background-color: var(--${ds.colors.surface.bg});`);
    lines.push(`  color: var(--${ds.colors.text.body});`);
    lines.push(`  -webkit-font-smoothing: antialiased;`);
    lines.push(`  -moz-osx-font-smoothing: grayscale;`);
    lines.push(`}`);
    lines.push('');

    lines.push(`h1, h2, h3, h4, h5, h6 {`);
    lines.push(`  font-family: var(--font-heading);`);
    lines.push(`  color: var(--${ds.colors.text.heading});`);
    lines.push(`}`);
    lines.push('');

    lines.push(`@layer utilities {`);
    lines.push(`  .animate-fade-in { animation: fadeIn var(--transition-duration) var(--transition-easing) both; }`);
    lines.push(`  .animate-slide-up { animation: slideUp var(--transition-duration) var(--transition-easing) both; }`);
    lines.push(`  .animate-scale-in { animation: scaleIn var(--transition-duration) var(--transition-easing) both; }`);
    lines.push(`  .hover-lift { transition: transform 200ms ease-out, box-shadow 200ms ease-out; }`);
    lines.push(`  .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.3); }`);
    lines.push(`  .hover-scale { transition: transform 200ms ease-out; }`);
    lines.push(`  .hover-scale:hover { transform: scale(${ds.motion.hoverScale}); }`);
    lines.push(`  .image-hover-zoom { overflow: hidden; }`);
    lines.push(`  .image-hover-zoom img { transition: transform 500ms ease-out; }`);
    lines.push(`  .image-hover-zoom:hover img { transform: scale(1.05); }`);
    lines.push(`  .animate-stagger > * { animation: slideUpFade 400ms cubic-bezier(0.16, 1, 0.3, 1) both; }`);
    lines.push(`  .animate-stagger > *:nth-child(1) { animation-delay: 0ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(2) { animation-delay: 75ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(3) { animation-delay: 150ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(4) { animation-delay: 225ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(5) { animation-delay: 300ms; }`);
    lines.push(`  .animate-stagger > *:nth-child(6) { animation-delay: 375ms; }`);
    lines.push(`}`);
    lines.push('');

    lines.push(`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`);
    lines.push(`@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`);
    lines.push(`@keyframes slideUpFade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`);
    lines.push(`@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`);

    // Google Fonts import
    if (ds.typography.googleFontsUrl) {
      lines.unshift(`@import url('${ds.typography.googleFontsUrl}');`);
    }

    return lines.join('\n');
  }

  private generateLayout(decision: ArchitectDecision, ds: DesignSystem, cp: ComponentPlan): string {
    const fontImports = this.getFontImports(ds);

    return `${fontImports}
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: '${decision.name}',
  description: '${decision.description || decision.name + ' — built with build.same'}',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" style={{ fontFamily: 'var(--font-body)' }}>
        <Navbar />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
`;
  }

  private generatePage(page: PageDesign, ds: DesignSystem, generatedSections: Map<string, string>): string {
    const sectionImports: string[] = [];
    const sectionComponents: string[] = [];

    for (const sectionType of page.sections) {
      const sectionCode = generatedSections.get(sectionType);
      if (sectionCode) {
        const componentName = this.toPascalCase(sectionType);
        sectionImports.push(`// ${componentName} — inline section`);
        sectionComponents.push(`{/* ${sectionType} */}
${sectionCode}`);
      }
    }

    return `'use client';

${sectionImports.join('\n')}

export default function ${this.toPascalCase(page.name)}Page() {
  return (
    <div>
${sectionComponents.map(s => `      ${s}`).join('\n\n')}
    </div>
  );
}
`;
  }

  private generateSharedComponent(shared: { name: string; source: { code: string } }, ds: DesignSystem): string {
    return `'use client';

${shared.source.code}
`;
  }

  private generateNextConfig(assetPlan: AssetPlan): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
`;
  }

  private getFontImports(ds: DesignSystem): string {
    const url = ds.typography.googleFontsUrl;
    if (!url) return '';
    return `// Fonts loaded via globals.css @import`;
  }

  // ─── Integrity checks ─────────────────────────────────────────

  private runIntegrityChecks(files: string[], ds: DesignSystem, decision: ArchitectDecision): AssemblyCheck[] {
    const checks: AssemblyCheck[] = [];

    // Check all pages have routes
    for (const page of decision.pages) {
      const routeFile = page.route === '/' ? 'src/app/page.tsx' : `src/app${page.route}/page.tsx`;
      const exists = files.some(f => f === routeFile);
      checks.push({
        name: `Route ${page.route}`,
        passed: exists,
        detail: exists ? `${routeFile} exists` : `${routeFile} MISSING`,
      });
    }

    // Check shared components exist
    checks.push({
      name: 'Navbar component',
      passed: files.some(f => f === 'src/components/Navbar.tsx'),
      detail: files.some(f => f === 'src/components/Navbar.tsx') ? 'Written' : 'MISSING',
    });
    checks.push({
      name: 'Footer component',
      passed: files.some(f => f === 'src/components/Footer.tsx'),
      detail: files.some(f => f === 'src/components/Footer.tsx') ? 'Written' : 'MISSING',
    });

    // Check design system completeness
    checks.push({
      name: 'Typography system',
      passed: Object.keys(ds.typography.scale).length >= 8,
      detail: `${Object.keys(ds.typography.scale).length} type scale levels`,
    });
    checks.push({
      name: 'Color system',
      passed: !!ds.colors.primary && !!ds.colors.secondary,
      detail: `Primary: ${ds.colors.primary[500]}, Secondary: ${ds.colors.secondary[500]}`,
    });
    checks.push({
      name: 'Spacing system',
      passed: Object.keys(ds.spacing.scale).length >= 10,
      detail: `${Object.keys(ds.spacing.scale).length} spacing values`,
    });

    // Check globals.css written
    checks.push({
      name: 'globals.css',
      passed: files.some(f => f === 'src/app/globals.css'),
      detail: files.some(f => f === 'src/app/globals.css') ? 'Written' : 'MISSING',
    });

    return checks;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private writeFile(relativePath: string, content: string): void {
    const fullPath = path.join(this.workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  private toPascalCase(str: string): string {
    return str.split(/[-/]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }
}
