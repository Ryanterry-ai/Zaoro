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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.resolve(__dirname, '..');

// Load .env from engine root
config({ path: path.join(ENGINE_ROOT, '.env') });
const WORKSPACE_BASE = path.join(ENGINE_ROOT, 'sandbox_workspaces');
const PROMPTS_DIR = path.join(ENGINE_ROOT, '.prompts');
const PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);

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
        verification: 'GET /api/workspace/:id/verification',
      },
    });
  }

  // GET /api/health
  if (method === 'GET' && url.pathname === '/api/health') {
    return json(res, { status: 'ok', uptime: process.uptime() });
  }

  // POST /api/bi/run — Business Intelligence Pipeline
  if (method === 'POST' && url.pathname === '/api/bi/run') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') {
        return json(res, { error: 'prompt is required' }, 400);
      }
      const provider = (process.env.LLM_PROVIDER || 'gemini') as any;
      const apiKey = process.env.LLM_API_KEY || '';
      if (!apiKey) return json(res, { error: 'LLM_API_KEY not configured' }, 500);

      const { BusinessIntelligencePipeline } = await import('./business-intelligence/pipeline.js');
      const pipeline = new BusinessIntelligencePipeline(provider, apiKey);
      const result = await pipeline.run(body.prompt);
      return json(res, { success: true, result });
    } catch (err: any) {
      console.error('[bi] Pipeline error:', err.message);
      return json(res, { error: err.message }, 500);
    }
  }

  // POST /api/pipeline — Full 13-stage pipeline with self-correction loop
  if (method === 'POST' && url.pathname === '/api/pipeline') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') {
        return json(res, { error: 'prompt is required' }, 400);
      }
      const provider = (process.env.LLM_PROVIDER || 'gemini') as any;
      const apiKey = process.env.LLM_API_KEY || '';
      const model = process.env.LLM_MODEL || undefined;

      const { PipelineOrchestrator } = await import('./generation/pipeline-orchestrator.js');
      const wsBase = path.join(ENGINE_ROOT, 'sandbox_workspaces', `pipeline-${Date.now()}`);
      const orchestrator = new PipelineOrchestrator(wsBase, { provider, apiKey, model: model || 'gemini-2.5-flash' },
        (step, msg) => console.log(`[pipeline:${step}] ${msg}`),
        (step, msg) => console.log(`[pipeline:phase] ${step}: ${msg}`),
      );
      const result = await orchestrator.run(body.prompt);
      return json(res, { success: true, result });
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
      fs.writeFileSync(path.join(PROMPTS_DIR, `${id}.json`), JSON.stringify({ id, type: usePipeline ? 'pipeline' : 'build', prompt: body.prompt, pipeline: usePipeline, createdAt: new Date().toISOString() }), 'utf-8');
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
    if (!fs.existsSync(progressFile)) return json(res, { steps: [], pages: [], status: 'in_progress' });
    const rawSteps = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    const PHASE_LABELS: Record<string, string> = { engine: 'Compiler', llm: 'LLM Gateway', done: 'Complete', error: 'Failed' };
    const steps = rawSteps.map((s: any) => ({ step: s.step, label: PHASE_LABELS[s.step] || s.step, message: s.message, ts: s.ts, data: s.data || null }));
    const pageEvents = steps.filter((s: any) => s.message.startsWith('Page ') || s.message.includes('page') || s.step === 'done' || s.step === 'error');
    const lastStep = steps[steps.length - 1];
    const status = lastStep?.step === 'done' ? 'complete' : lastStep?.step === 'error' ? 'failed' : 'in_progress';

    const phasesFile = path.join(wsDir, '.clone-phases');
    let phases: any[] = [];
    try { if (fs.existsSync(phasesFile)) phases = JSON.parse(fs.readFileSync(phasesFile, 'utf-8')); } catch {}

    return json(res, { steps, pages: pageEvents, status, phases });
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

  // GET /api/workspace/:id/preview
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/preview$/)) {
    const id = url.pathname.split('/')[3]!;
    const workspacePath = path.join(WORKSPACE_BASE, id);
    const cacheFile = path.join(workspacePath, '.preview-cache.html');
    if (!fs.existsSync(workspacePath)) return html(res, '<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;"><h3>Preview Server Syncing</h3><p>Sandbox workspace setup is currently building. Please wait...</p></body></html>');
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      if (Date.now() - stat.mtimeMs < 30000) return html(res, fs.readFileSync(cacheFile, 'utf-8'));
    }
    const targetFile = path.join(workspacePath, 'src', 'app', 'page.tsx');
    if (!fs.existsSync(targetFile)) return html(res, '<html><body style="background:#09090b;color:#f43f5e;font-family:sans-serif;padding:2rem;"><h3>Preview Not Available</h3><p>Main route src/app/page.tsx was not resolved.</p></body></html>');

    try {
      // Compile TSX with esbuild, then render with Playwright
      const esbuild = await import('esbuild');
      const { chromium } = await import('playwright');

      const source = fs.readFileSync(targetFile, 'utf-8');

      // Strip 'use client' and imports, replace export with global
      let cleanSource = source.replace(/'use client';?\s*/g, '');
      cleanSource = cleanSource.replace(/^import .+$/gm, '');
      cleanSource = cleanSource.replace(/export default function (\w+)/, 'function $1');
      cleanSource = cleanSource.replace(/export default (\w+)/, 'var _default = $1');

      // Use esbuild to compile JSX → JS (transform mode uses React.createElement, not jsx runtime)
      const compiled = await esbuild.transform(cleanSource, { loader: 'tsx', jsx: 'transform', target: 'es2020' });

      const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; width: 100%; overflow-x: hidden; }
    body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
  </style>
