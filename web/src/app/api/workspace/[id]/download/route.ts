import { NextRequest } from 'next/server';
import { getEngineUrl } from '@/lib/engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${getEngineUrl()}/api/workspace/${id}/download`, {
      signal: controller.signal,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'bypass-tunnel-reminder': 'true',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${id}.zip"`,
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Engine unreachable — cannot download workspace' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
