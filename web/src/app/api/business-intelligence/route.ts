import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (!ENGINE_URL) {
    return NextResponse.json({ error: "ENGINE_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${ENGINE_URL}/api/bi/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
