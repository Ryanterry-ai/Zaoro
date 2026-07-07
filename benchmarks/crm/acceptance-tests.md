# CRM Benchmark Acceptance Tests

## Test Categories

### 1. Lead Management

#### TC-CRM-001: Lead Creation
- **Given** lead form with required fields
- **When** user submits form
- **Then** lead created with status "new"
- **And** auto-assignment applied based on territory

#### TC-CRM-002: Lead Qualification
- **Given** lead in "new" status
- **When** rep qualifies lead
- **Then** status updates to "qualified"
- **And** conversion options appear

#### TC-CRM-003: Lead Conversion
- **Given** qualified lead
- **When** user converts lead
- **Then** account created
- **And** contact created
- **And** opportunity created
- **And** lead marked converted

### 2. Pipeline Management

#### TC-CRM-004: Deal Creation
- **Given** valid account/contact
- **When** user creates deal
- **Then** deal created with default stage
- **And** amount and owner set

#### TC-CRM-005: Stage Progression
- **Given** deal in pipeline
- **When** user drags to new stage
- **Then** stage updated
- **And** probability auto-updated
- **And** activity logged

#### TC-CRM-006: Pipeline Visualization
- **Given** multiple deals in pipeline
- **When** user visits /pipeline
- **Then** kanban board displays all stages
- **And** deal cards show key info
- **And** totals per stage calculate

### 3. Contact & Account Management

#### TC-CRM-007: Contact Creation
- **Given** account exists
- **When** user adds contact
- **Then** contact linked to account
- **And** contact searchable

#### TC-CRM-008: Account Hierarchy
- **Given** accounts with parent-child relationships
- **When** viewing account detail
- **Then** org chart displays
- **And** related contacts/deals show

### 4. Activity Tracking

#### TC-CRM-009: Activity Logging
- **Given** deal/contact/lead
- **When** user logs activity
- **Then** activity created
- **And** timeline updates
- **And** due date/reminder set if applicable

#### TC-CRM-010: Task Management
- **Given** tasks assigned
- **When** viewing task list
- **Then** tasks filterable by status/due date
- **And** completion updates parent entity

### 5. Reporting & Forecasting

#### TC-CRM-011: Dashboard KPIs
- **Given** data in system
- **When** viewing dashboard
- **Then** total revenue displays
- **And** pipeline value shows
- **And** activity metrics display

#### TC-CRM-012: Forecast Calculation
- **Given** deals in pipeline
- **When** viewing forecast
- **Then** weighted forecast calculates correctly
- **And** quota attainment shows
- **And** by rep/team breakdown displays

### 6. Integrations

#### TC-CRM-013: Email Integration
- **Given** Gmail/Outlook connected
- **When** sending email from CRM
- **Then** email tracked
- **And** opens/clicks recorded

### 7. Technical Requirements

#### TC-CRM-014: Mobile Responsive
- **Given** mobile viewport
- **When** using CRM
- **Then** all features accessible
- **And** pipeline usable on mobile

#### TC-CRM-015: API Access
- **Given** valid API key
- **When** making API request
- **Then** data returns correctly
- **And** rate limiting works

## Scoring Criteria

| Category | Weight | Tests | Pass Threshold |
|----------|--------|-------|----------------|
| Lead Management | 20% | TC-001 to TC-003 | 100% |
| Pipeline | 25% | TC-004 to TC-006 | 100% |
| Contacts/Accounts | 15% | TC-007 to TC-008 | 100% |
| Activities | 15% | TC-009 to TC-010 | 100% |
| Reporting | 15% | TC-011 to TC-012 | 90% |
| Integrations | 10% | TC-013 | 80% |

**Overall Pass: 85% weighted score minimum**