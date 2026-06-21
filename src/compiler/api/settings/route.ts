import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';
import fs from 'fs';
import path from 'path';

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'settings.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
