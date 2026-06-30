import { NextRequest } from 'next/server';
import { getEngineUrl } from '@/lib/engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${getEngineUrl()}/api/workspace/${id}/preview`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);
    const html = await res.text();
    return new Response(html, {
      status: res.status,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch {
    return new Response(
      `<html><body style="background:#09090b;color:#f43f5e;font-family:sans-serif;padding:2rem;">
        <h3>Engine Unreachable</h3>
        <p style="color:#71717a;font-size:0.875rem;margin-top:1rem;">Workspace: ${id}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
