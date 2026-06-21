import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = "C:/Users/viren/OneDrive/Desktop/build-same-engine/sandbox_workspaces";

const PHASE_LABELS: Record<string, string> = {
  engine: "Compiler",
  llm: "LLM Gateway",
  done: "Complete",
  error: "Failed",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsDir = path.join(WORKSPACE_BASE, id);
  const progressFile = path.join(wsDir, ".progress");

  if (!fs.existsSync(progressFile)) {
    return NextResponse.json({ steps: [], pages: [] });
  }

  const content = fs.readFileSync(progressFile, "utf-8");
  const rawSteps: Array<{ step: string; message: string; ts: number }> = JSON.parse(content);

  const steps = rawSteps.map(s => ({
    step: s.step,
    label: PHASE_LABELS[s.step] || s.step,
    message: s.message,
    ts: s.ts,
  }));

  // Extract per-page results from steps
  const pageEvents = steps.filter(s =>
    s.message.startsWith("Page ") || s.message.includes("page") || s.step === "done" || s.step === "error"
  );

  const lastStep = steps[steps.length - 1];
  const status = lastStep?.step === "done" ? "complete"
    : lastStep?.step === "error" ? "failed"
    : "in_progress";

  return NextResponse.json({ steps, pages: pageEvents, status });
}
