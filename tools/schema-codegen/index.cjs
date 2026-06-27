// tools/schema-codegen/index.js
// Bucket A — entity-list → Prisma schema. Pure string transformation.
// Usage: node tools/schema-codegen/index.js <entities.json> <output.prisma>

const fs = require('fs');

const TYPE_MAP = {
  string: 'String',
  number: 'Float',
  boolean: 'Boolean',
  date: 'DateTime',
  id: 'String @id @default(cuid())',
};

function generateSchema(entities) {
  let schema = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n`;

  for (const entity of entities) {
    schema += `model ${entity.name} {\n`;
    for (const field of entity.fields) {
      const pascalType = TYPE_MAP[field.type] || 'String';
      const required = field.required ? '' : '?';
      schema += `  ${field.name} ${pascalType}${required}\n`;
    }
    schema += `}\n\n`;
  }

  return schema;
}

const [,, entitiesFile, outputFile] = process.argv;
if (!entitiesFile || !outputFile) {
  console.error('Usage: node index.js <entities.json> <output.prisma>');
  process.exit(1);
}

const entities = JSON.parse(fs.readFileSync(entitiesFile, 'utf-8'));
const schema = generateSchema(entities);
fs.writeFileSync(outputFile, schema);
console.log(`Generated Prisma schema with ${entities.length} models → ${outputFile}`);
