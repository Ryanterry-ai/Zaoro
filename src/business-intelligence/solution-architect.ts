/**
 * Solution Architect: Generates ApplicationBlueprint from business analysis.
 * This becomes the source of truth for code generation.
 */

import type { WorkflowGraph } from './workflow-engine.js';
import type { RevenueModel } from './revenue-engine.js';
import type { CustomerJourneyGraph } from './customer-journey.js';

export interface PageBlueprint {
  route: string;
  name: string;
  type: 'landing' | 'dashboard' | 'shop' | 'booking' | 'content' | 'auth' | 'settings' | 'profile' | 'admin';
  purpose: string;
  requiredEntities: string[];
  requiredFeatures: string[];
  userActions: string[];
  dataDisplay: string[];
}

export interface EntityBlueprint {
  name: string;
  description: string;
  fields: Array<{ name: string; type: string; required: boolean; description: string }>;
  relationships: Array<{ entity: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one'; description: string }>;
  operations: string[];
}

export interface FeatureBlueprint {
  id: string;
  name: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  complexity: 'simple' | 'moderate' | 'complex';
  implementationHint: string;
}

export interface IntegrationBlueprint {
  id: string;
  name: string;
  type: 'auth' | 'payment' | 'email' | 'sms' | 'analytics' | 'storage' | 'ai' | 'crm' | 'calendar';
  provider: string;
  purpose: string;
  priority: 'must-have' | 'should-have' | 'nice-to-have';
}

export interface DashboardBlueprint {
  id: string;
  name: string;
  type: 'admin' | 'analytics' | 'operations' | 'customer';
  metrics: string[];
  charts: string[];
  actions: string[];
}

export interface ApplicationBlueprint {
  pages: PageBlueprint[];
  entities: EntityBlueprint[];
  features: FeatureBlueprint[];
  integrations: IntegrationBlueprint[];
  dashboards: DashboardBlueprint[];
  workflows: string[];
  permissions: Array<{ role: string; access: string[] }>;
  aiFeatures: string[];
}

// ─── Solution Architect ──────────────────────────────────────────

export class SolutionArchitect {
  /**
   * Generate complete ApplicationBlueprint from business analysis.
   */
  generateBlueprint(
    prompt: string,
    capabilities: string[],
    workflows: WorkflowGraph,
    revenue: RevenueModel,
    journey: CustomerJourneyGraph
  ): ApplicationBlueprint {
    const pages = this.generatePages(prompt, capabilities, workflows, revenue, journey);
    const entities = this.generateEntities(capabilities, workflows, revenue);
    const features = this.generateFeatures(capabilities, workflows, revenue);
    const integrations = this.generateIntegrations(capabilities, revenue);
    const dashboards = this.generateDashboards(capabilities, workflows, revenue);
    const permissions = this.generatePermissions(capabilities);
    const aiFeatures = this.generateAIFeatures(capabilities);

    return {
      pages,
      entities,
      features,
      integrations,
      dashboards,
      workflows: workflows.workflows.map(w => w.name),
      permissions,
      aiFeatures,
    };
  }

