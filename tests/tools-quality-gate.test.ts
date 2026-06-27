import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TOOL_PATH = join(process.cwd(), 'tools', 'quality-gate', 'index.cjs');
const FIXTURES_DIR = join(process.cwd(), 'tests', '_fixtures', 'quality-gate');

function runGate(dir: string): { exitCode: number; stdout: string; stderr: string } {
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

describe('tools/quality-gate', () => {
  beforeAll(() => {
    if (!existsSync(FIXTURES_DIR)) {
      mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // Valid project with package.json and buildable structure
    const validDir = join(FIXTURES_DIR, 'valid-project');
    mkdirSync(validDir, { recursive: true });
    writeFileSync(join(validDir, 'package.json'), JSON.stringify({
      name: 'valid-project',
      version: '1.0.0',
      scripts: { build: 'echo ok' },
    }));
    mkdirSync(join(validDir, 'src'), { recursive: true });
    writeFileSync(join(validDir, 'src', 'index.ts'), 'export const x = 1;');

    // Missing package.json project
    const noPkgDir = join(FIXTURES_DIR, 'no-package-json');
    mkdirSync(noPkgDir, { recursive: true });
    writeFileSync(join(noPkgDir, 'index.ts'), 'export const x = 1;');

    // Project with failing build
    const failingDir = join(FIXTURES_DIR, 'failing-build');
    mkdirSync(failingDir, { recursive: true });
    writeFileSync(join(failingDir, 'package.json'), JSON.stringify({
      name: 'failing-project',
      version: '1.0.0',
      scripts: { build: 'node -e "process.exit(1)"' },
    }));
  });

  afterAll(() => {
    if (existsSync(FIXTURES_DIR)) {
      rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  it('should fail with non-existent directory', () => {
    const result = runGate(join(FIXTURES_DIR, 'does-not-exist'));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  it('should fail when package.json is missing', () => {
    const result = runGate(join(FIXTURES_DIR, 'no-package-json'));
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('No package.json found');
  });

  it('should pass with a valid project', () => {
    const result = runGate(join(FIXTURES_DIR, 'valid-project'));
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.pass).toBe(true);
  });

  it('should fail when build command fails', () => {
    const result = runGate(join(FIXTURES_DIR, 'failing-build'));
    expect(result.exitCode).not.toBe(0);
    const output = JSON.parse(result.stderr);
    expect(output.pass).toBe(false);
    expect(output.failures).toBeDefined();
    expect(output.failures.some((f: any) => f.gate === 'build')).toBe(true);
  });
});
