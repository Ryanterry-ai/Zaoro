# Accounting Benchmark Acceptance Tests

## Test Categories

### 1. General Ledger

#### TC-ACC-001: Chart of Accounts
- **Given** chart of accounts configured
- **When** creating/modifying accounts
- **Then** account code hierarchy validates
- **And** type (asset/liability/equity/revenue/expense) enforced

#### TC-ACC-002: Journal Entry
- **Given** journal entry form
- **When** posting entry
- **Then** debits equal credits required
- **And** posting updates correct GL accounts

#### TC-ACC-003: Trial Balance
- **Given** posted entries
- **When** generating trial balance
- **Then** total debits equal total credits
- **And** period filter works correctly

### 2. Accounts Payable & Receivable

#### TC-ACC-004: AP Processing
- **Given** vendor invoice received
- **When** processing payment
- **Then** 3-way match validates (PO/receipt/invoice)
- **And** payment reduces AP balance

#### TC-ACC-005: AR Processing
- **Given** customer invoice created
- **When** recording payment
- **Then** AR reduced correctly
- **And** cash account credited

### 3. Reporting

#### TC-ACC-006: Financial Statements
- **Given** posted transactions
- **When** generating P&L and Balance Sheet
- **Then** income statement shows period results
- **And** balance sheet balances

#### TC-ACC-007: Tax Reports
- **Given** taxable transactions
- **When** generating tax report
- **Then** tax liability calculated correctly
- **And** filing-ready format available

### 4. Multi-Entity

#### TC-ACC-008: Consolidation
- **Given** multiple company entities
- **When** running consolidation
- **And** intercompany eliminations processed
- **Then** consolidated statements produced

#### TC-ACC-009: Multi-Currency
- **Given** transactions in foreign currency
- **When** posting in different currency
- **Then** exchange rate applied correctly
- **And** unrealized gain/loss calculated

### 5. Technical

#### TC-ACC-010: Access Control
- **Given** different user roles
- **When** accessing modules
- **Then** permissions enforced correctly
- **And** audit log tracks changes

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| General Ledger | 30% | 90% |
| AP/AR | 25% | 90% |
| Reporting | 25% | 90% |
| Multi-Entity | 10% | 90% |
| Technical | 10% | 100% |

**Overall Pass: 85% weighted score minimum**
