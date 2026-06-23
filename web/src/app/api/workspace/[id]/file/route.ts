import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const engineUrl = filePath
      ? `${cleanUrl}/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`
      : `${cleanUrl}/api/workspace/${id}/file`;
    const res = await fetch(engineUrl, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Engine unreachable" }, { status: 502 });
  }
}
