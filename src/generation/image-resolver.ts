/**
 * Image Resolver: Generates domain-specific image URLs using Unsplash Source API
 * with proper keyword mapping. No hardcoded photo IDs — uses search-based URLs.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ResolvedImages {
  hero: string;
  items: string[];
  team: string[];
  fallback: string;
}

const UNSPLASH_WIDTH = 1200;
const UNSPLASH_HEIGHT = 800;

/**
 * Generate Unsplash Source URL with keyword search.
 * Returns a random photo matching the keyword — no API key needed.
 */
function unsplashUrl(keyword: string, width = UNSPLASH_WIDTH, height = UNSPLASH_HEIGHT): string {
  const query = encodeURIComponent(keyword);
  return `https://source.unsplash.com/${width}x${height}/?${query}`;
}

/**
 * Map domain keywords to specific Unsplash search terms.
 * These are search queries, not photo IDs — each returns relevant, varied results.
 */
const DOMAIN_SEARCH_TERMS: Record<string, string[]> = {
  // Real Estate
  'real-estate': ['luxury house exterior', 'modern home', 'apartment building', 'real estate listing'],
  'property': ['house for sale', 'residential neighborhood', 'home exterior'],
  
  // Restaurant / Food
  'restaurant': ['restaurant interior', 'fine dining plate', 'restaurant ambiance'],
  'cafe': ['coffee shop interior', 'cafe table', 'latte art'],
  'coffee-shop': ['coffee shop counter', 'espresso machine', 'cafe pastries'],
  'bakery': ['artisan bread', 'bakery display', 'fresh pastries'],
  'pizza': ['pizza restaurant', 'wood fired pizza', 'pizza slice'],
  'sushi': ['sushi platter', 'japanese restaurant', 'sushi chef'],
  'burger': ['gourmet burger', 'burger restaurant', 'fries and burger'],
  'fine-dining': ['fine dining plate', 'gourmet food', 'wine and dinner'],
  
  // Fitness / Health
  'gym': ['gym interior', 'weight room', 'fitness center'],
  'fitness': ['workout class', 'personal training', 'fitness motivation'],
  'yoga': ['yoga class', 'yoga studio', 'meditation space'],
  'crossfit': ['crossfit gym', 'functional training', 'kettlebell workout'],
  'personal-training': ['personal trainer', 'one on one training', 'fitness coaching'],
  'pilates': ['pilates studio', 'reformer class', 'pilates mat'],
  
  // Healthcare
  'dental': ['dental office', 'dentist chair', 'dental clinic'],
  'medical': ['medical clinic', 'doctor office', 'healthcare professional'],
  'healthcare': ['hospital lobby', 'medical team', 'patient care'],
  'veterinary': ['veterinary clinic', 'pet doctor', 'animal hospital'],
  'psychology': ['therapy office', 'counseling session', 'mental health'],
  
  // Business / Tech
  'saas': ['software dashboard', 'tech startup', 'coding screen'],
  'dashboard': ['analytics dashboard', 'data visualization', 'business metrics'],
  'crm': ['customer relationship', 'sales pipeline', 'business analytics'],
  'fintech': ['financial technology', 'mobile banking', 'digital payment'],
  'startup': ['startup office', 'tech team', 'brainstorm session'],
  
  // E-commerce
  'ecommerce': ['online shopping', 'product display', 'e-commerce store'],
  'fashion': ['fashion boutique', 'clothing rack', 'style collection'],
  'jewelry': ['jewelry display', 'luxury accessories', 'gemstone collection'],
  'electronics': ['tech gadgets', 'electronics store', 'smart devices'],
  'home-goods': ['home decor', 'furniture showroom', 'interior design'],
  
  // Services
  'law-firm': ['law office', 'legal library', 'attorney desk'],
  'accounting': ['accounting office', 'financial documents', 'business meeting'],
  'consulting': ['business consulting', 'strategy meeting', 'professional services'],
  'marketing': ['marketing team', 'creative agency', 'campaign planning'],
  'photography': ['photography studio', 'camera equipment', 'photo shoot'],
  
  // Education
  'education': ['classroom', 'university campus', 'online learning'],
  'tutoring': ['tutoring session', 'study group', 'learning together'],
  'online-course': ['elearning platform', 'video course', 'digital classroom'],
  
  // Auto / Automotive
  'auto-dealership': ['car dealership', 'luxury cars', 'showroom floor'],
  'auto-repair': ['auto repair shop', 'mechanic garage', 'car service'],
  'car-wash': ['car wash', 'auto detailing', 'clean car'],
  
  // Beauty / Salon
  'beauty-salon': ['beauty salon', 'hair styling', 'salon interior'],
  'spa': ['spa treatment', 'relaxation massage', 'wellness center'],
  'nail-salon': ['nail art', 'manicure table', 'nail salon'],
  'barbershop': ['barbershop', 'barber chair', 'haircut'],
  
  // Pet Services
  'pet-grooming': ['pet grooming', 'dog spa', 'grooming table'],
  'pet-boarding': ['pet hotel', 'dog daycare', 'animal care'],
  'pet-store': ['pet shop', 'pet supplies', 'animal accessories'],
  
  // Events
  'wedding': ['wedding venue', 'wedding decoration', 'ceremony setup'],
  'conference': ['conference hall', 'event space', 'presentation stage'],
  'party': ['party venue', 'celebration', 'event decor'],
  
  // Non-profit
  'charity': ['volunteer work', 'community service', 'charity event'],
  'nonprofit': ['nonprofit office', 'community outreach', 'social impact'],
  
  // Portfolio
  'portfolio': ['creative workspace', 'design studio', 'artist studio'],
  'agency': ['creative agency', 'design team', 'office culture'],
  
  // Default
  'business': ['modern office', 'business meeting', 'professional workspace'],
  'office': ['coworking space', 'office interior', 'workspace design'],
};

