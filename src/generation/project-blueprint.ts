import { BusinessType, ProjectBlueprint, BlueprintPage, BlueprintLayout, BlueprintComponent, BlueprintIntegration, DataModel, DesignTokens } from './types.js';
import { BusinessClassifier } from './business-classifier.js';

interface BlueprintTemplate {
  businessType: BusinessType;
  pages: BlueprintPage[];
  layouts: BlueprintLayout[];
  components: BlueprintComponent[];
  databaseModels: string[];
  integrations: BlueprintIntegration[];
}

const BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  {
    businessType: 'ecommerce',
    pages: [
      { route: '/', name: 'Home', type: 'home', components: ['Hero', 'FeaturedProducts', 'Categories', 'Testimonials', 'CTA'], dataRequirements: ['products', 'categories', 'reviews'], description: 'Landing page with featured products and categories' },
      { route: '/shop', name: 'Shop', type: 'listing', components: ['ProductGrid', 'FilterSidebar', 'SortControls', 'Pagination'], dataRequirements: ['products', 'categories'], description: 'Product listing with filters and search' },
      { route: '/product/[slug]', name: 'Product Detail', type: 'detail', components: ['ProductGallery', 'ProductInfo', 'AddToCart', 'RelatedProducts', 'Reviews'], dataRequirements: ['product', 'reviews', 'relatedProducts'], description: 'Individual product page with gallery and reviews' },
      { route: '/cart', name: 'Cart', type: 'page', components: ['CartItems', 'OrderSummary', 'CheckoutButton'], dataRequirements: ['cart', 'products'], description: 'Shopping cart page' },
      { route: '/checkout', name: 'Checkout', type: 'page', components: ['ShippingForm', 'PaymentForm', 'OrderReview'], dataRequirements: ['cart', 'user'], description: 'Checkout flow with shipping and payment' },
      { route: '/account', name: 'Account', type: 'dashboard', components: ['OrderHistory', 'ProfileForm', 'Addresses'], dataRequirements: ['user', 'orders'], description: 'Customer account dashboard' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer', 'ToastProvider'] },
      { name: 'ProductLayout', areas: ['sidebar', 'main'], components: ['FilterSidebar', 'ProductGrid'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'cartCount'], children: ['SearchBar', 'CartIcon'], file: 'components/Navbar.tsx' },
      { name: 'Footer', type: 'footer', props: ['links', 'social'], children: [], file: 'components/Footer.tsx' },
      { name: 'Hero', type: 'hero', props: ['title', 'subtitle', 'ctaText', 'ctaLink', 'image'], children: [], file: 'components/Hero.tsx' },
      { name: 'ProductCard', type: 'card', props: ['product', 'onAddToCart'], children: ['StarRating', 'PriceTag'], file: 'components/ProductCard.tsx' },
      { name: 'ProductGrid', type: 'section', props: ['products', 'columns'], children: ['ProductCard'], file: 'components/ProductGrid.tsx' },
      { name: 'CartIcon', type: 'custom', props: ['count'], children: [], file: 'components/CartIcon.tsx' },
      { name: 'FilterSidebar', type: 'layout', props: ['categories', 'priceRange', 'onFilter'], children: [], file: 'components/FilterSidebar.tsx' },
    ],
    databaseModels: ['Product', 'Category', 'Order', 'Customer', 'Cart'],
    integrations: [
      { name: 'Stripe', type: 'payment', config: { publicKey: '', secretKey: '' } },
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'NextAuth', type: 'auth', config: { providers: ['email', 'google'] } },
    ],
  },
  {
    businessType: 'saas',
    pages: [
      { route: '/', name: 'Landing', type: 'home', components: ['Hero', 'Features', 'Pricing', 'Testimonials', 'CTA'], dataRequirements: ['pricing', 'testimonials'], description: 'Marketing landing page' },
      { route: '/login', name: 'Login', type: 'auth', components: ['LoginForm', 'SocialLogin'], dataRequirements: [], description: 'User login page' },
      { route: '/signup', name: 'Signup', type: 'auth', components: ['SignupForm', 'PlanSelector'], dataRequirements: ['plans'], description: 'User registration page' },
      { route: '/dashboard', name: 'Dashboard', type: 'dashboard', components: ['StatsCards', 'ActivityFeed', 'Charts'], dataRequirements: ['user', 'stats', 'activity'], description: 'Main dashboard view' },
      { route: '/settings', name: 'Settings', type: 'dashboard', components: ['ProfileForm', 'BillingForm', 'TeamMembers'], dataRequirements: ['user', 'subscription'], description: 'Account settings' },
      { route: '/docs', name: 'Documentation', type: 'static', components: ['DocSidebar', 'DocContent', 'CodeBlock'], dataRequirements: ['docs'], description: 'Product documentation' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer'] },
      { name: 'DashboardLayout', areas: ['sidebar', 'main', 'panel'], components: ['Sidebar', 'TopBar', 'CommandPalette'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'cta'], children: [], file: 'components/Navbar.tsx' },
      { name: 'Sidebar', type: 'navigation', props: ['items', 'activeRoute'], children: [], file: 'components/Sidebar.tsx' },
      { name: 'PricingCard', type: 'card', props: ['plan', 'features', 'isSelected', 'onSelect'], children: [], file: 'components/PricingCard.tsx' },
      { name: 'StatsCard', type: 'card', props: ['label', 'value', 'trend', 'icon'], children: [], file: 'components/StatsCard.tsx' },
      { name: 'FeatureGrid', type: 'section', props: ['features'], children: ['FeatureCard'], file: 'components/FeatureGrid.tsx' },
    ],
    databaseModels: ['User', 'Workspace', 'Subscription', 'AuditLog'],
    integrations: [
      { name: 'Stripe', type: 'payment', config: { publicKey: '', secretKey: '' } },
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'NextAuth', type: 'auth', config: { providers: ['email', 'google', 'github'] } },
      { name: 'Resend', type: 'email', config: { apiKey: '' } },
    ],
  },
  {
    businessType: 'local-business',
    pages: [
      { route: '/', name: 'Home', type: 'home', components: ['Hero', 'Services', 'About', 'Testimonials', 'ContactCTA'], dataRequirements: ['services', 'testimonials'], description: 'Landing page with services overview' },
      { route: '/services', name: 'Services', type: 'listing', components: ['ServiceCards', 'PricingTable'], dataRequirements: ['services'], description: 'All services with pricing' },
      { route: '/about', name: 'About', type: 'static', components: ['TeamGrid', 'Timeline', 'Values'], dataRequirements: ['team', 'values'], description: 'About the business' },
      { route: '/contact', name: 'Contact', type: 'page', components: ['ContactForm', 'Map', 'BusinessHours'], dataRequirements: ['location'], description: 'Contact page with map' },
      { route: '/booking', name: 'Booking', type: 'page', components: ['BookingCalendar', 'ServiceSelect', 'TimeSlots'], dataRequirements: ['services', 'availability'], description: 'Online booking page' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer', 'WhatsAppButton'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'phone'], children: [], file: 'components/Navbar.tsx' },
      { name: 'Footer', type: 'footer', props: ['links', 'address', 'hours', 'social'], children: [], file: 'components/Footer.tsx' },
      { name: 'ContactForm', type: 'form', props: ['fields', 'onSubmit'], children: [], file: 'components/ContactForm.tsx' },
      { name: 'BusinessHours', type: 'custom', props: ['hours'], children: [], file: 'components/BusinessHours.tsx' },
      { name: 'ServiceCard', type: 'card', props: ['service', 'onBook'], children: [], file: 'components/ServiceCard.tsx' },
    ],
    databaseModels: ['Service', 'Booking', 'Contact'],
    integrations: [
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'Google Maps', type: 'analytics', config: { apiKey: '' } },
      { name: 'Resend', type: 'email', config: { apiKey: '' } },
    ],
  },
  {
    businessType: 'blog',
    pages: [
      { route: '/', name: 'Home', type: 'home', components: ['FeaturedPost', 'PostGrid', 'Categories'], dataRequirements: ['posts', 'categories'], description: 'Blog homepage with featured posts' },
      { route: '/blog/[slug]', name: 'Post', type: 'detail', components: ['PostContent', 'AuthorCard', 'RelatedPosts', 'Comments'], dataRequirements: ['post', 'author', 'comments'], description: 'Individual blog post' },
      { route: '/category/[slug]', name: 'Category', type: 'listing', components: ['PostGrid', 'CategoryHeader'], dataRequirements: ['posts', 'category'], description: 'Posts filtered by category' },
      { route: '/about', name: 'About', type: 'static', components: ['AuthorBio', 'SiteMission'], dataRequirements: ['author'], description: 'About the blog' },
      { route: '/newsletter', name: 'Newsletter', type: 'page', components: ['NewsletterForm', 'Benefits'], dataRequirements: [], description: 'Newsletter signup' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'sidebar', 'footer'], components: ['Navbar', 'Footer', 'Sidebar'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'search'], children: [], file: 'components/Navbar.tsx' },
      { name: 'PostCard', type: 'card', props: ['post', 'featured'], children: ['AuthorBadge', 'DateDisplay'], file: 'components/PostCard.tsx' },
      { name: 'Sidebar', type: 'layout', props: ['categories', 'recentPosts', 'tags'], children: [], file: 'components/Sidebar.tsx' },
      { name: 'AuthorCard', type: 'card', props: ['author'], children: [], file: 'components/AuthorCard.tsx' },
      { name: 'NewsletterForm', type: 'form', props: ['onSubmit'], children: [], file: 'components/NewsletterForm.tsx' },
    ],
    databaseModels: ['Post', 'Author', 'Comment'],
    integrations: [
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'NextAuth', type: 'auth', config: { providers: ['email'] } },
    ],
  },
  {
    businessType: 'fitness',
    pages: [
      { route: '/', name: 'Home', type: 'home', components: ['Hero', 'Classes', 'Trainers', 'Membership', 'Testimonials'], dataRequirements: ['classes', 'trainers', 'memberships'], description: 'Gym landing page' },
      { route: '/classes', name: 'Classes', type: 'listing', components: ['ClassSchedule', 'ClassCard', 'FilterBar'], dataRequirements: ['classes'], description: 'Class schedule and booking' },
      { route: '/trainers', name: 'Trainers', type: 'listing', components: ['TrainerGrid', 'TrainerCard'], dataRequirements: ['trainers'], description: 'Trainer profiles' },
      { route: '/membership', name: 'Membership', type: 'page', components: ['PricingCards', 'Benefits', 'FAQ'], dataRequirements: ['memberships'], description: 'Membership plans' },
      { route: '/contact', name: 'Contact', type: 'page', components: ['ContactForm', 'Map', 'Hours'], dataRequirements: ['location'], description: 'Contact and location' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'cta'], children: [], file: 'components/Navbar.tsx' },
      { name: 'ClassSchedule', type: 'section', props: ['classes', 'selectedDay'], children: ['ClassCard'], file: 'components/ClassSchedule.tsx' },
      { name: 'TrainerCard', type: 'card', props: ['trainer'], children: [], file: 'components/TrainerCard.tsx' },
      { name: 'PricingCard', type: 'card', props: ['membership', 'isSelected', 'onSelect'], children: [], file: 'components/PricingCard.tsx' },
    ],
    databaseModels: ['FitnessClass', 'Trainer', 'Membership'],
    integrations: [
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'Stripe', type: 'payment', config: { publicKey: '', secretKey: '' } },
    ],
  },
  {
    businessType: 'restaurant',
    pages: [
      { route: '/', name: 'Home', type: 'home', components: ['Hero', 'MenuHighlights', 'Gallery', 'Reservations'], dataRequirements: ['menu', 'gallery'], description: 'Restaurant landing page' },
      { route: '/menu', name: 'Menu', type: 'listing', components: ['MenuCategories', 'MenuItem', 'DietaryFilters'], dataRequirements: ['menu', 'categories'], description: 'Full menu page' },
      { route: '/reservations', name: 'Reservations', type: 'page', components: ['ReservationForm', 'DatePicker', 'TimeSlots'], dataRequirements: ['tables', 'availability'], description: 'Table reservations' },
      { route: '/about', name: 'About', type: 'static', components: ['StorySection', 'ChefProfile', 'Gallery'], dataRequirements: ['story', 'chefs'], description: 'Restaurant story' },
      { route: '/contact', name: 'Contact', type: 'page', components: ['ContactInfo', 'Map', 'Hours'], dataRequirements: ['location'], description: 'Contact and directions' },
    ],
    layouts: [
      { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer'] },
    ],
    components: [
      { name: 'Navbar', type: 'navigation', props: ['logo', 'links', 'reservationCta'], children: [], file: 'components/Navbar.tsx' },
      { name: 'MenuItem', type: 'card', props: ['item', 'onAddToOrder'], children: ['PriceTag', 'DietaryBadge'], file: 'components/MenuItem.tsx' },
      { name: 'ReservationForm', type: 'form', props: ['onSubmit', 'availableSlots'], children: ['DatePicker', 'TimeSlotPicker'], file: 'components/ReservationForm.tsx' },
      { name: 'GalleryGrid', type: 'section', props: ['images'], children: ['GalleryItem'], file: 'components/GalleryGrid.tsx' },
    ],
    databaseModels: ['MenuItem', 'Table', 'Reservation'],
    integrations: [
      { name: 'PostgreSQL', type: 'database', config: { url: '' } },
      { name: 'Resend', type: 'email', config: { apiKey: '' } },
    ],
  },
];

