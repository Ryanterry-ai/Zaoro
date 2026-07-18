// ─── Multi-sector stress harness ─────────────────────────────────────────────
// Runs the REAL build pipeline (canonical build → BRE context → render →
// verification loop) across a diverse prompt set sampled from the full business
// taxonomy, and emits a machine-readable coverage report. No mocks.
//
// Usage: node node_modules/tsx/dist/cli.mjs scripts/stress-sectors.ts
// Output: stress-report.json + a console summary.

import { runCanonicalBuild } from '../src/orchestration/pipeline/canonical-build.js';
import { buildBREContext } from '../src/bos/intake-parser.js';
import { runBuildPipeline } from '../src/generation/build-pipeline.js';
import { runVerificationLoop } from '../src/orchestration/verification/loop.js';
import { executeRepair } from '../src/orchestration/verification/repair-executor.js';
import fs from 'fs';
import path from 'path';

interface Case {
  id: string;
  sector: string;
  model: string;
  prompt: string;
}

// One representative prompt per sampled sector × business model. Deliberately
// spans very different Entities/Capabilities so gaps surface.
const CASES: Case[] = [
  { id: 'agriculture-organic-farm', sector: 'Agriculture', model: 'D2C', prompt: 'Build a website for an organic family farm that sells fresh seasonal vegetables and eggs directly to local households through a weekly subscription box, with a farm story, meet-the-farmers section, delivery zones, and the ability to pause or customize each week\'s box.' },
  { id: 'foodbev-cloud-kitchen', sector: 'Food & Beverage', model: 'Ecommerce', prompt: 'Create a site for a cloud kitchen selling healthy meal bowls with online ordering, a browsable menu with nutrition info, cart and checkout, delivery tracking, and customer reviews.' },
  { id: 'manufacturing-cnc', sector: 'Manufacturing', model: 'B2B', prompt: 'Build a B2B website for a precision CNC machining manufacturer that serves aerospace clients, with a capabilities catalog, request-for-quote workflow, certifications, case studies, and an engineer contact form.' },
  { id: 'tech-devops-saas', sector: 'Technology', model: 'SaaS', prompt: 'Create a SaaS product website for a DevOps observability platform with tiered pricing, a feature dashboard preview, free-trial signup, API documentation link, customer logos, and a request-a-demo flow.' },
  { id: 'healthcare-telemedicine', sector: 'Healthcare', model: 'Services', prompt: 'Build a telemedicine clinic website where patients can book video consultations with doctors, see specialties, view doctor profiles, manage appointments, and access their visit records securely.' },
  { id: 'finance-wealth', sector: 'Finance', model: 'Services', prompt: 'Create a wealth management advisory website that builds trust with high-net-worth clients, explains portfolio strategies, shows the advisory team, offers a consultation booking, and emphasizes compliance and security.' },
  { id: 'education-bootcamp', sector: 'Education', model: 'Subscription', prompt: 'Build an online coding bootcamp website with a course catalog, curriculum breakdown, instructor bios, student outcomes, cohort schedule, enrollment/checkout, and a learning dashboard.' },
  { id: 'proservices-law', sector: 'Professional Services', model: 'Agency', prompt: 'Create a law firm website for a boutique corporate practice, with practice areas, attorney profiles, case results, insights/blog, and a confidential consultation request form.' },
  { id: 'realestate-brokerage', sector: 'Real Estate', model: 'Marketplace', prompt: 'Build a real estate brokerage website with searchable property listings, map view, filters by price and bedrooms, agent profiles, saved favorites, and a schedule-a-viewing booking flow.' },
  { id: 'transport-lastmile', sector: 'Transportation', model: 'On-demand', prompt: 'Create a last-mile delivery logistics company website with on-demand booking of a courier, live tracking, service coverage map, pricing calculator by distance and weight, and a business API signup.' },
  { id: 'hospitality-boutique-hotel', sector: 'Hospitality & Tourism', model: 'B2C', prompt: 'Build a boutique hotel website with room types and photo galleries, real-time availability and reservation booking, amenities, local experiences, guest reviews, and a concierge contact.' },
  { id: 'media-streaming', sector: 'Media & Entertainment', model: 'Subscription', prompt: 'Create a streaming service website for independent films with a browsable catalog by genre, film detail pages with trailers, subscription plans, account signup, and a watchlist.' },
  { id: 'sports-crossfit', sector: 'Sports & Fitness', model: 'Membership', prompt: 'Build a CrossFit gym website with class schedule and booking, membership plans, coach profiles, a free trial signup, transformation stories, and a members dashboard.' },
  { id: 'energy-solar', sector: 'Energy', model: 'B2C', prompt: 'Create a residential solar installer website with a savings calculator based on the roof and bill, product options, installation process, financing, customer reviews, and a free-quote booking.' },
  { id: 'environment-recycling', sector: 'Environment', model: 'B2B', prompt: 'Build a commercial recycling and waste management company website with service plans for businesses, a pickup scheduling flow, sustainability impact reporting, service areas, and a quote request.' },
  { id: 'space-launch', sector: 'Space', model: 'Enterprise', prompt: 'Create a website for a small-satellite launch provider that sells rideshare launch slots to enterprises, with a mission catalog and schedule, payload specs, a booking/reserve-a-slot inquiry, past missions, and technical documentation.' },
  { id: 'nonprofit-conservation', sector: 'Nonprofit', model: 'Donation', prompt: 'Build a wildlife conservation nonprofit website that tells the mission story, shows impact metrics, has recurring and one-time donation flows, volunteer signup, and a newsletter subscribe.' },
  { id: 'emerging-ai-agents', sector: 'Emerging', model: 'Usage-based', prompt: 'Create a website for an AI agents platform that lets businesses build and deploy autonomous agents, with usage-based pricing, an interactive agent builder demo, docs, templates gallery, and a signup.' },
];

