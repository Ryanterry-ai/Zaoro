// ─── Industry Primitive Packs ──────────────────────────────────────
// One primitive pack per vertical. Composed with other dimensions at build
// time. Vocabulary and a few seed entities per vertical (additive; the
// Business Graph / patterns remain the source of fuller entity lists).

import { PrimitivePack, primitivePackId } from './types.js';

interface IndustrySeed {
  id: string;
  name: string;
  vocabulary?: Record<string, string>;
  entities?: string[];
  keywords: string[];
}

const INDUSTRY_SEEDS: IndustrySeed[] = [
  {
    id: 'saas',
    name: 'SaaS',
    vocabulary: { product: 'platform', buy: 'subscribe', cart: 'subscription', price: 'plan' },
    entities: ['Tenant', 'User', 'Subscription', 'Plan', 'Invoice'],
    keywords: ['saas', 'software', 'platform', 'subscription'],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    vocabulary: { product: 'item', buy: 'purchase', cart: 'basket', price: 'cost' },
    entities: ['Product', 'Order', 'Customer', 'Category', 'Cart'],
    keywords: ['ecommerce', 'shop', 'store', 'retail'],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    vocabulary: { product: 'service', buy: 'book', customer: 'patient', order: 'appointment' },
    entities: ['Patient', 'Appointment', 'MedicalRecord', 'Provider'],
    keywords: ['healthcare', 'clinic', 'medical', 'patient'],
  },
  {
    id: 'hospital',
    name: 'Hospital Management',
    vocabulary: { Customer: 'Patient', User: 'Staff', Product: 'Medicine', Order: 'Prescription' },
    entities: ['Patient', 'Doctor', 'Ward', 'Pharmacy', 'Billing'],
    keywords: ['hospital', 'erp', 'ward', 'opd', 'ipd'],
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    vocabulary: { product: 'dish', buy: 'order', customer: 'guest', price: 'menu_price' },
    entities: ['MenuItem', 'Order', 'Table', 'Reservation'],
    keywords: ['restaurant', 'food', 'menu', 'dining'],
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    vocabulary: { product: 'property', buy: 'inquire', customer: 'buyer', price: 'listing_price' },
    entities: ['Property', 'Listing', 'Agent', 'Inquiry'],
    keywords: ['real estate', 'property', 'listing', 'housing'],
  },
  {
    id: 'luxury',
    name: 'Luxury Retail',
    vocabulary: { product: 'timepiece', buy: 'acquire', store: 'atelier', price: 'investment' },
    entities: ['Product', 'Client', 'Appointment'],
    keywords: ['luxury', 'premium', 'boutique', 'atelier'],
  },
  {
    id: 'education',
    name: 'Education / School',
    vocabulary: { Customer: 'Student', User: 'Teacher', Product: 'Course', Order: 'Admission' },
    entities: ['Student', 'Course', 'Teacher', 'Grade', 'Fee'],
    keywords: ['school', 'education', 'lms', 'student'],
  },
  {
    id: 'logistics',
    name: 'Logistics & Fleet',
    vocabulary: { Customer: 'Client', User: 'Driver', Product: 'Shipment', Order: 'Trip' },
    entities: ['Shipment', 'Driver', 'Route', 'Warehouse'],
    keywords: ['logistics', 'fleet', 'shipping', 'delivery'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing ERP',
    vocabulary: { Customer: 'Client', User: 'Operator', Product: 'Finished Good', Order: 'Work Order' },
    entities: ['WorkOrder', 'BOM', 'Machine', 'RawMaterial'],
    keywords: ['manufacturing', 'erp', 'production', 'factory'],
  },
  {
    id: 'enterprise-erp',
    name: 'Enterprise ERP',
    vocabulary: { Customer: 'Account', User: 'Employee', Product: 'Item', Order: 'Purchase Order' },
    entities: ['Department', 'Invoice', 'Inventory', 'Vendor'],
    keywords: ['erp', 'enterprise', 'finance', 'procurement'],
  },
  {
    id: 'hrm',
    name: 'Human Resource Management',
    vocabulary: { Customer: 'Employee', User: 'HR Admin', Product: 'Position', Order: 'Leave Request' },
    entities: ['Employee', 'Payroll', 'Leave', 'Recruitment'],
    keywords: ['hr', 'hrm', 'payroll', 'workforce'],
  },
  {
    id: 'crm',
    name: 'Enterprise CRM',
    vocabulary: { Customer: 'Account', User: 'Sales Rep', Product: 'Deal', Order: 'Proposal' },
    entities: ['Lead', 'Deal', 'Account', 'Contact'],
    keywords: ['crm', 'sales', 'pipeline', 'lead'],
  },
];

export const INDUSTRY_PRIMITIVE_PACKS: PrimitivePack[] = INDUSTRY_SEEDS.map(seed => ({
  id: primitivePackId('industry', seed.id),
  dimension: 'industry',
  name: seed.name,
  description: `Industry primitive pack for ${seed.name}`,
  keywords: seed.keywords,
  vocabulary: seed.vocabulary,
  entities: seed.entities,
  providesCapabilities: seed.keywords,
  appliesTo: (ctx: { industry?: string }) =>
    !!ctx.industry && (ctx.industry === seed.id || seed.keywords.includes(ctx.industry)),
}));

export function getIndustryPrimitivePack(industry: string): PrimitivePack | undefined {
  return INDUSTRY_PRIMITIVE_PACKS.find(p => p.appliesTo?.({ industry }) || p.id === primitivePackId('industry', industry));
}
