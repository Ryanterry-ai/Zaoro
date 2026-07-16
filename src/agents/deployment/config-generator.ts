import type { DeployConfig, AuthConfig, PaymentConfig } from './types.js';

export class DeployConfigGenerator {
  static generateVercelJson(config: DeployConfig): string {
    const vercel: Record<string, unknown> = {
      version: 2,
      name: config.projectName,
      buildCommand: config.buildCommand ?? 'npm run build',
      outputDirectory: config.outputDir ?? '.next',
      framework: 'nextjs',
    };

    if (config.region) {
      vercel['regions'] = [config.region];
    }

    if (config.environment && Object.keys(config.environment).length > 0) {
      const envPairs = Object.entries(config.environment).map(([k, v]) => ({ key: k, value: v }));
      vercel['env'] = envPairs;
    }

    vercel['headers'] = [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];

    return JSON.stringify(vercel, null, 2);
  }

  static generateWranglerToml(config: DeployConfig): string {
    const lines: string[] = [
      `name = "${config.projectName}"`,
      'compatibility_date = "2024-09-23"',
      `compatibility_flags = ["nodejs_compat"]`,
      '',
      '[site]',
      'bucket = "./.vercel/output/static"',
      '',
    ];

    if (config.buildCommand) {
      lines.push('[build]');
      lines.push(`command = "${config.buildCommand}"`);
      lines.push('publish = ".vercel/output/static"');
      lines.push('');
    }

    if (config.environment && Object.keys(config.environment).length > 0) {
      lines.push('[vars]');
      for (const [key, value] of Object.entries(config.environment)) {
        lines.push(`${key} = "${value}"`);
      }
      lines.push('');
    }

    lines.push('[env.production]');
    lines.push(`name = "${config.projectName}-production"`);

    return lines.join('\n');
  }

  static generateDockerfile(
    config: DeployConfig,
    platform: 'nextjs' | 'fastapi' | 'both',
  ): string {
    const nodeVer = config.nodeVersion ?? '20';

    if (platform === 'fastapi' || platform === 'both') {
      return [
        `FROM python:3.12-slim AS base`,
        `WORKDIR /app`,
        `COPY requirements.txt .`,
        `RUN pip install --no-cache-dir -r requirements.txt`,
        `COPY . .`,
        ...(config.buildCommand
          ? [`RUN ${config.buildCommand}`]
          : []),
        `EXPOSE 8000`,
        `HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"`,
        `CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      ].join('\n');
    }

    // Next.js Dockerfile
    return [
      `FROM node:${nodeVer}-alpine AS base`,
      ``,
      `FROM base AS deps`,
      `WORKDIR /app`,
      `COPY package.json package-lock.json* ./`,
      `RUN npm ci`,
      ``,
      `FROM base AS builder`,
      `WORKDIR /app`,
      `COPY --from=deps /app/node_modules ./node_modules`,
      `COPY . .`,
      ...(config.buildCommand
        ? [`RUN ${config.buildCommand}`]
        : [`RUN npm run build`]),
      ``,
      `FROM base AS runner`,
      `WORKDIR /app`,
      `ENV NODE_ENV=production`,
      `ENV PORT=3000`,
      ``,
      `RUN addgroup --system --gid 1001 nodejs`,
      `RUN adduser --system --uid 1001 nextjs`,
      ``,
      `COPY --from=builder /app/public ./public`,
      `COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./`,
      `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static`,
      ``,
      `USER nextjs`,
      `EXPOSE 3000`,
      `ENV PORT=3000`,
      `ENV HOSTNAME="0.0.0.0"`,
      ``,
      `HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1`,
      `CMD ["node", "server.js"]`,
    ].join('\n');
  }

  static generateDockerCompose(config: DeployConfig): string {
    const envLines: string[] = [];
    if (config.environment) {
      for (const [key, value] of Object.entries(config.environment)) {
        envLines.push(`      - ${key}=${value}`);
      }
    }

    const envBlock =
      envLines.length > 0
        ? `\n    environment:\n${envLines.join('\n')}`
        : '';

    return [
      `version: "3.8"`,
      ``,
      `services:`,
      `  ${config.projectName}:`,
      `    build: .`,
      `    ports:`,
      `      - "3000:3000"`,
      `    restart: unless-stopped`,
      `    healthcheck:`,
      `      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]`,
      `      interval: 30s`,
      `      timeout: 10s`,
      `      retries: 3`,
      `      start_period: 5s`,
      envBlock,
      ``,
      `volumes:`,
      `  app-data:`,
    ].join('\n');
  }

  static generateNetlifyToml(config: DeployConfig): string {
    const lines: string[] = [
      `[build]`,
      `command = "${config.buildCommand ?? 'npm run build'}"`,
      `publish = "${config.outputDir ?? '.next'}"`,
      ``,
      `[[headers]]`,
      `for = "/*"`,
      `[headers.values]`,
      `  X-Content-Type-Options = "nosniff"`,
      `  X-Frame-Options = "DENY"`,
      `  X-XSS-Protection = "1; mode=block"`,
      ``,
    ];

    if (config.environment && Object.keys(config.environment).length > 0) {
      lines.push('[build.environment]');
      for (const [key, value] of Object.entries(config.environment)) {
        lines.push(`${key} = "${value}"`);
      }
      lines.push('');
    }

    lines.push('[[redirects]]');
    lines.push('from = "/*"');
    lines.push('to = "/index.html"');
    lines.push('status = 200');

    return lines.join('\n');
  }

  static generateEnvExample(
    config: DeployConfig,
    authConfig?: AuthConfig,
    paymentConfig?: PaymentConfig,
  ): string {
    const lines: string[] = [
      '# ─── Deployment Environment Variables ──────────────────────────────────────',
      `# Project: ${config.projectName}`,
      `# Generated for: ${config.target}`,
      ``,
      '# ─── Core ─────────────────────────────────────────────────────────────────',
      `NODE_ENV=production`,
      `PORT=3000`,
      '',
    ];

    if (config.environment) {
      for (const [key, value] of Object.entries(config.environment)) {
        lines.push(`${key}=${value}`);
      }
      lines.push('');
    }

    if (authConfig) {
      lines.push('# ─── Authentication ────────────────────────────────────────────────────────');
      lines.push(`AUTH_PROVIDER=${authConfig.provider ?? 'credentials'}`);
      if (authConfig.clientId) {
        lines.push(`AUTH_CLIENT_ID=${authConfig.clientId}`);
      }
      if (authConfig.redirectUrl) {
        lines.push(`AUTH_REDIRECT_URL=${authConfig.redirectUrl}`);
      }
      lines.push(`AUTH_SECRET=your-secret-here`);
      lines.push('');
    }

    if (paymentConfig) {
      lines.push('# ─── Payment ──────────────────────────────────────────────────────────────');
      lines.push(`PAYMENT_PROVIDER=${paymentConfig.provider ?? 'stripe'}`);
      lines.push(`PAYMENT_CURRENCY=${paymentConfig.currency ?? 'usd'}`);
      if (paymentConfig.webhookSecret) {
        lines.push(`PAYMENT_WEBHOOK_SECRET=${paymentConfig.webhookSecret}`);
      }
      lines.push(`STRIPE_SECRET_KEY=sk_test_your_key_here`);
      lines.push('');
    }

    lines.push('# ─── Database ─────────────────────────────────────────────────────────────');
    lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
    lines.push('');
    lines.push('# ─── API Keys ─────────────────────────────────────────────────────────────');
    lines.push('# Add any additional API keys required by your application');

    return lines.join('\n');
  }