async function runOne(c: Case) {
  const started = Date.now();
  try {
    const canonical = await runCanonicalBuild({ prompt: c.prompt });
    const bk = canonical.businessKnowledge;
    const ctx = await buildBREContext(c.prompt);
    (ctx as any).businessKnowledge = bk;
    const WS = path.join(process.cwd(), 'sandbox_workspaces', `ws-stress-${c.id}`);
    const result = await runBuildPipeline(ctx, { platform: 'react', outputDir: path.join(WS, 'src'), workspaceDir: WS });
    const { report, iterations } = await runVerificationLoop(
      {
        files: result.renderResult.files.map((f) => ({ path: f.path, content: f.content })),
        businessKnowledge: bk,
        rawPrompt: c.prompt,
      },
      executeRepair,
      8,
    );
    return {
      id: c.id,
      sector: c.sector,
      model: c.model,
      ok: true,
      passed: report.passed,
      score: Number(report.score.toFixed(3)),
      iterations,
      files: result.renderResult.files.length,
      contentFidelity: report.dimensions?.contentFidelity ?? null,
      experienceFidelity: report.dimensions?.experienceFidelity ?? null,
      businessType: bk.discovery?.businessType ?? '',
      domainNouns: (bk.vocabulary?.domainNouns ?? []).slice(0, 6),
      conversion: bk.intents?.conversion ?? [],
      interaction: bk.intents?.interaction ?? [],
      errorGaps: report.gaps.filter((g) => g.severity === 'error').map((g) => `${g.category}: ${g.detail}`),
      warnGaps: report.gaps.filter((g) => g.severity === 'warning').map((g) => `${g.category}: ${g.detail}`),
      ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      id: c.id, sector: c.sector, model: c.model, ok: false, passed: false, score: 0,
      error: String(e?.message ?? e).slice(0, 300), ms: Date.now() - started,
    };
  }
}

async function main() {
  const results = [];
  for (const c of CASES) {
    process.stdout.write(`\n▶ ${c.id.padEnd(30)} `);
    const r = await runOne(c);
    results.push(r);
    if (!r.ok) process.stdout.write(`CRASH: ${(r as any).error}`);
    else process.stdout.write(`${r.passed ? 'PASS' : 'FAIL'} score=${r.score} iters=${r.iterations} type="${r.businessType}"`);
  }

  const total = results.length;
  const crashed = results.filter((r) => !r.ok).length;
  const passed = results.filter((r) => r.ok && r.passed).length;
  const failed = total - passed - crashed;

  console.log('\n\n═══════════ COVERAGE SUMMARY ═══════════');
  console.log(`  total   : ${total}`);
  console.log(`  passed  : ${passed}`);
  console.log(`  failed  : ${failed}`);
  console.log(`  crashed : ${crashed}`);
  console.log('────────────────────────────────────────');
  for (const r of results) {
    const tag = !r.ok ? 'CRASH' : r.passed ? 'PASS ' : 'FAIL ';
    console.log(`  [${tag}] ${r.sector.padEnd(24)} ${r.id}`);
    if (r.ok && !r.passed) (r as any).errorGaps?.forEach((g: string) => console.log(`          × ${g}`));
    if (!r.ok) console.log(`          × ${(r as any).error}`);
  }

  fs.writeFileSync(path.join(process.cwd(), 'stress-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary: { total, passed, failed, crashed }, results }, null, 2));
  console.log('\nWrote stress-report.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
