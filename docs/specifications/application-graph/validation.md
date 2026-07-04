# Application Graph — Specification Validation

**Version**: 1.0.0-draft  
**Status**: Draft  
**Last Updated**: 2026-07-04

---

## Overview

This document defines the Specification Validation Phase — a mandatory step between specification and implementation. The goal is to validate that the Application Graph specification is genuinely usable before writing a single new node type.

---

## Validation Questions

Before any implementation, the specification must answer these questions:

### 1. Compiler Pass Ambiguity
**Can every compiler pass read and write the graph without ambiguity?**

- [ ] Pass 0 (Schema) can read all node kinds
- [ ] Pass 1 (Endpoints) can read/write all API-related nodes
- [ ] Pass 2 (Workflows) can read/write all process-related nodes
- [ ] Pass 3 (Pages) can read/write all UI-related nodes
- [ ] Pass 4 (Features) can read/write all feature-related nodes
- [ ] Pass 5 (Validation) can validate all node/edge kinds
- [ ] Pass 6 (Optimization) can optimize without breaking semantics
- [ ] Pass 7 (Output) can emit framework-specific code
- [ ] No pass reads from a pass it doesn't depend on

### 2. Industry Representation
**Can every future industry be represented?**

- [ ] Healthcare (HIPAA compliance, patient data, appointments)
- [ ] Finance (PCI compliance, transactions, audit trails)
- [ ] Education (student data, courses, grades)
- [ ] Manufacturing (inventory, BOM, quality control)
- [ ] Retail (POS, inventory, customer loyalty)
- [ ] SaaS (subscriptions, usage billing, multi-tenancy)
- [ ] Marketplace (multi-vendor, escrow, reviews)
- [ ] Logistics (tracking, routing, fleet management)
- [ ] Real Estate (listings, showings, contracts)
- [ ] Legal (cases, billing, document management)

### 3. Replay and Serialization
**Can replay serialize and reconstruct the graph exactly?**

- [ ] All node kinds serialize to JSON
- [ ] All edge kinds serialize to JSON
- [ ] Serialization preserves all metadata
- [ ] Deserialization produces identical graph
- [ ] Version migration works correctly

### 4. Multiple Renderers
**Can the graph support multiple renderers?**

- [ ] React renderer can consume full graph
- [ ] Flutter renderer can consume full graph (future)
- [ ] Vue renderer can consume full graph (future)
- [ ] Native renderer can consume full graph (future)
- [ ] Renderer-specific extensions don't break core graph

### 5. Ownership and Mutation Rules
**Are node ownership and mutation rules unambiguous?**

- [ ] Each node has exactly one owner
- [ ] Mutation rules are documented for every node kind
- [ ] Concurrent mutations don't cause conflicts
- [ ] Rollback is possible for every mutation

### 6. Evolution Without Breaking
**Can the graph evolve without breaking existing projects?**

- [ ] New node kinds are additive
- [ ] New edge kinds are additive
- [ ] New fields are optional
- [ ] Deprecated fields are handled gracefully
- [ ] Version migration is automated

---

## Architecture Test Cases

### Test Case 1: Hospital ERP
**Goal**: Validate healthcare domain representation

**Entities**:
- Patient (MRN, name, DOB, insurance, allergies)
- Appointment (datetime, provider, type, status)
- Provider (name, specialty, NPI)
- Department (name, location, budget)
- Prescription (medication, dosage, frequency)
- LabOrder (test type, status, results)
- BillingClaim (procedure, amount, status)

**Workflows**:
- Patient Registration
- Appointment Scheduling
- Lab Order Processing
- Prescription Fulfillment
- Insurance Claims

**Compliance**:
- HIPAA
- HITECH
- FDA 21 CFR Part 11

**Expected Graph**:
- 7 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 2: Restaurant POS
**Goal**: Validate hospitality domain representation

**Entities**:
- Menu (name, category, price, description)
- Order (items, total, status, table)
- Table (number, capacity, status)
- Server (name, section, shift)
- Payment (method, amount, tip)
- Reservation (datetime, party size, name)

**Workflows**:
- Order Taking
- Kitchen Display
- Payment Processing
- Inventory Management
- Reservation Management

**Compliance**:
- FDA Food Safety
- PCI (payments)
- ADA (accessibility)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 15+ endpoint nodes
- 12+ page nodes
- 3 compliance nodes

### Test Case 3: CRM
**Goal**: Validate sales domain representation

