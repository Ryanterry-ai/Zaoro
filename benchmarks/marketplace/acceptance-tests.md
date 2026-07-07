# Marketplace Benchmark Acceptance Tests

## Test Categories

### 1. Listing Management

#### TC-MKT-001: Product Listing
- **Given** seller registered
- **When** creating listing
- **Then** title, description, price, images required
- **And** category/subcategory selection works
- **And** listing reviewed before publication

#### TC-MKT-002: Listing Search
- **Given** active listings
- **When** buyer searches
- **Then** full-text search returns relevant results
- **And** filters (category, price, location) work
- **And** sort by relevance/price/date works

### 2. Order Management

#### TC-MKT-003: Buyer Checkout
- **Given** items in cart from multiple sellers
- **When** buyer checks out
- **Then** items grouped by seller
- **And** shipping calculated per seller
- **And** single payment collected

#### TC-MKT-004: Order Fulfillment
- **Given** order placed
- **When** seller ships item
- **Then** tracking number updated
- **And** buyer notified
- **And** order status progresses

### 3. Seller Management

#### TC-MKT-005: Seller Dashboard
- **Given** seller logged in
- **When** viewing dashboard
- **Then** sales, views, ratings display
- **And** revenue summary shown
- **And** pending orders listed

#### TC-MKT-006: Seller Payouts
- **Given** completed orders
- **When** payout cycle runs
- **Then** seller earnings calculated (minus commission)
- **And** payout initiated to seller account
- **And** payout history available

### 4. Reviews & Ratings

#### TC-MKT-007: Review System
- **Given** completed purchase
- **When** buyer submits review
- **Then** rating (1-5 stars) and text captured
- **And** review visible on listing
- **And** seller overall rating recalculated

#### TC-MKT-008: Review Moderation
- **Given** flagged review
- **When** admin moderates
- **Then** review hidden if violating policy
- **And** buyer notified of action

### 5. Dispute Resolution

#### TC-MKT-009: Dispute Handling
- **Given** dispute raised (buyer/seller)
- **When** support processes dispute
- **Then** evidence collected from both parties
- **And** resolution (refund/return/partial) applied
- **And** escrow released per decision

### 6. Technical

#### TC-MKT-010: Security & Trust
- **Given** marketplace platform
- **When** processing transactions
- **Then** payment escrow protects buyers
- **And** seller verification required
- **And** fraud detection monitors activity

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Listing Management | 20% | 90% |
| Order Management | 20% | 90% |
| Seller Management | 20% | 90% |
| Reviews & Ratings | 15% | 90% |
| Dispute Resolution | 15% | 90% |
| Technical | 10% | 100% |

**Overall Pass: 85% weighted score minimum**
