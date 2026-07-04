# Application Graph — Gap Analysis

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

This document maps the current ApplicationGraph implementation (MVP) against the specification (v1.0.0-draft) and identifies gaps.

---

## Current State (MVP)

### Node Kinds (9)
| Kind | Description | Status |
|------|-------------|--------|
| entity | Domain object (User, Product, Order) | ✅ Implemented |
| table | Database table | ✅ Implemented |
| endpoint | API endpoint | ✅ Implemented |
| workflow | Business process | ✅ Implemented |
| page | UI page | ✅ Implemented |
| capability | System capability | ✅ Implemented |
| feature | Concrete feature | ✅ Implemented |
| nav-item | Navigation item | ✅ Implemented |
| layout | Page layout | ✅ Implemented |

### Edge Kinds (11)
| Kind | Description | Status |
|------|-------------|--------|
| has_table | Entity → Table | ✅ Implemented |
| has_endpoint | Entity → Endpoint | ✅ Implemented |
| has_workflow | Entity → Workflow | ✅ Implemented |
| has_page | Entity → Page | ✅ Implemented |
| has_capability | Entity → Capability | ✅ Implemented |
| has_feature | Entity → Feature | ✅ Implemented |
| has_nav_item | Entity → NavItem | ✅ Implemented |
| entity_relation | Entity → Entity | ✅ Implemented |
| endpoint_for_entity | Endpoint → Entity | ✅ Implemented |
| workflow_uses_entity | Workflow → Entity | ✅ Implemented |
| page_uses_entity | Page → Entity | ✅ Implemented |
| feature_requires_entity | Feature → Entity | ✅ Implemented |

### Metadata
| Field | Description | Status |
|-------|-------------|--------|
| industry | Industry name | ✅ Implemented |
| subIndustry | Sub-industry name | ✅ Implemented |
| appName | Application name | ✅ Implemented |
| databaseEngine | Database engine | ✅ Implemented |
| country | Country code | ✅ Implemented |
| businessModels | Business models | ✅ Implemented |
| compliancePacks | Compliance packs | ✅ Implemented |
| audience | Target audience | ✅ Implemented |
| createdAt | Creation timestamp | ✅ Implemented |

---

## Target State (v1.0.0-draft)

### New Node Kinds (+18)
| Category | New Kinds | Priority |
|----------|-----------|----------|
| Domain | value-object, enum | P2 |
| Storage | index, view | P3 |
| API | field, auth-rule | P2 |
| Process | step, event | P2 |
| UI | component, section | P1 |
| Navigation | nav-group | P2 |
| Capability | requirement | P2 |
| Infrastructure | service, queue, cache | P3 |
| Metadata | design-token, theme, i18n-key | P3 |

### New Edge Kinds (+21)
| Category | New Edges | Priority |
|----------|-----------|----------|
| Ownership | has_field, has_step, has_feature, has_requirement, has_group | P2 |
| Relation | value_object_of, enum_used_by | P2 |
| Dependency | feature_requires_entity, component_uses_entity, service_consumes | P2 |
| Flow | workflow_step, step_triggers_event, event_consumed_by | P2 |
| Navigation | nav_item_page, nav_group_item | P2 |
| UI | page_has_layout, layout_has_component, component_renders_entity | P1 |
| Capability | capability_has_feature, feature_has_requirement | P2 |
| Metadata | entity_has_token, page_has_theme, entity_has_i18n | P3 |

---

## Gap Analysis

### Phase 1: UI Nodes (Priority P1)
**Current**: layout node kind exists  
**Gap**: component, section node kinds missing

**Action Items**:
1. Add `component` node kind
2. Add `section` node kind
3. Add `page_has_layout` edge kind
4. Add `layout_has_component` edge kind
5. Add `component_renders_entity` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 2: API & Process Nodes (Priority P2)
**Current**: endpoint, workflow node kinds exist  
**Gap**: field, auth-rule, step, event node kinds missing