/**
 * Get search terms for a domain keyword.
 */
function getSearchTerms(keyword: string): string[] {
  const normalized = keyword.toLowerCase().trim();
  return DOMAIN_SEARCH_TERMS[normalized] || [normalized];
}

/**
 * Generate a seeded random index for consistent but varied images.
 */
function seededIndex(seed: string, modulus: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % modulus;
}

/**
 * Generate a CSS gradient as fallback.
 */
function generateGradientPlaceholder(keyword: string, index: number): string {
  const colors: string[][] = [
    ['#1a1a2e', '#16213e', '#0f3460'],
    ['#0d1117', '#161b22', '#21262d'],
    ['#1a1a2e', '#2d1b69', '#11998e'],
    ['#0c0c0c', '#1a1a1a', '#2d2d2d'],
    ['#1b1b2f', '#162447', '#1f4068'],
    ['#0f0f0f', '#1a1a1a', '#2a2a2a'],
    ['#2d1b69', '#11998e', '#1a1a2e'],
    ['#162447', '#1f4068', '#e43f5a'],
  ];
  const idx = (index + seededIndex(keyword, 100)) % colors.length;
  const pair = colors[idx]!;
  const angle = 135 + ((index * 15) % 90);
  return `linear-gradient(${angle}deg, ${pair[0]}, ${pair[1]}, ${pair[2]})`;
}

/**
 * Resolve images for a domain.
 * Uses Unsplash Source API with keyword search — no hardcoded photo IDs.
 */
export function resolveDomainImages(
  imageKeywords: string[],
  itemCount: number,
  teamCount: number,
  assetsDir?: string,
): ResolvedImages {
  const heroKeyword = imageKeywords[0] || 'business';
  const searchTerms = getSearchTerms(heroKeyword);

  // Hero image — use first search term with variety
  const heroIndex = seededIndex(heroKeyword, searchTerms.length);
  const hero = unsplashUrl(searchTerms[heroIndex] || heroKeyword);

  // Item images — rotate through search terms
  const items: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const termIndex = (heroIndex + i) % searchTerms.length;
    const term = searchTerms[termIndex] || heroKeyword;
    const variation = i > 0 ? ` ${i + 1}` : '';
    items.push(unsplashUrl(`${term}${variation}`, 600, 400));
  }

  // Team/Avatar images — use portrait-related terms
  const teamSearchTerms = ['professional portrait', 'headshot', 'business person', 'team member'];
  const team: string[] = [];
  for (let i = 0; i < teamCount; i++) {
    const termIndex = i % teamSearchTerms.length;
    team.push(unsplashUrl(teamSearchTerms[termIndex]!, 200, 200));
  }

  // Fallback gradient
  const fallback = generateGradientPlaceholder(heroKeyword, 0);

  return { hero, items, team, fallback };
}

/**
 * Resolve a single image URL by keyword.
 */
export function resolveSingleImage(keyword: string, width = 600, height = 400): string {
  const searchTerms = getSearchTerms(keyword);
  return unsplashUrl(searchTerms[0] || keyword, width, height);
}

/**
 * Resolve a random image from a set of search terms.
 */
export function resolveRandomImage(keywords: string[], width = 600, height = 400): string {
  const idx = Math.floor(Math.random() * keywords.length);
  const keyword = keywords[idx] || 'business';
  return unsplashUrl(keyword, width, height);
}
