export interface CapabilityNode {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  dataModels: DataModelTemplate[];
  apiEndpoints: APIEndpointTemplate[];
  pages: PageTemplate[];
  stateStores: StateStoreTemplate[];
  primitives: string[];
}

export interface DataModelTemplate {
  name: string;
  fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }>;
}

export interface APIEndpointTemplate {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

export interface PageTemplate {
  route: string;
  title: string;
  type: string;
  blocks: string[];
}

export interface StateStoreTemplate {
  name: string;
  properties: Array<{ name: string; type: string; initialValue: string }>;
  actions: Array<{ name: string; params: string; logic: string }>;
}

const CAPABILITY_REGISTRY: Record<string, CapabilityNode> = {
  commerce: {
    id: 'commerce',
    name: 'Commerce',
    description: 'Product listing, shopping cart, checkout flow',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Product',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'imageUrl', type: 'string', required: false },
        ],
      },
      {
        name: 'Order',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'userId', type: 'string', required: true },
          { name: 'totalAmount', type: 'number', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/products', method: 'GET', description: 'List all products' },
      { endpoint: '/api/products', method: 'POST', description: 'Create a product' },
      { endpoint: '/api/orders', method: 'GET', description: 'List all orders' },
      { endpoint: '/api/orders', method: 'POST', description: 'Create an order' },
    ],
    pages: [
      { route: '/shop', title: 'Product Catalog', type: 'listing', blocks: ['filter-bar', 'product-grid'] },
    ],
    stateStores: [
      {
        name: 'CartStore',
        properties: [
          { name: 'items', type: 'any[]', initialValue: '[]' },
          { name: 'total', type: 'number', initialValue: '0' },
        ],
        actions: [
          { name: 'addItem', params: 'item: any', logic: 'setItems(prev => [...prev, item]); setTotal(t => t + item.price);' },
          { name: 'clearCart', params: '', logic: 'setItems([]); setTotal(0);' },
        ],
      },
    ],
    primitives: ['ProductCard', 'FilterBar', 'PriceTag', 'CartDrawer'],
  },

  booking: {
    id: 'booking',
    name: 'Booking',
    description: 'Appointment scheduling, calendar, time slots',
    dependencies: ['scheduling', 'customer-management'],
    dataModels: [
      {
        name: 'Booking',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'clientName', type: 'string', required: true },
          { name: 'dateTime', type: 'DateTime', required: true },
          { name: 'serviceId', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
        ],
      },
      {
        name: 'Service',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'duration', type: 'number', required: true },
          { name: 'price', type: 'number', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/bookings', method: 'GET', description: 'List all bookings' },
      { endpoint: '/api/bookings', method: 'POST', description: 'Create a booking' },
      { endpoint: '/api/services', method: 'GET', description: 'List all services' },
    ],
    pages: [
      { route: '/booking', title: 'Book Appointment', type: 'booking', blocks: ['service-select', 'calendar', 'time-slots', 'booking-form'] },
    ],
    stateStores: [
      {
        name: 'BookingStore',
        properties: [
          { name: 'selectedDate', type: 'string', initialValue: '""' },
          { name: 'selectedTime', type: 'string', initialValue: '""' },
          { name: 'selectedService', type: 'string', initialValue: '""' },
        ],
        actions: [
          { name: 'setDate', params: 'date: string', logic: 'setSelectedDate(date);' },
          { name: 'setTime', params: 'time: string', logic: 'setSelectedTime(time);' },
          { name: 'setService', params: 'service: string', logic: 'setSelectedService(service);' },
        ],
      },
    ],
    primitives: ['BookingForm', 'TimeSlotPicker'],
  },

  crm: {
    id: 'crm',
    name: 'CRM',
    description: 'Contact management, sales pipeline, deal tracking',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Contact',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: false },
          { name: 'company', type: 'string', required: false },
          { name: 'status', type: 'string', required: true },
        ],
      },
      {
        name: 'Deal',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'contactId', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'value', type: 'number', required: true },
          { name: 'stage', type: 'string', required: true },
          { name: 'closeDate', type: 'DateTime', required: false },
        ],
      },
      {
        name: 'Task',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'dealId', type: 'string', required: false },
          { name: 'title', type: 'string', required: true },
          { name: 'dueDate', type: 'DateTime', required: false },
          { name: 'completed', type: 'boolean', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/contacts', method: 'GET', description: 'List all contacts' },
      { endpoint: '/api/contacts', method: 'POST', description: 'Create a contact' },
      { endpoint: '/api/deals', method: 'GET', description: 'List all deals' },
      { endpoint: '/api/deals', method: 'POST', description: 'Create a deal' },
      { endpoint: '/api/tasks', method: 'GET', description: 'List all tasks' },
      { endpoint: '/api/tasks', method: 'POST', description: 'Create a task' },
    ],
    pages: [
      { route: '/contacts', title: 'Contacts', type: 'listing', blocks: ['contact-list', 'contact-search'] },
      { route: '/deals', title: 'Deals Pipeline', type: 'dashboard', blocks: ['kanban-board', 'deal-cards'] },
    ],
    stateStores: [
      {
        name: 'CRMStore',
        properties: [
          { name: 'contacts', type: 'any[]', initialValue: '[]' },
          { name: 'deals', type: 'any[]', initialValue: '[]' },
          { name: 'selectedStage', type: 'string', initialValue: '"all"' },
        ],
        actions: [
          { name: 'addContact', params: 'contact: any', logic: 'setContacts(prev => [...prev, contact]);' },
          { name: 'addDeal', params: 'deal: any', logic: 'setDeals(prev => [...prev, deal]);' },
          { name: 'setStage', params: 'stage: string', logic: 'setSelectedStage(stage);' },
        ],
      },
    ],
    primitives: ['DataTable', 'CRMBoard', 'AnalyticsCard', 'KanbanBoard'],
  },

  subscriptions: {
    id: 'subscriptions',
    name: 'Subscriptions',
    description: 'Recurring billing, subscription tiers, plan management',
    dependencies: ['payments'],
    dataModels: [
      {
        name: 'Subscription',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'userId', type: 'string', required: true },
          { name: 'planId', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'currentPeriodEnd', type: 'DateTime', required: true },
        ],
      },
      {
        name: 'Plan',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'interval', type: 'string', required: true },
          { name: 'features', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/subscriptions', method: 'GET', description: 'List all subscriptions' },
      { endpoint: '/api/subscriptions', method: 'POST', description: 'Create a subscription' },
      { endpoint: '/api/plans', method: 'GET', description: 'List all plans' },
    ],
    pages: [
      { route: '/pricing', title: 'Pricing Plans', type: 'page', blocks: ['pricing-cards', 'feature-comparison'] },
    ],
    stateStores: [],
    primitives: ['PricingTable', 'SubscriptionSelector'],
  },

  inventory: {
    id: 'inventory',
    name: 'Inventory',
    description: 'Stock tracking, SKU management, warehouse operations',
    dependencies: ['commerce'],
    dataModels: [
      {
        name: 'InventoryItem',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'productId', type: 'string', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'sku', type: 'string', required: true },
          { name: 'location', type: 'string', required: false },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/inventory', method: 'GET', description: 'List inventory items' },
      { endpoint: '/api/inventory', method: 'POST', description: 'Update inventory' },
    ],
    pages: [
      { route: '/inventory', title: 'Inventory Management', type: 'dashboard', blocks: ['inventory-table', 'stock-alerts'] },
    ],
    stateStores: [],
    primitives: ['InventoryTable', 'DataTable'],
  },

  orders: {
    id: 'orders',
    name: 'Orders',
    description: 'Order management, fulfillment, tracking',
    dependencies: ['commerce'],
    dataModels: [
      {
        name: 'OrderItem',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'orderId', type: 'string', required: true },
          { name: 'productId', type: 'string', required: true },
          { name: 'quantity', type: 'number', required: true },
          { name: 'price', type: 'number', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/orders', method: 'GET', description: 'List all orders' },
      { endpoint: '/api/orders', method: 'POST', description: 'Create an order' },
    ],
    pages: [
      { route: '/orders', title: 'Order Management', type: 'dashboard', blocks: ['order-list', 'order-filters'] },
    ],
    stateStores: [],
    primitives: ['DataTable', 'Badge'],
  },

  'customer-management': {
    id: 'customer-management',
    name: 'Customer Management',
    description: 'User accounts, profiles, team management',
    dependencies: [],
    dataModels: [
      {
        name: 'Customer',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: false },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/customers', method: 'GET', description: 'List all customers' },
      { endpoint: '/api/customers', method: 'POST', description: 'Create a customer' },
    ],
    pages: [],
    stateStores: [],
    primitives: ['DataTable', 'UserProfile', 'Avatar'],
  },

  analytics: {
    id: 'analytics',
    name: 'Analytics',
    description: 'Dashboards, metrics, reporting',
    dependencies: [],
    dataModels: [],
    apiEndpoints: [],
    pages: [
      { route: '/dashboard', title: 'Analytics Dashboard', type: 'dashboard', blocks: ['stats-cards', 'charts', 'activity-feed'] },
    ],
    stateStores: [
      {
        name: 'DashboardStore',
        properties: [
          { name: 'stats', type: 'any', initialValue: '{}' },
          { name: 'selectedPeriod', type: 'string', initialValue: '"7d"' },
        ],
        actions: [
          { name: 'setPeriod', params: 'period: string', logic: 'setSelectedPeriod(period);' },
          { name: 'updateStats', params: 'stats: any', logic: 'setStats(stats);' },
        ],
      },
    ],
    primitives: ['AnalyticsCard', 'StatCard', 'DataTable'],
  },

  content: {
    id: 'content',
    name: 'Content',
    description: 'Blog, articles, CMS, landing pages',
    dependencies: [],
    dataModels: [
      {
        name: 'Post',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'title', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'content', type: 'string', required: true },
          { name: 'publishedAt', type: 'DateTime', required: false },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/posts', method: 'GET', description: 'List all posts' },
      { endpoint: '/api/posts', method: 'POST', description: 'Create a post' },
    ],
    pages: [
      { route: '/blog', title: 'Blog', type: 'listing', blocks: ['post-grid', 'category-filter'] },
    ],
    stateStores: [],
    primitives: ['Card', 'Badge', 'DataTable'],
  },

  payments: {
    id: 'payments',
    name: 'Payments',
    description: 'Payment processing, invoicing, billing',
    dependencies: [],
    dataModels: [
      {
        name: 'Payment',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'orderId', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/payments', method: 'GET', description: 'List all payments' },
      { endpoint: '/api/payments', method: 'POST', description: 'Create a payment' },
    ],
    pages: [],
    stateStores: [],
    primitives: ['DataTable', 'PriceTag', 'Badge'],
  },

  scheduling: {
    id: 'scheduling',
    name: 'Scheduling',
    description: 'Calendar management, availability tracking',
    dependencies: [],
    dataModels: [
      {
        name: 'ScheduleSlot',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'start', type: 'DateTime', required: true },
          { name: 'end', type: 'DateTime', required: true },
          { name: 'available', type: 'boolean', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/schedule', method: 'GET', description: 'Get available slots' },
    ],
    pages: [],
    stateStores: [],
    primitives: ['TimeSlotPicker', 'BookingForm'],
  },

  'property-management': {
    id: 'property-management',
    name: 'Property Management',
    description: 'Real estate listings, property details, agent management',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Property',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'title', type: 'string', required: true },
          { name: 'address', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'bedrooms', type: 'number', required: true },
          { name: 'bathrooms', type: 'number', required: true },
          { name: 'sqft', type: 'number', required: true },
          { name: 'status', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/properties', method: 'GET', description: 'List all properties' },
      { endpoint: '/api/properties', method: 'POST', description: 'Create a property' },
    ],
    pages: [
      { route: '/properties', title: 'Property Listings', type: 'listing', blocks: ['property-grid', 'property-filters'] },
    ],
    stateStores: [],
    primitives: ['Card', 'FilterBar', 'DataTable'],
  },

  marketplace: {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Multi-vendor platform, seller/buyer management',
    dependencies: ['commerce', 'customer-management'],
    dataModels: [
      {
        name: 'Listing',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'sellerId', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'category', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/listings', method: 'GET', description: 'List all listings' },
      { endpoint: '/api/listings', method: 'POST', description: 'Create a listing' },
    ],
    pages: [
      { route: '/marketplace', title: 'Marketplace', type: 'listing', blocks: ['listing-grid', 'category-filter', 'search'] },
    ],
    stateStores: [],
    primitives: ['Card', 'FilterBar', 'ProductCard', 'DataTable'],
  },

  education: {
    id: 'education',
    name: 'Education',
    description: 'Course management, student portal, curriculum',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Course',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'instructorId', type: 'string', required: true },
        ],
      },
      {
        name: 'Enrollment',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'studentId', type: 'string', required: true },
          { name: 'courseId', type: 'string', required: true },
          { name: 'enrolledAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/courses', method: 'GET', description: 'List all courses' },
      { endpoint: '/api/courses', method: 'POST', description: 'Create a course' },
    ],
    pages: [
      { route: '/courses', title: 'Course Catalog', type: 'listing', blocks: ['course-grid', 'course-filters'] },
    ],
    stateStores: [],
    primitives: ['Card', 'Badge', 'DataTable'],
  },

  'case-management': {
    id: 'case-management',
    name: 'Case Management',
    description: 'Legal case tracking, matter management, docket system',
    dependencies: ['crm', 'customer-management'],
    dataModels: [
      {
        name: 'Case',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'caseNumber', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'clientId', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'openDate', type: 'DateTime', required: true },
          { name: 'closeDate', type: 'DateTime', required: false },
        ],
      },
      {
        name: 'DocketEntry',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'caseId', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'dueDate', type: 'DateTime', required: false },
          { name: 'completed', type: 'boolean', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/cases', method: 'GET', description: 'List all cases' },
      { endpoint: '/api/cases', method: 'POST', description: 'Create a case' },
      { endpoint: '/api/dockets', method: 'GET', description: 'List docket entries' },
      { endpoint: '/api/dockets', method: 'POST', description: 'Create a docket entry' },
    ],
    pages: [
      { route: '/cases', title: 'Cases', type: 'listing', blocks: ['case-list', 'case-filters'] },
      { route: '/docket', title: 'Docket', type: 'dashboard', blocks: ['docket-table', 'upcoming-deadlines'] },
    ],
    stateStores: [],
    primitives: ['DataTable', 'KanbanBoard', 'Timeline', 'Badge'],
  },

  'franchise-management': {
    id: 'franchise-management',
    name: 'Franchise Management',
    description: 'Multi-location management, franchisee tracking, compliance',
    dependencies: ['analytics', 'customer-management'],
    dataModels: [
      {
        name: 'FranchiseLocation',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'address', type: 'string', required: true },
          { name: 'franchiseeId', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/locations', method: 'GET', description: 'List all locations' },
      { endpoint: '/api/locations', method: 'POST', description: 'Create a location' },
    ],
    pages: [
      { route: '/locations', title: 'Locations', type: 'listing', blocks: ['location-grid', 'location-map'] },
    ],
    stateStores: [],
    primitives: ['DataTable', 'AnalyticsCard', 'Card'],
  },

  'membership-platform': {
    id: 'membership-platform',
    name: 'Membership Platform',
    description: 'Community forums, member directories, exclusive content',
    dependencies: ['subscriptions', 'customer-management', 'content'],
    dataModels: [
      {
        name: 'Membership',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'userId', type: 'string', required: true },
          { name: 'tier', type: 'string', required: true },
          { name: 'joinedAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/memberships', method: 'GET', description: 'List all memberships' },
      { endpoint: '/api/memberships', method: 'POST', description: 'Create a membership' },
    ],
    pages: [
      { route: '/community', title: 'Community', type: 'listing', blocks: ['member-directory', 'forum-topics'] },
    ],
    stateStores: [],
    primitives: ['Card', 'Avatar', 'DataTable', 'Badge'],
  },

  'food-beverage': {
    id: 'food-beverage',
    name: 'Food & Beverage',
    description: 'Menu management, food ordering, delivery tracking',
    dependencies: ['commerce', 'orders'],
    dataModels: [
      {
        name: 'MenuItem',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'price', type: 'number', required: true },
          { name: 'category', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/menu', method: 'GET', description: 'List menu items' },
      { endpoint: '/api/menu', method: 'POST', description: 'Create a menu item' },
    ],
    pages: [
      { route: '/menu', title: 'Menu', type: 'listing', blocks: ['menu-categories', 'menu-items'] },
    ],
    stateStores: [],
    primitives: ['Card', 'FilterBar', 'ProductCard'],
  },

  'fitness-wellness': {
    id: 'fitness-wellness',
    name: 'Fitness & Wellness',
    description: 'Gym classes, trainer profiles, workout tracking',
    dependencies: ['booking', 'subscriptions', 'customer-management'],
    dataModels: [
      {
        name: 'FitnessClass',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'instructorId', type: 'string', required: true },
          { name: 'schedule', type: 'DateTime', required: true },
          { name: 'capacity', type: 'number', required: true },
        ],
      },
      {
        name: 'Trainer',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'specialty', type: 'string', required: true },
          { name: 'bio', type: 'string', required: false },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/classes', method: 'GET', description: 'List all classes' },
      { endpoint: '/api/classes', method: 'POST', description: 'Create a class' },
      { endpoint: '/api/trainers', method: 'GET', description: 'List all trainers' },
    ],
    pages: [
      { route: '/classes', title: 'Classes', type: 'listing', blocks: ['class-schedule', 'class-grid'] },
      { route: '/trainers', title: 'Trainers', type: 'listing', blocks: ['trainer-grid'] },
    ],
    stateStores: [],
    primitives: ['Card', 'Badge', 'DataTable', 'BookingForm'],
  },

  'healthcare-clinic': {
    id: 'healthcare-clinic',
    name: 'Healthcare Clinic',
    description: 'Patient management, appointments, treatment tracking',
    dependencies: ['booking', 'customer-management'],
    dataModels: [
      {
        name: 'Patient',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'email', type: 'string', required: true },
          { name: 'phone', type: 'string', required: false },
          { name: 'dateOfBirth', type: 'DateTime', required: true },
        ],
      },
      {
        name: 'Appointment',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'patientId', type: 'string', required: true },
          { name: 'doctorId', type: 'string', required: true },
          { name: 'dateTime', type: 'DateTime', required: true },
          { name: 'type', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/patients', method: 'GET', description: 'List all patients' },
      { endpoint: '/api/patients', method: 'POST', description: 'Create a patient' },
      { endpoint: '/api/appointments', method: 'GET', description: 'List all appointments' },
      { endpoint: '/api/appointments', method: 'POST', description: 'Create an appointment' },
    ],
    pages: [
      { route: '/patients', title: 'Patients', type: 'listing', blocks: ['patient-list', 'patient-search'] },
      { route: '/appointments', title: 'Appointments', type: 'listing', blocks: ['appointment-calendar', 'appointment-list'] },
    ],
    stateStores: [],
    primitives: ['DataTable', 'BookingForm', 'Calendar', 'Badge'],
  },

  catalog: {
    id: 'catalog',
    name: 'Catalog',
    description: 'Browseable product/service catalog with search and filtering',
    dependencies: [],
    dataModels: [
      {
        name: 'CatalogItem',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'category', type: 'string', required: true },
          { name: 'imageUrl', type: 'string', required: false },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/catalog', method: 'GET', description: 'List catalog items' },
      { endpoint: '/api/catalog', method: 'POST', description: 'Create a catalog item' },
    ],
    pages: [
      { route: '/catalog', title: 'Catalog', type: 'listing', blocks: ['catalog-grid', 'catalog-filters'] },
    ],
    stateStores: [],
    primitives: ['Card', 'FilterBar', 'Grid'],
  },

  'team-collaboration': {
    id: 'team-collaboration',
    name: 'Team Collaboration',
    description: 'Shared workspaces, role management, collaboration tools',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Workspace',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'ownerId', type: 'string', required: true },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/workspaces', method: 'GET', description: 'List workspaces' },
      { endpoint: '/api/workspaces', method: 'POST', description: 'Create a workspace' },
    ],
    pages: [],
    stateStores: [],
    primitives: ['Card', 'Avatar', 'DataTable'],
  },

  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'Alert system, email/SMS notifications, push notifications',
    dependencies: [],
    dataModels: [],
    apiEndpoints: [],
    pages: [],
    stateStores: [
      {
        name: 'NotificationStore',
        properties: [
          { name: 'notifications', type: 'any[]', initialValue: '[]' },
          { name: 'unreadCount', type: 'number', initialValue: '0' },
        ],
        actions: [
          { name: 'addNotification', params: 'n: any', logic: 'setNotifications(prev => [n, ...prev]); setUnreadCount(c => c + 1);' },
          { name: 'markAllRead', params: '', logic: 'setUnreadCount(0);' },
        ],
      },
    ],
    primitives: ['Toast', 'Badge'],
  },

  'user-generated-content': {
    id: 'user-generated-content',
    name: 'User Generated Content',
    description: 'Reviews, ratings, comments, feedback',
    dependencies: ['customer-management'],
    dataModels: [
      {
        name: 'Review',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'userId', type: 'string', required: true },
          { name: 'rating', type: 'number', required: true },
          { name: 'comment', type: 'string', required: false },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/reviews', method: 'GET', description: 'List reviews' },
      { endpoint: '/api/reviews', method: 'POST', description: 'Create a review' },
    ],
    pages: [],
    stateStores: [],
    primitives: ['StarRating', 'Card', 'InputField'],
  },

  'project-management': {
    id: 'project-management',
    name: 'Project Management',
    description: 'Kanban boards, task tracking, sprints, project dashboards',
    dependencies: ['team-collaboration', 'customer-management'],
    dataModels: [
      {
        name: 'Project',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'status', type: 'string', required: true },
          { name: 'ownerId', type: 'string', required: true },
          { name: 'createdAt', type: 'DateTime', required: true },
        ],
      },
      {
        name: 'Task',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'projectId', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'status', type: 'string', required: true },
          { name: 'priority', type: 'string', required: true },
          { name: 'assigneeId', type: 'string', required: false },
          { name: 'dueDate', type: 'DateTime', required: false },
          { name: 'order', type: 'number', required: true },
        ],
      },
      {
        name: 'Board',
        fields: [
          { name: 'id', type: 'string', required: true, isId: true },
          { name: 'projectId', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
          { name: 'columns', type: 'string', required: true },
        ],
      },
    ],
    apiEndpoints: [
      { endpoint: '/api/projects', method: 'GET', description: 'List all projects' },
      { endpoint: '/api/projects', method: 'POST', description: 'Create a project' },
      { endpoint: '/api/tasks', method: 'GET', description: 'List all tasks' },
      { endpoint: '/api/tasks', method: 'POST', description: 'Create a task' },
      { endpoint: '/api/tasks', method: 'PUT', description: 'Update a task' },
      { endpoint: '/api/boards', method: 'GET', description: 'List all boards' },
      { endpoint: '/api/boards', method: 'POST', description: 'Create a board' },
    ],
    pages: [
      { route: '/dashboard', title: 'Project Dashboard', type: 'dashboard', blocks: ['project-stats', 'recent-activity'] },
      { route: '/board', title: 'Kanban Board', type: 'kanban', blocks: ['kanban-columns', 'task-cards'] },
      { route: '/tasks', title: 'All Tasks', type: 'listing', blocks: ['task-filters', 'task-list'] },
    ],
    stateStores: [
      {
        name: 'ProjectStore',
        properties: [
          { name: 'projects', type: 'any[]', initialValue: '[]' },
          { name: 'selectedProject', type: 'any', initialValue: 'null' },
        ],
        actions: [
          { name: 'addProject', params: 'project: any', logic: 'setProjects(prev => [...prev, project]);' },
          { name: 'selectProject', params: 'id: string', logic: 'setSelectedProject(id);' },
        ],
      },
      {
        name: 'TaskStore',
        properties: [
          { name: 'tasks', type: 'any[]', initialValue: '[]' },
          { name: 'filter', type: 'string', initialValue: '"all"' },
        ],
        actions: [
          { name: 'addTask', params: 'task: any', logic: 'setTasks(prev => [...prev, task]);' },
          { name: 'updateTaskStatus', params: 'id: string, status: string', logic: 'setTasks(prev => prev.map(t => t.id === id ? {...t, status} : t));' },
          { name: 'reorderTask', params: 'id: string, order: number', logic: 'setTasks(prev => prev.map(t => t.id === id ? {...t, order} : t));' },
          { name: 'setFilter', params: 'filter: string', logic: 'setFilter(filter);' },
        ],
      },
    ],
    primitives: ['KanbanBoard', 'TaskCard', 'DashboardShell', 'DataTable', 'Calendar', 'ProgressBar'],
  },
};

