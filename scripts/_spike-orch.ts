import { createWiredPipelineOrchestrator } from '../src/orchestration/pipeline-orchestrator/wired.js';

async function main() {
  const orch = createWiredPipelineOrchestrator();
  const t0 = Date.now();
  const state: any = await orch.execute('Build a coffee shop website with menu, online ordering, and loyalty program');
  const dt = Date.now() - t0;
  console.log('status:', state.status);
  console.log('durationMs:', dt);
  const keys = ['businessKnowledge', 'evidenceCollection', 'experienceBlueprint', 'designBlueprint', 'contentBlueprint', 'solutionArchitecture', 'applicationBlueprint', 'executionBlueprint'];
  for (const k of keys) {
    const v = state[k];
    console.log(`- ${k}:`, v === undefined ? 'MISSING' : (v && typeof v === 'object' ? Object.keys(v).slice(0, 8).join(',') : typeof v));
  }
  console.log('errors:', JSON.stringify(state.errors?.slice(0, 3)));
}
main().catch(e => { console.error('SPIKE ERROR', e); process.exit(1); });
