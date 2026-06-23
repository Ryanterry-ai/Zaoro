import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const res = await fetch(`${cleanUrl}/api/bi/run`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(300000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || "BI pipeline failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return NextResponse.json({ error: "BI pipeline timed out (5min limit)" }, { status: 504 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
