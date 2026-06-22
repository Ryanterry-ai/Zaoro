import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

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
    const res = await fetch(`${ENGINE_URL}/api/workspace/${id}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to engine server" },
      { status: 502 }
    );
  }
}