  private generatePages(
    prompt: string,
    capabilities: string[],
    workflows: WorkflowGraph,
    revenue: RevenueModel,
    journey: CustomerJourneyGraph
  ): PageBlueprint[] {
    const pages: PageBlueprint[] = [];

    // Always include home page
    pages.push({
      route: '/',
      name: 'Home',
      type: 'landing',
      purpose: 'Main landing page with hero, value proposition, and CTA',
      requiredEntities: [],
      requiredFeatures: ['hero', 'stats', 'testimonials', 'cta'],
      userActions: ['navigate', 'learn_more', 'sign_up'],
      dataDisplay: ['hero_content', 'stats', 'testimonials'],
    });

    // Generate pages based on capabilities
    for (const cap of capabilities) {
      const capPages = this.getPagesForCapability(cap);
      pages.push(...capPages);
    }

    // Add pages from workflows
    for (const workflow of workflows.workflows) {
      const wfPages = this.getPagesForWorkflow(workflow.name);
      for (const wfPage of wfPages) {
        if (!pages.find(p => p.route === wfPage.route)) {
          pages.push(wfPage);
        }
      }
    }

    // Add auth pages
    pages.push({
      route: '/login',
      name: 'Login',
      type: 'auth',
      purpose: 'User authentication',
      requiredEntities: ['User'],
      requiredFeatures: ['login_form', 'social_auth'],
      userActions: ['login', 'forgot_password'],
      dataDisplay: [],
    });

    pages.push({
      route: '/signup',
      name: 'Sign Up',
      type: 'auth',
      purpose: 'User registration',
      requiredEntities: ['User'],
      requiredFeatures: ['signup_form', 'plan_selection'],
      userActions: ['signup', 'select_plan'],
      dataDisplay: [],
    });

    // Add dashboard if needed
    if (capabilities.includes('saas') || capabilities.includes('crm') || capabilities.includes('marketplace')) {
      pages.push({
        route: '/dashboard',
        name: 'Dashboard',
        type: 'dashboard',
        purpose: 'Main user dashboard with key metrics and actions',
        requiredEntities: [],
        requiredFeatures: ['metrics_cards', 'activity_feed', 'quick_actions'],
        userActions: ['view_metrics', 'manage_account'],
        dataDisplay: ['metrics', 'activity', 'notifications'],
      });
    }

    // Add admin if needed
    if (capabilities.includes('marketplace') || capabilities.includes('saas')) {
      pages.push({
        route: '/admin',
        name: 'Admin',
        type: 'admin',
        purpose: 'Administration panel',
        requiredEntities: [],
        requiredFeatures: ['user_management', 'analytics', 'settings'],
        userActions: ['manage_users', 'view_analytics'],
        dataDisplay: ['users', 'revenue', 'system_health'],
      });
    }

    return pages;
  }

