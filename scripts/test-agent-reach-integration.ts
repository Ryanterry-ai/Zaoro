import { AgentReachBridge } from '../src/business-intelligence/core/agent-reach-bridge.js';
import { AgentSkillsBridge } from '../src/business-intelligence/core/agent-skills-bridge.js';
import { VisualAnalyzer } from '../src/business-intelligence/core/visual-analyzer.js';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   AGENT-REACH INTEGRATION TEST SUITE               ');
  console.log('====================================================\n');

  // ─── Test 1: AgentReachBridge Initialization ──────────
  console.log('[Test 1/6] AgentReachBridge initialization...');
  const bridge = new AgentReachBridge();
  check('AgentReachBridge instantiates', !!bridge);
  check('AgentReachBridge has crawlWebsite', typeof bridge.crawlWebsite === 'function');
  check('AgentReachBridge has extractStructuredData', typeof bridge.extractStructuredData === 'function');
  check('AgentReachBridge has extractSocialLinks', typeof bridge.extractSocialLinks === 'function');
  check('AgentReachBridge has extractPricingInfo', typeof bridge.extractPricingInfo === 'function');
  check('AgentReachBridge has extractContactInfo', typeof bridge.extractContactInfo === 'function');
  check('AgentReachBridge has discoverAPIEndpoints', typeof bridge.discoverAPIEndpoints === 'function');
  check('AgentReachBridge has researchCompetitors', typeof bridge.researchCompetitors === 'function');

  // ─── Test 2: Structured Data Extraction ───────────────
  console.log('\n[Test 2/6] Structured data extraction...');
  const sampleHtml = `
    <html>
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Test Dental Clinic",
        "address": { "@type": "PostalAddress", "streetAddress": "123 Main St" },
        "telephone": "+1-555-0123"
      }
      </script>
      <meta property="og:title" content="Test Clinic" />
      <meta property="og:description" content="Best dental clinic" />
      <meta name="twitter:site" content="@testclinic" />
    </head>
    <body>
      <a href="https://linkedin.com/company/test">LinkedIn</a>
      <a href="https://twitter.com/test">Twitter</a>
      <a href="https://facebook.com/test">Facebook</a>
      <a href="https://instagram.com/test">Instagram</a>
      <div itemscope itemtype="https://schema.org/Organization">
        <span itemprop="name">Test Org</span>
      </div>
    </body>
    </html>`;

  const structured = bridge.extractStructuredData(sampleHtml);
  check('JSON-LD extracted', structured.jsonLd.length > 0, `found ${structured.jsonLd.length}`);
  check('JSON-LD has LocalBusiness type', structured.jsonLd.some(d => d['@type'] === 'LocalBusiness'));
  check('Open Graph tags extracted', Object.keys(structured.schemaOrg).length > 0);
  check('OG title present', structured.schemaOrg['og:title'] === 'Test Clinic');
  check('Twitter tag present', structured.schemaOrg['twitter:site'] === '@testclinic');
  check('Microdata extracted', structured.microdata.length > 0);

  // ─── Test 3: Social Links Extraction ──────────────────
  console.log('\n[Test 3/6] Social links extraction...');
  const social = bridge.extractSocialLinks(sampleHtml, 'https://example.com');
  check('LinkedIn found', social.linkedin.length > 0);
  check('Twitter found', social.twitter.length > 0);
  check('Facebook found', social.facebook.length > 0);
  check('Instagram found', social.instagram.length > 0);
  check('GitHub empty (not in HTML)', social.github.length === 0);

  // ─── Test 4: Pricing Extraction ───────────────────────
  console.log('\n[Test 4/6] Pricing extraction...');
  const pricingHtml = `
    <html><body>
      <a href="/pricing">Pricing</a>
      <h2>Our Plans</h2>
      <p>Free plan available</p>
      <p>Pro plan $29/mo</p>
      <p>Enterprise plan $99/month</p>
      <p>Annual billing saves 20%</p>
    </body></html>`;
  const pricingPages = [{ url: 'https://example.com/pricing', title: 'Pricing', text: pricingHtml, links: [], images: [] }];
  const pricing = bridge.extractPricingInfo(pricingPages, 'https://example.com');
  check('Has pricing page', pricing.has_pricing_page);
  check('Pricing URL set', pricing.pricing_url.includes('pricing'));
  check('Price mentions extracted', pricing.plans.length > 0, `found ${pricing.plans.length} plans`);
  check('Billing model detected', pricing.billing_model !== 'unknown', `detected: ${pricing.billing_model}`);

  // ─── Test 5: Contact Info Extraction ──────────────────
  console.log('\n[Test 5/6] Contact info extraction...');
  const contactHtml = `
    <html><body>
      <p>Email us at info@realclinic.com or support@realclinic.com</p>
      <p>Call +1-555-123-4567</p>
      <p>Visit us at 123 Main Street, Suite 100</p>
    </body></html>`;
  const contact = bridge.extractContactInfo(contactHtml, social);
  check('Emails extracted', contact.emails.length > 0, `found: ${contact.emails.join(', ')}`);
  check('Excludes example.com emails', !contact.emails.some(e => e.includes('example.com')), `${contact.emails.join(', ')}`);
  check('Phones extracted', contact.phones.length > 0);
  check('Social links passed through', Object.keys(contact.social_links).length > 0);

  // ─── Test 6: API Endpoint Discovery ───────────────────
  console.log('\n[Test 6/6] API endpoint discovery...');
  const apiPages = [{
    url: 'https://example.com',
    title: 'Home',
    text: 'fetch("/api/users") then axios.post("/api/orders") and useQuery("/api/products")',
    links: [
      { text: 'API Docs', href: 'https://example.com/docs/api' },
      { text: 'Developer', href: 'https://example.com/developer' }
    ],
    images: []
  }];
  const endpoints = bridge.discoverAPIEndpoints(apiPages);
  check('REST endpoints discovered', endpoints.some(e => e.type === 'rest'), `found ${endpoints.filter(e => e.type === 'rest').length}`);
  check('API docs links found', endpoints.some(e => e.url.includes('docs') || e.url.includes('developer')));

  // ─── AgentSkillsBridge Integration ────────────────────
  console.log('\n[AgentSkillsBridge] Checking new methods...');
  const agentBridge = new AgentSkillsBridge();
  check('AgentSkillsBridge has crawlWebsite', typeof agentBridge.crawlWebsite === 'function');
  check('AgentSkillsBridge has extractStructuredData', typeof agentBridge.extractStructuredData === 'function');
  check('AgentSkillsBridge has extractSocialLinks', typeof agentBridge.extractSocialLinks === 'function');
  check('AgentSkillsBridge has discoverAPIEndpoints', typeof agentBridge.discoverAPIEndpoints === 'function');
  check('AgentSkillsBridge has researchCompetitors', typeof agentBridge.researchCompetitors === 'function');

  // ─── VisualAnalyzer Enhancement ───────────────────────
  console.log('\n[VisualAnalyzer] Checking enhanced methods...');
  const analyzer = new VisualAnalyzer();
  check('VisualAnalyzer instantiates', !!analyzer);

  // ─── Summary ──────────────────────────────────────────
  console.log('\n====================================================');
  console.log(`   RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
