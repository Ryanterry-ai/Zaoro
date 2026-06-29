import * as fs from 'fs';
import * as path from 'path';
import { DataModel } from '../types/index.js';

export class DBCompiler {
  public static compileSchema(models: DataModel[]): string {
    let schema = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

`;

    for (const model of models) {
      schema += `model ${model.name} {\n`;

      // Ensure every model has an id field
      const hasId = model.fields.some(f => f.isId);
      if (!hasId) {
        schema += `  id String @id @default(uuid())\n`;
      }

      for (const field of model.fields) {
        let typeStr = 'String';
        if (field.type === 'number') typeStr = 'Int';
        else if (field.type === 'boolean') typeStr = 'Boolean';
        else if (field.type === 'DateTime') typeStr = 'DateTime';
        else if (field.type === 'relation') typeStr = 'String';

        const optionalChar = field.isRequired ? '' : '?';
        const idSuffix = field.isId ? ' @id @default(uuid())' : '';

        schema += `  ${field.name} ${typeStr}${optionalChar}${idSuffix}\n`;
      }
      schema += `}\n\n`;
    }

    return schema.trim() + '\n';
  }

  public static scaffoldPrismaClient(workspacePath: string, models: DataModel[]): void {
    const prismaDir = path.join(workspacePath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });

    const schemaContent = this.compileSchema(models);
    fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schemaContent, 'utf-8');

    const libDir = path.join(workspacePath, 'src', 'lib');
    fs.mkdirSync(libDir, { recursive: true });

    const clientCode = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`;

    fs.writeFileSync(path.join(libDir, 'db.ts'), clientCode, 'utf-8');
  }
}
