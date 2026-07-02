import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { MCPServer } from './mcp/server.js';
import { BuildQueue } from './engine/build-queue.js';
import {
  createProject, getProject, listProjects, updateProjectStatus,
  createBuild, updateBuild, getBuilds,
  upsertWorkspace, getWorkspace, getWorkspaceFile, setWorkspaceFile,
  createMessage, getMessages,
  checkDatabaseConnection, isPersistenceAvailable,
} from './core/persistence.js';
import { CloneOrchestrator } from './cloning/clone-orchestrator-v2.js';
import { debugLog } from './core/debug-logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.resolve(__dirname, '..');

// Load .env from engine root
config({ path: path.join(ENGINE_ROOT, '.env') });
const WORKSPACE_BASE = path.join(ENGINE_ROOT, 'sandbox_workspaces');
const PROMPTS_DIR = path.join(ENGINE_ROOT, '.prompts');
const PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);
const VENDOR_DIR = path.join(ENGINE_ROOT, 'static', 'vendor');

// Ensure vendor dir with cached UMD builds for React, ReactDOM, Tailwind CDN.
// Downloads from CDN on first run — these are build-time dependencies, not runtime hot-links.
(async function ensureVendorAssets(): Promise<void> {
  if (!fs.existsSync(VENDOR_DIR)) fs.mkdirSync(VENDOR_DIR, { recursive: true });

  const assets: { filename: string; url: string }[] = [
    { filename: 'react.production.min.js', url: 'https://unpkg.com/react@18/umd/react.production.min.js' },
    { filename: 'react-dom.production.min.js', url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js' },
    { filename: 'tailwind-cdn.min.js', url: 'https://cdn.tailwindcss.com' },
  ];

  for (const asset of assets) {
    const dest = path.join(VENDOR_DIR, asset.filename);
    if (fs.existsSync(dest)) continue;
    try {
      const https = await import('node:https');
      await new Promise<void>((resolve, reject) => {
        https.get(asset.url, (res: any) => {
          if (res.statusCode && res.statusCode >= 300 && res.headers.location) {
            https.get(res.headers.location, (res2: any) => {
              const chunks: Buffer[] = [];
              res2.on('data', (c: Buffer) => chunks.push(c));
              res2.on('end', () => { fs.writeFileSync(dest, Buffer.concat(chunks)); resolve(); });
            }).on('error', (e: Error) => { console.warn(`[vendor] Failed ${asset.filename}:`, e.message); resolve(); });
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => { fs.writeFileSync(dest, Buffer.concat(chunks)); resolve(); });
        }).on('error', (e: Error) => { console.warn(`[vendor] Failed ${asset.filename}:`, e.message); resolve(); });
      });
    } catch { /* ignore */ }
  }
})();

// Initialize MCP server
const mcpServer = new MCPServer(WORKSPACE_BASE);

// Initialize build queue
const buildQueue = new BuildQueue(WORKSPACE_BASE, {
  maxConcurrent: parseInt(process.env.BUILD_MAX_CONCURRENT || '2', 10),
  jobTimeoutMs: parseInt(process.env.BUILD_TIMEOUT_MS || '300000', 10), // 5 min
  memoryLimitMb: parseInt(process.env.BUILD_MEMORY_LIMIT_MB || '512', 10),
  maxRetries: parseInt(process.env.BUILD_MAX_RETRIES || '2', 10),
});

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(data));
}

function html(res: http.ServerResponse, content: string, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(content);
}

