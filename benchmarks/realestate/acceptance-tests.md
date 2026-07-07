# Real Estate Benchmark Acceptance Tests

## Test Categories

### 1. Property Listings

#### TC-REL-001: Listing Creation
- **Given** agent/broker role
- **When** creating listing
- **Then** property type, price, address, details captured
- **And** image upload with gallery works
- **And** listing status (active/pending/sold) set

#### TC-REL-002: MLS Integration
- **Given** MLS feed configured
- **When** syncing listings
- **Then** properties imported with correct data
- **And** updates synced bidirectionally
- **And** off-market listings flagged

### 2. Property Search

#### TC-REL-003: Search & Filter
- **Given** property database
- **When** buyer searches
- **Then** location, price range, beds/baths filters work
- **And** map-based search with polygon works
- **And** save search functionality works

#### TC-REL-004: Property Detail
- **Given** selected property
- **When** viewing detail
- **Then** gallery, virtual tour, floor plan display
- **And** property features listed
- **And** mortgage calculator works

### 3. Agent Management

#### TC-REL-005: Agent Profiles
- **Given** registered agent
- **When** viewing profile
- **Then** bio, listings, reviews display
- **And** contact info shown
- **And** performance metrics visible

#### TC-REL-006: Lead Assignment
- **Given** incoming lead inquiry
- **When** lead assigned
- **Then** round-robin/manual assignment works
- **And** agent notified immediately
- **And** lead status tracked

### 4. Appointments & Tours

#### TC-REL-007: Showing Scheduling
- **Given** available property
- **When** buyer requests showing
- **Then** agent availability checked
- **And** time slot confirmed
- **And** confirmation sent to both parties

#### TC-REL-008: Open House
- **Given** open house event
- **When** managing event
- **Then** date/time, agent assigned
- **And** visitor sign-in (digital) works
- **And** follow-up leads captured

### 5. Transactions

#### TC-REL-009: Offer Management
- **Given** interested buyer
- **When** offer submitted
- **Then** offer amount, terms, contingencies captured
- **And** counteroffer workflow supported
- **And** status tracked (submitted/accepted/rejected)

#### TC-REL-010: Document Management
- **Given** transaction in progress
- **When** managing documents
- **Then** contracts, disclosures uploaded
- **And** e-signature integration works
- **And** document status tracked

### 6. Reporting

#### TC-REL-011: Market Analytics
- **Given** listing and sale data
- **When** viewing analytics
- **Then** days on market, price trends display
- **And** inventory levels tracked
- **And** agent/office performance compared

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Property Listings | 20% | 90% |
| Property Search | 20% | 90% |
| Agent Management | 15% | 90% |
| Appointments | 15% | 90% |
| Transactions | 20% | 90% |
| Reporting | 10% | 90% |

**Overall Pass: 85% weighted score minimum**
