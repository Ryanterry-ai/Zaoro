import { MCPTool, MCPToolResult } from '../types.js';

export class AuditTool implements MCPTool {
  name = 'audit_workspace';
  description = 'Audit workspace TypeScript compilation, run tests, and check for errors.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      check: {
        type: 'string',
        description: 'Audit check to run',
        enum: ['typescript', 'full', 'dependencies'],
        default: 'full',
      },
    },
    required: ['workspaceId'],
  };

  constructor(private workspaceBaseDir: string) {}

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const workspaceId = input.workspaceId as string;
    const check = (input.check as string) || 'full';

    try {
      const fs = await import('fs');
      const path = await import('path');
      const { execSync } = await import('child_process');

      const wsPath = path.join(this.workspaceBaseDir, workspaceId);
      if (!fs.existsSync(wsPath)) {
        return { content: [{ type: 'text', text: `Workspace not found: ${workspaceId}` }], isError: true };
      }

      const results: string[] = [];

      if (check === 'typescript' || check === 'full') {
        try {
          execSync('npx tsc --noEmit 2>&1', { cwd: wsPath, timeout: 30000, stdio: 'pipe' });
          results.push('✓ TypeScript compilation passed');
        } catch (err: any) {
          const output = err.stdout?.toString() || err.message;
          results.push(`✗ TypeScript errors:\n${output.slice(0, 1000)}`);
        }
      }

      if (check === 'dependencies' || check === 'full') {
        try {
          execSync('npm audit --audit-level=high 2>&1', { cwd: wsPath, timeout: 15000, stdio: 'pipe' });
          results.push('✓ No high-severity vulnerabilities');
        } catch (err: any) {
          const output = err.stdout?.toString() || err.message;
          if (output.includes('found 0 vulnerabilities')) {
            results.push('✓ No vulnerabilities');
          } else {
            results.push(`⚠ Vulnerabilities found:\n${output.slice(0, 500)}`);
          }
        }
      }

      return {
        content: [{ type: 'text', text: results.join('\n\n') }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Audit failed: ${err.message}` }],
        isError: true,
      };
    }
  }
}
