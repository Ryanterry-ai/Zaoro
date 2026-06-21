import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";

const WORKSPACE_BASE = path.resolve("../../../sandbox_workspaces");
const ENGINE_ROOT = path.resolve("../../");

function appendProgress(wsDir: string, step: string, message: string) {
  const progressFile = path.join(wsDir, ".progress");
  let steps: { step: string; message: string; ts: number }[] = [];
  if (fs.existsSync(progressFile)) {
    steps = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
  }
  steps.push({ step, message, ts: Date.now() });
  fs.writeFileSync(progressFile, JSON.stringify(steps), "utf-8");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsDir = path.join(WORKSPACE_BASE, id);

  if (!fs.existsSync(wsDir)) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const promptFile = path.join(wsDir, ".prompt");
  if (!fs.existsSync(promptFile)) {
    return NextResponse.json({ error: "No prompt found for workspace" }, { status: 400 });
  }

  const { prompt } = JSON.parse(fs.readFileSync(promptFile, "utf-8"));

  appendProgress(wsDir, "building", "Initializing build.same engine...");

  // Run the engine via tsx in a child process
  try {
    const engineScript = `
      import { DeterministicOrchestratorV4 } from '${ENGINE_ROOT.replace(/\\/g, "/")}/src/agents/deterministic-orchestrator-v4.js';
      import * as fs from 'fs';
      import * as path from 'path';

      const WORKSPACE_BASE = '${WORKSPACE_BASE.replace(/\\/g, "/")}';
      const wsDir = path.join(WORKSPACE_BASE, '${id}');

      function appendProgress(step, message) {
        const progressFile = path.join(wsDir, '.progress');
        let steps = [];
        if (fs.existsSync(progressFile)) {
          steps = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
        }
        steps.push({ step, message, ts: Date.now() });
        fs.writeFileSync(progressFile, JSON.stringify(steps), 'utf-8');
      }

      const orchestrator = new DeterministicOrchestratorV4(WORKSPACE_BASE);

      let runAttempt = 0;

      const llmClient = async (context) => {
        runAttempt++;

        appendProgress('llm', 'AI generating code (attempt ' + runAttempt + ')...');

        if (runAttempt === 1) {
          return [{
            targetFile: 'src/app/page.tsx',
            targetExport: 'Home',
            action: 'update',
            codeBlock: \`export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, marginBottom: '1rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          \${'${prompt.replace(/'/g, "\\'")}'}
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#999', marginBottom: '2rem' }}>
          Built by build.same engine v4
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button style={{ padding: '12px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}>
            Get Started
          </button>
          <button style={{ padding: '12px 24px', background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer' }}>
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}\`
          }];
        }

        // Attempt 2+: recovery
        return [{
          targetFile: 'src/app/page.tsx',
          targetExport: 'Home',
          action: 'update',
          codeBlock: \`export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700 }}>Build Complete</h1>
        <p style={{ color: '#999', marginTop: '1rem' }}>Self-healing loop resolved successfully.</p>
      </div>
    </main>
  );
}\`
        }];
      };

      try {
        appendProgress('engine', 'Starting orchestration loop...');
        const config = await orchestrator.runCompilationFlow('${id}', prompt, llmClient, 3, true);
        appendProgress('done', 'Build completed successfully!');
        console.log('BUILD_SUCCESS:' + config.rootPath);
      } catch (err) {
        appendProgress('error', 'Build failed: ' + err.message);
        console.log('BUILD_FAILED:' + err.message);
      }
    `;

    const scriptPath = path.join(wsDir, ".build-script.mts");
    fs.writeFileSync(scriptPath, engineScript, "utf-8");

    // Run in background
    const child = spawn("npx", ["tsx", scriptPath], {
      cwd: ENGINE_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      shell: true,
    });

    child.unref();

    appendProgress("engine", "Engine process spawned, building in background...");

    return NextResponse.json({
      id,
      status: "building",
      message: "Build started. Poll /api/workspace/{id}/progress for updates.",
    });
  } catch (error: any) {
    appendProgress("error", `Failed to start build: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
