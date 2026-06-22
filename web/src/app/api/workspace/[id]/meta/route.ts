import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ENGINE_URL) {
    return NextResponse.json({ id, type: "build", exists: false });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${ENGINE_URL}/api/workspace/${id}/meta`, {
      signal: controller.signal,
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
