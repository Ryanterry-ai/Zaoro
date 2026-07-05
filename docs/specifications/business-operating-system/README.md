# Business Operating System (BOS) Specification

**Version**: 1.0.0  
**Status**: Frozen  
**Last Updated**: 2026-07-05

---

## Overview

The Business Operating System (BOS) defines how businesses themselves are represented. This is different from the Knowledge Graph which defines reusable knowledge.

The BOS answers: **"How does this specific business operate?"**

The planner combines the BOS with the Knowledge Graph to produce the Application Graph.

---

## Core Concepts

### 1. Business Profile
**What it is**: The business being built.

**Properties**:
```typescript
interface BusinessProfile {
  id: string;
  name: string;                    // "Acme Corp"
  slug: string;                    // "acme-corp"
  description: string;
  industry: string;                // Reference to Knowledge Graph Industry
  subIndustry?: string;            // Reference to Knowledge Graph SubIndustry
  businessModels: string[];        // References to Knowledge Graph BusinessModels
  country: string;                 // "US", "IN", "GB"
  language: string;                // "en", "hi", "es"
  timezone: string;                // "America/New_York"
  currency: string;                // "USD", "INR", "GBP"
}
```

### 2. Department Model
**What it is**: How the business is organized.

**Properties**:
```typescript
interface DepartmentModel {
  id: string;
  businessProfile: string;         // Reference to BusinessProfile
  departments: DepartmentInstance[];
}
```

**Department Instances**:
```typescript
interface DepartmentInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph Department
  name: string;                    // Custom name (e.g., "Sales Team")
  roles: RoleInstance[];
  processes: ProcessInstance[];
}
```

### 3. Role Model
**What it is**: User roles within the business.

**Properties**:
```typescript
interface RoleInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph Role
  name: string;                    // Custom name
  department: string;              // Reference to DepartmentInstance
  permissions: PermissionInstance[];
  users: UserInstance[];
}
```

**Permission Instances**:
```typescript
interface PermissionInstance {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'approve')[];
  conditions?: string;             // e.g., "own department only"
}
```

### 4. Process Model
**What it is**: Business processes.

**Properties**:
```typescript
interface ProcessInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph Workflow
  name: string;                    // Custom name
  department: string;              // Reference to DepartmentInstance
  steps: ProcessStep[];
  triggers: string[];
  outcomes: string[];
}
```

**Process Steps**:
```typescript
interface ProcessStep {
  name: string;
  action: string;
  entity?: string;                 // Reference to EntityInstance
  service?: string;                // Reference to ServiceInstance
  conditional?: string;
  assignee?: string;               // Reference to RoleInstance
}
```

### 5. Entity Model
**What it is**: Domain objects for this business.

**Properties**:
```typescript
interface EntityInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph EntityTemplate
  name: string;                    // Custom name
  fields: FieldInstance[];
  relationships: RelationshipInstance[];
  departments: string[];           // Departments that use this entity
}
```

**Field Instances**:
```typescript
interface FieldInstance {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
  required: boolean;
  indexed: boolean;
  description?: string;
  defaultValue?: unknown;
  validation?: string;             // e.g., "email", "phone", "url"
}
```

**Relationship Instances**:
```typescript
interface RelationshipInstance {
  target: string;                  // Reference to another EntityInstance
  type: 'has_many' | 'belongs_to' | 'has_one' | 'many_to_many';
  foreignKey?: string;
  cascade?: 'delete' | 'restrict' | 'set_null';
}
```

### 6. KPI Model
**What it is**: Key Performance Indicators for this business.

**Properties**:
```typescript
interface KPIInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph KPI
  name: string;                    // Custom name
  formula: string;                 // Custom formula
  unit: string;
  target?: number;                 // Target value
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  department?: string;             // Reference to DepartmentInstance
}
```

### 7. Compliance Model
**What it is**: Compliance requirements for this business.

**Properties**:
```typescript
interface ComplianceInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph Compliance
  name: string;                    // Custom name
  requirements: ComplianceRequirement[];
  status: 'compliant' | 'non_compliant' | 'in_progress';
  lastAudit?: string;              // ISO date
  nextAudit?: string;              // ISO date
}
```

**Compliance Requirements**:
```typescript
interface ComplianceRequirement {
  name: string;
  description: string;
  mandatory: boolean;
  implementation: string;
  status: 'implemented' | 'in_progress' | 'not_started';
}
```

### 8. Integration Model
**What it is**: Third-party integrations for this business.

**Properties**:
```typescript
interface IntegrationInstance {
  id: string;
  template: string;                // Reference to Knowledge Graph Integration
  name: string;                    // Custom name
  config: Record<string, unknown>; // Integration-specific config
  status: 'active' | 'inactive' | 'error';
  department?: string;             // Reference to DepartmentInstance
}
```

### 9. Automation Model
**What it is**: Business automations.

