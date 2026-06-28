#!/usr/bin/env node
/**
 * Build Engine — Schema Codegen (Bucket A)
 * Generates Prisma/SQL schema from an already-decided entity list.
 * Pure deterministic — no LLM.
 *
 * Usage: node index.js <entities.json> [--output ./prisma/schema.prisma] [--format prisma|sql]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { output: './prisma/schema.prisma', format: 'prisma' };
  let inputFile = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') opts.output = args[++i];
    else if (args[i] === '--format') opts.format = args[++i];
    else if (!args[i].startsWith('-')) inputFile = args[i];
  }
  if (!inputFile) { console.error('Usage: node index.js <entities.json>'); process.exit(1); }
  return { inputFile, ...opts };
}

function generatePrisma(entities) {
  const lines = [
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "postgresql"',
    '  url      = env("DATABASE_URL")',
    '}',
    '',
  ];

  for (const entity of entities) {
    lines.push(`model ${entity.name} {`);
    lines.push('  id        String   @id @default(cuid())');

    for (const field of (entity.fields || [])) {
      const type = mapPrismaType(field.type);
      const attrs = [];
      if (field.unique) attrs.push('@unique');
      if (field.default) attrs.push(`@default(${field.default})`);
      if (field.relation) {
        // Skip — handled by relation fields
        continue;
      }
      const optional = field.optional ? '?' : '';
      lines.push(`  ${field.name.padEnd(20)} ${type}${optional}${attrs.length ? ' ' + attrs.join(' ') : ''}`);
    }

    // Add relation fields
    for (const field of (entity.fields || [])) {
      if (field.relation) {
        const relType = field.relation.type === 'many' ? `${field.relation.model}[]` : `${field.relation.model}?`;
        const relAttr = field.relation.type === 'many' ? `  @relation(fields: [${field.name}], references: [id])` : '';
        lines.push(`  ${field.name.padEnd(20)} ${relType}${relAttr}`);
      }
    }

    // Add timestamps
    lines.push('  createdAt  DateTime @default(now())');
    lines.push('  updatedAt  DateTime @updatedAt');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateSQL(entities) {
  const lines = [];

  for (const entity of entities) {
    const columns = ['id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()'];

    for (const field of (entity.fields || [])) {
      const type = mapSQLType(field.type);
      const parts = [field.name, type];
      if (!field.optional) parts.push('NOT NULL');
      if (field.unique) parts.push('UNIQUE');
      if (field.default) parts.push(`DEFAULT ${field.default}`);
      columns.push('  ' + parts.join(' '));
    }

    columns.push('  created_at TIMESTAMP DEFAULT NOW()');
    columns.push('  updated_at TIMESTAMP DEFAULT NOW()');

    lines.push(`CREATE TABLE ${entity.name.toLowerCase()}s (`);
    lines.push(columns.join(',\n'));
    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
}

function mapPrismaType(type) {
  const map = {
    string: 'String',
    text: 'String',
    integer: 'Int',
    int: 'Int',
    float: 'Float',
    decimal: 'Decimal',
    boolean: 'Boolean',
    bool: 'Boolean',
    date: 'DateTime',
    datetime: 'DateTime',
    timestamp: 'DateTime',
    json: 'Json',
    uuid: 'String',
    email: 'String',
    url: 'String',
    enum: 'String',
  };
  return map[type?.toLowerCase()] || 'String';
}

function mapSQLType(type) {
  const map = {
    string: 'VARCHAR(255)',
    text: 'TEXT',
    integer: 'INTEGER',
    int: 'INTEGER',
    float: 'REAL',
    decimal: 'DECIMAL(10,2)',
    boolean: 'BOOLEAN',
    bool: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMP',
    json: 'JSONB',
    uuid: 'VARCHAR(36)',
    email: 'VARCHAR(255)',
    url: 'TEXT',
    enum: 'VARCHAR(100)',
  };
  return map[type?.toLowerCase()] || 'VARCHAR(255)';
}

async function main() {
  const opts = parseArgs();
  console.log(`[SchemaCodegen] Processing ${opts.inputFile}`);

  const entities = JSON.parse(fs.readFileSync(opts.inputFile, 'utf-8'));

  const output = opts.format === 'sql' ? generateSQL(entities) : generatePrisma(entities);

  const outputDir = path.dirname(path.resolve(opts.output));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.resolve(opts.output), output);

  console.log(`[SchemaCodegen] Generated ${entities.length} models. Output: ${opts.output}`);
  process.exit(0);
}

main().catch(err => { console.error('[SchemaCodegen] Fatal:', err.message); process.exit(1); });
