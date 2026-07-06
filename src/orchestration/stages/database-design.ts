// ─── Database Design Stage ────────────────────────────────────────────────────
//
// Designs the database schema, relationships, indexes, and migration strategy.
// ──────────────────────────────────────────────────────────────────────────────

import { BaseStage } from './base-stage.js';
import type { StageMeta, StageContext, StageResult, AgentRole, LLMTaskType } from '../types.js';

const meta: StageMeta = {
  id: 'database-design',
  name: 'Database Design',
  description: 'Design database schema, relationships, and data access patterns',
  agentRole: 'database' as AgentRole,
  dependencies: ['architecture', 'business-analysis'],
  inputs: ['manifest', 'requirements', 'architecture.tech-stack'],
  outputs: ['database.schema'],
  estimatedDurationSec: 120,
  skippable: false,
  maxRetries: 2,
  parallelizable: false,
};

export class DatabaseDesignStage extends BaseStage {
  meta = meta;

  async execute(ctx: StageContext): Promise<StageResult> {
    const start = Date.now();
    const warnings: string[] = [];

    const manifest = ctx.getArtifact<Record<string, unknown>>('manifest');
    const requirements = ctx.getArtifact<Record<string, unknown>>('requirements');
    const techStack = ctx.getArtifact<Record<string, unknown>>('architecture.tech-stack');

    const prompt = `Design the database schema for this project.

## Project
${JSON.stringify(manifest, null, 2)}

## Requirements
${requirements ? JSON.stringify(requirements, null, 2) : 'No requirements'}

## Tech Stack
${techStack ? JSON.stringify(techStack, null, 2) : 'No tech stack selected'}

## Required Output (JSON)
{
  "database": {
    "type": "relational | document | key-value | graph",
    "engine": "postgres | mysql | mongodb | redis | sqlite",
    "orm": "prisma | drizzle | typeorm | sequelize | mongoose"
  },
  "tables": [
    {
      "name": "table_name",
      "description": "What it stores",
      "columns": [
        {
          "name": "column_name",
          "type": "data type",
          "nullable": false,
          "unique": false,
          "primaryKey": false,
          "description": "What it stores"
        }
      ],
      "indexes": [
        {
          "columns": ["column_name"],
          "unique": false,
          "description": "Why this index"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "table.column",
      "to": "table.column",
      "type": "one-to-one | one-to-many | many-to-many",
      "description": "Relationship description"
    }
  ],
  "enums": [
    {
      "name": "EnumName",
      "values": ["value1", "value2"],
      "description": "What it represents"
    }
  ]
}`;

    const llmResult = await ctx.callLLM({
      taskType: 'code-generation' as LLMTaskType,
      systemPrompt: 'Design the database schema and output structured JSON with tables, columns, relationships, indexes, and enums.',
      prompt,
      temperature: 0.2,
    });

    const schema = llmResult.parsed ?? JSON.parse(llmResult.content);
    if (!schema) {
      return this.fail('Failed to parse database schema', Date.now() - start);
    }

    ctx.setArtifact('database.schema', schema);

    const db = schema.database ?? {};
    const md = this.generateMarkdown('Database Design', [
      { heading: 'Database', content: this.jsonToMarkdownTable({ type: db.type, engine: db.engine, orm: db.orm }) },
      { heading: 'Tables', content: (schema.tables ?? []).map((t: Record<string, unknown>) => {
        const cols = (t.columns as Array<Record<string, unknown>> ?? []).map((c: Record<string, unknown>) => `  - \`${c.name}\` ${c.type}${c.primaryKey ? ' (PK)' : ''}${c.unique ? ' (unique)' : ''}`);
        return `### ${t.name}\n${t.description}\n\nColumns:\n${cols.join('\n')}`;
      }).join('\n\n') },
      { heading: 'Relationships', content: this.arrayToMarkdownTable(schema.relationships ?? [], ['from', 'to', 'type', 'description']) },
      { heading: 'Enums', content: (schema.enums ?? []).map((e: Record<string, unknown>) => `- **${e.name}**: ${(e.values as string[] ?? []).join(', ')}`).join('\n') },
    ]);

    return this.ok(
      { schema },
      Date.now() - start,
      1,
      llmResult.usage.total,
      warnings,
      md,
    );
  }
}
