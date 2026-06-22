import { MCPTool, MCPToolResult, SupabaseConfig } from '../types.js';

export class SupabaseTool implements MCPTool {
  name = 'supabase_deploy';
  description = 'Deploy workspace to Supabase: run migrations, seed data, and configure edge functions.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      workspacePath: { type: 'string', description: 'Local workspace path' },
      supabaseUrl: { type: 'string', description: 'Supabase project URL (or use SUPABASE_URL env)' },
      serviceRoleKey: { type: 'string', description: 'Supabase service role key (or use SUPABASE_SERVICE_ROLE_KEY env)' },
      runMigrations: { type: 'boolean', description: 'Run prisma db push (default true)', default: true },
      seedData: { type: 'boolean', description: 'Seed database with sample data (default false)', default: false },
    },
    required: ['workspacePath'],
  };

  constructor(private workspaceBaseDir: string) {}

  private getConfig(input: Record<string, unknown>): SupabaseConfig {
    return {
      url: (input.supabaseUrl as string) || process.env.SUPABASE_URL || '',
      serviceRoleKey: (input.serviceRoleKey as string) || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    };
  }

  async handler(input: Record<string, unknown>): Promise<MCPToolResult> {
    const config = this.getConfig(input);
    const workspacePath = input.workspacePath as string;
    const runMigrations = input.runMigrations !== false;
    const seedData = input.seedData === true;

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');

      const results: string[] = [];

      // Check if Prisma schema exists
      const schemaPath = path.join(workspacePath, 'prisma', 'schema.prisma');
      if (!fs.existsSync(schemaPath)) {
        return {
          content: [{ type: 'text', text: 'No prisma/schema.prisma found. Nothing to deploy.' }],
        };
      }

      // Run migrations if requested
      if (runMigrations) {
        try {
          execSync('npx prisma db push --accept-reset', {
            cwd: workspacePath,
            timeout: 30000,
            stdio: 'pipe',
            env: { ...process.env, DATABASE_URL: config.url },
          });
          results.push('✓ Database schema pushed successfully');
        } catch (err: any) {
          results.push(`✗ Database push failed: ${err.message?.slice(0, 200)}`);
        }
      }

      // Generate Prisma client
      try {
        execSync('npx prisma generate', {
          cwd: workspacePath,
          timeout: 15000,
          stdio: 'pipe',
        });
        results.push('✓ Prisma client generated');
      } catch (err: any) {
        results.push(`✗ Prisma generate failed: ${err.message?.slice(0, 200)}`);
      }

      // Seed data if requested
      if (seedData) {
        const seedPath = path.join(workspacePath, 'prisma', 'seed.ts');
        if (fs.existsSync(seedPath)) {
          try {
            execSync('npx tsx prisma/seed.ts', {
              cwd: workspacePath,
              timeout: 30000,
              stdio: 'pipe',
              env: { ...process.env, DATABASE_URL: config.url },
            });
            results.push('✓ Database seeded');
          } catch (err: any) {
            results.push(`✗ Seed failed: ${err.message?.slice(0, 200)}`);
          }
        } else {
          results.push('⚠ No seed file found at prisma/seed.ts');
        }
      }

      return {
        content: [{ type: 'text', text: results.join('\n') }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Supabase deploy failed: ${err.message}` }],
        isError: true,
      };
    }
  }
}
