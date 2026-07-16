import { buildBREContext, buildBusinessResearch } from './src/bos/intake-parser.js';

const prompt = 'Build me a Multi brands e-commerce supplement store for Indian customers';

console.log('=== BRE Context Test ===');
console.log('Prompt:', prompt);
console.log('');

const ctx = buildBREContext(prompt);

console.log('Industry:', ctx.industry);
console.log('Sub-Industry:', ctx.subIndustry);
console.log('App Name:', ctx.appName);
console.log('Country:', ctx.country);
console.log('Entities:', ctx.entities);
console.log('Capabilities:', ctx.capabilities);
console.log('');

console.log('=== Business Research ===');
const research = buildBusinessResearch(prompt, ctx.industry, ctx.subIndustry, ctx.country);
console.log('Business Type:', research.businessType);
console.log('Industry:', research.industry);
console.log('Sub-Industry:', research.subIndustry);
console.log('User Personas:', research.userPersonas);
console.log('Revenue Flow:', research.revenueFlow);
console.log('Customer Flow:', research.customerFlow);
console.log('Payment Methods:', research.paymentMethods);
console.log('KPIs:', research.kpis);
console.log('Vocabulary:', research.vocabulary);
