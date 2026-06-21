import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const ENGINE_ROOT = "C:/Users/viren/OneDrive/Desktop/build-same-engine";
const PROMPTS_DIR = path.join(ENGINE_ROOT, ".prompts");
const WORKSPACE_BASE = path.join(ENGINE_ROOT, "sandbox_workspaces");

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Save prompt separately — engine creates workspace + scaffold
  fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PROMPTS_DIR, `${id}.json`),
    JSON.stringify({ id, prompt, createdAt: new Date().toISOString() }),
    "utf-8"
  );

  return NextResponse.json({ id, prompt });
}
