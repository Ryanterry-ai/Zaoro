import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const LogisticsEntry: BOSEntry = {
  id: 'logistics.supplychain',
  industry: 'Logistics',
  subIndustry: 'Supply Chain & Logistics',
  description: 'Logistics and supply chain platform with shipment tracking, fleet management, dispatch, and route optimization',
  capabilities: [
    'dashboard', 'shipment_tracking', 'dispatch_board', 'fleet_overview',
    'route_planner', 'driver_portal', 'data_tables', 'reports',
    'alerts', 'customer_portal', 'inventory'
  ],
  references: {
    urls: ['https://www.flexport.com', 'https://www.project44.com', 'https://www.logistimo.com'],
    selectors: {
      dashboard: '.dashboard, [class*="metrics"]',
      shipmentTable: '.shipment-list, [class*="tracking"]',
      dispatchBoard: '.dispatch, [class*="board"]',
      driverCard: '.driver-card, [class*="driver"]',
      mapSection: '.map, [class*="route"]'
    }
  },
  vocabularyOverrides: {
    'product': 'shipment', 'buy': 'ship', 'store': 'warehouse',
    'cart': 'consignment', 'checkout': 'dispatch', 'price': 'freight',
    'customer': 'shipper', 'order': 'shipment'
  },
  workflows: [
    { name: 'Shipment Processing', steps: ['Receive order', 'Pick', 'Pack', 'Dispatch', 'Deliver'], revenue_impact: 'Primary revenue driver' },
    { name: 'Route Optimization', steps: ['Collect orders', 'Plan route', 'Assign driver', 'Track', 'Complete'], revenue_impact: 'Reduces fuel costs by 20%' }
  ],
  entities: ['Shipment', 'Driver', 'Vehicle', 'Route', 'Warehouse', 'Customer', 'Dispatch', 'TrackingEvent'],
  revenueModel: ['shipping_fee', 'subscription', 'warehouse_storage', 'last_mile', 'freight_brokerage'],
  compliance: ['GDPR', 'Transport Regulations', 'Insurance', 'Hazmat', 'Customs', 'ELD Mandate'],
  priority: 2,
  tags: ['logistics', 'supply chain', 'shipping', 'delivery', 'fleet', 'warehouse', 'transport', 'dispatch']
};
BOSRegistry.register(LogisticsEntry);
export default LogisticsEntry;
