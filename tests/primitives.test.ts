import { describe, it, expect } from 'vitest';
import {
  ATOMIC_PRIMITIVES,
  getPrimitivesByCategory,
  getPrimitiveByName,
  getPrimitivesForCapabilities,
  getPrimitivesForDomain,
  buildPrimitivesCatalog,
  buildPrimitivesCatalogForCapabilities,
  type AtomicPrimitive,
} from '../src/generation/primitives.js';

describe('ATOMIC_PRIMITIVES', () => {
  it('should have at least 35 primitives defined', () => {
    expect(ATOMIC_PRIMITIVES.length).toBeGreaterThanOrEqual(35);
  });

  it('each primitive should have required fields', () => {
    for (const prim of ATOMIC_PRIMITIVES) {
      expect(prim.name).toBeTruthy();
      expect(prim.category).toBeTruthy();
      expect(prim.description).toBeTruthy();
      expect(Array.isArray(prim.props)).toBe(true);
      expect(prim.props.length).toBeGreaterThan(0);
      expect(typeof prim.tailwindVariants).toBe('object');
      expect(Object.keys(prim.tailwindVariants).length).toBeGreaterThan(0);
      expect(prim.exampleCode).toBeTruthy();
      expect(Array.isArray(prim.composeWith)).toBe(true);
    }
  });

  it('each primitive should have a valid category', () => {
    const validCategories: AtomicPrimitive['category'][] = [
      'layout', 'ui', 'input', 'navigation', 'data-display', 'feedback',
      'ecommerce', 'booking', 'content', 'media', 'dashboard', 'crm', 'kanban', 'subscription',
    ];
    for (const prim of ATOMIC_PRIMITIVES) {
      expect(validCategories).toContain(prim.category);
    }
  });

  it('should have unique primitive names', () => {
    const names = ATOMIC_PRIMITIVES.map(p => p.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it('should include Container in layout category', () => {
    const container = getPrimitiveByName('Container');
    expect(container).toBeDefined();
    expect(container!.category).toBe('layout');
    expect(container!.props).toContain('maxWidth');
  });

  it('should include Button in ui category', () => {
    const button = getPrimitiveByName('Button');
    expect(button).toBeDefined();
    expect(button!.category).toBe('ui');
    expect(button!.tailwindVariants.primary).toContain('bg-violet-600');
  });

  it('should include Hero in content category', () => {
    const hero = getPrimitiveByName('Hero');
    expect(hero).toBeDefined();
    expect(hero!.category).toBe('content');
    expect(hero!.props).toContain('title');
  });

  it('should include ProductCard in ecommerce category', () => {
    const productCard = getPrimitiveByName('ProductCard');
    expect(productCard).toBeDefined();
    expect(productCard!.category).toBe('ecommerce');
    expect(productCard!.composeWith).toContain('Button');
  });

  it('should include BookingForm in booking category', () => {
    const booking = getPrimitiveByName('BookingForm');
    expect(booking).toBeDefined();
    expect(booking!.category).toBe('booking');
  });

  it('should include DashboardShell in dashboard category', () => {
    const shell = getPrimitiveByName('DashboardShell');
    expect(shell).toBeDefined();
    expect(shell!.category).toBe('dashboard');
  });

  it('should include KanbanBoard in kanban category', () => {
    const kanban = getPrimitiveByName('KanbanBoard');
    expect(kanban).toBeDefined();
    expect(kanban!.category).toBe('kanban');
  });

  it('should include CRMBoard in crm category', () => {
    const crm = getPrimitiveByName('CRMBoard');
    expect(crm).toBeDefined();
    expect(crm!.category).toBe('crm');
  });

  it('should include SubscriptionSelector in subscription category', () => {
    const sub = getPrimitiveByName('SubscriptionSelector');
    expect(sub).toBeDefined();
    expect(sub!.category).toBe('subscription');
  });

  it('getPrimitiveByName returns undefined for unknown name', () => {
    expect(getPrimitiveByName('NonExistent')).toBeUndefined();
  });
});

describe('getPrimitivesByCategory', () => {
  it('should return layout primitives', () => {
    const layouts = getPrimitivesByCategory('layout');
    expect(layouts.length).toBeGreaterThanOrEqual(4);
    expect(layouts.every(p => p.category === 'layout')).toBe(true);
    const names = layouts.map(p => p.name);
    expect(names).toContain('Container');
    expect(names).toContain('Grid');
    expect(names).toContain('Stack');
    expect(names).toContain('Section');
  });

  it('should return ui primitives', () => {
    const ui = getPrimitivesByCategory('ui');
    expect(ui.length).toBeGreaterThanOrEqual(5);
    expect(ui.every(p => p.category === 'ui')).toBe(true);
    const names = ui.map(p => p.name);
    expect(names).toContain('Button');
    expect(names).toContain('Card');
    expect(names).toContain('Badge');
  });

  it('should return input primitives', () => {
    const inputs = getPrimitivesByCategory('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3);
    expect(inputs.every(p => p.category === 'input')).toBe(true);
  });

  it('should return navigation primitives', () => {
    const nav = getPrimitivesByCategory('navigation');
    expect(nav.length).toBeGreaterThanOrEqual(3);
    expect(nav.every(p => p.category === 'navigation')).toBe(true);
  });

  it('should return data-display primitives', () => {
    const data = getPrimitivesByCategory('data-display');
    expect(data.length).toBeGreaterThanOrEqual(3);
    expect(data.every(p => p.category === 'data-display')).toBe(true);
  });

  it('should return feedback primitives', () => {
    const feedback = getPrimitivesByCategory('feedback');
    expect(feedback.length).toBeGreaterThanOrEqual(3);
    expect(feedback.every(p => p.category === 'feedback')).toBe(true);
  });

  it('should return ecommerce primitives', () => {
    const ecommerce = getPrimitivesByCategory('ecommerce');
    expect(ecommerce.length).toBeGreaterThanOrEqual(3);
    expect(ecommerce.every(p => p.category === 'ecommerce')).toBe(true);
  });

  it('should return booking primitives', () => {
    const booking = getPrimitivesByCategory('booking');
    expect(booking.length).toBeGreaterThanOrEqual(2);
    expect(booking.every(p => p.category === 'booking')).toBe(true);
  });

  it('should return content primitives', () => {
    const content = getPrimitivesByCategory('content');
    expect(content.length).toBeGreaterThanOrEqual(4);
    expect(content.every(p => p.category === 'content')).toBe(true);
  });

  it('should return media primitives', () => {
    const media = getPrimitivesByCategory('media');
    expect(media.length).toBeGreaterThanOrEqual(1);
    expect(media.every(p => p.category === 'media')).toBe(true);
  });

  it('should return dashboard primitives', () => {
    const dashboard = getPrimitivesByCategory('dashboard');
    expect(dashboard.length).toBeGreaterThanOrEqual(3);
    expect(dashboard.every(p => p.category === 'dashboard')).toBe(true);
  });

  it('should return crm primitives', () => {
    const crm = getPrimitivesByCategory('crm');
    expect(crm.length).toBeGreaterThanOrEqual(2);
    expect(crm.every(p => p.category === 'crm')).toBe(true);
  });

  it('should return kanban primitives', () => {
    const kanban = getPrimitivesByCategory('kanban');
    expect(kanban.length).toBeGreaterThanOrEqual(2);
    expect(kanban.every(p => p.category === 'kanban')).toBe(true);
  });

  it('should return subscription primitives', () => {
    const sub = getPrimitivesByCategory('subscription');
    expect(sub.length).toBeGreaterThanOrEqual(1);
    expect(sub.every(p => p.category === 'subscription')).toBe(true);
  });
});

describe('getPrimitivesForDomain', () => {
  it('should return ecommerce primitives for ecommerce domain', () => {
    const prims = getPrimitivesForDomain('ecommerce');
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('ecommerce')).toBe(true);
    expect(categories.has('layout')).toBe(true);
    expect(categories.has('ui')).toBe(true);
  });

  it('should return saas primitives for saas domain', () => {
    const prims = getPrimitivesForDomain('saas');
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('dashboard')).toBe(true);
    expect(categories.has('content')).toBe(true);
  });

  it('should return restaurant primitives for restaurant domain', () => {
    const prims = getPrimitivesForDomain('restaurant');
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('booking')).toBe(true);
    expect(categories.has('ecommerce')).toBe(true);
  });

  it('should return fitness primitives for fitness domain', () => {
    const prims = getPrimitivesForDomain('fitness');
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('booking')).toBe(true);
    expect(categories.has('subscription')).toBe(true);
  });

  it('should return healthcare primitives for healthcare domain', () => {
    const prims = getPrimitivesForDomain('healthcare');
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('booking')).toBe(true);
    expect(categories.has('dashboard')).toBe(true);
  });

  it('should return fallback primitives for unknown domain', () => {
    const prims = getPrimitivesForDomain('unknown');
    expect(prims.length).toBeGreaterThan(0);
    const categories = new Set(prims.map(p => p.category));
    expect(categories.has('layout')).toBe(true);
    expect(categories.has('ui')).toBe(true);
  });
});

