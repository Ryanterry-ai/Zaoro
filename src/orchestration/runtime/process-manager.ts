// ─── Process Manager ────────────────────────────────────────────────────────
//
// Manages child process lifecycle: install, build, dev server, test.
// Captures stdout/stderr, handles timeouts, detects readiness.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn, type SpawnOptions } from 'node:child_process';
import fs from 'node:fs';
import type {
  ProcessSpec,
  ProcessResult,
  ProcessStatus,
  DevServerHandle,
} from './types.js';

// ─── Default Limits ─────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const DEV_SERVER_STARTUP_TIMEOUT_MS = 60_000;
const DEV_SERVER_READY_PATTERN = /ready|listening|started|compiled|localhost|Local:/i;

// ─── Helpers ────────────────────────────────────────────────────────────────

function spawnAsync(
  command: string,
  args: string[],
  options: SpawnOptions,
): {
  child: ReturnType<typeof spawn>;
  stdout: string;
  stderr: string;
} {
  let stdout = '';
  let stderr = '';
  const child = spawn(command, args, options);
  child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
  child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
  return { child, stdout: '', stderr: '' };
}

// ─── Process Manager ────────────────────────────────────────────────────────

export class ProcessManager {
  /**
   * Run a command and capture output.
   */
  async run(spec: ProcessSpec): Promise<ProcessResult> {
    const timeoutMs = spec.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBuffer = spec.maxBuffer ?? DEFAULT_MAX_BUFFER;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const child = spawn(spec.command, spec.args, {
        cwd: spec.cwd,
        env: { ...process.env, ...spec.env } as Record<string, string>,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      } as SpawnOptions);

      let stdout = '';
      let stderr = '';
      let killed = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          killed = true;
          try {
            child.kill('SIGTERM');
          } catch { /* process may already be gone */ }
        }, timeoutMs);
      }

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const combined = stdout + stderr;
        const status: ProcessStatus = killed
          ? 'timeout'
          : code === 0
            ? 'success'
            : 'failure';

        resolve({
          exitCode: code ?? 1,
          status,
          stdout: stdout.slice(0, maxBuffer),
          stderr: stderr.slice(0, maxBuffer),
          combined: combined.slice(0, maxBuffer),
          durationMs,
          timedOut: killed,
          pid: child.pid,
        });
      });

      child.on('error', (err: Error) => {
        if (timer) clearTimeout(timer);
        resolve({
          exitCode: 1,
          status: 'failure',
          stdout,
          stderr: stderr + '\n' + String(err),
          combined: stdout + stderr + '\n' + String(err),
          durationMs: Date.now() - startTime,
          timedOut: false,
          pid: child.pid,
        });
      });
    });
  }

  /**
   * Run npm/yarn/pnpm install.
   */
  async install(
    cwd: string,
    packageManager: string = 'npm',
    env?: Record<string, string>,
  ): Promise<ProcessResult> {
    return this.run({
      cwd,
      command: packageManager,
      args: ['install'],
      env,
      label: `${packageManager} install`,
      timeoutMs: 300_000,
    });
  }

  /**
   * Run build command.
   */
  async build(
    cwd: string,
    buildCommand: string = 'npm run build',
    env?: Record<string, string>,
  ): Promise<ProcessResult> {
    const parts = buildCommand.split(/\s+/);
    return this.run({
      cwd,
      command: parts[0]!,
      args: parts.slice(1),
      env,
      label: 'build',
      timeoutMs: 300_000,
    });
  }

  /**
   * Run test command.
   */
  async test(
    cwd: string,
    testCommand: string = 'npm test',
    env?: Record<string, string>,
  ): Promise<ProcessResult> {
    const parts = testCommand.split(/\s+/);
    return this.run({
      cwd,
      command: parts[0]!,
      args: parts.slice(1),
      env,
      label: 'test',
      timeoutMs: 180_000,
    });
  }

  /**
   * Start a dev server and wait for it to be ready.
   */
  async startDevServer(
    cwd: string,
    command: string = 'npm run dev',
    port: number = 3000,
    env?: Record<string, string>,
  ): Promise<DevServerHandle> {
    const parts = command.split(/\s+/);
    const child = spawn(parts[0]!, parts.slice(1), {
      cwd,
      env: { ...process.env, ...env, PORT: String(port) } as Record<string, string>,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    } as SpawnOptions);

    let resolveReady!: () => void;
    let rejectReady!: (err: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const startupTimer = setTimeout(() => {
      rejectReady(new Error(`Dev server did not start within ${DEV_SERVER_STARTUP_TIMEOUT_MS}ms`));
    }, DEV_SERVER_STARTUP_TIMEOUT_MS);

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      if (DEV_SERVER_READY_PATTERN.test(line)) {
        clearTimeout(startupTimer);
        resolveReady();
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const line = data.toString();
      if (DEV_SERVER_READY_PATTERN.test(line)) {
        clearTimeout(startupTimer);
        resolveReady();
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(startupTimer);
      rejectReady(err);
    });

    child.on('close', () => {
      clearTimeout(startupTimer);
    });

    const url = `http://localhost:${port}`;

    return {
      pid: child.pid!,
      port,
      url,
      isRunning: () => !child.killed && child.exitCode === null,
      ready,
      kill: async () => {
        if (!child.killed) {
          child.kill('SIGTERM');
          await new Promise<void>((resolve) => {
            child.on('close', () => resolve());
            setTimeout(() => {
              try { child.kill('SIGKILL'); } catch { /* noop */ }
              resolve();
            }, 5000);
          });
        }
      },
    };
  }

  /**
   * Start a static file server for preview.
   */
  async startPreviewServer(
    directory: string,
    port: number = 0,
    host: string = 'localhost',
  ): Promise<DevServerHandle> {
    const serverScript = `
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const dir = ${JSON.stringify(directory)};
      const host = ${JSON.stringify(host)};
      const mimeTypes = {
        '.html': 'text/html', '.js': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json',
        '.png': 'image/png', '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
        '.woff': 'font/woff', '.woff2': 'font/woff2',
      };
      const server = http.createServer((req, res) => {
        let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        fs.readFile(filePath, (err, data) => {
          if (err) {
            fs.readFile(path.join(dir, 'index.html'), (err2, data2) => {
              if (err2) { res.writeHead(404); res.end('Not found'); return; }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(data2);
            });
            return;
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });
      server.listen(0, host, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        console.log('PREVIEW_READY:' + port);
      });
    `;

    const scriptPath = `${directory}/.preview-server.cjs`;
    fs.writeFileSync(scriptPath, serverScript);

    const child = spawn('node', [scriptPath], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    } as SpawnOptions);

    let resolvedPort = port;
    let resolveReady!: () => void;
    let rejectReady!: (err: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    const startupTimer = setTimeout(() => {
      rejectReady(new Error('Preview server did not start within 10s'));
    }, 10_000);

    child.stdout?.on('data', (data: Buffer) => {
      const line = data.toString();
      const match = line.match(/PREVIEW_READY:(\d+)/);
      if (match?.[1]) {
        resolvedPort = parseInt(match[1], 10);
        clearTimeout(startupTimer);
        resolveReady();
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(startupTimer);
      rejectReady(err);
    });

    child.on('close', () => {
      clearTimeout(startupTimer);
      try { fs.unlinkSync(scriptPath); } catch { /* noop */ }
    });

    const url = `http://${host}:${resolvedPort}`;

    return {
      pid: child.pid!,
      port: resolvedPort,
      url,
      isRunning: () => !child.killed && child.exitCode === null,
      ready,
      kill: async () => {
        if (!child.killed) {
          child.kill('SIGTERM');
          try { fs.unlinkSync(scriptPath); } catch { /* noop */ }
          await new Promise<void>((resolve) => {
            child.on('close', () => resolve());
            setTimeout(() => {
              try { child.kill('SIGKILL'); } catch { /* noop */ }
              resolve();
            }, 3000);
          });
        }
      },
    };
  }
}

export function createProcessManager(): ProcessManager {
  return new ProcessManager();
}
