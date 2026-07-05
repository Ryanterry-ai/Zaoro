import { MCPTool, MCPToolResult, GitHubConfig } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

export class GitHubTool implements MCPTool {
  name = 'github_push';
  description = 'Push workspace files to a GitHub repository. Creates or updates files in the specified repo.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      workspacePath: { type: 'string', description: 'Local workspace path to push' },
      owner: { type: 'string', description: 'GitHub repo owner' },
      repo: { type: 'string', description: 'GitHub repo name' },
      branch: { type: 'string', description: 'Target branch (default: main)', default: 'main' },
      message: { type: 'string', description: 'Commit message' },
      token: { type: 'string', description: 'GitHub personal access token (or use GITHUB_TOKEN env)' },
    },
    required: ['workspacePath', 'owner', 'repo', 'message'],
  };

  private getConfig(input: Record<string, unknown>): GitHubConfig {
    return {
      token: (input.token as string) || process.env.GITHUB_TOKEN || '',
      owner: input.owner as string,
      repo: input.repo as string,
    };
  }

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const config = this.getConfig(input);
    const workspacePath = input.workspacePath as string;
    const branch = (input.branch as string) || 'main';
    const message = input.message as string;

    if (!config.token) {
      return {
        content: [{ type: 'text', text: 'GitHub token required. Set GITHUB_TOKEN env or provide token parameter.' }],
        isError: true,
      };
    }

    try {
      const files = this.scanWorkspace(workspacePath, workspacePath);
      const results: string[] = [];

      for (const file of files) {
        const relativePath = path.relative(workspacePath, file).replace(/\\/g, '/');
        const encodedContent = fs.readFileSync(file).toString('base64');

        const sha = await this.getExistingFileSha(config, relativePath, branch);

        const body: Record<string, unknown> = {
          message,
          content: encodedContent,
          branch,
        };
        if (sha) body.sha = sha;

        const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${relativePath}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          results.push(`✓ ${relativePath}`);
        } else {
          const err = await response.text();
          results.push(`✗ ${relativePath}: ${err}`);
        }
      }

      return {
        content: [{ type: 'text', text: `GitHub push results:\n${results.join('\n')}` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `GitHub push failed: ${err.message}` }],
        isError: true,
      };
    }
  }

  private async getExistingFileSha(config: GitHubConfig, filePath: string, branch: string): Promise<string | null> {
    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?ref=${branch}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (response.ok) {
        const data = await response.json() as any;
        return data.sha || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private scanWorkspace(dir: string, root: string): string[] {
    const results: string[] = [];

    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(d, item.name);
        if (item.name === 'node_modules' || item.name === '.next' || item.name.startsWith('.')) continue;
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.isFile()) {
          results.push(fullPath);
        }
      }
    };

    walk(dir);
    return results;
  }
}
