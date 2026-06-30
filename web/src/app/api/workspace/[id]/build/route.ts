import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await engineFetch(`/api/workspace/${id}/build`, {
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'application/json' },
    timeoutMs: 30000,
  });

  return Response.json(result.data, { status: result.status });
}
