
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = "C:\\Users\\viren\\OneDrive\\Desktop\\build-same-engine\\sandbox_workspaces";
const wsDir = path.join(WS_BASE, "ws-1782888104131-sbud31");

const PROGRESS_FILE = path.join(wsDir, '.progress');
const _progressEvents = [];
function writeProgress(step, type, message, metadata) {
  _progressEvents.push({ step, type, message, ts: Date.now(), metadata: metadata || undefined });
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(_progressEvents), 'utf-8'); } catch {}
}
function emitLLM(step, type, llmDetail) { writeProgress(step, type, `${type}: ${llmDetail.provider}/${llmDetail.model}`, { llm: llmDetail }); }

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
    const clean = msg.replace(/^[STDERR]s*/, '');
    if (clean.includes('[gateway]')) {
      if (clean.includes('LLM call:') || clean.includes('Combined LLM call:')) {
        const match = clean.match(/(\w[\w-]+)\/(\S+)\s*\(attempt\s*(\d+)\)/);
        if (match) emitLLM('llm', 'llm_request', { provider: match[1], model: match[2], attempt: parseInt(match[3]), maxAttempts: 5 });
      } else if (clean.includes('succeeded:') && clean.includes('patches')) {
        const match = clean.match(/(\d+)\s*patches/);
        writeProgress('llm', 'success', clean, { patchCount: match ? parseInt(match[1]) : 0 });
      } else if (clean.includes('Gemini fallback')) {
        emitLLM('llm', 'llm_fallback', { provider: 'gemini', model: 'gemini-2.5-flash', fallbackProvider: 'gemini' });
      } else if (clean.includes('Transient error')) {
        const match = clean.match(/\((.+?)\)/);
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
    } else if (clean.includes('[self-heal]') || clean.includes('[ast-patch]')) {
      writeProgress('compile', 'healing', clean);
    } else if (clean.includes('[domain]') && clean.includes('hasFunction')) {
      // Skip noisy per-file domain checks — only log summary
    } else if (clean.includes('Error') || clean.includes('error')) {
      writeProgress('error', 'warning', clean.slice(0, 200));
    }
  };
}

