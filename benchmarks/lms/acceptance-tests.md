# LMS Benchmark Acceptance Tests

## Test Categories

### 1. Course Management

#### TC-LMS-001: Course Creation
- **Given** instructor/author
- **When** creating course
- **Then** title, description, category, thumbnail set
- **And** curriculum structured with modules/lessons
- **And** publish/draft workflow works

#### TC-LMS-002: Content Delivery
- **Given** published course
- **When** student accesses content
- **Then** video streaming works with progress tracking
- **And** PDF, SCORM, and HTML content render
- **And** download permissions enforced

#### TC-LMS-003: Course Versioning
- **Given** course with updates
- **When** publishing new version
- **Then** existing enrollments unaffected
- **And** new students see latest version
- **And** version history maintained

### 2. Enrollment & Access

#### TC-LMS-004: Student Enrollment
- **Given** course available
- **When** student enrolls
- **Then** enrollment recorded
- **And** access granted
- **And** enrollment confirmation sent

#### TC-LMS-005: Cohort Management
- **Given** cohort-based course
- **When** managing cohorts
- **Then** start/end dates enforced
- **And** cohort-specific content available
- **And** progress compared within cohort

### 3. Assessment

#### TC-LMS-006: Quiz Creation
- **Given** course module
- **When** instructor creates quiz
- **Then** question types (MCQ, essay, fill-blank) work
- **And** time limit enforced
- **And** passing grade configurable

#### TC-LMS-007: Auto-Grading
- **Given** student submits quiz
- **When** auto-grading runs
- **Then** objective answers scored automatically
- **And** results stored immediately
- **And** feedback provided per question

#### TC-LMS-008: Certificate Generation
- **Given** completed course
- **When** student passes
- **Then** certificate generated with name and date
- **And** verifiable via unique URL

### 4. Progress Tracking

#### TC-LMS-009: Student Dashboard
- **Given** enrolled courses
- **When** viewing dashboard
- **Then** progress per course displayed
- **And** completion percentage shown
- **And** next lesson recommended

#### TC-LMS-010: Analytics
- **Given** course data
- **When** viewing analytics
- **Then** completion rates display
- **And** average scores per assessment shown
- **And** drop-off points identified

### 5. Technical

#### TC-LMS-011: SCORM Compliance
- **Given** SCORM package
- **When** uploading and launching
- **Then** SCORM 1.2/2004 standards supported
- **And** progress tracked correctly
- **And** suspend data maintained

#### TC-LMS-012: Mobile Responsive
- **Given** mobile device
- **When** accessing courses
- **Then** video plays on mobile
- **And** quizzes functional on touch
- **And** UI adapts to screen size

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Course Management | 25% | 90% |
| Enrollment & Access | 15% | 90% |
| Assessment | 25% | 90% |
| Progress Tracking | 20% | 90% |
| Technical | 15% | 100% |

**Overall Pass: 85% weighted score minimum**
