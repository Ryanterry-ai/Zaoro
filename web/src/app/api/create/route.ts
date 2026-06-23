import { NextResponse } from "next/server";
import { getEngineUrl } from "@/lib/config";

const ENGINE_URL = getEngineUrl();

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!ENGINE_URL) {
    console.error('[Create] ENGINE_URL not configured');
    return NextResponse.json({ id, prompt });
  }

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const res = await fetch(`${cleanUrl}/api/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('[Create Proxy] Engine unreachable:', error.message);
  }

  // Fallback: return locally-generated ID so the frontend navigates
  // to workspace even if engine is offline (build will be queued when engine recovers)
  return NextResponse.json({ id, prompt });
}