  static generateGitHubActions(config: DeployConfig): string {
    const targetSteps: Record<string, string[]> = {
      vercel: [
        '      - name: Deploy to Vercel',
        '        uses: amondnet/vercel-action@v25',
        '        with:',
        '          vercel-token: ${{ secrets.VERCEL_TOKEN }}',
        '          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}',
        '          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}',
        '          vercel-args: "--prod"',
      ],
      cloudflare: [
        '      - name: Deploy to Cloudflare Pages',
        '        uses: cloudflare/wrangler-action@v3',
        '        with:',
        '          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}',
        '          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
        '          command: pages deploy .vercel/output/static --project-name=${{ github.event.repository.name }}',
      ],
      docker: [
        '      - name: Build Docker image',
        '        run: docker build -t ${{ github.repository }}:${{ github.sha }} .',
        '      - name: Push to registry',
        '        run: |',
        '          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin',
        '          docker tag ${{ github.repository }}:${{ github.sha }} ${{ github.repository }}:latest',
        '          docker push ${{ github.repository }}:${{ github.sha }}',
        '          docker push ${{ github.repository }}:latest',
      ],
      netlify: [
        '      - name: Deploy to Netlify',
        '        uses: netlify/actions/cli@master',
        '        with:',
        '          args: deploy --prod --dir=.next',
        '        env:',
        '          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}',
        '          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}',
      ],
      manual: [
        '      - name: Deployment skipped',
        '        run: echo "Manual deployment — no automated deploy step"',
      ],
    };

    const steps = targetSteps[config.target] ?? targetSteps['manual']!;
    const envBlock =
      config.environment && Object.keys(config.environment).length > 0
        ? Object.entries(config.environment)
            .map(([k, v]) => `          ${k}: "${v}"`)
            .join('\n')
        : '';

    const lines = [
      `name: Deploy ${config.projectName}`,
      '',
      'on:',
      '  push:',
      '    branches: [main]',
      '  workflow_dispatch:',
      '',
      'jobs:',
      `  deploy:`,
      `    runs-on: ubuntu-latest`,
      `    steps:`,
      `      - name: Checkout`,
      `        uses: actions/checkout@v4`,
      ``,
      `      - name: Setup Node.js`,
      `        uses: actions/setup-node@v4`,
      `        with:`,
      `          node-version: "${config.nodeVersion ?? '20'}"`,
      ``,
      `      - name: Install dependencies`,
      `        run: npm ci`,
      ``,
      `      - name: Build`,
      `        run: ${config.buildCommand ?? 'npm run build'}`,
      ...(envBlock
        ? [`        env:`, envBlock]
        : []),
      '',
      ...steps,
      '',
      '      - name: Health check',
      '        if: success()',
      '        run: sleep 30 && curl -sf ${{ steps.deploy.outputs.url || steps.deploy.outputs.url }} || echo "Health check skipped — no URL available"',
    ];

    return lines.join('\n');
  }
}
