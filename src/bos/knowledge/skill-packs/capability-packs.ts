import type { SkillPack } from '../../schemas/knowledge/skill-pack.schema.js';

export const CAP_AUTH: SkillPack = {
  id: 'cap.auth',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'auth',
  description: 'Authentication with email/password, social login, JWT, sessions, and RBAC',
  assets: {
    pages: [
      { path: '/login', name: 'Login', type: 'auth', sections: ['login-form', 'social-auth', 'forgot-password'] },
      { path: '/signup', name: 'Sign Up', type: 'auth', sections: ['signup-form', 'social-auth', 'terms'] },
      { path: '/forgot-password', name: 'Forgot Password', type: 'auth', sections: ['email-form', 'success-message'] },
      { path: '/reset-password', name: 'Reset Password', type: 'auth', sections: ['password-form', 'success-message'] },
      { path: '/account', name: 'Account', type: 'dashboard', sections: ['profile', 'security', 'preferences'] },
    ],
    crud: [
      {
        entity: 'User',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search'],
        validation: [
          { field: 'email', rule: 'required', message: 'Email is required' },
          { field: 'email', rule: 'email', message: 'Invalid email format' },
          { field: 'password', rule: 'min:8', message: 'Password must be at least 8 characters' },
        ],
      },
      {
        entity: 'Session',
        operations: ['create', 'read', 'delete'],
        validation: [
          { field: 'userId', rule: 'required', message: 'User ID is required' },
          { field: 'expiresAt', rule: 'required', message: 'Expiry is required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/auth/login', description: 'Login with email/password', auth: false },
      { method: 'POST', path: '/api/auth/signup', description: 'Register new user', auth: false },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout', auth: true },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user', auth: true },
      { method: 'POST', path: '/api/auth/forgot-password', description: 'Send reset email', auth: false },
      { method: 'POST', path: '/api/auth/reset-password', description: 'Reset password with token', auth: false },
      { method: 'GET', path: '/api/users', description: 'List users', auth: true },
      { method: 'PUT', path: '/api/users/:id', description: 'Update user', auth: true },
      { method: 'DELETE', path: '/api/users/:id', description: 'Delete user', auth: true },
    ],
    forms: [
      {
        entity: 'Login',
        fields: [
          { name: 'email', type: 'string', required: true, indexed: false, unique: false },
          { name: 'password', type: 'string', required: true, indexed: false, unique: false },
        ],
        submitAction: '/api/auth/login',
        validation: [
          { field: 'email', rule: 'required' },
          { field: 'password', rule: 'required' },
        ],
      },
      {
        entity: 'Signup',
        fields: [
          { name: 'name', type: 'string', required: true, indexed: false, unique: false },
          { name: 'email', type: 'string', required: true, indexed: false, unique: false },
          { name: 'password', type: 'string', required: true, indexed: false, unique: false },
          { name: 'confirmPassword', type: 'string', required: true, indexed: false, unique: false },
        ],
        submitAction: '/api/auth/signup',
        validation: [
          { field: 'name', rule: 'required' },
          { field: 'email', rule: 'required' },
          { field: 'email', rule: 'email' },
          { field: 'password', rule: 'min:8' },
          { field: 'confirmPassword', rule: 'match:password' },
        ],
      },
    ],
    validation: [
      { field: 'email', rule: 'required', message: 'Email is required' },
      { field: 'email', rule: 'email', message: 'Invalid email format' },
      { field: 'password', rule: 'min:8', message: 'Password too short' },
    ],
    dashboard: [
      { type: 'stat', title: 'Total Users', dataEntity: 'User', size: 'sm' },
      { type: 'stat', title: 'Active Sessions', dataEntity: 'Session', size: 'sm' },
      { type: 'table', title: 'Recent Signups', dataEntity: 'User', size: 'full' },
    ],
    reports: [
      { name: 'User Growth', entities: ['User'], metrics: ['count', 'growth_rate'], filters: [], groupBy: ['created_at'] },
    ],
    components: ['comp.form.login', 'comp.form.signup', 'comp.nav.user-menu', 'comp.auth.social-buttons'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: false, unique: false },
            { name: 'email', type: 'string', required: true, indexed: true, unique: true },
            { name: 'password_hash', type: 'string', required: true, indexed: false, unique: false },
            { name: 'role', type: 'string', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['email'], unique: true }, { columns: ['role'], unique: false }],
        },
        {
          name: 'sessions',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'token', type: 'string', required: true, indexed: true, unique: true },
            { name: 'expires_at', type: 'date', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['token'], unique: true }, { columns: ['user_id'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'User Registration', type: 'e2e' },
      { name: 'Login Flow', type: 'e2e' },
      { name: 'Password Reset', type: 'integration' },
      { name: 'Session Management', type: 'integration' },
    ],
    verification: [
      { check: 'auth-flow', description: 'Login/signup/logout all work correctly' },
      { check: 'jwt-validation', description: 'Tokens are validated and expired correctly' },
      { check: 'password-hashing', description: 'Passwords are hashed with bcrypt' },
      { check: 'rbac', description: 'Role-based access control enforced' },
    ],
    generationRules: [
      { id: 'rule.auth.jwt', params: { algorithm: 'HS256', expiresIn: '7d' } },
      { id: 'rule.auth.bcrypt', params: { rounds: 12 } },
      { id: 'rule.auth.rbac', params: { roles: ['admin', 'user'] } },
    ],
  },
};

