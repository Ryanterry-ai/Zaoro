/**
 * Runtime Dependency Resolver — Upgrade 4
 * Detects missing packages from import statements and auto-installs them.
 * Falls back gracefully when packages can't be installed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface MissingPackage {
  name: string;
  importPath: string;
  file: string;
  line: number;
  installCommand: string;
}

export interface ResolutionResult {
  resolved: MissingPackage[];
  failed: MissingPackage[];
  alreadyInstalled: string[];
  newlyInstalled: string[];
  totalScanned: number;
}

// Known package mappings (import path → npm package name)
const PACKAGE_MAP: Record<string, string> = {
  'react': 'react',
  'react-dom': 'react-dom',
  'next': 'next',
  'lucide-react': 'lucide-react',
  'zustand': 'zustand',
  '@prisma/client': '@prisma/client',
  'prisma': 'prisma',
  'zod': 'zod',
  'react-hook-form': 'react-hook-form',
  'react-query': '@tanstack/react-query',
  '@tanstack/react-query': '@tanstack/react-query',
  'swr': 'swr',
  'axios': 'axios',
  'date-fns': 'date-fns',
  'dayjs': 'dayjs',
  'lodash': 'lodash',
  'lodash-es': 'lodash-es',
  'clsx': 'clsx',
  'tailwind-merge': 'tailwind-merge',
  'class-variance-authority': 'class-variance-authority',
  'framer-motion': 'framer-motion',
  'chart.js': 'chart.js',
  'react-chartjs-2': 'react-chartjs-2',
  '@stripe/stripe-js': '@stripe/stripe-js',
  '@stripe/react-stripe-js': '@stripe/react-stripe-js',
  'stripe': 'stripe',
  'resend': 'resend',
  '@sendgrid/mail': '@sendgrid/mail',
  'nodemailer': 'nodemailer',
  'sharp': 'sharp',
  'playwright': 'playwright',
  'cypress': 'cypress',
  'jest': 'jest',
  '@testing-library/react': '@testing-library/react',
  'tailwindcss': 'tailwindcss',
  'postcss': 'postcss',
  'autoprefixer': 'autoprefixer',
  'eslint': 'eslint',
  '@eslint/*': '@eslint/*',
  'typescript': 'typescript',
  '@types/react': '@types/react',
  '@types/react-dom': '@types/react-dom',
  '@types/node': '@types/node',
};

// Scoped package patterns
const SCOPED_PACKAGES = [
  { pattern: /^@prisma\//, package: '@prisma/client' },
  { pattern: /^@tanstack\//, package: '@tanstack/react-query' },
  { pattern: /^@eslint\//, package: '@eslint/js' },
  { pattern: /^@types\//, package: (match: string) => match },
  { pattern: /^@radix-ui\//, package: (match: string) => match },
  { pattern: /^@headlessui\//, package: (match: string) => match },
  { pattern: /^@heroicons\//, package: (match: string) => match },
];

export class DependencyResolver {
  private workspacePath: string;
  private installedPackages: Set<string> = new Set();

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.loadInstalledPackages();
  }

  /**
   * Scan all source files and resolve missing dependencies.
   */
  resolve(): ResolutionResult {
    console.log('[dep-resolver] Scanning for missing dependencies...');

    const missingPackages: MissingPackage[] = [];
    const alreadyInstalled: string[] = [];
    const srcDir = path.join(this.workspacePath, 'src');

    if (!fs.existsSync(srcDir)) {
      return { resolved: [], failed: [], alreadyInstalled: [], newlyInstalled: [], totalScanned: 0 };
    }

    // Scan all source files
    this.scanDirectory(srcDir, missingPackages);

    // Deduplicate by package name
    const uniqueMissing = this.deduplicatePackages(missingPackages);

    // Filter out already installed
    const toInstall = uniqueMissing.filter(p => !this.installedPackages.has(p.name));
    const installed = uniqueMissing.filter(p => this.installedPackages.has(p.name));

    console.log(`[dep-resolver] Found ${uniqueMissing.length} unique packages, ${toInstall.length} missing, ${installed.length} already installed`);

    // Install missing packages
    const resolved: MissingPackage[] = [];
    const failed: MissingPackage[] = [];

    for (const pkg of toInstall) {
      try {
        this.installPackage(pkg.name);
        this.installedPackages.add(pkg.name);
        resolved.push(pkg);
        console.log(`[dep-resolver] ✅ Installed: ${pkg.name}`);
      } catch (err: any) {
        failed.push(pkg);
        console.warn(`[dep-resolver] ❌ Failed to install ${pkg.name}: ${err.message}`);
      }
    }

    const result: ResolutionResult = {
      resolved,
      failed,
      alreadyInstalled: installed.map(p => p.name),
      newlyInstalled: resolved.map(p => p.name),
      totalScanned: missingPackages.length,
    };

    console.log(`[dep-resolver] Result: ${resolved.length} installed, ${failed.length} failed, ${installed.length} pre-installed`);

    return result;
  }

  /**
   * Scan a directory for import statements.
   */
  private scanDirectory(dir: string, missing: MissingPackage[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'dist') {
          this.scanDirectory(fullPath, missing);
        }
        continue;
      }

      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx') && !entry.name.endsWith('.js') && !entry.name.endsWith('.jsx')) {
        continue;
      }

      this.scanFile(fullPath, missing);
    }
  }

  /**
   * Scan a file for import statements.
   */
  private scanFile(filePath: string, missing: MissingPackage[]): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.workspacePath, filePath).replace(/\\/g, '/');

    // Match import statements
    const importPattern = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    // Match require statements
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    // Match dynamic imports
    const dynamicImportPattern = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    for (const pattern of [importPattern, requirePattern, dynamicImportPattern]) {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1] ?? '';

        // Skip relative imports
        if (importPath.startsWith('.') || importPath.startsWith('/')) continue;

        // Skip path aliases (@/)
        if (importPath.startsWith('@/')) continue;

        // Skip next built-ins
        if (importPath.startsWith('next/')) continue;

        // Skip react/react-dom (always installed)
        if (importPath === 'react' || importPath === 'react-dom') continue;

        // Find line number
        const beforeMatch = content.substring(0, match.index);
        const lineNum = beforeMatch.split('\n').length;

        // Resolve package name
        const packageName = this.resolvePackageName(importPath);
        if (packageName && !this.installedPackages.has(packageName)) {
          missing.push({
            name: packageName,
            importPath,
            file: relativePath,
            line: lineNum,
            installCommand: `npm install ${packageName}`,
          });
        }
      }
    }
  }

  /**
   * Resolve an import path to an npm package name.
   */
  private resolvePackageName(importPath: string): string | null {
    // Check exact matches first
    if (PACKAGE_MAP[importPath]) {
      return PACKAGE_MAP[importPath];
    }

    // Check scoped packages
    for (const scoped of SCOPED_PACKAGES) {
      if (scoped.pattern.test(importPath)) {
        if (typeof scoped.package === 'function') {
          return scoped.package(importPath);
        }
        return scoped.package;
      }
    }

    // Check if it's a package name (no relative path)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      // Return the first part before / for scoped packages
      if (importPath.startsWith('@')) {
        const parts = importPath.split('/');
        if (parts.length >= 2) {
          return `${parts[0]}/${parts[1]}`;
        }
      }
      // Return the package name (first part before /)
      return importPath.split('/')[0] || null;
    }

    return null;
  }

  /**
   * Load currently installed packages from package.json.
   */
  private loadInstalledPackages(): void {
    const packageJsonPath = path.join(this.workspacePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      for (const name of Object.keys(deps)) {
        this.installedPackages.add(name);
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Install a package using npm.
   */
  private installPackage(name: string): void {
    const packageJsonPath = path.join(this.workspacePath, 'package.json');

    // Update package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (!packageJson.dependencies) packageJson.dependencies = {};

    // Determine if it's a dev dependency
    const devPackages = ['typescript', '@types/*', 'eslint', '@eslint/*', 'tailwindcss', 'postcss', 'autoprefixer'];
    const isDev = devPackages.some(p => {
      if (p.includes('*')) {
        return name.startsWith(p.replace('*', ''));
      }
      return name === p;
    });

    if (isDev) {
      if (!packageJson.devDependencies) packageJson.devDependencies = {};
      packageJson.devDependencies[name] = 'latest';
    } else {
      packageJson.dependencies[name] = 'latest';
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');

    // Run npm install
    try {
      execSync('npm install --silent --legacy-peer-deps', {
        cwd: this.workspacePath,
        timeout: 60000,
        stdio: 'pipe',
      });
    } catch (err: any) {
      throw new Error(`npm install failed: ${err.message}`);
    }
  }

  /**
   * Deduplicate packages by name.
   */
  private deduplicatePackages(packages: MissingPackage[]): MissingPackage[] {
    const seen = new Map<string, MissingPackage>();
    for (const pkg of packages) {
      if (!seen.has(pkg.name)) {
        seen.set(pkg.name, pkg);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Generate a report for the resolution result.
   */
  generateReport(result: ResolutionResult): string {
    const lines: string[] = [];

    lines.push('=== Dependency Resolution Report ===');
    lines.push(`Total imports scanned: ${result.totalScanned}`);
    lines.push(`Already installed: ${result.alreadyInstalled.length}`);
    lines.push(`Newly installed: ${result.newlyInstalled.length}`);
    lines.push(`Failed to install: ${result.failed.length}`);
    lines.push('');

    if (result.newlyInstalled.length > 0) {
      lines.push('Newly installed:');
      for (const pkg of result.newlyInstalled) {
        lines.push(`  ✅ ${pkg}`);
      }
      lines.push('');
    }

    if (result.failed.length > 0) {
      lines.push('Failed to install:');
      for (const pkg of result.failed) {
        lines.push(`  ❌ ${pkg.name} (imported in ${pkg.file}:${pkg.line})`);
      }
      lines.push('');
    }

    if (result.failed.length === 0) {
      lines.push('✅ All dependencies resolved');
    }

    return lines.join('\n');
  }
}
