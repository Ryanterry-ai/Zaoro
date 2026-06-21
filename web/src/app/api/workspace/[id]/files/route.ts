import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = "C:/Users/viren/OneDrive/Desktop/build-same-engine/sandbox_workspaces";

function scanDir(dir: string, root: string, results: { name: string; path: string; isDirectory: boolean; size: number }[] = []): typeof results {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
    const stat = fs.statSync(fullPath);
    results.push({ name: entry.name, path: relPath, isDirectory: entry.isDirectory(), size: entry.isDirectory() ? 0 : stat.size });
    if (entry.isDirectory()) scanDir(fullPath, root, results);
  }
  return results;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsDir = path.join(WORKSPACE_BASE, id);

  if (!fs.existsSync(wsDir)) {
    return NextResponse.json({ files: [] });
  }

  const files = scanDir(wsDir, wsDir);
  return NextResponse.json({ files });
}
