# Pharmacy Benchmark Acceptance Tests

## Test Categories

### 1. Prescription Management

#### TC-PHM-001: Prescription Intake
- **Given** prescriber sends Rx
- **When** pharmacy receives
- **Then** patient, drug, dosage captured
- **And** DEA/controlled substance checks run
- **And** refill information recorded

#### TC-PHM-002: Prescription Verification
- **Given** filled prescription
- **When** pharmacist verifies
- **Then** drug, dose, label accuracy confirmed
- **And** drug interaction check performed
- **And** contraindications flagged

#### TC-PHM-003: Refill Management
- **Given** active prescription with refills
- **When** refill requested
- **Then** remaining refills checked
- **And** auto-refill enrollment works
- **And** refill reminder sent to patient

### 2. Dispensing

#### TC-PHM-004: Label Generation
- **Given** verified prescription
- **When** label generated
- **Then** patient name, drug, directions, warnings print
- **And** barcode/Rx number included
- **And** auxiliary labels (refrigerate, shake) added

#### TC-PHM-005: Inventory Dispensing
- **Given** drug dispensed
- **When** inventory updated
- **Then** quantity decremented from stock
- **And** lot number tracked
- **And** expiration date verified

### 3. Inventory

#### TC-PHM-006: Drug Inventory
- **Given** pharmacy inventory
- **When** managing stock
- **Then** NDC-based tracking works
- **And** expiration date alerts trigger
- **And** controlled substance counts verified (DEA)

#### TC-PHM-007: Purchasing & Receiving
- **Given** low stock alert
- **When** creating purchase order
- **Then** order placed with wholesaler
- **And** incoming shipment tracked
- **And** received goods update inventory

### 4. Patient Records

#### TC-PHM-008: Patient Profile
- **Given** patient in system
- **When** viewing profile
- **Then** medication history, allergies, insurance display
- **And** drug interactions highlighted
- **And** pharmacist notes recorded

#### TC-PHM-009: Insurance Adjudication
- **Given** prescription with insurance
- **When** submitting claim
- **Then** eligibility verified
- **And** copay calculated
- **And** rejection/denial handled with reason

### 5. Compliance

#### TC-PHM-010: HIPAA Compliance
- **Given** patient health information
- **When** accessing records
- **Then** role-based access enforced
- **And** audit trail maintained
- **And** data encrypted at rest

#### TC-PHM-011: Reporting
- **Given** dispensing data
- **When** generating reports
- **Then** controlled substance report (DEA 222) generated
- **And** dispensing volume by drug tracked
- **And** financial reconciliation report available

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Prescription Management | 25% | 100% |
| Dispensing | 20% | 100% |
| Inventory | 20% | 90% |
| Patient Records | 20% | 90% |
| Compliance | 15% | 100% |

**Overall Pass: 85% weighted score minimum**