  private getPagesForCapability(cap: string): PageBlueprint[] {
    const pages: PageBlueprint[] = [];

    switch (cap) {
      case 'ecommerce':
        pages.push(
          { route: '/shop', name: 'Shop', type: 'shop', purpose: 'Product catalog', requiredEntities: ['Product', 'Category'], requiredFeatures: ['product_grid', 'filters', 'search'], userActions: ['browse', 'filter', 'search'], dataDisplay: ['products', 'categories'] },
          { route: '/cart', name: 'Cart', type: 'shop', purpose: 'Shopping cart', requiredEntities: ['Cart', 'CartItem'], requiredFeatures: ['cart_list', 'quantity_controls', 'checkout_button'], userActions: ['edit_cart', 'checkout'], dataDisplay: ['cart_items', 'total'] },
          { route: '/checkout', name: 'Checkout', type: 'shop', purpose: 'Checkout process', requiredEntities: ['Order', 'Payment'], requiredFeatures: ['checkout_form', 'payment', 'order_summary'], userActions: ['enter_shipping', 'pay'], dataDisplay: ['order_summary'] },
        );
        break;
      case 'booking':
        pages.push(
          { route: '/services', name: 'Services', type: 'content', purpose: 'Service catalog', requiredEntities: ['Service'], requiredFeatures: ['service_list', 'pricing'], userActions: ['browse_services', 'select'], dataDisplay: ['services', 'pricing'] },
          { route: '/book', name: 'Book', type: 'booking', purpose: 'Booking interface', requiredEntities: ['Appointment', 'TimeSlot'], requiredFeatures: ['calendar', 'time_slots', 'booking_form'], userActions: ['select_time', 'confirm'], dataDisplay: ['availability', 'booking_form'] },
          { route: '/appointments', name: 'My Appointments', type: 'profile', purpose: 'User appointments', requiredEntities: ['Appointment'], requiredFeatures: ['appointment_list', 'cancel_reschedule'], userActions: ['view_appointments', 'manage'], dataDisplay: ['appointments'] },
        );
        break;
      case 'membership':
        pages.push(
          { route: '/plans', name: 'Plans', type: 'landing', purpose: 'Membership plans', requiredEntities: ['Plan', 'Membership'], requiredFeatures: ['pricing_cards', 'comparison'], userActions: ['compare_plans', 'select'], dataDisplay: ['plans', 'pricing'] },
          { route: '/membership', name: 'My Membership', type: 'profile', purpose: 'Membership management', requiredEntities: ['Membership'], requiredFeatures: ['membership_status', 'billing'], userActions: ['manage_membership', 'upgrade'], dataDisplay: ['membership_details'] },
        );
        break;
      case 'education':
        pages.push(
          { route: '/courses', name: 'Courses', type: 'content', purpose: 'Course catalog', requiredEntities: ['Course'], requiredFeatures: ['course_grid', 'filters', 'search'], userActions: ['browse_courses', 'enroll'], dataDisplay: ['courses', 'categories'] },
          { route: '/course/:id', name: 'Course Detail', type: 'content', purpose: 'Course details', requiredEntities: ['Course', 'Lesson'], requiredFeatures: ['course_content', 'enrollment'], userActions: ['view_content', 'enroll'], dataDisplay: ['course_details', 'curriculum'] },
          { route: '/my-courses', name: 'My Courses', type: 'profile', purpose: 'User courses', requiredEntities: ['Enrollment', 'Progress'], requiredFeatures: ['course_list', 'progress'], userActions: ['continue_learning', 'track_progress'], dataDisplay: ['enrolled_courses', 'progress'] },
        );
        break;
      case 'crm':
        pages.push(
          { route: '/leads', name: 'Leads', type: 'dashboard', purpose: 'Lead management', requiredEntities: ['Lead'], requiredFeatures: ['lead_list', 'lead_detail', 'actions'], userActions: ['view_leads', 'update_status'], dataDisplay: ['leads', 'pipeline'] },
          { route: '/pipeline', name: 'Pipeline', type: 'dashboard', purpose: 'Sales pipeline', requiredEntities: ['Deal', 'Pipeline'], requiredFeatures: ['kanban_board', 'deal_detail'], userActions: ['manage_deals', 'move_stage'], dataDisplay: ['deals', 'pipeline_stages'] },
        );
        break;
      case 'marketplace':
        pages.push(
          { route: '/marketplace', name: 'Marketplace', type: 'shop', purpose: 'Marketplace listing', requiredEntities: ['Listing', 'Vendor'], requiredFeatures: ['listing_grid', 'filters', 'search'], userActions: ['browse', 'filter', 'search'], dataDisplay: ['listings', 'vendors'] },
          { route: '/vendor/:id', name: 'Vendor', type: 'content', purpose: 'Vendor profile', requiredEntities: ['Vendor', 'Listing'], requiredFeatures: ['vendor_profile', 'listings'], userActions: ['view_vendor', 'browse_listings'], dataDisplay: ['vendor_info', 'listings'] },
        );
        break;
      case 'real_estate':
        pages.push(
          { route: '/properties', name: 'Properties', type: 'shop', purpose: 'Property listings', requiredEntities: ['Property', 'Listing'], requiredFeatures: ['property_grid', 'filters', 'map'], userActions: ['browse', 'filter', 'view_details'], dataDisplay: ['properties', 'maps'] },
          { route: '/property/:id', name: 'Property Detail', type: 'content', purpose: 'Property details', requiredEntities: ['Property'], requiredFeatures: ['gallery', 'details', 'contact_form'], userActions: ['view_details', 'schedule_viewing'], dataDisplay: ['property_details', 'gallery'] },
        );
        break;
      case 'restaurant':
        pages.push(
          { route: '/menu', name: 'Menu', type: 'content', purpose: 'Restaurant menu', requiredEntities: ['MenuItem', 'Category'], requiredFeatures: ['menu_grid', 'categories', 'dietary_filters'], userActions: ['browse_menu', 'filter'], dataDisplay: ['menu_items', 'categories'] },
          { route: '/order', name: 'Order', type: 'shop', purpose: 'Order interface', requiredEntities: ['Order', 'OrderItem'], requiredFeatures: ['cart', 'checkout', 'delivery_options'], userActions: ['add_to_cart', 'checkout'], dataDisplay: ['cart', 'order_summary'] },
        );
        break;
      case 'services':
        pages.push(
          { route: '/services', name: 'Services', type: 'content', purpose: 'Service offerings', requiredEntities: ['Service'], requiredFeatures: ['service_list', 'pricing'], userActions: ['browse_services', 'request_quote'], dataDisplay: ['services', 'pricing'] },
          { route: '/portfolio', name: 'Portfolio', type: 'content', purpose: 'Past work showcase', requiredEntities: ['Project', 'CaseStudy'], requiredFeatures: ['project_grid', 'case_study_detail'], userActions: ['view_work', 'contact'], dataDisplay: ['projects', 'case_studies'] },
        );
        break;
    }

    return pages;
  }

