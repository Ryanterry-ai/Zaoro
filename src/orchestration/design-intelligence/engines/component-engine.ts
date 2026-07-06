// ─── Component Engine ───────────────────────────────────────────────────────
//
// Wraps 21st.dev capabilities. Handles:
//   - Component selection per industry
//   - Component variant recommendations
//   - Component composition patterns
//   - Pre-built component suggestions (21st.dev library)
// ─────────────────────────────────────────────────────────────────────────────

import type { DesignSubEngine, DesignContext, DesignRecommendation, ComponentSuggestion } from '../types.js';

// ─── Industry Component Maps ────────────────────────────────────────────────

const INDUSTRY_COMPONENTS: Record<string, ComponentSuggestion[]> = {
  'ecommerce': [
    { name: 'ProductCard', source: '21st.dev', variant: 'image-top', description: 'Product card with image, title, price, and CTA' },
    { name: 'ProductGrid', source: '21st.dev', variant: 'responsive-3col', description: 'Responsive product grid with filters' },
    { name: 'CartDrawer', source: '21st.dev', variant: 'slide-right', description: 'Slide-in cart drawer' },
    { name: 'CheckoutForm', source: '21st.dev', variant: 'multi-step', description: 'Multi-step checkout' },
    { name: 'SearchBar', source: '21st.dev', variant: 'autocomplete', description: 'Search with autocomplete' },
    { name: 'CategoryFilter', source: '21st.dev', variant: 'sidebar', description: 'Sidebar category filter' },
  ],
  'saas': [
    { name: 'DashboardCard', source: '21st.dev', variant: 'stat', description: 'Stat card with trend indicator' },
    { name: 'DataTable', source: '21st.dev', variant: 'sortable', description: 'Sortable data table with pagination' },
    { name: 'PricingTable', source: '21st.dev', variant: '3-tier', description: 'Three-tier pricing comparison' },
    { name: 'Sidebar', source: '21st.dev', variant: 'collapsible', description: 'Collapsible sidebar navigation' },
    { name: 'MetricCard', source: '21st.dev', variant: 'chart', description: 'Metric with sparkline chart' },
    { name: 'EmptyState', source: '21st.dev', variant: 'illustration', description: 'Illustrated empty state' },
  ],
  'fintech': [
    { name: 'AccountCard', source: '21st.dev', variant: 'balance', description: 'Account card with balance display' },
    { name: 'TransactionList', source: '21st.dev', variant: 'grouped', description: 'Grouped transaction history' },
    { name: 'KycStatus', source: '21st.dev', variant: 'progress', description: 'KYC verification progress' },
    { name: 'StatCard', source: '21st.dev', variant: 'finance', description: 'Financial metric card' },
    { name: 'TransferForm', source: '21st.dev', variant: 'amount-input', description: 'Amount input with currency' },
  ],
  'healthcare': [
    { name: 'AppointmentCard', source: '21st.dev', variant: 'datetime', description: 'Appointment with date/time' },
    { name: 'PatientCard', source: '21st.dev', variant: 'avatar-info', description: 'Patient info card' },
    { name: 'DoctorCard', source: '21st.dev', variant: 'specialty', description: 'Doctor with specialty badge' },
    { name: 'CalendarView', source: '21st.dev', variant: 'week', description: 'Weekly calendar view' },
    { name: 'StatusBadge', source: '21st.dev', variant: 'health', description: 'Health status indicator' },
  ],
  'education': [
    { name: 'CourseCard', source: '21st.dev', variant: 'thumbnail', description: 'Course card with thumbnail' },
    { name: 'ProgressRing', source: '21st.dev', variant: 'circular', description: 'Circular progress indicator' },
    { name: 'LessonList', source: '21st.dev', variant: 'numbered', description: 'Numbered lesson list' },
    { name: 'GradeCard', source: '21st.dev', variant: 'score', description: 'Grade/score display' },
  ],
  'restaurant': [
    { name: 'MenuCard', source: '21st.dev', variant: 'image-left', description: 'Menu item with image' },
    { name: 'MenuCategory', source: '21st.dev', variant: 'tabs', description: 'Tabbed menu categories' },
    { name: 'ReservationForm', source: '21st.dev', variant: 'datetime-picker', description: 'Date/time reservation' },
    { name: 'CartSummary', source: '21st.dev', variant: 'order', description: 'Order summary card' },
  ],
  'fitness': [
    { name: 'ClassCard', source: '21st.dev', variant: 'schedule', description: 'Class with schedule info' },
    { name: 'BookingSlot', source: '21st.dev', variant: 'time-slot', description: 'Time slot selector' },
    { name: 'MembershipCard', source: '21st.dev', variant: 'plan', description: 'Membership plan card' },
    { name: 'WorkoutTracker', source: '21st.dev', variant: 'progress', description: 'Workout progress tracker' },
  ],
  'real-estate': [
    { name: 'PropertyCard', source: '21st.dev', variant: 'image-gallery', description: 'Property with image gallery' },
    { name: 'SearchFilters', source: '21st.dev', variant: 'price-range', description: 'Price range filter' },
    { name: 'AgentCard', source: '21st.dev', variant: 'contact', description: 'Agent with contact info' },
    { name: 'MapPreview', source: '21st.dev', variant: 'static', description: 'Static map preview' },
  ],
  'media': [
    { name: 'ArticleCard', source: '21st.dev', variant: 'featured', description: 'Featured article card' },
    { name: 'AuthorBadge', source: '21st.dev', variant: 'avatar', description: 'Author with avatar' },
    { name: 'CategoryTag', source: '21st.dev', variant: 'colored', description: 'Colored category tag' },
    { name: 'NewsletterForm', source: '21st.dev', variant: 'inline', description: 'Inline newsletter signup' },
  ],
  'portfolio': [
    { name: 'ProjectCard', source: '21st.dev', variant: 'hover-reveal', description: 'Project with hover reveal' },
    { name: 'SkillBadge', source: '21st.dev', variant: 'pill', description: 'Skill pill badge' },
    { name: 'TestimonialCard', source: '21st.dev', variant: 'quote', description: 'Quote testimonial' },
    { name: 'ContactForm', source: '21st.dev', variant: 'minimal', description: 'Minimal contact form' },
  ],
  'marketplace': [
    { name: 'VendorCard', source: '21st.dev', variant: 'store-preview', description: 'Vendor store preview' },
    { name: 'ProductCard', source: '21st.dev', variant: 'marketplace', description: 'Marketplace product card' },
    { name: 'ReviewStars', source: '21st.dev', variant: 'interactive', description: 'Interactive star rating' },
    { name: 'CategoryNav', source: '21st.dev', variant: 'mega-menu', description: 'Mega menu categories' },
  ],
  'nonprofit': [
    { name: 'ImpactCard', source: '21st.dev', variant: 'stat', description: 'Impact metric card' },
    { name: 'DonationForm', source: '21st.dev', variant: 'amount-presets', description: 'Preset amount donation' },
    { name: 'CampaignCard', source: '21st.dev', variant: 'progress-bar', description: 'Campaign with progress' },
    { name: 'StoryCard', source: '21st.dev', variant: 'image-text', description: 'Impact story card' },
  ],
};

