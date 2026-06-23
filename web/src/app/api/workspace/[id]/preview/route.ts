import { NextRequest } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;

  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const targetUrl = `${cleanUrl}/api/workspace/${id}/preview`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const engineRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 
        "Accept": "text/html",
        "ngrok-skip-browser-warning": "true",
      },
    });
    clearTimeout(timeout);
    const html = await engineRes.text();
    return new Response(html, {
      status: engineRes.status,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return new Response(
      `<html><body style="background:#09090b;color:#f43f5e;font-family:sans-serif;padding:2rem;">
        <h3>${isTimeout ? "Preview Timeout" : "Engine Unreachable"}</h3>
        <p style="color:#71717a;font-size:0.875rem;margin-top:1rem;">Workspace: ${id}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
