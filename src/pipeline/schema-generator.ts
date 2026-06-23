/**
 * Stage 1: Schema & Contract Generator
 * Generates Prisma schemas, TypeScript interfaces, DTOs, API route contracts.
 * Foundation layer only — no UI, no business logic.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SchemaModel {
  name: string;
  fields: SchemaField[];
  relations: SchemaRelation[];
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  isId: boolean;
  defaultValue?: string;
  isUnique?: boolean;
}

export interface SchemaRelation {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one';
  model: string;
  fields: string[];
  references: string[];
  onDelete?: string;
}

export interface APIContract {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requestSchema?: string;
  responseSchema: string;
  auth: boolean;
  queryParams?: string[];
}

export interface TypeScriptInterface {
  name: string;
  fields: Array<{ name: string; type: string; optional: boolean; description?: string }>;
  description?: string;
}

export interface Stage1Output {
  models: SchemaModel[];
  interfaces: TypeScriptInterface[];
  apiContracts: APIContract[];
  prismaSchema: string;
  generatedFiles: string[];
}

export class SchemaGenerator {
  /**
   * Generate the complete schema & contract layer.
   */
  generate(
    appName: string,
    capabilities: string[],
    blueprintModels: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }> }>,
    blueprintAPIs: Array<{ path: string; method: string; description: string; auth: boolean }>,
    workspacePath: string,
  ): Stage1Output {
    console.log('[schema-gen] Stage 1: Generating schemas & contracts...');

    // 1. Generate Prisma schema
    const models = this.generateModels(blueprintModels);
    const prismaSchema = this.generatePrismaSchema(appName, models);

    // 2. Generate TypeScript interfaces
    const interfaces = this.generateInterfaces(models);

    // 3. Generate API contracts
    const apiContracts = this.generateAPIContracts(blueprintAPIs, models);

    // 4. Write files to disk
    const generatedFiles: string[] = [];

    // Prisma schema
    const prismaDir = path.join(workspacePath, 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), prismaSchema, 'utf-8');
    generatedFiles.push('prisma/schema.prisma');

    // TypeScript interfaces
    const typesDir = path.join(workspacePath, 'src', 'types');
    fs.mkdirSync(typesDir, { recursive: true });
    const typesContent = this.generateTypesFile(interfaces);
    fs.writeFileSync(path.join(typesDir, 'generated.ts'), typesContent, 'utf-8');
    generatedFiles.push('src/types/generated.ts');

    // API contracts (OpenAPI-like spec)
    const contractsDir = path.join(workspacePath, 'src', 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    const contractsContent = JSON.stringify(apiContracts, null, 2);
    fs.writeFileSync(path.join(contractsDir, 'api.json'), contractsContent, 'utf-8');
    generatedFiles.push('src/contracts/api.json');

    console.log(`[schema-gen] Generated ${models.length} models, ${interfaces.length} interfaces, ${apiContracts.length} API contracts`);
    console.log(`[schema-gen] Files: ${generatedFiles.join(', ')}`);

    return { models, interfaces, apiContracts, prismaSchema, generatedFiles };
  }

  private generateModels(
    blueprintModels: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }> }>,
  ): SchemaModel[] {
    const models: SchemaModel[] = [];

    for (const bp of blueprintModels) {
      const fields: SchemaField[] = bp.fields.map(f => ({
        name: f.name,
        type: this.mapToPrismaType(f.type),
        required: f.required,
        isId: f.isId ?? false,
      }));

      // Add timestamps if not present
      if (!fields.some(f => f.name === 'createdAt')) {
        fields.push({ name: 'createdAt', type: 'DateTime', required: true, isId: false, defaultValue: 'now()' });
      }
      if (!fields.some(f => f.name === 'updatedAt')) {
        fields.push({ name: 'updatedAt', type: 'DateTime', required: true, isId: false });
      }

      models.push({ name: bp.name, fields, relations: [] });
    }

    // Detect relations from field names
    for (const model of models) {
      for (const field of model.fields) {
        if (field.name.endsWith('Id') && field.name.length > 2) {
          const relatedName = field.name.slice(0, -2);
          const relatedModel = models.find(m => m.name.toLowerCase() === relatedName.toLowerCase());
          if (relatedModel) {
            model.relations.push({
              name: relatedName,
              type: 'many-to-one',
              model: relatedModel.name,
              fields: [field.name],
              references: ['id'],
            });
          }
        }
      }
    }

    return models;
  }

  private generatePrismaSchema(appName: string, models: SchemaModel[]): string {
    const lines: string[] = [];

    lines.push(`// ${appName} — Auto-generated Prisma Schema`);
    lines.push(`// Generated by Build.Same Pipeline Stage 1`);
    lines.push('');
    lines.push('generator client {');
    lines.push('  provider = "prisma-client-js"');
    lines.push('}');
    lines.push('');
    lines.push('datasource db {');
    lines.push('  provider = "postgresql"');
    lines.push('  url      = env("DATABASE_URL")');
    lines.push('}');
    lines.push('');

    for (const model of models) {
      lines.push(`model ${model.name} {`);
      for (const field of model.fields) {
        const parts: string[] = [field.name, field.type];
        if (field.isId) parts.push('@id');
        if (field.defaultValue) parts.push(`@default(${field.defaultValue})`);
        if (field.isUnique) parts.push('@unique');
        if (!field.required) parts.push('?');
        lines.push(`  ${parts.join(' ')}`);
      }

      // Relations
      for (const rel of model.relations) {
        const relField = `${rel.name.toLowerCase()}`;
        lines.push(`  ${relField} ${rel.model}${rel.type === 'one-to-many' || rel.type === 'many-to-many' ? '[]' : '?'} @relation(fields: [${rel.fields.join(', ')}], references: [${rel.references.join(', ')}])`);
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  private generateInterfaces(models: SchemaModel[]): TypeScriptInterface[] {
    return models.map(model => ({
      name: model.name,
      fields: model.fields.map(f => ({
        name: f.name,
        type: this.mapToTSType(f.type),
        optional: !f.required,
      })),
      description: `${model.name} entity`,
    }));
  }

  private generateAPIContracts(
    blueprintAPIs: Array<{ path: string; method: string; description: string; auth: boolean }>,
    models: SchemaModel[],
  ): APIContract[] {
    const contracts: APIContract[] = [];

    for (const api of blueprintAPIs) {
      const model = models.find(m => api.path.includes(m.name.toLowerCase()));
      const responseSchema = model ? model.name : 'unknown';

      contracts.push({
        path: api.path,
        method: (api.method || 'GET') as APIContract['method'],
        description: api.description,
        responseSchema,
        auth: api.auth,
      });
    }

    return contracts;
  }

  private generateTypesFile(interfaces: TypeScriptInterface[]): string {
    const lines: string[] = [];

    lines.push('/** Auto-generated TypeScript interfaces — Stage 1 */');
    lines.push('');

    for (const iface of interfaces) {
      if (iface.description) lines.push(`/** ${iface.description} */`);
      lines.push(`export interface ${iface.name} {`);
      for (const field of iface.fields) {
        const opt = field.optional ? '?' : '';
        lines.push(`  ${field.name}${opt}: ${field.type};`);
      }
      lines.push('}');
      lines.push('');
    }

    // Generate CreateInput and UpdateInput types for each interface
    for (const iface of interfaces) {
      const requiredFields = iface.fields.filter(f => !f.optional && f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt');
      lines.push(`export type Create${iface.name}Input = {`);
      for (const field of requiredFields) {
        lines.push(`  ${field.name}: ${field.type};`);
      }
      lines.push('};');
      lines.push('');

      lines.push(`export type Update${iface.name}Input = Partial<Create${iface.name}Input>;`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private mapToPrismaType(type: string): string {
    switch (type.toLowerCase()) {
      case 'string': return 'String';
      case 'number':
      case 'integer':
      case 'int': return 'Int';
      case 'decimal':
      case 'float':
      case 'double': return 'Float';
      case 'boolean':
      case 'bool': return 'Boolean';
      case 'date':
      case 'datetime': return 'DateTime';
      case 'json': return 'Json';
      case 'enum': return 'String';
      default: return 'String';
    }
  }

  private mapToTSType(type: string): string {
    switch (type.toLowerCase()) {
      case 'string': return 'string';
      case 'number':
      case 'integer':
      case 'int':
      case 'decimal':
      case 'float':
      case 'double': return 'number';
      case 'boolean':
      case 'bool': return 'boolean';
      case 'date':
      case 'datetime': return 'Date';
      case 'json': return 'Record<string, unknown>';
      case 'enum': return 'string';
      default: return 'string';
    }
  }
}
