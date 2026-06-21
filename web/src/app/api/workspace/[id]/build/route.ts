import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const ENGINE_ROOT = "C:/Users/viren/OneDrive/Desktop/build-same-engine";
const WORKSPACE_BASE = path.join(ENGINE_ROOT, "sandbox_workspaces");
const PROMPTS_DIR = path.join(ENGINE_ROOT, ".prompts");

function appendProgress(wsDir: string, step: string, message: string) {
  fs.mkdirSync(wsDir, { recursive: true });
  const progressFile = path.join(wsDir, ".progress");
  let steps: { step: string; message: string; ts: number }[] = [];
  if (fs.existsSync(progressFile)) {
    try { steps = JSON.parse(fs.readFileSync(progressFile, "utf-8")); } catch {}
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

  const promptFile = path.join(PROMPTS_DIR, `${id}.json`);
  if (!fs.existsSync(promptFile)) {
    return NextResponse.json({ error: "No prompt found" }, { status: 404 });
  }

  const { prompt } = JSON.parse(fs.readFileSync(promptFile, "utf-8"));

  const provider = (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'gemini') || 'openai';
  const apiKey = process.env.LLM_API_KEY || '';

  // Write config as JSON to avoid string-escaping fragility — scoped per workspace-id
  const configPath = path.join(ENGINE_ROOT, `.build-config-${id}.json`);
  fs.writeFileSync(configPath, JSON.stringify({ provider, apiKey }), "utf-8");

  // Write prompt as JSON to avoid escaping issues — scoped per workspace-id
  const promptPayloadPath = path.join(ENGINE_ROOT, `.build-prompt-${id}.json`);
  fs.writeFileSync(promptPayloadPath, JSON.stringify({ id, prompt, type: 'build-website' }), "utf-8");

  const buildScript = `
import { DeterministicOrchestratorV4 } from './src/agents/deterministic-orchestrator-v4.js';
import * as fs from 'fs';
import * as path from 'path';

const WS_BASE = ${JSON.stringify(path.resolve(WORKSPACE_BASE))};
const wsDir = path.join(WS_BASE, ${JSON.stringify(id)});

let progressInitialized = false;
function log(step, msg) {
  if (!progressInitialized) {
    if (!fs.existsSync(wsDir)) return;
    progressInitialized = true;
  }
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
  log('llm', 'Initializing ' + config.provider + ' gateway...');
  const result = await orch.processGenerationIntent(payload.id, { type: payload.type, prompt: payload.prompt }, { provider: config.provider, apiKey: config.apiKey });
  log('done', 'Build completed! Your application is ready.');
} catch (err) {
  log('error', 'Build failed: ' + (err.message || err));
}
`;

  const scriptPath = path.join(ENGINE_ROOT, `.build-temp-${id}.mts`);
  fs.writeFileSync(scriptPath, buildScript, "utf-8");

  try {
    execSync(`npx tsx .build-temp-${id}.mts`, {
      cwd: ENGINE_ROOT,
      timeout: 120000,
      stdio: "pipe",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
  } catch (execError: any) {
    const progressFile = path.join(wsDir, ".progress");
    let steps: any[] = [];
    try { steps = JSON.parse(fs.readFileSync(progressFile, "utf-8")); } catch {}
    const lastStep = steps[steps.length - 1];
    if (!lastStep || (lastStep.step !== "done" && lastStep.step !== "error")) {
      const errMsg = execError.stderr?.toString()?.slice(0, 500) || execError.message || "Unknown error";
      appendProgress(wsDir, "error", "Build failed: " + errMsg);
    }
  }

  try { fs.unlinkSync(scriptPath); } catch {}
  try { fs.unlinkSync(configPath); } catch {}
  try { fs.unlinkSync(promptPayloadPath); } catch {}
  // Also clean up any legacy unscoped files
  try { fs.unlinkSync(path.join(ENGINE_ROOT, ".build-config.json")); } catch {}
  try { fs.unlinkSync(path.join(ENGINE_ROOT, ".build-prompt.json")); } catch {}
  try { fs.unlinkSync(path.join(ENGINE_ROOT, ".build-temp.mts")); } catch {}

  const progressFile = path.join(wsDir, ".progress");
  let finalSteps: any[] = [];
  try { finalSteps = JSON.parse(fs.readFileSync(progressFile, "utf-8")); } catch {}

  return NextResponse.json({
    id,
    status: finalSteps[finalSteps.length - 1]?.step === "done" ? "complete" : "done",
    steps: finalSteps,
  });
}
