import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (ENGINE_URL) {
    try {
      const res = await fetch(`${ENGINE_URL}/api/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {}
  }

  return NextResponse.json({ id, prompt });
}
