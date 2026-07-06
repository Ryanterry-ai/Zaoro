import { NextRequest } from 'next/server';
import { getEngineUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const engineUrl = getEngineUrl();
  const artifact = new URL(req.url).searchParams.get('artifact');

  const upstreamUrl = artifact
    ? `${engineUrl}/api/workspace/${id}/inspect?artifact=${encodeURIComponent(artifact)}`
    : `${engineUrl}/api/workspace/${id}/inspect`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'text/event-stream',
        'ngrok-skip-browser-warning': 'true',
      },
      signal: req.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e: any) {
    return Response.json({ error: 'Engine unreachable', details: e.message }, { status: 502 });
  }
}
