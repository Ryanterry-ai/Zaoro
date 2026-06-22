import { MCPTool, MCPToolResult } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

export class WorkspaceTool implements MCPTool {
  name = 'workspace_manage';
  description = 'Manage workspace: list files, read file content, check build status, get workspace info.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['list_files', 'read_file', 'build_status', 'workspace_info'],
      },
      workspaceId: { type: 'string', description: 'Workspace ID' },
      filePath: { type: 'string', description: 'File path relative to workspace (for read_file)' },
    },
    required: ['action', 'workspaceId'],
  };

  constructor(private workspaceBaseDir: string) {}

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const action = input.action as string;
    const workspaceId = input.workspaceId as string;

    try {
      const wsPath = path.join(this.workspaceBaseDir, workspaceId);

      switch (action) {
        case 'list_files': {
          const files = this.scanDir(wsPath, wsPath);
          return {
            content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
          };
        }

        case 'read_file': {
          const filePath = input.filePath as string;
          if (!filePath) {
            return { content: [{ type: 'text', text: 'filePath required for read_file' }], isError: true };
          }
          const fullPath = path.join(wsPath, filePath);
          if (!fs.existsSync(fullPath)) {
            return { content: [{ type: 'text', text: `File not found: ${filePath}` }], isError: true };
          }
          const content = fs.readFileSync(fullPath, 'utf-8');
          return {
            content: [{ type: 'text', text: content }],
          };
        }

        case 'build_status': {
          const progressFile = path.join(wsPath, '.progress');
          if (!fs.existsSync(progressFile)) {
            return { content: [{ type: 'text', text: JSON.stringify({ status: 'not_started', steps: [] }) }] };
          }
          const steps = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
          const lastStep = steps[steps.length - 1];
          const status = lastStep?.step === 'done' ? 'complete' : lastStep?.step === 'error' ? 'failed' : 'in_progress';
          return {
            content: [{ type: 'text', text: JSON.stringify({ status, steps }, null, 2) }],
          };
        }

        case 'workspace_info': {
          const pkgPath = path.join(wsPath, 'package.json');
          const schemaPath = path.join(wsPath, 'prisma', 'schema.prisma');
          const files = this.scanDir(wsPath, wsPath);
          const info = {
            workspaceId,
            path: wsPath,
            exists: fs.existsSync(wsPath),
            fileCount: files.length,
            hasPackageJson: fs.existsSync(pkgPath),
            hasPrismaSchema: fs.existsSync(schemaPath),
            files: files.map(f => f.path),
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
          };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Workspace error: ${err.message}` }],
        isError: true,
      };
    }
  }

  private scanDir(dir: string, root: string): Array<{ name: string; path: string; isDirectory: boolean; size: number }> {
    const results: Array<{ name: string; path: string; isDirectory: boolean; size: number }> = [];

    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const item of items) {
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) continue;
        const fullPath = path.join(d, item.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        results.push({
          name: item.name,
          path: relPath,
          isDirectory: item.isDirectory(),
          size: item.isDirectory() ? 0 : stat.size,
        });
        if (item.isDirectory()) walk(fullPath);
      }
    };

    walk(dir);
    return results;
  }
}
