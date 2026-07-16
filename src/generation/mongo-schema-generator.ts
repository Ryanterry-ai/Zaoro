/**
 * MongoDB Schema Generator
 *
 * Reads the ApplicationGraph and produces three artifacts per entity:
 *   1. Mongoose schema definition (for MongoDB ODM)
 *   2. Pydantic model (for FastAPI backend validation)
 *   3. TypeScript interface (for frontend type safety)
 *
 * Also generates connection boilerplate and config for MongoDB URI.
 */

import type {
  ApplicationGraph,
  EntityNode,
} from '../bos/graph/application-graph.js';
import type {
  EntityDef,
  EntityField,
  EntityRelation,
} from '../bos/pipeline-v2/stages.js';

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface MongoSchema {
  entityName: string;
  mongooseSchema: string;
  pydanticModel: string;
  tsInterface: string;
}

// ─── Field Type Mapping ──────────────────────────────────────────────────────

interface MongooseFieldDef {
  mongooseType: string;
  pydanticType: string;
  tsType: string;
  extra?: string;
}

function mapFieldType(field: EntityField, allEntities: EntityDef[]): MongooseFieldDef {
  switch (field.type) {
    case 'string':
      return {
        mongooseType: 'String',
        pydanticType: 'str',
        tsType: 'string',
      };
    case 'number':
      return {
        mongooseType: 'Number',
        pydanticType: 'float',
        tsType: 'number',
      };
    case 'boolean':
      return {
        mongooseType: 'Boolean',
        pydanticType: 'bool',
        tsType: 'boolean',
      };
    case 'date':
      return {
        mongooseType: 'Date',
        pydanticType: 'datetime',
        tsType: 'string',
      };
    case 'enum': {
      const enumValues = extractEnumValues(field);
      const mongooseEnum = enumValues.length > 0
        ? `\n      enum: [${enumValues.map(v => `'${v}'`).join(', ')}],`
        : '';
      return {
        mongooseType: 'String',
        pydanticType: `Literal[${enumValues.map(v => `'${v}'`).join(', ')}]`,
        tsType: enumValues.length > 0
          ? enumValues.map(v => `'${v}'`).join(' | ')
          : 'string',
        extra: mongooseEnum,
      };
    }
    case 'reference': {
      const refEntity = allEntities.find(
        e => e.name.toLowerCase() === field.name.replace(/Id$/i, '').toLowerCase()
          || e.slug === field.name.replace(/Id$/i, ''),
      );
      const refName = refEntity?.name ?? capitalize(field.name.replace(/Id$/i, ''));
      return {
        mongooseType: 'Schema.Types.ObjectId',
        pydanticType: 'str',
        tsType: 'string',
        extra: `\n      ref: '${refName}',`,
      };
    }
    default:
      return {
        mongooseType: 'Schema.Types.Mixed',
        pydanticType: 'Any',
        tsType: 'unknown',
      };
  }
}

