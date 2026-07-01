import type { StageInput, CapabilityGraph, EntityGraph, EntityDef, EntityRelation } from '../stages.js';

export function runEntityGraphStage(input: StageInput, _capGraph: CapabilityGraph): EntityGraph {
  const entityMap = new Map<string, EntityDef>();
  const relationships: EntityRelation[] = [];

  for (const decision of input.decisions) {
    if (decision.action.type === 'add_entity') {
      const existing = entityMap.get(decision.action.name);
      if (existing) {
        for (const field of decision.action.fields) {
          if (!existing.fields.some(f => f.name === field)) {
            existing.fields.push(makeField(field));
          }
        }
        existing.capabilities.push(...(decision.action.capabilities ?? []));
      } else {
        entityMap.set(decision.action.name, {
          name: decision.action.name,
          slug: decision.action.name.toLowerCase(),
          fields: decision.action.fields.map(f => makeField(f)),
          workflows: [],
          capabilities: [...(decision.action.capabilities ?? [])],
        });
      }
    }

    if (decision.action.type === 'add_relationship') {
      const fk = decision.action.foreignKey;
      relationships.push({
        source: decision.action.source,
        target: decision.action.target,
        type: (decision.action.relationType ?? 'has_many') as typeof relationships[0]['type'],
        ...(fk ? { foreignKey: fk } : {}),
      });
    }
  }

  // Add default User entity if not present
  if (!entityMap.has('User')) {
    entityMap.set('User', {
      name: 'User',
      slug: 'user',
      fields: [
        { name: 'id', type: 'string', required: true, indexed: true, unique: true },
        { name: 'email', type: 'string', required: true, indexed: true, unique: true },
        { name: 'name', type: 'string', required: true, indexed: false, unique: false },
        { name: 'role', type: 'enum', required: true, indexed: false, unique: false },
        { name: 'createdAt', type: 'date', required: true, indexed: false, unique: false },
      ],
      workflows: ['User Management'],
      capabilities: ['Authentication'],
    });

    // Link entities to User
    for (const [, entity] of entityMap) {
      if (entity.name !== 'User') {
        relationships.push({
          source: entity.name,
          target: 'User',
          type: 'belongs_to',
          foreignKey: 'userId',
        });
      }
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    relationships,
  };
}

function makeField(name: string): import('../stages.js').EntityField {
  return {
    name,
    type: inferFieldType(name),
    required: name === 'id' || name === 'email' || name === 'createdAt',
    indexed: name === 'id' || name === 'email',
    unique: name === 'id' || name === 'email' || name === 'sku',
  };
}

function inferFieldType(name: string): import('../stages.js').EntityField['type'] {
  const lower = name.toLowerCase();
  if (lower === 'id' || lower.endsWith('id')) return 'string';
  if (lower.includes('email')) return 'string';
  if (lower.includes('price') || lower.includes('amount') || lower.includes('quantity') || lower.includes('count') || lower.includes('age')) return 'number';
  if (lower.includes('date') || lower.includes('at') || lower.includes('time')) return 'date';
  if (lower.includes('active') || lower.includes('enabled') || lower.includes('verified') || lower.includes('completed')) return 'boolean';
  if (lower.includes('type') || lower.includes('status') || lower.includes('role') || lower.includes('category')) return 'enum';
  return 'string';
}
