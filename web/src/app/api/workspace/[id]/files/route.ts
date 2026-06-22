import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ENGINE_URL) {
    return NextResponse.json({ files: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${ENGINE_URL}/api/workspace/${id}/files`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
