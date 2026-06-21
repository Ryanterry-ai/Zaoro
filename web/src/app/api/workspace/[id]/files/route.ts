import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = path.resolve("../../../sandbox_workspaces");

function scanDir(dir: string, root: string, results: { name: string; path: string; isDirectory: boolean }[] = []): typeof results {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
    results.push({ name: entry.name, path: relPath, isDirectory: entry.isDirectory() });
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