**Entities**:
- Contact (name, email, phone, company)
- Lead (source, status, score, owner)
- Opportunity (amount, stage, closeDate)
- Account (name, industry, revenue)
- Activity (type, date, description)
- Campaign (name, budget, ROI)

**Workflows**:
- Lead Capture
- Lead Qualification
- Opportunity Management
- Pipeline Reporting
- Campaign Tracking

**Compliance**:
- GDPR
- CAN-SPAM
- CCPA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 4: Marketplace
**Goal**: Validate multi-sided platform representation

**Entities**:
- Vendor (name, rating, products)
- Product (name, price, inventory)
- Buyer (name, orders, reviews)
- Order (items, total, status)
- Review (rating, text, date)
- Payment (method, amount, escrow)
- Shipment (tracking, status, carrier)

**Workflows**:
- Vendor Onboarding
- Product Listing
- Order Processing
- Payment Escrow
- Review Moderation

**Compliance**:
- PCI (payments)
- FTC (advertising)
- GDPR (privacy)

**Expected Graph**:
- 7 entity nodes
- 5 workflow nodes
- 22+ endpoint nodes
- 16+ page nodes
- 3 compliance nodes

### Test Case 5: Banking Dashboard
**Goal**: Validate financial domain representation

**Entities**:
- Account (number, type, balance)
- Transaction (amount, date, type)
- Loan (amount, rate, term)
- Customer (name, credit score, income)
- Bill (amount, due date, status)
- Investment (type, value, risk)

**Workflows**:
- Account Management
- Transaction Processing
- Loan Application
- Bill Payment
- Investment Tracking

**Compliance**:
- PCI DSS
- SOX
- BSA/AML
- KYC

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 4 compliance nodes

### Test Case 6: School LMS
**Goal**: Validate education domain representation

**Entities**:
- Student (name, grade, courses)
- Course (name, instructor, schedule)
- Assignment (title, due date, points)
- Grade (score, feedback, date)
- Attendance (date, status, notes)
- Material (type, title, content)

**Workflows**:
- Course Enrollment
- Assignment Submission
- Grading
- Attendance Tracking
- Parent Communication

**Compliance**:
- FERPA (privacy)
- COPPA (children)
- ADA (accessibility)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 7: Manufacturing ERP
**Goal**: Validate manufacturing domain representation

**Entities**:
- Product (SKU, name, BOM)
- Component (name, supplier, cost)
- WorkOrder (quantity, status, dueDate)
- Machine (name, capacity, maintenance)
- QualityCheck (type, result, inspector)
- Shipment (carrier, tracking, status)

**Workflows**:
- Production Planning
- Work Order Management
- Quality Control
- Inventory Management
- Shipping

**Compliance**:
- ISO 9001
- FDA (if food/pharma)
- EPA (environmental)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 8: Social Network
**Goal**: Validate social platform representation

**Entities**:
- User (name, bio, followers)
- Post (content, timestamp, likes)
- Comment (text, author, timestamp)
- Message (sender, recipient, content)
- Group (name, members, privacy)
- Event (title, date, attendees)

**Workflows**:
- User Registration
- Content Posting
- Messaging
- Group Management
- Event Organization

**Compliance**:
- GDPR
- CCPA
- DMCA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 22+ endpoint nodes
- 16+ page nodes
- 3 compliance nodes

### Test Case 9: Fitness App
**Goal**: Validate health/fitness domain representation

**Entities**:
- User (name, goals, metrics)
- Workout (type, duration, intensity)
- Exercise (name, muscle group, equipment)
- Meal (food, calories, macros)
- Progress (weight, measurements, photos)
- Plan (name, duration, exercises)

**Workflows**:
- User Onboarding
- Workout Tracking
- Meal Planning
- Progress Monitoring
- Plan Management

**Compliance**:
- HIPAA (if medical)
- GDPR
- CCPA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 10: Logistics Platform
**Goal**: Validate logistics domain representation

**Entities**:
- Shipment (tracking, status, carrier)
- Route (origin, destination, stops)
- Vehicle (type, capacity, driver)
- Warehouse (location, capacity, inventory)
- Package (weight, dimensions, contents)
- Delivery (timestamp, signature, proof)

**Workflows**:
- Order Processing
- Route Planning
- Dispatch
- Tracking
- Delivery Confirmation

**Compliance**:
- DOT regulations
- Hazmat (if applicable)
- Customs (international)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 11: Real Estate Platform
**Goal**: Validate real estate domain representation

