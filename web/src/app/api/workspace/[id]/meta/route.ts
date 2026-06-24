import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await engineFetch(`/api/workspace/${id}/meta`, { timeoutMs: 5000 });
  if (!result.ok) {
    return Response.json({ id, type: 'build', exists: false });
  }
  return Response.json(result.data);
}
