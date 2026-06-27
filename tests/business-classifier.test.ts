import { describe, it, expect } from 'vitest';
import { BusinessClassifier } from '../src/generation/business-classifier.js';

describe('BusinessClassifier', () => {
  const classifier = new BusinessClassifier();

  it('should return all supported types', () => {
    const types = classifier.getSupportedTypes();
    expect(types.length).toBe(11);
    expect(types).toContain('ecommerce');
    expect(types).toContain('saas');
    expect(types).toContain('healthcare');
  });

  it('should classify ecommerce from keywords', () => {
    const result = classifier.classify({
      title: 'Online Store',
      description: 'Shop products with cart checkout and payment',
    });
    expect(result.type).toBe('ecommerce');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.matchedKeywords).toContain('shop');
  });

  it('should classify SaaS from keywords', () => {
    const result = classifier.classify({
      title: 'Cloud Dashboard',
      description: 'SaaS platform with subscription plans and API integration',
    });
    expect(result.type).toBe('saas');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify healthcare from keywords', () => {
    const result = classifier.classify({
      title: 'Medical Clinic',
      description: 'Patient appointments with doctor and medical health services',
    });
    expect(result.type).toBe('healthcare');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify restaurant from keywords', () => {
    const result = classifier.classify({
      title: 'Italian Bistro',
      description: 'Restaurant menu with food delivery and reservations',
    });
    expect(result.type).toBe('restaurant');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify education from keywords', () => {
    const result = classifier.classify({
      title: 'Online Learning',
      description: 'University courses with students and curriculum',
    });
    expect(result.type).toBe('education');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify fitness from keywords', () => {
    const result = classifier.classify({
      title: 'FitLife Gym',
      description: 'Gym workouts with personal trainers and membership plans',
    });
    expect(result.type).toBe('fitness');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify portfolio from keywords', () => {
    // Use keywords unique to portfolio to avoid overlap with agency
    const result = classifier.classify({
      title: 'Creative Resume',
      description: 'Personal freelancer resume cv showcase skills experience',
    });
    expect(result.type).toBe('portfolio');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify blog from keywords', () => {
    const result = classifier.classify({
      title: 'Tech Blog',
      description: 'Articles and blog posts with categories and newsletter subscribe',
    });
    expect(result.type).toBe('blog');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify marketplace from keywords', () => {
    const result = classifier.classify({
      title: 'Marketplace',
      description: 'Seller buyer listings with vendor marketplace categories',
    });
    expect(result.type).toBe('marketplace');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should classify agency from keywords', () => {
    const result = classifier.classify({
      title: 'Digital Agency',
      description: 'Creative agency with client case studies and portfolio work',
    });
    expect(result.type).toBe('agency');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should boost score for domain pattern matches', () => {
    const result = classifier.classify({
      title: 'Shop',
      domain: 'myshop.com',
    });
    expect(result.type).toBe('ecommerce');
    expect(result.scores.ecommerce).toBeGreaterThan(0);
  });

  it('should boost score for structural pattern matches (routes)', () => {
    const result = classifier.classify({
      title: 'SaaS App',
      routes: ['/dashboard', '/login', '/signup', '/pricing-table'],
    });
    expect(result.type).toBe('saas');
    expect(result.matchedPatterns.length).toBeGreaterThan(0);
  });

  it('should classify from prompt using classifyFromPrompt', () => {
    const result = classifier.classifyFromPrompt('Build an online store with shopping cart and product catalog');
    expect(result.type).toBe('ecommerce');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should return unknown for empty input', () => {
    const result = classifier.classify({});
    expect(result.type).toBe('unknown');
  });

  it('each result should have all score types', () => {
    const result = classifier.classify({ content: 'test' });
    expect(result.scores).toBeDefined();
    expect(typeof result.scores.ecommerce).toBe('number');
    expect(typeof result.scores.saas).toBe('number');
    expect(typeof result.scores.healthcare).toBe('number');
    expect(typeof result.scores.restaurant).toBe('number');
  });

  it('confidence should be between 0 and 1', () => {
    const result = classifier.classify({
      content: 'online store shop buy cart checkout product',
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
