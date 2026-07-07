import { Orchestrator } from '../src/orchestration/orchestrator.js';
import type { LLMAdapterInterface, LLMCallParams, LLMCallResult } from '../src/orchestration/types.js';
import { LLMTaskType } from '../src/orchestration/types.js';

function mockContent(params: LLMCallParams): string {
  const task = params.taskType;
  const prompt = params.prompt;

  if (task === LLMTaskType.StructuredExtraction || params.responseSchema) {
    return JSON.stringify({
      name: 'TaskTracker',
      description: 'A simple task tracking application',
      industry: 'saas',
      entities: ['Project', 'Task', 'User', 'Label'],
      techStack: { frontend: 'react', backend: 'node', database: 'postgres' },
    });
  }

  if (task === LLMTaskType.Analysis) {
    if (prompt.includes('competitive')) {
      return JSON.stringify({
        competitors: [
          { name: 'Trello', strength: 'Simplicity', weakness: 'Limited features' },
          { name: 'Asana', strength: 'Features', weakness: 'Complexity' },
        ],
        differentiation: 'Focus on single-workspace simplicity',
        gaps: ['Simple tools lack power features', 'Enterprise tools are too complex'],
      });
    }
    return JSON.stringify({
      industryOverview: { sector: 'Project Management SaaS', trends: ['Remote work', 'AI-assisted'], marketSize: '$8B+' },
      targetAudience: { primary: 'Small teams (5-20)', personas: ['PMs', 'Team leads'] },
      keyTechnologies: ['React', 'Node.js', 'PostgreSQL'],
      gaps: ['Simple tools lack power', 'Enterprise tools too complex'],
    });
  }

  if (task === LLMTaskType.Creative) {
    return JSON.stringify({
      pages: [
        { name: 'dashboard', path: '/', description: 'Project overview', layout: 'dashboard', sections: ['stats', 'recent'], auth: true },
        { name: 'board', path: '/board/:id', description: 'Kanban board', layout: 'full-width', sections: ['columns'], auth: true },
        { name: 'settings', path: '/settings', description: 'User settings', layout: 'centered', sections: ['form'], auth: true },
      ],
      components: [
        { name: 'TaskCard', type: 'ui', description: 'Single task display', props: [{ name: 'task', type: 'object', required: true, description: 'Task data' }], states: ['default', 'dragging'] },
        { name: 'Column', type: 'layout', description: 'Kanban column', props: [{ name: 'title', type: 'string', required: true, description: 'Column title' }], states: ['empty', 'populated'] },
      ],
      designTokens: {
        colors: { primary: '#6366f1', secondary: '#8b5cf6', background: '#f8fafc', text: '#1e293b' },
        typography: { fontFamily: 'Inter, sans-serif', scale: ['12px', '14px', '16px', '20px', '24px', '32px'] },
        spacing: ['4px', '8px', '12px', '16px', '24px', '32px'],
        borderRadius: { sm: '4px', md: '8px', lg: '12px' },
      },
      navigation: { type: 'sidebar', items: [{ label: 'Dashboard', path: '/', icon: 'home' }, { label: 'Projects', path: '/projects', icon: 'folder' }] },
    });
  }

  if (task === LLMTaskType.CodeGeneration) {
    if (prompt.includes('database schema') || prompt.includes('schema for')) {
      return JSON.stringify({
        database: { type: 'relational', engine: 'postgres', orm: 'prisma' },
        tables: [
          {
            name: 'projects', description: 'Project workspaces',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primaryKey: true, description: 'Primary key' },
              { name: 'name', type: 'varchar(255)', nullable: false, description: 'Project name' },
              { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation time' },
            ],
            indexes: [{ columns: ['name'], unique: false, description: 'Search by name' }],
          },
          {
            name: 'tasks', description: 'Individual tasks',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primaryKey: true, description: 'Primary key' },
              { name: 'project_id', type: 'uuid', nullable: false, description: 'FK to projects' },
              { name: 'title', type: 'varchar(500)', nullable: false, description: 'Task title' },
              { name: 'status', type: 'varchar(50)', nullable: false, description: 'todo | in_progress | done' },
            ],
            indexes: [{ columns: ['project_id'], unique: false, description: 'Find tasks by project' }],
          },
        ],
        relationships: [{ from: 'tasks.project_id', to: 'projects.id', type: 'one-to-many', description: 'Project has many tasks' }],
        enums: [{ name: 'TaskStatus', values: ['todo', 'in_progress', 'done'], description: 'Task lifecycle' }],
      });
    }
    if (prompt.includes('API') || prompt.includes('endpoints')) {
      return JSON.stringify({
        style: 'rest', baseUrl: '/api/v1',
        authentication: { method: 'jwt', tokenExpiry: '1h', refreshStrategy: 'rotation' },
        endpoints: [
          { method: 'GET', path: '/projects', description: 'List projects', auth: true, response: { type: 'paginated', schema: 'Project[]' } },
          { method: 'POST', path: '/projects', description: 'Create project', auth: true, requestBody: { fields: [{ name: 'name', type: 'string', required: true }] } },
          { method: 'GET', path: '/projects/:id/tasks', description: 'List tasks', auth: true, response: { type: 'paginated', schema: 'Task[]' } },
        ],
        middleware: [{ name: 'rateLimit', config: '100/min' }, { name: 'cors', config: 'allow all' }],
      });
    }
    return '// generated code';
  }

  if (task === LLMTaskType.Review) {
    return JSON.stringify({ issues: [] });
  }

  if (task === LLMTaskType.Planning) {
    return JSON.stringify({
      architecture: { pattern: 'spa', description: 'React SPA with Node.js API backend' },
      techStack: {
        frontend: { framework: 'React', language: 'TypeScript', styling: 'Tailwind', stateManagement: 'Zustand' },
        backend: { framework: 'Express', language: 'TypeScript', runtime: 'Node.js' },
        database: { primary: 'PostgreSQL', cache: 'Redis' },
        hosting: { platform: 'Vercel', region: 'us-east' },
        tooling: { bundler: 'Vite', linter: 'ESLint', testing: 'Vitest' },
      },
      components: [
        { name: 'App', type: 'ui', description: 'Root', dependencies: [] },
        { name: 'ProjectList', type: 'ui', description: 'Lists projects', dependencies: ['Store'] },
        { name: 'TaskBoard', type: 'ui', description: 'Kanban', dependencies: ['Store', 'API'] },
      ],
      dataFlow: ['Auth → JWT', 'UI renders from state + API'],
      securityConsiderations: ['JWT auth', 'Input validation', 'CORS'],
      scalabilityNotes: ['Horizontal via Vercel', 'DB read replicas'],
    });
  }

  return '';
}

