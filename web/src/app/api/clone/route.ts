import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function POST(req: NextRequest) {
  const body = await req.text();
  let parsed: any;
  try { parsed = JSON.parse(body); } catch { parsed = {}; }

  const id = parsed?.id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prompt = parsed?.prompt || '';

  const result = await engineFetch('/api/clone', {
    method: 'POST',
    body: JSON.stringify({ id, prompt, url: parsed?.url }),
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    timeoutMs: 300000,
  });

  return Response.json(result.data, { status: result.status });
}
