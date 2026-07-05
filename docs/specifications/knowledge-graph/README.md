# Knowledge Graph Specification

**Version**: 1.0.0  
**Status**: Frozen  
**Last Updated**: 2026-07-05

---

## Overview

The Knowledge Graph defines what the platform knows — reusable knowledge that feeds the planner. The planner reads from the Knowledge Graph but never modifies it.

The Knowledge Graph answers: **"What does the platform know?"**

---

## Core Concepts

### 1. Industry
**What it is**: A top-level business domain (SaaS, E-Commerce, Healthcare).

**Properties**:
```typescript
interface Industry {
  id: string;
  name: string;                    // "SaaS", "E-Commerce"
  slug: string;                    // "saas", "ecommerce"
  description: string;
  maturity: 'emerging' | 'growth' | 'mature' | 'declining';
  tags: string[];
  compositionPrimitives: string[]; // Primitive nodes that compose this industry
}
```

**Examples**:
- SaaS
- E-Commerce
- Healthcare
- Education
- Manufacturing
- Finance
- Real Estate
- Legal
- Logistics
- Hospitality

### 2. SubIndustry
**What it is**: A specific vertical within an industry (Dental, Restaurant).

**Properties**:
```typescript
interface SubIndustry {
  id: string;
  name: string;                    // "Dental Clinic", "Fine Dining"
  slug: string;                    // "dental", "fine-dining"
  parentIndustry: string;          // Reference to Industry
  description: string;
  tags: string[];
  compositionPrimitives: string[];
}
```

**Examples**:
- Healthcare → Dental Clinic, Veterinary, Mental Health
- E-Commerce → Fashion, Electronics, Food & Beverage
- SaaS → CRM, ERP, Project Management

### 3. BusinessModel
**What it is**: How the business makes money.

**Properties**:
```typescript
interface BusinessModel {
  id: string;
  name: string;                    // "Subscription", "Marketplace"
  slug: string;                    // "subscription", "marketplace"
  description: string;
  revenueStreams: RevenueStream[];
  metrics: Metric[];
}
```

**Revenue Streams**:
```typescript
interface RevenueStream {
  name: string;                    // "Monthly Subscription"
  type: 'recurring' | 'one-time' | 'usage-based' | 'commission';
  pricing: 'flat' | 'tiered' | 'usage' | 'hybrid';
}
```

**Examples**:
- Subscription (SaaS)
- Marketplace (e-commerce)
- Freemium (mobile apps)
- Advertising (social media)
- Transaction fees (payments)
- Licensing (enterprise)

### 4. Department
**What it is**: Organizational unit within a business.

**Properties**:
```typescript
interface Department {
  id: string;
  name: string;                    // "Sales", "Engineering"
  slug: string;                    // "sales", "engineering"
  description: string;
  roles: string[];                 // Roles in this department
  processes: string[];             // Processes this department owns
}
```

**Examples**:
- Sales
- Marketing
- Engineering
- Operations
- Finance
- HR
- Customer Support
- Legal
- IT
- Product

### 5. Role
**What it is**: User role within the system.

**Properties**:
```typescript
interface Role {
  id: string;
  name: string;                    // "Admin", "Manager"
  slug: string;                    // "admin", "manager"
  description: string;
  permissions: Permission[];
  department: string;              // Reference to Department
}
```

**Permissions**:
```typescript
interface Permission {
  resource: string;                // "orders", "products"
  actions: ('read' | 'write' | 'delete' | 'approve')[];
}
```

**Examples**:
- Admin
- Manager
- Staff
- Viewer
- Customer
- Vendor
- Support Agent
- Analyst

### 6. Capability
**What it is**: What the system can do.

**Properties**:
```typescript
interface Capability {
  id: string;
  name: string;                    // "Authentication", "Payments"
  slug: string;                    // "auth", "payments"
  description: string;
  category: 'core' | 'enhancement' | 'integration' | 'compliance';
  complexity: 'simple' | 'moderate' | 'complex';
  requiredPrimitives: string[];    // Primitives needed to implement
  optionalPrimitives: string[];
}
```

**Examples**:
- Authentication
- Payments
- Notifications
- Reporting
- Analytics
- Search
- File Upload
- Real-time Updates

### 7. Workflow
**What it is**: A business process with steps.

**Properties**:
```typescript
interface Workflow {
  id: string;
  name: string;                    // "Checkout Flow", "Patient Intake"
  slug: string;
  description: string;
  steps: WorkflowStep[];
  triggers: string[];              // What initiates this workflow
  outcomes: string[];              // What this workflow produces
}
```

**Workflow Steps**:
```typescript
interface WorkflowStep {
  name: string;
  action: string;
  entity?: string;                 // Entity involved
  service?: string;                // Service involved
  conditional?: string;            // Condition for this step
}
```

