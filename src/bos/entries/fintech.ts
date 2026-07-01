import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const FintechEntry: BOSEntry = {
  id: 'fintech.banking',
  industry: 'Fintech',
  subIndustry: 'Digital Banking & Finance',
  description: 'Fintech platform with transaction management, accounts, payments, compliance, and financial analytics',
  capabilities: [
    'dashboard', 'transaction_list', 'account_overview', 'payment_form',
    'analytics_charts', 'budget_tracker', 'notification_settings',
    'statements', 'support_ticket', 'security_center', 'compliance'
  ],
  references: {
    urls: ['https://www.stripe.com', 'https://www.revolut.com', 'https://www.monzo.com'],
    selectors: {
      dashboard: '.dashboard, [class*="overview"]',
      transactionTable: '.transaction-list, [class*="txn"]',
      accountCard: '.account-card, [class*="balance"]',
      paymentForm: 'form[class*="payment"], .transfer-form',
      chart: '[class*="chart"], .analytics'
    }
  },
  vocabularyOverrides: {
    'product': 'account', 'buy': 'transfer', 'store': 'bank',
    'cart': 'payment', 'checkout': 'send', 'price': 'fee',
    'customer': 'client', 'order': 'transaction'
  },
  workflows: [
    { name: 'Transaction Processing', steps: ['Initiate payment', 'Verify', 'Process', 'Confirm', 'Receipt'], revenue_impact: 'Core revenue driver' },
    { name: 'Account Management', steps: ['Open account', 'Verify identity', 'Fund account', 'Monitor', 'Close'], revenue_impact: 'Increases deposit volume by 30%' }
  ],
  entities: ['Account', 'Transaction', 'Payment', 'User', 'Statement', 'Budget', 'SupportTicket', 'ComplianceReport'],
  revenueModel: ['transaction_fee', 'subscription', 'interest', 'interchange', 'premium_features'],
  compliance: ['PCI DSS', 'KYC', 'AML', 'GDPR', 'PSD2', 'SOX', 'Data Protection'],
  priority: 1,
  tags: ['fintech', 'finance', 'banking', 'payment', 'transaction', 'account', 'financial', 'money']
};
BOSRegistry.register(FintechEntry);
export default FintechEntry;
