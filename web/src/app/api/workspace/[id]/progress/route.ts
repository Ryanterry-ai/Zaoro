import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_BASE = path.resolve("../../../sandbox_workspaces");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsDir = path.join(WORKSPACE_BASE, id);
  const progressFile = path.join(wsDir, ".progress");

  if (!fs.existsSync(progressFile)) {
    return NextResponse.json({ steps: [] });
  }

  const content = fs.readFileSync(progressFile, "utf-8");
  const steps = JSON.parse(content);

  return NextResponse.json({ steps });
}
