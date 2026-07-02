/**
 * Phase C — Benchmark 20 diverse apps through the BRE pipeline.
 *
 * Runs each prompt through the full deterministic pipeline (intake → scoring → blueprint),
 * scores against expected industry/pages/vocabulary/pattern, and writes results.
 *
 * Usage: npx tsx scripts/benchmark-20.ts
 */

import { buildBREContext, detectIndustryWithScore, getIndustryScore } from '../src/bos/intake-parser.js';
import { runBREV2Pipeline } from '../src/bos/bre-v2-pipeline.js';
import { PATTERNS } from '../src/bos/knowledge/registry.js';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkCase {
  prompt: string;
  expectedIndustry: string;
  expectedPages: string[];
  expectedPatternId?: string;
  expectedVocabulary?: Record<string, string>;
  noSpuriousCommerce: boolean; // should NOT have /shop, /cart etc.
}

interface BenchmarkResult {
  prompt: string;
  detectedIndustry: string;
  expectedIndustry: string;
  industryCorrect: boolean;
  selectedPatternName: string;
  selectedPatternId: string;
  expectedPatternId: string | undefined;
  patternCorrect: boolean;
  pagesGenerated: string[];
  expectedPages: string[];
  pagesScore: number; // 0-1: fraction of expected pages present
  spuriousCommerce: boolean;
  vocabularyKeys: string[];
  hasRoles: boolean;
  hasKPIs: boolean;
  hasWorkflows: boolean;
  score: number; // 0-6
  details: string[];
  duration: number;
}

