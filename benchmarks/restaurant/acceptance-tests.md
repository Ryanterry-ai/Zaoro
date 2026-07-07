# Restaurant Benchmark Acceptance Tests

## Test Categories

### 1. Menu Management

#### TC-RST-001: Menu & Items
- **Given** restaurant setup
- **When** creating menu
- **Then** categories, items, prices, descriptions set
- **And** modifiers/add-ons configurable
- **And** dietary labels (vegan, gluten-free) work

#### TC-RST-002: Menu Publishing
- **Given** digital menu
- **When** publishing
- **Then** online menu accessible via QR code
- **And** pricing/availability updates in real-time
- **And** multi-language menu supported

### 2. Order Management

#### TC-RST-003: Dine-In Order
- **Given** seated table
- **When** server takes order
- **Then** items added to table order
- **And** modifiers applied correctly
- **And** order sent to kitchen display

#### TC-RST-004: Takeout Order
- **Given** customer orders takeout
- **When** order placed
- **Then** pickup time estimated
- **And** order status updates (received → preparing → ready)
- **And** customer notified when ready

#### TC-RST-005: Online Delivery
- **Given** delivery order placed
- **When** order routed
- **Then** address validated
- **And** delivery fee calculated
- **And** driver assigned via dispatch

### 3. Reservations

#### TC-RST-006: Table Booking
- **Given** guest requests reservation
- **When** booking created
- **Then** party size, date, time, special requests captured
- **And** table assignment optimized
- **And** confirmation sent to guest

#### TC-RST-007: Waitlist Management
- **Given** restaurant at capacity
- **When** guest joins waitlist
- **Then** estimated wait time provided
- **And** SMS notification when table ready
- **And** hold time window enforced

### 4. POS & Payments

#### TC-RST-008: POS Terminal
- **Given** active table order
- **When** processing payment
- **Then** split check by item/by person works
- **And** multiple payment methods accepted
- **And** tip adjustment works
- **And** receipt printed/emailed

#### TC-RST-009: Payment Processing
- **Given** customer pays
- **When** transaction completes
- **Then** card/contactless/cash options work
- **And** tax calculated correctly
- **And** transaction settled to merchant account

### 5. Inventory

#### TC-RST-010: Ingredient Tracking
- **Given** recipe/ingredient data
- **When** order placed
- **Then** ingredient quantities decremented
- **And** low stock alerts trigger
- **And** cost per dish calculated

### 6. Reporting

#### TC-RST-011: Restaurant Analytics
- **Given** sales data
- **When** viewing reports
- **Then** daily sales, labor cost, food cost display
- **And** popular items ranked
- **And** peak hours identified

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Menu Management | 15% | 90% |
| Order Management | 30% | 90% |
| Reservations | 15% | 90% |
| POS & Payments | 25% | 100% |
| Inventory | 10% | 90% |
| Reporting | 5% | 90% |

**Overall Pass: 85% weighted score minimum**
