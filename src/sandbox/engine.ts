import * as fs from 'fs';
import * as path from 'path';
import { exec, ChildProcess } from 'child_process';
import { WorkspaceConfig } from '../types/index.js';

export class SandboxEngine {
  private activeServers: Map<string, ChildProcess> = new Map();

  public createWorkspace(workspaceBase: string, id: string): WorkspaceConfig {
    // If workspaceBase already IS the full workspace path (ends with /id), use it directly
    // to avoid double-nesting (e.g. sandbox_workspaces/ws-xxx/ws-xxx)
    const alreadyNested = workspaceBase.endsWith(path.sep + id) || workspaceBase.endsWith('/' + id);
    const rootPath = alreadyNested ? path.resolve(workspaceBase) : path.resolve(path.join(workspaceBase, id));

    // Always ensure directory exists
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
    }

    // Write or update .meta.json for workspace tracking
    const metaPath = path.join(rootPath, '.meta.json');
    try {
      const existing = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf-8')) : {};
      fs.writeFileSync(metaPath, JSON.stringify({ ...existing, id, updatedAt: new Date().toISOString(), createdAt: existing.createdAt || new Date().toISOString() }, null, 2), 'utf-8');
    } catch {}

    // Check for required files and backfill any that are missing (idempotent scaffold)
    const requiredFiles = this.getRequiredScaffoldFiles(rootPath);
    const missingFiles = requiredFiles.filter(f => !fs.existsSync(f.path));

    if (missingFiles.length > 0) {
      console.log(`[sandbox] Backfilling ${missingFiles.length} missing scaffold files: ${missingFiles.map(f => f.relativePath).join(', ')}`);
      this.scaffoldWorkspace(rootPath);
    }

    return { workspaceId: id, rootPath };
  }

  private getRequiredScaffoldFiles(root: string): Array<{ path: string; relativePath: string }> {
    return [
      { path: path.join(root, 'package.json'), relativePath: 'package.json' },
      { path: path.join(root, 'tsconfig.json'), relativePath: 'tsconfig.json' },
      { path: path.join(root, 'tailwind.config.js'), relativePath: 'tailwind.config.js' },
      { path: path.join(root, 'postcss.config.js'), relativePath: 'postcss.config.js' },
      { path: path.join(root, 'next.config.js'), relativePath: 'next.config.js' },
      { path: path.join(root, 'src', 'app', 'layout.tsx'), relativePath: 'src/app/layout.tsx' },
      { path: path.join(root, 'src', 'app', 'page.tsx'), relativePath: 'src/app/page.tsx' },
    ];
  }

  public runPackageInstall(config: WorkspaceConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      // --silent removed: it swallows stderr, making failures invisible in debug logs.
      // timeout: 120 s is generous; a stalled network request should not block the build forever.
      exec(
        'npm install --legacy-peer-deps',
        { cwd: config.rootPath, timeout: 120_000 },
        (error, stdout, stderr) => {
          if (error) {
            const detail = stderr?.trim() || stdout?.trim() || error.message;
            reject(new Error(`Sandbox npm installation failed:\n${detail}`));
            return;
          }
          // Sanity-check: verify the next binary was actually installed.
          // An empty node_modules dir (permissions issue, network timeout, etc.)
          // would otherwise produce a silent "next is not recognised" crash later.
          const nextBin = path.join(config.rootPath, 'node_modules', '.bin', 'next');
          const nextBinCmd = path.join(config.rootPath, 'node_modules', '.bin', 'next.cmd'); // Windows
          const fs2 = fs; // alias for clarity inside callback
          if (!fs2.existsSync(nextBin) && !fs2.existsSync(nextBinCmd)) {
            reject(new Error(
              `npm install finished but node_modules/.bin/next is missing.\n` +
              `This usually means the install was interrupted or the registry timed out.\n` +
              `stderr: ${stderr?.trim() || '(empty)'}`
            ));
            return;
          }
          resolve(stdout);
        }
      );
    });
  }

  public launchDevInstance(config: WorkspaceConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.activeServers.has(config.workspaceId)) {
        resolve();
        return;
      }

      const processInstance = exec('npm run dev', { cwd: config.rootPath });
      let hasResolved = false;

      processInstance.stdout?.on('data', (data) => {
        if (data.toString().includes('ready') || data.toString().includes('started')) {
          this.activeServers.set(config.workspaceId, processInstance);
          hasResolved = true;
          resolve();
        }
      });

      processInstance.stderr?.on('data', (data) => {
        console.error(`[Sandbox Dev Server Error - ${config.workspaceId}]: ${data}`);
      });

      processInstance.on('error', (err) => {
        if (!hasResolved) {
          reject(err);
        }
      });

      processInstance.on('exit', (code) => {
        if (!hasResolved) {
          reject(new Error(`Sandbox dev server exited prematurely with code ${code}`));
        }
      });
    });
  }

  public stopDevInstance(workspaceId: string): void {
    const activeProcess = this.activeServers.get(workspaceId);
    if (activeProcess) {
      activeProcess.kill('SIGTERM');
      this.activeServers.delete(workspaceId);
    }
  }

  private scaffoldWorkspace(root: string): void {
    const srcDir = path.join(root, 'src');
    const appDir = path.join(srcDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });

    const packageJsonPath = path.join(root, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      const packageJsonTemplate = {
        name: "build-same-sandbox-instance",
        version: "1.0.0",
        private: true,
        scripts: {
          "dev": "next dev",
          "build": "next build",
          "start": "next start"
        },
        dependencies: {
          // Pinned exact versions: range resolution with no cache causes flaky installs.
          "next": "14.2.29",
          "react": "18.3.1",
          "react-dom": "18.3.1",
          "lucide-react": "0.344.0",
          "motion": "11.18.0"
        },
        devDependencies: {
          "typescript": "5.4.5",
          "@types/node": "20.14.2",
          "@types/react": "18.3.3",
          "@types/react-dom": "18.3.0",
          "tailwindcss": "3.4.17",
          "autoprefixer": "10.4.20",
          "postcss": "8.4.49"
        }
      };
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonTemplate, null, 2));
    }

    const tsconfigPath = path.join(root, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
      const tsconfigTemplate = {
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] }
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"]
      };
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigTemplate, null, 2));
    }

    const layoutPath = path.join(appDir, 'layout.tsx');
    if (!fs.existsSync(layoutPath)) {
      const layoutTemplate = `
import React from 'react';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
      fs.writeFileSync(layoutPath, layoutTemplate.trim());
    }

    const pagePath = path.join(appDir, 'page.tsx');
    if (!fs.existsSync(pagePath)) {
      const pageTemplate = `
import React from 'react';
export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Sandbox App Initialized</h1>
    </main>
  );
}
`;
      fs.writeFileSync(pagePath, pageTemplate.trim());
    }

    // tailwind.config.js — required for next build with Tailwind classes
    const tailwindConfigPath = path.join(root, 'tailwind.config.js');
    if (!fs.existsSync(tailwindConfigPath)) {
      fs.writeFileSync(
        tailwindConfigPath,
        `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
};\n`,
      );
    }

    // postcss.config.js — required for Tailwind processing
    const postcssConfigPath = path.join(root, 'postcss.config.js');
    if (!fs.existsSync(postcssConfigPath)) {
      fs.writeFileSync(
        postcssConfigPath,
        `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`,
      );
    }

    // next.config.js — clean, no warnings
    const nextConfigPath = path.join(root, 'next.config.js');
    if (!fs.existsSync(nextConfigPath)) {
      fs.writeFileSync(
        nextConfigPath,
        `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;\n`,
      );
    }
  }
}