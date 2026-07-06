import Anthropic from '@anthropic-ai/sdk';

export interface EnrichedContext {
  businessName: string;
  tagline: string;
  city: string;
  industry: string;
  primaryColor: string;
  products: Array<{
    name: string;
    price: string;
    description: string;
    emoji: string;
  }>;
  services: Array<{
    name: string;
    price: string;
    duration: string;
    description: string;
  }>;
  teamMembers: Array<{
    name: string;
    role: string;
    bio: string;
  }>;
  testimonials: Array<{
    name: string;
    location: string;
    text: string;
    rating: number;
  }>;
  stats: Array<{
    value: string;
    label: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  navItems: string[];
  ctaText: string;
  heroHeadline: string;
  heroSubtitle: string;
  footerTagline: string;
}

export class ClaudeEnricher {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async enrich(prompt: string): Promise<EnrichedContext> {
    console.log('[enricher] Calling Claude to extract business context...');

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a business analyst extracting structured context for a website generator.

Given this business prompt: "${prompt}"

Return a JSON object with REAL, SPECIFIC content — not placeholders. Use actual names, prices, and descriptions that fit this exact business type and location.

Return ONLY valid JSON, no markdown, no explanation:

{
  "businessName": "specific business name (2-3 words max)",
  "tagline": "catchy tagline under 8 words",
  "city": "city name from the prompt or a realistic default",
  "industry": "one of: restaurant, saas, ecommerce, fitness, healthcare, legal, education, agency, real-estate, hospitality",
  "primaryColor": "one of: emerald, violet, orange, blue, rose, amber, cyan, indigo",
  "products": [
    { "name": "specific product name", "price": "$XX", "description": "one sentence", "emoji": "relevant emoji" }
  ],
  "services": [
    { "name": "service name", "price": "$XX", "duration": "X hours", "description": "one sentence" }
  ],
  "teamMembers": [
    { "name": "First Last", "role": "Job Title", "bio": "one sentence bio" }
  ],
  "testimonials": [
    { "name": "First Last", "location": "City, State", "text": "specific testimonial mentioning the business", "rating": 5 }
  ],
  "stats": [
    { "value": "number with unit", "label": "metric label" }
  ],
  "faqs": [
    { "question": "relevant question", "answer": "specific answer" }
  ],
  "navItems": ["Home", "Menu", "Reservations", "About", "Contact"],
  "ctaText": "specific call to action verb + noun",
  "heroHeadline": "compelling headline under 8 words",
  "heroSubtitle": "subtitle under 15 words explaining the value proposition",
  "footerTagline": "© 2025 BusinessName. Short mission statement."
}

Rules:
- Products/services must be specific to this exact industry (e.g. "Truffle Mushroom Risotto" not "Product 1")
- Prices must be realistic for the industry and city
- Testimonials must mention specific things about the business (dish names, service quality, staff)
- Stats must be credible numbers (not "1M+")
- Provide 4 products, 4 services, 3 team members, 3 testimonials, 4 stats, 4 faqs, 5 nav items`,
        },
      ],
    });

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleaned) as EnrichedContext;
      console.log(`[enricher] Extracted: "${result.businessName}" in ${result.city} (${result.industry})`);
      return result;
    } catch (e) {
      console.error('[enricher] Failed to parse Claude response:', text.slice(0, 200));
      throw new Error(`Claude enricher returned invalid JSON: ${(e as Error).message}`);
    }
  }
}
