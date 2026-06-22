#!/usr/bin/env tsx
/**
 * P2: Adversarial Business Synthesis Verification
 * Tests that 50+ prompts across 8 business verticals generate meaningful
 * data models and page structures via the capability-driven architecture.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { BusinessIntelligenceEngine } from '../src/intelligence/business-intelligence-engine.js';
import { CapabilityGraph } from '../src/intelligence/capability-graph.js';
import { FullStackArchitect } from '../src/generation/architect.js';
import { DBCompiler } from '../src/core/db-compiler.js';
import { APICompiler } from '../src/core/api-compiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function section(name: string) {
  console.log(`\n═══ ${name} ═══`);
}

const intel = new BusinessIntelligenceEngine();
const graph = new CapabilityGraph();

// ═══════════════════════════════════════════════════════════════════
// Adversarial prompt definitions: 50+ prompts across 8 verticals
// ═══════════════════════════════════════════════════════════════════

interface VerticalTestCase {
  vertical: string;
  prompts: string[];
  requiredCapabilities: string[];
  minDataModels: number;
  minPages: number;
  minApiRoutes: number;
}

const verticals: VerticalTestCase[] = [
  {
    vertical: 'CRM',
    prompts: [
      'Build a real estate CRM for managing property leads, client interactions, and deal pipeline',
      'Build a sales CRM with contacts, companies, deals, and email integration',
      'Build a recruiting CRM to track candidates, job openings, and interview stages',
      'Build a customer support CRM with tickets, agents, SLA tracking, and escalation',
      'Build a nonprofit CRM to manage donor relationships, campaigns, and grant pipelines',
      'Build an insurance CRM with policy tracking, claims management, and agent commissions',
      'Build a B2B sales CRM with lead scoring, pipeline stages, and revenue forecasting',
    ],
    requiredCapabilities: ['crm'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Marketplace',
    prompts: [
      'Build a multi-vendor marketplace for handmade crafts with seller storefronts and buyer reviews',
      'Build a B2B wholesale marketplace for electronics with bulk pricing and purchase orders',
      'Build a freelance marketplace connecting clients with developers, designers, and writers',
      'Build a local services marketplace for home repair, cleaning, and plumbing',
      'Build a digital goods marketplace for selling software licenses and templates',
      'Build a rental marketplace for equipment, tools, and party supplies',
      'Build a farmer marketplace connecting local growers with restaurants and consumers',
    ],
    requiredCapabilities: ['marketplace'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Education',
    prompts: [
      'Build an online learning platform with courses, video lessons, quizzes, and student progress tracking',
      'Build a school management system with students, teachers, classes, and attendance',
      'Build a tutoring marketplace connecting students with tutors for live sessions',
      'Build a corporate training platform with employee courses, certifications, and completion tracking',
      'Build a language learning app with lessons, flashcards, and progress streaks',
      'Build a coding bootcamp platform with courses, lessons, student projects, and mentor matching',
      'Build a music school platform with instrument lessons, teacher scheduling, and recital tracking',
      'Build a cooking class platform with recipe courses, student enrollment, and certification',
    ],
    requiredCapabilities: ['education'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Healthcare',
    prompts: [
      'Build a clinic booking system with doctors, patients, appointments, and medical records',
      'Build a dental practice management tool with patient charts, billing, and insurance claims',
      'Build a telehealth platform for virtual consultations, prescriptions, and patient messaging',
      'Build a mental health practice app with therapist profiles, session notes, and billing',
      'Build a pharmacy management system with prescriptions, inventory, and patient profiles',
      'Build a physiotherapy clinic app with treatment plans, exercise tracking, and appointments',
    ],
    requiredCapabilities: ['healthcare-clinic'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Real Estate',
    prompts: [
      'Build a property listing site with search, filters, saved favorites, and agent contact',
      'Build a property management dashboard for landlords to track tenants, leases, and rent payments',
      'Build a real estate investment tracker with portfolio, cash flow projections, and ROI analysis',
      'Build a commercial real estate platform with property listings, tenant screening, and lease management',
      'Build a property flipping calculator with acquisition costs, renovation budgets, and profit projections',
      'Build a real estate agent referral network with agent profiles, commission tracking, and lead routing',
    ],
    requiredCapabilities: ['property-management'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Hospitality',
    prompts: [
      'Build a boutique hotel booking site with rooms, availability calendar, and guest reviews',
      'Build a vacation rental booking platform like Airbnb with host listings, guest reservations, and availability calendar',
      'Build a restaurant reservation system with table management, waitlists, and menu ordering',
      'Build a bed and breakfast booking site with room descriptions, guest preferences, and loyalty points',
      'Build a resort management system with villa bookings, activity scheduling, and guest services',
      'Build an eco-lodge booking platform with cabin reservations, nature tour scheduling, and guest reviews',
    ],
    requiredCapabilities: ['booking'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Logistics',
    prompts: [
      'Build a fleet management dashboard tracking vehicles, routes, fuel costs, and driver hours',
      'Build a warehouse inventory system with stock levels, reorder alerts, and supplier management',
      'Build a shipping aggregator comparing carriers, generating labels, and tracking deliveries',
      'Build a last-mile delivery optimizer with route planning, driver dispatch, and proof of delivery',
      'Build a cold chain shipping tracker with temperature monitoring, delivery tracking, and compliance alerts',
    ],
    requiredCapabilities: ['orders'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
  {
    vertical: 'Agency',
    prompts: [
      'Build a digital agency project tracker with clients, milestones, invoicing, and team assignment',
      'Build a creative agency project tracker with case studies, client milestones, team tasks, and contact form',
      'Build an SEO agency dashboard with project tracking, client reporting, and team collaboration',
      'Build a marketing agency dashboard with campaign project tracking, client portals, and team collaboration',
      'Build a consulting firm platform with project task tracking, team timesheets, and milestone deliverable management',
    ],
    requiredCapabilities: ['project-management', 'customer-management'],
    minDataModels: 2,
    minPages: 2,
    minApiRoutes: 2,
  },
];

// ═══════════════════════════════════════════════════════════════════
section('1. Adversarial Prompt Capability Detection (50+ prompts)');
// ═══════════════════════════════════════════════════════════════════

let totalPrompts = 0;
let detectedCorrectly = 0;

for (const vc of verticals) {
  for (const prompt of vc.prompts) {
    totalPrompts++;
    const result = intel.analyze(prompt);
    const hasRequired = vc.requiredCapabilities.every(cap =>
      intel.hasCapability(result, cap, 0.10),
    );

    if (hasRequired) detectedCorrectly++;
    assert(
      hasRequired,
      `[${vc.vertical}] "${prompt.slice(0, 60)}..." → detects ${vc.requiredCapabilities.join(', ')}`,
    );
  }
}

assert(totalPrompts >= 50, `Total prompts tested ≥ 50 (${totalPrompts})`);
assert(
  detectedCorrectly >= totalPrompts * 0.8,
  `Capability detection accuracy ≥ 80% (${detectedCorrectly}/${totalPrompts})`,
);

// ═══════════════════════════════════════════════════════════════════
section('2. Blueprint Generation — Differentiated Output');
// ═══════════════════════════════════════════════════════════════════

const blueprintResults: { vertical: string; dataModels: number; pages: number; apiRoutes: number }[] = [];

for (const vc of verticals) {
  const blueprint = FullStackArchitect.design(vc.prompts[0]!);

  const dm = blueprint.dataModels.length;
  const pg = blueprint.pages.length;
  const api = blueprint.apiRoutes.length;

  blueprintResults.push({ vertical: vc.vertical, dataModels: dm, pages: pg, apiRoutes: api });

  assert(dm >= vc.minDataModels, `[${vc.vertical}] ≥${vc.minDataModels} data models (${dm})`);
  assert(pg >= vc.minPages, `[${vc.vertical}] ≥${vc.minPages} pages (${pg})`);
  assert(api >= vc.minApiRoutes, `[${vc.vertical}] ≥${vc.minApiRoutes} API routes (${api})`);
}

// Verify cross-vertical differentiation
const uniqueModelSets = new Set(
  blueprintResults.map(r => `${r.dataModels}-${r.pages}-${r.apiRoutes}`),
);
assert(uniqueModelSets.size >= 4, `At least 4 distinct blueprint shapes across 8 verticals (${uniqueModelSets.size})`);

// ═══════════════════════════════════════════════════════════════════
section('3. DB Compiler — Schema Generation per Vertical');
// ═══════════════════════════════════════════════════════════════════

for (const vc of verticals) {
  const blueprint = FullStackArchitect.design(vc.prompts[0]!);
  const schema = DBCompiler.compileSchema(blueprint.dataModels);
  const hasModel = blueprint.dataModels.some(m => schema.includes(`model ${m.name}`));

  assert(hasModel, `[${vc.vertical}] Schema contains models from blueprint`);
  assert(schema.includes('datasource'), `[${vc.vertical}] Schema has datasource`);
  assert(schema.includes('generator'), `[${vc.vertical}] Schema has generator`);
}

// ═══════════════════════════════════════════════════════════════════
section('4. API Compiler — Route Generation per Vertical');
// ═══════════════════════════════════════════════════════════════════

const tmpApiDir = path.join(os.tmpdir(), `verify-api-${Date.now()}`);

for (const vc of verticals) {
  const blueprint = FullStackArchitect.design(vc.prompts[0]!);
  const modelCount = blueprint.dataModels.length;
  const expectedRoutes = modelCount * 2; // GET + POST per model

  try {
    APICompiler.compileAPIRoutes(tmpApiDir, blueprint.dataModels);

    // Verify files were created
    for (const model of blueprint.dataModels) {
      const routeFile = path.join(tmpApiDir, 'src', 'app', 'api', model.name.toLowerCase(), 'route.ts');
      assert(fs.existsSync(routeFile), `[${vc.vertical}] ${model.name} route file exists`);
    }

    assert(
      modelCount >= 2,
      `[${vc.vertical}] Has at least 2 models generating API routes (${modelCount})`,
    );
  } catch (e: any) {
    assert(false, `[${vc.vertical}] APICompiler threw: ${e.message}`);
  }
}

// Cleanup temp dir
try { fs.rmSync(tmpApiDir, { recursive: true, force: true }); } catch {}

// ═══════════════════════════════════════════════════════════════════
section('5. Capability Graph — Dependency Resolution');
// ═══════════════════════════════════════════════════════════════════

for (const vc of verticals) {
  const result = intel.analyze(vc.prompts[0]!);
  const detectedCaps = intel.getTopCapabilities(result, 0.15);

  if (detectedCaps.length > 0) {
    const resolved = graph.resolve(detectedCaps);
    const ids = resolved.map(n => n.id);
    assert(
      ids.length >= detectedCaps.length,
      `[${vc.vertical}] Transitive deps expand capability set (${ids.length} ≥ ${detectedCaps.length})`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
section('6. Edge Cases — Ambiguous or Tricky Prompts');
// ═══════════════════════════════════════════════════════════════════

const edgePrompts: { prompt: string; mustDetect: string; label: string }[] = [
  { prompt: 'I need a booking thing for my yoga studio', mustDetect: 'booking', label: 'Vague yoga booking' },
  { prompt: 'A dashboard that shows me all my clients and their deals', mustDetect: 'crm', label: 'Vague CRM dashboard' },
  { prompt: 'An app where people can list items for sale on a marketplace and others buy them', mustDetect: 'marketplace', label: 'Vague marketplace' },
  { prompt: 'My dental office needs better patient scheduling', mustDetect: 'healthcare-clinic', label: 'Dental scheduling' },
  { prompt: 'We manage 200 rental properties and need to track leases and rent', mustDetect: 'property-management', label: 'Property management' },
  { prompt: 'My restaurant needs online reservations and waitlist management', mustDetect: 'food-beverage', label: 'Restaurant ordering' },
  { prompt: 'I want to track my shipping deliveries and compare carrier prices', mustDetect: 'orders', label: 'Shipping tracker' },
  { prompt: 'Build me a store to sell digital art prints with checkout and payment', mustDetect: 'commerce', label: 'Digital product store' },
];

for (const ep of edgePrompts) {
  const result = intel.analyze(ep.prompt);
  assert(
    intel.hasCapability(result, ep.mustDetect, 0.05),
    `[Edge] "${ep.label}" → detects ${ep.mustDetect}`,
  );
}

// ═══════════════════════════════════════════════════════════════════
section('7. Adversarial — No False Positives on Irrelevant Prompts');
// ═══════════════════════════════════════════════════════════════════

const irrelevantPrompts: { prompt: string; mustNotDetect: string; label: string }[] = [
  { prompt: 'A blog about hiking in the Alps', mustNotDetect: 'marketplace', label: 'Hiking blog → no marketplace' },
  { prompt: 'A portfolio site for a photographer', mustNotDetect: 'crm', label: 'Photographer portfolio → no CRM' },
  { prompt: 'A recipe book app for cooking Italian food', mustNotDetect: 'healthcare-clinic', label: 'Recipe book → no healthcare' },
];

for (const ip of irrelevantPrompts) {
  const result = intel.analyze(ip.prompt);
  assert(
    !intel.hasCapability(result, ip.mustNotDetect, 0.20),
    `[Edge] "${ip.label}" → does NOT detect ${ip.mustNotDetect}`,
  );
}

// ═══════════════════════════════════════════════════════════════════
section('8. Adversarial — Hybrid Business Detection');
// ═══════════════════════════════════════════════════════════════════

const hybridPrompts: { prompt: string; expects: string[]; label: string }[] = [
  { prompt: 'A gym that sells supplements and books personal training sessions', expects: ['fitness-wellness', 'commerce', 'booking'], label: 'Gym + supplements + booking' },
  { prompt: 'A hotel that offers room reservations, restaurant dining, and spa appointments', expects: ['booking'], label: 'Hotel + restaurant + spa' },
  { prompt: 'A veterinary clinic that sells pet food and offers grooming appointments', expects: ['healthcare-clinic', 'commerce', 'booking'], label: 'Vet + pet store + grooming' },
  { prompt: 'An agency that does web design projects with task boards, sells digital templates, and books strategy calls with clients', expects: ['project-management', 'commerce', 'booking'], label: 'Agency + templates + calls' },
];

for (const hp of hybridPrompts) {
  const result = intel.analyze(hp.prompt);
  for (const cap of hp.expects) {
    assert(
      intel.hasCapability(result, cap, 0.10),
      `[Hybrid] "${hp.label}" → detects ${cap}`,
    );
  }
  assert(result.hybridModels.length > 0, `[Hybrid] "${hp.label}" → identifies hybrid models`);
}

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════

console.log(`\n═══════════════════════════════════════════════════════════════════`);
console.log(`  SUMMARY`);
console.log(`═══════════════════════════════════════════════════════════════════`);
console.log(`\n  ${passed} passed, ${failed} failed, ${passed + failed} total\n`);

if (failed > 0) {
  console.error('✗ Some adversarial verification checks failed.\n');
  process.exit(1);
} else {
  console.log('✓ All adversarial verification checks passed.\n');
  process.exit(0);
}
