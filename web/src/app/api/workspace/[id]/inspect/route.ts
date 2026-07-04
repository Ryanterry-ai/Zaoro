import { NextRequest } from 'next/server';
import { getEngineUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const engineUrl = getEngineUrl();

  const upstream = await fetch(`${engineUrl}/api/workspace/${id}/inspect`, {
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
}
