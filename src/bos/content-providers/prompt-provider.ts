/**
 * PromptProvider — content from user prompt requirements.
 *
 * Provides: business name, description, key requirements, sub-category detection.
 * Priority: 20 (above base knowledge).
 */

import type { ContentProvider, ContentBag, ProviderContext } from './interfaces.js';

export class PromptProvider implements ContentProvider {
  readonly name = 'prompt';
  readonly priority = 20;

  canProvide(ctx: ProviderContext): boolean {
    return !!(ctx.blueprint.description || ctx.blueprint.name);
  }

  provide(ctx: ProviderContext): ContentBag {
    const desc = (ctx.blueprint.description ?? '').toLowerCase();
    const name = ctx.blueprint.name ?? 'Business';

    // Detect sub-categories from prompt
    const subCat = this.detectSubCategory(desc);

    return {
      hero: {
        title: name,
        subtitle: this.generateSubtitle(desc, name, subCat),
      },
      features: {
        title: `${name} Features`,
        subtitle: `What ${name} offers`,
        items: this.extractFeatures(desc, subCat),
      },
      about: {
        title: `About ${name}`,
        description: this.generateAbout(desc, name, subCat),
      },
      cta: {
        title: `Get Started with ${name}`,
        subtitle: this.generateCTASubtitle(desc, subCat),
        actions: [
          { label: this.generatePrimaryCTA(desc, subCat), action: '/signup', style: 'primary' },
          { label: 'Learn More', action: '#features', style: 'ghost' },
        ],
      },
    };
  }

