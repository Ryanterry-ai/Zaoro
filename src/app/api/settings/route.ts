import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/data-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    await saveSettings(data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