describe('getPrimitivesForCapabilities', () => {
  it('should return base primitives for empty capabilities', () => {
    const prims = getPrimitivesForCapabilities([]);
    expect(prims.length).toBeGreaterThan(0);
  });

  it('should include commerce primitives for commerce capability', () => {
    const prims = getPrimitivesForCapabilities(['commerce']);
    const names = prims.map(p => p.name);
    expect(names).toContain('ProductCard');
  });

  it('should include booking primitives for booking capability', () => {
    const prims = getPrimitivesForCapabilities(['booking']);
    const names = prims.map(p => p.name);
    expect(names).toContain('BookingForm');
  });

  it('should include crm primitives for case-management capability', () => {
    const prims = getPrimitivesForCapabilities(['case-management']);
    const names = prims.map(p => p.name);
    expect(names).toContain('CRMBoard');
    expect(names).toContain('KanbanBoard');
  });

  it('should include dashboard primitives for analytics capability', () => {
    const prims = getPrimitivesForCapabilities(['analytics']);
    const names = prims.map(p => p.name);
    expect(names).toContain('DashboardShell');
    expect(names).toContain('AnalyticsCard');
  });

  it('should include subscription primitives for subscriptions capability', () => {
    const prims = getPrimitivesForCapabilities(['subscriptions']);
    const names = prims.map(p => p.name);
    expect(names).toContain('SubscriptionSelector');
  });

  it('should resolve canonical ids via the registry (Phase R2)', () => {
    // Legacy alias `commerce` and canonical id `commerce.checkout` both route to ecommerce.
    const fromAlias = getPrimitivesForCapabilities(['commerce']).map(p => p.name);
    const fromCanonical = getPrimitivesForCapabilities(['commerce.checkout']).map(p => p.name);
    expect(fromAlias).toContain('ProductCard');
    expect(fromCanonical).toContain('ProductCard');

    // Canonical CRM id routes to crm primitives.
    const crm = getPrimitivesForCapabilities(['crm.contacts']).map(p => p.name);
    expect(crm).toContain('CRMBoard');
  });
});

describe('buildPrimitivesCatalog', () => {
  it('should return a markdown-formatted catalog string', () => {
    const catalog = buildPrimitivesCatalog('saas');
    expect(typeof catalog).toBe('string');
    expect(catalog).toContain('###');
    expect(catalog).toContain('Props:');
    expect(catalog).toContain('Variants:');
    expect(catalog).toContain('Example:');
  });

  it('should include relevant primitives for the domain', () => {
    const catalog = buildPrimitivesCatalog('ecommerce');
    expect(catalog).toContain('ProductCard');
    expect(catalog).toContain('Button');
  });
});

describe('buildPrimitivesCatalogForCapabilities', () => {
  it('should return a markdown-formatted catalog string', () => {
    const catalog = buildPrimitivesCatalogForCapabilities(['commerce']);
    expect(typeof catalog).toBe('string');
    expect(catalog).toContain('###');
    expect(catalog).toContain('ProductCard');
  });
});
