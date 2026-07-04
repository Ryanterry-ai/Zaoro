import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SandboxEngine } from '../src/sandbox/engine.js';

describe('scaffoldWorkspace', () => {
  let tmpDir: string;
  let engine: SandboxEngine;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffold-test-'));
    engine = new SandboxEngine();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes package.json with motion and tailwind deps', () => {
    engine.createWorkspace(tmpDir, 'test-ws-001');
    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'test-ws-001', 'package.json'), 'utf-8'));
    expect(pkg.dependencies['motion']).toBeDefined();
    expect(pkg.devDependencies['tailwindcss']).toBeDefined();
  });

  it('writes tailwind.config.js', () => {
    engine.createWorkspace(tmpDir, 'test-ws-002');
    const cfg = path.join(tmpDir, 'test-ws-002', 'tailwind.config.js');
    expect(fs.existsSync(cfg)).toBe(true);
    expect(fs.readFileSync(cfg, 'utf-8')).toContain('./src/**/*.{js,ts,jsx,tsx,mdx}');
  });

  it('writes postcss.config.js', () => {
    engine.createWorkspace(tmpDir, 'test-ws-003');
    const cfg = path.join(tmpDir, 'test-ws-003', 'postcss.config.js');
    expect(fs.existsSync(cfg)).toBe(true);
    expect(fs.readFileSync(cfg, 'utf-8')).toContain('tailwindcss');
  });

  it('writes next.config.js', () => {
    engine.createWorkspace(tmpDir, 'test-ws-004');
    const cfg = path.join(tmpDir, 'test-ws-004', 'next.config.js');
    expect(fs.existsSync(cfg)).toBe(true);
    expect(fs.readFileSync(cfg, 'utf-8')).toContain('module.exports');
  });

  it('writes tsconfig.json', () => {
    engine.createWorkspace(tmpDir, 'test-ws-005');
    const cfg = path.join(tmpDir, 'test-ws-005', 'tsconfig.json');
    expect(fs.existsSync(cfg)).toBe(true);
    const tsconfig = JSON.parse(fs.readFileSync(cfg, 'utf-8'));
    expect(tsconfig.compilerOptions?.jsx).toBe('preserve');
  });

  it('writes src/app/layout.tsx', () => {
    engine.createWorkspace(tmpDir, 'test-ws-006');
    const layout = path.join(tmpDir, 'test-ws-006', 'src', 'app', 'layout.tsx');
    expect(fs.existsSync(layout)).toBe(true);
    expect(fs.readFileSync(layout, 'utf-8')).toContain('RootLayout');
  });

  it('writes src/app/page.tsx', () => {
    engine.createWorkspace(tmpDir, 'test-ws-007');
    const page = path.join(tmpDir, 'test-ws-007', 'src', 'app', 'page.tsx');
    expect(fs.existsSync(page)).toBe(true);
    expect(fs.readFileSync(page, 'utf-8')).toContain('Sandbox App Initialized');
  });

  it('is idempotent — running twice does not overwrite existing files', () => {
    engine.createWorkspace(tmpDir, 'test-ws-008');
    const tailwindPath = path.join(tmpDir, 'test-ws-008', 'tailwind.config.js');
    const originalContent = fs.readFileSync(tailwindPath, 'utf-8');
    engine.createWorkspace(tmpDir, 'test-ws-008');
    expect(fs.readFileSync(tailwindPath, 'utf-8')).toBe(originalContent);
  });
});
