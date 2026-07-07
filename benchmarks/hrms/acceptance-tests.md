# HRMS Benchmark Acceptance Tests

## Test Categories

### 1. Employee Management

#### TC-HRM-001: Employee Onboarding
- **Given** new hire record
- **When** HR processes onboarding
- **Then** personal, employment, emergency info collected
- **And** employee ID generated
- **And** onboarding task list created

#### TC-HRM-002: Employee Directory
- **Given** employees in system
- **When** viewing directory
- **Then** search by name/department/role works
- **And** org chart displays hierarchy
- **And** contact details visible

#### TC-HRM-003: Document Management
- **Given** employee files
- **When** uploading documents
- **Then** offer letter, contracts, tax forms organized
- **And** expiry alerts for certifications
- **And** e-signature integration works

### 2. Time & Attendance

#### TC-HRM-004: Timesheet Management
- **Given** employee timesheet
- **When** submitting hours
- **Then** regular and overtime calculated
- **And** manager approval workflow triggers
- **And** data flows to payroll

#### TC-HRM-005: Leave Management
- **Given** employee with leave balance
- **When** requesting time off
- **Then** leave type selected (vacation/sick/personal)
- **And** balance checked
- **And** approval workflow initiated
- **And** calendar reflects absence

### 3. Payroll

#### TC-HRM-006: Payroll Processing
- **Given** approved timesheets
- **When** running payroll
- **Then** gross pay calculated from hours/rates
- **And** deductions (tax, benefits) applied
- **And** net pay computed
- **And** payslips generated

#### TC-HRM-007: Tax Compliance
- **Given** payroll data
- **When** generating tax forms
- **Then** W-2/1099 forms produced correctly
- **And** tax liabilities calculated per jurisdiction

### 4. Performance

#### TC-HRM-008: Performance Review
- **Given** review period
- **When** manager completes review
- **Then** goals, ratings, feedback recorded
- **And** employee acknowledges
- **And** review history stored

#### TC-HRM-009: Goal Tracking
- **Given** employee goals set
- **When** progress updated
- **Then** OKR/KPI tracking works
- **And** progress visible to manager

### 5. Benefits

#### TC-HRM-010: Benefits Administration
- **Given** enrollment period
- **When** employee selects benefits
- **Then** health, dental, vision options display
- **And** premium deductions calculate
- **And** enrollment confirmation provided

### 6. Reporting

#### TC-HRM-011: HR Analytics
- **Given** HR data
- **When** viewing dashboard
- **Then** headcount, turnover, diversity metrics show
- **And** compensation analysis displays
- **And** department breakdowns work

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Employee Management | 20% | 90% |
| Time & Attendance | 20% | 90% |
| Payroll | 25% | 100% |
| Performance | 15% | 90% |
| Benefits | 10% | 90% |
| Reporting | 10% | 90% |

**Overall Pass: 85% weighted score minimum**
