import { NextResponse } from 'next/server';
import { getNavigation, saveNavigation } from '@/lib/data-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const navigation = await getNavigation();
  return NextResponse.json(navigation);
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    await saveNavigation(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
