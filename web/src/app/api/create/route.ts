import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = path.resolve("../../../sandbox_workspaces");

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const wsDir = path.join(WORKSPACE_BASE, id);

  fs.mkdirSync(wsDir, { recursive: true });

  // Store the prompt for the workspace
  fs.writeFileSync(
    path.join(wsDir, ".prompt"),
    JSON.stringify({ id, prompt, createdAt: new Date().toISOString() }),
    "utf-8"
  );

  // Initialize progress log
  fs.writeFileSync(
    path.join(wsDir, ".progress"),
    JSON.stringify([{ step: "created", message: "Workspace created", ts: Date.now() }]),
    "utf-8"
  );

  return NextResponse.json({ id, prompt });
}
