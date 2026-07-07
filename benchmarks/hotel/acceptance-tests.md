# Hotel Benchmark Acceptance Tests

## Test Categories

### 1. Reservation Management

#### TC-HTL-001: Booking Creation
- **Given** room availability
- **When** guest/agent books
- **Then** room type, dates, rates set
- **And** guest info captured
- **And** confirmation generated with booking ID

#### TC-HTL-002: Booking Modification
- **Given** existing booking
- **When** guest modifies reservation
- **Then** date change checks availability
- **And** cancellation policy applied
- **And** rate recalculated if needed

#### TC-HTL-003: Group Booking
- **Given** group request (10+ rooms)
- **When** creating group block
- **Then** room block created with cutoff date
- **And** master billing optional
- **And** attrition clause tracked

### 2. Front Desk

#### TC-HTL-004: Check-In
- **Given** reserved guest arrives
- **When** staff checks in
- **Then** ID verified
- **And** payment method captured
- **And** room keys issued
- **And** room status updates to occupied

#### TC-HTL-005: Check-Out
- **Given** occupied room
- **When** guest checks out
- **Then** incidental charges settled
- **And** invoice printed/emailed
- **And** room status updates to dirty

### 3. Room Management

#### TC-HTL-006: Housekeeping Status
- **Given** checked-out rooms
- **When** housekeeping cleans
- **Then** status updates through stages (dirty → in progress → clean)
- **And** priority rooms flagged

#### TC-HTL-007: Room Inventory
- **Given** all rooms
- **When** viewing availability
- **Then** real-time occupancy displays
- **And** out-of-order rooms shown
- **And** maintenance schedule visible

### 4. Billing & POS

#### TC-HTL-008: Folio Management
- **Given** checked-in guest
- **When** charges added
- **Then** room charges, incidentals, taxes tracked
- **And** payment split supported
- **And** folio settles at check-out

#### TC-HTL-009: POS Integration
- **Given** restaurant/bar/minibar purchase
- **When** charged to room
- **Then** folio updates immediately
- **And** itemized receipt available

### 5. Reporting

#### TC-HTL-010: Revenue Management
- **Given** booking data
- **When** viewing reports
- **Then** RevPAR, ADR, occupancy display
- **And** forecast shows projected demand
- **And** rate strategy recommendations shown

#### TC-HTL-011: Channel Management
- **Given** multiple distribution channels
- **When** inventory updates
- **Then** availability syncs to all channels
- **And** rate parity maintained
- **And** overbooking prevented

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Reservation Management | 25% | 90% |
| Front Desk | 20% | 90% |
| Room Management | 15% | 90% |
| Billing & POS | 20% | 90% |
| Reporting | 20% | 90% |

**Overall Pass: 85% weighted score minimum**