console.log = interceptConsole('', 'info');
console.warn = interceptConsole('', 'warning');
console.error = interceptConsole('', 'error');

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".build-config-ws-1782888104131-sbud31.json"), 'utf-8'));
const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".build-prompt-ws-1782888104131-sbud31.json"), 'utf-8'));

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

  // Run quality gate (prisma generate + next build)
  const { execSync } = await import('child_process');
  const gateScript = path.resolve(process.cwd(), 'tools', 'quality-gate', 'index.cjs');
  try {
    writeProgress('gate', 'started', 'Running quality gate (prisma generate + next build)...');
    execSync('node "' + gateScript + '" "' + wsDir + '"', { cwd: process.cwd(), timeout: 300000, stdio: 'pipe', env: { ...process.env, NODE_ENV: 'production' } });
    writeProgress('gate', 'passed', 'Quality gate passed');
  } catch (gateErr) {
    const stdout = gateErr.stdout?.toString() || '';
    const stderr = gateErr.stderr?.toString() || '';
    const fullOutput = stdout || stderr || gateErr.message;
    console.error('[quality-gate] FULL OUTPUT:', fullOutput);
    writeProgress('gate', 'failed', 'Quality gate failed: ' + fullOutput.slice(0, 1500));
    throw new Error('Quality gate failed: ' + fullOutput.slice(0, 300));
  }

  // Run content quality gate (detects generic-placeholder-dense builds)
  const contentGateScript = path.resolve(process.cwd(), 'tools', 'content-quality-gate', 'index.js');
  try {
    writeProgress('content-gate', 'started', 'Running content quality gate...');
    var cgOutput = execSync('node "' + contentGateScript + '" "' + wsDir + '"', { cwd: process.cwd(), timeout: 60000, encoding: 'utf-8' });
    var cgResult = JSON.parse(cgOutput.trim());
    if (cgResult.pass) {
      writeProgress('content-gate', 'passed', 'Content quality gate passed');
    } else {
      writeProgress('content-gate', 'warning', 'Content quality gate: generic ratio exceeds threshold. Continuing build.');
    }
  } catch (cgErr) {
    writeProgress('content-gate', 'warning', 'Content quality gate: could not run, continuing build');
  }

  // Pre-render preview during build so it's cached when web UI requests it
  writeProgress('preview', 'started', 'Rendering preview...');
  try {
    const esbuild = await import('esbuild');
    const { chromium } = await import('playwright');
    const targetFile = path.join(wsDir, 'src', 'app', 'page.tsx');
    const cacheFile = path.join(wsDir, '.preview-cache.html');

    if (fs.existsSync(targetFile)) {
      const bundleResult = await esbuild.build({
        entryPoints: [targetFile],
        bundle: true,
        format: 'iife',
        globalName: '__preview',
        target: 'es2020',
        jsx: 'transform',
        loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css', '.svg': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl', '.gif': 'dataurl' },
        external: ['react', 'react-dom'],
        write: false,
        alias: { '@': path.join(wsDir, 'src') },
      });

      const bundledCode = bundleResult.outputFiles?.[0]?.text ?? '';
      // Escape </script> in bundled code to prevent premature HTML script tag closure
      const safeBundledCode = bundledCode.replace(/</script>/gi, '<\/script>');
      const SCRIPT_END = '<' + '/script>';
      const previewHtmlParts = [
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preview</title>',
        '<script src="https://cdn.tailwindcss.com">' + SCRIPT_END,
        '<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{height:100%;width:100%;overflow-x:hidden}body{background:#09090b;color:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}</style></head><body><div id="preview-root"></div>',
        '<script src="https://unpkg.com/react@18/umd/react.production.min.js">' + SCRIPT_END,
        '<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js">' + SCRIPT_END,
        '<script>' + safeBundledCode + 'var _mod=typeof __preview!=="undefined"?__preview:{};var _comp=_mod.default||null;if(!_comp){var _keys=Object.keys(_mod);for(var i=0;i<_keys.length;i++){var _val=_mod[_keys[i]];if(typeof _val==="function"&&_val.prototype&&(_val.prototype.isReactComponent||_val.$$typeof)){_comp=_val;break;}}}if(!_comp){var _keys2=Object.keys(_mod);for(var j=0;j<_keys2.length;j++){if(typeof _mod[_keys2[j]]==="function"){_comp=_mod[_keys2[j]];break;}}}if(_comp){var root=ReactDOM.createRoot(document.getElementById("preview-root"));root.render(React.createElement(_comp))}else{document.getElementById("preview-root").innerHTML="<div style=\"padding:2rem;color:#f43f5e;\">No renderable component found.</div>"}' + SCRIPT_END + '</body></html>'
      ];
      const previewHtml = previewHtmlParts.join('');

      const consoleErrors: string[] = [];
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      page.on('console', (msg: any) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err: any) => consoleErrors.push(err.message));
      await page.setContent(previewHtml, { waitUntil: 'load', timeout: 30000 });
      const rendered = await page.waitForFunction(() => {
        const el = document.getElementById('preview-root');
        return el && el.children.length > 0;
      }, { timeout: 15000 }).catch(() => null);
      if (!rendered) {
        console.warn('[preview] React mount failed. Console errors:', consoleErrors);
        const pageContent = await page.evaluate(() => {
          const root = document.getElementById('preview-root');
          return root ? root.innerHTML : 'empty';
        });
        console.warn('[preview] #preview-root content:', pageContent);
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(500);
      const renderedHtml = await page.content();
      await ctx.close();
      await browser.close();
      fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');
      writeProgress('preview', 'done', 'Preview rendered');
    } else {
      writeProgress('preview', 'warning', 'No page.tsx found, skipping preview');
    }
  } catch (previewErr) {
    console.warn('[preview] Pre-render failed:', previewErr.message);
    console.warn('[preview] stack:', previewErr.stack || 'no stack');
    writeProgress('preview', 'warning', 'Preview render failed: ' + (previewErr.message || '').slice(0, 200));
  }

  writeProgress('done', 'completed', 'Build completed! Your application is ready.');
} catch (err) { writeProgress('error', 'error', 'Build failed: ' + (err.message || err)); process.exit(1); }
})();

// Restore console
console.log = origLog;
console.warn = origWarn;
console.error = origError;

// Final flush — ensure all events are written before exit
try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(_progressEvents), 'utf-8'); } catch {}
