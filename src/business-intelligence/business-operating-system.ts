/**
 * Business Operating System (BOS): Orchestrates all business analysis modules
 * into a single BusinessOperatingSystemReport for code generation.
 */

import { WorkflowEngine, type WorkflowGraph } from './workflow-engine.js';
import { RevenueEngine, type RevenueModel } from './revenue-engine.js';
import { CustomerJourneyEngine, type CustomerJourneyGraph } from './customer-journey.js';
import { SolutionArchitect, type ApplicationBlueprint } from './solution-architect.js';
import { TechnicalArchitect, type TechnicalPlan } from './technical-architect.js';

export interface BusinessOperatingSystemReport {
  prompt: string;
  capabilities: string[];
  workflows: WorkflowGraph;
  revenue: RevenueModel;
  journey: CustomerJourneyGraph;
  blueprint: ApplicationBlueprint;
  technicalPlan: TechnicalPlan;
  generatedAt: string;
  durationMs: number;
}

// ─── Business Operating System ───────────────────────────────────

export class BusinessOperatingSystem {
  private workflowEngine: WorkflowEngine;
  private revenueEngine: RevenueEngine;
  private journeyEngine: CustomerJourneyEngine;
  private solutionArchitect: SolutionArchitect;
  private technicalArchitect: TechnicalArchitect;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
    this.revenueEngine = new RevenueEngine();
    this.journeyEngine = new CustomerJourneyEngine();
    this.solutionArchitect = new SolutionArchitect();
    this.technicalArchitect = new TechnicalArchitect();
  }

  /**
   * Run complete BOS analysis. Single synchronous flow, no LLM calls.
   * All analysis is deterministic and capability-driven.
   */
  analyze(prompt: string): BusinessOperatingSystemReport {
    const startTime = Date.now();
    console.log('='.repeat(60));
    console.log('BUSINESS OPERATING SYSTEM');
    console.log('='.repeat(60));

    // Step 1: Detect capabilities from prompt
    console.log('[BOS] Step 1: Detecting capabilities...');
    const capabilities = this.workflowEngine.detectCapabilities(prompt);
    console.log(`[BOS] Capabilities: ${capabilities.join(', ')}`);

    // Step 2: Generate workflows
    console.log('[BOS] Step 2: Generating workflows...');
    const workflows = this.workflowEngine.generateWorkflows(prompt);
    console.log(`[BOS] Workflows: ${workflows.workflows.length}, Steps: ${workflows.totalSteps}`);

    // Step 3: Generate revenue model
    console.log('[BOS] Step 3: Generating revenue model...');
    const revenue = this.revenueEngine.detectRevenueModel(capabilities);
    console.log(`[BOS] Revenue streams: ${revenue.streams.length}, Model: ${revenue.primaryModel}`);

    // Step 4: Generate customer journey
    console.log('[BOS] Step 4: Generating customer journey...');
    const journey = this.journeyEngine.generateJourney(capabilities);
    console.log(`[BOS] Journey stages: ${journey.stages.length}, Touchpoints: ${journey.totalTouchpoints}`);

    // Step 5: Generate application blueprint
    console.log('[BOS] Step 5: Generating application blueprint...');
    const blueprint = this.solutionArchitect.generateBlueprint(prompt, capabilities, workflows, revenue, journey);
    console.log(`[BOS] Pages: ${blueprint.pages.length}, Entities: ${blueprint.entities.length}, Features: ${blueprint.features.length}`);

    // Step 6: Generate technical plan
    console.log('[BOS] Step 6: Generating technical plan...');
    const technicalPlan = this.technicalArchitect.generatePlan(blueprint);
    console.log(`[BOS] DB Models: ${technicalPlan.database.models.length}, API Routes: ${technicalPlan.apis.routes.length}`);

    const durationMs = Date.now() - startTime;

    console.log('='.repeat(60));
    console.log(`BOS COMPLETE in ${durationMs}ms`);
    console.log('='.repeat(60));

    return {
      prompt,
      capabilities,
      workflows,
      revenue,
      journey,
      blueprint,
      technicalPlan,
      generatedAt: new Date().toISOString(),
      durationMs,
    };
  }

  /**
   * Generate a concise summary for LLM prompt injection.
   */
  generatePromptContext(report: BusinessOperatingSystemReport): string {
    const sections: string[] = [];

    // Business context
    sections.push(`## Business Analysis`);
    sections.push(`Industry: ${report.capabilities.join(', ')}`);
    sections.push(`Revenue Model: ${report.revenue.primaryModel}`);
    sections.push(`Average Revenue Per User: ${report.revenue.averageRevenuePerUser}`);
    sections.push(`Lifetime Value: ${report.revenue.lifetimeValueEstimate}`);

    // Key workflows
    sections.push(`\n## Key Workflows`);
    for (const wf of report.workflows.workflows.slice(0, 5)) {
      sections.push(`- ${wf.name}: ${wf.steps.length} steps (${wf.estimatedCycleTime})`);
    }

    // Revenue streams
    sections.push(`\n## Revenue Streams`);
    for (const stream of report.revenue.streams.slice(0, 5)) {
      sections.push(`- ${stream.name} (${stream.type}): ${stream.description}`);
    }

    // Customer journey
    sections.push(`\n## Customer Journey`);
    for (const stage of report.journey.stages) {
      sections.push(`- ${stage.name}: ${stage.touchpoints.slice(0, 3).join(', ')}`);
    }

    // Pages to generate
    sections.push(`\n## Pages to Generate`);
    for (const page of report.blueprint.pages) {
      sections.push(`- ${page.route} (${page.type}): ${page.purpose}`);
    }

    // Key entities
    sections.push(`\n## Data Models`);
    for (const entity of report.blueprint.entities) {
      sections.push(`- ${entity.name}: ${entity.fields.map(f => f.name).join(', ')}`);
    }

    // Key features
    sections.push(`\n## Key Features`);
    for (const feature of report.blueprint.features.filter(f => f.priority === 'must-have')) {
      sections.push(`- ${feature.name}: ${feature.description}`);
    }

    // Technical requirements
    sections.push(`\n## Technical Requirements`);
    sections.push(`Database: Prisma with ${report.technicalPlan.database.models.length} models`);
    sections.push(`Auth: ${report.technicalPlan.auth.provider}`);
    sections.push(`Storage: ${report.technicalPlan.storage.provider}`);
    sections.push(`Deployment: ${report.technicalPlan.deployment.platform}`);

    return sections.join('\n');
  }
}
