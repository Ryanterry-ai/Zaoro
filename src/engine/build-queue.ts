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
    jobTimeoutMs: 15 * 60 * 1000, // 15 minutes (LLM retries need room)
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

    const engineRoot = path.resolve(this.workspaceBase, '..');

    // Write config files
    const configPath = path.join(engineRoot, `.build-config-${job.id}.json`);
    const promptPath = path.join(engineRoot, `.build-prompt-${job.id}.json`);
    const { provider, apiKey } = (await import('../core/resolve-llm-config.js')).resolveLLMConfig();
    fs.writeFileSync(configPath, JSON.stringify({ provider, apiKey }), 'utf-8');
    fs.writeFileSync(promptPath, JSON.stringify({ id: job.workspaceId, prompt: job.prompt, type: job.pipeline ? 'pipeline' : 'build-website', pipeline: !!job.pipeline }), 'utf-8');

    const buildScript = `
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = ${JSON.stringify(this.workspaceBase)};
const wsDir = path.join(WS_BASE, ${JSON.stringify(job.workspaceId)});

const PROGRESS_FILE = path.join(wsDir, '.progress');
const _progressEvents = [];
function writeProgress(step, type, message, metadata) {
  _progressEvents.push({ step, type, message, ts: Date.now(), metadata: metadata || undefined });
  // Read-merge-write to avoid clobbering orchestrator's ProgressEmitter events
  try {
    let existing = [];
    try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8'); existing = JSON.parse(raw); } catch {}
    // Deduplicate by ts+step+message
    const seen = new Set(existing.map(e => e.ts + '|' + e.step + '|' + e.message));
    const newEvents = _progressEvents.filter(e => !seen.has(e.ts + '|' + e.step + '|' + e.message));
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...existing, ...newEvents]), 'utf-8');
  } catch {}
}
function emitLLM(step, type, llmDetail) { writeProgress(step, type, \`\${type}: \${llmDetail.provider}/\${llmDetail.model}\`, { llm: llmDetail }); }

// Heartbeat: write a timestamp file immediately and every 10s so /progress can detect stale builds
const HEARTBEAT_FILE = path.join(wsDir, '.build-heartbeat');
fs.mkdirSync(wsDir, { recursive: true });
fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()), 'utf-8');
const _heartbeatInterval = setInterval(() => {
  try { fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()), 'utf-8'); } catch {}
}, 10000);
process.on('exit', () => clearInterval(_heartbeatInterval));

// Intercept console.log to capture gateway/orchestrator events
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

function interceptConsole(prefix, type) {
  return function(...args) {
    const msg = args.join(' ');
    origLog.apply(console, args);
    // Strip [STDERR] prefix from forwarded stderr
    const clean = msg.replace(/^\[STDERR\]\s*/, '');
    if (clean.includes('[gateway]')) {
      if (clean.includes('LLM call:') || clean.includes('Combined LLM call:')) {
        const match = clean.match(/(\\w[\\w-]+)\\/(\\S+)\\s*\\(attempt\\s*(\\d+)\\)/);
        if (match) emitLLM('llm', 'llm_request', { provider: match[1], model: match[2], attempt: parseInt(match[3]), maxAttempts: 5 });
      } else if (clean.includes('succeeded:') && clean.includes('patches')) {
        const match = clean.match(/(\\d+)\\s*patches/);
        writeProgress('llm', 'success', clean, { patchCount: match ? parseInt(match[1]) : 0 });
      } else if (clean.includes('Gemini fallback')) {
        emitLLM('llm', 'llm_fallback', { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini' });
      } else if (clean.includes('Transient error')) {
        const match = clean.match(/\\((.+?)\\)/);
        writeProgress('llm', 'retrying', clean, { error: match ? match[1] : 'unknown' });
      } else if (clean.includes('All LLM providers failed')) {
        writeProgress('llm', 'warning', clean);
      } else if (clean.includes('Research context added')) {
        writeProgress('research', 'success', clean);
      } else if (clean.includes('Generated') && clean.includes('domain fallback')) {
        writeProgress('architect', 'info', clean);
      } else if (clean.includes('Self-evaluation')) {
        writeProgress('llm', 'eval', clean);
      }
    } else if (clean.includes('[content-research]')) {
      if (clean.includes('Crawling:')) {
        const url = clean.replace('[content-research] Crawling:', '').trim();
        writeProgress('research', 'crawling', 'Crawling: ' + url, { url });
      } else if (clean.includes('Results:')) {
        writeProgress('research', 'completed', clean);
      }
    } else if (clean.includes('[orchestrator]')) {
      if (clean.includes('BRE v2 blueprint:')) writeProgress('architect', 'completed', clean);
      else if (clean.includes('Blueprint:')) writeProgress('architect', 'completed', clean);
      else if (clean.includes('BI analysis complete')) writeProgress('bi', 'completed', clean);
      else if (clean.includes('Content research:')) writeProgress('research', 'completed', clean);
      else if (clean.includes('Compiling page')) writeProgress('compile', 'info', clean);
      else if (clean.includes('compiled successfully')) writeProgress('compile', 'success', clean);
      else if (clean.includes('Page ') && clean.includes(' patches')) writeProgress('compile', 'patching', clean);
      else if (clean.includes('Page ') && clean.includes('failed')) writeProgress('compile', 'failed', clean);
      else if (clean.includes('Build partial') || clean.includes('Build complete')) writeProgress('compile', 'completed', clean);
      else if (clean.includes('Selected patch:')) writeProgress('compile', 'applying', clean);
      else if (clean.includes('Loaded industry model')) writeProgress('research', 'cached', clean);
      else if (clean.includes('Blueprint warnings:')) writeProgress('architect', 'warning', clean);
      else if (clean.includes('Renderer warnings:')) writeProgress('compile', 'warning', clean);
    } else if (clean.includes('[domain-synth]')) {
      if (clean.includes('Detected:') || clean.includes('Using resolved pattern:')) writeProgress('architect', 'info', clean);
      else writeProgress('architect', 'info', clean);
    } else if (clean.includes('[bi-llm]')) {
      writeProgress('bi', 'info', clean);
    } else if (clean.includes('[BOS]') || clean.includes('[bre-v2]')) {
      writeProgress('architect', 'info', clean);
    } else if (clean.includes('[spec-writer]')) {
      writeProgress('compile', 'info', clean);
    } else if (clean.includes('[worktree]')) {
      if (clean.includes('completed')) writeProgress('compile', 'success', clean);
      else if (clean.includes('failed')) writeProgress('compile', 'failed', clean);
      else writeProgress('compile', 'info', clean);
    } else if (clean.includes('[assembly]')) {
      if (clean.includes('complete') || clean.includes('cleaned')) writeProgress('compile', 'success', clean);
      else writeProgress('compile', 'info', clean);
    } else if (clean.includes('[self-heal]') || clean.includes('[ast-patch]')) {
      writeProgress('compile', 'healing', clean);
    } else if (clean.includes('[domain]') && clean.includes('hasFunction')) {
      // Skip noisy per-file domain checks — only log summary
    } else if (clean.includes('[telemetry]') || clean.includes('PostHog') || clean.includes('posthog') || clean.includes('Sentry') || clean.includes('sentry')) {
      // Skip telemetry warnings — they're non-blocking and pollute build progress
    } else if (clean.includes('Error') || clean.includes('error')) {
      writeProgress('error', 'warning', clean.slice(0, 200));
    }
  };
}

console.log = interceptConsole('', 'info');
console.warn = interceptConsole('', 'warning');
console.error = interceptConsole('', 'error');

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-config-${job.id}.json`)}), 'utf-8'));
const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-prompt-${job.id}.json`)}), 'utf-8'));

// Always use DeterministicOrchestratorV4 (canonical orchestrator)
(async () => {
const { DeterministicOrchestratorV4 } = await import('./src/agents/deterministic-orchestrator-v4.js');
const orch = new DeterministicOrchestratorV4(wsDir);
try {
  writeProgress('init', 'started', 'Build started — analyzing prompt');
  writeProgress('init', 'info', 'Loading orchestrator and dependencies...');
  const tBi = Date.now();
  await orch.processGenerationIntent(payload.id, { type: payload.type, prompt: payload.prompt }, { provider: config.provider, apiKey: config.apiKey });
  writeProgress('compile', 'info', 'Compilation finished', { duration: Date.now() - tBi });

  // ═══ SELF-HEALING: Auto-repair TypeScript errors ═══════════════════════
  try {
    const { SelfHealingEngine } = await import('./src/engine/self-healing-engine.js');
    const { LLMGateway } = await import('./src/core/llm-gateway.js');
    const healer = new SelfHealingEngine(3, 20);
    const gw = new LLMGateway({ provider: config.provider, apiKey: config.apiKey });
    const result = await healer.heal(wsDir, gw, payload.prompt, (iter, errs, msg) => {
      writeProgress('self-heal', 'info', 'SelfHealing iteration ' + iter + ': ' + errs + ' errors — ' + msg);
    });
    writeProgress('self-heal', 'completed', 'SelfHealing: ' + result.errorsFixed + ' errors fixed in ' + result.iterations + ' iterations');
  } catch (healErr) {
    writeProgress('self-heal', 'warning', 'SelfHealing skipped: ' + (healErr.message || '').slice(0, 200));
  }

  // ═══ FAST PATH: Preview first (20-40s) ═══════════════════════════════════════
  // Generate preview immediately so the user sees their app ASAP.
  // Quality gates run in background after preview is delivered.
  writeProgress('preview', 'started', 'Rendering preview...');
  try {
    const esbuild = await import('esbuild');
    const { chromium } = await import('playwright');
    const targetFile = path.join(wsDir, 'src', 'app', 'page.tsx');
    // Write both the keyed cache AND the root cache so server.ts finds it either way
    const cacheFile = path.join(wsDir, '.preview-cache-_.html');
    const rootCacheFile = path.join(wsDir, '.preview-cache.html');

    if (fs.existsSync(targetFile)) {
      const bundleResult = await esbuild.build({
        entryPoints: [targetFile],
        bundle: true,
        format: 'iife',
        globalName: '__preview',
        target: 'es2020',
        jsx: 'transform',
        loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.gif': 'dataurl' },
        external: ['react', 'react-dom'],
        write: false,
        alias: { '@': path.join(wsDir, 'src') },
        plugins: [{
          name: 'globals-shim',
          setup(build) {
            build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'globals' }));
            build.onResolve({ filter: /^react-dom$/ }, () => ({ path: 'react-dom', namespace: 'globals' }));
            build.onLoad({ filter: /^react$/, namespace: 'globals' }, () => ({ contents: 'module.exports = window.React;' }));
            build.onLoad({ filter: /^react-dom$/, namespace: 'globals' }, () => ({ contents: 'module.exports = window.ReactDOM;' }));
          },
        }],
      } as any);

      const bundledCode = bundleResult.outputFiles?.[0]?.text ?? '';
      if (!bundledCode.trim()) {
        writeProgress('preview', 'warning', 'Esbuild produced empty output, skipping preview');
      } else {
        // Escape </script> in bundled code to prevent premature HTML script tag closure.
        // Need TWO backslashes in the temp file so the replacement STRING VALUE
        // is <\/script> (backslash + /script>) — this prevents the HTML parser
        // from seeing </script> as a close-tag, while JS evaluates \/ as /.
        // Template literal + JS string nesting: source \\\\ → template \\ → JS \.
        const safeBundledCode = bundledCode.replace(/<\\\/script>/gi, '<\\\\/script>');
        const SCRIPT_END = '<' + '/script>';
        // Read vendor scripts to inline them (avoids URL resolution issues from about:blank)
        const vendorDir = path.join(process.cwd(), 'static', 'vendor');
        const vendorTailwind = fs.readFileSync(path.join(vendorDir, 'tailwind-cdn.min.js'), 'utf-8');
        const vendorReact = fs.readFileSync(path.join(vendorDir, 'react.production.min.js'), 'utf-8');
        const vendorReactDom = fs.readFileSync(path.join(vendorDir, 'react-dom.production.min.js'), 'utf-8');
        const previewHtmlParts = [
          '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preview</title>',
          '<script>' + vendorTailwind + SCRIPT_END,
          '<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;width:100%;overflow-x:hidden}body{background:#09090b;color:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}</style></head><body><div id="preview-root"></div>',
          '<script>' + vendorReact + SCRIPT_END,
          '<script>window.React = React;</script>',
          '<script>' + vendorReactDom + SCRIPT_END,
          '<script>window.ReactDOM = ReactDOM;</script>',
          '<script>',
          'window.__previewLog=[];function _log(m){window.__previewLog.push(m)}',
          '_log("Script starting");',
          'try{',
          safeBundledCode,
          '_log("Bundle executed, __preview type="+typeof __preview);',
          '}catch(be){_log("Bundle error: "+be.message);document.getElementById("preview-root").innerHTML="<div style=\\'padding:2rem;color:#f43f5e;\\'>Bundle error: "+be.message+"</div>"}',
          'try{var _mod=typeof __preview!=="undefined"?__preview:{};_log("Module keys: "+Object.keys(_mod).join(", "));var _comp=_mod.default||null;_log("default export: "+typeof _comp);',
          'if(!_comp||typeof _comp!=="function"){var _keys=Object.keys(_mod);for(var i=0;i<_keys.length;i++){var _val=_mod[_keys[i]];if(typeof _val==="function"&&(_val.prototype&&(_val.prototype.isReactComponent||_val.$typeof)||(_val.name&&_val.name[0]===_val.name[0].toUpperCase()&&_val.name[0]!=="_"))){_comp=_val;_log("Found component: "+_val.name);break;}}}',
          'if(!_comp||typeof _comp!=="function"){var _best=null,_bestScore=-1;var _keys2=Object.keys(_mod);for(var j=0;j<_keys2.length;j++){if(typeof _mod[_keys2[j]]==="function"){var _name=_keys2[j];var _sc=_name[0]===_name[0].toUpperCase()&&_name[0]!=="_"?10:0;if(_sc>_bestScore){_bestScore=_sc;_best=_mod[_keys2[j]];_log("Candidate function: "+_name);}}}if(_best){_comp=_best;}}',
          'if(_comp&&typeof _comp==="function"){_log("Rendering: "+(_comp.name||"anon"));var root=window.ReactDOM.createRoot(document.getElementById("preview-root"));root.render(window.React.createElement(_comp));_log("React.render called");}',
          'else{_log("No component found");document.getElementById("preview-root").innerHTML="<div style=\\'padding:2rem;color:#f43f5e;\\'>No renderable component. Keys: "+Object.keys(_mod).join(", ")+"</div>"}',
          '}catch(e){_log("Render error: "+e.message);document.getElementById("preview-root").innerHTML="<div style=\\'padding:2rem;color:#f43f5e;\\'>Render error: "+e.message+"</div>"}',
          SCRIPT_END + '</body></html>'
        ];
        const previewHtml = previewHtmlParts.join('');

        const consoleErrors: string[] = [];
        let previewFailed = false;
        const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        try {
          const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
          try {
            const page = await ctx.newPage();
            page.on('console', (msg: any) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
            page.on('pageerror', (err: any) => consoleErrors.push(err.message));
            await page.setContent(previewHtml, { waitUntil: 'networkidle', timeout: 30000 });
            const rendered = await page.waitForFunction(() => {
              const el = document.getElementById('preview-root');
              return el && el.children.length > 0;
            }, { timeout: 15000 }).catch(() => null);
            if (!rendered) {
              const previewLogs = await page.evaluate(() => (window as any).__previewLog || []).catch(() => []);
              console.warn('[preview] React mount failed. Diagnostic logs:', previewLogs);
              console.warn('[preview] Console errors:', consoleErrors);
              const pageContent = await page.evaluate(() => {
                const root = document.getElementById('preview-root');
                return root ? root.innerHTML : 'empty';
              });
              console.warn('[preview] #preview-root content:', pageContent);
              previewFailed = true;
            }
            // Wait for React to finish rendering (check for text content, not just children)
            await page.waitForFunction(() => {
              const el = document.getElementById('preview-root');
              return el && el.textContent && el.textContent.trim().length > 0;
            }, { timeout: 5000 }).catch(() => {});
            const renderedHtml = await page.content();
            fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');
            fs.writeFileSync(rootCacheFile, renderedHtml, 'utf-8'); // root cache for server.ts fallback lookup
            writeProgress('preview', 'done', 'Preview rendered — your app is live!');
          } finally {
            await ctx.close().catch(() => {});
          }
        } finally {
          await browser.close().catch(() => {});
        }
      }
    } else {
      writeProgress('preview', 'warning', 'No page.tsx found, skipping preview');
    }
  } catch (previewErr) {
    console.warn('[preview] Pre-render failed:', previewErr.message);
    console.warn('[preview] stack:', previewErr.stack || 'no stack');
    writeProgress('preview', 'warning', 'Preview render failed: ' + (previewErr.message || '').slice(0, 200));
  }

  // ═══ BACKGROUND QC: Quality gates (non-blocking) ═════════════════════════════
  // These run after preview is delivered. Failures don't block the user from
  // seeing their app — they just log warnings and feed the SelfHealingEngine.
  const { execSync } = await import('child_process');

  // Run quality gate (prisma generate + next build) in background
  const gateScript = path.resolve(process.cwd(), 'tools', 'quality-gate', 'index.cjs');
  try {
    writeProgress('gate', 'started', 'Running background quality gate...');
    execSync('node "' + gateScript + '" "' + wsDir + '"', { cwd: process.cwd(), timeout: 600000, stdio: 'pipe', env: { ...process.env, NODE_ENV: 'production' } });
    writeProgress('gate', 'passed', 'Quality gate passed');
  } catch (gateErr) {
    const stdout = gateErr.stdout?.toString() || '';
    const stderr = gateErr.stderr?.toString() || '';
    const fullOutput = stdout || stderr || gateErr.message;
    console.error('[quality-gate] FULL OUTPUT:', fullOutput);
    // Don't throw — log warning and continue. Preview is already live.
    writeProgress('gate', 'warning', 'Quality gate issues (non-blocking): ' + fullOutput.slice(0, 500));
  }

  // Run content quality gate in background
  const contentGateScript = path.resolve(process.cwd(), 'tools', 'content-quality-gate', 'index.js');
  try {
    writeProgress('content-gate', 'started', 'Running content quality gate...');
    var cgOutput = execSync('node "' + contentGateScript + '" "' + wsDir + '"', { cwd: process.cwd(), timeout: 60000, encoding: 'utf-8' });
    var cgResult = JSON.parse(cgOutput.trim());
    if (cgResult.pass) {
      writeProgress('content-gate', 'passed', 'Content quality gate passed');
    } else {
      writeProgress('content-gate', 'warning', 'Content quality gate: ' + cgResult.generic + '/' + cgResult.components + ' generic (' + Math.round(cgResult.genericRatio * 100) + '%)');
    }
  } catch (cgErr) {
    // Script not found or parse errors — non-blocking
    writeProgress('content-gate', 'warning', 'Content quality gate: could not run, continuing');
  }

  writeProgress('done', 'completed', 'Build completed! Your application is ready.');
} catch (err) { writeProgress('error', 'error', 'Build failed: ' + (err.message || err)); process.exit(1); }

// Restore console INSIDE async IIFE so interception works during orchestrator execution
console.log = origLog;
console.warn = origWarn;
console.error = origError;

// Final flush — ensure all events are written before exit
try {
  let existing = [];
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8'); existing = JSON.parse(raw); } catch {}
  const seen = new Set(existing.map(e => e.ts + '|' + e.step + '|' + e.message));
  const newEvents = _progressEvents.filter(e => !seen.has(e.ts + '|' + e.step + '|' + e.message));
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...existing, ...newEvents]), 'utf-8');
} catch {}
})();
`;
    const scriptPath = path.join(engineRoot, `.build-temp-${job.id}.ts`);
    fs.writeFileSync(scriptPath, buildScript, 'utf-8');

    const tempFiles = [scriptPath, configPath, promptPath];

    const { exec } = await import('child_process');

    let child: ChildProcess;

    const cleanup = () => {
      for (const fp of tempFiles) {
        try {
          if (fp.endsWith('.ts') && fs.existsSync(fp)) {
            const debugCopy = fp.replace('.ts', '.debug.ts');
            fs.copyFileSync(fp, debugCopy);
          }
        } catch {}
        try { fs.unlinkSync(fp); } catch { /* already gone — fine */ }
      }
    };

    // Set up timeout
    const timeout = setTimeout(() => {
      if (this.running.has(job.id)) {
        console.error(`[queue] Build ${job.id} timed out after ${this.config.jobTimeoutMs}ms`);
        job.status = 'timeout';
        job.error = `Build timed out after ${this.config.jobTimeoutMs / 1000}s`;
        cleanup();
        this.finishJob(job);
        if (child.pid) {
          try { process.kill(child.pid, 'SIGTERM'); } catch {}
          setTimeout(() => {
            try { process.kill(child.pid!, 'SIGKILL'); } catch {}
          }, 5000);
        }
      }
    }, this.config.jobTimeoutMs);

    // Ensure workspace dir exists so debug log can be written
    fs.mkdirSync(wsDir, { recursive: true });

    const buildLogPath = path.join(wsDir, '.build-debug.log');
    const engineLogPath = path.join(engineRoot, `.build-debug-${job.id}.log`);
    child = exec(
      `npx tsx "${scriptPath}"`,
      { cwd: engineRoot, timeout: this.config.jobTimeoutMs + 10000, env: { ...process.env, NODE_NO_WARNINGS: '1' } }
    );
    job.pid = child.pid;

    // Capture child process output for debugging
    child.stdout?.on('data', (data: string) => {
      try { fs.appendFileSync(buildLogPath, data); } catch {}
      try { fs.appendFileSync(engineLogPath, data); } catch {}
    });
    child.stderr?.on('data', (data: string) => {
      try { fs.appendFileSync(buildLogPath, `[STDERR] ${data}`); } catch {}
      try { fs.appendFileSync(engineLogPath, `[STDERR] ${data}`); } catch {}
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
      cleanup();
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

      // Cleanup temp files only after child has fully exited.
      // tsx ESM resolution is async — deleting before the child reads the file
      // causes ERR_MODULE_NOT_FOUND. The cleanup() call here is safe because
      // the child process has already terminated.
      cleanup();

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

      // Clean up stale workspace temp files (only for non-running jobs)
      try {
        const engineRoot = path.resolve(this.workspaceBase, '..');
        const runningIds = new Set<string>();
        for (const j of this.running.values()) runningIds.add(j.id);
        for (const j of this.queue) runningIds.add(j.id);
        const files = fs.readdirSync(engineRoot);
        for (const f of files) {
          if (f.startsWith('.build-temp-') || f.startsWith('.build-config-') || f.startsWith('.build-prompt-')) {
            // Extract job id from filename: .build-temp-{id}.ts → {id}
            const match = f.match(/\.build-(?:temp|config|prompt)-(.+)\.(?:ts|json)$/);
            const fileJobId = match?.[1];
            if (fileJobId && runningIds.has(fileJobId)) continue; // skip — build still active
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
