import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Industry, TechStackPreferences, ProjectReference } from '../types.js';
import { IntentType } from '../types.js';
import type { InputAdapter, AdapterResult } from './types.js';

interface CodebaseInfo {
  name: string;
  language: string;
  framework: string | undefined;
  hasPackageJson: boolean;
  dependencies: string[];
  devDependencies: string[];
  hasDockerfile: boolean;
  hasTests: boolean;
  hasCiConfig: boolean;
  sourceFiles: number;
  directories: string[];
}

const LANG_MAP: Record<string, string> = {
  'package.json': 'TypeScript/JavaScript',
  'tsconfig.json': 'TypeScript',
  'pyproject.toml': 'Python',
  'requirements.txt': 'Python',
  'Cargo.toml': 'Rust',
  'go.mod': 'Go',
  'go.sum': 'Go',
  'pom.xml': 'Java',
  'build.gradle': 'Kotlin/Java',
  'Gemfile': 'Ruby',
  'composer.json': 'PHP',
  '.csproj': 'C#',
  'CMakeLists.txt': 'C/C++',
};

const FRAMEWORK_PATTERNS: Array<[RegExp, string]> = [
  [/next|next\.js|nextjs/i, 'Next.js'],
  [/react|react-dom/i, 'React'],
  [/vue|vue\.js|vuejs/i, 'Vue.js'],
  [/angular/i, 'Angular'],
  [/svelte|sveltekit/i, 'Svelte'],
  [/nuxt|nuxt\.js|nuxtjs/i, 'Nuxt.js'],
  [/gatsby/i, 'Gatsby'],
  [/remix/i, 'Remix'],
  [/express/i, 'Express.js'],
  [/fastify/i, 'Fastify'],
  [/nestjs|@nestjs/i, 'NestJS'],
  [/django/i, 'Django'],
  [/flask/i, 'Flask'],
  [/fastapi/i, 'FastAPI'],
  [/spring/i, 'Spring Boot'],
  [/rails/i, 'Ruby on Rails'],
  [/laravel/i, 'Laravel'],
  [/asp\.net|\.net\s+core/i, 'ASP.NET Core'],
];

export class CodebaseAdapter implements InputAdapter {
  readonly type = IntentType.Codebase;

  canHandle(input: string): boolean {
    const trimmed = input.trim();
    if (trimmed.startsWith('/') || /^[a-zA-Z]:\\/.test(trimmed)) return fs.existsSync(trimmed);
    if (/github\.com\/[\w.-]+\/[\w.-]+/.test(trimmed)) return true;
    return false;
  }

