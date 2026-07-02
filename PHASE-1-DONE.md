# Phase 1 — Verification Checklist

## Run this to confirm no TypeScript errors

```bash
# from project root
npx tsc --noEmit
```

Expected: 0 errors.

If you see errors, the most likely causes are:
1. `src/bos/schemas/knowledge/pattern.schema.ts` — check optional fields were appended correctly
2. `src/bos/knowledge/patterns/enterprise-patterns.ts` — check IntegrationSpec type enum
3. `src/bos/knowledge/skill-packs/enterprise-packs.ts` — check WidgetSpec type enum

---

## Files written in Phase 1

| File | Change | Lines |
|---|---|---|
| `src/bos/schemas/knowledge/pattern.schema.ts` | Added 5 optional enterprise fields to PatternSchema (roles, departments, kpis, vocabulary, businessRules) | +7 |
| `src/bos/knowledge/patterns/enterprise-patterns.ts` | NEW — 7 enterprise patterns | ~500 |
| `src/bos/knowledge/skill-packs/enterprise-packs.ts` | NEW — 8 enterprise skill packs | ~700 |
| `src/bos/knowledge/registry.ts` | Added imports, registered all new patterns/packs, added HIPAA compliance pack, added findEnterprisePatterns() | +30 |

---

## What Phase 1 unlocks

After Phase 1 the registry contains:

- **Patterns: 30 total** (was 23, +7 enterprise)
  - HOSPITAL_MANAGEMENT — 11 pages, 8 roles, 7 KPIs, 7 departments, 8 business rules
  - ERP_SYSTEM — 8 pages, 8 roles, 7 KPIs, 8 departments, 6 business rules
  - HRM_SYSTEM — 9 pages, 8 roles, 7 KPIs, 5 departments, 8 business rules
  - SCHOOL_LMS — 10 pages, 7 roles, 6 KPIs, 7 departments, 7 business rules
  - CRM_ENTERPRISE — 9 pages, 6 roles, 7 KPIs, 5 departments, 7 business rules
  - LOGISTICS_PLATFORM — 8 pages, 7 roles, 7 KPIs, 5 departments, 7 business rules
  - MANUFACTURING_ERP — 8 pages, 7 roles, 7 KPIs, 7 departments, 7 business rules

- **Skill Packs: 14 total** (was 6, +8 enterprise)
  - CAP_APPOINTMENTS — calendar, slots, booking form, double-booking prevention
  - CAP_HR_MANAGEMENT — employee CRUD, attendance, leave workflow, payroll
  - CAP_BILLING_ENTERPRISE — invoices, line items, payments, aging report
  - CAP_WORKFLOW_ENGINE — approval chains, state machine, escalation
  - CAP_REPORTING — report builder, CSV/PDF export, scheduler
  - CAP_DOCUMENT_MANAGEMENT — upload, versioning, tags, search
  - CAP_ROLE_PERMISSIONS — RBAC matrix, role assignment, audit
  - CAP_AUDIT_LOG — immutable change history, diff viewer, export

- **Compliance Packs: 3 total** (was 2, +HIPAA)

---

## Manual smoke test (no code needed)

Confirm in your browser that building these prompts now produces the right result:

1. "Build hospital management system" → should select HOSPITAL_MANAGEMENT pattern → 11 pages with sidebar nav → Patient/Doctor/Appointment entities
2. "Build HR management system" → HRM_SYSTEM → 9 pages → Employee/Leave/Attendance entities
3. "Build school management system" → SCHOOL_LMS → 10 pages → Student/Class/Teacher entities
4. "Build CRM for sales team" → CRM_ENTERPRISE → 9 pages → Lead/Deal/Account entities
5. "Build logistics platform" → LOGISTICS_PLATFORM → 8 pages → Shipment/Driver/Route entities
6. "Build manufacturing ERP" → MANUFACTURING_ERP → 8 pages → WorkOrder/Inventory/QualityControl entities

If any of these land on the wrong pattern, the issue is in the scorer's `compatibleIndustries` matching in the BRE v2 pipeline — that is Phase 2 territory (graph enrichment).

---

## Ready for Phase 2?

Phase 2 adds the KnowledgeGraph layer — typed relationship edges between patterns, roles, entities, KPIs, and compliance packs. After Phase 2, the planning pipeline uses graph traversal to enrich BREContext (roles, KPIs, vocabulary, compliance) automatically from the selected pattern, instead of relying on static per-industry entity lists.

Confirm `npx tsc --noEmit` passes, run the 6 smoke tests, then say the word.
