import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function POST(req: Request) {
  const { url: rawUrl, workspaceId } = await req.json();

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const id = workspaceId || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const res = await fetch(`${cleanUrl}/api/workspace/${id}/clone`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ url }),
    });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
