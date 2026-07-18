// Fast, deterministic classification probe. Runs ONLY signal extraction +
// archetype composition (no build pipeline, no agent calls) so we can iterate
// on business-type/shape accuracy in milliseconds. Mirrors the sector prompts
// used by scripts/stress-sectors.ts.
import { extractSignals, signalValues, signalWeight } from '../src/orchestration/business-intelligence/dimensions.js';
import { composeDiscovery } from '../src/orchestration/business-intelligence/archetypes.js';

const SECTORS: { id: string; prompt: string }[] = [
  { id: 'agriculture-organic-farm', prompt: "Build a website for an organic family farm that sells fresh seasonal vegetables and eggs directly to local households through a weekly subscription box, with a farm story, meet-the-farmers section, delivery zones, and the ability to pause or customize each week's box." },
  { id: 'foodbev-cloud-kitchen', prompt: 'Create a site for a cloud kitchen selling healthy meal bowls with online ordering, a browsable menu with nutrition info, cart and checkout, delivery tracking, and customer reviews.' },
  { id: 'manufacturing-cnc', prompt: 'Build a B2B website for a precision CNC machining manufacturer that serves aerospace clients, with a capabilities catalog, request-for-quote workflow, certifications, case studies, and an engineer contact form.' },
  { id: 'tech-devops-saas', prompt: 'Create a SaaS product website for a DevOps observability platform with tiered pricing, a feature dashboard preview, free-trial signup, API documentation link, customer logos, and a request-a-demo flow.' },
  { id: 'healthcare-telemedicine', prompt: 'Build a telemedicine clinic website where patients can book video consultations with doctors, see specialties, view doctor profiles, manage appointments, and access their visit records securely.' },
  { id: 'finance-wealth', prompt: 'Create a wealth management advisory website that builds trust with high-net-worth clients, explains portfolio strategies, shows the advisory team, offers a consultation booking, and emphasizes compliance and security.' },
  { id: 'education-bootcamp', prompt: 'Build an online coding bootcamp website with a course catalog, curriculum breakdown, instructor bios, student outcomes, cohort schedule, enrollment/checkout, and a learning dashboard.' },
  { id: 'proservices-law', prompt: 'Create a law firm website for a boutique corporate practice, with practice areas, attorney profiles, case results, insights/blog, and a confidential consultation request form.' },
  { id: 'realestate-brokerage', prompt: 'Build a real estate brokerage website with searchable property listings, map view, filters by price and bedrooms, agent profiles, saved favorites, and a schedule-a-viewing booking flow.' },
  { id: 'transport-lastmile', prompt: 'Create a last-mile delivery logistics company website with on-demand booking of a courier, live tracking, service coverage map, pricing calculator by distance and weight, and a business API signup.' },
  { id: 'hospitality-boutique-hotel', prompt: 'Build a boutique hotel website with room types and photo galleries, real-time availability and reservation booking, amenities, local experiences, guest reviews, and a concierge contact.' },
  { id: 'media-streaming', prompt: 'Create a streaming service website for independent films with a browsable catalog by genre, film detail pages with trailers, subscription plans, account signup, and a watchlist.' },
  { id: 'sports-crossfit', prompt: 'Build a CrossFit gym website with class schedule and booking, membership plans, coach profiles, a free trial signup, transformation stories, and a members dashboard.' },
  { id: 'energy-solar', prompt: 'Create a residential solar installer website with a savings calculator based on the roof and bill, product options, installation process, financing, customer reviews, and a free-quote booking.' },
  { id: 'environment-recycling', prompt: 'Build a commercial recycling and waste management company website with service plans for businesses, a pickup scheduling flow, sustainability impact reporting, service areas, and a quote request.' },
  { id: 'space-launch', prompt: 'Create a website for a small-satellite launch provider that sells rideshare launch slots to enterprises, with a mission catalog and schedule, payload specs, a booking/reserve-a-slot inquiry, past missions, and technical documentation.' },
  { id: 'government-permits', prompt: 'Build a city government permits portal where residents and businesses can apply for permits, track application status, pay fees, upload documents, and book inspection appointments.' },
  { id: 'nonprofit-donations', prompt: 'Create a nonprofit website for a wildlife conservation charity with a donation flow, impact stories, ongoing campaigns, volunteer signup, and a recurring giving option.' },
];

const NATURES = ['beverage', 'food', 'physical-good', 'digital-good', 'service', 'content', 'software', 'media-stream', 'course', 'listing'];

for (const { id, prompt } of SECTORS) {
  const signals = extractSignals(prompt);
  const d = composeDiscovery(prompt, signals);
  const natureStr = NATURES
    .map((n) => [n, signalWeight(signals, 'product-nature', n)] as const)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([n, w]) => `${n}:${w}`)
    .join(' ');
  const goals = signalValues(signals, 'goal').join(',');
  console.log(`${id.padEnd(28)} | type="${d.businessType}"  sub=${d.subIndustry}`);
  console.log(`${''.padEnd(28)} | nature[${natureStr}] goal[${goals}]`);
  console.log(`${''.padEnd(28)} | intent: ${d.intent}`);
  console.log('');
}
