# Media Benchmark Acceptance Tests

## Test Categories

### 1. Content Management

#### TC-MED-001: Article Creation
- **Given** author/editor role
- **When** creating article
- **Then** title, body, featured image set
- **And** rich text editor works (formatting, embeds, media)
- **And** draft/publish workflow functions

#### TC-MED-002: Content Scheduling
- **Given** draft article
- **When** scheduling publication
- **Then** publish date/time set
- **And** article auto-publishes at scheduled time
- **And** social media cross-post triggers

#### TC-MED-003: Media Library
- **Given** uploaded assets
- **When** managing media library
- **Then** images, videos, documents organized
- **And** search by name/tag works
- **And** optimized variants generated

### 2. Publishing Workflow

#### TC-MED-004: Editorial Workflow
- **Given** article in review
- **When** editor reviews
- **Then** comments and suggestions added inline
- **And** version history maintained
- **And** approval/rejection workflow works

#### TC-MED-005: Multi-Author Support
- **Given** multiple authors
- **When** assigning contributors
- **Then** byline and attribution set
- **And** permission levels (author → editor → admin) enforced

### 3. Reader Experience

#### TC-MED-006: Content Delivery
- **Given** published content
- **When** reader visits page
- **Then** page loads with optimized images
- **And** related content recommendations shown
- **And** reading time estimate displayed

#### TC-MED-007: Newsletter
- **Given** subscriber list
- **When** sending newsletter
- **Then** digest compiled from recent content
- **And** email renders correctly
- **And** open/click tracking works

### 4. Subscriptions & Paywall

#### TC-MED-008: Metered Paywall
- **Given** free article limit configured
- **When** reader exceeds limit
- **Then** paywall displays
- **And** subscription upsell presented
- **And** logged-in subscribers bypass paywall

#### TC-MED-009: Subscription Management
- **Given** subscriber account
- **When** managing subscription
- **Then** plan tier, billing, status visible
- **And** cancel/pause workflow works
- **And** access level enforced correctly

### 5. Analytics

#### TC-MED-010: Content Analytics
- **Given** published content data
- **When** viewing analytics
- **Then** page views, unique visitors, time on page display
- **And** top-performing content ranked
- **And** referral traffic sources shown

#### TC-MED-011: Advertising
- **Given** ad inventory configured
- **When** serving ads
- **Then** ad slots render on pages
- **And** impression/click tracking works
- **And** ad revenue reports generated

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Content Management | 25% | 90% |
| Publishing Workflow | 20% | 90% |
| Reader Experience | 15% | 90% |
| Subscriptions | 20% | 90% |
| Analytics | 20% | 90% |

**Overall Pass: 85% weighted score minimum**
