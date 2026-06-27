// src/engine/tools-runner.ts
// Runs Bucket A tools (quality-gate, content-validator, dependency-checker) as child processes.
// Zero LLM calls — pure script execution.

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const TOOLS_DIR = path.resolve(__dirname, '../../tools');

export interface ToolResult {
  tool: string;
  pass: boolean;
  output: string;
  duration: number;
}

export interface GateResult {
  pass: boolean;
  tools: ToolResult[];
  duration: number;
}

function runTool(toolPath: string, args: string[], cwd: string): ToolResult {
  const start = Date.now();
  const toolName = path.basename(path.dirname(toolPath));

  try {
    const output = execSync(`node "${toolPath}" ${args.join(' ')}`, {
      cwd,
      stdio: 'pipe',
      timeout: 120000,
      encoding: 'utf-8',
    });
    return {
      tool: toolName,
      pass: true,
      output: output.trim(),
      duration: Date.now() - start,
    };
  } catch (err: any) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    return {
      tool: toolName,
      pass: false,
      output: stdout || stderr || err.message,
      duration: Date.now() - start,
    };
  }
}

export function runQualityGate(projectDir: string): ToolResult {
  return runTool(path.join(TOOLS_DIR, 'quality-gate', 'index.cjs'), [projectDir], projectDir);
}

export function runContentValidator(projectDir: string): ToolResult {
  return runTool(path.join(TOOLS_DIR, 'content-validator', 'index.cjs'), [projectDir], projectDir);
}

export function runDependencyChecker(projectDir: string, sourceDomain?: string): ToolResult {
  const args = [projectDir];
  if (sourceDomain) args.push('--source-domain', sourceDomain);
  return runTool(path.join(TOOLS_DIR, 'dependency-checker', 'index.cjs'), args, projectDir);
}

export function runAllGates(projectDir: string, sourceDomain?: string): GateResult {
  const start = Date.now();
  const tools: ToolResult[] = [];

  // 1. Content validator (fast, no deps)
  tools.push(runContentValidator(projectDir));

  // 2. Dependency checker (fast, no deps)
  tools.push(runDependencyChecker(projectDir, sourceDomain));

  // 3. Quality gate (slower — runs tsc + build)
  tools.push(runQualityGate(projectDir));

  const allPass = tools.every(t => t.pass);

  return {
    pass: allPass,
    tools,
    duration: Date.now() - start,
  };
}