**Properties**:
```typescript
interface AutomationInstance {
  id: string;
  name: string;                    // "Auto-send welcome email"
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
}
```

**Automation Trigger**:
```typescript
interface AutomationTrigger {
  type: 'event' | 'schedule' | 'condition';
  config: Record<string, unknown>;
}
```

**Automation Action**:
```typescript
interface AutomationAction {
  type: 'email' | 'sms' | 'webhook' | 'update' | 'create';
  config: Record<string, unknown>;
}
```

### 10. AI Opportunity Model
**What it is**: AI/ML opportunities for this business.

**Properties**:
```typescript
interface AIOpportunity {
  id: string;
  name: string;                    // "Predictive Analytics"
  description: string;
  type: 'prediction' | 'classification' | 'recommendation' | 'automation';
  dataRequirements: string[];      // Entities needed
  expectedImpact: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
  department?: string;             // Reference to DepartmentInstance
}
```

---

## Graph Structure

### Nodes
The BOS contains 10 node kinds:
1. BusinessProfile
2. DepartmentModel
3. RoleModel
4. ProcessModel
5. EntityModel
6. KPIModel
7. ComplianceModel
8. IntegrationModel
9. AutomationModel
10. AIOpportunity

### Edges
The BOS contains the following edge kinds:

| Edge | Source | Target | Description |
|------|--------|--------|-------------|
| has_department | BusinessProfile | DepartmentModel | Business has department |
| has_role | DepartmentModel | RoleModel | Department has role |
| has_process | DepartmentModel | ProcessModel | Department has process |
| uses_entity | ProcessModel | EntityModel | Process uses entity |
| tracks_kpi | BusinessProfile | KPIModel | Business tracks KPI |
| requires_compliance | BusinessProfile | ComplianceModel | Business requires compliance |
| uses_integration | BusinessProfile | IntegrationModel | Business uses integration |
| has_automation | BusinessProfile | AutomationModel | Business has automation |
| has_ai_opportunity | BusinessProfile | AIOpportunity | Business has AI opportunity |
| process_uses_entity | ProcessModel | EntityModel | Process uses entity |
| role_manages_entity | RoleModel | EntityModel | Role manages entity |
| department_owns_entity | DepartmentModel | EntityModel | Department owns entity |

---

## Query Patterns

### Find all departments for a business
```typescript
function getDepartmentsForBusiness(
  bos: BusinessOperatingSystem,
  businessId: string
): DepartmentModel[] {
  return bos.edges
    .filter(e => e.source === businessId && e.type === 'has_department')
    .map(e => bos.nodes.find(n => n.id === e.target))
    .filter((n): n is DepartmentModel => n?.type === 'department');
}
```

### Find all processes for a department
```typescript
function getProcessesForDepartment(
  bos: BusinessOperatingSystem,
  departmentId: string
): ProcessModel[] {
  return bos.edges
    .filter(e => e.source === departmentId && e.type === 'has_process')
    .map(e => bos.nodes.find(n => n.id === e.target))
    .filter((n): n is ProcessModel => n?.type === 'process');
}
```

### Find all entities for a business
```typescript
function getEntitiesForBusiness(
  bos: BusinessOperatingSystem,
  businessId: string
): EntityModel[] {
  const departments = getDepartmentsForBusiness(bos, businessId);
  const entityIds = new Set<string>();
  
  for (const dept of departments) {
    const entities = bos.edges
      .filter(e => e.source === dept.id && e.type === 'department_owns_entity')
      .map(e => e.target);
    entities.forEach(id => entityIds.add(id));
  }
  
  return Array.from(entityIds)
    .map(id => bos.nodes.find(n => n.id === id))
    .filter((n): n is EntityModel => n?.type === 'entity');
}
```

---

## Usage in Build.same

### 1. Planning Phase
The planner reads the BOS to:
- Understand the business structure
- Identify departments and roles
- Map processes and workflows
- Determine entities and relationships

### 2. Application Graph Generation
The planner combines BOS with Knowledge Graph to:
- Generate entity nodes from EntityModel
- Generate workflow nodes from ProcessModel
- Generate page nodes from processes
- Generate API endpoints from entities

### 3. Code Generation
The code generator reads the BOS to:
- Apply compliance rules
- Use appropriate integrations
- Implement automations
- Create AI opportunities

---

## Validation Rules

### 1. Referential Integrity
All references must point to existing nodes.

### 2. Completeness
Every business profile must have at least:
- 1 department
- 3 roles
- 5 processes
- 5 entities
- 3 KPIs

### 3. Consistency
All instances must reference valid templates from the Knowledge Graph.

### 4. Business Rules
- Every department must have at least one role
- Every process must have at least one step
- Every entity must have at least one field
- Every KPI must have a formula

---

## Storage

### In-Memory
For development and testing.

### SQLite
For local development.

### PostgreSQL
For production.

### JSON
For version control and portability.

---

**End of Business Operating System Specification**
