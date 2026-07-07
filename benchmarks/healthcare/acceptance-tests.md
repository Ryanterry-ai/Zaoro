# Healthcare Benchmark Acceptance Tests

## Test Categories

### 1. Patient Management

#### TC-HLT-001: Patient Registration
- **Given** new patient
- **When** staff creates record
- **Then** demographics, contact, insurance collected
- **And** unique patient ID/MRN generated
- **And** duplicate detection runs

#### TC-HLT-002: Patient Chart
- **Given** registered patient
- **When** viewing chart
- **Then** medical history, allergies, medications display
- **And** vitals history graphical
- **And** documents attached and organized

### 2. Appointments

#### TC-HLT-003: Appointment Scheduling
- **Given** provider schedule available
- **When** booking appointment
- **Then** time slot reserved
- **And** appointment type set
- **And** confirmation sent to patient

#### TC-HLT-004: Check-In Workflow
- **Given** patient arrives for appointment
- **When** staff checks in patient
- **Then** status updates to checked in
- **And** insurance verified
- **And** waiting room queue updates

### 3. Clinical

#### TC-HLT-005: EHR Documentation
- **Given** patient encounter
- **When** provider documents visit
- **Then** SOAP note saved
- **And** diagnosis codes added
- **And** prescription ordered if needed

#### TC-HLT-006: E-Prescribing
- **Given** prescription needed
- **When** provider sends Rx
- **Then** drug interaction check runs
- **And** dosage validated
- **And** Rx sent to patient's pharmacy

#### TC-HLT-007: Lab Orders
- **Given** lab test ordered
- **When** results received
- **Then** result recorded to patient chart
- **And** abnormal flags trigger alert
- **And** provider notified

### 4. Billing

#### TC-HLT-008: Medical Billing
- **Given** completed encounter
- **When** billing processes
- **Then** CPT/ICD-10 codes map to charges
- **And** claim submitted to insurer
- **And** patient responsibility calculated

### 5. Compliance

#### TC-HLT-009: HIPAA Compliance
- **Given** patient data
- **When** accessing records
- **Then** role-based access enforced
- **And** audit log tracks all access
- **And** data encryption at rest and transit

#### TC-HLT-010: Patient Portal
- **Given** patient account
- **When** logging into portal
- **Then** lab results, appointments, messages visible
- **And** secure messaging to provider works

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Patient Management | 20% | 90% |
| Appointments | 15% | 90% |
| Clinical | 30% | 100% |
| Billing | 20% | 90% |
| Compliance | 15% | 100% |

**Overall Pass: 85% weighted score minimum**
