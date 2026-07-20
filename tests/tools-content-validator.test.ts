import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TOOL_PATH = join(process.cwd(), 'tools', 'content-validator', 'index.cjs');
const FIXTURES_DIR = join(process.cwd(), 'tests', '_fixtures', 'content-validator');

function runValidator(dir: string): { exitCode: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(`node "${TOOL_PATH}" "${dir}"`, {
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

describe('tools/content-validator', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // Clean project — no violations
    const cleanDir = join(FIXTURES_DIR, 'clean');
    mkdirSync(cleanDir, { recursive: true });
    writeFileSync(join(cleanDir, 'page.tsx'), `
export default function HomePage() {
  return <div>Welcome to our application</div>;
}
`);

    // Project with Lorem Ipsum
    const loremDir = join(FIXTURES_DIR, 'lorem');
    mkdirSync(loremDir, { recursive: true });
    writeFileSync(join(loremDir, 'content.tsx'), `
export const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
`);

    // Project with placeholder images. NOTE: picsum.photos is now treated as
    // acceptable deterministic stock (the engine's keyless fallback), so the
    // true placeholder host via.placeholder.com is used to assert failure.
    const placeholderDir = join(FIXTURES_DIR, 'placeholder');
    mkdirSync(placeholderDir, { recursive: true });
    writeFileSync(join(placeholderDir, 'page.tsx'), `
export default function Page() {
  return <img src="https://via.placeholder.com/400x300" alt="placeholder" />;
}
`);

    // Project with placeholder business name
    const businessDir = join(FIXTURES_DIR, 'business');
    mkdirSync(businessDir, { recursive: true });
    writeFileSync(join(businessDir, 'page.tsx'), `
export default function Page() {
  return <h1>Welcome to Your Business Name</h1>;
}
`);

    // Project with todo comments
    const todoDir = join(FIXTURES_DIR, 'todo');
    mkdirSync(todoDir, { recursive: true });
    writeFileSync(join(todoDir, 'page.tsx'), `
// TODO: implement this feature
export default function Page() {
  return <div>Coming soon</div>;
}
`);

    // Project with placeholder bracket pattern
    const bracketDir = join(FIXTURES_DIR, 'bracket');
    mkdirSync(bracketDir, { recursive: true });
    writeFileSync(join(bracketDir, 'page.tsx'), `
export default function Page() {
  return <div>[placeholder] content here</div>;
}
`);

    // Project with placeholder name patterns
    const nameDir = join(FIXTURES_DIR, 'names');
    mkdirSync(nameDir, { recursive: true });
    writeFileSync(join(nameDir, 'page.tsx'), `
export default function Page() {
  return <div>Contact John Doe for more info</div>;
}
`);
  });

  afterAll(() => {
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  it('should fail with non-existent directory', () => {
    const result = runValidator(join(FIXTURES_DIR, 'does-not-exist'));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  it('should pass with clean content', () => {
    const result = runValidator(join(FIXTURES_DIR, 'clean'));
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.pass).toBe(true);
    expect(output.placeholders).toBe(0);
  });

  it('should fail with Lorem Ipsum', () => {
    const result = runValidator(join(FIXTURES_DIR, 'lorem'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'lorem-ipsum')).toBe(true);
  });

  it('should fail with placeholder images', () => {
    const result = runValidator(join(FIXTURES_DIR, 'placeholder'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'placeholder-image')).toBe(true);
  });

  it('should fail with placeholder business name', () => {
    const result = runValidator(join(FIXTURES_DIR, 'business'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'placeholder-business')).toBe(true);
  });

  it('should fail with TODO comments', () => {
    const result = runValidator(join(FIXTURES_DIR, 'todo'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'todo-comment')).toBe(true);
  });

  it('should fail with [placeholder] bracket pattern', () => {
    const result = runValidator(join(FIXTURES_DIR, 'bracket'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'placeholder-bracket')).toBe(true);
  });

  it('should fail with placeholder name John Doe', () => {
    const result = runValidator(join(FIXTURES_DIR, 'names'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.violations.some((v: any) => v.type === 'placeholder-name')).toBe(true);
  });

  it('should count total violations correctly', () => {
    const result = runValidator(join(FIXTURES_DIR, 'lorem'));
    const output = JSON.parse(result.stderr);
    expect(output.total).toBeGreaterThan(0);
  });

  it('should scan .md files (mdx? regex matches .md and .mdx)', () => {
    const dir = join(FIXTURES_DIR, 'scan-md');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'readme.md'), 'Lorem ipsum dolor sit amet');
    const result = runValidator(dir);
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.violations.some((v: any) => v.type === 'lorem-ipsum')).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
