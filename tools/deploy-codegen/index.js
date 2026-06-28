#!/usr/bin/env node
/**
 * Build Engine — Deploy Codegen (Bucket A)
 * Generates platform-specific config files from a tier selection.
 * Pure deterministic — no LLM.
 *
 * Usage: node index.js --tier static|standard|fullstack --output ./project [--project-name my-site]
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { tier: 'standard', output: './project', projectName: 'my-site' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tier') opts.tier = args[++i];
    else if (args[i] === '--output') opts.output = args[++i];
    else if (args[i] === '--project-name') opts.projectName = args[++i];
  }
  return opts;
}

function generateStaticConfig(projectName) {
  return {
    '_redirects': '/index.html /index.html 200',
    'vercel.json': JSON.stringify({
      rewrites: [{ source: '/(.*)', destination: '/index.html' }],
    }, null, 2),
    'netlify.toml': `[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`,
  };
}

function generateStandardConfig(projectName) {
  return {
    'package.json': JSON.stringify({
      name: projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        typescript: '^5.0.0',
      },
    }, null, 2),
    'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
`,
    'Dockerfile': `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
`,
    'docker-compose.yml': `version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
`,
    'vercel.json': JSON.stringify({
      buildCommand: 'npm run build',
      outputDirectory: '.next',
      framework: 'nextjs',
    }, null, 2),
  };
}

function generateFullstackConfig(projectName) {
  const standard = generateStandardConfig(projectName);
  standard['docker-compose.yml'] = `version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/${projectName}
    depends_on:
      - db

volumes:
  pgdata:
`;
  standard['prisma/schema.prisma'] = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;
  return standard;
}

async function main() {
  const opts = parseArgs();
  console.log(`[DeployCodegen] Generating ${opts.tier} config for "${opts.projectName}"`);

  let configs;
  switch (opts.tier) {
    case 'static': configs = generateStaticConfig(opts.projectName); break;
    case 'fullstack': configs = generateFullstackConfig(opts.projectName); break;
    default: configs = generateStandardConfig(opts.projectName); break;
  }

  const outputDir = path.resolve(opts.output);
  fs.mkdirSync(outputDir, { recursive: true });

  for (const [filename, content] of Object.entries(configs)) {
    const filePath = path.join(outputDir, filename);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content);
    console.log(`[DeployCodegen] Created ${filename}`);
  }

  // Generate DEPLOY.md
  const deployMd = generateDeployMd(opts.tier, opts.projectName);
  fs.writeFileSync(path.join(outputDir, 'DEPLOY.md'), deployMd);

  console.log(`[DeployCodegen] Done. Config files created in ${outputDir}`);
  process.exit(0);
}

function generateDeployMd(tier, projectName) {
  const sections = {
    static: `# Deploy: ${projectName}

## Tier: Static

### Vercel
1. Push to GitHub
2. Import at vercel.com/new
3. Framework: "Other"
4. Deploy

### Netlify
1. Push to GitHub
2. New site from Git at app.netlify.com
3. Build command: (leave empty)
4. Publish directory: .
5. Deploy

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: Deploy from branch
3. Branch: main, folder: / (root)
4. Save
`,
    standard: `# Deploy: ${projectName}

## Tier: Standard (Next.js Standalone)

### Vercel (recommended)
1. Push to GitHub
2. Import at vercel.com/new
3. Framework: Next.js (auto-detected)
4. Deploy

### Docker
1. \`docker build -t ${projectName} .\`
2. \`docker run -p 3000:3000 ${projectName}\`

### Railway
1. Push to GitHub
2. New project at railway.app
3. Deploy from GitHub repo
4. Auto-detects Next.js

### Any VM
1. Install Node.js 20+
2. \`npm ci && npm run build\`
3. \`npm start\`
4. Set up nginx reverse proxy to port 3000
`,
    fullstack: `# Deploy: ${projectName}

## Tier: Fullstack (Next.js + PostgreSQL)

### Docker Compose (recommended)
1. \`docker-compose up -d\`
2. Site at http://localhost:3000

### Railway
1. Push to GitHub
2. New project → PostgreSQL service + Web service
3. Set DATABASE_URL environment variable
4. Deploy

### Render
1. Push to GitHub
2. New Web Service + New PostgreSQL
3. Set DATABASE_URL in web service env
4. Build: \`npm run build\`, Start: \`npm start\`
`,
  };

  return sections[tier] || sections.standard;
}

main().catch(err => { console.error('[DeployCodegen] Fatal:', err.message); process.exit(1); });
