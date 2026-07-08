import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const GATE_PATH = path.resolve(process.cwd(), 'tools', 'content-quality-gate', 'index.js');

function runGate(projectDir, extraArgs = '') {
  try {
    const output = execSync(`node "${GATE_PATH}" "${projectDir}" ${extraArgs}`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    return JSON.parse(output.trim());
  } catch (e) {
    const stdout = e.stdout?.toString() || '';
    const stderr = e.stderr?.toString() || '';
    // Try to parse JSON from stdout even on exit code 1
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return { pass: false, error: stderr.slice(0, 500) };
    }
  }
}

describe('Content Quality Gate — enhanced checks', () => {
  const tmpDir = path.join(process.cwd(), '.tmp-quality-gate-test');

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects lorem ipsum (hard marker)', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return <section><h1>Lorem ipsum dolor sit amet</h1></section>;
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Test</div>; }
    `);

    const result = runGate(tmpDir);
    expect(result.pass).toBe(false);
    expect(result.hardMarkers).toBeGreaterThan(0);
  });

  it('passes clean domain-specific content', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return (
          <section>
            <h1>Bella Vista Coffee</h1>
            <p>Fresh roasted single-origin beans, handcrafted espresso drinks, and a warm community space in downtown Portland.</p>
            <p>Every batch is roasted in-house weekly for peak flavor.</p>
          </section>
        );
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Bella Vista Coffee — fresh roasted beans, handcrafted drinks, our full menu</div>; }
    `);

    const result = runGate(tmpDir, '--industry restaurant');
    expect(result.pass).toBe(true);
    expect(result.domainWrong).toBe(0);
  });

  it('flags domain-weak content when industry keywords missing', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return (
          <section>
            <h1>Welcome to Our Platform</h1>
            <p>We provide innovative solutions for modern teams.</p>
          </section>
        );
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Test</div>; }
    `);

    const result = runGate(tmpDir, '--industry restaurant');
    expect(result.domainWeak).toBeGreaterThan(0);
  });

  it('detects cross-file duplicate sentences', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    const duplicateText = 'We are dedicated to providing exceptional service and support to every customer we serve.';
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return <section><p>${duplicateText}</p></section>;
      }
    `);
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'About.tsx'), `
      export default function About() {
        return <section><p>${duplicateText}</p></section>;
      }
    `);
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Mission.tsx'), `
      export default function Mission() {
        return <section><p>${duplicateText}</p></section>;
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Test</div>; }
    `);

    const result = runGate(tmpDir);
    expect(result.duplicateSentences).toBeGreaterThan(0);
  });

  it('detects soft filler phrases', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return (
          <section>
            <h1>Our Platform</h1>
            <p>We are passionate about delivering state-of-the-art solutions.</p>
          </section>
        );
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Test</div>; }
    `);

    const result = runGate(tmpDir);
    expect(result.softMarkers).toBeGreaterThan(0);
    expect(result.pass).toBe(true); // soft markers alone don't block
  });

  it('flags incomplete sections (no body content)', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Features.tsx'), `
      export default function Features() {
        return (
          <section>
            <h2>Features</h2>
            <div className="grid">
              <div><h3>Feature One</h3></div>
              <div><h3>Feature Two</h3></div>
            </div>
          </section>
        );
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `
      export default function Home() { return <div>Test</div>; }
    `);

    const result = runGate(tmpDir);
    expect(result.incomplete).toBeGreaterThan(0);
  });

  it('reports correct file counts', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'A.tsx'), `export default function A() { return <div>A</div>; }`);
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'B.tsx'), `export default function B() { return <div>B</div>; }`);
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `export default function Home() { return <div>Home</div>; }`);

    const result = runGate(tmpDir);
    expect(result.files).toBe(3);
    expect(result.components).toBe(2);
    expect(result.pages).toBe(1);
  });

  it('passes with no industry arg (backward compatible)', () => {
    fs.mkdirSync(path.join(tmpDir, 'src', 'components'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'components', 'Hero.tsx'), `
      export default function Hero() {
        return <section><h1>Test</h1><p>Some content here that is long enough.</p></section>;
      }
    `);
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'page.tsx'), `export default function Home() { return <div>Test</div>; }`);

    const result = runGate(tmpDir);
    expect(result.pass).toBe(true);
    expect(result.industry).toBeNull();
  });
});