**Entities**:
- Property (address, price, beds, baths)
- Agent (name, license, listings)
- Buyer (name, budget, preferences)
- Showing (datetime, property, agent)
- Offer (amount, terms, status)
- Contract (terms, contingencies, closing)

**Workflows**:
- Property Listing
- Buyer Matching
- Showing Scheduling
- Offer Management
- Contract Processing

**Compliance**:
- Fair Housing Act
- RESPA
- State licensing

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 12: Legal Practice Management
**Goal**: Validate legal domain representation

**Entities**:
- Case (number, type, status)
- Client (name, contact, matters)
- Attorney (name, bar, specialty)
- Document (type, status, content)
- TimeEntry (hours, rate, description)
- Invoice (amount, status, payments)

**Workflows**:
- Client Intake
- Case Management
- Document Management
- Time Billing
- Trust Accounting

**Compliance**:
- ABA Ethics
- State Bar Rules
- IOLTA (trust accounts)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 13: Event Management
**Goal**: Validate event domain representation

**Entities**:
- Event (name, date, venue)
- Attendee (name, ticket type, checkin)
- Venue (name, capacity, amenities)
- Speaker (name, bio, sessions)
- Sponsor (name, tier, benefits)
- Ticket (type, price, status)

**Workflows**:
- Event Planning
- Ticket Sales
- Attendee Registration
- Speaker Management
- Sponsor Management

**Compliance**:
- ADA
- Fire codes
- Insurance

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 14: Subscription SaaS
**Goal**: Validate SaaS domain representation

**Entities**:
- Tenant (name, plan, status)
- User (email, role, permissions)
- Feature (name, limits, usage)
- Subscription (plan, billing, renewal)
- Usage (metric, quantity, overage)
- Invoice (amount, due, paid)

**Workflows**:
- Tenant Onboarding
- User Management
- Feature Gating
- Billing Management
- Usage Tracking

**Compliance**:
- SOC 2
- GDPR
- CCPA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 15: Content Management System
**Goal**: Validate CMS domain representation

**Entities**:
- Content (title, body, author)
- Category (name, slug, description)
- Tag (name, slug)
- Media (type, url, alt)
- Comment (text, author, status)
- User (name, role, permissions)

**Workflows**:
- Content Creation
- Publishing Workflow
- Media Management
- Comment Moderation
- User Management

**Compliance**:
- GDPR
- ADA
- Copyright

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 16: IoT Platform
**Goal**: Validate IoT domain representation

**Entities**:
- Device (type, status, location)
- Sensor (type, value, unit)
- Alert (type, severity, status)
- Dashboard (name, widgets, layout)
- Rule (condition, action, status)
- History (timestamp, value, device)

**Workflows**:
- Device Registration
- Data Collection
- Alert Management
- Rule Execution
- Dashboard Creation

**Compliance**:
- GDPR
- CCPA
- Industry-specific

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 17: Video Streaming Platform
**Goal**: Validate media domain representation

**Entities**:
- Video (title, duration, status)
- User (name, preferences, history)
- Playlist (name, videos, owner)
- Comment (text, author, timestamp)
- Subscription (plan, billing, renewal)
- Analytics (views, watch time, engagement)

**Workflows**:
- Video Upload
- Content Processing
- Playback
- User Recommendations
- Subscription Management

**Compliance**:
- DMCA
- GDPR
- COPPA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 18: E-commerce Platform
**Goal**: Validate e-commerce domain representation

**Entities**:
- Product (name, price, inventory)
- Category (name, products)
- Order (items, total, status)
- Customer (name, email, orders)
- Cart (items, total, session)
- Review (rating, text, author)

**Workflows**:
- Product Browsing
- Cart Management
- Checkout
- Order Fulfillment
- Returns

**Compliance**:
- PCI DSS
- GDPR
- CCPA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 22+ endpoint nodes
- 16+ page nodes
- 3 compliance nodes

### Test Case 19: Project Management
**Goal**: Validate project management domain representation

**Entities**:
- Project (name, status, deadline)
- Task (title, assignee, dueDate)
- Team (name, members, roles)
- Milestone (name, date, status)
- TimeLog (hours, task, date)
- Document (title, content, author)

**Workflows**:
- Project Planning
- Task Management
- Time Tracking
- Reporting
- Resource Allocation

**Compliance**:
- GDPR
- SOX (if public company)

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 2 compliance nodes

