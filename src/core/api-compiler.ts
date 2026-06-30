import * as fs from 'fs';
import * as path from 'path';
import { DataModel } from '../types/index.js';

export class APICompiler {
  public static compileAPIRoutes(workspacePath: string, models: DataModel[]): void {
    for (const model of models) {
      // Prisma uses camelCase for model accessors: MenuItem → menuItem, not menuitem
      const camelModel = model.name.charAt(0).toLowerCase() + model.name.slice(1);
      const apiDir = path.join(workspacePath, 'src', 'app', 'api', camelModel);
      fs.mkdirSync(apiDir, { recursive: true });

      const fieldNames = model.fields.map(f => f.name);
      const hasId = fieldNames.includes('id');

      const routeCode = `import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.${camelModel}.findMany();
    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await prisma.${camelModel}.create({
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
