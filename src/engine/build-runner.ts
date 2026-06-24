// ─── Build Runner ────────────────────────────────────────────────
// Runs `next build` or `next dev` in the workspace, captures output,
// verifies the build succeeds, and returns a structured report.

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface BuildRunnerConfig {
  buildCommand: string;
  devCommand: string;
  buildTimeoutMs: number;
  devStartupTimeoutMs: number;
  port: number;
}

export interface BuildReport {
  success: boolean;
  buildOutput: string;
  buildErrors: string[];
  buildDuration: number;
  fileCount: number;
  outputDir: string;
  hasLayout: boolean;
  hasPages: boolean;
  hasGlobals: boolean;
  hasConfig: boolean;
  warnings: string[];
}

export interface DevServerResult {
  running: boolean;
  url: string;
  pid: number | undefined;
  startupOutput: string;
}

const DEFAULT_BUILD_CONFIG: BuildRunnerConfig = {
  buildCommand: 'npx next build',
  devCommand: 'npx next dev',
  buildTimeoutMs: 120000,
  devStartupTimeoutMs: 30000,
  port: 3456,
};

export class BuildRunner {
  private config: BuildRunnerConfig;
  private workspaceRoot: string;
  private logFn: ((step: string, msg: string, data?: Record<string, unknown>) => void) | undefined;
  private devProcess: child_process.ChildProcess | null = null;

  constructor(
    workspaceRoot: string,
    config?: Partial<BuildRunnerConfig>,
    logFn?: (step: string, msg: string, data?: Record<string, unknown>) => void,
  ) {
    this.workspaceRoot = workspaceRoot;
    this.config = { ...DEFAULT_BUILD_CONFIG, ...config };
    this.logFn = logFn;
  }

  private log(msg: string) {
    console.log(`[build-runner] ${msg}`);
    this.logFn?.('build-runner', msg);
  }

  async runBuild(): Promise<BuildReport> {
    const startTime = Date.now();
    this.log(`Running build in ${this.workspaceRoot}`);

    // Verify workspace has required files
    this.verifyWorkspaceStructure();

    try {
      const { stdout, stderr } = await this.execCommand(this.config.buildCommand, this.config.buildTimeoutMs);
      const duration = Date.now() - startTime;
      const output = (stdout || '') + '\n' + (stderr || '');
      const errors = this.parseBuildErrors(output);
      const warnings = this.parseBuildWarnings(output);

      const report: BuildReport = {
        success: errors.length === 0,
        buildOutput: output.slice(0, 10000),
        buildErrors: errors,
        buildDuration: duration,
        fileCount: this.countFiles(),
        outputDir: path.join(this.workspaceRoot, '.next'),
        hasLayout: fs.existsSync(path.join(this.workspaceRoot, 'src/app/layout.tsx')) || fs.existsSync(path.join(this.workspaceRoot, 'app/layout.tsx')),
        hasPages: this.hasPageFiles(),
        hasGlobals: fs.existsSync(path.join(this.workspaceRoot, 'src/app/globals.css')) || fs.existsSync(path.join(this.workspaceRoot, 'app/globals.css')),
        hasConfig: fs.existsSync(path.join(this.workspaceRoot, 'next.config.ts')) || fs.existsSync(path.join(this.workspaceRoot, 'next.config.js')),
        warnings,
      };

      this.log(`Build ${report.success ? 'succeeded' : 'failed'} in ${(duration / 1000).toFixed(1)}s — ${report.fileCount} files, ${errors.length} errors, ${warnings.length} warnings`);
      return report;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      this.log(`Build failed: ${err.message}`);
      return {
        success: false,
        buildOutput: err.message || '',
        buildErrors: [err.message],
        buildDuration: duration,
        fileCount: this.countFiles(),
        outputDir: path.join(this.workspaceRoot, '.next'),
        hasLayout: false,
        hasPages: false,
        hasGlobals: false,
        hasConfig: false,
        warnings: [],
      };
    }
  }

