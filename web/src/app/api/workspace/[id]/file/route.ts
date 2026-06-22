import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  if (!ENGINE_URL) {
    return NextResponse.json({ error: "Engine server not configured" }, { status: 503 });
  }

  try {
    const engineUrl = filePath
      ? `${ENGINE_URL}/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`
      : `${ENGINE_URL}/api/workspace/${id}/file`;
    const res = await fetch(engineUrl);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Engine unreachable" }, { status: 502 });
  }
}
