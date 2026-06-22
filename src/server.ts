import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { MCPServer } from './mcp/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.resolve(__dirname, '..');

// Load .env from engine root
config({ path: path.join(ENGINE_ROOT, '.env') });
const WORKSPACE_BASE = path.join(ENGINE_ROOT, 'sandbox_workspaces');
const PROMPTS_DIR = path.join(ENGINE_ROOT, '.prompts');
const PORT = parseInt(process.env.ENGINE_PORT || '3001', 10);

// Initialize MCP server
const mcpServer = new MCPServer(WORKSPACE_BASE);

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
        mcp_tools: 'GET /api/mcp/tools',
        mcp_call: 'POST /api/mcp/call',
        mcp_scrape: 'POST /api/mcp/scrape',
        mcp_push: 'POST /api/mcp/push',
      },
    });
  }

  // GET /api/health
  if (method === 'GET' && url.pathname === '/api/health') {
    return json(res, { status: 'ok', uptime: process.uptime() });
  }

  // POST /api/create
  if (method === 'POST' && url.pathname === '/api/create') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body.prompt || typeof body.prompt !== 'string') return json(res, { error: 'Prompt is required' }, 400);
      const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      fs.mkdirSync(PROMPTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PROMPTS_DIR, `${id}.json`), JSON.stringify({ id, prompt: body.prompt, createdAt: new Date().toISOString() }), 'utf-8');
      return json(res, { id, prompt: body.prompt });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // POST /api/workspace/:id/build
  if (method === 'POST' && url.pathname.match(/^\/api\/workspace\/[^/]+\/build$/)) {
    const id = url.pathname.split('/')[3]!;
    try {
      const promptFile = path.join(PROMPTS_DIR, `${id}.json`);
      if (!fs.existsSync(promptFile)) return json(res, { error: 'No prompt found' }, 404);
      const { prompt } = JSON.parse(fs.readFileSync(promptFile, 'utf-8'));
      const wsDir = path.join(WORKSPACE_BASE, id);
      fs.mkdirSync(wsDir, { recursive: true });

      const configPath = path.join(ENGINE_ROOT, `.build-config-${id}.json`);
      const promptPayloadPath = path.join(ENGINE_ROOT, `.build-prompt-${id}.json`);
      const provider = process.env.LLM_PROVIDER || 'openai';
      const apiKey = process.env.LLM_API_KEY || '';
      const hasKey = apiKey && apiKey.trim() !== '';
      fs.writeFileSync(configPath, JSON.stringify({ provider, apiKey }), 'utf-8');
      fs.writeFileSync(promptPayloadPath, JSON.stringify({ id, prompt, type: 'build-website' }), 'utf-8');

      const buildScript = `
import { DeterministicOrchestratorV4 } from './src/agents/deterministic-orchestrator-v4.js';
import * as fs from 'fs';
import * as path from 'path';
const WS_BASE = ${JSON.stringify(WORKSPACE_BASE)};
const wsDir = path.join(WS_BASE, ${JSON.stringify(id)});
let progressInitialized = false;
function log(step, msg) {
  if (!progressInitialized) { if (!fs.existsSync(wsDir)) return; progressInitialized = true; }
  const f = path.join(wsDir, '.progress');
  let s = [];
  try { if (fs.existsSync(f)) s = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  s.push({ step, message: msg, ts: Date.now() });
  fs.writeFileSync(f, JSON.stringify(s), 'utf-8');
}
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-config-${id}.json`)}), 'utf-8'));
const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), ${JSON.stringify(`.build-prompt-${id}.json`)}), 'utf-8'));
const orch = new DeterministicOrchestratorV4(WS_BASE);
try {
  log('engine', 'Starting compilation flow...');
  if (config.apiKey && config.apiKey.trim() !== '') {
    log('llm', 'Using ' + config.provider + ' LLM for code generation...');
  } else {
    log('llm', 'Using JIT synthesis (no API key set). Set LLM_API_KEY for AI-generated code.');
  }
  await orch.processGenerationIntent(payload.id, { type: payload.type, prompt: payload.prompt }, { provider: config.provider, apiKey: config.apiKey });
  log('done', 'Build completed! Your application is ready.');
} catch (err) { log('error', 'Build failed: ' + (err.message || err)); }
`;
      const scriptPath = path.join(ENGINE_ROOT, `.build-temp-${id}.mts`);
      fs.writeFileSync(scriptPath, buildScript, 'utf-8');

      const { execSync } = await import('child_process');
      try {
        execSync(`npx tsx .build-temp-${id}.mts`, { cwd: ENGINE_ROOT, timeout: 120000, stdio: 'pipe', env: { ...process.env, NODE_NO_WARNINGS: '1' } });
      } catch (execError: any) {
        const progressFile = path.join(wsDir, '.progress');
        let steps: any[] = [];
        try { steps = JSON.parse(fs.readFileSync(progressFile, 'utf-8')); } catch {}
        const lastStep = steps[steps.length - 1];
        if (!lastStep || (lastStep.step !== 'done' && lastStep.step !== 'error')) {
          const errMsg = execError.stderr?.toString()?.slice(0, 500) || execError.message || 'Unknown error';
          steps.push({ step: 'error', message: 'Build failed: ' + errMsg, ts: Date.now() });
          fs.writeFileSync(progressFile, JSON.stringify(steps), 'utf-8');
        }
      }

      try { fs.unlinkSync(scriptPath); } catch {}
      try { fs.unlinkSync(configPath); } catch {}
      try { fs.unlinkSync(promptPayloadPath); } catch {}

      const progressFile = path.join(wsDir, '.progress');
      let finalSteps: any[] = [];
      try { finalSteps = JSON.parse(fs.readFileSync(progressFile, 'utf-8')); } catch {}
      return json(res, { id, status: finalSteps[finalSteps.length - 1]?.step === 'done' ? 'complete' : 'done', steps: finalSteps });
    } catch (e: any) { return json(res, { error: e.message }, 500); }
  }

  // GET /api/workspace/:id/progress
  if (method === 'GET' && url.pathname.match(/^\/api\/workspace\/[^/]+\/progress$/)) {
    const id = url.pathname.split('/')[3]!;
    const wsDir = path.join(WORKSPACE_BASE, id);
    const progressFile = path.join(wsDir, '.progress');
    if (!fs.existsSync(progressFile)) return json(res, { steps: [], pages: [], status: 'in_progress' });
    const rawSteps = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    const PHASE_LABELS: Record<string, string> = { engine: 'Compiler', llm: 'LLM Gateway', done: 'Complete', error: 'Failed' };
    const steps = rawSteps.map((s: any) => ({ step: s.step, label: PHASE_LABELS[s.step] || s.step, message: s.message, ts: s.ts }));
    const pageEvents = steps.filter((s: any) => s.message.startsWith('Page ') || s.message.includes('page') || s.step === 'done' || s.step === 'error');
    const lastStep = steps[steps.length - 1];
    const status = lastStep?.step === 'done' ? 'complete' : lastStep?.step === 'error' ? 'failed' : 'in_progress';
    return json(res, { steps, pages: pageEvents, status });
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

    const { pathToFileURL } = await import('url');
    const moduleUrl = pathToFileURL(targetFile).href;
    const tempScriptPath = path.join(workspacePath, 'render-temp.mts');
    const tempHtmlPath = path.join(workspacePath, 'render-temp.html');
    const renderScript = `
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import * as fs from 'fs';
async function executeRender() {
  try {
    const mod = await import('${moduleUrl.replace(/\\/g, '/')}');
    const Component = mod.default || mod.Home;
    if (!Component) throw new Error("Target component export not found.");
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    const fullDocument = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"><\/script><style>body{background:#09090b;color:#f4f4f5;font-family:ui-sans-serif,system-ui,sans-serif;}</style></head><body>' + html + '</body></html>';
    fs.writeFileSync('${tempHtmlPath.replace(/\\/g, '/')}', fullDocument);
  } catch (err) {
    const errMsg = (err.stack || err.message || String(err)).replace(/</g, '&lt;');
    fs.writeFileSync('${tempHtmlPath.replace(/\\/g, '/')}', '<div style="padding:2rem;color:#f43f5e;font-family:sans-serif;background:#09090b;"><h3>Render Error</h3><pre>' + errMsg + '</pre></div>');
  }
}
executeRender();`;
    try {
      fs.writeFileSync(tempScriptPath, renderScript, 'utf-8');
      const { execSync } = await import('child_process');
      execSync('npx tsx render-temp.mts', { cwd: ENGINE_ROOT, timeout: 15000 });
      const renderedHtml = fs.readFileSync(tempHtmlPath, 'utf-8');
      fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');
      try { fs.unlinkSync(tempScriptPath); } catch {}
      try { fs.unlinkSync(tempHtmlPath); } catch {}
      return html(res, renderedHtml);
    } catch (err: any) {
      try { fs.unlinkSync(tempScriptPath); } catch {}
      try { fs.unlinkSync(tempHtmlPath); } catch {}
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

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`Engine server running on http://localhost:${PORT}`);
  console.log(`Workspace base: ${WORKSPACE_BASE}`);
});
