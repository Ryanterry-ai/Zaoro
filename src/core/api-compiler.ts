import * as fs from 'fs';
import * as path from 'path';
import { DataModel } from '../types/index.js';

export class APICompiler {
  public static compileAPIRoutes(workspacePath: string, models: DataModel[]): void {
    for (const model of models) {
      const lowerModel = model.name.toLowerCase();
      const apiDir = path.join(workspacePath, 'src', 'app', 'api', lowerModel);
      fs.mkdirSync(apiDir, { recursive: true });

      const fieldNames = model.fields.map(f => f.name);
      const hasId = fieldNames.includes('id');

      const routeCode = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.${lowerModel}.findMany();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await prisma.${lowerModel}.create({
      data: body,
    });
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
`;

      fs.writeFileSync(path.join(apiDir, 'route.ts'), routeCode, 'utf-8');
    }
  }
}
