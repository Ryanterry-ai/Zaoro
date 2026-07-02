/**
 * Enterprise Skill Packs — Phase 1B
 *
 * 8 new capability packs covering the capabilities enterprise patterns need
 * but that the existing 6 packs (auth, payment, notification, compliance,
 * analytics, inventory-lite) do not provide:
 *
 *   CAP_APPOINTMENTS       — calendar-based scheduling with slot engine
 *   CAP_HR_MANAGEMENT      — employee master, attendance, leave, payroll
 *   CAP_BILLING_ENTERPRISE — B2B invoicing, payment tracking, credit notes
 *   CAP_WORKFLOW_ENGINE    — multi-step approvals, status machines, audit trail
 *   CAP_REPORTING          — exportable report builder with scheduling
 *   CAP_DOCUMENT_MANAGEMENT— file upload, versioning, tagging, search
 *   CAP_ROLE_PERMISSIONS   — role matrix, resource-action RBAC, audit log
 *   CAP_AUDIT_LOG          — immutable change history per entity
 */
import type { SkillPack } from '../../schemas/knowledge/skill-pack.schema.js';

// ─── 1. Appointments / Scheduling ────────────────────────────────────────────

export const CAP_APPOINTMENTS: SkillPack = {
  id: 'cap.appointments',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'appointments',
  description: 'Calendar-based appointment scheduling with slot availability, booking management, reminders, and cancellation workflow',
  assets: {
    pages: [
      { path: '/appointments', name: 'Appointments', type: 'listing', sections: ['filters', 'calendar', 'data-table'] },
      { path: '/appointments/new', name: 'New Appointment', type: 'auth', sections: ['booking-form', 'calendar'] },
      { path: '/appointments/:id', name: 'Appointment Detail', type: 'detail', sections: ['profile', 'activity-feed'] },
    ],
    crud: [
      {
        entity: 'Appointment',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search'],
        fields: [
          { name: 'title', type: 'string', required: true, indexed: false, unique: false },
          { name: 'patientId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Patient' },
          { name: 'resourceId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Doctor' },
          { name: 'date', type: 'date', required: true, indexed: true, unique: false },
          { name: 'startTime', type: 'string', required: true, indexed: false, unique: false },
          { name: 'endTime', type: 'string', required: true, indexed: false, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'] },
          { name: 'type', type: 'string', required: false, indexed: true, unique: false },
          { name: 'notes', type: 'rich_text', required: false, indexed: false, unique: false },
        ],
        relationships: [
          { target: 'Patient', type: 'belongs_to', foreignKey: 'patientId' },
          { target: 'Doctor', type: 'belongs_to', foreignKey: 'resourceId' },
        ],
        validation: [
          { field: 'date', rule: 'required', message: 'Date is required' },
          { field: 'startTime', rule: 'required', message: 'Start time is required' },
          { field: 'patientId', rule: 'required', message: 'Patient is required' },
          { field: 'resourceId', rule: 'required', message: 'Resource (doctor/staff) is required' },
        ],
      },
      {
        entity: 'TimeSlot',
        operations: ['create', 'read', 'list'],
        fields: [
          { name: 'resourceId', type: 'reference', required: true, indexed: true, unique: false },
          { name: 'date', type: 'date', required: true, indexed: true, unique: false },
          { name: 'startTime', type: 'string', required: true, indexed: false, unique: false },
          { name: 'endTime', type: 'string', required: true, indexed: false, unique: false },
          { name: 'isAvailable', type: 'boolean', required: true, indexed: true, unique: false },
        ],
        validation: [],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/appointments', description: 'List appointments with filters (date range, status, resource)', auth: true },
      { method: 'POST', path: '/api/appointments', description: 'Create new appointment', auth: true },
      { method: 'GET', path: '/api/appointments/:id', description: 'Get appointment details', auth: true },
      { method: 'PUT', path: '/api/appointments/:id', description: 'Update appointment (reschedule, change status)', auth: true },
      { method: 'DELETE', path: '/api/appointments/:id', description: 'Cancel appointment', auth: true },
      { method: 'GET', path: '/api/appointments/slots', description: 'Get available slots for a resource on a date', auth: true },
      { method: 'GET', path: '/api/appointments/calendar', description: 'Get appointments in calendar format (start, end range)', auth: true },
    ],
    forms: [
      {
        entity: 'Appointment',
        fields: [
          { name: 'patientId', type: 'reference', required: true, indexed: false, unique: false },
          { name: 'resourceId', type: 'reference', required: true, indexed: false, unique: false },
          { name: 'date', type: 'date', required: true, indexed: false, unique: false },
          { name: 'startTime', type: 'string', required: true, indexed: false, unique: false },
          { name: 'type', type: 'string', required: false, indexed: false, unique: false },
          { name: 'notes', type: 'rich_text', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/appointments',
        validation: [
          { field: 'patientId', rule: 'required' },
          { field: 'resourceId', rule: 'required' },
          { field: 'date', rule: 'required' },
          { field: 'startTime', rule: 'required' },
        ],
      },
    ],
    validation: [
      { field: 'date', rule: 'required', message: 'Appointment date is required' },
      { field: 'startTime', rule: 'required', message: 'Start time is required' },
    ],
    dashboard: [
      { type: 'stat', title: "Today's Appointments", dataEntity: 'Appointment', size: 'sm' },
      { type: 'stat', title: 'Upcoming (7 days)', dataEntity: 'Appointment', size: 'sm' },
      { type: 'stat', title: 'Cancellations (this month)', dataEntity: 'Appointment', size: 'sm' },
      { type: 'calendar', title: 'Appointment Calendar', dataEntity: 'Appointment', size: 'full' },
      { type: 'table', title: "Today's Schedule", dataEntity: 'Appointment', size: 'full' },
    ],
    reports: [
      { name: 'Appointment Summary', entities: ['Appointment'], metrics: ['total', 'completed', 'cancelled', 'no-show'], filters: ['date_range', 'resource', 'type'], groupBy: ['date', 'resource'] },
      { name: 'Slot Utilisation', entities: ['TimeSlot', 'Appointment'], metrics: ['available_slots', 'booked_slots', 'utilisation_rate'], filters: ['date_range', 'resource'], groupBy: ['date'] },
    ],
    components: ['comp.calendar.appointment-calendar', 'comp.form.appointment-booking', 'comp.slots.availability-picker', 'comp.badge.appointment-status'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'appointments',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'title', type: 'string', required: true, indexed: false, unique: false },
            { name: 'patient_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'resource_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'start_time', type: 'string', required: true, indexed: false, unique: false },
            { name: 'end_time', type: 'string', required: true, indexed: false, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'type', type: 'string', required: false, indexed: true, unique: false },
            { name: 'notes', type: 'string', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [
            { columns: ['date', 'resource_id'], unique: false },
            { columns: ['patient_id'], unique: false },
            { columns: ['status'], unique: false },
          ],
        },
      ],
    },
    tests: [
      { name: 'Create Appointment', type: 'integration', entity: 'Appointment' },
      { name: 'Slot Availability', type: 'integration', entity: 'TimeSlot' },
      { name: 'Appointment Booking Flow', type: 'e2e' },
      { name: 'Double-booking Prevention', type: 'integration' },
    ],
    verification: [
      { check: 'no-double-booking', description: 'Two appointments cannot overlap for the same resource' },
      { check: 'slot-availability', description: 'Slots correctly marked unavailable after booking' },
      { check: 'status-transitions', description: 'Status follows valid transition sequence' },
    ],
    generationRules: [
      { id: 'rule.appointments.slot-duration', params: { defaultDurationMinutes: 30 } },
      { id: 'rule.appointments.reminder', params: { offsetHours: 24, channel: 'email' } },
    ],
  },
};

// ─── 2. HR Management ────────────────────────────────────────────────────────

export const CAP_HR_MANAGEMENT: SkillPack = {
  id: 'cap.hr-management',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'hr',
  description: 'Full HR management: employee master, org chart, attendance, leave workflow, and payroll summary',
  assets: {
    pages: [
      { path: '/admin/employees', name: 'Employees', type: 'listing', sections: ['filters', 'team-grid', 'data-table'] },
      { path: '/admin/employees/:id', name: 'Employee Profile', type: 'detail', sections: ['profile', 'data-table', 'activity-feed'] },
      { path: '/admin/attendance', name: 'Attendance', type: 'dashboard', sections: ['stats-cards', 'calendar', 'data-table'] },
      { path: '/admin/leave', name: 'Leave Management', type: 'listing', sections: ['stats-cards', 'filters', 'data-table'] },
      { path: '/admin/payroll', name: 'Payroll', type: 'dashboard', sections: ['stats-cards', 'filters', 'data-table', 'charts'] },
    ],
    crud: [
      {
        entity: 'Employee',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search', 'export'],
        fields: [
          { name: 'employeeId', type: 'string', required: true, indexed: true, unique: true },
          { name: 'firstName', type: 'string', required: true, indexed: false, unique: false },
          { name: 'lastName', type: 'string', required: true, indexed: false, unique: false },
          { name: 'email', type: 'string', required: true, indexed: true, unique: true },
          { name: 'phone', type: 'string', required: false, indexed: false, unique: false },
          { name: 'department', type: 'string', required: true, indexed: true, unique: false },
          { name: 'designation', type: 'string', required: true, indexed: false, unique: false },
          { name: 'joiningDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['active', 'on-leave', 'terminated', 'probation'] },
          { name: 'managerId', type: 'reference', required: false, indexed: true, unique: false, referenceTarget: 'Employee' },
          { name: 'salary', type: 'number', required: false, indexed: false, unique: false },
        ],
        validation: [
          { field: 'employeeId', rule: 'required', message: 'Employee ID is required' },
          { field: 'email', rule: 'email', message: 'Valid email required' },
          { field: 'joiningDate', rule: 'required', message: 'Joining date is required' },
        ],
      },
      {
        entity: 'LeaveRequest',
        operations: ['create', 'read', 'update', 'list', 'search'],
        fields: [
          { name: 'employeeId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Employee' },
          { name: 'leaveType', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid'] },
          { name: 'fromDate', type: 'date', required: true, indexed: true, unique: false },
          { name: 'toDate', type: 'date', required: true, indexed: true, unique: false },
          { name: 'reason', type: 'rich_text', required: true, indexed: false, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['pending', 'approved', 'rejected', 'cancelled'] },
          { name: 'approvedBy', type: 'reference', required: false, indexed: false, unique: false, referenceTarget: 'Employee' },
        ],
        validation: [
          { field: 'fromDate', rule: 'required', message: 'Start date required' },
          { field: 'toDate', rule: 'required', message: 'End date required' },
          { field: 'reason', rule: 'required', message: 'Reason is required' },
        ],
      },
      {
        entity: 'Attendance',
        operations: ['create', 'read', 'list', 'export'],
        fields: [
          { name: 'employeeId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Employee' },
          { name: 'date', type: 'date', required: true, indexed: true, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['present', 'absent', 'half-day', 'late', 'on-leave'] },
          { name: 'checkIn', type: 'string', required: false, indexed: false, unique: false },
          { name: 'checkOut', type: 'string', required: false, indexed: false, unique: false },
        ],
        validation: [
          { field: 'date', rule: 'required', message: 'Date is required' },
          { field: 'status', rule: 'required', message: 'Status is required' },
        ],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/employees', description: 'List employees with filters', auth: true },
      { method: 'POST', path: '/api/employees', description: 'Create employee', auth: true },
      { method: 'GET', path: '/api/employees/:id', description: 'Get employee profile', auth: true },
      { method: 'PUT', path: '/api/employees/:id', description: 'Update employee', auth: true },
      { method: 'DELETE', path: '/api/employees/:id', description: 'Terminate employee', auth: true },
      { method: 'GET', path: '/api/leave', description: 'List leave requests', auth: true },
      { method: 'POST', path: '/api/leave', description: 'Submit leave request', auth: true },
      { method: 'PUT', path: '/api/leave/:id/approve', description: 'Approve leave request', auth: true },
      { method: 'PUT', path: '/api/leave/:id/reject', description: 'Reject leave request', auth: true },
      { method: 'GET', path: '/api/attendance', description: 'Get attendance records', auth: true },
      { method: 'POST', path: '/api/attendance/mark', description: 'Mark attendance for date', auth: true },
      { method: 'GET', path: '/api/attendance/export', description: 'Export attendance CSV', auth: true },
    ],
    forms: [
      {
        entity: 'Employee',
        fields: [
          { name: 'employeeId', type: 'string', required: true, indexed: false, unique: false },
          { name: 'firstName', type: 'string', required: true, indexed: false, unique: false },
          { name: 'lastName', type: 'string', required: true, indexed: false, unique: false },
          { name: 'email', type: 'string', required: true, indexed: false, unique: false },
          { name: 'department', type: 'string', required: true, indexed: false, unique: false },
          { name: 'designation', type: 'string', required: true, indexed: false, unique: false },
          { name: 'joiningDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'salary', type: 'number', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/employees',
        validation: [
          { field: 'email', rule: 'email' },
          { field: 'joiningDate', rule: 'required' },
        ],
      },
      {
        entity: 'LeaveRequest',
        fields: [
          { name: 'leaveType', type: 'enum', required: true, indexed: false, unique: false, enumValues: ['annual', 'sick', 'casual', 'unpaid'] },
          { name: 'fromDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'toDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'reason', type: 'rich_text', required: true, indexed: false, unique: false },
        ],
        submitAction: '/api/leave',
        validation: [
          { field: 'fromDate', rule: 'required' },
          { field: 'toDate', rule: 'required' },
          { field: 'reason', rule: 'required' },
        ],
      },
    ],
    validation: [
      { field: 'email', rule: 'email', message: 'Valid email required' },
      { field: 'employeeId', rule: 'unique', message: 'Employee ID must be unique' },
    ],
    dashboard: [
      { type: 'stat', title: 'Total Employees', dataEntity: 'Employee', size: 'sm' },
      { type: 'stat', title: 'Present Today', dataEntity: 'Attendance', size: 'sm' },
      { type: 'stat', title: 'On Leave Today', dataEntity: 'LeaveRequest', size: 'sm' },
      { type: 'stat', title: 'Pending Leave Requests', dataEntity: 'LeaveRequest', size: 'sm' },
      { type: 'chart', title: 'Attendance Trend (30 days)', dataEntity: 'Attendance', size: 'lg' },
      { type: 'table', title: 'Pending Leave Approvals', dataEntity: 'LeaveRequest', size: 'full' },
    ],
    reports: [
      { name: 'Headcount Report', entities: ['Employee'], metrics: ['total', 'active', 'on_leave', 'terminated'], filters: ['department', 'date_range'], groupBy: ['department', 'status'] },
      { name: 'Monthly Attendance Report', entities: ['Attendance'], metrics: ['present_days', 'absent_days', 'late_count', 'attendance_rate'], filters: ['month', 'department', 'employee'], groupBy: ['employee', 'date'] },
      { name: 'Leave Utilisation Report', entities: ['LeaveRequest'], metrics: ['days_taken', 'balance_remaining', 'by_type'], filters: ['date_range', 'department'], groupBy: ['employee', 'leave_type'] },
    ],
    components: ['comp.table.employee-grid', 'comp.form.employee-create', 'comp.calendar.attendance', 'comp.form.leave-request', 'comp.badge.leave-status'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'employees',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'employee_id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'first_name', type: 'string', required: true, indexed: false, unique: false },
            { name: 'last_name', type: 'string', required: true, indexed: false, unique: false },
            { name: 'email', type: 'string', required: true, indexed: true, unique: true },
            { name: 'phone', type: 'string', required: false, indexed: false, unique: false },
            { name: 'department', type: 'string', required: true, indexed: true, unique: false },
            { name: 'designation', type: 'string', required: true, indexed: false, unique: false },
            { name: 'joining_date', type: 'date', required: true, indexed: false, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'manager_id', type: 'string', required: false, indexed: true, unique: false },
            { name: 'salary', type: 'number', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['employee_id'], unique: true }, { columns: ['department'], unique: false }, { columns: ['status'], unique: false }],
        },
        {
          name: 'leave_requests',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'employee_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'leave_type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'from_date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'to_date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'reason', type: 'string', required: true, indexed: false, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'approved_by', type: 'string', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['employee_id'], unique: false }, { columns: ['status'], unique: false }],
        },
        {
          name: 'attendance',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'employee_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'check_in', type: 'string', required: false, indexed: false, unique: false },
            { name: 'check_out', type: 'string', required: false, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['employee_id', 'date'], unique: true }, { columns: ['date'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Employee CRUD', type: 'integration', entity: 'Employee' },
      { name: 'Leave Request Flow', type: 'e2e' },
      { name: 'Leave Approval Workflow', type: 'integration' },
      { name: 'Attendance Marking', type: 'integration' },
    ],
    verification: [
      { check: 'leave-balance', description: 'Leave balance decrements correctly on approval' },
      { check: 'no-overlapping-leave', description: 'Overlapping leave for same employee is prevented' },
      { check: 'attendance-unique-per-day', description: 'One attendance record per employee per day enforced' },
    ],
    generationRules: [
      { id: 'rule.hr.leave-types', params: { types: ['annual', 'sick', 'casual', 'maternity', 'paternity', 'unpaid'] } },
      { id: 'rule.hr.approval-chain', params: { levels: ['manager', 'hr'] } },
    ],
  },
};

// ─── 3. Enterprise Billing ───────────────────────────────────────────────────

export const CAP_BILLING_ENTERPRISE: SkillPack = {
  id: 'cap.billing-enterprise',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'billing-enterprise',
  description: 'B2B invoicing with line-item invoice generation, payment tracking, credit notes, aging report, and multi-currency support',
  assets: {
    pages: [
      { path: '/admin/billing', name: 'Billing Dashboard', type: 'dashboard', sections: ['stats-cards', 'charts', 'data-table'] },
      { path: '/admin/billing/invoices', name: 'Invoices', type: 'listing', sections: ['filters', 'data-table'] },
      { path: '/admin/billing/invoices/:id', name: 'Invoice Detail', type: 'detail', sections: ['profile', 'data-table', 'activity-feed'] },
      { path: '/admin/billing/invoices/new', name: 'New Invoice', type: 'auth', sections: ['data-table', 'filters'] },
    ],
    crud: [
      {
        entity: 'Invoice',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search', 'export'],
        fields: [
          { name: 'invoiceNumber', type: 'string', required: true, indexed: true, unique: true },
          { name: 'clientId', type: 'reference', required: true, indexed: true, unique: false },
          { name: 'issueDate', type: 'date', required: true, indexed: true, unique: false },
          { name: 'dueDate', type: 'date', required: true, indexed: true, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'credit-note'] },
          { name: 'subtotal', type: 'number', required: true, indexed: false, unique: false },
          { name: 'taxAmount', type: 'number', required: false, indexed: false, unique: false },
          { name: 'discountAmount', type: 'number', required: false, indexed: false, unique: false },
          { name: 'totalAmount', type: 'number', required: true, indexed: false, unique: false },
          { name: 'currency', type: 'string', required: true, indexed: false, unique: false },
          { name: 'notes', type: 'rich_text', required: false, indexed: false, unique: false },
        ],
        validation: [
          { field: 'invoiceNumber', rule: 'required', message: 'Invoice number is required' },
          { field: 'clientId', rule: 'required', message: 'Client is required' },
          { field: 'dueDate', rule: 'required', message: 'Due date is required' },
        ],
      },
      {
        entity: 'InvoiceLineItem',
        operations: ['create', 'read', 'update', 'delete', 'list'],
        fields: [
          { name: 'invoiceId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Invoice' },
          { name: 'description', type: 'string', required: true, indexed: false, unique: false },
          { name: 'quantity', type: 'number', required: true, indexed: false, unique: false },
          { name: 'unitPrice', type: 'number', required: true, indexed: false, unique: false },
          { name: 'taxRate', type: 'number', required: false, indexed: false, unique: false },
          { name: 'amount', type: 'number', required: true, indexed: false, unique: false },
        ],
        validation: [
          { field: 'description', rule: 'required', message: 'Description is required' },
          { field: 'quantity', rule: 'min:0.01', message: 'Quantity must be positive' },
          { field: 'unitPrice', rule: 'min:0', message: 'Unit price must be non-negative' },
        ],
      },
      {
        entity: 'Payment',
        operations: ['create', 'read', 'list', 'export'],
        fields: [
          { name: 'invoiceId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'Invoice' },
          { name: 'amount', type: 'number', required: true, indexed: false, unique: false },
          { name: 'paymentDate', type: 'date', required: true, indexed: true, unique: false },
          { name: 'method', type: 'enum', required: true, indexed: false, unique: false, enumValues: ['bank-transfer', 'cash', 'cheque', 'card', 'upi', 'online'] },
          { name: 'reference', type: 'string', required: false, indexed: false, unique: false },
        ],
        validation: [
          { field: 'amount', rule: 'required', message: 'Payment amount is required' },
          { field: 'paymentDate', rule: 'required', message: 'Payment date is required' },
        ],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/invoices', description: 'List invoices with status/date/client filters', auth: true },
      { method: 'POST', path: '/api/invoices', description: 'Create invoice with line items', auth: true },
      { method: 'GET', path: '/api/invoices/:id', description: 'Get invoice with line items and payment history', auth: true },
      { method: 'PUT', path: '/api/invoices/:id', description: 'Update invoice (draft only)', auth: true },
      { method: 'POST', path: '/api/invoices/:id/send', description: 'Send invoice to client by email', auth: true },
      { method: 'POST', path: '/api/invoices/:id/payment', description: 'Record payment against invoice', auth: true },
      { method: 'POST', path: '/api/invoices/:id/credit-note', description: 'Issue credit note for invoice', auth: true },
      { method: 'GET', path: '/api/invoices/aging', description: 'Accounts receivable aging report', auth: true },
      { method: 'GET', path: '/api/invoices/export', description: 'Export invoices to CSV/PDF', auth: true },
    ],
    forms: [
      {
        entity: 'Invoice',
        fields: [
          { name: 'clientId', type: 'reference', required: true, indexed: false, unique: false },
          { name: 'issueDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'dueDate', type: 'date', required: true, indexed: false, unique: false },
          { name: 'currency', type: 'string', required: true, indexed: false, unique: false },
          { name: 'notes', type: 'rich_text', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/invoices',
        validation: [
          { field: 'clientId', rule: 'required' },
          { field: 'dueDate', rule: 'required' },
        ],
      },
    ],
    validation: [
      { field: 'totalAmount', rule: 'min:0', message: 'Invoice total must be non-negative' },
    ],
    dashboard: [
      { type: 'stat', title: 'Total Receivable', dataEntity: 'Invoice', size: 'sm' },
      { type: 'stat', title: 'Overdue Amount', dataEntity: 'Invoice', size: 'sm' },
      { type: 'stat', title: 'Collected This Month', dataEntity: 'Payment', size: 'sm' },
      { type: 'stat', title: 'Overdue Invoices (count)', dataEntity: 'Invoice', size: 'sm' },
      { type: 'chart', title: 'Monthly Revenue Trend', dataEntity: 'Payment', size: 'lg' },
      { type: 'table', title: 'Overdue Invoices', dataEntity: 'Invoice', size: 'full' },
    ],
    reports: [
      { name: 'Accounts Receivable Aging', entities: ['Invoice'], metrics: ['total', 'current', '30_days', '60_days', '90_days_plus'], filters: ['client', 'date_range'], groupBy: ['client'] },
      { name: 'Revenue Summary', entities: ['Payment'], metrics: ['total_collected', 'by_month', 'by_client'], filters: ['date_range'], groupBy: ['month', 'client'] },
    ],
    components: ['comp.table.invoice-list', 'comp.form.invoice-builder', 'comp.viewer.invoice-pdf', 'comp.chart.aging-report'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'invoices',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'invoice_number', type: 'string', required: true, indexed: true, unique: true },
            { name: 'client_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'issue_date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'due_date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'subtotal', type: 'number', required: true, indexed: false, unique: false },
            { name: 'tax_amount', type: 'number', required: false, indexed: false, unique: false },
            { name: 'discount_amount', type: 'number', required: false, indexed: false, unique: false },
            { name: 'total_amount', type: 'number', required: true, indexed: false, unique: false },
            { name: 'currency', type: 'string', required: true, indexed: false, unique: false },
            { name: 'notes', type: 'string', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['invoice_number'], unique: true }, { columns: ['client_id', 'status'], unique: false }, { columns: ['due_date', 'status'], unique: false }],
        },
        {
          name: 'invoice_line_items',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'invoice_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'description', type: 'string', required: true, indexed: false, unique: false },
            { name: 'quantity', type: 'number', required: true, indexed: false, unique: false },
            { name: 'unit_price', type: 'number', required: true, indexed: false, unique: false },
            { name: 'tax_rate', type: 'number', required: false, indexed: false, unique: false },
            { name: 'amount', type: 'number', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['invoice_id'], unique: false }],
        },
        {
          name: 'payments',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'invoice_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'amount', type: 'number', required: true, indexed: false, unique: false },
            { name: 'payment_date', type: 'date', required: true, indexed: true, unique: false },
            { name: 'method', type: 'string', required: true, indexed: false, unique: false },
            { name: 'reference', type: 'string', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['invoice_id'], unique: false }, { columns: ['payment_date'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Invoice Creation with Line Items', type: 'integration', entity: 'Invoice' },
      { name: 'Payment Recording', type: 'integration', entity: 'Payment' },
      { name: 'Invoice PDF Generation', type: 'integration' },
      { name: 'Aging Report Calculation', type: 'integration' },
    ],
    verification: [
      { check: 'invoice-total-matches-lines', description: 'Invoice total equals sum of line item amounts' },
      { check: 'overdue-detection', description: 'Invoices past due date are flagged as overdue' },
      { check: 'payment-balance', description: 'Partial payments tracked correctly against invoice balance' },
    ],
    generationRules: [
      { id: 'rule.billing.invoice-numbering', params: { format: 'INV-YYYY-NNNN', autoIncrement: true } },
      { id: 'rule.billing.overdue-cron', params: { checkInterval: 'daily', notifyClient: true } },
    ],
  },
};

// ─── 4. Workflow Engine ──────────────────────────────────────────────────────

export const CAP_WORKFLOW_ENGINE: SkillPack = {
  id: 'cap.workflow-engine',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'workflow',
  description: 'Multi-step approval chains, configurable status state machines, automated transitions, and full audit trail',
  assets: {
    pages: [
      { path: '/admin/approvals', name: 'Approval Queue', type: 'listing', sections: ['stats-cards', 'filters', 'data-table'] },
      { path: '/admin/workflows', name: 'Workflow Definitions', type: 'listing', sections: ['filters', 'data-table'] },
    ],
    crud: [
      {
        entity: 'WorkflowDefinition',
        operations: ['create', 'read', 'update', 'delete', 'list'],
        fields: [
          { name: 'name', type: 'string', required: true, indexed: false, unique: true },
          { name: 'entityType', type: 'string', required: true, indexed: true, unique: false },
          { name: 'steps', type: 'json', required: true, indexed: false, unique: false },
          { name: 'isActive', type: 'boolean', required: true, indexed: true, unique: false },
        ],
        validation: [
          { field: 'name', rule: 'required', message: 'Workflow name is required' },
          { field: 'entityType', rule: 'required', message: 'Entity type is required' },
        ],
      },
      {
        entity: 'ApprovalRequest',
        operations: ['create', 'read', 'update', 'list', 'search'],
        fields: [
          { name: 'workflowId', type: 'reference', required: true, indexed: true, unique: false, referenceTarget: 'WorkflowDefinition' },
          { name: 'entityType', type: 'string', required: true, indexed: true, unique: false },
          { name: 'entityId', type: 'string', required: true, indexed: true, unique: false },
          { name: 'currentStep', type: 'number', required: true, indexed: false, unique: false },
          { name: 'status', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['pending', 'in-review', 'approved', 'rejected', 'escalated', 'cancelled'] },
          { name: 'requestedBy', type: 'string', required: true, indexed: true, unique: false },
          { name: 'assignedTo', type: 'string', required: true, indexed: true, unique: false },
        ],
        validation: [
          { field: 'entityId', rule: 'required', message: 'Entity reference is required' },
          { field: 'requestedBy', rule: 'required', message: 'Requester is required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/workflows/trigger', description: 'Start a workflow for an entity', auth: true },
      { method: 'GET', path: '/api/workflows/:id/status', description: 'Get current workflow status', auth: true },
      { method: 'GET', path: '/api/approvals', description: 'List approval requests assigned to current user', auth: true },
      { method: 'POST', path: '/api/approvals/:id/approve', description: 'Approve a request at current step', auth: true },
      { method: 'POST', path: '/api/approvals/:id/reject', description: 'Reject a request with reason', auth: true },
      { method: 'POST', path: '/api/approvals/:id/escalate', description: 'Escalate overdue approval', auth: true },
      { method: 'GET', path: '/api/workflows/definitions', description: 'List workflow definitions', auth: true },
      { method: 'POST', path: '/api/workflows/definitions', description: 'Create workflow definition', auth: true },
    ],
    forms: [
      {
        entity: 'ApprovalAction',
        fields: [
          { name: 'action', type: 'enum', required: true, indexed: false, unique: false, enumValues: ['approve', 'reject', 'escalate'] },
          { name: 'comment', type: 'rich_text', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/approvals/:id/approve',
        validation: [
          { field: 'action', rule: 'required' },
        ],
      },
    ],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Pending Approvals', dataEntity: 'ApprovalRequest', size: 'sm' },
      { type: 'stat', title: 'Approved Today', dataEntity: 'ApprovalRequest', size: 'sm' },
      { type: 'stat', title: 'Overdue (>48hrs)', dataEntity: 'ApprovalRequest', size: 'sm' },
      { type: 'feed', title: 'Recent Activity', dataEntity: 'ApprovalRequest', size: 'full' },
      { type: 'table', title: 'My Approval Queue', dataEntity: 'ApprovalRequest', size: 'full' },
    ],
    reports: [
      { name: 'Approval Turnaround Time', entities: ['ApprovalRequest'], metrics: ['avg_hours', 'by_approver', 'by_type'], filters: ['date_range', 'status'], groupBy: ['approver', 'entity_type'] },
    ],
    components: ['comp.workflow.approval-queue', 'comp.workflow.status-tracker', 'comp.form.approval-action'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'workflow_definitions',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: false, unique: true },
            { name: 'entity_type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'steps', type: 'json', required: true, indexed: false, unique: false },
            { name: 'is_active', type: 'boolean', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['entity_type', 'is_active'], unique: false }],
        },
        {
          name: 'approval_requests',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'workflow_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'entity_type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'entity_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'current_step', type: 'number', required: true, indexed: false, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'requested_by', type: 'string', required: true, indexed: true, unique: false },
            { name: 'assigned_to', type: 'string', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: true, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['assigned_to', 'status'], unique: false }, { columns: ['entity_id', 'entity_type'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Workflow Trigger', type: 'integration' },
      { name: 'Approve Step', type: 'integration' },
      { name: 'Reject Flow', type: 'integration' },
      { name: 'Multi-step Approval Chain', type: 'e2e' },
    ],
    verification: [
      { check: 'only-assigned-can-approve', description: 'Only the assigned approver for current step can act' },
      { check: 'sequential-steps', description: 'Step 2 cannot complete before step 1 is approved' },
      { check: 'notifications-sent', description: 'Next approver notified when step advances' },
    ],
    generationRules: [
      { id: 'rule.workflow.default-timeout', params: { hours: 48, action: 'escalate' } },
    ],
  },
};

// ─── 5. Reporting ────────────────────────────────────────────────────────────

export const CAP_REPORTING: SkillPack = {
  id: 'cap.reporting',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'reporting',
  description: 'Report builder with date-range filters, chart types, CSV/PDF export, and scheduled email delivery',
  assets: {
    pages: [
      { path: '/admin/reports', name: 'Reports', type: 'dashboard', sections: ['filters', 'charts', 'data-table'] },
      { path: '/admin/reports/:id', name: 'Report Detail', type: 'detail', sections: ['filters', 'charts', 'data-table'] },
    ],
    crud: [
      {
        entity: 'SavedReport',
        operations: ['create', 'read', 'update', 'delete', 'list'],
        fields: [
          { name: 'name', type: 'string', required: true, indexed: false, unique: false },
          { name: 'config', type: 'json', required: true, indexed: false, unique: false },
          { name: 'schedule', type: 'string', required: false, indexed: false, unique: false },
          { name: 'recipients', type: 'json', required: false, indexed: false, unique: false },
        ],
        validation: [{ field: 'name', rule: 'required', message: 'Report name is required' }],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/reports', description: 'List saved reports', auth: true },
      { method: 'POST', path: '/api/reports/generate', description: 'Generate report with config (entity, metrics, filters, groupBy)', auth: true },
      { method: 'GET', path: '/api/reports/:id', description: 'Get report definition', auth: true },
      { method: 'GET', path: '/api/reports/:id/data', description: 'Get report data with applied filters', auth: true },
      { method: 'GET', path: '/api/reports/:id/export', description: 'Export report as CSV or PDF', auth: true },
      { method: 'POST', path: '/api/reports/:id/schedule', description: 'Schedule report for email delivery', auth: true },
    ],
    forms: [],
    validation: [],
    dashboard: [
      { type: 'chart', title: 'Revenue Trend', dataEntity: 'Invoice', size: 'lg' },
      { type: 'chart', title: 'Key Metrics', dataEntity: 'SavedReport', size: 'md' },
      { type: 'table', title: 'Recent Report Runs', dataEntity: 'SavedReport', size: 'full' },
    ],
    reports: [
      { name: 'Custom Report Builder', entities: [], metrics: [], filters: ['entity', 'date_range', 'group_by'], groupBy: [] },
    ],
    components: ['comp.reports.builder', 'comp.reports.chart-preview', 'comp.reports.export-button', 'comp.reports.scheduler'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'saved_reports',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: false, unique: false },
            { name: 'config', type: 'json', required: true, indexed: false, unique: false },
            { name: 'schedule', type: 'string', required: false, indexed: false, unique: false },
            { name: 'recipients', type: 'json', required: false, indexed: false, unique: false },
            { name: 'created_by', type: 'string', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['created_by'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Report Generation', type: 'integration' },
      { name: 'CSV Export', type: 'integration' },
      { name: 'Report Builder UI', type: 'e2e' },
    ],
    verification: [
      { check: 'export-completeness', description: 'CSV export includes all filtered data' },
      { check: 'chart-renders', description: 'Charts render without errors for all chart types' },
    ],
    generationRules: [
      { id: 'rule.reports.chart-types', params: { types: ['line', 'bar', 'pie', 'area', 'table'] } },
      { id: 'rule.reports.export-formats', params: { formats: ['csv', 'pdf'] } },
    ],
  },
};

// ─── 6. Document Management ──────────────────────────────────────────────────

export const CAP_DOCUMENT_MANAGEMENT: SkillPack = {
  id: 'cap.document-management',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'documents',
  description: 'File upload with versioning, tags, search, folder organization, access control, and preview',
  assets: {
    pages: [
      { path: '/admin/documents', name: 'Documents', type: 'listing', sections: ['filters', 'data-table'] },
    ],
    crud: [
      {
        entity: 'Document',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search', 'export'],
        fields: [
          { name: 'name', type: 'string', required: true, indexed: true, unique: false },
          { name: 'fileUrl', type: 'file', required: true, indexed: false, unique: false },
          { name: 'fileType', type: 'string', required: true, indexed: true, unique: false },
          { name: 'fileSize', type: 'number', required: true, indexed: false, unique: false },
          { name: 'folder', type: 'string', required: false, indexed: true, unique: false },
          { name: 'tags', type: 'json', required: false, indexed: false, unique: false },
          { name: 'version', type: 'number', required: true, indexed: false, unique: false },
          { name: 'uploadedBy', type: 'string', required: true, indexed: true, unique: false },
          { name: 'entityType', type: 'string', required: false, indexed: true, unique: false },
          { name: 'entityId', type: 'string', required: false, indexed: true, unique: false },
        ],
        validation: [
          { field: 'name', rule: 'required', message: 'Document name is required' },
          { field: 'fileUrl', rule: 'required', message: 'File is required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/documents/upload', description: 'Upload file (multipart/form-data)', auth: true },
      { method: 'GET', path: '/api/documents', description: 'List documents with folder/tag/entity filters', auth: true },
      { method: 'GET', path: '/api/documents/:id', description: 'Get document metadata and download URL', auth: true },
      { method: 'PUT', path: '/api/documents/:id', description: 'Update document metadata or replace file (new version)', auth: true },
      { method: 'DELETE', path: '/api/documents/:id', description: 'Delete document', auth: true },
      { method: 'GET', path: '/api/documents/search', description: 'Full-text search across document names and tags', auth: true },
    ],
    forms: [],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Total Documents', dataEntity: 'Document', size: 'sm' },
      { type: 'stat', title: 'Uploaded This Month', dataEntity: 'Document', size: 'sm' },
      { type: 'table', title: 'Recent Documents', dataEntity: 'Document', size: 'full' },
    ],
    reports: [
      { name: 'Document Summary', entities: ['Document'], metrics: ['total_count', 'total_size_mb', 'by_type'], filters: ['date_range', 'folder'], groupBy: ['file_type', 'folder'] },
    ],
    components: ['comp.documents.upload-zone', 'comp.documents.file-list', 'comp.documents.tag-filter', 'comp.documents.preview'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'documents',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: true, unique: false },
            { name: 'file_url', type: 'string', required: true, indexed: false, unique: false },
            { name: 'file_type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'file_size', type: 'number', required: true, indexed: false, unique: false },
            { name: 'folder', type: 'string', required: false, indexed: true, unique: false },
            { name: 'tags', type: 'json', required: false, indexed: false, unique: false },
            { name: 'version', type: 'number', required: true, indexed: false, unique: false },
            { name: 'uploaded_by', type: 'string', required: true, indexed: true, unique: false },
            { name: 'entity_type', type: 'string', required: false, indexed: true, unique: false },
            { name: 'entity_id', type: 'string', required: false, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: true, unique: false },
          ],
          indexes: [{ columns: ['entity_id', 'entity_type'], unique: false }, { columns: ['folder'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'File Upload', type: 'integration' },
      { name: 'Document Search', type: 'integration' },
    ],
    verification: [
      { check: 'upload-success', description: 'Files upload and URL returned correctly' },
      { check: 'access-control', description: 'Private documents not accessible without auth' },
    ],
    generationRules: [
      { id: 'rule.documents.storage', params: { provider: 'cloudinary', maxSizeMB: 50 } },
      { id: 'rule.documents.accepted-types', params: { types: ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'csv'] } },
    ],
  },
};

// ─── 7. Role-Based Permissions ───────────────────────────────────────────────

export const CAP_ROLE_PERMISSIONS: SkillPack = {
  id: 'cap.role-permissions',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'permissions',
  description: 'Role matrix with resource-action RBAC, role assignment, permission inheritance, and access audit log',
  assets: {
    pages: [
      { path: '/admin/roles', name: 'Roles & Permissions', type: 'listing', sections: ['filters', 'data-table'] },
      { path: '/admin/roles/:id', name: 'Role Detail', type: 'detail', sections: ['profile', 'data-table'] },
    ],
    crud: [
      {
        entity: 'Role',
        operations: ['create', 'read', 'update', 'delete', 'list'],
        fields: [
          { name: 'name', type: 'string', required: true, indexed: true, unique: true },
          { name: 'description', type: 'string', required: false, indexed: false, unique: false },
          { name: 'permissions', type: 'json', required: true, indexed: false, unique: false },
          { name: 'isSystemRole', type: 'boolean', required: true, indexed: false, unique: false },
        ],
        validation: [
          { field: 'name', rule: 'required', message: 'Role name is required' },
        ],
      },
      {
        entity: 'UserRole',
        operations: ['create', 'read', 'delete', 'list'],
        fields: [
          { name: 'userId', type: 'reference', required: true, indexed: true, unique: false },
          { name: 'roleId', type: 'reference', required: true, indexed: true, unique: false },
          { name: 'assignedBy', type: 'string', required: true, indexed: false, unique: false },
          { name: 'assignedAt', type: 'date', required: true, indexed: false, unique: false },
        ],
        validation: [
          { field: 'userId', rule: 'required' },
          { field: 'roleId', rule: 'required' },
        ],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/roles', description: 'List all roles', auth: true },
      { method: 'POST', path: '/api/roles', description: 'Create role', auth: true },
      { method: 'GET', path: '/api/roles/:id', description: 'Get role with permission matrix', auth: true },
      { method: 'PUT', path: '/api/roles/:id', description: 'Update role permissions', auth: true },
      { method: 'DELETE', path: '/api/roles/:id', description: 'Delete non-system role', auth: true },
      { method: 'GET', path: '/api/roles/:id/users', description: 'List users with this role', auth: true },
      { method: 'POST', path: '/api/users/:id/roles', description: 'Assign role to user', auth: true },
      { method: 'DELETE', path: '/api/users/:id/roles/:roleId', description: 'Remove role from user', auth: true },
      { method: 'GET', path: '/api/permissions', description: 'List all available permissions', auth: true },
    ],
    forms: [],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Total Roles', dataEntity: 'Role', size: 'sm' },
      { type: 'table', title: 'Roles Matrix', dataEntity: 'Role', size: 'full' },
      { type: 'table', title: 'Recent Role Changes', dataEntity: 'UserRole', size: 'full' },
    ],
    reports: [],
    components: ['comp.permissions.role-matrix', 'comp.permissions.role-badge', 'comp.permissions.assign-modal'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'roles',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: true, unique: true },
            { name: 'description', type: 'string', required: false, indexed: false, unique: false },
            { name: 'permissions', type: 'json', required: true, indexed: false, unique: false },
            { name: 'is_system_role', type: 'boolean', required: true, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['name'], unique: true }],
        },
        {
          name: 'user_roles',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'role_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'assigned_by', type: 'string', required: true, indexed: false, unique: false },
            { name: 'assigned_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['user_id', 'role_id'], unique: true }],
        },
      ],
    },
    tests: [
      { name: 'Role Creation', type: 'integration', entity: 'Role' },
      { name: 'Role Assignment', type: 'integration' },
      { name: 'Permission Enforcement', type: 'integration' },
    ],
    verification: [
      { check: 'system-roles-protected', description: 'System roles cannot be deleted or have permissions removed' },
      { check: 'permission-check', description: 'Requests from users without required permission return 403' },
    ],
    generationRules: [
      { id: 'rule.permissions.default-roles', params: { roles: ['admin', 'manager', 'staff', 'viewer'] } },
      { id: 'rule.permissions.model', params: { type: 'RBAC', granularity: 'resource-action' } },
    ],
  },
};

// ─── 8. Audit Log ────────────────────────────────────────────────────────────

export const CAP_AUDIT_LOG: SkillPack = {
  id: 'cap.audit-log',
  version: '1.0.0',
  status: 'active',
  createdAt: '2026-07-01T00:00:00+00:00',
  updatedAt: '2026-07-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'audit',
  description: 'Immutable change history per entity with user attribution, before/after diff, IP logging, and exportable audit trail',
  assets: {
    pages: [
      { path: '/admin/audit-log', name: 'Audit Log', type: 'listing', sections: ['filters', 'activity-feed', 'data-table'] },
    ],
    crud: [
      {
        entity: 'AuditLog',
        operations: ['read', 'list', 'search', 'export'],
        fields: [
          { name: 'entityType', type: 'string', required: true, indexed: true, unique: false },
          { name: 'entityId', type: 'string', required: true, indexed: true, unique: false },
          { name: 'action', type: 'enum', required: true, indexed: true, unique: false, enumValues: ['created', 'updated', 'deleted', 'status-changed', 'viewed', 'exported', 'login', 'logout'] },
          { name: 'performedBy', type: 'string', required: true, indexed: true, unique: false },
          { name: 'ipAddress', type: 'string', required: false, indexed: false, unique: false },
          { name: 'changesBefore', type: 'json', required: false, indexed: false, unique: false },
          { name: 'changesAfter', type: 'json', required: false, indexed: false, unique: false },
          { name: 'metadata', type: 'json', required: false, indexed: false, unique: false },
          { name: 'performedAt', type: 'date', required: true, indexed: true, unique: false },
        ],
        validation: [],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/audit-logs', description: 'Query audit log with entity/user/action/date filters', auth: true },
      { method: 'GET', path: '/api/audit-logs/:entityType/:entityId', description: 'Get full change history for a specific entity', auth: true },
      { method: 'GET', path: '/api/audit-logs/export', description: 'Export audit log as CSV', auth: true },
    ],
    forms: [],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Events Today', dataEntity: 'AuditLog', size: 'sm' },
      { type: 'stat', title: 'Unique Users Active', dataEntity: 'AuditLog', size: 'sm' },
      { type: 'feed', title: 'Live Activity Feed', dataEntity: 'AuditLog', size: 'full' },
      { type: 'table', title: 'Audit Log', dataEntity: 'AuditLog', size: 'full' },
      { type: 'chart', title: 'Activity by User', dataEntity: 'AuditLog', size: 'lg' },
    ],
    reports: [
      { name: 'User Activity Report', entities: ['AuditLog'], metrics: ['action_count', 'by_user', 'by_entity_type'], filters: ['date_range', 'user', 'action'], groupBy: ['user', 'action', 'date'] },
    ],
    components: ['comp.audit.activity-feed', 'comp.audit.diff-viewer', 'comp.audit.export-button'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'audit_logs',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'entity_type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'entity_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'action', type: 'string', required: true, indexed: true, unique: false },
            { name: 'performed_by', type: 'string', required: true, indexed: true, unique: false },
            { name: 'ip_address', type: 'string', required: false, indexed: false, unique: false },
            { name: 'changes_before', type: 'json', required: false, indexed: false, unique: false },
            { name: 'changes_after', type: 'json', required: false, indexed: false, unique: false },
            { name: 'metadata', type: 'json', required: false, indexed: false, unique: false },
            { name: 'performed_at', type: 'date', required: true, indexed: true, unique: false },
          ],
          indexes: [
            { columns: ['entity_id', 'entity_type'], unique: false },
            { columns: ['performed_by'], unique: false },
            { columns: ['action'], unique: false },
            { columns: ['performed_at'], unique: false },
          ],
        },
      ],
    },
    tests: [
      { name: 'Audit Log Written on Create', type: 'integration' },
      { name: 'Audit Log Written on Update', type: 'integration' },
      { name: 'Audit Log Written on Delete', type: 'integration' },
      { name: 'Diff View Accuracy', type: 'integration' },
    ],
    verification: [
      { check: 'immutability', description: 'Audit log records cannot be updated or deleted via API' },
      { check: 'complete-coverage', description: 'All CREATE, UPDATE, DELETE operations produce an audit log entry' },
      { check: 'before-after-diff', description: 'Changed fields shown with before and after values' },
    ],
    generationRules: [
      { id: 'rule.audit.auto-log', params: { triggerOn: ['create', 'update', 'delete', 'status-change'] } },
      { id: 'rule.audit.retention', params: { retentionDays: 365 } },
    ],
  },
};
