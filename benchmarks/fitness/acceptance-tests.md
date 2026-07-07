# Fitness Benchmark Acceptance Tests

## Test Categories

### 1. Member Management

#### TC-FIT-001: Member Registration
- **Given** prospect interested
- **When** staff creates member account
- **Then** personal info, emergency contact collected
- **And** membership plan assigned
- **And** waiver signed digitally

#### TC-FIT-002: Member Profile
- **Given** active member
- **When** viewing profile
- **Then** membership status, attendance, payments display
- **And** medical notes visible to staff
- **And** photo stored securely

### 2. Class & Schedule Management

#### TC-FIT-003: Class Scheduling
- **Given** class types configured
- **When** creating class schedule
- **Then** time slot, instructor, capacity set
- **And** room conflict detection works
- **And** recurring schedule supports patterns

#### TC-FIT-004: Class Booking
- **Given** scheduled class with availability
- **When** member books class
- **Then** spot reserved
- **And** capacity decrements
- **And** reminder sent before class

#### TC-FIT-005: Waitlist Management
- **Given** full class with waitlist
- **When** spot opens
- **Then** next waitlisted member auto-enrolled
- **And** notification sent
- **And** time window for claiming enforced

### 3. Check-In & Access

#### TC-FIT-006: Member Check-In
- **Given** active membership
- **When** member checks in
- **Then** attendance recorded
- **And** membership verified
- **And** access granted to facility

#### TC-FIT-007: Guest Pass
- **Given** member with guest passes
- **When** member brings guest
- **Then** guest pass deducted
- **And** guest waiver captured
- **And** guest entry logged

### 4. Billing

#### TC-FIT-008: Membership Billing
- **Given** member on recurring plan
- **When** billing cycle runs
- **Then** payment processed correctly
- **And** invoice generated
- **And** failed payment triggers retry

#### TC-FIT-009: Membership Freeze/Cancel
- **Given** active membership
- **When** member requests freeze
- **Then** freeze duration set
- **And** billing paused
- **And** membership expiry extended

### 5. Reporting

#### TC-FIT-010: Dashboard KPIs
- **Given** operational data
- **When** viewing dashboard
- **Then** active members count shows
- **And** daily check-in count displays
- **And** revenue metrics update
- **And** class utilization rates shown

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Member Management | 20% | 90% |
| Class & Schedule | 25% | 90% |
| Check-In & Access | 20% | 90% |
| Billing | 20% | 90% |
| Reporting | 15% | 90% |

**Overall Pass: 85% weighted score minimum**