### Test Case 20: Healthcare Telemedicine
**Goal**: Validate telemedicine domain representation

**Entities**:
- Patient (MRN, name, insurance)
- Provider (name, specialty, availability)
- Appointment (datetime, type, status)
- Prescription (medication, dosage, refills)
- LabOrder (test, status, results)
- VideoCall (duration, participants, recording)

**Workflows**:
- Patient Registration
- Appointment Scheduling
- Video Consultation
- Prescription Management
- Lab Order Processing

**Compliance**:
- HIPAA
- HITECH
- State licensing

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 21: Food Delivery Platform
**Goal**: Validate food delivery domain representation

**Entities**:
- Restaurant (name, cuisine, menu)
- Menu (items, prices, categories)
- Order (items, total, status)
- Driver (name, location, rating)
- Delivery (status, ETA, proof)
- Review (rating, text, author)

**Workflows**:
- Restaurant Onboarding
- Order Placement
- Delivery Assignment
- Real-time Tracking
- Payment Processing

**Compliance**:
- FDA Food Safety
- PCI (payments)
- GDPR

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 22: Insurance Platform
**Goal**: Validate insurance domain representation

**Entities**:
- Policy (type, premium, coverage)
- Claim (number, status, amount)
- Customer (name, policies, claims)
- Agent (name, license, customers)
- Underwriter (name, risk assessment)
- Payment (amount, date, method)

**Workflows**:
- Policy Application
- Underwriting
- Claims Processing
- Payment Collection
- Renewal Management

**Compliance**:
- State insurance regulations
- HIPAA (health insurance)
- GDPR

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

### Test Case 23: Travel Booking Platform
**Goal**: Validate travel domain representation

**Entities**:
- Flight (airline, route, times)
- Hotel (name, location, amenities)
- Rental (type, location, vehicle)
- Booking (type, dates, total)
- Traveler (name, preferences, history)
- Review (rating, text, author)

**Workflows**:
- Search
- Booking
- Payment
- Check-in
- Cancellation

**Compliance**:
- PCI (payments)
- GDPR
- ADA

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 20+ endpoint nodes
- 15+ page nodes
- 3 compliance nodes

### Test Case 24: HR Management System
**Goal**: Validate HR domain representation

**Entities**:
- Employee (name, department, position)
- Department (name, manager, budget)
- Payroll (period, gross, net)
- Benefits (type, cost, coverage)
- Leave (type, dates, status)
- Performance (period, rating, goals)

**Workflows**:
- Hiring
- Onboarding
- Payroll Processing
- Benefits Enrollment
- Performance Reviews

**Compliance**:
- FLSA
- FMLA
- OSHA
- EEO

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 4 compliance nodes

### Test Case 25: Fitness Studio Management
**Goal**: Validate fitness studio domain representation

**Entities**:
- Member (name, plan, attendance)
- Class (type, instructor, schedule)
- Instructor (name, certifications, schedule)
- Booking (member, class, status)
- Equipment (name, maintenance, status)
- Payment (amount, method, date)

**Workflows**:
- Member Registration
- Class Booking
- Attendance Tracking
- Payment Processing
- Equipment Maintenance

**Compliance**:
- ADA
- Liability waivers
- GDPR

**Expected Graph**:
- 6 entity nodes
- 5 workflow nodes
- 18+ endpoint nodes
- 14+ page nodes
- 3 compliance nodes

---

## Validation Criteria

### Pass Criteria
A test case passes if:
1. All entities can be represented as entity nodes
2. All workflows can be represented as workflow nodes
3. All relationships can be represented as edges
4. All compliance requirements can be represented as compliance nodes
5. No special cases or workarounds are needed

### Fail Criteria
A test case fails if:
1. A concept cannot be represented
2. A relationship cannot be expressed
3. A special case is needed
4. The representation is ambiguous

### Scoring
- **Pass**: 100% of test cases pass
- **Partial**: 80-99% of test cases pass
- **Fail**: <80% of test cases pass

---

## Validation Process

1. **Create test case model**: Define entities, workflows, compliance for each test case
2. **Build ApplicationGraph**: Use the specification to build the graph
3. **Validate representation**: Check that all concepts are representable
4. **Document gaps**: Record any missing concepts or ambiguities
5. **Refine specification**: Update specification to address gaps
6. **Repeat**: Re-validate until all test cases pass

---

**End of Specification Validation**
