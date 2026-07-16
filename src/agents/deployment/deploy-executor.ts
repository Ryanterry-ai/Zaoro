import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { DeployConfig, DeployResult, DeployProgress } from './types.js';
import { DeployConfigGenerator } from './config-generator.js';

export class DeployExecutor {
  private config: DeployConfig;
  private workspaceDir: string;
  private onProgress?: ((progress: DeployProgress) => void) | undefined;

  constructor(
    config: DeployConfig,
    workspaceDir: string,
    onProgress?: (progress: DeployProgress) => void,
  ) {
    this.config = config;
    this.workspaceDir = workspaceDir;
    this.onProgress = onProgress;
  }

  async deploy(): Promise<DeployResult> {
    const start = Date.now();

    this.emitProgress({ phase: 'configuring', message: 'Generating deployment configuration', percent: 0 });

    const configFiles = this.generateDeployConfig();
    for (const file of configFiles) {
      const filePath = join(this.workspaceDir, file.name);
      const dir = join(this.workspaceDir, file.name.split('/').slice(0, -1).join('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(filePath, file.content, 'utf-8');
    }

    this.emitProgress({ phase: 'configuring', message: 'Configuration files written', percent: 15 });

    let result: DeployResult;

    switch (this.config.target) {
      case 'vercel':
        result = await this.deployToVercel();
        break;
      case 'cloudflare':
        result = await this.deployToCloudflare();
        break;
      case 'docker':
        result = await this.deployWithDocker();
        break;
      case 'netlify':
        result = await this.deployToNetlify();
        break;
      default:
        result = {
          success: false,
          logs: [],
          errors: [`Unsupported deployment target: ${this.config.target}`],
          duration: Date.now() - start,
        };
    }

    result.duration = Date.now() - start;
    this.emitProgress({
      phase: result.success ? 'complete' : 'failed',
      message: result.success ? 'Deployment successful' : 'Deployment failed',
      percent: result.success ? 100 : undefined,
    });

    return result;
  }

  private async deployToVercel(): Promise<DeployResult> {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      this.emitProgress({ phase: 'building', message: 'Deploying to Vercel', percent: 30 });

      const output = this.runCommand('vercel --prod --yes', { timeout: 300_000 });
      logs.push(output);

      const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
      const url = urlMatch?.[0] ?? '';

      this.emitProgress({ phase: 'verifying', message: 'Verifying deployment', percent: 80 });

      if (url) {
        const ok = await this.verifyDeployment(url);
        if (!ok) {
          errors.push('Health check failed after deployment');
        }
      }

      return {
        success: errors.length === 0,
        url,
        logs,
        errors,
        duration: 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logs.push(message);
      return { success: false, logs, errors, duration: 0 };
    }
  }

  private async deployToCloudflare(): Promise<DeployResult> {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      this.emitProgress({ phase: 'building', message: 'Deploying to Cloudflare Pages', percent: 30 });

      const output = this.runCommand('wrangler pages deploy .vercel/output/static --commit-dirty=true', { timeout: 300_000 });
      logs.push(output);

      const urlMatch = output.match(/https:\/\/[^\s]+\.pages\.dev/);
      const url = urlMatch?.[0] ?? '';

      this.emitProgress({ phase: 'verifying', message: 'Verifying deployment', percent: 80 });

      if (url) {
        const ok = await this.verifyDeployment(url);
        if (!ok) {
          errors.push('Health check failed after deployment');
        }
      }

      return {
        success: errors.length === 0,
        url,
        logs,
        errors,
        duration: 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logs.push(message);
      return { success: false, logs, errors, duration: 0 };
    }
  }

  private async deployWithDocker(): Promise<DeployResult> {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      this.emitProgress({ phase: 'building', message: 'Building Docker image', percent: 30 });

      const tag = `${this.config.projectName}:latest`;
      const buildOutput = this.runCommand(`docker build -t ${tag} .`, { timeout: 600_000 });
      logs.push(buildOutput);

      this.emitProgress({ phase: 'deploying', message: 'Starting container', percent: 60 });

      const existing = this.runCommand(`docker ps -q --filter "name=${this.config.projectName}"`, { timeout: 10_000 }).trim();
      if (existing) {
        this.runCommand(`docker stop ${this.config.projectName}`, { timeout: 30_000 });
        this.runCommand(`docker rm ${this.config.projectName}`, { timeout: 30_000 });
      }

      const runOutput = this.runCommand(
        `docker run -d --name ${this.config.projectName} -p 3000:3000 ${tag}`,
        { timeout: 30_000 },
      );
      logs.push(runOutput);

      this.emitProgress({ phase: 'verifying', message: 'Running health check', percent: 80 });

      await new Promise((r) => setTimeout(r, 5000));
      const ok = await this.verifyDeployment('http://localhost:3000/health');

      return {
        success: ok,
        url: 'http://localhost:3000',
        deployId: runOutput.trim(),
        logs,
        errors: ok ? [] : ['Container started but health check failed'],
        duration: 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logs.push(message);
      return { success: false, logs, errors, duration: 0 };
    }
  }

  private async deployToNetlify(): Promise<DeployResult> {
    const logs: string[] = [];
    const errors: string[] = [];

    try {
      this.emitProgress({ phase: 'building', message: 'Deploying to Netlify', percent: 30 });

      const output = this.runCommand('netlify deploy --prod --dir=.next', { timeout: 300_000 });
      logs.push(output);

      const urlMatch = output.match(/https:\/\/[^\s]+\.netlify\.app/);
      const url = urlMatch?.[0] ?? '';

      this.emitProgress({ phase: 'verifying', message: 'Verifying deployment', percent: 80 });

      if (url) {
        const ok = await this.verifyDeployment(url);
        if (!ok) {
          errors.push('Health check failed after deployment');
        }
      }

      return {
        success: errors.length === 0,
        url,
        logs,
        errors,
        duration: 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      logs.push(message);
      return { success: false, logs, errors, duration: 0 };
    }
  }

  generateDeployConfig(): Array<{ name: string; content: string }> {
    const files: Array<{ name: string; content: string }> = [];

    switch (this.config.target) {
      case 'vercel':
        files.push({
          name: 'vercel.json',
          content: DeployConfigGenerator.generateVercelJson(this.config),
        });
        break;

      case 'cloudflare':
        files.push({
          name: 'wrangler.toml',
          content: DeployConfigGenerator.generateWranglerToml(this.config),
        });
        break;

      case 'docker':
        files.push({
          name: 'Dockerfile',
          content: DeployConfigGenerator.generateDockerfile(this.config, 'nextjs'),
        });
        files.push({
          name: 'docker-compose.yml',
          content: DeployConfigGenerator.generateDockerCompose(this.config),
        });
        break;

      case 'netlify':
        files.push({
          name: 'netlify.toml',
          content: DeployConfigGenerator.generateNetlifyToml(this.config),
        });
        break;

      case 'manual':
        break;
    }

    files.push({
      name: '.env.example',
      content: DeployConfigGenerator.generateEnvExample(this.config),
    });

    files.push({
      name: '.github/workflows/deploy.yml',
      content: DeployConfigGenerator.generateGitHubActions(this.config),
    });

    return files;
  }

  private async verifyDeployment(url: string): Promise<boolean> {
    try {
      const output = this.runCommand(
        `curl -sf -o /dev/null -w "%{http_code}" "${url}"`,
        { timeout: 30_000 },
      );
      const status = parseInt(output.trim(), 10);
      return status >= 200 && status < 400;
    } catch {
      return false;
    }
  }

  private runCommand(
    cmd: string,
    options?: { timeout?: number | undefined; cwd?: string | undefined },
  ): string {
    const timeout = options?.timeout ?? 120_000;
    const cwd = options?.cwd ?? this.workspaceDir;

    try {
      const result = execSync(cmd, {
        cwd,
        timeout,
        shell: true,
      } as unknown as Parameters<typeof execSync>[1]);
      return typeof result === 'string' ? result : result.toString('utf-8');
    } catch (err) {
      if (err && typeof err === 'object' && 'stderr' in err) {
        const stderr = (err as { stderr?: Buffer }).stderr;
        if (stderr) throw new Error(stderr.toString('utf-8'));
      }
      throw err;
    }
  }

  private emitProgress(progress: DeployProgress): void {
    this.onProgress?.(progress);
  }
}
