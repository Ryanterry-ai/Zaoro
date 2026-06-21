import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = path.resolve("../../../sandbox_workspaces");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "path query param required" }, { status: 400 });
  }

  // Security: prevent path traversal
  const normalized = path.normalize(filePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.join(WORKSPACE_BASE, id, normalized);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  return NextResponse.json({ content, path: normalized });
}