function extractEnumValues(field: EntityField): string[] {
  const raw = (field as unknown as { values?: string[] }).values;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  const name = field.name.toLowerCase();
  if (name.includes('status')) {
    if (name.includes('order')) return ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (name.includes('payment')) return ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (name.includes('task')) return ['todo', 'in_progress', 'done'];
    return ['active', 'inactive', 'archived'];
  }
  if (name.includes('role')) return ['admin', 'user', 'moderator'];
  if (name.includes('type')) return ['primary', 'secondary', 'tertiary'];
  if (name.includes('priority')) return ['low', 'medium', 'high', 'critical'];
  return [];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function camelToPascal(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pascalToSnake(s: string): string {
  return s
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// ─── Relation Helpers ────────────────────────────────────────────────────────

function findRelationsForEntity(
  entityName: string,
  edges: Array<{ kind: string; from: string; to: string; label?: string }>,
): EntityRelation[] {
  return edges
    .filter(e => e.kind === 'entity_relation' && e.from === `entity:${entityName}`)
    .map(e => ({
      source: e.from.replace('entity:', ''),
      target: e.to.replace('entity:', ''),
      type: (e.label ?? 'belongs_to') as EntityRelation['type'],
    }));
}


// ─── Mongoose Schema Generator ──────────────────────────────────────────────

function generateMongooseSchema(
  entity: EntityDef,
  allEntities: EntityDef[],
  relations: EntityRelation[],
): string {
  const lines: string[] = [];
  const indent = '  ';
  const fieldIndent = indent + indent;

  lines.push(`const ${entity.name}Schema = new Schema({`);

  for (const field of entity.fields) {
    const mapped = mapFieldType(field, allEntities);

    lines.push(`${fieldIndent}${field.name}: {`);
    lines.push(`${fieldIndent}  type: ${mapped.mongooseType},`);
    if (mapped.extra) {
      lines.push(`${fieldIndent}  ${mapped.extra.trim()}`);
    }
    if (field.required) {
      lines.push(`${fieldIndent}  required: true,`);
    }
    if (field.unique) {
      lines.push(`${fieldIndent}  unique: true,`);
    }
    if (field.indexed) {
      lines.push(`${fieldIndent}  index: true,`);
    }
    lines.push(`${fieldIndent}},`);
  }

  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = camelToPascal(rel.target);
    const fieldName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    lines.push(`${fieldIndent}${fieldName}: {`);
    lines.push(`${fieldIndent}  type: Schema.Types.ObjectId,`);
    lines.push(`${fieldIndent}  ref: '${refName}',`);
    if (rel.type === 'has_one') {
      lines.push(`${fieldIndent}  required: true,`);
    }
    lines.push(`${fieldIndent}},`);
  }

  lines.push(`${indent}}, {`);
  lines.push(`${indent}  timestamps: true,`);
  lines.push(`${indent}  toJSON: { virtuals: true },`);
  lines.push(`${indent}  toObject: { virtuals: true },`);
  lines.push(`${indent}});`);

  // Indexes
  const indexFields: string[] = [];
  for (const field of entity.fields) {
    if (field.indexed && !field.unique) {
      indexFields.push(field.name);
    }
  }
  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') {
      continue;
    }
    const fieldName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    if (!indexFields.includes(fieldName)) {
      indexFields.push(fieldName);
    }
  }
  if (indexFields.length > 0) {
    lines.push('');
    lines.push(`${entity.name}Schema.index({ ${indexFields.map(f => `${f}: 1`).join(', ')} });`);
  }

  return lines.join('\n');
}

// ─── Pydantic Model Generator ───────────────────────────────────────────────

function generatePydanticModel(
  entity: EntityDef,
  allEntities: EntityDef[],
  relations: EntityRelation[],
): string {
  const lines: string[] = [];
  const imports = new Set<string>();

  imports.add('from pydantic import BaseModel, Field');
  imports.add('from typing import Optional');
  imports.add('from datetime import datetime');

  const baseFields: string[] = [];

  for (const field of entity.fields) {
    const mapped = mapFieldType(field, allEntities);

    if (mapped.pydanticType === 'datetime') {
      imports.add('from datetime import datetime');
    }
    if (mapped.pydanticType.startsWith('Literal')) {
      imports.add('from typing import Literal');
    }

    const fieldType = field.required ? mapped.pydanticType : `Optional[${mapped.pydanticType}]`;
    const fieldDefault = field.required ? '' : ' = None';
    const fieldArgs: string[] = [];
    fieldArgs.push(`description="${field.name}"`);

    baseFields.push(
      `    ${field.name}: ${fieldType}${fieldDefault} = Field(${fieldArgs.join(', ')})`,
    );
  }

  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    const opt = rel.type === 'has_one' ? '' : ' = None';
    baseFields.push(`    ${refName}: Optional[str]${opt}`);
  }

  lines.push(`${Array.from(imports).join('\n')}`);
  lines.push('');
  lines.push(`class ${entity.name}(BaseModel):`);
  lines.push(`    """${entity.name} model."""`);
  lines.push('');
  lines.push('    id: str = Field(..., alias="_id")');
  lines.push('    created_at: datetime = Field(default_factory=datetime.utcnow)');
  lines.push('    updated_at: datetime = Field(default_factory=datetime.utcnow)');
  lines.push('');
  for (const bf of baseFields) {
    lines.push(bf);
  }
  lines.push('');
  lines.push('    class Config:');
  lines.push('        populate_by_name = True');
  lines.push('        json_encoders = {');
  lines.push('            datetime: lambda v: v.isoformat(),');
  lines.push('        }');
  lines.push('');

  // Create model (without id, created_at, updated_at)
  lines.push(`class ${entity.name}Create(BaseModel):`);
  lines.push(`    """Create payload for ${entity.name}."""`);
  lines.push('');
  const createBase: string[] = [];
  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    const mapped = mapFieldType(field, allEntities);
    const fieldType = field.required ? mapped.pydanticType : `Optional[${mapped.pydanticType}]`;
    const fieldDefault = field.required ? '' : ' = None';
    createBase.push(`    ${field.name}: ${fieldType}${fieldDefault}`);
  }
  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    const opt = rel.type === 'has_one' ? '' : ' = None';
    createBase.push(`    ${refName}: Optional[str]${opt}`);
  }
  lines.push(...createBase);

  lines.push('');
  lines.push(`class ${entity.name}Update(BaseModel):`);
  lines.push(`    """Update payload for ${entity.name} — all fields optional."""`);
  lines.push('');
  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    const mapped = mapFieldType(field, allEntities);
    lines.push(`    ${field.name}: Optional[${mapped.pydanticType}] = None`);
  }
  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    lines.push(`    ${refName}: Optional[str] = None`);
  }

  return lines.join('\n');
}

