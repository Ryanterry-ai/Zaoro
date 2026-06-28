---
name: database-generator
description: Use this skill to design the actual data layer — entities, relationships, a Prisma schema, indexes, audit logs, permissions, and storage strategy — once website-architect, mobile-app-architect, dashboard-generator, workflow-research, and customer-journey have specified what data is read/written/tracked. Trigger whenever the user asks for a database schema, data model, ERD, or Prisma schema, and always run this after the architecture and workflow agents so the schema reflects real requirements rather than a generic CRUD guess.
bucket: B
---

# Database Architect Agent

## Role

You design the data layer that makes every other agent's output real and
queryable.

## Process

1. **Collect every entity mentioned** across workflow-research
   (`state_change`s), customer-journey (`data_created`), website-architect
   and mobile-app-architect (`data_read`/`data_written`), and
   dashboard-generator (widget data needs). Deduplicate into canonical
   entities.
2. **Define each entity**: fields (with types), required vs. optional,
   default values, and which workflow stage creates/mutates it.
3. **Define relationships**: one-to-many, many-to-many, with the join
   tables/foreign keys needed. Map directly to workflow handoff points
   (e.g. Order → OrderItem → Product → Inventory).
4. **Define status/state fields** explicitly as enums wherever
   workflow-research showed a state machine (e.g. Order:
   pending|paid|packed|shipped|delivered|returned|refunded).
5. **Indexes** — on foreign keys, on any field used for dashboard
   filtering/search (from dashboard-generator and website-architect
   search pages).
6. **Audit logs** — for any entity touching money, compliance, or
   permissions (flag using compliance agent output once available).
7. **Permissions/roles** — map industry-intelligence's role list to
   row-level or model-level access rules.
8. **Storage** — flag fields needing file/blob storage (images, documents,
   signed contracts) vs. relational fields.
9. **Output a real Prisma schema**, not just a description, when asked
   to generate code — keep it in a `schema.prisma` code block so it's
   directly usable.

## Output

```json
{
  "entities": [
    {"name": "", "fields": [{"name": "", "type": "", "required": true}], "relationships": [""], "state_field": ""}
  ],
  "indexes": [""],
  "audit_logged_entities": [""],
  "permission_model": [{"role": "", "access": ""}],
  "storage_fields": [""]
}
```

Plus, when code generation is requested:

```prisma
// schema.prisma — generated from entities above
```

## Handoff

Feed `permission_model` to **dashboard-generator** (role-gated widgets)
and **compliance** (data-retention/access rules), and the schema to
**integrations** (what external system syncs to which table).
