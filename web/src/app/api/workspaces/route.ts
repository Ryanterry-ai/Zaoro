import { NextRequest } from 'next/server';
import { getEngineUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const engineUrl = getEngineUrl();

  const upstream = await fetch(`${engineUrl}/api/workspaces`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    signal: req.signal,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