export class ProjectBlueprintGenerator {
  private classifier: BusinessClassifier;

  constructor() {
    this.classifier = new BusinessClassifier();
  }

  generateFromPrompt(prompt: string, customName?: string): ProjectBlueprint {
    const classification = this.classifier.classifyFromPrompt(prompt);
    return this.generateForBusinessType(classification.type, customName || this.extractName(prompt));
  }

  generateForBusinessType(businessType: BusinessType, name: string): ProjectBlueprint {
    const template = BLUEPRINT_TEMPLATES.find((t) => t.businessType === businessType);

    if (!template) {
      return this.generateGenericBlueprint(name, `Custom ${businessType} project`);
    }

    return {
      name,
      businessType,
      description: `A ${businessType} application built with Next.js`,
      pages: template.pages.map((p) => ({ ...p })),
      layouts: template.layouts.map((l) => ({ ...l })),
      components: template.components.map((c) => ({ ...c })),
      databaseModels: [], // DataModels resolved at clone-plan level
      integrations: template.integrations.map((i) => ({ ...i })),
      designTokens: defaultDesignTokens(),
      techStack: {
        framework: 'Next.js 14',
        language: 'TypeScript',
        styling: 'Tailwind CSS',
        database: 'PostgreSQL',
        orm: 'Prisma',
      },
      generatedAt: new Date().toISOString(),
    };
  }