  async process(input: string, _options?: Record<string, unknown>): Promise<AdapterResult> {
    const trimmed = input.trim();
    const isGitHub = /github\.com\/[\w.-]+\/[\w.-]+/.test(trimmed);

    let info: CodebaseInfo;
    if (!isGitHub && fs.existsSync(trimmed)) {
      info = await this.analyzeLocal(trimmed);
    } else {
      info = {
        name: this.deriveName(trimmed),
        language: 'Unknown',
        framework: undefined,
        hasPackageJson: false,
        dependencies: [],
        devDependencies: [],
        hasDockerfile: false,
        hasTests: false,
        hasCiConfig: false,
        sourceFiles: 0,
        directories: [],
      };
    }

    const detectedIndustry = this.detectIndustry(info);

    const id = `code-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const projectName = info.name;

    const techStack: TechStackPreferences = {};
    if (info.framework && ['React', 'Vue.js', 'Angular', 'Svelte', 'Next.js'].includes(info.framework)) {
      techStack.frontend = info.framework;
    } else if (info.framework) {
      techStack.backend = info.framework;
    }
    const db = this.detectDatabase(info);
    if (db) techStack.database = db;

    const reference: ProjectReference = {
      type: isGitHub || trimmed.startsWith('http') ? 'url' as const : 'file' as const,
      url: trimmed,
    };

    const manifest = {
      id,
      description: `Existing codebase: ${projectName} (${info.language})`,
      userInput: input,
      name: projectName,
      ...(detectedIndustry ? { domain: detectedIndustry } : {}),
      techStack,
      references: [reference],
      createdAt: new Date().toISOString(),
      version: 1,
    };

    return {
      manifest,
      adapterType: IntentType.Codebase,
      confidence: 0.8,
      detectedIndustry,
      detectedName: projectName,
      entities: this.inferEntities(detectedIndustry),
      pages: this.inferPages(detectedIndustry),
      integrations: this.inferIntegrations(info),
      metadata: {
        language: info.language,
        framework: info.framework,
        dependencies: info.dependencies,
        devDependencies: info.devDependencies,
        hasDockerfile: info.hasDockerfile,
        hasTests: info.hasTests,
        hasCiConfig: info.hasCiConfig,
        sourceFiles: info.sourceFiles,
        isGitHub,
      },
    };
  }

  private async analyzeLocal(rootPath: string): Promise<CodebaseInfo> {
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name);
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    const language = this.detectLanguage(files, dirs);

    let dependencies: string[] = [];
    let devDependencies: string[] = [];
    const pkgPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        dependencies = Object.keys(pkg.dependencies ?? {});
        devDependencies = Object.keys(pkg.devDependencies ?? {});
      } catch { /* ignore */ }
    }

    const allDeps = [...dependencies, ...devDependencies];
    const framework = this.detectFramework(allDeps);

    const sourceFiles = files.filter(f => /\.(ts|tsx|js|jsx|py|rs|go|rb|java|cs|php)$/i.test(f)).length;

    return {
      name: path.basename(rootPath),
      language,
      framework,
      hasPackageJson: files.includes('package.json'),
      dependencies,
      devDependencies,
      hasDockerfile: files.includes('Dockerfile') || files.includes('docker-compose.yml'),
      hasTests: files.some(f => /\.(test|spec|e2e)\./.test(f)) || dirs.some(d => /^(tests?|spec|__tests__)$/i.test(d)),
      hasCiConfig: files.some(f => /^\.(github|gitlab|circleci)/.test(f)),
      sourceFiles,
      directories: dirs,
    };
  }

  private detectLanguage(files: string[], _dirs: string[]): string {
    for (const file of files) {
      if (LANG_MAP[file]) return LANG_MAP[file];
    }
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) return 'TypeScript';
    if (files.some(f => f.endsWith('.js') || f.endsWith('.jsx'))) return 'JavaScript';
    if (files.some(f => f.endsWith('.py'))) return 'Python';
    if (files.some(f => f.endsWith('.rs'))) return 'Rust';
    if (files.some(f => f.endsWith('.go'))) return 'Go';
    if (files.some(f => f.endsWith('.java'))) return 'Java';
    if (files.some(f => f.endsWith('.rb'))) return 'Ruby';
    if (files.some(f => f.endsWith('.cs'))) return 'C#';
    return 'Unknown';
  }

  private detectFramework(deps: string[]): string | undefined {
    for (const [pattern, name] of FRAMEWORK_PATTERNS) {
      if (deps.some(d => pattern.test(d))) return name;
    }
    return undefined;
  }

  private detectDatabase(info: CodebaseInfo): string | undefined {
    const dbDeps = info.dependencies.filter(d =>
      /postgres|mysql|mongodb|redis|sqlite|prisma|typeorm|sequelize|knex|drizzle/i.test(d)
    );
    if (dbDeps.length === 0) return undefined;

    if (dbDeps.some(d => /postgres/i.test(d))) return 'PostgreSQL';
    if (dbDeps.some(d => /mysql/i.test(d))) return 'MySQL';
    if (dbDeps.some(d => /mongodb/i.test(d))) return 'MongoDB';
    if (dbDeps.some(d => /redis/i.test(d))) return 'Redis';
    if (dbDeps.some(d => /sqlite/i.test(d))) return 'SQLite';
    return dbDeps[0];
  }

  private deriveName(pathStr: string): string {
    const match = pathStr.match(/(?:github\.com\/[\w.-]+\/)([\w.-]+)/);
    const name = match?.[1];
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return path.basename(pathStr);
  }

  private detectIndustry(info: CodebaseInfo): Industry | undefined {
    const all = [...info.dependencies, ...info.devDependencies].join(' ').toLowerCase();

    if (/woocommerce|shopify|magento|bigcommerce/i.test(all)) return 'ecommerce';
    if (/stripe|plaid|square/i.test(all)) return 'fintech';
    if (/hipaa|fhir|hl7|health/i.test(all)) return 'healthcare';
    if (/lti|scorm|canvas/i.test(all)) return 'education';

    return undefined;
  }

  private inferEntities(industry?: Industry): string[] {
    if (industry === 'ecommerce') return ['Product', 'Category', 'Order', 'Customer', 'Cart'];
    if (industry === 'fintech') return ['Account', 'Transaction', 'User', 'Payment'];
    if (industry === 'healthcare') return ['Patient', 'Doctor', 'Appointment', 'Record'];
    if (industry === 'education') return ['Course', 'Student', 'Enrollment', 'Lesson'];
    return ['User'];
  }

  private inferPages(industry?: Industry): string[] {
    const common = ['/', '/login', '/signup', '/profile'];
    if (industry === 'ecommerce') return [...common, '/shop', '/cart', '/checkout', '/orders'];
    if (industry === 'fintech') return [...common, '/dashboard', '/transactions', '/accounts'];
    if (industry === 'healthcare') return [...common, '/appointments', '/doctors'];
    if (industry === 'education') return [...common, '/courses', '/lessons'];
    return common;
  }

  private inferIntegrations(info: CodebaseInfo): string[] {
    const integrations: string[] = [];
    const all = [...info.dependencies, ...info.devDependencies].map(d => d.toLowerCase());

    if (all.some(d => /stripe|razorpay|paypal/i.test(d))) integrations.push('payment-gateway');
    if (all.some(d => /auth0|clerk|firebase-auth|passport/i.test(d))) integrations.push('authentication');
    if (all.some(d => /sendgrid|postmark|nodemailer|ses/i.test(d))) integrations.push('email');
    if (all.some(d => /aws-sdk|@aws|google-cloud|azure/i.test(d))) integrations.push('cloud-provider');
    if (all.some(d => /redis|bull|sidekiq/i.test(d))) integrations.push('queue');

    return integrations;
  }
}
