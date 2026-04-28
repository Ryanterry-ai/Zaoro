import { NextResponse } from 'next/server';
import { getAllCollections, saveCollections } from '@/lib/data-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const collections = await getAllCollections();
  return NextResponse.json(collections, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    await saveCollections(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