**Examples**:
- Checkout Flow
- Patient Intake
- Order Fulfillment
- Invoice Processing
- Employee Onboarding

### 8. EntityTemplate
**What it is**: Reusable entity definition.

**Properties**:
```typescript
interface EntityTemplate {
  id: string;
  name: string;                    // "User", "Product"
  slug: string;
  description: string;
  fields: EntityField[];
  relationships: EntityRelationship[];
  industries: string[];            // Industries that use this entity
}
```

**Entity Fields**:
```typescript
interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'reference';
  required: boolean;
  indexed: boolean;
  description?: string;
}
```

**Examples**:
- User
- Product
- Order
- Invoice
- Appointment
- Patient
- Student
- Property

### 9. Compliance
**What it is**: Regulatory requirement.

**Properties**:
```typescript
interface Compliance {
  id: string;
  name: string;                    // "HIPAA", "PCI DSS"
  slug: string;                    // "hipaa", "pci-dss"
  description: string;
  industries: string[];            // Industries this applies to
  requirements: ComplianceRequirement[];
}
```

**Compliance Requirements**:
```typescript
interface ComplianceRequirement {
  name: string;
  description: string;
  mandatory: boolean;
  implementation: string;          // How to implement
}
```

**Examples**:
- HIPAA (Healthcare)
- PCI DSS (Payments)
- GDPR (Privacy)
- SOC 2 (Security)
- FERPA (Education)
- ADA (Accessibility)

### 10. KPI
**What it is**: Key Performance Indicator.

**Properties**:
```typescript
interface KPI {
  id: string;
  name: string;                    // "Revenue", "Churn Rate"
  slug: string;                    // "revenue", "churn-rate"
  description: string;
  formula: string;                 // How to calculate
  unit: string;                    // "currency", "percentage", "count"
  industries: string[];            // Industries that track this
}
```

**Examples**:
- Revenue
- Churn Rate
- Customer Acquisition Cost
- Lifetime Value
- Average Order Value
- Conversion Rate

### 11. Pattern
**What it is**: Design or interaction pattern.

**Properties**:
```typescript
interface Pattern {
  id: string;
  name: string;                    // "Minimal", "Bold"
  slug: string;                    // "minimal", "bold"
  description: string;
  category: 'visual' | 'interaction' | 'layout';
  components: string[];            // Components that use this pattern
}
```

**Examples**:
- Minimal
- Bold
- Corporate
- Playful
- Dark Mode
- Card-based
- Dashboard
- List-based

### 12. SkillPack
**What it is**: Industry-specific skill set.

**Properties**:
```typescript
interface SkillPack {
  id: string;
  name: string;                    // "Restaurant Operations"
  slug: string;                    // "restaurant-operations"
  description: string;
  industry: string;                // Reference to Industry
  capabilities: string[];          // Capabilities in this pack
  workflows: string[];             // Workflows in this pack
  entities: string[];              // Entities in this pack
}
```

**Examples**:
- Restaurant Operations
- Patient Management
- E-Commerce Operations
- SaaS Management
- Manufacturing Operations

### 13. DesignProfile
**What it is**: Visual design profile.

**Properties**:
```typescript
interface DesignProfile {
  id: string;
  name: string;                    // "Modern SaaS"
  slug: string;                    // "modern-saas"
  description: string;
  industries: string[];            // Industries this applies to
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
}
```

**Color Palette**:
```typescript
interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}
```

**Examples**:
- Modern SaaS
- Healthcare Clean
- E-Commerce Bold
- Corporate Professional
- Playful Startup

### 14. Integration
**What it is**: Third-party integration.

**Properties**:
```typescript
interface Integration {
  id: string;
  name: string;                    // "Stripe", "Twilio"
  slug: string;                    // "stripe", "twilio"
  description: string;
  category: 'payment' | 'email' | 'sms' | 'analytics' | 'auth' | 'storage';
  capabilities: string[];          // Capabilities this provides
}
```

**Examples**:
- Stripe (Payments)
- Twilio (SMS)
- SendGrid (Email)
- Auth0 (Authentication)
- AWS S3 (Storage)
- Google Analytics (Analytics)

### 15. TechnologyProfile
**What it is**: Technology stack recommendation.

**Properties**:
```typescript
interface TechnologyProfile {
  id: string;
  name: string;                    // "Next.js + PostgreSQL"
  slug: string;                    // "nextjs-postgresql"
  description: string;
  frontend: string[];              // Frontend technologies
  backend: string[];               // Backend technologies
  database: string[];              // Database technologies
  deployment: string[];            // Deployment technologies
}
```

