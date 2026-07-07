# SaaS Benchmark Acceptance Tests

## Test Categories

### 1. Subscription Management

#### TC-SAA-001: Plan Configuration
- **Given** subscription plans configured
- **When** customer selects plan
- **Then** plan tier, features, limits displayed
- **And** billing interval (monthly/annual) selection works
- **And** free trial logic enforced

#### TC-SAA-002: Subscription Lifecycle
- **Given** active subscription
- **When** lifecycle event occurs
- **Then** upgrade/downgrade prorates correctly
- **And** cancel triggers offboarding flow
- **And** reactivation restores access
- **And** expiry handled gracefully

#### TC-SAA-003: Feature Access Control
- **Given** user on specific plan
- **When** accessing features
- **Then** plan-appropriate features enabled
- **And** upgrade prompt shown for restricted features
- **And** usage limits enforced

### 2. Billing

#### TC-SAA-004: Invoice Generation
- **Given** billing cycle runs
- **When** invoice generated
- **Then** line items, taxes, discounts calculated
- **And** invoice PDF available
- **And** credit notes supported

#### TC-SAA-005: Payment Management
- **Given** stored payment method
- **When** payment processed
- **Then** dunning flow handles failures
- **And** retry logic with escalation works
- **And** manual payment entry supported

#### TC-SAA-006: Usage-Based Billing
- **Given** usage tracked per customer
- **When** billing period ends
- **Then** usage metered and calculated
- **And** overage charges applied
- **And** usage visible in customer portal

### 3. User & Team Management

#### TC-SAA-007: User Invitation
- **Given** account owner
- **When** inviting team members
- **Then** invitation email sent
- **And** role assignment works (admin/member/viewer)
- **And** seat count enforced per plan

#### TC-SAA-008: SSO & Authentication
- **Given** enterprise customer
- **When** configuring SSO
- **Then** SAML/OIDC integration works
- **And** Just-In-Time provisioning works
- **And** SCIM user sync works

### 4. Customer Portal

#### TC-SAA-009: Account Dashboard
- **Given** logged-in customer
- **When** viewing dashboard
- **Then** plan, usage, invoices, team displayed
- **And** billing history accessible
- **And** payment method management works

#### TC-SAA-010: Analytics & Reports
- **Given** customer using product
- **When** viewing analytics
- **Then** usage trends display
- **And** adoption metrics shown
- **And** exportable reports available

### 5. Technical

#### TC-SAA-011: Multi-Tenancy
- **Given** multiple tenants
- **When** processing requests
- **Then** data isolation maintained
- **And** tenant-specific configuration works
- **And** rate limiting per tenant

#### TC-SAA-012: API Rate Limiting
- **Given** API consumer
- **When** exceeding rate limit
- **Then** 429 response returned
- **And** rate limit headers present
- **And** plan-based limits enforced

#### TC-SAA-013: Churn Prevention
- **Given** user at-risk (low engagement)
- **When** churn triggers fire
- **Then** re-engagement email sent
- **And** retention offer presented
- **And** cancel feedback collected

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Subscription Management | 25% | 100% |
| Billing | 25% | 100% |
| User & Team Management | 15% | 90% |
| Customer Portal | 15% | 90% |
| Technical | 20% | 100% |

**Overall Pass: 85% weighted score minimum**
