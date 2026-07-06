import { NextRequest } from 'next/server';
import { engineFetch } from '@/lib/engine';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const filePath = url.searchParams.get('path');
  const qs = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
  const result = await engineFetch(`/api/workspace/${id}/file${qs}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  });
  return Response.json(result.data, { status: result.status });
}
