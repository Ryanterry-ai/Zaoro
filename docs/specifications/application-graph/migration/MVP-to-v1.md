# Application Graph — MVP to v1 Migration

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

Migrate from current ApplicationGraph (9 node kinds, 11 edge kinds) to full specification (27 node kinds, 32 edge kinds).

---

## Current State (MVP)

### Node Kinds (9)
- entity, table, endpoint, workflow, page, capability, feature, nav-item, layout

### Edge Kinds (11)
- has_table, has_endpoint, has_workflow, has_page, has_capability, has_feature, has_nav_item
- entity_relation, endpoint_for_entity, workflow_uses_entity, page_uses_entity

---

## Target State (v1)

### New Node Kinds (+18)
| Category | New Kinds |
|----------|-----------|
| Domain | value-object, enum |
| Storage | index, view |
| API | field, auth-rule |
| Process | step, event |
| UI | component, section |
| Navigation | nav-group |
| Capability | requirement |
| Infrastructure | service, queue, cache |
| Metadata | design-token, theme, i18n-key |

### New Edge Kinds (+21)
| Category | New Edges |
|----------|-----------|
| Ownership | has_field, has_step, has_feature, has_requirement, has_group |
| Relation | value_object_of, enum_used_by |
| Dependency | feature_requires_entity, component_uses_entity, service_consumes |
| Flow | workflow_step, step_triggers_event, event_consumed_by |
| Navigation | nav_item_page, nav_group_item |
| UI | page_has_layout, layout_has_component, component_renders_entity |
| Capability | capability_has_feature, feature_has_requirement |
| Metadata | entity_has_token, page_has_theme, entity_has_i18n |

---

## Migration Plan

### Phase 1: Specification (Week 1-2)
- Create specification package
- Define formal schemas
- Document current state

### Phase 2: Core Nodes (Week 3-4)
- Add value-object, enum, field, auth-rule
- Update validation rules
- Update compiler pass contracts

### Phase 3: UI Nodes (Week 5-6)
- Add component, section, nav-group
- Update validation rules
- Update compiler pass contracts

### Phase 4: Process Nodes (Week 7-8)
- Add step, event, requirement
- Update validation rules
- Update compiler pass contracts

### Phase 5: Infrastructure Nodes (Week 9-10)
- Add service, queue, cache
- Update validation rules
- Update compiler pass contracts

### Phase 6: Metadata Nodes (Week 11-12)
- Add design-token, theme, i18n-key
- Update validation rules
- Update compiler pass contracts

### Phase 7: Edge Extension (Week 13-14)
- Add all new edge kinds
- Update validation rules
- Update compiler pass contracts

### Phase 8: Documentation (Week 15-16)
- Complete documentation
- Create examples
- Final testing

---

## Backward Compatibility

### Guarantees
1. Old code works with new graphs
2. New code works with old graphs
3. Unknown node kinds are ignored
4. Unknown edge kinds are ignored
5. Unknown fields are skipped

### Implementation
```typescript
// Switch statement with default case
switch (node.kind) {
  case 'entity':
    // Handle entity
    break;
  default:
    // Ignore unknown kinds
    console.warn(`Unknown node kind: ${node.kind}`);
    break;
}
```

---

## Testing

### Unit Tests
- Test each new node/edge kind
- Test validation rules
- Test serialization

### Integration Tests
- Test with existing compiler passes
- Test backward compatibility
- Test forward compatibility

### Regression Tests
- Ensure all existing tests pass
- Ensure no performance regression

---

## Rollback

### Triggers
- >5% test failures
- >20% performance degradation
- Breaking changes detected

### Process
1. Revert to previous commit
2. Notify team
3. Document issues
4. Plan fix

---

## Timeline

| Phase | Duration | Weeks |
|-------|----------|-------|
| Specification | 2 weeks | 1-2 |
| Core Nodes | 2 weeks | 3-4 |
| UI Nodes | 2 weeks | 5-6 |
| Process Nodes | 2 weeks | 7-8 |
| Infrastructure Nodes | 2 weeks | 9-10 |
| Metadata Nodes | 2 weeks | 11-12 |
| Edge Extension | 2 weeks | 13-14 |
| Documentation | 2 weeks | 15-16 |
| **Total** | **16 weeks** | |

---

**End of Migration Plan**
