#!/usr/bin/env tsx
/**
 * promote-candidates.ts
 *
 * Operational entry point for the Promotion Pipeline (the "Promotion" half of
 * Runtime Learning). Run after one or more builds have recorded candidate
 * knowledge.
 *
 * Usage:
 *   tsx scripts/promote-candidates.ts                 # evaluate + report
 *   tsx scripts/promote-candidates.ts --review        # also print the human-review queue
 *   tsx scripts/promote-candidates.ts --approve <id>  # human-review approve one candidate
 *   tsx scripts/promote-candidates.ts --reject <id>   # human-review reject one candidate
 *   tsx scripts/promote-candidates.ts --rollback-last # undo the most recent promotion
 *
 * The Business Graph is only ever mutated here (or by trusted auto-promotion
 * inside the pipeline). A single build can never promote.
 */

import { initializeKnowledgeGraph, getKnowledgeGraphGovernor } from '../src/bos/knowledge/seeds/index.js';
import { CandidateKnowledgeStore, PromotionPipeline, DEFAULT_PROMOTION_CONFIG } from '../src/bos/candidate/index.js';

async function main(): Promise<void> {
  await initializeKnowledgeGraph();
  const governor = getKnowledgeGraphGovernor();
  if (!governor) {
    console.error('Graph governor unavailable.');
    process.exit(1);
  }

  const store = new CandidateKnowledgeStore();
  const pipeline = new PromotionPipeline(store, governor, DEFAULT_PROMOTION_CONFIG);

  const args = process.argv.slice(2);

  if (args.includes('--rollback-last')) {
    const entry = governor.rollbackLast();
    console.log(entry ? `Rolled back promotion v${entry.version} (${entry.kind}:${entry.key})` : 'Nothing to roll back');
    return;
  }

  const approveIdx = args.indexOf('--approve');
  if (approveIdx >= 0 && args[approveIdx + 1]) {
    const ok = pipeline.approve(args[approveIdx + 1]);
    console.log(ok ? `Approved ${args[approveIdx + 1]}` : `Could not approve ${args[approveIdx + 1]}`);
    return;
  }

  const rejectIdx = args.indexOf('--reject');
  if (rejectIdx >= 0 && args[rejectIdx + 1]) {
    pipeline.reject(args[rejectIdx + 1]);
    console.log(`Rejected ${args[rejectIdx + 1]}`);
    return;
  }

  const report = pipeline.run();
  console.log('=== Promotion Pipeline Report ===');
  console.log(`Evaluated:      ${report.evaluated}`);
  console.log(`Promoted:       ${report.promoted.length}`);
  console.log(`To review:      ${report.needsReview.length}`);
  console.log(`Rejected:       ${report.rejected.length}`);
  console.log(`Graph version:  ${report.appliedVersion}`);

  for (const p of report.promoted) {
    console.log(`  + promoted  ${p.kind}:${p.key} (confidence ${p.confidence.toFixed(2)})`);
  }
  if (args.includes('--review')) {
    const queue = pipeline.getReviewQueue();
    console.log('\n=== Human Review Queue ===');
    for (const q of queue) {
      console.log(`  ~ ${q.id}  builds=${q.distinctBuilds} industries=${q.distinctIndustries} conf=${q.confidence.toFixed(2)}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
