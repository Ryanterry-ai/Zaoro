import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await engineFetch('/api/create', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (result.ok) {
    return Response.json(result.data);
  }

  // Fallback: return locally-generated ID so frontend navigates to workspace
  return Response.json({ id, prompt });
}
