import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { SandboxProvider } from './interface.js';
import type {
  RuntimeSpec,
  RuntimeInstance,
  CommandSpec,
  CommandResult,
  StreamChunk,
  HealthStatus,
  ResourceUsage,
  Snapshot,
  LogOptions,
  LogEntry,
  StopOptions,
  ProviderCapabilities,
} from '../types.js';

interface ProcessRuntime {
  instance: RuntimeInstance;
  process: ChildProcess | undefined;
  processDir: string;
  logBuffer: LogEntry[];
  startedAt: number;
}

export class LocalProcessProvider implements SandboxProvider {
  readonly name = 'local-process';
  readonly capabilities: ProviderCapabilities = {
    snapshots: false,
    resourceLimits: false,
    filesystemMount: true,
    portMapping: false,
    healthChecks: true,
    maxConcurrent: 20,
    environments: ['process'],
  };

  private runtimes = new Map<string, ProcessRuntime>();
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(os.tmpdir(), 'buildsame-runtimes');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private appendLog(runtimeId: string, stream: 'stdout' | 'stderr', message: string): void {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) return;
    const entry: LogEntry = { timestamp: Date.now(), stream, message };
    runtime.logBuffer.push(entry);
    if (runtime.logBuffer.length > 10000) {
      runtime.logBuffer.splice(0, runtime.logBuffer.length - 10000);
    }
  }

  private forwardOutput(child: ChildProcess, runtimeId: string): void {
    child.stdout?.on('data', (data: Buffer) => {
      this.appendLog(runtimeId, 'stdout', data.toString());
    });
    child.stderr?.on('data', (data: Buffer) => {
      this.appendLog(runtimeId, 'stderr', data.toString());
    });
  }

  async create(spec: RuntimeSpec): Promise<RuntimeInstance> {
    const processDir = path.join(this.baseDir, spec.id);
    if (!fs.existsSync(processDir)) {
      fs.mkdirSync(processDir, { recursive: true });
    }

    if (spec.mounts) {
      for (const mount of spec.mounts) {
        const targetPath = path.join(processDir, mount.target);
        if (!fs.existsSync(targetPath)) {
          fs.mkdirSync(targetPath, { recursive: true });
        }
      }
    }

    if (spec.env) {
      const envFile = path.join(processDir, '.env');
      const envContent = Object.entries(spec.env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      fs.writeFileSync(envFile, envContent);
    }

    const now = Date.now();
    const instance: RuntimeInstance = {
      id: spec.id,
      provider: this.name,
      status: 'created',
      spec,
      url: undefined,
      previewUrl: undefined,
      allocatedPort: undefined,
      workspacePath: processDir,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: undefined,
      resourceUsage: undefined,
      health: undefined,
    };

    const runtime: ProcessRuntime = {
      instance,
      process: undefined,
      processDir,
      logBuffer: [],
      startedAt: now,
    };

    this.runtimes.set(spec.id, runtime);
    return instance;
  }

  async start(runtimeId: string): Promise<RuntimeInstance> {
    const runtime = this.getRuntime(runtimeId);
    const spec = runtime.instance.spec;

    if (spec.command && spec.command.length > 0) {
      const cmd = spec.command[0]!;
      const args = spec.command.slice(1);
      const child = spawn(cmd, args, {
        cwd: runtime.processDir,
        env: { ...process.env, ...spec.env } as NodeJS.ProcessEnv,
      }) as unknown as ChildProcess;

      runtime.process = child;
      this.forwardOutput(child, runtimeId);

      child.on('exit', (code: number | null) => {
        this.appendLog(runtimeId, 'stdout', `[process exited with code ${code}]`);
      });
    }

    const now = Date.now();
    runtime.instance.status = 'running';
    runtime.instance.lastActivityAt = now;
    runtime.instance.url = spec.ports?.[0] ? `http://localhost:${spec.ports[0].container}` : undefined;

    return runtime.instance;
  }

  async stop(runtimeId: string, options?: StopOptions): Promise<void> {
    const runtime = this.getRuntime(runtimeId);
    if (runtime.process) {
      const killTimeout = options?.timeout ?? 5000;
      runtime.process.kill('SIGTERM');

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try {
            runtime.process?.kill('SIGKILL');
          } catch {
          }
          resolve();
        }, killTimeout);

        runtime.process?.on('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });

      runtime.process = undefined;
    }

    runtime.instance.status = 'stopped';
    runtime.instance.lastActivityAt = Date.now();
  }

  async destroy(runtimeId: string): Promise<void> {
    const runtime = this.getRuntime(runtimeId);

    try {
      await this.stop(runtimeId);
    } catch {
    }

    try {
      fs.rmSync(runtime.processDir, { recursive: true, force: true });
    } catch {
    }

    runtime.instance.status = 'destroyed';
    this.runtimes.delete(runtimeId);
  }

  async execute(runtimeId: string, commandSpec: CommandSpec): Promise<CommandResult> {
    const runtime = this.getRuntime(runtimeId);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const cmd = commandSpec.command[0]!;
      const args = commandSpec.command.slice(1);
      const child = spawn(cmd, args, {
        cwd: commandSpec.workingDir ?? runtime.processDir,
        env: { ...process.env, ...commandSpec.env, ...runtime.instance.spec.env } as NodeJS.ProcessEnv,
      }) as unknown as ChildProcess;

      this.forwardOutput(child, runtimeId);

      let stdout = '';
      let stderr = '';
      let truncated = false;

      const maxOut = commandSpec.maxOutput ?? 1024 * 1024;

      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        if (stdout.length + chunk.length > maxOut) {
          truncated = true;
          child.kill();
          return;
        }
        stdout += chunk;
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = commandSpec.timeout
        ? setTimeout(() => {
            child.kill();
            reject(new Error(`Command timed out after ${commandSpec.timeout}ms`));
          }, commandSpec.timeout)
        : undefined;

      child.on('close', (code: number | null) => {
        if (timer) clearTimeout(timer);
        runtime.instance.lastActivityAt = Date.now();
        const duration = Date.now() - startTime;
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
          duration,
          truncated,
        });
      });

      child.on('error', (err: Error) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });
    });
  }

  async *stream(runtimeId: string, commandSpec: CommandSpec): AsyncIterable<StreamChunk> {
    const runtime = this.getRuntime(runtimeId);
    const cmd = commandSpec.command[0]!;
    const args = commandSpec.command.slice(1);

    const child = spawn(cmd, args, {
      cwd: commandSpec.workingDir ?? runtime.processDir,
      env: { ...process.env, ...commandSpec.env, ...runtime.instance.spec.env } as NodeJS.ProcessEnv,
    }) as unknown as ChildProcess;

    const signalEmitter = new EventEmitter();
    let aborted = false;

    const timer = commandSpec.timeout
      ? setTimeout(() => {
          aborted = true;
          child.kill();
          signalEmitter.emit('abort');
        }, commandSpec.timeout)
      : undefined;

    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;

    const readStream = async function* (
      stream: NodeJS.ReadableStream | null,
      streamName: 'stdout' | 'stderr'
    ): AsyncIterable<StreamChunk> {
      if (!stream) return;
      for await (const chunk of stream) {
        if (aborted) break;
        yield {
          stream: streamName,
          data: (chunk as Buffer).toString(),
          timestamp: Date.now(),
        };
      }
    };

    try {
      for await (const chunk of readStream(stdoutStream, 'stdout')) {
        yield chunk;
      }
      for await (const chunk of readStream(stderrStream, 'stderr')) {
        yield chunk;
      }
    } finally {
      if (timer) clearTimeout(timer);
      child.kill();
    }
  }

  async health(runtimeId: string): Promise<HealthStatus> {
    const runtime = this.getRuntime(runtimeId);
    const now = Date.now();

    try {
      const result = await this.execute(runtimeId, { command: ['node', '-e', 'process.stdout.write("ok")'] });
      const base: HealthStatus = { status: 'healthy', lastChecked: now, error: undefined };
      if (result.exitCode !== 0) {
        base.status = 'degraded';
        base.error = `Health command exited with code ${result.exitCode}`;
      }
      return base;
    } catch (err) {
      return {
        status: 'unhealthy',
        lastChecked: now,
        error: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async resourceUsage(runtimeId: string): Promise<ResourceUsage> {
    const runtime = this.getRuntime(runtimeId);
    const now = Date.now();

    let memoryMB = 0;
    if (runtime.process) {
      try {
        const result = await this.execute(runtimeId, {
          command: process.platform === 'win32'
            ? ['powershell', '-Command', `(Get-Process -Id ${runtime.process.pid}).WorkingSet64`]
            : ['ps', '-o', 'rss=', '-p', `${runtime.process.pid}`],
        });
        memoryMB = parseInt(result.stdout.trim(), 10) || 0;
      } catch {
      }
    }

    return {
      cpuPercent: 0,
      memoryBytes: memoryMB * 1024,
      memoryPercent: 0,
      diskBytes: this.getDirSize(runtime.processDir),
      pids: runtime.process?.pid ? 1 : 0,
      networkRxBytes: 0,
      networkTxBytes: 0,
      timestamp: now,
    };
  }

  async copyIn(runtimeId: string, source: string, destination: string): Promise<void> {
    const runtime = this.getRuntime(runtimeId);
    const destPath = path.join(runtime.processDir, destination);

    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.cpSync(source, destPath, { recursive: true });
  }

  async copyOut(runtimeId: string, source: string, destination: string): Promise<void> {
    const runtime = this.getRuntime(runtimeId);
    const srcPath = path.join(runtime.processDir, source);

    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.cpSync(srcPath, destination, { recursive: true });
  }

  async snapshot(_runtimeId: string): Promise<Snapshot> {
    throw new Error('Snapshots not supported by LocalProcessProvider');
  }

  async restore(_snapshotId: string): Promise<RuntimeInstance> {
    throw new Error('Snapshots not supported by LocalProcessProvider');
  }

  async logs(runtimeId: string, options?: LogOptions): Promise<LogEntry[]> {
    const runtime = this.getRuntime(runtimeId);
    let entries = runtime.logBuffer;

    if (options?.stream && options.stream !== 'all') {
      entries = entries.filter((e) => e.stream === options.stream);
    }

    if (options?.since) {
      const since = options.since;
      entries = entries.filter((e) => e.timestamp >= since);
    }

    if (options?.tail && entries.length > options.tail) {
      entries = entries.slice(-options.tail);
    }

    return entries;
  }

  private getRuntime(runtimeId: string): ProcessRuntime {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime '${runtimeId}' not found`);
    }
    return runtime;
  }

  private getDirSize(dirPath: string): number {
    try {
      let totalSize = 0;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += this.getDirSize(fullPath);
        } else if (entry.isFile()) {
          totalSize += fs.statSync(fullPath).size;
        }
      }
      return totalSize;
    } catch {
      return 0;
    }
  }
}
