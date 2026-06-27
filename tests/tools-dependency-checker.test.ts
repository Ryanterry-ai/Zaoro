import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TOOL_PATH = join(process.cwd(), 'tools', 'dependency-checker', 'index.cjs');
const FIXTURES_DIR = join(process.cwd(), 'tests', '_fixtures', 'dependency-checker');

function runChecker(dir: string, extraArgs = ''): { exitCode: number; stdout: string; stderr: string } {
  try {
    const cmd = extraArgs
      ? `node "${TOOL_PATH}" "${dir}" ${extraArgs}`
      : `node "${TOOL_PATH}" "${dir}"`;
    const stdout = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err: any) {
    return {
      exitCode: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

describe('tools/dependency-checker', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // Clean project — no external URLs
    const cleanDir = join(FIXTURES_DIR, 'clean');
    mkdirSync(cleanDir, { recursive: true });
    writeFileSync(join(cleanDir, 'page.tsx'), `
export default function HomePage() {
  return <div>Welcome to our app</div>;
}
`);

    // Project with allowed external URLs (Google Fonts)
    const allowedDir = join(FIXTURES_DIR, 'allowed');
    mkdirSync(allowedDir, { recursive: true });
    writeFileSync(join(allowedDir, 'page.tsx'), `
export default function Page() {
  return (
    <div>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700" rel="stylesheet" />
      <span>Content</span>
    </div>
  );
}
`);

    // Project with disallowed external URL
    const externalDir = join(FIXTURES_DIR, 'external');
    mkdirSync(externalDir, { recursive: true });
    writeFileSync(join(externalDir, 'page.tsx'), `
export default function Page() {
  return <img src="https://example.com/image.png" alt="external" />;
}
`);

    // Project with image URLs in src attribute (allowed)
    const imageDir = join(FIXTURES_DIR, 'images');
    mkdirSync(imageDir, { recursive: true });
    writeFileSync(join(imageDir, 'page.tsx'), `
export default function Page() {
  return <img src="https://images.unsplash.com/photo.jpg" alt="photo" />;
}
`);

    // Project with source domain reference
    const sourceDir = join(FIXTURES_DIR, 'source-domain');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'page.tsx'), `
export default function Page() {
  return <a href="https://competitor.com/products">View products</a>;
}
`);

    // Project with multiple external URLs
    const multiDir = join(FIXTURES_DIR, 'multi');
    mkdirSync(multiDir, { recursive: true });
    writeFileSync(join(multiDir, 'page.tsx'), `
export default function Page() {
  return (
    <div>
      <img src="https://analytics.tracker.com/script.png" />
      <img src="https://cdn.example.org/logo.webp" />
    </div>
  );
}
`);
  });

  afterAll(() => {
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  it('should fail with non-existent directory', () => {
    const result = runChecker(join(FIXTURES_DIR, 'does-not-exist'));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  it('should pass with no external URLs', () => {
    const result = runChecker(join(FIXTURES_DIR, 'clean'));
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.pass).toBe(true);
    expect(output.externalUrls).toBe(0);
  });

  it('should pass with allowed external URLs (Google Fonts)', () => {
    const result = runChecker(join(FIXTURES_DIR, 'allowed'));
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.pass).toBe(true);
  });

  it('should fail with disallowed external URLs', () => {
    const result = runChecker(join(FIXTURES_DIR, 'external'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.length).toBeGreaterThan(0);
    expect(output.violations.some((v: any) => v.url.includes('example.com'))).toBe(true);
  });

  it('should flag image URLs in src attributes as violations', () => {
    const result = runChecker(join(FIXTURES_DIR, 'images'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.url.includes('unsplash.com'))).toBe(true);
  });

  it('should flag source domain URLs when --source-domain is provided', () => {
    const result = runChecker(join(FIXTURES_DIR, 'source-domain'), '--source-domain competitor.com');
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.url.includes('competitor.com'))).toBe(true);
  });

  it('should count files scanned', () => {
    const result = runChecker(join(FIXTURES_DIR, 'clean'));
    const output = JSON.parse(result.stdout);
    expect(output.filesScanned).toBeGreaterThan(0);
  });

  it('should flag multiple external URLs', () => {
    const result = runChecker(join(FIXTURES_DIR, 'multi'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('should not flag CDN URLs that are in allowed list', () => {
    const cdnDir = join(FIXTURES_DIR, 'cdn-allowed');
    mkdirSync(cdnDir, { recursive: true });
    writeFileSync(join(cdnDir, 'page.tsx'), `
export default function Page() {
  return <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>;
}
`);
    const result = runChecker(cdnDir);
    expect(result.exitCode).toBe(0);
    rmSync(cdnDir, { recursive: true, force: true });
  });

  it('should handle empty directories', () => {
    const emptyDir = join(FIXTURES_DIR, 'empty');
    mkdirSync(emptyDir, { recursive: true });
    const result = runChecker(emptyDir);
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.pass).toBe(true);
    expect(output.filesScanned).toBe(0);
  });
});
