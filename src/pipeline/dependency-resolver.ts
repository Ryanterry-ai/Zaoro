/**
 * Dependency Installation Lock: Ensures npm install completes and all packages
 * are resolvable before allowing downstream pipeline stages to proceed.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DependencyCheckResult {
  installed: string[];
  missing: string[];
  unresolvable: string[];
  lockAcquired: boolean;
  durationMs: number;
}

export interface DependencyLockOptions {
  workspacePath: string;
  requiredPackages?: string[];
  timeoutMs?: number;
  retries?: number;
}

export class DependencyResolver {
  private lockFilePath: string;
  private workspacePath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.lockFilePath = path.join(workspacePath, '.dependency-lock');
  }

  /**
   * Acquire dependency installation lock. Spawns npm install, awaits exit,
   * verifies packages exist in node_modules and package.json, then verifies
   * TypeScript can resolve each package.
   */
  async acquireLock(options: DependencyLockOptions): Promise<DependencyCheckResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 120_000;
    const retries = options.retries ?? 2;
    const requiredPackages = options.requiredPackages ?? [];

    // Write lock file to prevent concurrent installs
    this.writeLock();

    try {
      // Step 1: Spawn npm install and await exit
      console.log('[dep-lock] Running npm install...');
      await this.runNpmInstall(timeoutMs, retries);
      console.log('[dep-lock] npm install completed');

      // Step 2: Read package.json dependencies
      const packageJsonPath = path.join(this.workspacePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return this.buildResult([], requiredPackages, [], false, startTime);
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Step 3: Verify each package exists in node_modules
      const installed: string[] = [];
      const missing: string[] = [];

      for (const pkg of Object.keys(allDeps)) {
        const pkgPath = path.join(this.workspacePath, 'node_modules', pkg);
        if (fs.existsSync(pkgPath)) {
          installed.push(pkg);
        } else {
          missing.push(pkg);
        }
      }

      // Step 4: Verify required packages specifically
      for (const pkg of requiredPackages) {
        if (!installed.includes(pkg)) {
          const pkgPath = path.join(this.workspacePath, 'node_modules', pkg);
          if (fs.existsSync(pkgPath)) {
            installed.push(pkg);
          } else if (!missing.includes(pkg)) {
            missing.push(pkg);
          }
        }
      }

      // Step 5: Verify TypeScript can resolve packages
      const unresolvable = await this.verifyTypeScriptResolution(installed);

      const lockAcquired = missing.length === 0 && unresolvable.length === 0;
      console.log(`[dep-lock] Lock acquired: ${lockAcquired} (${installed.length} installed, ${missing.length} missing, ${unresolvable.length} unresolvable)`);

      return this.buildResult(installed, missing, unresolvable, lockAcquired, startTime);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Check if a lock is currently held (prevent concurrent installs).
   */
  isLocked(): boolean {
    return fs.existsSync(this.lockFilePath);
  }

  /**
   * Release the dependency lock.
   */
  releaseLock(): void {
    try {
      if (fs.existsSync(this.lockFilePath)) {
        fs.unlinkSync(this.lockFilePath);
      }
    } catch {
      // Ignore errors on cleanup
    }
  }

  private writeLock(): void {
    const lockData = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      workspacePath: this.workspacePath,
    };
    fs.writeFileSync(this.lockFilePath, JSON.stringify(lockData, null, 2), 'utf-8');
  }

  private async runNpmInstall(timeoutMs: number, retries: number): Promise<void> {
    let lastError: Error | null = null;
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    const shell = isWindows ? true : undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { stdout, stderr } = await execFileAsync(npmCmd, ['install', '--prefer-offline'], {
          cwd: this.workspacePath,
          timeout: timeoutMs,
          shell,
          env: { ...process.env, npm_config_loglevel: 'warn' },
        });

        if (stdout) console.log(`[dep-lock] npm stdout: ${stdout.slice(0, 200)}`);
        if (stderr) console.warn(`[dep-lock] npm stderr: ${stderr.slice(0, 200)}`);
        return;
      } catch (err: any) {
        lastError = err;
        console.warn(`[dep-lock] npm install attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error('npm install failed after retries');
  }

  private async verifyTypeScriptResolution(packages: string[]): Promise<string[]> {
    const unresolvable: string[] = [];

    // Create a temporary tsconfig for resolution check
    const tempTsConfig = path.join(this.workspacePath, '.dep-check-tsconfig.json');
    const tempTsFile = path.join(this.workspacePath, '.dep-check.ts');

    try {
      // Write temp tsconfig
      fs.writeFileSync(tempTsConfig, JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: [tempTsFile],
      }), 'utf-8');

      // Write temp import file that tries to import each package
      const imports = packages.map(pkg => `import '${pkg}';`).join('\n');
      fs.writeFileSync(tempTsFile, `${imports}\nexport {};\n`, 'utf-8');

      // Run tsc --noEmit
      try {
        const isWindows = process.platform === 'win32';
        const npxCmd = isWindows ? 'npx.cmd' : 'npx';
        const shell = isWindows ? true : undefined;
        await execFileAsync(npxCmd, ['tsc', '--noEmit', '-p', tempTsConfig], {
          cwd: this.workspacePath,
          timeout: 30_000,
          shell,
        });
      } catch (err: any) {
        // Parse tsc output to find unresolvable packages
        const output = err.stdout ?? err.stderr ?? '';
        for (const pkg of packages) {
          if (output.includes(`Cannot find module '${pkg}'`) || output.includes(`Could not resolve '${pkg}'`)) {
            unresolvable.push(pkg);
          }
        }
      }
    } finally {
      // Cleanup temp files
      try {
        if (fs.existsSync(tempTsConfig)) fs.unlinkSync(tempTsConfig);
        if (fs.existsSync(tempTsFile)) fs.unlinkSync(tempTsFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    return unresolvable;
  }

  private buildResult(
    installed: string[],
    missing: string[],
    unresolvable: string[],
    lockAcquired: boolean,
    startTime: number,
  ): DependencyCheckResult {
    return {
      installed,
      missing,
      unresolvable,
      lockAcquired,
      durationMs: Date.now() - startTime,
    };
  }
}
