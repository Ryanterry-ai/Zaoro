import type { StageInput, EntityGraph, DatabaseGraph, TableDef } from '../stages.js';

export function runDatabaseGraphStage(_input: StageInput, entityGraph: EntityGraph): DatabaseGraph {
  const tables: TableDef[] = entityGraph.entities.map(entity => ({
    name: `${entity.slug}s`,
    columns: entity.fields,
    indexes: entity.fields
      .filter(f => f.indexed || f.unique)
      .map(f => ({ columns: [f.name], unique: f.unique })),
    foreignKeys: entityGraph.relationships
      .filter(r => r.source === entity.name && r.foreignKey)
      .map(r => ({
        column: r.foreignKey!,
        references: `${r.target.toLowerCase()}s(id)`,
        onDelete: 'cascade',
      })),
  }));

  // Add foreign keys for belongs_to relationships (add foreignKey column if missing)
  for (const rel of entityGraph.relationships) {
    if (rel.type === 'belongs_to' && rel.foreignKey) {
      const table = tables.find(t => t.name === `${rel.source.toLowerCase()}s`);
      if (table && !table.columns.some(c => c.name === rel.foreignKey!)) {
        table.columns.push({
          name: rel.foreignKey!,
          type: 'string',
          required: false,
          indexed: true,
          unique: false,
        });
      }
    }
  }

  return {
    engine: 'postgresql',
    tables,
  };
}
