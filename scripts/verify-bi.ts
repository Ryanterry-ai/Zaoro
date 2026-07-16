import { understandBusiness } from '../src/orchestration/business-intelligence/index.js';

const bk = understandBusiness('build me a modern coffee website for Indian customers');
console.log('Business Type:', bk.discovery.businessType);
console.log('Industry:', bk.discovery.industry);
console.log('Sub-industry:', bk.discovery.subIndustry);
console.log('Vocabulary product:', bk.vocabulary.terms['product']);
console.log('Vocabulary customer:', bk.vocabulary.terms['customer']);
console.log('Customer personas:', bk.customerPersonas.map(p=>p.label));
console.log('Personas count:', bk.customerPersonas.length);
console.log('Revenue model:', bk.revenue.model);
console.log('Customer journey stages:', bk.customerJourney.stages.map(s=>s.stage));