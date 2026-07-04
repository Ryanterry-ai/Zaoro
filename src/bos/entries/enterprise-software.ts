import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';
import { ENTERPRISE_SOFTWARE_BI } from '../knowledge/bi-profiles/enterprise-software.js';

const EnterpriseSoftwareEntry: BOSEntry = {
  id: 'enterprise.erp',
  industry: 'Enterprise Software',
  subIndustry: 'ERP & Business Software',
  description: 'Enterprise software platform with ERP, CRM, HRM, operations management, reporting, and multi-department support',
  capabilities: [
    'dashboard', 'operations_dashboard', 'reports_analytics', 'data_tables',
    'user_management', 'settings', 'department_overview',
    'activity_feed', 'search', 'notification_center', 'integrations'
  ],
  references: {
    urls: ['https://www.sap.com', 'https://www.microsoft.com/dynamics', 'https://www.oracle.com/erp'],
    selectors: {
      dashboard: '.dashboard, [class*="overview"]',
      operationsPanel: '.operations, [class*="metrics"]',
      reportsSection: '.reports, [class*="analytics"]',
      userTable: '.user-list, [class*="employee"]',
      settingsPanel: '.settings, [class*="preferences"]'
    }
  },
  vocabularyOverrides: {
    'product': 'solution', 'buy': 'deploy', 'store': 'enterprise',
    'cart': 'license', 'checkout': 'implement', 'price': 'license_fee',
    'customer': 'organization', 'order': 'deployment'
  },
  workflows: [
    { name: 'Employee Management', steps: ['Hire', 'Onboard', 'Manage', 'Review', 'Offboard'], revenue_impact: 'Reduces HR admin by 60%' },
    { name: 'Financial Operations', steps: ['Invoice', 'Approve', 'Pay', 'Reconcile', 'Report'], revenue_impact: 'Improves cash flow by 25%' }
  ],
  entities: ['Organization', 'Department', 'Employee', 'User', 'Role', 'Report', 'Workflow', 'Integration'],
  revenueModel: ['subscription', 'per_seat', 'enterprise_license', 'implementation_fee', 'support'],
  revenueIntelligence: ENTERPRISE_SOFTWARE_BI,
  compliance: ['GDPR', 'SOC 2', 'ISO 27001', 'Data Residency', 'Audit Trail', 'RBAC'],
  priority: 1,
  tags: ['enterprise', 'erp', 'business', 'software', 'operations', 'management', 'crm', 'hrm']
};
BOSRegistry.register(EnterpriseSoftwareEntry);
export default EnterpriseSoftwareEntry;