const adapter: LLMAdapterInterface = {
  call: async (params: LLMCallParams): Promise<LLMCallResult> => {
    const t0 = Date.now();
    const content = mockContent(params);

    return {
      content,
      parsed: params.responseSchema ? JSON.parse(content) : undefined,
      usage: { input: 100, output: content.length, total: 100 + content.length },
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      durationMs: Date.now() - t0,
    };
  },
  getTotalUsage: () => ({ calls: 0, totalTokens: 0, byProvider: {} }),
};

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Build.Anything — Pipeline Test          ║');
  console.log('╚══════════════════════════════════════════╝');

  const orch = new Orchestrator({
    workingDirectory: '.build-anything-test',
    enableCheckpoints: false,
    enableLLM: true,
    stageTimeoutSec: 30,
  });
  orch.setLLMAdapter(adapter);

  orch.on('stage:start', (e) => console.log(`  → ${e.stageId}: ${e.message}`));
  orch.on('stage:complete', (e) => console.log(`  ✓ ${e.stageId} (${e.data?.durationMs ?? 0}ms)`));
  orch.on('bos:loaded', (e) => console.log(`  📦 ${e.message}`));
  orch.on('intent:routed', (e) => console.log(`  🎯 ${e.message}`));

  console.log('\nRunning pipeline...\n');
  const t0 = Date.now();
  const result = await orch.run('Build a simple task tracker app');
  const elapsed = Date.now() - t0;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Pipeline: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Duration: ${elapsed}ms`);
  console.log(`Artifacts: ${Object.keys(result.artifacts).length}`);
  console.log(`Stages executed: ${result.stageResults.size}`);
  console.log(`LLM calls: ${result.totalLlmCalls}`);
  console.log(`Tokens: ${result.totalTokens}`);

  for (const [key] of Object.entries(result.artifacts)) {
    console.log(`  📄 ${key}`);
  }
}

main().catch(console.error);
