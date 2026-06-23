import { config } from 'dotenv';
import { BusinessIntelligencePipeline } from '../src/business-intelligence/pipeline.js';
import type { LLMProvider } from '../src/types/index.js';

config();

const TEST_PROMPTS = [
  'I run a dental clinic with 3 dentists. We use paper records and WhatsApp for appointments. I want to modernize and get more patients.',
  'We have a small online store selling handmade jewelry on Shopify. We do about $5K/month but want to scale to $50K. We spend 4 hours/day on customer service.',
  'I am starting a coworking space in Bangalore. 200 seats, targeting startups and freelancers. Need a booking system, member management, and community features.',
];

async function main() {
  const provider = (process.env.LLM_PROVIDER || 'gemini') as LLMProvider;
  const apiKey = process.env.LLM_API_KEY || '';

  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY not set in .env');
    process.exit(1);
  }

  const promptIdx = parseInt(process.argv[2] || '0', 10);
  const prompt = TEST_PROMPTS[promptIdx] || TEST_PROMPTS[0];

  console.log(`\nTest Prompt: "${prompt}"\n`);

  const pipeline = new BusinessIntelligencePipeline(provider, apiKey);
  const result = await pipeline.run(prompt, (phase, detail) => {
    console.log(`  → ${phase}: ${detail}`);
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Domain: ${result.report.business_domain}`);
  console.log(`Industry: ${result.report.industry}`);
  console.log(`Primary Problem: ${result.report.primary_problem}`);
  console.log(`Problems Found: ${result.problems.length} (${result.problems.filter(p => p.severity === 'critical').length} critical)`);
  console.log(`Solution Components: ${result.solution.components.length}`);
  console.log(`Revenue Impact: ${result.solution.total_revenue_impact}%`);
  console.log(`Architecture: ${result.architecture.system.frontend.length} FE, ${result.architecture.system.backend.length} BE, ${result.architecture.system.database.length} DB`);
  console.log(`AI Agents: ${result.architecture.ai.agents.length}`);
  console.log(`Validation: ${result.validation.score}% ${result.validation.passed ? 'PASSED' : 'NEEDS WORK'}`);
  console.log(`Corrections: ${result.correction_iterations} iterations`);
  console.log(`Duration: ${(result.total_duration_ms / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  // Save full result
  const outputPath = `sandbox_workspaces/bi-output-${Date.now()}.json`;
  const fs = await import('fs');
  fs.mkdirSync('sandbox_workspaces', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\nFull output saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