  private getPagesForWorkflow(workflowName: string): PageBlueprint[] {
    const pages: PageBlueprint[] = [];

    if (workflowName.toLowerCase().includes('content') || workflowName.toLowerCase().includes('publish')) {
      pages.push({
        route: '/blog',
        name: 'Blog',
        type: 'content',
        purpose: 'Content publishing',
        requiredEntities: ['Article', 'Author'],
        requiredFeatures: ['article_list', 'article_detail', 'categories'],
        userActions: ['read', 'comment', 'share'],
        dataDisplay: ['articles', 'categories'],
      });
    }

    return pages;
  }

  private generateEntities(capabilities: string[], workflows: WorkflowGraph, revenue: RevenueModel): EntityBlueprint[] {
    const entities: EntityBlueprint[] = [];

    // User entity always needed
    entities.push({
      name: 'User',
      description: 'System user',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
        { name: 'email', type: 'string', required: true, description: 'User email' },
        { name: 'name', type: 'string', required: true, description: 'User name' },
        { name: 'role', type: 'string', required: true, description: 'User role' },
        { name: 'createdAt', type: 'datetime', required: true, description: 'Creation date' },
      ],
      relationships: [],
      operations: ['create', 'read', 'update', 'delete'],
    });

    // Generate entities from workflows
    for (const entityName of workflows.allEntities) {
      if (entityName === 'User') continue;

      const entity = this.generateEntity(entityName, capabilities);
      entities.push(entity);
    }

    return entities;
  }