// ─── TypeScript Interface Generator ─────────────────────────────────────────

function generateTsInterface(
  entity: EntityDef,
  allEntities: EntityDef[],
  relations: EntityRelation[],
): string {
  const lines: string[] = [];

  lines.push(`export interface ${entity.name} {`);
  lines.push(`  _id: string;`);
  lines.push(`  createdAt: string;`);
  lines.push(`  updatedAt: string;`);

  for (const field of entity.fields) {
    const mapped = mapFieldType(field, allEntities);
    const optional = field.required ? '' : '?';
    lines.push(`  ${field.name}${optional}: ${mapped.tsType};`);
  }

  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    const optional = rel.type === 'has_one' ? '' : '?';
    lines.push(`  ${refName}${optional}: string;`);
  }

  lines.push(`}`);

  lines.push('');
  lines.push(`export interface ${entity.name}CreateInput {`);

  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    const mapped = mapFieldType(field, allEntities);
    const optional = field.required ? '' : '?';
    lines.push(`  ${field.name}${optional}: ${mapped.tsType};`);
  }

  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    const optional = rel.type === 'has_one' ? '' : '?';
    lines.push(`  ${refName}${optional}: string;`);
  }

  lines.push(`}`);

  lines.push('');
  lines.push(`export interface ${entity.name}UpdateInput {`);

  for (const field of entity.fields) {
    if (field.name === 'id') continue;
    const mapped = mapFieldType(field, allEntities);
    lines.push(`  ${field.name}?: ${mapped.tsType} | undefined;`);
  }

  for (const rel of relations) {
    if (rel.type === 'has_many' || rel.type === 'many_to_many') continue;
    const refName = rel.target.charAt(0).toLowerCase() + rel.target.slice(1);
    lines.push(`  ${refName}?: string | undefined;`);
  }

  lines.push(`}`);

  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateMongoSchemas(graph: ApplicationGraph): MongoSchema[] {
  const entityNodes = graph.nodes.filter(
    (n): n is EntityNode => n.kind === 'entity',
  );

  const allEntities = entityNodes.map(n => n.data);

  return entityNodes.map(node => {
    const entity = node.data;
    const relations = findRelationsForEntity(entity.name, graph.edges);

    return {
      entityName: entity.name,
      mongooseSchema: generateMongooseSchema(entity, allEntities, relations),
      pydanticModel: generatePydanticModel(entity, allEntities, relations),
      tsInterface: generateTsInterface(entity, allEntities, relations),
    };
  });
}

export function generateMongooseConnection(): string {
  return `import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/app';

let isConnected = false;

export async function connectToDatabase(): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[db] Disconnected from MongoDB');
}

mongoose.connection.on('error', (err) => {
  console.error('[db] MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('[db] MongoDB disconnected');
});

process.on('SIGINT', async () => {
  await disconnectFromDatabase();
  process.exit(0);
});
`;
}

export function generateMongooseConfig(): string {
  return `# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/app

# Connection pool size (default: 10)
MONGODB_POOL_SIZE=10

# Server selection timeout in ms (default: 5000)
MONGODB_SERVER_SELECTION_TIMEOUT=5000

# Socket timeout in ms (default: 45000)
MONGODB_SOCKET_TIMEOUT=45000
`;
}
