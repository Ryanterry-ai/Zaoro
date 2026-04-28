import { NextResponse } from 'next/server';
import { getNavigation } from '@/lib/data';
import fs from 'fs';
import path from 'path';

export async function GET() {
  return NextResponse.json(getNavigation());
}

export async function PUT(req: Request) {
  try {
    const data = await req.json();
    const filePath = path.join(process.cwd(), 'data', 'navigation.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