  generateFromAnalysis(analysis: { businessType: BusinessType; domain: string; title: string }): ProjectBlueprint {
    const blueprint = this.generateForBusinessType(analysis.businessType, analysis.domain);
    blueprint.description = `Cloned from ${analysis.domain}: ${analysis.title}`;
    return blueprint;
  }

  private generateGenericBlueprint(name: string, prompt: string): ProjectBlueprint {
    return {
      name,
      businessType: 'unknown',
      description: prompt,
      pages: [
        { route: '/', name: 'Home', type: 'home', components: ['Hero', 'Features', 'CTA'], dataRequirements: [], description: 'Landing page' },
        { route: '/about', name: 'About', type: 'static', components: ['AboutSection', 'Team'], dataRequirements: [], description: 'About page' },
        { route: '/contact', name: 'Contact', type: 'page', components: ['ContactForm'], dataRequirements: [], description: 'Contact page' },
      ],
      layouts: [
        { name: 'RootLayout', areas: ['header', 'main', 'footer'], components: ['Navbar', 'Footer'] },
      ],
      components: [
        { name: 'Navbar', type: 'navigation', props: ['logo', 'links'], children: [], file: 'components/Navbar.tsx' },
        { name: 'Footer', type: 'footer', props: ['links', 'social'], children: [], file: 'components/Footer.tsx' },
        { name: 'Hero', type: 'hero', props: ['title', 'subtitle', 'cta'], children: [], file: 'components/Hero.tsx' },
      ],
      databaseModels: [],
      integrations: [],
      designTokens: defaultDesignTokens(),
      techStack: {
        framework: 'Next.js 14',
        language: 'TypeScript',
        styling: 'Tailwind CSS',
        database: 'PostgreSQL',
        orm: 'Prisma',
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private extractName(prompt: string): string {
    const words = prompt.split(/\s+/).slice(0, 3);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }
}

function defaultDesignTokens(): DesignTokens {
  return {
    colors: {
      primary: '#6366f1',
      secondary: '#a855f7',
      background: '#0a0a0a',
      surface: '#111111',
      text: '#ffffff',
      muted: '#888888',
      border: '#222222',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f97316',
    },
    fonts: ['system-ui', '-apple-system', 'sans-serif'],
    spacing: ['0.25rem', '0.5rem', '1rem', '1.5rem', '2rem', '3rem', '4rem'],
    borderRadius: ['0.25rem', '0.5rem', '0.75rem', '1rem', '1.5rem', '9999px'],
    shadows: ['0 1px 2px rgba(0,0,0,0.1)', '0 4px 6px rgba(0,0,0,0.1)', '0 10px 15px rgba(0,0,0,0.1)'],
    breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
  };
}
