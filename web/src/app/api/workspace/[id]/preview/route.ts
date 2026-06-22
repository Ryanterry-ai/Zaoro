import { NextRequest } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL;

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;

  if (!ENGINE_URL) {
    return new Response(
      `<html><body style="background:#09090b;color:#a1a1aa;font-family:sans-serif;padding:2rem;">
        <h3>Engine Not Connected</h3>
        <p>Set ENGINE_URL environment variable to connect to the build engine.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const engineRes = await fetch(`${ENGINE_URL}/api/workspace/${id}/preview`, {
      signal: controller.signal,
      headers: { "Accept": "text/html" },
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
        <p>${isTimeout
          ? "Preview generation took too long. The engine may be processing a large build."
          : `Cannot connect to build engine at ${ENGINE_URL}`}</p>
        <p style="color:#71717a;font-size:0.875rem;margin-top:1rem;">Workspace: ${id}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
