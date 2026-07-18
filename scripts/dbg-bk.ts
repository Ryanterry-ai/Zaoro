import { runCanonicalBuild } from '../src/orchestration/pipeline/canonical-build.js';

const PROMPT =
  'Build a premium luxury jewellery brand website that feels like entering a private haute joaillerie atelier. ' +
  'Communicate craftsmanship, exclusivity, timeless elegance, rarity, trust, emotional value. Precious metals, gemstones, heritage, bespoke jewellery, appointments.';

async function main() {
  const c = await runCanonicalBuild({ prompt: PROMPT });
  const bk = c.businessKnowledge;
  console.log('discovery.intent      :', bk.discovery.intent);
  console.log('discovery.businessType:', bk.discovery.businessType);
  console.log('discovery.industry    :', bk.discovery.industry);
  console.log('discovery.subIndustry :', (bk.discovery as any).subIndustry);
  console.log('vocabulary.domainNouns:', bk.vocabulary.domainNouns);
  console.log('vocabulary.tone       :', bk.vocabulary.tone);
  console.log('vocabulary.terms      :', JSON.stringify(bk.vocabulary.terms));
  console.log('experienceGoals.arc   :', bk.experienceGoals?.arc);
  console.log('intents.emotional     :', bk.intents.emotional);
  console.log('has rawPrompt?        :', (bk as any).rawPrompt !== undefined, (bk.discovery as any).rawPrompt !== undefined);
}
main();
