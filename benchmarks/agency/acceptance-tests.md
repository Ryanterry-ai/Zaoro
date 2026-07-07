# Agency Benchmark Acceptance Tests

## Test Categories

### 1. Client Management

#### TC-AGY-001: Client Onboarding
- **Given** new client prospect
- **When** user creates client record
- **Then** required fields validate (name, contact, industry)
- **And** client status set to active
- **And** projects linked after creation

#### TC-AGY-002: Client Portal
- **Given** active client
- **When** client logs into portal
- **Then** project progress displays
- **And** invoices visible
- **And** file sharing works

#### TC-AGY-003: Client Communication
- **Given** client conversation thread
- **When** user sends message
- **Then** email notification sent
- **And** thread visible in client timeline
- **And** attachment upload works

### 2. Project Management

#### TC-AGY-004: Project Creation
- **Given** client with active contract
- **When** user creates project
- **Then** timeline, budget, and scope defined
- **And** team members assigned

#### TC-AGY-005: Task & Milestone Tracking
- **Given** project with tasks
- **When** user updates task status
- **Then** progress percentage updates
- **And** Gantt chart reflects changes
- **And** milestone alerts trigger

### 3. Time Tracking & Billing

#### TC-AGY-006: Time Logging
- **Given** billable project
- **When** user logs time
- **Then** entry linked to project/task
- **And** billable rate applied
- **And** running total updates

#### TC-AGY-007: Invoice Generation
- **Given** logged billable hours
- **When** generating invoice
- **Then** hours and expenses included
- **And** tax calculated correctly
- **And** client receives invoice

### 4. Resource Management

#### TC-AGY-008: Team Availability
- **Given** team calendar
- **When** viewing resource allocation
- **Then** availability displayed
- **And** booking conflicts flagged
- **And** capacity utilization shown

### 5. Reporting

#### TC-AGY-009: Agency Dashboard
- **Given** data from projects and billing
- **When** viewing dashboard
- **Then** revenue KPIs display
- **And** project health indicators shown
- **And** utilization rate calculated

#### TC-AGY-010: Profitability Report
- **Given** completed projects
- **When** running profitability report
- **Then** margin per project calculated
- **And** client profitability aggregates
- **And** export to CSV works

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Client Management | 20% | 90% |
| Project Management | 25% | 90% |
| Time & Billing | 25% | 90% |
| Resource Management | 15% | 90% |
| Reporting | 15% | 90% |

**Overall Pass: 85% weighted score minimum**
