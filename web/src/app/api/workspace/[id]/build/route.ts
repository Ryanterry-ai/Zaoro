import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!ENGINE_URL) {
    return NextResponse.json(
      { error: "Engine server not configured. Set ENGINE_URL environment variable." },
      { status: 503 }
    );
  }

  try {
    // Fire-and-forget: trigger build on engine, don't wait for completion
    // Client polls /api/workspace/:id/progress for status
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${ENGINE_URL}/api/workspace/${id}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    }).catch(() => {}).finally(() => clearTimeout(timeout));

    return NextResponse.json({ id, status: "build_started" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to engine server" },
      { status: 502 }
    );
  }
}
