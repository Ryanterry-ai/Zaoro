import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const GATE_PATH = path.resolve('tools/content-quality-gate/index.js');
const FIXTURE_DIR = path.resolve('.test-fixtures/cqg');

function setupFixture(files) {
  if (fs.existsSync(FIXTURE_DIR)) fs.rmSync(FIXTURE_DIR, { recursive: true });
  const srcComponents = path.join(FIXTURE_DIR, 'src', 'components');
  const srcApp = path.join(FIXTURE_DIR, 'src', 'app');
  fs.mkdirSync(srcComponents, { recursive: true });
  fs.mkdirSync(srcApp, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const dir = name.includes('/') ? path.join(FIXTURE_DIR, 'src', name.slice(0, name.lastIndexOf('/'))) : srcComponents;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(FIXTURE_DIR, 'src', name), content);
  }
}

function runGate(industry = 'restaurant') {
  try {
    const out = execSync(`node "${GATE_PATH}" "${FIXTURE_DIR}" --industry ${industry}`, {
      encoding: 'utf-8',
      timeout: 15000,
    });
    return { exitCode: 0, result: JSON.parse(out) };
  } catch (e: any) {
    return { exitCode: e.status ?? 1, result: JSON.parse(e.stdout || '{}') };
  }
}

beforeAll(() => {
  setupFixture({});
});

afterAll(() => {
  if (fs.existsSync(FIXTURE_DIR)) fs.rmSync(FIXTURE_DIR, { recursive: true });
});

describe('Content Quality Gate — Domain Accuracy', () => {
  it('passes when files contain industry keywords', () => {
    setupFixture({
      'components/Hero.tsx': `export default function Hero() { return <section><h1>Best dining menu in town</h1><p>Our chef prepares every dish with fresh cuisine</p></section>; }`,
      'app/page.tsx': `export default function Page() { return <div><p>Make a reservation for your table today</p></div>; }`,
    });
    const { result } = runGate('restaurant');
    expect(result.domainAccuracy.passed).toBe(true);
    expect(result.domainAccuracy.filesWithKeywords).toBeGreaterThanOrEqual(1);
  });

  it('fails when files have zero industry keywords', () => {
    setupFixture({
      'components/Hero.tsx': `export default function Hero() { return <section><h1>Welcome</h1><p>Something generic here</p></section>; }`,
      'app/page.tsx': `export default function Page() { return <div><p>Another page</p></div>; }`,
    });
    const { result } = runGate('dental');
    expect(result.domainAccuracy.passed).toBe(false);
  });
});

describe('Content Quality Gate — Cross-File Uniqueness', () => {
  it('passes when sentences are varied across files', () => {
    setupFixture({
      'components/Hero.tsx': `const s = "Fresh farm-to-table ingredients sourced daily";`,
      'components/Features.tsx': `const s = "Our award-winning chefs bring 20 years of experience";`,
      'components/About.tsx': `const s = "Family-owned restaurant serving the community since 2010";`,
      'app/page.tsx': `const s = "Visit us at our downtown location for dining";`,
    });
    const { result } = runGate('restaurant');
    expect(result.crossFileUniqueness.passed).toBe(true);
  });

  it('fails when same sentence is repeated across 3+ files', () => {
    const repeated = '"This platform transformed how I run my business. Highly recommended!"';
    setupFixture({
      'components/Hero.tsx': `const s = ${repeated};`,
      'components/Features.tsx': `const s = ${repeated};`,
      'components/About.tsx': `const s = ${repeated};`,
      'app/page.tsx': `const s = "Unique content here";`,
    });
    const { result } = runGate('saas');
    expect(result.crossFileUniqueness.passed).toBe(false);
    expect(result.crossFileUniqueness.repeatedSentences).toBeGreaterThanOrEqual(1);
  });
});

describe('Content Quality Gate — Completeness', () => {
  it('passes when files have descriptions and alt text', () => {
    setupFixture({
      'components/Hero.tsx': `const item = { description: "A carefully crafted espresso blend with rich flavor", alt: "Freshly brewed coffee in ceramic cup" };`,
      'app/page.tsx': `const item = { description: "Seasonal menu featuring local produce and ingredients", alt: "Chef plating a gourmet dish" };`,
    });
    const { result } = runGate('restaurant');
    expect(result.completeness.passed).toBe(true);
  });

  it('fails when files are empty shells', () => {
    setupFixture({
      'components/Hero.tsx': `export default function Hero() { return <section><h2>Title</h2></section>; }`,
      'app/page.tsx': `export default function Page() { return <div></div>; }`,
    });
    const { result } = runGate('restaurant');
    expect(result.completeness.passed).toBe(false);
  });
});

describe('Content Quality Gate — Non-Generic Language', () => {
  it('passes when language is specific and concrete', () => {
    setupFixture({
      'components/Hero.tsx': `const s = "Order freshly roasted single-origin beans delivered to your door";`,
      'components/Features.tsx': `const s = "Our baristas craft each drink with precision and care";`,
      'app/page.tsx': `const s = "Browse our menu of seasonal dishes and beverages";`,
    });
    const { result } = runGate('restaurant');
    expect(result.nonGenericLanguage.passed).toBe(true);
    expect(result.nonGenericLanguage.totalFillerHits).toBe(0);
  });

  it('fails when content is full of filler phrases', () => {
    setupFixture({
      'components/Hero.tsx': `const s = "We are passionate about state-of-the-art cutting-edge solutions that leverage synergy seamlessly";`,
      'components/Features.tsx': `const s = "Our best-in-class world-class platform empowers you to optimize your workflow seamlessly";`,
      'components/About.tsx': `const s = "Take your business to the next level with our innovative solution that drives results seamlessly";`,
      'app/page.tsx': `const s = "Unlock the power of our comprehensive suite of tailored solutions end-to-end seamlessly";`,
    });
    const { result } = runGate('saas');
    expect(result.nonGenericLanguage.passed).toBe(false);
    expect(result.nonGenericLanguage.totalFillerHits).toBeGreaterThanOrEqual(5);
  });
});
