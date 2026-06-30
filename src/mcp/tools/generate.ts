import { MCPTool, MCPToolResult } from '../types.js';

export class GenerateTool implements MCPTool {
  name = 'generate_code';
  description = 'Generate code for a workspace page using the LLM gateway. Returns AST patches.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      workspaceId: { type: 'string', description: 'Workspace ID' },
      prompt: { type: 'string', description: 'Generation prompt' },
      page: { type: 'string', description: 'Target page path (e.g., "/", "/shop")' },
      provider: { type: 'string', description: 'LLM provider (gemini, openai, anthropic)', default: 'gemini' },
    },
    required: ['workspaceId', 'prompt'],
  };

  constructor(private workspaceBaseDir: string) {}

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const workspaceId = input.workspaceId as string;
    const prompt = input.prompt as string;
    const page = (input.page as string) || '/';
    const provider = (input.provider as string) || 'gemini';

    try {
      const fs = await import('fs');
      const path = await import('path');

      const wsPath = path.join(this.workspaceBaseDir, workspaceId);
      if (!fs.existsSync(wsPath)) {
        return { content: [{ type: 'text', text: `Workspace not found: ${workspaceId}` }], isError: true };
      }

      // Import gateway dynamically to avoid circular deps
      const { LLMGateway } = await import('../../core/llm-gateway.js');
      const { ArchitectAgent } = await import('../../generation/architect.js');

      const { apiKey } = (await import('../../core/resolve-llm-config.js')).resolveLLMConfig();
      const gateway = new LLMGateway({ provider: provider as any, apiKey });

      const architect = new ArchitectAgent();
      const decision = architect.designArchitecture(prompt);
      const architecturePrompt = architect.buildArchitecturePrompt(decision);

      const context = {
        prompt: `${prompt}\n\nTarget page: ${page}`,
        errors: [],
        attempt: 0,
        changedFiles: [],
      };

      const patches = await gateway.generatePatches(context);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            page,
            patchesCount: patches.length,
            patches: patches.map(p => ({
              targetFile: p.targetFile,
              action: p.action,
              targetExport: p.targetExport,
              codeLength: p.codeBlock.length,
            })),
          }, null, 2),
        }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Generation failed: ${err.message}` }],
        isError: true,
      };
    }
  }
}