export class CapabilityGraph {
  private nodes: Map<string, CapabilityNode>;

  constructor() {
    this.nodes = new Map();
    for (const [id, node] of Object.entries(CAPABILITY_REGISTRY)) {
      this.nodes.set(id, node);
    }
  }

  getNode(id: string): CapabilityNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): CapabilityNode[] {
    return [...this.nodes.values()];
  }

  resolve(capabilityIds: string[]): CapabilityNode[] {
    const resolved = new Set<string>();
    const queue = [...capabilityIds];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (resolved.has(id)) continue;
      if (!this.nodes.has(id)) continue;

      resolved.add(id);
      const node = this.nodes.get(id)!;
      for (const dep of node.dependencies) {
        if (!resolved.has(dep)) {
          queue.push(dep);
        }
      }
    }

    return [...resolved].map(id => this.nodes.get(id)!);
  }

  mergeDataModels(nodes: CapabilityNode[]): Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }> }> {
    const seen = new Set<string>();
    const models: Array<{ name: string; fields: Array<{ name: string; type: string; required: boolean; isId?: boolean }> }> = [];

    for (const node of nodes) {
      for (const model of node.dataModels) {
        if (!seen.has(model.name)) {
          seen.add(model.name);
          models.push({ ...model, fields: [...model.fields] });
        }
      }
    }

    return models;
  }

  mergeAPIEndpoints(nodes: CapabilityNode[]): Array<{ endpoint: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; description: string }> {
    const seen = new Set<string>();
    const endpoints: Array<{ endpoint: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; description: string }> = [];

    for (const node of nodes) {
      for (const ep of node.apiEndpoints) {
        const key = `${ep.method}:${ep.endpoint}`;
        if (!seen.has(key)) {
          seen.add(key);
          endpoints.push({ ...ep });
        }
      }
    }

    return endpoints;
  }

  mergePages(nodes: CapabilityNode[]): Array<{ route: string; title: string; type: string; blocks: string[] }> {
    const seen = new Set<string>();
    const pages: Array<{ route: string; title: string; type: string; blocks: string[] }> = [];

    for (const node of nodes) {
      for (const page of node.pages) {
        if (!seen.has(page.route)) {
          seen.add(page.route);
          pages.push({ ...page, blocks: [...page.blocks] });
        }
      }
    }

    return pages;
  }

  mergeStateStores(nodes: CapabilityNode[]): Array<{ name: string; properties: Array<{ name: string; type: string; initialValue: string }>; actions: Array<{ name: string; params: string; logic: string }> }> {
    const seen = new Set<string>();
    const stores: Array<{ name: string; properties: Array<{ name: string; type: string; initialValue: string }>; actions: Array<{ name: string; params: string; logic: string }> }> = [];

    for (const node of nodes) {
      for (const store of node.stateStores) {
        if (!seen.has(store.name)) {
          seen.add(store.name);
          stores.push({
            ...store,
            properties: [...store.properties],
            actions: [...store.actions],
          });
        }
      }
    }

    return stores;
  }

  mergePrimitives(nodes: CapabilityNode[]): string[] {
    const seen = new Set<string>();
    const primitives: string[] = [];

    for (const node of nodes) {
      for (const prim of node.primitives) {
        if (!seen.has(prim)) {
          seen.add(prim);
          primitives.push(prim);
        }
      }
    }

    return primitives;
  }
}
