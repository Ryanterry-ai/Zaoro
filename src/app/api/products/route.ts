import { NextResponse } from 'next/server';
import { getAllProducts, saveProducts } from '@/lib/data-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const products = await getAllProducts();
  return NextResponse.json(products, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    await saveProducts(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