export const CAP_PAYMENT: SkillPack = {
  id: 'cap.payment',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'payment',
  description: 'Payment processing with Stripe, subscriptions, invoices, and webhooks',
  assets: {
    pages: [
      { path: '/checkout', name: 'Checkout', type: 'auth', sections: ['checkout-form', 'order-summary', 'payment'] },
      { path: '/account/billing', name: 'Billing', type: 'dashboard', sections: ['plan-details', 'payment-method', 'invoices'] },
    ],
    crud: [
      {
        entity: 'Invoice',
        operations: ['read', 'list', 'export'],
        validation: [],
      },
      {
        entity: 'PaymentMethod',
        operations: ['create', 'read', 'update', 'delete'],
        validation: [
          { field: 'stripePaymentMethodId', rule: 'required', message: 'Payment method ID required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/checkout', description: 'Create Stripe checkout session', auth: true },
      { method: 'POST', path: '/api/subscription', description: 'Create/update subscription', auth: true },
      { method: 'DELETE', path: '/api/subscription', description: 'Cancel subscription', auth: true },
      { method: 'GET', path: '/api/invoices', description: 'List invoices', auth: true },
      { method: 'POST', path: '/api/webhooks/stripe', description: 'Stripe webhook handler', auth: false },
    ],
    forms: [
      {
        entity: 'Checkout',
        fields: [
          { name: 'email', type: 'string', required: true, indexed: false, unique: false },
          { name: 'plan', type: 'string', required: true, indexed: false, unique: false },
        ],
        submitAction: '/api/checkout',
        validation: [
          { field: 'email', rule: 'required' },
          { field: 'plan', rule: 'required' },
        ],
      },
    ],
    validation: [
      { field: 'email', rule: 'required', message: 'Email is required' },
      { field: 'plan', rule: 'required', message: 'Plan selection is required' },
    ],
    dashboard: [
      { type: 'stat', title: 'MRR', dataEntity: 'Invoice', size: 'sm' },
      { type: 'stat', title: 'Active Subscriptions', dataEntity: 'PaymentMethod', size: 'sm' },
      { type: 'chart', title: 'Revenue Trend', dataEntity: 'Invoice', size: 'lg' },
      { type: 'table', title: 'Recent Invoices', dataEntity: 'Invoice', size: 'full' },
    ],
    reports: [
      { name: 'Revenue Report', entities: ['Invoice'], metrics: ['total', 'count', 'average'], filters: [], groupBy: ['created_at'] },
    ],
    components: ['comp.form.checkout', 'comp.billing.plan-card', 'comp.billing.invoice-list'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'invoices',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'stripe_invoice_id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'amount', type: 'number', required: true, indexed: false, unique: false },
            { name: 'status', type: 'string', required: true, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['stripe_invoice_id'], unique: true }, { columns: ['user_id'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Checkout Flow', type: 'e2e' },
      { name: 'Webhook Handling', type: 'integration' },
      { name: 'Subscription Management', type: 'e2e' },
    ],
    verification: [
      { check: 'stripe-integration', description: 'Stripe checkout and webhooks configured correctly' },
      { check: 'invoice-generation', description: 'Invoices created after successful payment' },
      { check: 'subscription-lifecycle', description: 'Create, upgrade, downgrade, cancel all work' },
    ],
    generationRules: [
      { id: 'rule.payment.stripe', params: { currency: 'usd', interval: 'month' } },
      { id: 'rule.payment.webhook', params: { events: ['checkout.session.completed', 'invoice.paid', 'customer.subscription.deleted'] } },
    ],
  },
};

export const CAP_NOTIFICATION: SkillPack = {
  id: 'cap.notification',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'notification',
  description: 'Email, push, and in-app notifications with templates and scheduling',
  assets: {
    pages: [
      { path: '/account/notifications', name: 'Notification Preferences', type: 'dashboard', sections: ['preferences', 'history', 'settings'] },
    ],
    crud: [
      {
        entity: 'Notification',
        operations: ['create', 'read', 'list', 'update'],
        validation: [
          { field: 'userId', rule: 'required', message: 'User ID is required' },
          { field: 'type', rule: 'required', message: 'Notification type is required' },
        ],
      },
      {
        entity: 'NotificationTemplate',
        operations: ['create', 'read', 'update', 'delete', 'list'],
        validation: [
          { field: 'name', rule: 'required', message: 'Template name is required' },
          { field: 'subject', rule: 'required', message: 'Subject is required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/notifications/send', description: 'Send notification', auth: true },
      { method: 'GET', path: '/api/notifications', description: 'List notifications', auth: true },
      { method: 'PUT', path: '/api/notifications/:id/read', description: 'Mark as read', auth: true },
      { method: 'GET', path: '/api/notifications/preferences', description: 'Get preferences', auth: true },
      { method: 'PUT', path: '/api/notifications/preferences', description: 'Update preferences', auth: true },
    ],
    forms: [
      {
        entity: 'NotificationPreferences',
        fields: [
          { name: 'emailEnabled', type: 'boolean', required: false, indexed: false, unique: false },
          { name: 'pushEnabled', type: 'boolean', required: false, indexed: false, unique: false },
          { name: 'marketingOptIn', type: 'boolean', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/notifications/preferences',
        validation: [],
      },
    ],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Sent Today', dataEntity: 'Notification', size: 'sm' },
      { type: 'stat', title: 'Open Rate', dataEntity: 'Notification', size: 'sm' },
      { type: 'chart', title: 'Notification Volume', dataEntity: 'Notification', size: 'lg' },
    ],
    reports: [
      { name: 'Notification Performance', entities: ['Notification'], metrics: ['sent', 'opened', 'clicked'], filters: [], groupBy: ['type', 'created_at'] },
    ],
    components: ['comp.notification.bell', 'comp.notification.list', 'comp.notification.preferences'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'notifications',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'subject', type: 'string', required: true, indexed: false, unique: false },
            { name: 'body', type: 'string', required: true, indexed: false, unique: false },
            { name: 'read', type: 'boolean', required: true, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['user_id'], unique: false }, { columns: ['type'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Send Email', type: 'integration' },
      { name: 'Notification Preferences', type: 'e2e' },
    ],
    verification: [
      { check: 'email-delivery', description: 'Emails sent via Resend/SendGrid successfully' },
      { check: 'preference-respect', description: 'User preferences respected when sending' },
    ],
    generationRules: [
      { id: 'rule.notification.channels', params: { default: 'email', channels: ['email', 'push', 'in-app'] } },
    ],
  },
};

export const CAP_COMPLIANCE: SkillPack = {
  id: 'cap.compliance',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'compliance',
  description: 'GDPR, CCPA, HIPAA compliance with consent management and data export',
  assets: {
    pages: [
      { path: '/privacy', name: 'Privacy Policy', type: 'page', sections: ['policy-content', 'last-updated'] },
      { path: '/terms', name: 'Terms of Service', type: 'page', sections: ['terms-content', 'last-updated'] },
      { path: '/account/privacy', name: 'Privacy Settings', type: 'dashboard', sections: ['consent', 'data-export', 'deletion'] },
    ],
    crud: [
      {
        entity: 'Consent',
        operations: ['create', 'read', 'update'],
        validation: [
          { field: 'userId', rule: 'required', message: 'User ID is required' },
          { field: 'type', rule: 'required', message: 'Consent type is required' },
          { field: 'granted', rule: 'required', message: 'Grant status is required' },
        ],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/privacy/consent', description: 'Get consent status', auth: true },
      { method: 'POST', path: '/api/privacy/consent', description: 'Update consent', auth: true },
      { method: 'GET', path: '/api/privacy/export', description: 'Export user data (GDPR)', auth: true },
      { method: 'DELETE', path: '/api/privacy/account', description: 'Delete account (GDPR)', auth: true },
    ],
    forms: [
      {
        entity: 'Consent',
        fields: [
          { name: 'marketing', type: 'boolean', required: false, indexed: false, unique: false },
          { name: 'analytics', type: 'boolean', required: false, indexed: false, unique: false },
          { name: 'thirdParty', type: 'boolean', required: false, indexed: false, unique: false },
        ],
        submitAction: '/api/privacy/consent',
        validation: [],
      },
    ],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Consent Rate', dataEntity: 'Consent', size: 'sm' },
      { type: 'stat', title: 'Data Requests', dataEntity: 'Consent', size: 'sm' },
    ],
    reports: [
      { name: 'Compliance Status', entities: ['Consent'], metrics: ['granted', 'denied', 'pending'], filters: [], groupBy: ['type'] },
    ],
    components: ['comp.privacy.consent-banner', 'comp.privacy.data-export', 'comp.privacy.account-deletion'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'consents',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'type', type: 'string', required: true, indexed: true, unique: false },
            { name: 'granted', type: 'boolean', required: true, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [{ columns: ['user_id'], unique: false }, { columns: ['type'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Consent Flow', type: 'e2e' },
      { name: 'Data Export', type: 'integration' },
      { name: 'Account Deletion', type: 'integration' },
    ],
    verification: [
      { check: 'consent-required', description: 'Consent collected before data processing' },
      { check: 'data-export-complete', description: 'All user data exported in JSON format' },
      { check: 'account-deletion-complete', description: 'All user data deleted on request' },
    ],
    generationRules: [
      { id: 'rule.compliance.gdpr', params: { consentBeforeCollect: true, rightToErasure: true, dataPortability: true } },
    ],
  },
};

export const CAP_ANALYTICS: SkillPack = {
  id: 'cap.analytics',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'analytics',
  description: 'Analytics dashboard with charts, funnels, cohort analysis, and custom reports',
  assets: {
    pages: [
      { path: '/analytics', name: 'Analytics', type: 'dashboard', sections: ['overview-charts', 'funnels', 'cohort', 'custom-reports'] },
    ],
    crud: [
      {
        entity: 'Event',
        operations: ['create', 'read', 'list'],
        validation: [
          { field: 'event', rule: 'required', message: 'Event name is required' },
          { field: 'userId', rule: 'required', message: 'User ID is required' },
        ],
      },
    ],
    apis: [
      { method: 'POST', path: '/api/analytics/track', description: 'Track event', auth: false },
      { method: 'GET', path: '/api/analytics/events', description: 'List events', auth: true },
      { method: 'GET', path: '/api/analytics/funnels', description: 'Get funnel data', auth: true },
      { method: 'GET', path: '/api/analytics/cohorts', description: 'Get cohort data', auth: true },
      { method: 'GET', path: '/api/analytics/dashboard', description: 'Dashboard summary', auth: true },
    ],
    forms: [],
    validation: [],
    dashboard: [
      { type: 'stat', title: 'Page Views', dataEntity: 'Event', size: 'sm' },
      { type: 'stat', title: 'Unique Visitors', dataEntity: 'Event', size: 'sm' },
      { type: 'stat', title: 'Conversion Rate', dataEntity: 'Event', size: 'sm' },
      { type: 'chart', title: 'Traffic Trend', dataEntity: 'Event', size: 'lg' },
      { type: 'chart', title: 'Top Pages', dataEntity: 'Event', size: 'md' },
      { type: 'table', title: 'Recent Events', dataEntity: 'Event', size: 'full' },
    ],
    reports: [
      { name: 'Daily Active Users', entities: ['Event'], metrics: ['unique_users', 'sessions', 'page_views'], filters: [], groupBy: ['date'] },
      { name: 'Conversion Funnel', entities: ['Event'], metrics: ['step1', 'step2', 'step3', 'conversion_rate'], filters: [], groupBy: [] },
    ],
    components: ['comp.analytics.chart', 'comp.analytics.funnel', 'comp.analytics.cohort-table', 'comp.analytics.date-range'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'events',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'event', type: 'string', required: true, indexed: true, unique: false },
            { name: 'user_id', type: 'string', required: true, indexed: true, unique: false },
            { name: 'properties', type: 'string', required: false, indexed: false, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: true, unique: false },
          ],
          indexes: [{ columns: ['event'], unique: false }, { columns: ['user_id'], unique: false }, { columns: ['created_at'], unique: false }],
        },
      ],
    },
    tests: [
      { name: 'Event Tracking', type: 'integration' },
      { name: 'Dashboard Load', type: 'e2e' },
    ],
    verification: [
      { check: 'events-stored', description: 'Events stored with correct properties' },
      { check: 'dashboard-loads', description: 'Analytics dashboard loads with charts' },
    ],
    generationRules: [
      { id: 'rule.analytics.retention', params: { days: 90 } },
      { id: 'rule.analytics.charts', params: { types: ['line', 'bar', 'funnel', 'pie'] } },
    ],
  },
};