// ─── Component Engine ───────────────────────────────────────────────────────

export class ComponentEngine implements DesignSubEngine {
  readonly name = 'Component Engine';
  readonly domain = 'component' as const;

  recommend(ctx: DesignContext): DesignRecommendation[] {
    const components = INDUSTRY_COMPONENTS[ctx.industry] ?? INDUSTRY_COMPONENTS['saas']!;
    const recs: DesignRecommendation[] = [];

    // Core components
    recs.push({
      domain: 'component',
      title: 'Core Components',
      description: `${components.length} industry-specific components from 21st.dev library`,
      confidence: 0.9,
      priority: 'must',
      components,
    });

    // Base components (always needed)
    recs.push({
      domain: 'component',
      title: 'Base Components',
      description: 'Shared primitive components',
      confidence: 1.0,
      priority: 'must',
      components: [
        { name: 'Button', source: '21st.dev', variant: 'primary', description: 'Primary action button' },
        { name: 'Input', source: '21st.dev', variant: 'text', description: 'Text input field' },
        { name: 'Modal', source: '21st.dev', variant: 'dialog', description: 'Dialog modal' },
        { name: 'Toast', source: '21st.dev', variant: 'notification', description: 'Toast notification' },
        { name: 'Badge', source: '21st.dev', variant: 'status', description: 'Status badge' },
        { name: 'Avatar', source: '21st.dev', variant: 'image', description: 'Avatar image' },
        { name: 'Dropdown', source: '21st.dev', variant: 'select', description: 'Dropdown select' },
        { name: 'Tabs', source: '21st.dev', variant: 'underline', description: 'Tab navigation' },
      ],
    });

    // Layout components
    recs.push({
      domain: 'component',
      title: 'Layout Components',
      description: 'Structural layout components',
      confidence: 0.85,
      priority: 'should',
      components: [
        { name: 'Container', source: '21st.dev', variant: 'centered', description: 'Centered container' },
        { name: 'Stack', source: '21st.dev', variant: 'vertical', description: 'Vertical stack' },
        { name: 'Grid', source: '21st.dev', variant: 'responsive', description: 'Responsive grid' },
        { name: 'Separator', source: '21st.dev', variant: 'horizontal', description: 'Horizontal divider' },
      ],
    });

    return recs;
  }
}

export function createComponentEngine(): ComponentEngine {
  return new ComponentEngine();
}
