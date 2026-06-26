import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import type { ProgressEvent } from '../core/progress-emitter.js';

export interface BuildJob {
  id: string;
  workspaceId: string;
  prompt: string;
  pipeline?: boolean;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'timeout' | 'crashed';
  priority: number;
  createdAt: number;
  startedAt: number | undefined;
  completedAt: number | undefined;
  pid: number | undefined;
  memoryUsage: NodeJS.MemoryUsage | undefined;
  error: string | undefined;
  retryCount: number;
  maxRetries: number;
}

export interface BuildQueueConfig {
  maxConcurrent: number;
  jobTimeoutMs: number;
  memoryLimitMb: number;
  maxRetries: number;
  cleanupIntervalMs: number;
}

const DEFAULT_CONFIG: BuildQueueConfig = {
  maxConcurrent: 2,
  jobTimeoutMs: 5 * 60 * 1000, // 5 minutes
  memoryLimitMb: 512,
  maxRetries: 2,
  cleanupIntervalMs: 30 * 1000, // 30 seconds
};

export class BuildQueue extends EventEmitter {
  private queue: BuildJob[] = [];
  private running = new Map<string, BuildJob>();
  private completed = new Map<string, BuildJob>();
  private config: BuildQueueConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private workspaceBase: string;

  constructor(workspaceBase: string, config?: Partial<BuildQueueConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.workspaceBase = workspaceBase;
    this.startCleanup();
  }

  enqueue(job: Omit<BuildJob, 'status' | 'createdAt' | 'retryCount' | 'maxRetries' | 'startedAt' | 'completedAt' | 'pid' | 'memoryUsage' | 'error'>): BuildJob {
    const fullJob: BuildJob = {
      ...job,
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      startedAt: undefined,
      completedAt: undefined,
      pid: undefined,
      memoryUsage: undefined,
      error: undefined,
    };

    // Insert by priority (higher priority first)
    const idx = this.queue.findIndex(j => j.priority < fullJob.priority);
    if (idx === -1) this.queue.push(fullJob);
    else this.queue.splice(idx, 0, fullJob);

    console.log(`[queue] Enqueued build ${fullJob.id} (priority ${fullJob.priority}, queue size: ${this.queue.length})`);
    this.emit('enqueued', fullJob);
    this.processNext();
    return fullJob;
  }

