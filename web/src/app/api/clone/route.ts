import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function POST(req: Request) {
  const { url: rawUrl, workspaceId } = await req.json();

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Normalize URL — prepend https:// if no protocol
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const id = workspaceId || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (ENGINE_URL) {
    try {
      const res = await fetch(`${ENGINE_URL}/api/workspace/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return NextResponse.json({ error: "ENGINE_URL not configured" }, { status: 503 });
}
