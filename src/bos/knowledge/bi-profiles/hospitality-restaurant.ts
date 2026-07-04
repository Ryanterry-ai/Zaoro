import type { BusinessIntelligenceProfile } from '../../schemas/knowledge/business-intelligence.schema.js';

export const HOSPITALITY_RESTAURANT_BI: BusinessIntelligenceProfile = {
  id: 'bi.hospitality.restaurant',
  version: '1.0.0',
  name: 'Restaurant',
  description: 'How a restaurant makes money: walk-ins + reservations + delivery + catering → food cost control → repeat visits through loyalty',

  revenueCycle: {
    name: 'Awareness → First Visit → Repeat Visit → Catering/Events',
    description: 'Customer discovers restaurant → first dine-in or delivery → returns regularly → books for events/catering',
    steps: [
      { name: 'Discovery', action: 'Customer finds restaurant via Google/Zomato/Instagram', conversionRate: 0.08, avgTimeToNext: '1-7 days', revenueImpact: 'high' },
      { name: 'First order/visit', action: 'Customer places first delivery order or dines in', conversionRate: 0.25, avgTimeToNext: '0-3 days', revenueImpact: 'critical' },
      { name: 'Second visit', action: 'Customer returns within 30 days', conversionRate: 0.40, avgTimeToNext: '7-30 days', revenueImpact: 'critical' },
      { name: 'Regular customer', action: 'Customer visits 2+ times per month', conversionRate: 0.30, avgTimeToNext: '30-90 days', revenueImpact: 'high' },
      { name: 'Catering inquiry', action: 'Customer inquires about catering for events', conversionRate: 0.05, avgTimeToNext: '90-365 days', revenueImpact: 'medium' },
      { name: 'Referral', action: 'Customer recommends to friends/family', conversionRate: 0.15, avgTimeToNext: '30-180 days', revenueImpact: 'high' },
    ],
    avgCycleLength: '1-3 days (delivery), 7-14 days (dine-in)',
    avgRevenuePerCustomer: '₹800-1,500 per visit',
  },

  conversionFunnel: {
    name: 'Discovery → First Order → Repeat Customer',
    stages: ['Google/Zomato Search', 'Menu Browse', 'First Order', 'Second Order', 'Regular Customer', 'Catering/Events'],
    overallConversionRate: '8-12% of searchers become regular customers',
    biggestDropOff: 'Menu browse → First order (70% bounce)',
  },

  churnSignals: [
    { name: 'No order in 30 days', detection: 'Customer hasn\'t ordered in 30 days', window: '30 days', severity: 'high' },
    { name: 'Negative review', detection: 'Customer leaves 1-2 star review', window: '7 days', severity: 'critical' },
    { name: 'Order frequency drop', detection: 'Order frequency dropped 50%+ from baseline', window: '14 days', severity: 'medium' },
    { name: 'Delivery complaint', detection: 'Late delivery or wrong item reported', window: '0 days', severity: 'high' },
    { name: 'No loyalty points usage', detection: 'Customer hasn\'t redeemed points in 60 days', window: '60 days', severity: 'low' },
  ],

  retentionAutomations: [
    { name: 'Win-back offer', trigger: 'No order in 21 days', action: 'Send 20% discount code via SMS/email', expectedImpact: 'Recovers 15% of lapsed customers' },
    { name: 'Post-order review request', trigger: '2 hours after delivery', action: 'Request review + loyalty points', expectedImpact: 'Increases review volume by 40%' },
    { name: 'Birthday reward', trigger: '3 days before customer birthday', action: 'Send free dessert coupon', expectedImpact: 'Drives 25% birthday-week orders' },
    { name: 'Order anniversary', trigger: '1 year since first order', action: 'Send loyalty bonus + special offer', expectedImpact: 'Increases repeat rate by 10%' },
    { name: 'Catering upsell', trigger: 'Customer orders 5+ times in month', action: 'Send catering menu for upcoming events', expectedImpact: 'Converts 5% to catering customers' },
  ],

  kpis: [
    { name: 'Monthly Revenue', label: 'Revenue', formula: 'Total sales from all channels', benchmark: '₹5-20L/month', unit: '₹', category: 'revenue' },
    { name: 'Average Order Value', label: 'AOV', formula: 'Total revenue / Total orders', benchmark: '₹600-1,200', unit: '₹', category: 'revenue' },
    { name: 'Order Frequency', label: 'Orders/Customer', formula: 'Total orders / Unique customers', benchmark: '2-4/month', unit: 'count', category: 'engagement' },
    { name: 'Customer Retention Rate', label: 'Retention', formula: 'Returning customers / Total customers × 100', benchmark: '30-45%', unit: '%', category: 'retention' },
    { name: 'Food Cost Percentage', label: 'Food Cost', formula: 'Food cost / Revenue × 100', benchmark: '28-35%', unit: '%', category: 'operations' },
    { name: 'Delivery Time', label: 'Avg Delivery', formula: 'Average time from order to delivery', benchmark: '25-40 minutes', unit: 'min', category: 'operations' },
    { name: 'Google Rating', label: 'Rating', formula: 'Average Google/Zomato rating', benchmark: '4.0-4.5 stars', unit: 'stars', category: 'growth' },
    { name: 'Catering Revenue', label: 'Catering', formula: 'Revenue from catering/events', benchmark: '10-20% of total', unit: '%', category: 'revenue' },
  ],

  dashboardWidgets: [
    { name: 'Revenue by Channel', type: 'chart', description: 'Dine-in vs delivery vs takeout vs catering revenue breakdown', kpis: ['Monthly Revenue', 'Catering Revenue'], priority: 'primary' },
    { name: 'Today\'s Orders', type: 'stat-card', description: 'Active orders, avg delivery time, kitchen load', kpis: ['Order Frequency', 'Delivery Time'], priority: 'primary' },
    { name: 'Menu Performance', type: 'table', description: 'Top selling items, margin analysis, inventory alerts', kpis: ['Food Cost Percentage', 'Average Order Value'], priority: 'secondary' },
    { name: 'Customer Pulse', type: 'list', description: 'Recent reviews, loyalty points usage, at-risk customers', kpis: ['Customer Retention Rate', 'Google Rating'], priority: 'secondary' },
    { name: 'Table Availability', type: 'gauge', description: 'Current vs available tables, upcoming reservations', kpis: ['Order Frequency'], priority: 'secondary' },
    { name: 'Peak Hours', type: 'chart', description: 'Order volume by hour for staffing optimization', kpis: ['Delivery Time'], priority: 'tertiary' },
  ],

  leadCaptureMechanisms: [
    { name: 'Order Now CTA', headline: 'Order Fresh, Get It Hot', fields: ['name', 'phone', 'delivery_address'], nextStep: 'Redirect to menu/ordering page', conversionRate: '15-25% of visitors' },
    { name: 'Table Reservation', headline: 'Reserve Your Table', fields: ['name', 'phone', 'date', 'time', 'party_size'], nextStep: 'Confirmation SMS + reminder', conversionRate: '30-40% of visitors' },
    { name: 'Catering Inquiry', headline: 'Cater Your Next Event', fields: ['name', 'email', 'event_type', 'guest_count', 'date'], nextStep: 'Sales call within 24 hours', conversionRate: '20-30% of inquiries' },
  ],

  morningCheck: {
    primaryMetrics: ['Today\'s orders', 'Revenue so far', 'Kitchen queue', 'Delivery time'],
    secondaryMetrics: ['Table reservations', 'Inventory levels', 'Staff on duty', 'Customer reviews'],
    alertConditions: ['Delivery time >45 min', 'Negative review posted', 'Kitchen staff shortage', 'Key ingredient out of stock'],
  },

  revenueModels: [
    { name: 'Dine-in', description: 'In-restaurant dining revenue', percentage: 45 },
    { name: 'Delivery', description: 'Online delivery orders (Zomato, Swiggy, direct)', percentage: 30 },
    { name: 'Takeout', description: 'Customer pickup orders', percentage: 10 },
    { name: 'Catering', description: 'Event and corporate catering', percentage: 10 },
    { name: 'Events', description: 'Private dining and event hosting', percentage: 5 },
  ],

  vocabulary: {
    'customer': 'guest',
    'product': 'dish',
    'buy': 'order',
    'store': 'restaurant',
    'cart': 'order',
    'checkout': 'payment',
    'price': 'menu_price',
    'order': 'reservation',
    'purchase': 'meal',
    'subscription': 'meal plan',
  },
};
