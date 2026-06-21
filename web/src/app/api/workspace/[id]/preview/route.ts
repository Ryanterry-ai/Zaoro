import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import * as fs from 'fs';
import * as path from 'path';

const ENGINE_ROOT = "C:/Users/viren/OneDrive/Desktop/build-same-engine";
const WORKSPACE_BASE = path.join(ENGINE_ROOT, 'sandbox_workspaces');
const CACHE_TTL_MS = 30000;

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  const workspacePath = path.join(WORKSPACE_BASE, id);
  const cacheFile = path.join(workspacePath, '.preview-cache.html');

  if (!fs.existsSync(workspacePath)) {
    return new NextResponse(
      `<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;">
         <h3>Preview Server Syncing</h3>
         <p>Sandbox workspace setup is currently building. Please wait...</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
      const cachedHtml = fs.readFileSync(cacheFile, 'utf-8');
      return new NextResponse(cachedHtml, { headers: { 'Content-Type': 'text/html' } });
    }
  }

  const targetFile = path.join(workspacePath, 'src', 'app', 'page.tsx');
  if (!fs.existsSync(targetFile)) {
    return new NextResponse(
      `<html><body style="background:#09090b;color:#f43f5e;font-family:sans-serif;padding:2rem;">
         <h3>Preview Not Available</h3>
         <p>Main route 'src/app/page.tsx' was not resolved inside target workspace.</p>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const tempScriptPath = path.join(workspacePath, 'render-temp.mts');
  const tempHtmlPath = path.join(workspacePath, 'render-temp.html');

  const moduleUrl = pathToFileURL(path.join(workspacePath, 'src', 'app', 'page.tsx')).href;

  const renderScript = `
import React from 'react';
import ReactDOMServer from 'react-dom/server';

async function executeRender() {
  try {
    const mod = await import('${moduleUrl.replace(/\\/g, '/')}');
    const Component = mod.default || mod.Home;
    if (!Component) {
      throw new Error("Target component export not found.");
    }
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Component));
    const fullDocument = \`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background-color: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; }
          </style>
        </head>
        <body>
          \${html}
        </body>
      </html>
    \`.trim();
    import('fs').then(fs => fs.writeFileSync('${tempHtmlPath.replace(/\\/g, '/')}', fullDocument));
  } catch (err) {
    import('fs').then(fs => {
      const errorHtml = \`
        <div style="padding: 2rem; color: #f43f5e; font-family: sans-serif; background: #09090b;">
          <h3>Dynamic Render Failure</h3>
          <pre>\${err.stack || err.message}</pre>
        </div>
      \`;
      fs.writeFileSync('${tempHtmlPath.replace(/\\/g, '/')}', errorHtml);
    });
  }
}
executeRender();
`.trim();

  try {
    fs.writeFileSync(tempScriptPath, renderScript, 'utf-8');
    execSync(`npx tsx render-temp.mts`, { cwd: workspacePath });

    const renderedHtml = fs.readFileSync(tempHtmlPath, 'utf-8');

    fs.writeFileSync(cacheFile, renderedHtml, 'utf-8');

    fs.unlinkSync(tempScriptPath);
    fs.unlinkSync(tempHtmlPath);

    return new NextResponse(renderedHtml, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (err: any) {
    if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);

    const fallbackSource = fs.readFileSync(targetFile, 'utf-8');
    return new NextResponse(
      `<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;">
         <h3 style="color:#f43f5e;">Static Compiler Error</h3>
         <p>Displaying raw uncompiled React component source:</p>
         <pre style="background:#18181b;padding:1rem;border-radius:0.5rem;color:#f4f4f5;overflow-x:auto;">${fallbackSource.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