**Action Items**:
1. Add `field` node kind (API field)
2. Add `auth-rule` node kind
3. Add `step` node kind (Workflow step)
4. Add `event` node kind
5. Add `has_field` edge kind
6. Add `has_step` edge kind
7. Add `workflow_step` edge kind
8. Add `step_triggers_event` edge kind
9. Add `event_consumed_by` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 3: Domain Nodes (Priority P2)
**Current**: entity node kind exists  
**Gap**: value-object, enum node kinds missing

**Action Items**:
1. Add `value-object` node kind
2. Add `enum` node kind
3. Add `value_object_of` edge kind
4. Add `enum_used_by` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 4: Navigation Nodes (Priority P2)
**Current**: nav-item node kind exists  
**Gap**: nav-group node kind missing

**Action Items**:
1. Add `nav-group` node kind
2. Add `has_group` edge kind
3. Add `nav_item_page` edge kind
4. Add `nav_group_item` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 5: Capability Nodes (Priority P2)
**Current**: capability, feature node kinds exist  
**Gap**: requirement node kind missing

**Action Items**:
1. Add `requirement` node kind
2. Add `has_requirement` edge kind
3. Add `capability_has_feature` edge kind
4. Add `feature_has_requirement` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 6: Storage Nodes (Priority P3)
**Current**: table node kind exists  
**Gap**: index, view node kinds missing

**Action Items**:
1. Add `index` node kind
2. Add `view` node kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 7: Infrastructure Nodes (Priority P3)
**Current**: No infrastructure node kinds  
**Gap**: service, queue, cache node kinds missing

**Action Items**:
1. Add `service` node kind
2. Add `queue` node kind
3. Add `cache` node kind
4. Add `service_consumes` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

### Phase 8: Metadata Nodes (Priority P3)
**Current**: No metadata node kinds  
**Gap**: design-token, theme, i18n-key node kinds missing

**Action Items**:
1. Add `design-token` node kind
2. Add `theme` node kind
3. Add `i18n-key` node kind
4. Add `entity_has_token` edge kind
5. Add `page_has_theme` edge kind
6. Add `entity_has_i18n` edge kind

**Files to Modify**:
- `src/bos/graph/application-graph.ts`: Add new node kinds
- `src/bos/pipeline-v2/stages.ts`: Add new node data types

---

## Implementation Timeline

| Phase | Duration | Weeks | Priority |
|-------|----------|-------|----------|
| Phase 1: UI Nodes | 2 weeks | 1-2 | P1 |
| Phase 2: API & Process Nodes | 2 weeks | 3-4 | P2 |
| Phase 3: Domain Nodes | 2 weeks | 5-6 | P2 |
| Phase 4: Navigation Nodes | 2 weeks | 7-8 | P2 |
| Phase 5: Capability Nodes | 2 weeks | 9-10 | P2 |
| Phase 6: Storage Nodes | 2 weeks | 11-12 | P3 |
| Phase 7: Infrastructure Nodes | 2 weeks | 13-14 | P3 |
| Phase 8: Metadata Nodes | 2 weeks | 15-16 | P3 |
| **Total** | **16 weeks** | | |

---

## Current Implementation Files

### Core Files
- `src/bos/graph/application-graph.ts`: ApplicationGraph definition
- `src/bos/graph/types.ts`: Knowledge Graph types
- `src/bos/graph/engine.ts`: Knowledge Graph engine
- `src/bos/pipeline-v2/stages.ts`: Pipeline stage definitions

### Compiler Passes
- `src/generation/compiler-passes.ts`: 9 compiler passes

### Validation
- `src/bos/graph/validation.ts`: Graph validation

---

## Next Steps

1. **Start Phase 1**: Add UI node kinds (component, section)
2. **Update compiler passes**: Add validation for new node kinds
3. **Add unit tests**: Test new node kinds
4. **Update documentation**: Update developer guide

---

**End of Gap Analysis**
