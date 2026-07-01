import { BOSEntry } from '../types.js';
import { BOSRegistry } from '../registry.js';

const MediaEntry: BOSEntry = {
  id: 'media.publishing',
  industry: 'Media',
  subIndustry: 'Digital Publishing',
  description: 'Media and publishing platform with content management, subscription, analytics, and ad management',
  capabilities: [
    'hero', 'article_feed', 'category_navigation', 'search',
    'subscription_form', 'analytics_dashboard', 'ad_placement',
    'newsletter', 'social_share', 'author_profiles', 'comments'
  ],
  references: {
    urls: ['https://www.medium.com', 'https://www.theverge.com', 'https://www.techcrunch.com'],
    selectors: {
      heroHeadline: 'h1, .headline',
      articleList: '.article-card, [class*="post"]',
      categoryNav: '.nav-item, [class*="category"]',
      subscriptionForm: 'form[class*="subscribe"], .newsletter-form',
      authorBio: '.author-bio, [class*="byline"]'
    }
  },
  vocabularyOverrides: {
    'product': 'article', 'buy': 'subscribe', 'store': 'publication',
    'cart': 'subscription', 'checkout': 'join', 'price': 'membership',
    'customer': 'reader', 'order': 'subscription'
  },
  workflows: [
    { name: 'Content Publishing', steps: ['Write', 'Edit', 'Review', 'Publish', 'Promote'], revenue_impact: 'Increases readership by 60%' },
    { name: 'Subscription Management', steps: ['Free preview', 'Subscribe', 'Payment', 'Access', 'Renew'], revenue_impact: 'Primary revenue driver' }
  ],
  entities: ['Article', 'Author', 'Category', 'Subscriber', 'AdPlacement', 'Comment', 'Analytics'],
  revenueModel: ['subscription', 'advertising', 'sponsored_content', 'affiliate', 'events'],
  compliance: ['GDPR', 'Cookie Consent', 'DMCA', 'Right to Reply', 'Data Privacy'],
  priority: 2,
  tags: ['media', 'publishing', 'news', 'article', 'blog', 'journalism', 'content', 'magazine']
};
BOSRegistry.register(MediaEntry);
export default MediaEntry;
