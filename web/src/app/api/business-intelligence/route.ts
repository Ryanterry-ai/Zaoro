import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const result = await engineFetch('/api/bi/run', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    headers: { 'Content-Type': 'application/json' },
    timeoutMs: 300000,
  });

  if (!result.ok) {
    return Response.json({ error: result.data?.error || 'BI pipeline failed' }, { status: result.status });
  }

  return Response.json(result.data);
}
