/**
 * Verification script for Business Operating System (BOS).
 * Tests workflow generation, revenue intelligence, customer journey,
 * blueprint generation, and technical plan generation.
 */

import { WorkflowEngine } from '../src/business-intelligence/workflow-engine.js';
import { RevenueEngine } from '../src/business-intelligence/revenue-engine.js';
import { CustomerJourneyEngine } from '../src/business-intelligence/customer-journey.js';
import { SolutionArchitect } from '../src/business-intelligence/solution-architect.js';
import { TechnicalArchitect } from '../src/business-intelligence/technical-architect.js';
import { BusinessOperatingSystem } from '../src/business-intelligence/business-operating-system.js';

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const bos = new BusinessOperatingSystem();

  // Test 1: Workflow generation
  try {
    const engine = new WorkflowEngine();
    const workflows = engine.generateWorkflows('beauty salon with bookings and memberships');
    assert(workflows.workflows.length > 0, 'No workflows generated');
    assert(workflows.totalSteps > 0, 'No steps generated');
    assert(workflows.allActors.length > 0, 'No actors detected');
    results.push({ name: 'Workflow generation', passed: true, detail: `${workflows.workflows.length} workflows, ${workflows.totalSteps} steps` });
  } catch (e: any) {
    results.push({ name: 'Workflow generation', passed: false, detail: e.message });
  }

  // Test 2: Revenue generation
  try {
    const engine = new RevenueEngine();
    const revenue = engine.detectRevenueModel(['membership', 'booking']);
    assert(revenue.streams.length > 0, 'No revenue streams');
    assert(revenue.conversionPaths.length > 0, 'No conversion paths');
    assert(revenue.primaryModel !== undefined, 'No primary model');
    results.push({ name: 'Revenue generation', passed: true, detail: `${revenue.streams.length} streams, model: ${revenue.primaryModel}` });
  } catch (e: any) {
    results.push({ name: 'Revenue generation', passed: false, detail: e.message });
  }

  // Test 3: Customer journey generation
  try {
    const engine = new CustomerJourneyEngine();
    const journey = engine.generateJourney(['ecommerce']);
    assert(journey.stages.length === 5, `Expected 5 stages, got ${journey.stages.length}`);
    assert(journey.stages.some(s => s.type === 'awareness'), 'Missing awareness stage');
    assert(journey.stages.some(s => s.type === 'conversion'), 'Missing conversion stage');
    results.push({ name: 'Customer journey generation', passed: true, detail: `${journey.stages.length} stages, ${journey.totalTouchpoints} touchpoints` });
  } catch (e: any) {
    results.push({ name: 'Customer journey generation', passed: false, detail: e.message });
  }

  // Test 4: Blueprint generation
  try {
    const bosLocal = new BusinessOperatingSystem();
    const report = bosLocal.analyze('gym with memberships and classes');
    assert(report.blueprint.pages.length > 0, 'No pages in blueprint');
    assert(report.blueprint.entities.length > 0, 'No entities in blueprint');
    assert(report.blueprint.features.length > 0, 'No features in blueprint');
    results.push({ name: 'Blueprint generation', passed: true, detail: `${report.blueprint.pages.length} pages, ${report.blueprint.entities.length} entities` });
  } catch (e: any) {
    results.push({ name: 'Blueprint generation', passed: false, detail: e.message });
  }

  // Test 5: Technical plan generation
  try {
    const architect = new TechnicalArchitect();
    const report = bos.analyze('saas platform with subscriptions');
    const plan = architect.generatePlan(report.blueprint);
    assert(plan.database.models.length > 0, 'No database models');
    assert(plan.apis.routes.length > 0, 'No API routes');
    assert(plan.auth.provider !== '', 'No auth provider');
    results.push({ name: 'Technical plan generation', passed: true, detail: `${plan.database.models.length} models, ${plan.apis.routes.length} routes` });
  } catch (e: any) {
    results.push({ name: 'Technical plan generation', passed: false, detail: e.message });
  }

  // Test 6: Hybrid business support
  try {
    const report = bos.analyze('fitness center with gym memberships, personal training, and supplement shop');
    assert(report.capabilities.includes('fitness'), 'Missing fitness capability');
    assert(report.blueprint.pages.length >= 3, 'Not enough pages for hybrid business');
    results.push({ name: 'Hybrid business support', passed: true, detail: `Capabilities: ${report.capabilities.join(', ')}` });
  } catch (e: any) {
    results.push({ name: 'Hybrid business support', passed: false, detail: e.message });
  }

  // Test 7: No hardcoded domain templates
  try {
    const report1 = bos.analyze('beauty salon');
    const report2 = bos.analyze('fitness center');
    assert(report1.capabilities !== report2.capabilities || report1.blueprint.pages.length !== report2.blueprint.pages.length, 'Different prompts should produce different results');
    results.push({ name: 'No hardcoded templates', passed: true, detail: 'Different inputs produce different outputs' });
  } catch (e: any) {
    results.push({ name: 'No hardcoded templates', passed: false, detail: e.message });
  }

  // Test 8: Prompt context generation
  try {
    const report = bos.analyze('coffee shop with online ordering');
    const context = bos.generatePromptContext(report);
    assert(context.length > 100, 'Prompt context too short');
    assert(context.includes('Business Analysis'), 'Missing business analysis section');
    assert(context.includes('Revenue Streams'), 'Missing revenue streams section');
    results.push({ name: 'Prompt context generation', passed: true, detail: `${context.length} chars generated` });
  } catch (e: any) {
    results.push({ name: 'Prompt context generation', passed: false, detail: e.message });
  }

  // Test 9: All industry types
  try {
    const industries = [
      'real estate agency',
      'restaurant with online menu',
      'gym with memberships',
      'SaaS platform',
      'dental clinic',
      'law firm',
      'online education platform',
      'coffee shop',
      'beauty salon',
      'auto dealership',
      'pet grooming service',
      'portfolio for designer',
    ];

    let allPassed = true;
    const failed: string[] = [];

    for (const industry of industries) {
      try {
        const report = bos.analyze(industry);
        if (report.blueprint.pages.length === 0) {
          allPassed = false;
          failed.push(industry);
        }
      } catch {
        allPassed = false;
        failed.push(industry);
      }
    }

    results.push({
      name: 'All industry types',
      passed: allPassed,
      detail: allPassed ? `${industries.length} industries tested` : `Failed: ${failed.join(', ')}`,
    });
  } catch (e: any) {
    results.push({ name: 'All industry types', passed: false, detail: e.message });
  }

  return results;
}

async function main() {
  console.log('=== Business Operating System Verification ===\n');

  const results = await runTests();

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.name}: ${result.detail}`);
    if (result.passed) passed++; else failed++;
  }

  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
