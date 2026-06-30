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
      { path: path.join(root, 'src', 'app', 'layout.tsx'), relativePath: 'src/app/layout.tsx' },
      { path: path.join(root, 'src', 'app', 'page.tsx'), relativePath: 'src/app/page.tsx' },
    ];
  }

  public runPackageInstall(config: WorkspaceConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      exec('npm install --silent --legacy-peer-deps', { cwd: config.rootPath }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Sandbox npm installation failed: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      });
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
        "next": "^14.1.0",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.344.0"
      },
      devDependencies: {
        "typescript": "^5.3.3",
        "@types/node": "^20.11.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0"
      }
    };
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJsonTemplate, null, 2));

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
    fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(tsconfigTemplate, null, 2));

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
    fs.writeFileSync(path.join(appDir, 'layout.tsx'), layoutTemplate.trim());

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
    fs.writeFileSync(path.join(appDir, 'page.tsx'), pageTemplate.trim());
  }
}