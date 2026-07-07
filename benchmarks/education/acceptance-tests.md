# Education Benchmark Acceptance Tests

## Test Categories

### 1. Student Management

#### TC-EDU-001: Student Enrollment
- **Given** student application submitted
- **When** admin processes enrollment
- **Then** student record created
- **And** unique student ID generated
- **And** guardian/parent linked

#### TC-EDU-002: Student Profile
- **Given** enrolled student
- **When** viewing profile
- **Then** personal info, grades, attendance display
- **And** documents uploaded and organized

#### TC-EDU-003: Attendance Tracking
- **Given** class roster
- **When** teacher marks attendance
- **Then** attendance recorded per student
- **And** aggregate report updates
- **And** alerts trigger for excessive absences

### 2. Course & Curriculum

#### TC-EDU-004: Course Creation
- **Given** curriculum plan
- **When** admin creates course
- **Then** course code, credits, prerequisites set
- **And** syllabus uploaded
- **And** schedule assigned

#### TC-EDU-005: Class Scheduling
- **Given** courses and rooms
- **When** building schedule
- **Then** room conflicts detected
- **And** instructor conflicts flagged
- **And** timetable published to portal

### 3. Grading & Assessment

#### TC-EDU-006: Grade Entry
- **Given** course with enrolled students
- **When** teacher enters grades
- **Then** grade validation enforced
- **And** GPA calculated automatically
- **And** report card generated

#### TC-EDU-007: Transcript Generation
- **Given** completed courses
- **When** generating transcript
- **Then** all courses with grades display
- **And** cumulative GPA calculates
- **And** official format compliant

### 4. Communication

#### TC-EDU-008: Parent Portal
- **Given** parent account
- **When** parent logs in
- **Then** child's grades, attendance, schedule visible
- **And** teacher messaging works

#### TC-EDU-009: Announcements
- **Given** admin/teacher creates announcement
- **When** publishing
- **Then** targeted audience (class/school) receives
- **And** mobile push notification sent

### 5. Technical

#### TC-EDU-010: Academic Calendar
- **Given** configured academic calendar
- **When** viewing calendar
- **Then** terms, holidays, exams display
- **And** registration dates enforced

#### TC-EDU-011: Role-Based Access
- **Given** roles (admin, teacher, student, parent)
- **When** accessing system
- **Then** permissions enforced correctly
- **And** data isolation maintained

## Scoring Criteria

| Category | Weight | Pass Threshold |
|----------|--------|----------------|
| Student Management | 25% | 90% |
| Course & Curriculum | 20% | 90% |
| Grading & Assessment | 25% | 90% |
| Communication | 15% | 90% |
| Technical | 15% | 100% |

**Overall Pass: 85% weighted score minimum**
