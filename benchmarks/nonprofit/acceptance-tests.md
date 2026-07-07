# Nonprofit Benchmark Acceptance Tests

## Test Categories

### 1. Donation Management

#### TC-NPO-001: Donation Processing
- **Given** donation form
- **When** donor contributes
- **Then** one-time/recurring selection works
- **And** payment processed securely
- **And** donation receipt emailed immediately

#### TC-NPO-002: Recurring Giving
- **Given** recurring donation setup
- **When** billing cycle runs
- **Then** payment processed per schedule
- **And** donor notified of each charge
- **And** failed payment retries handled

#### TC-NPO-003: Tribute/Memorial Giving
- **Given** tribute option selected
- **When** donation completed
- **Then** honoree name recorded
- **And** notification sent to honoree/family
- **And** tribute card generated

### 2. Campaign Management

#### TC-NPO-004: Fundraising Campaign
- **Given** campaign created
- **When** campaign goes live
- **Then** goal, progress bar, end date display
- **And** peer-to-peer fundraising supported
- **And** matching gifts tracked

#### TC-NPO-005: Event Management
- **Given** fundraising event
- **When** managing event
- **Then** registration, ticketing, attendee tracking work
- **And** ticket revenue attributed to campaign
- **And** check-in at event works

### 3. Volunteer Management

#### TC-NPO-006: Volunteer Registration
- **Given** volunteer applicant
- **When** user signs up
- **Then** skills, availability, interests collected
- **And** background check initiated if needed
- **And** volunteer profile created

#### TC-NPO-007: Volunteer Scheduling
- **Given** volunteer shifts available
- **When** volunteer signs up for shift
- **Then** slot filled
- **And** calendar updated
- **And** reminder sent before shift

#### TC-NPO-008: Hours Tracking
- **Given** volunteer works shift
- **When** hours logged
- **Then** hours recorded to profile
- **And** total hours aggregated
- **And** recognition milestones tracked

### 4. Donor Management

#### TC-NPO-009: Donor Profiles
- **Given** donor in system
- **When** viewing profile
- **Then** donation history, communication, preferences display
- **And** lifetime value calculated
- **And** engagement scoring shown

#### TC-NPO-010: Email Communications
- **Given** donor segment
- **When** sending campaign email
- **Then** targeted by segment (one-time/recurring/lapsed)
- **And** open/click tracking works
- **And** unsubscribe handled

### 5. Reporting

#### TC-NPO-011: Fundraising Reports
- **Given** donation data
- **When** generating report
- **Then** total raised, donor count, retention rate display
- **And** campaign comparison works
- **And** tax receipt export available

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Donation Management | 25% | 100% |
| Campaign Management | 20% | 90% |
| Volunteer Management | 20% | 90% |
| Donor Management | 20% | 90% |
| Reporting | 15% | 90% |

**Overall Pass: 85% weighted score minimum**