function scanDir(dir: string, root: string, results: { name: string; path: string; isDirectory: boolean; size: number }[] = []): typeof results {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    results.push({ name: entry.name, path: relPath, isDirectory: entry.isDirectory(), size: entry.isDirectory() ? 0 : stat.size });
    if (entry.isDirectory()) scanDir(fullPath, root, results);
  }
  return results;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // GET / — Engine landing page
  if (method === 'GET' && url.pathname === '/') {
    return json(res, {
      name: 'build.same engine',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        create: 'POST /api/create',
        build: 'POST /api/workspace/:id/build',
        progress: 'GET /api/workspace/:id/progress',
        files: 'GET /api/workspace/:id/files',
        file: 'GET /api/workspace/:id/file?path=...',
        preview: 'GET /api/workspace/:id/preview',
        meta: 'GET /api/workspace/:id/meta',
        queue_status: 'GET /api/queue/status',
        clone: 'POST /api/workspace/:id/clone',
        mcp_tools: 'GET /api/mcp/tools',
        mcp_call: 'POST /api/mcp/call',
        mcp_scrape: 'POST /api/mcp/scrape',
        mcp_push: 'POST /api/mcp/push',
        bi_run: 'POST /api/bi/run',
        pipeline: 'POST /api/pipeline',
        clone_state: 'GET /api/workspace/:id/clone-state',
        download: 'GET /api/workspace/:id/download',
        screenshots: 'POST /api/workspace/:id/screenshots',
        screenshots_get: 'GET /api/workspace/:id/screenshots',
        verify: 'POST /api/workspace/:id/verify',
        visual_diff: 'POST /api/workspace/:id/visual-diff',
        visual_diff_get: 'GET /api/workspace/:id/visual-diff',
        verification: 'GET /api/workspace/:id/verification',
        deploy: 'POST /api/workspace/:id/deploy',
        debug_logs: 'GET /api/debug/logs',
        debug_logs_ws: 'GET /api/debug/logs/:workspaceId',
        debug_enable: 'POST /api/debug/enable',
        debug_disable: 'POST /api/debug/disable',
      },
    });
  }

  // GET /api/health
  if (method === 'GET' && url.pathname === '/api/health') {
    return json(res, { status: 'ok', uptime: process.uptime() });
  }

  // GET /api/debug/logs — Get debug logs from the pipeline
  if (method === 'GET' && url.pathname === '/api/debug/logs') {
    const entries = debugLog.getEntries();
    const format = url.searchParams.get('format') ?? 'json';

    if (format === 'text') {
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(debugLog.getFormattedLogs());
    }

    return json(res, {
      entries,
      count: entries.length,
      stages: [...new Set(entries.map(e => e.stage))],
    });
  }

  // GET /api/debug/logs/:workspaceId — Get debug logs for a specific workspace
  if (method === 'GET' && url.pathname.match(/^\/api\/debug\/logs\/[^/]+$/)) {
    const id = url.pathname.split('/')[4]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const logFile = path.join(wsDir, '.debug-log.json');

    if (!fs.existsSync(logFile)) {
      return json(res, { entries: [], count: 0, message: 'No debug logs found' });
    }

    try {
      const entries = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      return json(res, {
        entries,
        count: entries.length,
        stages: [...new Set(entries.map((e: any) => e.stage))],
      });
    } catch {
      return json(res, { entries: [], count: 0, error: 'Failed to parse debug logs' });
    }
  }

  // POST /api/debug/enable — Enable debug logging
  if (method === 'POST' && url.pathname === '/api/debug/enable') {
    process.env.DEBUG = 'true';
    const body = await readBody(req).catch(() => '{}');
    try {
      const parsed = JSON.parse(body);
      if (parsed.stages) {
        process.env.DEBUG_STAGES = Array.isArray(parsed.stages) ? parsed.stages.join(',') : parsed.stages;
      }
    } catch {}
    return json(res, {
      enabled: true,
      stages: process.env.DEBUG_STAGES || 'all',
      message: 'Debug logging enabled. Restart server to apply to all components.',
    });
  }

  // POST /api/debug/disable — Disable debug logging
  if (method === 'POST' && url.pathname === '/api/debug/disable') {
    process.env.DEBUG = 'false';
    return json(res, { enabled: false, message: 'Debug logging disabled.' });
  }

  // POST /api/bi/run — Business Intelligence Pipeline
  if (method === 'POST' && url.pathname === '/api/bi/run') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') {
        return json(res, { error: 'prompt is required' }, 400);
      }
      const { provider, apiKey } = (await import('./core/resolve-llm-config.js')).resolveLLMConfig();
      if (!apiKey) return json(res, { error: 'LLM_API_KEY not configured' }, 500);

      // DEPRECATED: BusinessIntelligencePipeline removed. Use /api/create instead.
      return json(res, { error: 'Deprecated — use POST /api/create with a prompt instead' }, 410);
    } catch (err: any) {
      console.error('[bi] Error:', err.message);
      return json(res, { error: err.message }, 500);
    }
  }

  // POST /api/pipeline — DEPRECATED, use /api/create
  if (method === 'POST' && url.pathname === '/api/pipeline') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') {
        return json(res, { error: 'prompt is required' }, 400);
      }
      // DEPRECATED: PipelineOrchestrator removed. Use /api/create instead.
      return json(res, { error: 'Deprecated — use POST /api/create instead' }, 410);
    } catch (err: any) {
      console.error('[pipeline] Error:', err.message);
      return json(res, { error: err.message }, 500);
    }
  }

  // POST /api/create
  if (method === 'POST' && url.pathname === '/api/create') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') return json(res, { error: 'Prompt is required' }, 400);
      const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const usePipeline = body.pipeline === true;
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PROMPTS_DIR, `${id}.json`), JSON.stringify({ id, type: usePipeline ? 'pipeline' : 'build-app', prompt: body.prompt, pipeline: usePipeline, createdAt: new Date().toISOString() }), 'utf-8');
      return json(res, { id, prompt: body.prompt, pipeline: usePipeline });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // POST /api/workspace/:id/build
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/build$/)) {
    const id = url.pathname.split('/')[3]!;
    console.log(`[server] Build request for: ${id}`);
    try {
      const promptFile = path.join(PROMPTS_DIR, `${id}.json`);
      if (!fs.existsSync(promptFile)) {
        console.log(`[server] No prompt file: ${promptFile}`);
        return json(res, { error: 'No prompt found' }, 404);
      }
      const payload = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));
      console.log(`[server] Prompt type: ${payload.type}, prompt: ${(payload.prompt || '').substring(0, 50)}`);

      if (payload.type === 'clone') {
        return json(res, { id, status: 'clone_in_progress' });
      }

      const prompt = payload.prompt as string;
      const usePipeline = payload.pipeline === true;

      // Check if build already in progress
      const existing = buildQueue.getJob(id);
      console.log(`[server] Existing job: ${existing ? existing.status : 'none'}`);
      if (existing && (existing.status === 'queued' || existing.status === 'running')) {
        console.log(`[server] Already building, returning early`);
        return json(res, { id, status: 'already_building', queueStatus: buildQueue.getStatus() });
      }

      // Enqueue the build
      const job = buildQueue.enqueue({
        id,
        workspaceId: id,
        prompt,
        pipeline: usePipeline,
        priority: 10,
      });

      const responseData = { id, status: 'build_started', jobId: job.id, queueStatus: buildQueue.getStatus() };
      console.log(`[server] Build enqueued, response: ${JSON.stringify(responseData)}`);
      return json(res, responseData);
    } catch (e: any) {
      console.error(`[server] Build error: ${e.message}`);
      return json(res, { error: e.message }, 500);
    }
  }

  // GET /api/queue/status
  if (method === 'GET' && url.pathname === '/api/queue/status') {
    if (url.searchParams.get('detailed') === 'true') {
      return json(res, buildQueue.getDetailedStatus());
    }
    return json(res, buildQueue.getStatus());
  }

  // GET /api/workspaces — List all workspaces
  if (method === 'GET' && url.pathname === '/api/workspaces') {
    try {
      if (!fs.existsSync(WORKSPACE_BASE)) return json(res, []);
      const dirs = fs.readdirSync(WORKSPACE_BASE, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => name.startsWith('ws-'));
      const workspaces = dirs.map(name => {
        const metaPath = path.join(WORKSPACE_BASE, name, '.meta.json');
        const centralPrompt = path.join(PROMPTS_DIR, `${name}.json`);
        let prompt = '';
        let createdAt = '';
        try {
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            prompt = meta.prompt || '';
            createdAt = meta.createdAt || '';
          }
          if (!prompt && fs.existsSync(centralPrompt)) {
            const pData = JSON.parse(fs.readFileSync(centralPrompt, 'utf-8'));
            prompt = pData.prompt || '';
            createdAt = pData.createdAt || '';
          }
          if (!createdAt) {
            const stat = fs.statSync(path.join(WORKSPACE_BASE, name));
            createdAt = stat.birthtime.toISOString();
          }
        } catch {}
        return { id: name, prompt: prompt.slice(0, 120), createdAt };
      });
      return json(res, workspaces.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch {
      return json(res, []);
    }
  }

  // GET /api/workspace/:id/meta
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/meta$/)) {
    const id = url.pathname.split('/')[3]!;
    const promptFile = path.join(PROMPTS_DIR, `${id}.json`);
    if (!fs.existsSync(promptFile)) {
      return json(res, { id, type: 'build', exists: false });
    }
    const payload = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));
    return json(res, {
      id,
      type: payload.type || 'build',
      prompt: payload.prompt || '',
      url: payload.url || undefined,
      exists: true,
      createdAt: payload.createdAt || undefined,
    });
  }

  // GET /api/workspace/:id/progress
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/progress$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);

    // New format: .clone-state.json (from CloneOrchestratorV2)
    const cloneStateFile = path.join(wsDir, '.clone-state.json');
    if (fs.existsSync(cloneStateFile)) {
      try {
        const events = JSON.parse(fs.readFileSync(cloneStateFile, 'utf-8'));
        const lastEvent = events[events.length - 1];
        const status = lastEvent?.phaseStatus === 'done' && lastEvent?.phase === 'complete'
          ? 'complete'
          : lastEvent?.phaseStatus === 'failed' ? 'failed' : 'in_progress';

        const phaseMap: Record<string, any> = {};
        for (const ev of events) {
          if (!phaseMap[ev.phase]) phaseMap[ev.phase] = { phase: ev.phase, status: ev.phaseStatus, items: [] };
          phaseMap[ev.phase].status = ev.phaseStatus;
          phaseMap[ev.phase].items.push({ message: ev.message, ts: ev.ts, data: ev.data });
        }

        return json(res, {
          steps: events.map((e: any) => ({ step: e.phase, message: e.message, ts: e.ts, data: e.data })),
          phases: events,
          phasesSummary: Object.values(phaseMap),
          status,
          eventCount: events.length,
        });
      } catch {}
    }

    // New format: .build-state.json (from PipelineOrchestrator)
    const buildStateFile = path.join(wsDir, '.build-state.json');
    if (fs.existsSync(buildStateFile)) {
      try {
        const buildState = JSON.parse(fs.readFileSync(buildStateFile, 'utf-8'));
        const lastEvent = buildState.events?.[buildState.events.length - 1];
        const status = buildState.success
          ? 'complete'
          : lastEvent?.stageStatus === 'failed' ? 'failed' : 'in_progress';

        return json(res, {
          steps: (buildState.events || []).map((e: any) => ({ step: e.stage, message: e.message, ts: e.ts, data: e.data })),
          phases: buildState.events || [],
          buildState,
          status,
          eventCount: buildState.events?.length || 0,
        });
      } catch {}
    }

    // Fallback: legacy format
    const progressFile = path.join(wsDir, '.progress');
    if (!fs.existsSync(progressFile)) {
      // Check for stale heartbeat — indicates a killed/restarted build process
      const heartbeatFile = path.join(wsDir, '.build-heartbeat');
      if (fs.existsSync(heartbeatFile)) {
        const lastBeat = parseInt(fs.readFileSync(heartbeatFile, 'utf-8'), 10);
        const ageMs = Date.now() - lastBeat;
        if (ageMs > 30000) {
          return json(res, {
            steps: [], pages: [], status: 'stalled',
            message: `Build process stopped responding ${Math.round(ageMs / 1000)}s ago — likely killed by a server restart. Retry the build.`,
          });
        }
      }
      return json(res, { steps: [], pages: [], status: 'in_progress' });
    }
    const rawSteps = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    const PHASE_LABELS: Record<string, string> = { engine: 'Compiler', llm: 'LLM Gateway', done: 'Complete', error: 'Failed' };
    const steps = rawSteps.map((s: any) => ({
      step: s.step,
      type: s.type || s.step,
      label: PHASE_LABELS[s.step] || s.step,
      message: s.message,
      ts: s.ts,
      data: s.data || null,
      metadata: s.metadata || null,
    }));
    const pageEvents = steps.filter((s: any) => s.message.startsWith('Page ') || s.message.includes('page') || s.step === 'done' || s.step === 'error');
    const lastStep = steps[steps.length - 1];
    const status = lastStep?.step === 'done' ? 'complete' : lastStep?.step === 'error' ? 'failed' : 'in_progress';

    const phasesFile = path.join(wsDir, '.clone-phases');
    let phases: any[] = [];
    try { if (fs.existsSync(phasesFile)) phases = JSON.parse(fs.readFileSync(phasesFile, 'utf-8')); } catch {}

    return json(res, { steps, pages: pageEvents, status, phases });
  }

  // GET /api/workspace/:id/file-stream — SSE for live file generation
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/file-stream$/)) {
    const id = url.pathname.split('/')[3];
    if (!id) return json(res, { error: 'Missing workspace id' }, 400);
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    const filePath = path.join(wsDir, '.generated-files.jsonl');
    let lastSize = 0;

    const sendFiles = () => {
      try {
        if (!fs.existsSync(filePath)) {
          res.write(`event: snapshot\ndata: []\n\n`);
          return;
        }
        const stat = fs.statSync(filePath);
        if (stat.size <= lastSize) return;
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(stat.size - lastSize);
        fs.readSync(fd, buf, 0, buf.length, lastSize);
        fs.closeSync(fd);
        lastSize = stat.size;
        const lines = buf.toString('utf-8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          res.write(`event: file\ndata: ${line}\n\n`);
        }
      } catch {}
    };

    res.write('event: connected\ndata: {}\n\n');
    sendFiles();

    const pollTimer = setInterval(sendFiles, 1000);
    const heartbeatTimer = setInterval(() => res.write(`:heartbeat\n\n`), 15000);

    req.on('close', () => {
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    });
    return;
  }

  // GET /api/workspace/:id/replay — Build replay manifest
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/replay$/)) {
    const id = url.pathname.split('/')[3];
    if (!id) return json(res, { error: 'Missing workspace id' }, 400);
    const replayDir = path.join(WORKSPACE_BASE, id, '.replay');
    const manifestPath = path.join(replayDir, 'manifest.json');
    if (!fs.existsSync(replayDir)) return json(res, { error: 'No replay data available', stages: [] });
    try {
      const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) : { stages: [] };
      const files = fs.readdirSync(replayDir).filter(f => f.endsWith('.json') && f !== 'manifest.json').sort();
      return json(res, { ...manifest, files, replayDir });
    } catch { return json(res, { error: 'Failed to read replay', stages: [] }); }
  }

  // GET /api/workspace/:id/replay/:stage — Individual replay stage
  const replayStageMatch = url.pathname.match(/^\/api\/workspace\/([^/]+)\/replay\/([^/]+)$/);
  if (method === 'GET' && replayStageMatch) {
    const [, wsId, stageFile] = replayStageMatch;
    if (!wsId || !stageFile) return json(res, { error: 'Missing params' }, 400);
    const filePath = path.join(WORKSPACE_BASE, wsId, '.replay', stageFile.endsWith('.json') ? stageFile : `${stageFile}.json`);
    if (!fs.existsSync(filePath)) return json(res, { error: 'Stage not found' }, 404);
    try {
      return json(res, JSON.parse(fs.readFileSync(filePath, 'utf-8')));
    } catch { return json(res, { error: 'Failed to read stage' }, 500); }
  }

  // GET /api/workspace/:id/report — Build report JSON
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/report$/)) {
    const id = url.pathname.split('/')[3];
    if (!id) return json(res, { error: 'Missing workspace id' }, 400);
    const reportPath = path.join(WORKSPACE_BASE, id, '.build-report.json');
    if (!fs.existsSync(reportPath)) return json(res, { error: 'No report available', status: 'pending' }, 404);
    try {
      const content = fs.readFileSync(reportPath, 'utf-8');
      return json(res, JSON.parse(content));
    } catch {
      return json(res, { error: 'Failed to read report' }, 500);
    }
  }

  // GET /api/workspace/:id/inspect — SSE stream for planning artifact inspection
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/inspect$/)) {
    const id = url.pathname.split('/')[3];
    if (!id) return json(res, { error: 'Missing workspace id' }, 400);
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    const inspectPath = path.join(wsDir, '.plan-inspect.json');

    const sendSnapshot = () => {
      try {
        if (!fs.existsSync(inspectPath)) {
          res.write(`event: snapshot\ndata: {"status":"pending"}\n\n`);
          return;
        }
        const content = fs.readFileSync(inspectPath, 'utf-8');
        const data = JSON.parse(content);
        res.write(`event: snapshot\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {}
    };

    // Send initial state and heartbeat
    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sendSnapshot();

    const pollTimer = setInterval(sendSnapshot, 2000);
    const heartbeatTimer = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    });
    return;
  }

  // GET /api/workspace/:id/events — SSE stream for live build progress
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/events$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    res.write('event: connected\ndata: {"status":"connected"}\n\n');

    const sources = [
      { path: path.join(wsDir, '.clone-state.json'), type: 'clone-state' },
      { path: path.join(wsDir, '.build-state.json'), type: 'build-state' },
      { path: path.join(wsDir, '.progress'), type: 'legacy' },
    ];

    let lastCounts: Record<string, number> = {};
    let heartbeatTimer: ReturnType<typeof setInterval>;

    const tick = () => {
      for (const src of sources) {
        try {
          if (!fs.existsSync(src.path)) continue;
          const content = fs.readFileSync(src.path, 'utf-8');
          const data = JSON.parse(content);
          const events: any[] = data.events || (Array.isArray(data) ? data : []);

          if (events.length > (lastCounts[src.path] || 0)) {
            const newEvents = events.slice(lastCounts[src.path] || 0);
            lastCounts[src.path] = events.length;

            for (const ev of newEvents) {
              const stage = ev.stage || ev.phase || ev.step || 'unknown';
              const status = ev.stageStatus || ev.phaseStatus || (ev.step === 'done' ? 'done' : ev.step === 'error' ? 'failed' : 'active');
              res.write(`event: progress\ndata: ${JSON.stringify({ ts: ev.ts, stage, status, message: ev.message, data: ev.data, _source: src.type, _id: id })}\n\n`);
            }

            const last = events[events.length - 1];
            const isComplete = last?.phaseStatus === 'done' && last?.phase === 'complete';
            const isBuildDone = data.success === true;
            const isStepDone = last?.step === 'done' || last?.phaseStatus === 'done' || data.success;
            const isFailed = last?.step === 'error' || last?.phaseStatus === 'failed';

            if (isComplete || isBuildDone || isStepDone) {
              res.write(`event: complete\ndata: {"status":"complete","message":"${(last?.message || '').replace(/"/g, '\\"')}"}\n\n`);
              clearInterval(pollTimer);
              clearInterval(heartbeatTimer);
              res.end();
              return;
            }
            if (isFailed || data.error) {
              res.write(`event: error\ndata: {"status":"failed","message":"${((last?.message || data.error) || '').replace(/"/g, '\\"')}"}\n\n`);
              clearInterval(pollTimer);
              clearInterval(heartbeatTimer);
              res.end();
              return;
            }
          }

          // Also detect completion from buildState directly
          if (data.success !== undefined && !data.events) {
            if (data.success) {
              res.write(`event: complete\ndata: {"status":"complete","message":"Build complete"}\n\n`);
              clearInterval(pollTimer);
              clearInterval(heartbeatTimer);
              res.end();
              return;
            }
          }
        } catch {}
      }
    };

    const pollTimer = setInterval(tick, 600);
    heartbeatTimer = setInterval(() => {
      try { res.write('event: heartbeat\ndata: {}\n\n'); } catch { clearInterval(pollTimer); clearInterval(heartbeatTimer); }
    }, 10000);

    req.on('close', () => {
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
    });

    return;
  }

  // GET /api/workspace/:id/files
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/files$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { files: [] });
    return json(res, { files: scanDir(wsDir, wsDir) });
  }

  // GET /api/workspace/:id/file?path=...
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/file$/)) {
    const id = url.pathname.split('/')[3]!;
    const filePath = url.searchParams.get('path');
    if (!filePath) return json(res, { error: 'path query param required' }, 400);
    const normalized = path.normalize(filePath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) return json(res, { error: 'Invalid path' }, 400);
    const fullPath = path.join(WORKSPACE_BASE, id, normalized);
    if (!fs.existsSync(fullPath)) return json(res, { error: 'File not found' }, 404);
    return json(res, { content: fs.readFileSync(fullPath, 'utf-8'), path: normalized });
  }

  // GET /_vendor/:file — Serve vendored React/ReactDOM/Tailwind locally (rule #4 compliance)
  if (method === 'GET' && url.pathname.startsWith('/_vendor/')) {
    const fileName = path.basename(url.pathname);
    const vendorFile = path.join(VENDOR_DIR, fileName);
    if (fs.existsSync(vendorFile)) {
      const ext = path.extname(fileName);
      const ct = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' });
      return res.end(fs.readFileSync(vendorFile));
    }
    return html(res, '/* Vendor file not found */', 404);
  }

  // GET /api/workspace/:id/preview — Multi-page aware preview
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/preview$/)) {
    const id = url.pathname.split('/')[3]!;
    const workspacePath = path.join(WORKSPACE_BASE, id);

    // Parse ?page=/about to support multi-page preview
    const pageParam = (typeof url.searchParams.get('page') === 'string' && url.searchParams.get('page')!.trim()) ? url.searchParams.get('page')!.trim() : '';
    const pageRoute = pageParam || '/';
    let relativePagePath: string;
    if (pageRoute === '/' || pageRoute === '/index' || pageRoute === '') {
      relativePagePath = 'src/app/page.tsx';
    } else {
      relativePagePath = path.join('src', 'app', pageRoute.replace(/^\//, ''), 'page.tsx');
    }
    // Also try index.tsx as fallback
    const pageFile = path.join(workspacePath, relativePagePath);
    const indexFile = path.join(workspacePath, 'src', 'app', pageRoute.replace(/^\//, ''), 'index.tsx');
    const targetFile = fs.existsSync(pageFile) ? pageFile : (fs.existsSync(indexFile) ? indexFile : null);

    // Cache key includes page route so different pages have separate caches
    const cacheKey = pageRoute.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cacheFile = path.join(workspacePath, `.preview-cache-${cacheKey}.html`);

    if (!fs.existsSync(workspacePath)) return html(res, '<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;"><h3>Preview Server Syncing</h3><p>Sandbox workspace setup is currently building. Please wait...</p></body></html>');
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      if (Date.now() - stat.mtimeMs < 600000) return html(res, fs.readFileSync(cacheFile, 'utf-8'));
    }
    if (!targetFile) return html(res, `<html><body style="background:#09090b;color:#f43f5e;font-family:sans-serif;padding:2rem;"><h3>Preview Not Available</h3><p>Page ${pageRoute} was not found in the generated project.</p></body></html>`);

    try {
      // Bundle the page + all imported components with esbuild, then render with Playwright
      const esbuild = await import('esbuild');
      const { chromium } = await import('playwright');

      // Use esbuild build API to bundle all imports (components, nav-data, etc.)
      // External: react + react-dom are vendored locally via /_vendor/ path
      const bundleResult = await esbuild.build({
        entryPoints: [targetFile],
        bundle: true,
        format: 'iife',
        globalName: '__preview',
        target: 'es2020',
        jsx: 'transform',
        loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css', '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.gif': 'dataurl' },
        external: ['react', 'react-dom'],
        globals: { 'react': 'React', 'react-dom': 'ReactDOM' },
        write: false,
        alias: {
          '@': path.join(workspacePath, 'src'),
        },
      } as any);

      const bundledCode = bundleResult.outputFiles?.[0]?.text ?? '';
      // Escape </script> in bundled code to prevent premature HTML script tag closure
      const safeBundledCode = bundledCode.split('<' + '/script>').join('<' + '/script' + '>');
      const SCRIPT_END = '<' + '/script>';

      const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview — ${pageRoute}</title>
  <script src="/_vendor/tailwind-cdn.min.js">${SCRIPT_END}</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; width: 100%; overflow-x: hidden; }
    body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>
  <div id="preview-root"></div>
  <script src="/_vendor/react.production.min.js">${SCRIPT_END}</script>
  <script src="/_vendor/react-dom.production.min.js">${SCRIPT_END}</script>
  <script>
    ${safeBundledCode}
    try {
      var _mod = typeof __preview !== 'undefined' ? __preview : {};
      var _comp = _mod.default || null;
      if (!_comp) {
        var _keys = Object.keys(_mod);
        for (var i = 0; i < _keys.length; i++) {
          var _val = _mod[_keys[i]];
          if (typeof _val === 'function' && _val.prototype && (_val.prototype.isReactComponent || _val.$$typeof)) { _comp = _val; break; }
        }
      }
      if (!_comp) {
        var _keys2 = Object.keys(_mod);
        for (var j = 0; j < _keys2.length; j++) {
          if (typeof _mod[_keys2[j]] === 'function') { _comp = _mod[_keys2[j]]; break; }
        }
      }
      if (_comp) {
        var root = ReactDOM.createRoot(document.getElementById('preview-root'));
        root.render(React.createElement(_comp));
      } else {
        document.getElementById('preview-root').innerHTML = '<div style="padding:2rem;color:#f43f5e;">No renderable component found in module exports.</div>';
      }
    } catch (e) {
      document.getElementById('preview-root').innerHTML = '<div style="padding:2rem;color:#f43f5e;">Render error: ' + (e.message || e) + '</div>';
    }
  ${SCRIPT_END}</script>
</body>
</html>`;

      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      // Capture console errors from the preview page
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => consoleErrors.push(err.message));

      await page.setContent(previewHtml, { waitUntil: 'networkidle', timeout: 30000 });
      const rendered = await page.waitForFunction(() => {
        const el = document.getElementById('preview-root');
        return el && el.children.length > 0;
      }, { timeout: 15000 }).catch(() => null);

      if (!rendered) {
        console.warn('[preview] React mount failed. Console errors:', consoleErrors);
        // Try to get any visible error from the page
        const pageContent = await page.evaluate(() => {
          const root = document.getElementById('preview-root');
          return root ? root.innerHTML : 'empty';
        });
        console.warn('[preview] #preview-root content:', pageContent);
      }

      await page.waitForTimeout(1000);

      const renderedHtml = await page.content();
      await ctx.close();
      await browser.close();

      fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return html(res, renderedHtml);
    } catch (renderErr: any) {
      console.error('[preview] render failed:', renderErr.message || renderErr);
      console.error('[preview] stack:', renderErr.stack || 'no stack');
      const fallbackSource = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf-8') : 'No source file found';
      return html(res, `<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;"><h3 style="color:#f43f5e;">Static Compiler Error</h3><pre style="background:#18181b;padding:1rem;border-radius:0.5rem;color:#f4f4f5;overflow-x:auto;">${fallbackSource.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
    }
  }

  // GET /api/mcp/tools - List available MCP tools
  if (method === 'GET' && url.pathname === '/api/mcp/tools') {
    return json(res, mcpServer.getToolSchemas());
  }

  // POST /api/mcp/call - Call an MCP tool
  if (method === 'POST' && url.pathname === '/api/mcp/call') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.tool || typeof body.tool !== 'string') return json(res, { error: 'tool parameter required' }, 400);
      const result = await mcpServer.callTool(body.tool, body.arguments || body.input || {});
      return json(res, { success: !result.isError, ...result });
    } catch (e: any) { return json(res, { success: false, error: e.message }, 500); }
  }

  // POST /api/mcp/scrape - Quick Playwright scrape
  if (method === 'POST' && url.pathname === '/api/mcp/scrape') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.url || typeof body.url !== 'string') return json(res, { error: 'url parameter required' }, 400);
      const result = await mcpServer.callTool('playwright_scrape', { url: body.url, waitFor: body.waitFor || 3000, fullPage: body.fullPage !== false });
      let analysis: Record<string, unknown> = {};
      if (!result.isError && result.content[0]?.text) {
        try {
          const parsed = JSON.parse(result.content[0].text);
          analysis = {
            title: parsed.title || '',
            routes: parsed.links?.slice(0, 10) || [],
            designTokens: {
              colors: parsed.styles?.colors || [],
              fonts: parsed.styles?.fonts || [],
              fontSizes: parsed.styles?.fontSizes || [],
              spacings: parsed.styles?.spacings || [],
              borderRadii: parsed.styles?.borderRadii || [],
              shadows: parsed.styles?.shadows || [],
            },
            elements: parsed.layout?.elements?.length || 0,
            images: parsed.images?.length || 0,
            links: parsed.links?.length || 0,
          };
        } catch {}
      }
      return json(res, { success: !result.isError, analysis });
    } catch (e: any) { return json(res, { success: false, error: e.message }, 500); }
  }

  // POST /api/mcp/push - Push workspace to GitHub
  if (method === 'POST' && url.pathname === '/api/mcp/push') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.workspaceId) {
        return json(res, { error: 'workspaceId required' }, 400);
      }
      if (!body.owner || !body.repo || !body.commitMessage) {
        return json(res, { success: true, skipped: true, reason: 'Missing remote URL or repository parameters' });
      }
      const wsPath = path.join(WORKSPACE_BASE, body.workspaceId);
      const result = await mcpServer.callTool('github_push', {
        workspacePath: wsPath,
        owner: body.owner,
        repo: body.repo,
        branch: body.branch || 'main',
        message: body.commitMessage,
        token: body.token,
      });
      return json(res, { success: !result.isError, ...result });
    } catch (e: any) { return json(res, { success: false, error: e.message }, 500); }
  }

  // ─── Website Clone Route ─────────────────────────────────────────

  // POST /api/workspace/:id/clone — Clone a website into the workspace
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/clone$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.url || typeof body.url !== 'string') {
        return json(res, { error: 'url parameter required' }, 400);
      }

      const wsDir = path.join(WORKSPACE_BASE, id);
      fs.mkdirSync(wsDir, { recursive: true });
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });

      fs.writeFileSync(
        path.join(PROMPTS_DIR, `${id}.json`),
        JSON.stringify({
          id,
          type: 'clone',
          url: body.url,
          prompt: `Clone ${body.url}`,
          createdAt: new Date().toISOString(),
        }),
        'utf-8',
      );

      // Reset progress
      const progressFile = path.join(wsDir, '.progress');
      fs.writeFileSync(progressFile, JSON.stringify([]), 'utf-8');

      const { provider, apiKey } = (await import('./core/resolve-llm-config.js')).resolveLLMConfig();

      // Fire-and-forget async clone
      const { exec } = await import('child_process');
      const cloneScript = `
import { CloneOrchestrator } from './src/cloning/clone-orchestrator-v2.js';
import * as fs from 'fs';
import * as path from 'path';
const WS_BASE = ${JSON.stringify(WORKSPACE_BASE)};
const wsDir = path.join(WS_BASE, ${JSON.stringify(id)});

// Write a progress file for backward compat with old UI
function log(step, msg, data) {
  const f = path.join(wsDir, '.progress');
  let s = [];
  try { if (fs.existsSync(f)) s = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  s.push({ step, message: msg, ts: Date.now(), data: data || null });
  fs.writeFileSync(f, JSON.stringify(s), 'utf-8');
}

// The new orchestrator writes to .clone-state.json automatically
// Also write backward-compat .progress and .clone-phases files
function phaseEvent(step, msg, data) {
  // backward compat
  const pf = path.join(wsDir, '.clone-phases');
  let phases = [];
  try { if (fs.existsSync(pf)) phases = JSON.parse(fs.readFileSync(pf, 'utf-8')); } catch {}
  phases.push({ step, message: msg, ts: Date.now(), data: data || null });
  fs.writeFileSync(pf, JSON.stringify(phases), 'utf-8');
}

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-config-${id}.json`)}), 'utf-8'));
const cloneOrch = new CloneOrchestrator(wsDir, { provider: config.provider, apiKey: config.apiKey }, log, phaseEvent);
try {
  log('clone', 'Starting deep website clone...');
  const result = await cloneOrch.clone(${JSON.stringify(body.url)}, { maxPages: ${JSON.stringify(body.options?.maxPages || 0)} });
  if (result.success) {
    log('done', 'Clone completed! ' + result.pages + ' pages, ' + result.assets + ' assets, ' + result.patches.length + ' files generated.');
  } else {
    log('error', 'Clone failed: ' + (result.error || 'unknown error'));
  }
} catch (err) { log('error', 'Clone failed: ' + (err.message || err)); }
`;
      const scriptPath = path.join(ENGINE_ROOT, `.clone-temp-${id}.ts`);
      const configPath = path.join(ENGINE_ROOT, `.build-config-${id}.json`);
      fs.writeFileSync(configPath, JSON.stringify({ provider, apiKey }), 'utf-8');
      fs.writeFileSync(scriptPath, cloneScript, 'utf-8');

      const child = exec(`npx tsx .clone-temp-${id}.ts`, { cwd: ENGINE_ROOT, timeout: 0, env: { ...process.env, NODE_NO_WARNINGS: '1' } });

      child.on('error', (err) => {
        console.error(`[engine] Clone child error for ${id}:`, err.message);
        try {
          let steps: any[] = [];
          try { steps = JSON.parse(fs.readFileSync(progressFile, 'utf-8')); } catch {}
          steps.push({ step: 'error', message: 'Clone process error: ' + err.message, ts: Date.now() });
          fs.writeFileSync(progressFile, JSON.stringify(steps), 'utf-8');
        } catch {}
      });

      child.on('exit', (code) => {
        console.log(`[engine] Clone child exited for ${id} with code ${code}`);
        try { fs.unlinkSync(scriptPath); } catch {}
        try { fs.unlinkSync(configPath); } catch {}
      });

      return json(res, { id, status: 'clone_started', url: body.url });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/workspace/:id/download — Download workspace as ZIP
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/download$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    try {
      const archiverModule = await import('archiver');
      const archiver = (archiverModule as any).default || archiverModule;

      const archive = archiver('zip', { zlib: { level: 6 } });

      // Handle archive errors BEFORE piping to prevent ERR_HTTP_HEADERS_SENT
      let headersSent = false;
      archive.on('error', (err: any) => {
        console.error('[download] Archive error:', err.message);
        if (!headersSent) {
          headersSent = true;
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Archive creation failed: ' + err.message }));
        }
      });

      archive.on('end', () => {
        console.log(`[download] Archive finalized for ${id}`);
      });

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${id}.zip"`,
        'Access-Control-Allow-Origin': '*',
      });
      headersSent = true;
      archive.pipe(res);

      // Add src/ directory
      const srcDir = path.join(wsDir, 'src');
      if (fs.existsSync(srcDir)) archive.directory(srcDir, 'src');

      // Add public/ directory
      const publicDir = path.join(wsDir, 'public');
      if (fs.existsSync(publicDir)) archive.directory(publicDir, 'public');

      // Add root config files
      for (const f of ['package.json', 'tsconfig.json', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs']) {
        const fp = path.join(wsDir, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: f });
      }

      await archive.finalize();
    } catch (e: any) {
      console.error('[download] Failed:', e.message);
      if (!res.headersSent) {
        return json(res, { error: e.message }, 500);
      }
    }
  }

  // GET /api/workspace/:id/clone-state — Full clone state (structured)
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/clone-state$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const stateFile = path.join(wsDir, '.clone-state.json');
    if (!fs.existsSync(stateFile)) return json(res, { events: [], status: 'pending' });
    try {
      const events = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      const lastEvent = events[events.length - 1];
      const status = lastEvent?.phaseStatus === 'done' && lastEvent?.phase === 'complete'
        ? 'complete' : lastEvent?.phaseStatus === 'failed' ? 'failed' : 'in_progress';
      return json(res, { events, status, count: events.length });
    } catch { return json(res, { events: [], status: 'error' }); }
  }

  // ─── Sprint B: Runtime Endpoints ──────────────────────────────────

  // POST /api/workspace/:id/screenshots — Capture screenshots of generated site
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/screenshots$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    try {
      const body = JSON.parse(await readBody(req));
      const port = body.port || 3456;

      const serverLog = (step: string, msg: string, data?: Record<string, unknown>) => {
        console.log(`[server:${step}] ${msg}`);
      };

      const { RuntimeManager } = await import('./engine/runtime-manager.js');
      const { ScreenshotRunner } = await import('./engine/screenshot-runner.js');
      const { BuildRunner } = await import('./engine/build-runner.js');

      const runtime = new RuntimeManager({ headless: true }, serverLog);
      const buildRunner = new BuildRunner(wsDir, { port }, serverLog);

      // Start dev server
      const devResult = await buildRunner.startDevServer();
      if (!devResult.running) {
        return json(res, { error: 'Failed to start dev server', output: devResult.startupOutput }, 500);
      }

      await runtime.start();
      const screenshotRunner = new ScreenshotRunner(wsDir, runtime, {}, serverLog);
      const manifest = await screenshotRunner.capture(devResult.url);

      await runtime.stop();
      await buildRunner.stopDevServer();

      return json(res, { success: true, manifest });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/workspace/:id/screenshots — Get screenshot manifest
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/screenshots$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const manifestPath = path.join(wsDir, 'screenshots', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return json(res, { screenshots: [], status: 'none' });
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return json(res, { manifest, status: 'ready' });
    } catch { return json(res, { screenshots: [], status: 'error' }); }
  }

  // POST /api/workspace/:id/verify — Run browser verification
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/verify$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    try {
      const body = JSON.parse(await readBody(req));
      const port = body.port || 3456;

      const serverLog = (step: string, msg: string, data?: Record<string, unknown>) => {
        console.log(`[server:${step}] ${msg}`);
      };

      const { RuntimeManager } = await import('./engine/runtime-manager.js');
      const { BrowserVerifier } = await import('./engine/browser-verifier.js');
      const { BuildRunner } = await import('./engine/build-runner.js');

      const runtime = new RuntimeManager({ headless: true }, serverLog);
      const buildRunner = new BuildRunner(wsDir, { port }, serverLog);

      const devResult = await buildRunner.startDevServer();
      if (!devResult.running) {
        return json(res, { error: 'Failed to start dev server', output: devResult.startupOutput }, 500);
      }

      await runtime.start();
      const verifier = new BrowserVerifier(runtime, {}, serverLog);

      // Verify all page routes
      const urls = (body.urls || ['http://localhost:' + port]).map((u: string) => u.startsWith('http') ? u : 'http://localhost:' + port + u);
      const result = await verifier.verify(urls);

      await runtime.stop();
      await buildRunner.stopDevServer();

      // Save verification report
      const reportPath = path.join(wsDir, '.verification-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

      return json(res, { success: true, result });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/workspace/:id/verification — Get verification report
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/verification$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const reportPath = path.join(wsDir, '.verification-report.json');
    if (!fs.existsSync(reportPath)) return json(res, { status: 'none' });
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      return json(res, { report, status: 'ready' });
    } catch { return json(res, { status: 'error' }); }
  }

  // POST /api/workspace/:id/visual-diff — Run visual diff against original site
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/visual-diff$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    try {
      const body = JSON.parse(await readBody(req));
      const originalUrl = body.originalUrl;
      if (!originalUrl) return json(res, { error: 'originalUrl required' }, 400);

      const serverLog = (step: string, msg: string, data?: Record<string, unknown>) => {
        console.log(`[server:${step}] ${msg}`);
      };

      const { VisualDiffEngine } = await import('./engine/visual-diff.js');
      const { LayoutDetector } = await import('./engine/layout-detector.js');

      const diffEngine = new VisualDiffEngine(wsDir, {}, serverLog);
      const layoutDetector = new LayoutDetector(serverLog);

      // Start clone's dev server for comparison
      const { BuildRunner } = await import('./engine/build-runner.js');
      const buildRunner = new BuildRunner(wsDir, { port: 3456 }, serverLog);
      const devResult = await buildRunner.startDevServer();

      if (!devResult.running) {
        return json(res, { error: 'Failed to start dev server for clone' }, 500);
      }

      const cloneUrl = `http://localhost:3456`;

      // Run visual diff
      const diffReport = await diffEngine.diff(originalUrl, cloneUrl);

      // Run layout detection
      const pw = await import('playwright');
      const browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext();

      const origPage = await context.newPage();
      await origPage.goto(originalUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      const origSections = await layoutDetector.detectSections(origPage);
      await origPage.close();

      const clonePage = await context.newPage();
      await clonePage.goto(cloneUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      const cloneSections = await layoutDetector.detectSections(clonePage);
      await clonePage.close();

      await context.close();
      await browser.close();
      await diffEngine.close();
      await buildRunner.stopDevServer();

      const layoutComparison = layoutDetector.compare(origSections, cloneSections);

      // Save report
      const reportPath = path.join(wsDir, '.visual-diff-report.json');
      fs.writeFileSync(reportPath, JSON.stringify({ diffReport, layoutComparison }, null, 2), 'utf-8');

      return json(res, {
        success: true,
        overallSimilarity: diffReport.overallSimilarity,
        structuralSimilarity: layoutComparison.structuralSimilarity,
        viewportResults: diffReport.viewportResults,
        sectionComparison: layoutComparison,
        issues: layoutComparison.issues,
      });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/workspace/:id/visual-diff — Get visual diff report
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/visual-diff$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const reportPath = path.join(wsDir, '.visual-diff-report.json');
    if (!fs.existsSync(reportPath)) return json(res, { status: 'none' });
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      return json(res, { report, status: 'ready' });
    } catch { return json(res, { status: 'error' }); }
  }

  // POST /api/workspace/:id/deploy — Deploy workspace to Vercel
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/deploy$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    if (!fs.existsSync(wsDir)) return json(res, { error: 'Workspace not found' }, 404);

    try {
      // Generate deploy configs
      const { execSync } = await import('child_process');
      const deployCodegen = path.join(ENGINE_ROOT, 'tools', 'deploy-codegen', 'index.cjs');
      execSync(`node "${deployCodegen}" tier-standard "${wsDir}" --platform vercel`, { timeout: 10000 });

      // Run vercel deploy in workspace directory
      const buf = execSync('npx vercel deploy --prod -y --scope upgraded-ai-factory-s-projects 2>&1', {
        cwd: wsDir,
        timeout: 120000,
        env: { ...process.env, VERCEL_PROJECT_ID: undefined }, // let vercel create new project
      });

      const output = Buffer.isBuffer(buf) ? buf.toString('utf-8') : String(buf);
      const urlMatch = output.match(/(https:\/\/[^\s]+\.vercel\.app)/);
      const deployUrl = urlMatch ? urlMatch[1] : output.trim();

      return json(res, { success: true, url: deployUrl, output });
    } catch (e: any) {
      return json(res, { error: e.message, stderr: e.stderr?.toString() || '' }, 500);
    }
  }

  // ─── Platform Persistence Routes ─────────────────────────────────

  // GET /api/health/db
  if (method === 'GET' && url.pathname === '/api/health/db') {
    try {
      if (!isPersistenceAvailable()) {
        return json(res, { status: 'unconfigured', database: 'not_configured' });
      }
      const ok = await checkDatabaseConnection();
      return json(res, { status: ok ? 'ok' : 'error', database: ok ? 'connected' : 'disconnected' });
    } catch (e: any) { return json(res, { status: 'error', error: e.message }, 500); }
  }

  // POST /api/projects
  if (method === 'POST' && url.pathname === '/api/projects') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.userId || !body.name || !body.prompt) {
        return json(res, { error: 'userId, name, and prompt required' }, 400);
      }
      const project = await createProject(body.userId, body.name, body.prompt, body.description);
      return json(res, project);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/projects/:id
  if (method === 'GET' && url.pathname.match(/^\/api\/projects\/[^/]+$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const project = await getProject(id);
      if (!project) return json(res, { error: 'Project not found' }, 404);
      return json(res, project);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/projects/:id/builds
  if (method === 'GET' && url.pathname.match(/^\/api\/projects\/[^/]+\/builds$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const builds = await getBuilds(id);
      return json(res, builds);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // POST /api/projects/:id/builds
  if (method === 'POST' && url.pathname.match(/^\/api\/projects\/[^/]+\/builds$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const body = JSON.parse(await readBody(req));
      const build = await createBuild(id, body.prompt || '', body.llmProvider);
      return json(res, build);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/projects/:id/messages
  if (method === 'GET' && url.pathname.match(/^\/api\/projects\/[^/]+\/messages$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const messages = await getMessages(id);
      return json(res, messages);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // POST /api/projects/:id/messages
  if (method === 'POST' && url.pathname.match(/^\/api\/projects\/[^/]+\/messages$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.role || !body.content) return json(res, { error: 'role and content required' }, 400);
      const message = await createMessage(id, body.role, body.content);
      return json(res, message);
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/projects/:id/workspace
  if (method === 'GET' && url.pathname.match(/^\/api\/projects\/[^/]+\/workspace$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const ws = await getWorkspace(id);
      if (!ws) return json(res, { error: 'Workspace not found' }, 404);
      return json(res, { files: ws.files });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // PUT /api/projects/:id/workspace/files
  if (method === 'PUT' && url.pathname.match(/^\/api\/projects\/[^/]+\/workspace\/files$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.filePath || body.content === undefined) {
        return json(res, { error: 'filePath and content required' }, 400);
      }
      const ws = await setWorkspaceFile(id, body.filePath, body.content);
      return json(res, { files: ws.files });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, '::', () => {
  console.log(`Engine server running on http://[::]:${PORT} (IPv4+IPv6)`);
  console.log(`Workspace base: ${WORKSPACE_BASE}`);
});