</head>
<body>
  <div id="preview-root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script>
    ${compiled.code}
    var _comp = typeof Home !== 'undefined' ? Home : (typeof _default !== 'undefined' ? _default : null);
    if (_comp) {
      var root = ReactDOM.createRoot(document.getElementById('preview-root'));
      root.render(React.createElement(_comp));
    }
  <\/script>
</body>
</html>`;

      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      // Load with 'load' to ensure CDN scripts execute
      await page.setContent(previewHtml, { waitUntil: 'load', timeout: 30000 });
      // Wait for React to be available and component to render
      await page.waitForFunction(() => {
        const el = document.getElementById('preview-root');
        return el && el.children.length > 0;
      }, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const renderedHtml = await page.content();
      await ctx.close();
      await browser.close();

      fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return html(res, renderedHtml);
    } catch (renderErr: any) {
      console.error('[preview] render failed:', renderErr.message || renderErr);
      const fallbackSource = fs.readFileSync(targetFile, 'utf-8');
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

      const provider = process.env.LLM_PROVIDER || 'openai';
      const apiKey = process.env.LLM_API_KEY || '';

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

      const child = exec(`npx tsx .clone-temp-${id}.ts`, { cwd: ENGINE_ROOT, timeout: 600000, env: { ...process.env, NODE_NO_WARNINGS: '1' } });

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
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${id}.zip"`,
        'Access-Control-Allow-Origin': '*',
      });

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (err: any) => { console.error('[download] Archive error:', err.message); });
      archive.pipe(res);

      // Add src/ directory
      const srcDir = path.join(wsDir, 'src');
      if (fs.existsSync(srcDir)) archive.directory(srcDir, 'src');

      // Add public/ directory
      const publicDir = path.join(wsDir, 'public');
      if (fs.existsSync(publicDir)) archive.directory(publicDir, 'public');

      // Add root config files
      for (const f of ['package.json', 'tsconfig.json', 'next.config.ts', 'tailwind.config.ts', 'postcss.config.js', 'tailwind.config.js']) {
        const fp = path.join(wsDir, f);
        if (fs.existsSync(fp)) archive.file(fp, { name: f });
      }

      await archive.finalize();
    } catch (e: any) { return json(res, { error: e.message }, 500); }
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

server.listen(PORT, () => {
  console.log(`Engine server running on http://localhost:${PORT}`);
  console.log(`Workspace base: ${WORKSPACE_BASE}`);
});
