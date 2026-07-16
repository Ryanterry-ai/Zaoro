import type { DeployTarget } from './types.js';

export function detectDeploymentPlatform(
  files: Map<string, string>,
): DeployTarget {
  if (files.has('wrangler.toml') || files.has('wrangler.json')) {
    return 'cloudflare';
  }

  if (files.has('Dockerfile') || files.has('docker-compose.yml') || files.has('docker-compose.yaml')) {
    return 'docker';
  }

  if (files.has('netlify.toml')) {
    return 'netlify';
  }

  if (files.has('vercel.json')) {
    return 'vercel';
  }

  if (files.has('next.config.js') || files.has('next.config.mjs') || files.has('next.config.ts')) {
    return 'vercel';
  }

  if (files.has('package.json')) {
    const pkg = files.get('package.json') ?? '';
    if (pkg.includes('next')) return 'vercel';
    if (pkg.includes('nuxt')) return 'vercel';
  }

  if (files.has('requirements.txt') || files.has('pyproject.toml')) {
    return 'docker';
  }

  if (files.has('main.py') || files.has('app.py')) {
    return 'docker';
  }

  return 'vercel';
}

export function getPlatformInstructions(target: DeployTarget): {
  setupCommands: string[];
  deployCommand: string;
  envVars: string[];
  estimatedTime: string;
} {
  switch (target) {
    case 'vercel':
      return {
        setupCommands: ['npm i -g vercel', 'vercel login'],
        deployCommand: 'vercel --prod',
        envVars: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
        estimatedTime: '1-3 minutes',
      };

    case 'cloudflare':
      return {
        setupCommands: ['npm i -g wrangler', 'wrangler login'],
        deployCommand: 'wrangler pages deploy .vercel/output/static',
        envVars: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
        estimatedTime: '2-4 minutes',
      };

    case 'docker':
      return {
        setupCommands: ['docker build -t app .', 'docker run -p 3000:3000 app'],
        deployCommand: 'docker compose up -d',
        envVars: ['DOCKER_REGISTRY', 'DOCKER_USERNAME', 'DOCKER_PASSWORD'],
        estimatedTime: '3-5 minutes',
      };

    case 'netlify':
      return {
        setupCommands: ['npm i -g netlify-cli', 'netlify login'],
        deployCommand: 'netlify deploy --prod --dir=.next',
        envVars: ['NETLIFY_AUTH_TOKEN', 'NETLIFY_SITE_ID'],
        estimatedTime: '1-3 minutes',
      };

    case 'manual':
      return {
        setupCommands: [],
        deployCommand: 'echo "Manual deployment required"',
        envVars: [],
        estimatedTime: 'varies',
      };
  }
}
