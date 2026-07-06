// ─── Preview Server ─────────────────────────────────────────────────────────
//
// Serves built applications for preview. Supports static files,
// SPA routing, and port management.
// ─────────────────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import { ProcessManager } from './process-manager.js';
import type { DevServerHandle, PreviewConfig, PreviewResult, TunnelInfo } from './types.js';

// ─── Port Manager ───────────────────────────────────────────────────────────

const MIN_PORT = 3000;
const MAX_PORT = 9999;
const usedPorts = new Set<number>();

function findAvailablePort(preferred?: number): number {
  if (preferred && !usedPorts.has(preferred)) {
    usedPorts.add(preferred);
    return preferred;
  }

  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    if (!usedPorts.has(port)) {
      usedPorts.add(port);
      return port;
    }
  }

  throw new Error('No available ports');
}

function releasePort(port: number): void {
  usedPorts.delete(port);
}

// ─── Preview Server ─────────────────────────────────────────────────────────

export class PreviewServer {
  private processManager: ProcessManager;
  private activeServers = new Map<number, DevServerHandle>();
  private activeTunnel: TunnelInfo | undefined;

  constructor(processManager: ProcessManager) {
    this.processManager = processManager;
  }

  /** Get list of active preview URLs */
  getActivePreviews(): { port: number; url: string }[] {
    return Array.from(this.activeServers.entries()).map(([port, handle]) => ({
      port,
      url: handle.url,
    }));
  }

  /** Get active tunnel URL if one exists */
  getTunnelUrl(): string | undefined {
    return this.activeTunnel?.url;
  }

  /** Kill all active preview servers and tunnel */
  async killAll(): Promise<void> {
    const kills = Array.from(this.activeServers.values()).map((h) => h.kill());
    if (this.activeTunnel) {
      kills.push(this.activeTunnel.kill());
      this.activeTunnel = undefined;
    }
    await Promise.all(kills);
    this.activeServers.clear();
    usedPorts.clear();
  }

  /** Kill a specific preview server */
  async kill(port: number): Promise<void> {
    const handle = this.activeServers.get(port);
    if (handle) {
      await handle.kill();
      this.activeServers.delete(port);
      releasePort(port);
    }
  }

  /**
   * Start a cloudflared tunnel to expose a local port publicly.
   * Returns the tunnel URL or undefined if cloudflared is not available.
   */
  async startTunnel(port: number, retries = 3): Promise<TunnelInfo | undefined> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await this.tryStartTunnel(port);
      } catch {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return undefined;
  }

  private async tryStartTunnel(port: number): Promise<TunnelInfo> {
    return new Promise((resolve, reject) => {
      const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        windowsHide: true,
      });

      let tunnelUrl: string | undefined;
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('cloudflared tunnel timed out'));
      }, 15000);

      const onData = (data: Buffer) => {
        const text = data.toString();
        const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch) {
          tunnelUrl = urlMatch[0];
          clearTimeout(timeout);
          child.stdout?.removeListener('data', onData);
          child.stderr?.removeListener('data', onData);

          const info: TunnelInfo = {
            url: tunnelUrl,
            kill: async () => {
              child.kill();
              if (child.pid && process.platform === 'win32') {
                try {
                  const { execSync } = await import('node:child_process');
                  execSync(`taskkill /PID ${child.pid} /F 2>nul`, { stdio: 'ignore' });
                } catch { /* ignore */ }
              }
            },
          };

          this.activeTunnel = info;
          resolve(info);
        }
      };

      child.stdout?.on('data', onData);
      child.stderr?.on('data', onData);

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!tunnelUrl) {
          reject(new Error(`cloudflared exited with code ${code ?? 'unknown'} and no tunnel URL found`));
        }
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`cloudflared failed to start: ${err.message}`));
      });
    });
  }

  /**
   * Start a preview server for a built application.
   */
  async start(config: PreviewConfig): Promise<PreviewResult> {
    const port = findAvailablePort(config.port);
    const host = config.host ?? 'localhost';

    const handle = await this.processManager.startPreviewServer(
      config.directory,
      port,
      host,
    );

    // Wait for server to be ready
    await handle.ready;

    this.activeServers.set(port, handle);

    // Auto-cleanup on server exit
    const cleanup = () => {
      this.activeServers.delete(port);
      releasePort(port);
    };
    handle.kill = (() => {
      const origKill = handle.kill;
      return async () => {
        await origKill();
        cleanup();
      };
    })() as () => Promise<void>;

    return {
      url: handle.url,
      port,
      ready: true,
      kill: handle.kill,
    };
  }

  /**
   * Start a dev server for a project.
   */
  async startDev(
    cwd: string,
    command?: string,
    port?: number,
    env?: Record<string, string>,
  ): Promise<PreviewResult> {
    const serverPort = findAvailablePort(port);
    const handle = await this.processManager.startDevServer(
      cwd,
      command ?? 'npm run dev',
      serverPort,
      env,
    );

    await handle.ready;
    this.activeServers.set(serverPort, handle);

    return {
      url: handle.url,
      port: serverPort,
      ready: true,
      kill: handle.kill,
    };
  }

  /**
   * Serve a directory and wait for first request.
   */
  async serve(directory: string): Promise<PreviewResult> {
    return this.start({ directory });
  }
}

export function createPreviewServer(processManager: ProcessManager): PreviewServer {
  return new PreviewServer(processManager);
}
