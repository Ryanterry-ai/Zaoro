# ERP Benchmark Acceptance Tests

## Test Categories

### 1. Finance Module

#### TC-ERP-001: General Ledger
- **Given** chart of accounts configured
- **When** creating journal entry
- **Then** debits equal credits required
- **And** posting updates correct accounts

#### TC-ERP-002: Accounts Payable
- **Given** vendor invoice received
- **When** processing AP
- **Then** 3-way match works (PO, receipt, invoice)
- **And** payment reduces AP balance

#### TC-ERP-003: Accounts Receivable
- **Given** customer invoice created
- **When** recording payment
- **Then** AR reduced correctly
- **And** cash account credited

### 2. Inventory Module

#### TC-ERP-004: Stock Movements
- **Given** inventory transaction
- **When** recording receipt/issue/transfer
- **Then** correct quantity updated
- **And** lot/serial tracked if enabled

#### TC-ERP-005: Multi-Warehouse
- **Given** multiple warehouses
- **When** transferring stock
- **Then** source decremented, destination incremented

### 3. Procurement Module

#### TC-ERP-006: Purchase Order
- **Given** PO created
- **When** goods received
- **Then** PO status updates to received
- **And** inventory increases

### 4. Manufacturing Module

#### TC-ERP-007: Work Order
- **Given** work order with BOM
- **When** issuing materials
- **Then** raw materials decremented
- **And** when completed, finished goods created

### 5. Sales Module

#### TC-ERP-008: Sales Order Fulfillment
- **Given** sales order confirmed
- **When** shipping
- **Then** inventory decremented
- **And** AR created

### 6. Technical

#### TC-ERP-009: Multi-Company
- **Given** multiple company entities
- **When** posting journal entry
- **Then** correct company gets entry

#### TC-ERP-010: Role-Based Access
- **Given** different user roles
- **When** accessing modules
- **Then** permissions enforced correctly

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Finance | 30% | 90% |
| Inventory | 20% | 90% |
| Procurement | 15% | 90% |
| Manufacturing | 15% | 90% |
| Sales | 10% | 90% |
| Technical | 10% | 100% |

**Overall Pass: 85% weighted score minimum**