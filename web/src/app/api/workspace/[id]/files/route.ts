import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${cleanUrl}/api/workspace/${id}/files`, {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    clearTimeout(timeout);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
