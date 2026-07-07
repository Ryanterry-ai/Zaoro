# ATS Benchmark Acceptance Tests

## Test Categories

### 1. Job Posting Management

#### TC-ATS-001: Job Creation
- **Given** job posting form
- **When** recruiter creates job
- **Then** required fields validate (title, department, location)
- **And** job published to configured boards

#### TC-ATS-002: Job Board Distribution
- **Given** active job posting
- **When** job distributed
- **Then** posting appears on LinkedIn, Indeed, etc.
- **And** application tracking per source works

### 2. Candidate Management

#### TC-ATS-003: Application Intake
- **Given** candidate applies
- **When** application submitted
- **Then** candidate profile created
- **And** resume parsed into structured fields
- **And** acknowledgment email sent

#### TC-ATS-004: Candidate Search & Filter
- **Given** candidate database
- **When** recruiter searches
- **Then** keyword/boolean search works
- **And** filters by skills, experience, location work
- **And** results rank by relevance

#### TC-ATS-005: Candidate Pipeline
- **Given** candidates in pipeline
- **When** recruiter moves candidate to new stage
- **Then** status updates
- **And** notification sent to candidate
- **And** interview details auto-populated

### 3. Interview Workflow

#### TC-ATS-006: Interview Scheduling
- **Given** candidate advanced to interview
- **When** scheduling interview
- **Then** calendar integration shows availability
- **And** interviewers receive invites
- **And** candidate receives confirmation

#### TC-ATS-007: Feedback Collection
- **Given** interview completed
- **When** interviewer submits feedback
- **Then** rating and comments recorded
- **And** scorecard aggregates
- **And** decision workflow progresses

### 4. Offer & Onboarding

#### TC-ATS-008: Offer Management
- **Given** selected candidate
- **When** creating offer
- **Then** compensation details validate
- **And** approval workflow triggers
- **And** digital signature integration works

### 5. Reporting

#### TC-ATS-009: Recruitment Analytics
- **Given** recruiting data
- **When** viewing analytics
- **Then** time-to-hire metrics display
- **And** source effectiveness shows
- **And** funnel conversion rates calculate

#### TC-ATS-010: Compliance Reporting
- **Given** candidate demographics data
- **When** generating EEOC report
- **Then** compliant aggregation displayed
- **And** data anonymized per regulations

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Job Posting | 15% | 90% |
| Candidate Management | 30% | 90% |
| Interview Workflow | 25% | 90% |
| Offer & Onboarding | 15% | 90% |
| Reporting | 15% | 90% |

**Overall Pass: 85% weighted score minimum**
