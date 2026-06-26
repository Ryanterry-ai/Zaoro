// ─── Verification: BOS Registry ──────────────────────────────────────
// Tests that the BOS Registry loads and resolves industries correctly

import { BOSRegistry, loadAllEntries } from '../src/bos/registry.js';

async function verifyBOSRegistry() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BOS Registry Verification');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Load all entries
  console.log('[1] Loading BOS entries...');
  await loadAllEntries();
  console.log(`    ✓ Loaded ${BOSRegistry.count()} entries\n`);
  
  // Test exact matches
  console.log('[2] Testing exact matches...');
  const testCases = [
    { industry: 'Technology', subIndustry: 'SaaS', expected: 'technology.saas' },
    { industry: 'Retail', subIndustry: 'E-Commerce', expected: 'retail.ecommerce' },
    { industry: 'Healthcare', subIndustry: 'Dental', expected: 'healthcare.dental' },
    { industry: 'Hospitality', subIndustry: 'Restaurant', expected: 'hospitality.restaurant' },
    { industry: 'Real Estate', subIndustry: 'Agency', expected: 'realestate.agency' },
    { industry: 'Luxury', subIndustry: 'Retail', expected: 'luxury.retail' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of testCases) {
    const result = BOSRegistry.findExact(tc.industry, tc.subIndustry);
    if (result && result.entry.id === tc.expected) {
      console.log(`    ✓ ${tc.industry}/${tc.subIndustry} → ${result.entry.id} (exact)`);
      passed++;
    } else {
      console.log(`    ✗ ${tc.industry}/${tc.subIndustry} → FAILED (expected ${tc.expected})`);
      failed++;
    }
  }
  
  // Test semantic matching
  console.log('\n[3] Testing semantic matching...');
  const semanticTests = [
    { query: 'software platform', expected: 'technology.saas' },
    { query: 'online shop', expected: 'retail.ecommerce' },
    { query: 'medical clinic', expected: 'healthcare.dental' },
    { query: 'food service', expected: 'hospitality.restaurant' },
    { query: 'property agency', expected: 'realestate.agency' },
    { query: 'premium brand', expected: 'luxury.retail' },
  ];
  
  for (const tc of semanticTests) {
    const result = BOSRegistry.findNearest(tc.query);
    if (result && result.entry.id === tc.expected) {
      console.log(`    ✓ "${tc.query}" → ${result.entry.id} (semantic, ${result.confidence.toFixed(2)})`);
      passed++;
    } else {
      console.log(`    ✗ "${tc.query}" → FAILED (got ${result?.entry.id || 'null'})`);
      failed++;
    }
  }
  
  // Test vocabulary overrides
  console.log('\n[4] Testing vocabulary overrides...');
  const saasResult = BOSRegistry.findExact('Technology', 'SaaS');
  if (saasResult?.entry.vocabularyOverrides) {
    const vo = saasResult.entry.vocabularyOverrides;
    console.log(`    ✓ SaaS overrides: product→${vo['product']}, buy→${vo['buy']}, cart→${vo['cart']}`);
    passed++;
  }
  
  const luxuryResult = BOSRegistry.findExact('Luxury', 'Retail');
  if (luxuryResult?.entry.vocabularyOverrides) {
    const vo = luxuryResult.entry.vocabularyOverrides;
    console.log(`    ✓ Luxury overrides: product→${vo['product']}, buy→${vo['buy']}, store→${vo['store']}`);
    passed++;
  }
  
  // Test reference sources
  console.log('\n[5] Testing reference sources...');
  for (const entry of BOSRegistry.getAll()) {
    if (entry.references?.urls && entry.references.urls.length > 0) {
      console.log(`    ✓ ${entry.id}: ${entry.references.urls.length} reference URL(s)`);
      passed++;
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  process.exit(failed > 0 ? 1 : 0);
}

verifyBOSRegistry().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