  private generateEntity(name: string, capabilities: string[]): EntityBlueprint {
    const baseFields = [
      { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
      { name: 'createdAt', type: 'datetime', required: true, description: 'Creation date' },
      { name: 'updatedAt', type: 'datetime', required: true, description: 'Last update' },
    ];

    const specificFields = this.getFieldsForEntity(name, capabilities);

    return {
      name,
      description: `${name} entity`,
      fields: [...baseFields, ...specificFields],
      relationships: this.getRelationshipsForEntity(name),
      operations: ['create', 'read', 'update', 'delete'],
    };
  }

  private getFieldsForEntity(name: string, capabilities: string[]): Array<{ name: string; type: string; required: boolean; description: string }> {
    const fields: Array<{ name: string; type: string; required: boolean; description: string }> = [];

    switch (name) {
      case 'Product':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Product name' },
          { name: 'description', type: 'string', required: false, description: 'Product description' },
          { name: 'price', type: 'decimal', required: true, description: 'Product price' },
          { name: 'imageUrl', type: 'string', required: false, description: 'Product image' },
          { name: 'category', type: 'string', required: false, description: 'Product category' },
          { name: 'inStock', type: 'boolean', required: true, description: 'Stock status' },
        );
        break;
      case 'Order':
        fields.push(
          { name: 'userId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'status', type: 'string', required: true, description: 'Order status' },
          { name: 'total', type: 'decimal', required: true, description: 'Order total' },
          { name: 'items', type: 'json', required: true, description: 'Order items' },
        );
        break;
      case 'Appointment':
        fields.push(
          { name: 'userId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'serviceId', type: 'string', required: true, description: 'Service ID' },
          { name: 'startTime', type: 'datetime', required: true, description: 'Appointment time' },
          { name: 'endTime', type: 'datetime', required: true, description: 'End time' },
          { name: 'status', type: 'string', required: true, description: 'Appointment status' },
        );
        break;
      case 'Service':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Service name' },
          { name: 'description', type: 'string', required: false, description: 'Service description' },
          { name: 'duration', type: 'integer', required: true, description: 'Duration in minutes' },
          { name: 'price', type: 'decimal', required: true, description: 'Service price' },
          { name: 'category', type: 'string', required: false, description: 'Service category' },
        );
        break;
      case 'Membership':
        fields.push(
          { name: 'userId', type: 'string', required: true, description: 'User ID' },
          { name: 'planId', type: 'string', required: true, description: 'Plan ID' },
          { name: 'status', type: 'string', required: true, description: 'Membership status' },
          { name: 'startDate', type: 'datetime', required: true, description: 'Start date' },
          { name: 'endDate', type: 'datetime', required: false, description: 'End date' },
        );
        break;
      case 'Plan':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Plan name' },
          { name: 'price', type: 'decimal', required: true, description: 'Plan price' },
          { name: 'interval', type: 'string', required: true, description: 'Billing interval' },
          { name: 'features', type: 'json', required: true, description: 'Plan features' },
        );
        break;
      case 'Course':
        fields.push(
          { name: 'title', type: 'string', required: true, description: 'Course title' },
          { name: 'description', type: 'string', required: false, description: 'Course description' },
          { name: 'price', type: 'decimal', required: true, description: 'Course price' },
          { name: 'instructor', type: 'string', required: true, description: 'Instructor name' },
          { name: 'duration', type: 'string', required: false, description: 'Course duration' },
        );
        break;
      case 'Lead':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Lead name' },
          { name: 'email', type: 'string', required: true, description: 'Lead email' },
          { name: 'phone', type: 'string', required: false, description: 'Lead phone' },
          { name: 'source', type: 'string', required: false, description: 'Lead source' },
          { name: 'status', type: 'string', required: true, description: 'Lead status' },
        );
        break;
      case 'Deal':
        fields.push(
          { name: 'leadId', type: 'string', required: true, description: 'Lead ID' },
          { name: 'value', type: 'decimal', required: true, description: 'Deal value' },
          { name: 'stage', type: 'string', required: true, description: 'Deal stage' },
          { name: 'closeDate', type: 'datetime', required: false, description: 'Expected close date' },
        );
        break;
      case 'Property':
        fields.push(
          { name: 'title', type: 'string', required: true, description: 'Property title' },
          { name: 'description', type: 'string', required: false, description: 'Property description' },
          { name: 'price', type: 'decimal', required: true, description: 'Property price' },
          { name: 'address', type: 'string', required: true, description: 'Property address' },
          { name: 'bedrooms', type: 'integer', required: false, description: 'Number of bedrooms' },
          { name: 'bathrooms', type: 'integer', required: false, description: 'Number of bathrooms' },
          { name: 'sqft', type: 'integer', required: false, description: 'Square footage' },
        );
        break;
      case 'MenuItem':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Menu item name' },
          { name: 'description', type: 'string', required: false, description: 'Item description' },
          { name: 'price', type: 'decimal', required: true, description: 'Item price' },
          { name: 'category', type: 'string', required: false, description: 'Item category' },
          { name: 'available', type: 'boolean', required: true, description: 'Availability status' },
        );
        break;
      case 'Pet':
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Pet name' },
          { name: 'species', type: 'string', required: true, description: 'Pet species' },
          { name: 'breed', type: 'string', required: false, description: 'Pet breed' },
          { name: 'age', type: 'integer', required: false, description: 'Pet age' },
          { name: 'ownerId', type: 'string', required: true, description: 'Owner ID' },
        );
        break;
      case 'Vehicle':
        fields.push(
          { name: 'make', type: 'string', required: true, description: 'Vehicle make' },
          { name: 'model', type: 'string', required: true, description: 'Vehicle model' },
          { name: 'year', type: 'integer', required: true, description: 'Vehicle year' },
          { name: 'price', type: 'decimal', required: true, description: 'Vehicle price' },
          { name: 'mileage', type: 'integer', required: false, description: 'Vehicle mileage' },
          { name: 'status', type: 'string', required: true, description: 'Vehicle status' },
        );
        break;
      default:
        fields.push(
          { name: 'name', type: 'string', required: true, description: 'Entity name' },
          { name: 'description', type: 'string', required: false, description: 'Entity description' },
        );
    }

    return fields;
  }

  private getRelationshipsForEntity(name: string): Array<{ entity: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one'; description: string }> {
    const relationships: Array<{ entity: string; type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'many-to-one'; description: string }> = [];

    switch (name) {
      case 'Order':
        relationships.push({ entity: 'User', type: 'many-to-one', description: 'Order belongs to user' });
        break;
      case 'Appointment':
        relationships.push({ entity: 'User', type: 'many-to-one', description: 'Appointment belongs to user' });
        relationships.push({ entity: 'Service', type: 'many-to-one', description: 'Appointment for service' });
        break;
      case 'Membership':
        relationships.push({ entity: 'User', type: 'many-to-one', description: 'Membership belongs to user' });
        relationships.push({ entity: 'Plan', type: 'many-to-one', description: 'Membership uses plan' });
        break;
      case 'Lead':
        relationships.push({ entity: 'Deal', type: 'one-to-many', description: 'Lead can have many deals' });
        break;
      case 'Deal':
        relationships.push({ entity: 'Lead', type: 'many-to-one', description: 'Deal belongs to lead' });
        break;
      case 'Property':
        relationships.push({ entity: 'User', type: 'many-to-one', description: 'Property listed by agent' });
        break;
      case 'Pet':
        relationships.push({ entity: 'User', type: 'many-to-one', description: 'Pet belongs to owner' });
        break;
    }

    return relationships;
  }

  private generateFeatures(capabilities: string[], workflows: WorkflowGraph, revenue: RevenueModel): FeatureBlueprint[] {
    const features: FeatureBlueprint[] = [];

    // Core features
    features.push(
      { id: 'auth', name: 'Authentication', description: 'User login and registration', priority: 'must-have', complexity: 'moderate', implementationHint: 'Use NextAuth.js or custom JWT' },
      { id: 'responsive', name: 'Responsive Design', description: 'Mobile-first responsive layout', priority: 'must-have', complexity: 'simple', implementationHint: 'Use Tailwind responsive utilities' },
      { id: 'dark_mode', name: 'Dark Mode', description: 'Dark theme support', priority: 'should-have', complexity: 'simple', implementationHint: 'Use Tailwind dark mode' },
    );

    // Capability-specific features
    for (const cap of capabilities) {
      const capFeatures = this.getFeaturesForCapability(cap);
      features.push(...capFeatures);
    }

    return features;
  }

  private getFeaturesForCapability(cap: string): FeatureBlueprint[] {
    const features: FeatureBlueprint[] = [];

    switch (cap) {
      case 'ecommerce':
        features.push(
          { id: 'product_catalog', name: 'Product Catalog', description: 'Browse and search products', priority: 'must-have', complexity: 'moderate', implementationHint: 'Grid layout with filters' },
          { id: 'shopping_cart', name: 'Shopping Cart', description: 'Add/remove items, quantity controls', priority: 'must-have', complexity: 'moderate', implementationHint: 'React state or context' },
          { id: 'checkout', name: 'Checkout', description: 'Payment and order processing', priority: 'must-have', complexity: 'complex', implementationHint: 'Stripe integration' },
        );
        break;
      case 'booking':
        features.push(
          { id: 'calendar', name: 'Calendar View', description: 'Visual calendar for bookings', priority: 'must-have', complexity: 'complex', implementationHint: 'Use react-big-calendar or custom' },
          { id: 'time_slots', name: 'Time Slot Selection', description: 'Available time slot picker', priority: 'must-have', complexity: 'moderate', implementationHint: 'Dynamic slot generation' },
          { id: 'reminders', name: 'Reminders', description: 'Automated booking reminders', priority: 'should-have', complexity: 'moderate', implementationHint: 'Email/SMS integration' },
        );
        break;
      case 'membership':
        features.push(
          { id: 'pricing_cards', name: 'Pricing Cards', description: 'Plan comparison and selection', priority: 'must-have', complexity: 'simple', implementationHint: 'Card layout with features' },
          { id: 'subscription_mgmt', name: 'Subscription Management', description: 'Manage membership status', priority: 'must-have', complexity: 'moderate', implementationHint: 'Stripe Billing' },
        );
        break;
      case 'education':
        features.push(
          { id: 'course_player', name: 'Course Player', description: 'Video/content playback', priority: 'must-have', complexity: 'complex', implementationHint: 'Video embed with progress' },
          { id: 'progress_tracking', name: 'Progress Tracking', description: 'Track course completion', priority: 'must-have', complexity: 'moderate', implementationHint: 'LocalStorage or DB' },
        );
        break;
    }

    return features;
  }

  private generateIntegrations(capabilities: string[], revenue: RevenueModel): IntegrationBlueprint[] {
    const integrations: IntegrationBlueprint[] = [];

    // Auth integration
    integrations.push({
      id: 'auth',
      name: 'Authentication',
      type: 'auth',
      provider: 'NextAuth.js',
      purpose: 'User authentication and session management',
      priority: 'must-have',
    });

    // Payment integration if needed
    if (revenue.streams.length > 0) {
      integrations.push({
        id: 'payment',
        name: 'Payment Processing',
        type: 'payment',
        provider: 'Stripe',
        purpose: 'Process payments and subscriptions',
        priority: 'must-have',
      });
    }

    // Email integration
    integrations.push({
      id: 'email',
      name: 'Email Service',
      type: 'email',
      provider: 'Resend',
      purpose: 'Transactional and marketing emails',
      priority: 'should-have',
    });

    // Analytics
    integrations.push({
      id: 'analytics',
      name: 'Analytics',
      type: 'analytics',
      provider: 'PostHog',
      purpose: 'User analytics and insights',
      priority: 'should-have',
    });

    // Storage
    integrations.push({
      id: 'storage',
      name: 'File Storage',
      type: 'storage',
      provider: 'Cloudinary',
      purpose: 'Image and file storage',
      priority: 'should-have',
    });

    return integrations;
  }

  private generateDashboards(capabilities: string[], workflows: WorkflowGraph, revenue: RevenueModel): DashboardBlueprint[] {
    const dashboards: DashboardBlueprint[] = [];

    // Admin dashboard
    dashboards.push({
      id: 'admin',
      name: 'Admin Dashboard',
      type: 'admin',
      metrics: ['total_users', 'revenue', 'active_subscriptions', 'support_tickets'],
      charts: ['revenue_over_time', 'user_growth', 'conversion_rate'],
      actions: ['manage_users', 'view_reports', 'system_settings'],
    });

    // Analytics dashboard
    dashboards.push({
      id: 'analytics',
      name: 'Analytics Dashboard',
      type: 'analytics',
      metrics: ['page_views', 'unique_visitors', 'bounce_rate', 'conversion_rate'],
      charts: ['traffic_sources', 'user_flow', 'device_breakdown'],
      actions: ['export_data', 'create_report'],
    });

    return dashboards;
  }

  private generatePermissions(capabilities: string[]): Array<{ role: string; access: string[] }> {
    const permissions = [
      { role: 'guest', access: ['view_public_pages'] },
      { role: 'customer', access: ['view_public_pages', 'manage_profile', 'create_orders', 'view_own_data'] },
      { role: 'staff', access: ['view_public_pages', 'manage_profile', 'manage_orders', 'manage_content', 'view_all_data'] },
      { role: 'admin', access: ['view_public_pages', 'manage_profile', 'manage_orders', 'manage_content', 'manage_users', 'view_all_data', 'system_settings'] },
    ];

    return permissions;
  }

  private generateAIFeatures(capabilities: string[]): string[] {
    const features: string[] = [];

    if (capabilities.includes('ecommerce') || capabilities.includes('marketplace')) {
      features.push('product_recommendations', 'personalized_shopping');
    }

    if (capabilities.includes('education')) {
      features.push('adaptive_learning', 'content_recommendations');
    }

    if (capabilities.includes('services') || capabilities.includes('crm')) {
      features.push('lead_scoring', 'predictive_analytics');
    }

    features.push('chatbot_support', 'content_generation');

    return features;
  }
}
