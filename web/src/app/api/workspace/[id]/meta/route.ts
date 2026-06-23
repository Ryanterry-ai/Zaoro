import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${cleanUrl}/api/workspace/${id}/meta`, {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ id, type: "build", exists: false });
    }

    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ id, type: "build", exists: false });
  }
}