  private detectSubCategory(desc: string): string | undefined {
    if (desc.includes('coffee') || desc.includes('espresso') || desc.includes('brew') || desc.includes('cafe')) return 'coffee';
    if (desc.includes('wholesale') || desc.includes('b2b') || desc.includes('distributor') || desc.includes('bulk')) return 'wholesale';
    if (desc.includes('supplement') || desc.includes('protein') || desc.includes('nutrition') || desc.includes('whey')) return 'supplement';
    if (desc.includes('gym') || desc.includes('fitness') || desc.includes('yoga')) return 'fitness';
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('dining')) return 'restaurant';
    if (desc.includes('hotel') || desc.includes('motel') || desc.includes('lodge')) return 'hotel';
    if (desc.includes('course') || desc.includes('learn') || desc.includes('education')) return 'education';
    if (desc.includes('property') || desc.includes('real estate')) return 'realestate';
    if (desc.includes('health') || desc.includes('dental') || desc.includes('medical')) return 'healthcare';
    return undefined;
  }

  private generateSubtitle(desc: string, name: string, subCat: string | undefined): string {
    if (subCat === 'coffee') return `Freshly roasted beans, handcrafted drinks, and a space worth waking up for`;
    if (subCat === 'wholesale') return `B2B wholesale distribution — bulk pricing, dealer network, nationwide supply chain`;
    if (subCat === 'supplement') return `Premium supplements from top brands, lab-tested and delivered`;
    if (subCat === 'fitness') return `Transform your body with expert-led programs and state-of-the-art facilities`;
    if (subCat === 'restaurant') return `Fresh, seasonal food prepared with care and served with pride`;
    if (subCat === 'education') return `Learn from industry experts and advance your career at your own pace`;
    if (subCat === 'realestate') return `Find your perfect property with expert guidance and local market insights`;
    if (subCat === 'healthcare') return `Compassionate care with modern technology for your whole family`;
    return `Built for how ${name} actually works`;
  }

  private extractFeatures(desc: string, subCat: string | undefined): Array<{ title: string; description: string; icon: string }> {
    const features: Array<{ title: string; description: string; icon: string }> = [];

    if (subCat === 'coffee') {
      features.push(
        { title: 'Fresh Roasted Beans', description: 'Single-origin and blended beans roasted in-house daily', icon: 'coffee' },
        { title: 'Online Order & Pickup', description: 'Skip the line — order ahead and pick up when ready', icon: 'shopping-bag' },
        { title: 'Barista Crafted Drinks', description: 'Espresso, pour-over, cold brew, and seasonal specials', icon: 'cup-soda' },
      );
    } else if (subCat === 'wholesale') {
      features.push(
        { title: 'Bulk Pricing Tiers', description: 'Volume-based pricing with MOQ thresholds for distributors', icon: 'package' },
        { title: 'Dealer Portal', description: 'Self-service ordering, invoice management, and inventory tracking', icon: 'layout-dashboard' },
        { title: 'Purchase Order System', description: 'Automated PO generation and approval workflows', icon: 'file-text' },
      );
    } else if (subCat === 'supplement') {
      features.push(
        { title: 'Lab-Tested Products', description: 'Third-party verified purity and potency for every batch', icon: 'flask-conical' },
        { title: 'Brand Catalog', description: 'Multi-brand inventory with real-time stock and pricing', icon: 'grid' },
        { title: 'Subscription Bundles', description: 'Monthly supplement stacks delivered to your door', icon: 'repeat' },
      );
    } else if (subCat === 'fitness') {
      features.push(
        { title: 'Class Booking', description: 'Reserve your spot in any class', icon: 'calendar' },
        { title: 'Membership Plans', description: 'Flexible pricing for every commitment level', icon: 'credit-card' },
        { title: 'Workout Tracking', description: 'Monitor progress and celebrate milestones', icon: 'activity' },
      );
    } else if (subCat === 'restaurant') {
      features.push(
        { title: 'Online Ordering', description: 'Let customers order ahead for pickup or delivery', icon: 'shopping-bag' },
        { title: 'Table Reservations', description: 'Real-time availability and instant booking', icon: 'calendar' },
        { title: 'Menu Management', description: 'Update dishes, prices, and specials instantly', icon: 'book-open' },
      );
    } else {
      // Generic features from description keywords
      if (desc.includes('analytics') || desc.includes('dashboard')) {
        features.push({ title: 'Analytics Dashboard', description: 'Real-time data visualization and reporting', icon: 'bar-chart' });
      }
      if (desc.includes('api') || desc.includes('integration')) {
        features.push({ title: 'API Access', description: 'Integrate with your existing tools', icon: 'code' });
      }
      if (desc.includes('team') || desc.includes('collaboration')) {
        features.push({ title: 'Team Collaboration', description: 'Work together in real-time', icon: 'users' });
      }
      if (features.length === 0) {
        features.push(
          { title: 'Core Functionality', description: 'Purpose-built for your workflow', icon: 'zap' },
          { title: 'Smart Automation', description: 'Reduce manual work with intelligent automation', icon: 'bot' },
          { title: 'Real-Time Insights', description: 'Data-driven decisions with live analytics', icon: 'activity' },
        );
      }
    }

    return features;
  }

  private generateAbout(desc: string, name: string, subCat: string | undefined): string {
    if (subCat === 'coffee') return `A neighborhood coffee house committed to ethically sourced beans, expert roasting, and a warm community atmosphere`;
    if (subCat === 'wholesale') return `A trusted B2B wholesale distributor serving gyms and retailers with premium products and reliable logistics`;
    if (subCat === 'supplement') return `Your trusted destination for genuine supplements from top brands, lab-tested and verified`;
    if (subCat === 'fitness') return `Empowering your fitness journey with expert coaching and state-of-the-art facilities`;
    if (subCat === 'restaurant') return `A passion for great food, fresh ingredients, and unforgettable dining experiences`;
    if (subCat === 'education') return `Making quality education accessible and engaging for learners everywhere`;
    if (subCat === 'realestate') return `Connecting people with their dream properties through expertise and trust`;
    if (subCat === 'healthcare') return `Delivering compassionate, modern healthcare with a patient-first approach`;
    return `${name} — purpose-built for how your team actually works`;
  }

  private generateCTASubtitle(desc: string, subCat: string | undefined): string {
    if (subCat === 'coffee') return 'Join our community of coffee lovers';
    if (subCat === 'wholesale') return 'Start ordering in bulk today';
    if (subCat === 'supplement') return 'Fuel your goals with trusted nutrition';
    if (subCat === 'fitness') return 'Start your transformation today';
    return 'Get started in minutes';
  }

  private generatePrimaryCTA(desc: string, subCat: string | undefined): string {
    if (subCat === 'coffee') return 'Order Now';
    if (subCat === 'wholesale') return 'Request a Quote';
    if (subCat === 'supplement') return 'Shop Supplements';
    if (subCat === 'fitness') return 'Join Now';
    if (subCat === 'restaurant') return 'Reserve a Table';
    return 'Get Started';
  }
}
