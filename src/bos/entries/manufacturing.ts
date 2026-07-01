import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const ManufacturingEntry: BOSEntry = {
  id: 'manufacturing.production',
  industry: 'Manufacturing',
  subIndustry: 'Production & Manufacturing',
  description: 'Manufacturing business with production planning, inventory tracking, quality control, and supplier management',
  capabilities: [
    'dashboard', 'production_planning', 'inventory_tracking', 'quality_dashboard',
    'supplier_portal', 'purchase_orders', 'data_tables', 'reports',
    'staff_scheduling', 'equipment_tracking', 'alerts'
  ],
  references: {
    urls: ['https://www.sap.com/manufacturing', 'https://www.oracle.com/scm', 'https://www.fishbowlinventory.com'],
    selectors: {
      dashboard: '.dashboard, [class*="metrics"]',
      productionBoard: '.production-board, [class*="schedule"]',
      inventoryTable: '.inventory-grid, [class*="stock"]',
      qualityMetrics: '.quality-metrics, [class*="defect"]'
    }
  },
  vocabularyOverrides: {
    'product': 'product', 'buy': 'procure', 'store': 'factory',
    'cart': 'order', 'checkout': 'produce', 'price': 'cost',
    'customer': 'partner', 'order': 'work_order'
  },
  workflows: [
    { name: 'Production Run', steps: ['Plan batch', 'Allocate materials', 'Begin production', 'Quality check', 'Complete'], revenue_impact: 'Optimizes throughput by 25%' },
    { name: 'Supplier Management', steps: ['Identify need', 'Request quote', 'Place order', 'Receive', 'Inspect'], revenue_impact: 'Reduces material costs by 15%' }
  ],
  entities: ['Product', 'ProductionRun', 'InventoryItem', 'QualityCheck', 'Supplier', 'PurchaseOrder', 'Equipment'],
  revenueModel: ['direct_sales', 'wholesale', 'distribution', 'contract_manufacturing'],
  compliance: ['ISO 9001', 'OSHA', 'Environmental Regulations', 'Product Safety', 'Export Controls'],
  priority: 2,
  tags: ['manufacturing', 'production', 'factory', 'inventory', 'supply chain', 'quality', 'industrial']
};
BOSRegistry.register(ManufacturingEntry);
export default ManufacturingEntry;