  async startDevServer(): Promise<DevServerResult> {
    this.log(`Starting dev server on port ${this.config.port}`);

    return new Promise((resolve) => {
      const env = { ...process.env, PORT: String(this.config.port) };
      this.devProcess = child_process.spawn('npx', ['next', 'dev', '-p', String(this.config.port)], {
        cwd: this.workspaceRoot,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let startupOutput = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.log(`Dev server startup timeout — proceeding anyway`);
          resolve({
            running: this.devProcess !== null && !this.devProcess.killed,
            url: `http://localhost:${this.config.port}`,
            pid: this.devProcess?.pid,
            startupOutput,
          });
        }
      }, this.config.devStartupTimeoutMs);

      this.devProcess.stdout?.on('data', (data: Buffer) => {
        const line = data.toString();
        startupOutput += line;
        if (!resolved && (line.includes('Ready') || line.includes('ready') || line.includes('localhost'))) {
          resolved = true;
          clearTimeout(timeout);
          this.log(`Dev server ready on port ${this.config.port}`);
          resolve({
            running: true,
            url: `http://localhost:${this.config.port}`,
            pid: this.devProcess?.pid,
            startupOutput,
          });
        }
      });

      this.devProcess.stderr?.on('data', (data: Buffer) => {
        startupOutput += data.toString();
      });

      this.devProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.log(`Dev server error: ${err.message}`);
          resolve({ running: false, url: '', pid: undefined, startupOutput });
        }
      });

      this.devProcess.on('exit', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ running: false, url: '', pid: undefined, startupOutput });
        }
      });
    });
  }

  async stopDevServer(): Promise<void> {
    if (!this.devProcess) return;

    this.log('Stopping dev server...');
    try {
      this.devProcess.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try { this.devProcess?.kill('SIGKILL'); } catch {}
          resolve();
        }, 5000);
        this.devProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch {}
    this.devProcess = null;
    this.log('Dev server stopped');
  }

  private verifyWorkspaceStructure(): void {
    const required = ['package.json'];
    const missing = required.filter(f => !fs.existsSync(path.join(this.workspaceRoot, f)));
    if (missing.length > 0) {
      this.log(`Warning: Missing files: ${missing.join(', ')}`);
    }

    // Check for src/app or app directory
    const hasAppDir = fs.existsSync(path.join(this.workspaceRoot, 'src/app')) || fs.existsSync(path.join(this.workspaceRoot, 'app'));
    if (!hasAppDir) {
      this.log('Warning: No src/app or app directory found');
    }
  }

  private hasPageFiles(): boolean {
    const appDir = fs.existsSync(path.join(this.workspaceRoot, 'src/app'))
      ? path.join(this.workspaceRoot, 'src/app')
      : path.join(this.workspaceRoot, 'app');

    if (!fs.existsSync(appDir)) return false;

    const walk = (dir: string): boolean => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && (entry.name === 'page.tsx' || entry.name === 'page.jsx')) return true;
        if (entry.isDirectory() && walk(full)) return true;
      }
      return false;
    };

    return walk(appDir);
  }

  private countFiles(): number {
    let count = 0;
    const walk = (dir: string) => {
      if (dir.includes('node_modules') || dir.includes('.next')) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile()) count++;
        else if (entry.isDirectory()) walk(full);
      }
    };
    walk(this.workspaceRoot);
    return count;
  }

  private parseBuildErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Error:') || line.includes('error TS') || line.includes('TypeError:') || line.includes('ReferenceError:')) {
        errors.push(line.trim());
      }
    }
    return errors;
  }

  private parseBuildWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('Warning:') || line.includes('warning TS') || line.includes('⚠')) {
        warnings.push(line.trim());
      }
    }
    return warnings;
  }

  private execCommand(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      child_process.exec(command, {
        cwd: this.workspaceRoot,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      }, (error: child_process.ExecException | null, stdout: string, stderr: string) => {
        if (error && error.killed) {
          reject(new Error(`Build timed out after ${timeoutMs / 1000}s`));
        } else if (error) {
          // Build may "fail" but still produce useful output
          resolve({ stdout: stdout || '', stderr: stderr || error.message });
        } else {
          resolve({ stdout: stdout || '', stderr: stderr || '' });
        }
      });
    });
  }
}
