import { describe, it, expect, afterAll } from 'vitest';
import { runContentValidator, runDependencyChecker, runQualityGate, runAllGates } from '../src/engine/tools-runner.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('ToolsRunner', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-test-'));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runContentValidator should pass on clean content', () => {
    const projectDir = fs.mkdtempSync(path.join(tmpDir, 'clean-'));
    fs.writeFileSync(path.join(projectDir, 'page.tsx'), 'export default function Home() { return <div>Hello</div>; }');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    const result = runContentValidator(projectDir);
    expect(result.tool).toBe('content-validator');
    expect(result.pass).toBe(true);
  });

  it('runContentValidator should fail on Lorem Ipsum', () => {
    const projectDir = fs.mkdtempSync(path.join(tmpDir, 'lorem-'));
    fs.writeFileSync(path.join(projectDir, 'page.tsx'), 'const text = "Lorem ipsum dolor sit amet";');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    const result = runContentValidator(projectDir);
    expect(result.tool).toBe('content-validator');
    expect(result.pass).toBe(false);
    expect(result.output).toContain('lorem-ipsum');
  });

  it('runDependencyChecker should pass with no external URLs', () => {
    const projectDir = fs.mkdtempSync(path.join(tmpDir, 'clean-dep-'));
    fs.writeFileSync(path.join(projectDir, 'page.tsx'), 'const x = 1;');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    const result = runDependencyChecker(projectDir);
    expect(result.tool).toBe('dependency-checker');
    expect(result.pass).toBe(true);
  });

  it('runDependencyChecker should flag external image URLs', () => {
    const projectDir = fs.mkdtempSync(path.join(tmpDir, 'ext-'));
    fs.writeFileSync(path.join(projectDir, 'page.tsx'), '<img src="https://example.com/photo.jpg">');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    const result = runDependencyChecker(projectDir);
    expect(result.tool).toBe('dependency-checker');
    expect(result.pass).toBe(false);
  });

  it('runAllGates returns GateResult with all tools', () => {
    const projectDir = fs.mkdtempSync(path.join(tmpDir, 'all-gates-'));
    fs.writeFileSync(path.join(projectDir, 'page.tsx'), 'const x = 1;');
    fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
    const result = runAllGates(projectDir);
    expect(result.tools.length).toBe(3);
    expect(result.tools.map(t => t.tool)).toContain('content-validator');
    expect(result.tools.map(t => t.tool)).toContain('dependency-checker');
    expect(result.tools.map(t => t.tool)).toContain('quality-gate');
    expect(typeof result.duration).toBe('number');
  });
});
