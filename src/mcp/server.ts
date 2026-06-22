import { MCPTool, MCPToolResult, MCPSession } from './types.js';
import { PlaywrightTool } from './tools/playwright.js';
import { GitHubTool } from './tools/github.js';
import { SupabaseTool } from './tools/supabase.js';
import { WorkspaceTool } from './tools/workspace.js';
import { GenerateTool } from './tools/generate.js';
import { AuditTool } from './tools/audit.js';

export class MCPServer {
  private sessions: Map<string, MCPSession> = new Map();
  private tools: MCPTool[] = [];

  constructor(private workspaceBaseDir: string) {
    this.registerTools();
  }

  private registerTools(): void {
    this.tools = [
      new PlaywrightTool(),
      new GitHubTool(),
      new SupabaseTool(this.workspaceBaseDir),
      new WorkspaceTool(this.workspaceBaseDir),
      new GenerateTool(this.workspaceBaseDir),
      new AuditTool(this.workspaceBaseDir),
    ];
  }

  public getTools(): MCPTool[] {
    return this.tools;
  }

  public getTool(name: string): MCPTool | undefined {
    return this.tools.find(t => t.name === name);
  }

  public async callTool(name: string, input: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      };
    }

    try {
      return await tool.handler(input);
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Tool error: ${err.message}` }],
        isError: true,
      };
    }
  }

  public createSession(workspaceId: string): MCPSession {
    const session: MCPSession = {
      id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      tools: this.tools,
      resources: [],
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(id: string): MCPSession | undefined {
    return this.sessions.get(id);
  }

  public listToolNames(): string[] {
    return this.tools.map(t => t.name);
  }

  public getToolSchemas(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
    return this.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
  }
}
