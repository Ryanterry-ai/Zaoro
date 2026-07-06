// ─── Preview Server ─────────────────────────────────────────────────────────
//
// Serves built applications for preview. Supports static files,
// SPA routing, and port management.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessManager } from './process-manager.js';
import type { DevServerHandle, PreviewConfig, PreviewResult } from './types.js';

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

  /** Kill all active preview servers */
  async killAll(): Promise<void> {
    const kills = Array.from(this.activeServers.values()).map((h) => h.kill());
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