**Examples**:
- Next.js + PostgreSQL
- React + Node.js + MongoDB
- Vue + Django + PostgreSQL
- Flutter + Firebase

---

## Graph Structure

### Nodes
The Knowledge Graph contains 15 node kinds:
1. Industry
2. SubIndustry
3. BusinessModel
4. Department
5. Role
6. Capability
7. Workflow
8. EntityTemplate
9. Compliance
10. KPI
11. Pattern
12. SkillPack
13. DesignProfile
14. Integration
15. TechnologyProfile

### Edges
The Knowledge Graph contains the following edge kinds:

| Edge | Source | Target | Description |
|------|--------|--------|-------------|
| has_subindustry | Industry | SubIndustry | Industry has sub-industry |
| uses_business_model | Industry | BusinessModel | Industry uses business model |
| has_department | Industry | Department | Industry has department |
| has_role | Department | Role | Department has role |
| has_capability | Industry | Capability | Industry has capability |
| has_workflow | Industry | Workflow | Industry has workflow |
| has_entity | Industry | EntityTemplate | Industry has entity |
| requires_compliance | Industry | Compliance | Industry requires compliance |
| tracks_kpi | Industry | KPI | Industry tracks KPI |
| uses_pattern | Industry | Pattern | Industry uses pattern |
| has_skill_pack | Industry | SkillPack | Industry has skill pack |
| uses_design_profile | Industry | DesignProfile | Industry uses design profile |
| uses_integration | Industry | Integration | Industry uses integration |
| uses_technology | Industry | TechnologyProfile | Industry uses technology |
| capability_requires | Capability | Capability | Capability requires another |
| workflow_uses | Workflow | EntityTemplate | Workflow uses entity |
| entity_has | EntityTemplate | EntityTemplate | Entity has relationship |

---

## Query Patterns

### Find all capabilities for an industry
```typescript
function getCapabilitiesForIndustry(
  graph: KnowledgeGraph,
  industryId: string
): Capability[] {
  return graph.edges
    .filter(e => e.source === industryId && e.type === 'has_capability')
    .map(e => graph.nodes.find(n => n.id === e.target))
    .filter((n): n is Capability => n?.type === 'capability');
}
```

### Find all workflows for an industry
```typescript
function getWorkflowsForIndustry(
  graph: KnowledgeGraph,
  industryId: string
): Workflow[] {
  return graph.edges
    .filter(e => e.source === industryId && e.type === 'has_workflow')
    .map(e => graph.nodes.find(n => n.id === e.target))
    .filter((n): n is Workflow => n?.type === 'workflow');
}
```

### Find all entities for an industry
```typescript
function getEntitiesForIndustry(
  graph: KnowledgeGraph,
  industryId: string
): EntityTemplate[] {
  return graph.edges
    .filter(e => e.source === industryId && e.type === 'has_entity')
    .map(e => graph.nodes.find(n => n.id === e.target))
    .filter((n): n is EntityTemplate => n?.type === 'entity');
}
```

---

## Usage in Build.same

### 1. Planning Phase
The planner reads from the Knowledge Graph to:
- Determine industry-specific capabilities
- Identify required workflows
- Select appropriate entities
- Apply compliance rules

### 2. Content Resolution
The content resolver reads from the Knowledge Graph to:
- Get industry-specific terminology
- Apply design profiles
- Select integrations
- Use technology profiles

### 3. Code Generation
The code generator reads from the Knowledge Graph to:
- Apply compliance rules
- Use appropriate patterns
- Select integrations
- Apply technology profiles

---

## Validation Rules

### 1. Referential Integrity
All references must point to existing nodes.

### 2. Cycle Detection
No circular dependencies in the graph.

### 3. Completeness
Every industry must have at least:
- 1 business model
- 5 capabilities
- 3 workflows
- 5 entities
- 1 compliance requirement

### 4. Consistency
All nodes must have consistent naming and slug conventions.

---

## Migration

### From Current Implementation
The current implementation uses a simplified Knowledge Graph with:
- 15 node types (Industry, SubIndustry, Capability, Feature, Workflow, Entity, UISection, Component, Service, DataStore, Integration, ComplianceRule, RevenueModel, Vocabulary, DesignPattern, Primitive)
- 11 edge types

### To Specification
The specification adds:
- 5 new node kinds (Department, Role, KPI, Pattern, SkillPack, DesignProfile, TechnologyProfile)
- 17 new edge kinds

### Migration Strategy
1. Map existing nodes to new types
2. Add missing node kinds
3. Update edge types
4. Validate referential integrity

---

## Storage

### In-Memory
For development and testing.

### SQLite
For local development.

### PostgreSQL
For production.

### File System
For version control and portability.

---

**End of Knowledge Graph Specification**
