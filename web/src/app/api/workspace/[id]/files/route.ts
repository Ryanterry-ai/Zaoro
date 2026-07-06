import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await engineFetch(`/api/workspace/${id}/files`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  return Response.json(result.data, { status: result.status });
}
