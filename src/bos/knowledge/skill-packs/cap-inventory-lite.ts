import type { SkillPack } from '../../schemas/knowledge/skill-pack.schema.js';

export const CAP_INVENTORY_LITE: SkillPack = {
  id: 'cap.inventory-lite',
  version: '1.0.0',
  status: 'active',
  createdAt: '2025-01-01T00:00:00+00:00',
  updatedAt: '2025-01-01T00:00:00+00:00',
  evidenceRefs: [],
  kind: 'SkillPack',
  capability: 'inventory',
  description: 'Lightweight inventory management for product catalogs',
  assets: {
    pages: [
      { path: '/admin/inventory', name: 'Inventory', type: 'dashboard', sections: ['stats-cards', 'product-table', 'quick-actions'] },
    ],
    crud: [
      {
        entity: 'Product',
        operations: ['create', 'read', 'update', 'delete', 'list', 'search', 'export'],
        validation: [
          { field: 'name', rule: 'required', message: 'Name is required' },
          { field: 'price', rule: 'min:0', message: 'Price must be positive' },
          { field: 'sku', rule: 'unique', message: 'SKU must be unique' },
        ],
      },
    ],
    apis: [
      { method: 'GET', path: '/api/products', description: 'List products', auth: false },
      { method: 'POST', path: '/api/products', description: 'Create product', auth: true },
      { method: 'PUT', path: '/api/products/:id', description: 'Update product', auth: true },
      { method: 'DELETE', path: '/api/products/:id', description: 'Delete product', auth: true },
    ],
    forms: [
      {
        entity: 'Product',
        fields: [
          { name: 'name', type: 'string', required: true, indexed: false, unique: false },
          { name: 'sku', type: 'string', required: true, indexed: true, unique: true },
          { name: 'price', type: 'number', required: true, indexed: false, unique: false },
          { name: 'description', type: 'rich_text', required: false, indexed: false, unique: false },
          { name: 'image', type: 'image', required: false, indexed: false, unique: false },
          { name: 'stock', type: 'number', required: true, indexed: false, unique: false },
          { name: 'category', type: 'enum', required: false, indexed: true, unique: false, enumValues: [] },
        ],
        submitAction: '/api/products',
        validation: [
          { field: 'name', rule: 'required' },
          { field: 'price', rule: 'min:0' },
        ],
      },
    ],
    validation: [
      { field: 'name', rule: 'required', message: 'Name is required' },
      { field: 'price', rule: 'min:0', message: 'Price must be positive' },
    ],
    dashboard: [
      { type: 'stat', title: 'Total Products', dataEntity: 'Product', size: 'sm' },
      { type: 'stat', title: 'Low Stock', dataEntity: 'Product', size: 'sm' },
      { type: 'chart', title: 'Sales Trend', dataEntity: 'Order', size: 'lg' },
      { type: 'table', title: 'Recent Orders', dataEntity: 'Order', size: 'full' },
    ],
    reports: [
      { name: 'Inventory Summary', entities: ['Product'], metrics: ['count', 'total_value', 'low_stock_count'], filters: [], groupBy: [] },
    ],
    components: ['comp.table.data-grid', 'comp.form.product-editor', 'comp.stat.card'],
    database: {
      engine: 'postgresql',
      tables: [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'string', required: true, indexed: true, unique: true },
            { name: 'name', type: 'string', required: true, indexed: false, unique: false },
            { name: 'sku', type: 'string', required: true, indexed: true, unique: true },
            { name: 'price', type: 'number', required: true, indexed: false, unique: false },
            { name: 'description', type: 'rich_text', required: false, indexed: false, unique: false },
            { name: 'image', type: 'image', required: false, indexed: false, unique: false },
            { name: 'stock', type: 'number', required: true, indexed: false, unique: false },
            { name: 'category', type: 'string', required: false, indexed: true, unique: false },
            { name: 'created_at', type: 'date', required: true, indexed: false, unique: false },
            { name: 'updated_at', type: 'date', required: true, indexed: false, unique: false },
          ],
          indexes: [
            { columns: ['sku'], unique: true },
            { columns: ['category'], unique: false },
          ],
        },
      ],
    },
    tests: [
      { name: 'Product CRUD', type: 'integration', entity: 'Product' },
      { name: 'Product List', type: 'e2e' },
    ],
    verification: [
      { check: 'form-validation', description: 'All form fields validate correctly' },
      { check: 'api-response', description: 'API returns correct shapes' },
    ],
    generationRules: [
      { id: 'rule.crud.admin', params: { layout: 'admin', pagination: true } },
    ],
  },
};
