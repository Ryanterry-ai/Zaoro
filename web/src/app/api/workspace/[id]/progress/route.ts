import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ENGINE_URL) {
    return NextResponse.json({ steps: [], pages: [], status: "no_engine" });
  }

  try {
    const res = await fetch(`${ENGINE_URL}/api/workspace/${id}/progress`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ steps: [], pages: [], status: "engine_unreachable" });
  }
}