  private processNext(): void {
    if (this.running.size >= this.config.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift()!;
    job.status = 'running';
    job.startedAt = Date.now();
    this.running.set(job.id, job);

    console.log(`[queue] Starting build ${job.id} (${this.running.size} running, ${this.queue.length} queued)`);
    this.emit('started', job);
    this.executeBuild(job);
  }

  private async executeBuild(job: BuildJob): Promise<void> {
    const wsDir = path.join(this.workspaceBase, job.workspaceId);
    fs.mkdirSync(wsDir, { recursive: true });

    const progressFile = path.join(wsDir, '.progress');
    fs.writeFileSync(progressFile, JSON.stringify([]), 'utf-8');

    const engineRoot = path.resolve(this.workspaceBase, '..');

    // Write config files
    const configPath = path.join(engineRoot, `.build-config-${job.id}.json`);
    const promptPath = path.join(engineRoot, `.build-prompt-${job.id}.json`);
    const provider = process.env.LLM_PROVIDER || 'openai';
    const apiKey = process.env.LLM_API_KEY || '';
    fs.writeFileSync(configPath, JSON.stringify({ provider, apiKey }), 'utf-8');
    fs.writeFileSync(promptPath, JSON.stringify({ id: job.workspaceId, prompt: job.prompt, type: job.pipeline ? 'pipeline' : 'build-website', pipeline: !!job.pipeline }), 'utf-8');

    const buildScript = `
import * as fs from 'fs';
import * as path from 'path';
import { ProgressEmitter } from './src/core/progress-emitter.js';

const WS_BASE = ${JSON.stringify(this.workspaceBase)};
const wsDir = path.join(WS_BASE, ${JSON.stringify(job.workspaceId)});

const pe = new ProgressEmitter(wsDir);

// Intercept console.log to capture gateway/orchestrator events
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

function interceptConsole(prefix, type) {
  return function(...args) {
    const msg = args.join(' ');
    origLog.apply(console, args);
    // Capture structured events from engine subsystems
    if (msg.includes('[gateway]')) {
      if (msg.includes('LLM call:') || msg.includes('Combined LLM call:')) {
        const match = msg.match(/(\\w[\\w-]+)\\/(\\S+)\\s*\\(attempt\\s*(\\d+)\\)/);
        if (match) pe.emitLLM('llm', 'llm_request', { provider: match[1], model: match[2], attempt: parseInt(match[3]), maxAttempts: 5 });
      } else if (msg.includes('succeeded:') && msg.includes('patches')) {
        const match = msg.match(/(\\d+)\\s*patches/);
        pe.emit('llm', 'success', msg, { patchCount: match ? parseInt(match[1]) : 0 });
      } else if (msg.includes('Gemini fallback')) {
        pe.emitLLM('llm', 'llm_fallback', { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini' });
      } else if (msg.includes('Transient error')) {
        const match = msg.match(/\\((.+?)\\)/);
        pe.emit('llm', 'retrying', msg, { error: match ? match[1] : 'unknown' });
      } else if (msg.includes('All LLM providers failed')) {
        pe.emit('llm', 'warning', msg);
      } else if (msg.includes('Research context added')) {
        pe.emit('research', 'success', msg);
      } else if (msg.includes('Generated') && msg.includes('domain fallback')) {
        pe.emit('architect', 'info', msg);
      }
    } else if (msg.includes('[content-research]')) {
      if (msg.includes('Crawling:')) {
        const url = msg.replace('[content-research] Crawling:', '').trim();
        pe.emit('research', 'crawling', 'Crawling: ' + url, { url });
      } else if (msg.includes('Results:')) {
        pe.emit('research', 'completed', msg);
      } else if (msg.includes('Found')) {
        pe.emit('research', 'info', msg);
      }
    } else if (msg.includes('[orchestrator]')) {
      if (msg.includes('Blueprint:')) {
        pe.emit('architect', 'completed', msg);
      } else if (msg.includes('BI analysis complete')) {
        pe.emit('bi', 'completed', msg);
      } else if (msg.includes('Content research:')) {
        pe.emit('research', 'completed', msg);
      } else if (msg.includes('Compiling page')) {
        pe.emit('compile', 'info', msg);
      } else if (msg.includes('compiled successfully')) {
        pe.emit('compile', 'success', msg);
      } else if (msg.includes('Build complete')) {
        pe.emit('compile', 'completed', msg);
      } else if (msg.includes('Combined LLM call failed')) {
        pe.emit('llm', 'warning', msg);
      }
    } else if (msg.includes('[domain-synth]')) {
      if (msg.includes('Detected:') || msg.includes('Using resolved pattern:')) {
        pe.emit('architect', 'info', msg);
      }
    } else if (msg.includes('[bi-llm]')) {
      pe.emit('bi', 'info', msg);
    }
  };
}

console.log = interceptConsole('', 'info');
console.warn = interceptConsole('', 'warning');
console.error = interceptConsole('', 'error');

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-config-${job.id}.json`)}), 'utf-8'));
const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-prompt-${job.id}.json`)}), 'utf-8'));

const usePipeline = payload.type === 'pipeline' || payload.pipeline === true;

if (usePipeline) {
  const { PipelineOrchestrator } = await import('./src/generation/pipeline-orchestrator.js');
  const orch = new PipelineOrchestrator(
    WS_BASE,
    { provider: config.provider, apiKey: config.apiKey },
    (step, msg) => pe.emit(step, 'info', msg),
    (step, msg) => pe.emit(step, 'info', msg),
  );
  try {
    if (config.apiKey && config.apiKey.trim() !== '') {
      pe.emit('init', 'started', 'Build started — using ' + config.provider + ' AI');
    } else {
      pe.emit('init', 'warning', 'No LLM API key — using template synthesis');
    }
    const t0 = Date.now();
    const result = await orch.run(payload.prompt);
    pe.phaseEnd('done', 'Pipeline completed', t0);
  } catch (err) { pe.emit('error', 'error', 'Pipeline failed: ' + (err.message || err)); process.exit(1); }
} else {
  const { DeterministicOrchestratorV4 } = await import('./src/agents/deterministic-orchestrator-v4.js');
  const orch = new DeterministicOrchestratorV4(WS_BASE);
  try {
    pe.emit('init', 'started', 'Build started — analyzing prompt');
    const tBi = pe.phaseStart('bi', 'Analyzing business requirements...');
    // The orchestrator emits its own events via console.log which we intercept
    await orch.processGenerationIntent(payload.id, { type: payload.type, prompt: payload.prompt }, { provider: config.provider, apiKey: config.apiKey });
    pe.phaseEnd('compile', 'Compiling and validating...', tBi);
    pe.emit('preview', 'info', 'Rendering preview...');
    pe.emit('done', 'completed', 'Build completed! Your application is ready.');
  } catch (err) { pe.emit('error', 'error', 'Build failed: ' + (err.message || err)); process.exit(1); }
}

// Restore console
console.log = origLog;
console.warn = origWarn;
console.error = origError;
`;
    const scriptPath = path.join(engineRoot, `.build-temp-${job.id}.ts`);
    fs.writeFileSync(scriptPath, buildScript, 'utf-8');

    const { exec } = await import('child_process');

    let child: ChildProcess;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (this.running.has(job.id)) {
        console.error(`[queue] Build ${job.id} timed out after ${this.config.jobTimeoutMs}ms`);
        job.status = 'timeout';
        job.error = `Build timed out after ${this.config.jobTimeoutMs / 1000}s`;
        this.finishJob(job);
        if (child.pid) {
          try { process.kill(child.pid, 'SIGTERM'); } catch {}
          setTimeout(() => {
            try { process.kill(child.pid!, 'SIGKILL'); } catch {}
          }, 5000);
        }
      }
    }, this.config.jobTimeoutMs);

    const buildLogPath = path.join(wsDir, '.build-debug.log');
    child = exec(
      `npx tsx .build-temp-${job.id}.ts`,
      { cwd: engineRoot, timeout: this.config.jobTimeoutMs + 10000, env: { ...process.env, NODE_NO_WARNINGS: '1' } }
    );
    job.pid = child.pid;

    // Capture child process output for debugging
    child.stdout?.on('data', (data: string) => {
      try { fs.appendFileSync(buildLogPath, data); } catch {}
    });
    child.stderr?.on('data', (data: string) => {
      try { fs.appendFileSync(buildLogPath, `[STDERR] ${data}`); } catch {}
    });

    // Memory monitoring
    const memCheck = setInterval(() => {
      if (child.pid) {
        try {
          const mem = process.memoryUsage();
          job.memoryUsage = mem;
          if (mem.heapUsed / 1024 / 1024 > this.config.memoryLimitMb) {
            console.warn(`[queue] Build ${job.id} memory usage high: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
          }
        } catch {}
      }
    }, 5000);

    child.on('error', (err) => {
      clearTimeout(timeout);
      clearInterval(memCheck);
      console.error(`[queue] Build ${job.id} child error:`, err.message);
      if (this.running.has(job.id)) {
        job.status = 'crashed';
        job.error = err.message;
        this.finishJob(job);
      }
    });

    child.on('exit', (code, signal) => {
      clearTimeout(timeout);
      clearInterval(memCheck);

      // Cleanup temp files
      try { fs.unlinkSync(scriptPath); } catch {}
      try { fs.unlinkSync(configPath); } catch {}
      try { fs.unlinkSync(promptPath); } catch {}

      if (!this.running.has(job.id)) return;

      if (job.status === 'timeout') return; // Already handled by timeout

      if (code === 0) {
        job.status = 'completed';
        console.log(`[queue] Build ${job.id} completed successfully`);
      } else {
        job.status = 'failed';
        job.error = `Process exited with code ${code}, signal ${signal}`;
        console.error(`[queue] Build ${job.id} failed: exit ${code}`);
      }

      this.finishJob(job);
    });
  }

  private finishJob(job: BuildJob): void {
    job.completedAt = Date.now();
    this.running.delete(job.id);
    this.completed.set(job.id, job);

    const duration = job.completedAt - (job.startedAt || job.createdAt);
    console.log(`[queue] Build ${job.id} finished: ${job.status} in ${duration}ms`);

    this.emit('finished', job);

    // Retry on crash/timeout if retries remain
    if ((job.status === 'crashed' || job.status === 'timeout') && job.retryCount < job.maxRetries) {
      console.log(`[queue] Retrying build ${job.id} (attempt ${job.retryCount + 2}/${job.maxRetries + 1})`);
      job.retryCount++;
      job.status = 'queued';
      job.startedAt = undefined;
      job.completedAt = undefined;
      job.pid = undefined;
      job.error = undefined;
      job.memoryUsage = undefined;
      this.queue.unshift(job); // High priority for retries
    }

    this.processNext();
  }

  getJob(id: string): BuildJob | undefined {
    return this.running.get(id) || this.completed.get(id) || this.queue.find(j => j.id === id);
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getRunningCount(): number {
    return this.running.size;
  }

  getStatus(): { queued: number; running: number; completed: number } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
    };
  }

  getDetailedStatus(): {
    queued: number;
    running: number;
    completed: number;
    jobs: Array<{
      id: string;
      workspaceId: string;
      status: BuildJob['status'];
      priority: number;
      createdAt: number;
      startedAt: number | undefined;
      completedAt: number | undefined;
      retryCount: number;
      error: string | undefined;
    }>;
  } {
    const summarize = (j: BuildJob) => ({
      id: j.id,
      workspaceId: j.workspaceId,
      status: j.status,
      priority: j.priority,
      createdAt: j.createdAt,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      retryCount: j.retryCount,
      error: j.error,
    });

    return {
      ...this.getStatus(),
      jobs: [
        ...this.queue.map(summarize),
        ...[...this.running.values()].map(summarize),
        ...[...this.completed.values()].slice(-20).map(summarize),
      ],
    };
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      // Clean up old completed jobs (keep last 100)
      if (this.completed.size > 100) {
        const entries = [...this.completed.entries()];
        const toDelete = entries.slice(0, entries.length - 100);
        for (const [id] of toDelete) {
          this.completed.delete(id);
        }
      }

      // Clean up stale workspace temp files
      try {
        const engineRoot = path.resolve(this.workspaceBase, '..');
        const files = fs.readdirSync(engineRoot);
        for (const f of files) {
          if (f.startsWith('.build-temp-') || f.startsWith('.build-config-') || f.startsWith('.build-prompt-')) {
            const fp = path.join(engineRoot, f);
            const stat = fs.statSync(fp);
            if (Date.now() - stat.mtimeMs > 10 * 60 * 1000) {
              try { fs.unlinkSync(fp); } catch {}
            }
          }
        }
      } catch {}
    }, this.config.cleanupIntervalMs);
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    // Kill all running builds
    for (const [id, job] of this.running) {
      if (job.pid) {
        try { process.kill(job.pid, 'SIGKILL'); } catch {}
      }
    }
    this.running.clear();
    this.queue = [];
  }
}