const BENCHMARKS: BenchmarkCase[] = [
  {
    prompt: 'Build ERP for hospitals with patient management, appointments, pharmacy, lab, billing, and staff modules',
    expectedIndustry: 'enterprise-software',
    expectedPages: ['/', '/patients', '/appointments', '/doctors', '/pharmacy', '/lab', '/billing', '/staff', '/reports'],
    expectedPatternId: 'pattern.healthcare.hospital-management',
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a school management system with student registration, attendance tracking, exam management, and fee collection',
    expectedIndustry: 'education',
    expectedPages: ['/', '/students', '/classes', '/teachers', '/attendance', '/exams', '/fees', '/timetable', '/reports'],
    expectedPatternId: 'pattern.education.school-management',
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a logistics platform for fleet management, shipment tracking, driver dispatching, and route optimization',
    expectedIndustry: 'logistics',
    expectedPages: ['/', '/shipments', '/drivers', '/routes', '/warehouses', '/tracking', '/reports'],
    expectedPatternId: 'pattern.logistics.platform',
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build an HRMS for a manufacturing company with employee management, attendance, leave, payroll, and recruitment',
    expectedIndustry: 'enterprise-software',
    expectedPages: ['/', '/employees', '/attendance', '/leave', '/payroll', '/recruitment', '/performance', '/reports'],
    expectedPatternId: 'pattern.enterprise.hrm-system',
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build an online clothing store with product catalog, shopping cart, checkout, and order tracking',
    expectedIndustry: 'ecommerce',
    expectedPages: ['/', '/shop', '/cart', '/checkout', '/orders'],
    noSpuriousCommerce: false,
  },
  {
    prompt: 'Build a restaurant POS system with menu management, table booking, order taking, and billing',
    expectedIndustry: 'restaurant',
    expectedPages: ['/', '/menu', '/reservations', '/orders', '/staff'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a CRM system for a sales team with lead tracking, pipeline management, accounts, and reports',
    expectedIndustry: 'enterprise-software',
    expectedPages: ['/', '/leads', '/pipeline', '/accounts', '/contacts', '/tasks', '/reports', '/settings'],
    expectedPatternId: 'pattern.enterprise.crm',
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a real estate portal with property listings, search, agent contact, and mortgage calculator',
    expectedIndustry: 'real-estate',
    expectedPages: ['/', '/properties', '/agents', '/contact'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a law firm management system with case tracking, client management, document management, billing',
    expectedIndustry: 'legal',
    expectedPages: ['/', '/cases', '/clients', '/documents', '/billing', '/calendar'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a hotel booking system with room listings, availability calendar, reservation management, and check-in/out',
    expectedIndustry: 'hospitality',
    expectedPages: ['/', '/rooms', '/bookings', '/guests', '/housekeeping'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a fitness studio app with class scheduling, membership plans, trainer profiles, and booking',
    expectedIndustry: 'fitness',
    expectedPages: ['/', '/classes', '/trainers', '/membership', '/schedule'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a warehouse management system with inventory tracking, receiving, putaway, picking, and shipping',
    expectedIndustry: 'enterprise-software',
    expectedPages: ['/', '/inventory', '/receiving', '/putaway', '/picking', '/shipping', '/reports'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build an insurance portal with policy management, claims processing, customer portal, and agent dashboard',
    expectedIndustry: 'fintech',
    expectedPages: ['/', '/policies', '/claims', '/customers', '/agents', '/reports'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a construction management platform with project tracking, contractor management, material procurement, and site reports',
    expectedIndustry: 'enterprise-software',
    expectedPages: ['/', '/projects', '/contractors', '/materials', '/sites', '/reports'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a clinic management system with patient records, appointment scheduling, prescriptions, and billing',
    expectedIndustry: 'healthcare',
    expectedPages: ['/', '/patients', '/appointments', '/prescriptions', '/billing', '/doctors'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build an event management platform with event creation, ticket sales, attendee management, and scheduling',
    expectedIndustry: 'events',
    expectedPages: ['/', '/events', '/tickets', '/attendees', '/schedule'],
    noSpuriousCommerce: false,
  },
  {
    prompt: 'Build a banking dashboard with account management, transaction history, fund transfers, and statements',
    expectedIndustry: 'fintech',
    expectedPages: ['/', '/accounts', '/transactions', '/transfers', '/statements'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build a travel agency system with trip booking, itinerary management, customer profiles, and payments',
    expectedIndustry: 'travel',
    expectedPages: ['/', '/trips', '/itineraries', '/customers', '/bookings'],
    noSpuriousCommerce: false,
  },
  {
    prompt: 'Build a nonprofit donor management platform with donation tracking, campaign management, volunteer coordination, and reports',
    expectedIndustry: 'nonprofit',
    expectedPages: ['/', '/donations', '/campaigns', '/volunteers', '/reports'],
    noSpuriousCommerce: true,
  },
  {
    prompt: 'Build an e-learning platform with course management, student enrollment, progress tracking, and assessments',
    expectedIndustry: 'education',
    expectedPages: ['/', '/courses', '/students', '/progress', '/assessments', '/reports'],
    noSpuriousCommerce: true,
  },
];

async function runBenchmark(): Promise<void> {
  const results: BenchmarkResult[] = [];
  const start = Date.now();

  for (let i = 0; i < BENCHMARKS.length; i++) {
    const b = BENCHMARKS[i];
    const t0 = Date.now();
    const errors: string[] = [];

    try {
      // Step 1: Intake
      const detection = detectIndustryWithScore(b.prompt);
      const ctx = buildBREContext(b.prompt);
      const industryScore = getIndustryScore(ctx);

      // Step 2: Pipeline
      const breResult = await runBREV2Pipeline(ctx, undefined, industryScore);
      const bp = breResult.blueprint;
      const duration = Date.now() - t0;

      // Step 3: Score
      let score = 0;

      // 3a: Industry correct?
      const industryCorrect = ctx.industry === b.expectedIndustry;
      if (industryCorrect) score++;
      else errors.push(`Industry: got "${ctx.industry}", expected "${b.expectedIndustry}"`);

      // 3b: Expected pattern used?
      const patternCorrect = b.expectedPatternId
        ? breResult.selectedPattern?.id === b.expectedPatternId
        : true;
      if (patternCorrect || !b.expectedPatternId) score++;
      else errors.push(`Pattern: got "${breResult.selectedPattern?.id}", expected "${b.expectedPatternId}"`);

      // 3c: Expected pages present?
      const bpPaths = new Set(bp.pages.map(p => p.path));
      const expectedPresent = b.expectedPages.filter(p => bpPaths.has(p));
      const pagesScore = b.expectedPages.length > 0
        ? expectedPresent.length / b.expectedPages.length
        : 0;
      if (pagesScore >= 0.5) score++;
      if (pagesScore >= 0.8) score++; // bonus for high coverage
      if (expectedPresent.length < b.expectedPages.length) {
        const missing = b.expectedPages.filter(p => !bpPaths.has(p));
        errors.push(`Missing pages: ${missing.join(', ')}`);
      }

      // 3d: No spurious commerce pages?
      const commercePaths = ['/shop', '/cart', '/checkout'];
      const hasSpuriousCommerce = b.noSpuriousCommerce && commercePaths.some(p => bpPaths.has(p));
      if (!hasSpuriousCommerce) score++;
      else errors.push(`Spurious commerce pages found: ${commercePaths.filter(p => bpPaths.has(p)).join(', ')}`);

      // 3e: Enterprise fields populated?
      const hasRoles = bp.permissions.length > 0;
      const hasKPIs = (bp as any).kpis?.length > 0 || bp.dashboardWidgets.length > 0;
      const hasWorkflows = bp.workflows.length > 0;
      if (b.expectedPatternId) {
        if (hasRoles) score++;
        else errors.push('No permissions/roles generated');
      }

      // 3f: Vocabulary applied?
      const vocabKeys = Object.keys(bp.vocabulary ?? {});
      if (vocabKeys.length > 0) score++;
      else if (b.expectedPatternId) errors.push('No vocabulary applied');

      // Log progress
      const totalScore = score;
      process.stdout.write(`[${i + 1}/20] "${b.prompt.slice(0, 40)}..." → industry=${ctx.industry}, pattern=${breResult.selectedPattern?.name ?? 'none'}, score=${totalScore}/6 (${duration}ms)\n`);

      results.push({
        prompt: b.prompt,
        detectedIndustry: ctx.industry,
        expectedIndustry: b.expectedIndustry,
        industryCorrect,
        selectedPatternName: breResult.selectedPattern?.name ?? 'none',
        selectedPatternId: breResult.selectedPattern?.id ?? 'none',
        expectedPatternId: b.expectedPatternId,
        patternCorrect: b.expectedPatternId ? breResult.selectedPattern?.id === b.expectedPatternId : true,
        pagesGenerated: bp.pages.map(p => p.path),
        expectedPages: b.expectedPages,
        pagesScore: Math.round(pagesScore * 100) / 100,
        spuriousCommerce: hasSpuriousCommerce,
        vocabularyKeys: vocabKeys,
        hasRoles,
        hasKPIs,
        hasWorkflows,
        score: totalScore,
        details: errors,
        duration,
      });
    } catch (e: any) {
      process.stdout.write(`[${i + 1}/20] "${b.prompt.slice(0, 40)}..." → ERROR: ${e.message}\n`);
      results.push({
        prompt: b.prompt,
        detectedIndustry: 'ERROR',
        expectedIndustry: b.expectedIndustry,
        industryCorrect: false,
        selectedPatternName: 'ERROR',
        selectedPatternId: 'ERROR',
        expectedPatternId: b.expectedPatternId,
        patternCorrect: false,
        pagesGenerated: [],
        expectedPages: b.expectedPages,
        pagesScore: 0,
        spuriousCommerce: false,
        vocabularyKeys: [],
        hasRoles: false,
        hasKPIs: false,
        hasWorkflows: false,
        score: 0,
        details: [`Exception: ${e.message}`],
        duration: Date.now() - t0,
      });
    }
  }

  // Summary
  const totalDuration = Date.now() - start;
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = BENCHMARKS.length * 6;
  const avgPagesScore = results.reduce((s, r) => s + r.pagesScore, 0) / results.length;
  const industryMatchCount = results.filter(r => r.industryCorrect).length;
  const patternMatchCount = results.filter(r => r.patternCorrect).length;

  const summary = {
    totalBenchmarks: BENCHMARKS.length,
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    industryMatchRate: `${industryMatchCount}/${BENCHMARKS.length}`,
    patternMatchRate: `${patternMatchCount}/${BENCHMARKS.filter(b => b.expectedPatternId).length}`,
    avgPagesScore: Math.round(avgPagesScore * 100) / 100,
    totalDurationMs: totalDuration,
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  BENCHMARK SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`  Score: ${summary.totalScore}/${summary.maxScore} (${summary.percentage}%)`);
  console.log(`  Industry match: ${summary.industryMatchRate}`);
  console.log(`  Pattern match: ${summary.patternMatchRate}`);
  console.log(`  Avg pages coverage: ${summary.avgPagesScore}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════\n');

  // Write results
  const output = { summary, results, timestamp: new Date().toISOString() };
  const outPath = path.resolve('./scripts/benchmark-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Results written to ${outPath}`);

  // Print individual failures
  const failures = results.filter(r => r.details.length > 0);
  if (failures.length > 0) {
    console.log('\n⚠  Failures:');
    for (const f of failures) {
      console.log(`  [${f.score}/6] ${f.prompt.slice(0, 50)}...`);
      for (const d of f.details.slice(0, 3)) {
        console.log(`    - ${d}`);
      }
    }
  }
}

runBenchmark().catch(console.error);
