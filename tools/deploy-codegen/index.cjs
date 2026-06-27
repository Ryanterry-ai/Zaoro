// tools/deploy-codegen/index.js
// Bucket A — tier → platform config files.
// Usage: node tools/deploy-codegen/index.js <tier> <output-dir> [--platform vercel|netlify|docker]
// Generates: vercel.json, netlify.toml, Dockerfile, docker-compose.yml as needed

const fs = require('fs');
const path = require('path');

function generateVercelConfig(tier) {
  return JSON.stringify({
    buildCommand: tier === 'tier-static' ? 'npm run build' : 'npm run build',
    outputDirectory: tier === 'tier-static' ? 'dist' : '.next',
    framework: tier === 'tier-static' ? 'astro' : 'nextjs',
  }, null, 2);
}

function generateNetlifyConfig(tier) {
  return `[build]
  command = "npm run build"
  publish = "${tier === 'tier-static' ? 'dist' : '.next'}"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
}

function generateDockerfile(tier) {
  if (tier === 'tier-fullstack') {
    return `FROM node:20-alpine AS base
RUN npm install -g prisma
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
  }
  return `FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;
}

function generateDockerCompose(tier) {
  if (tier === 'tier-fullstack') {
    return `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/buildengine
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=buildengine
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
`;
  }
  return null;
}

function generateDEPLOYMD(tier, platform) {
  const platforms = {
    vercel: `## Deploy to Vercel

\`\`\`bash
npm i -g vercel
vercel
\`\`\`

## Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as shown`,
    netlify: `## Deploy to Netlify

\`\`\`bash
npm i -g netlify-cli
netlify deploy --prod
\`\`\`

## Custom Domain

1. Go to Site Settings → Domain Management
2. Add custom domain
3. Update DNS`,
    docker: `## Deploy with Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## Custom Domain

1. Configure nginx reverse proxy
2. Add SSL with certbot
3. Update DNS A record`,
  };

  return `# Deploy Guide — ${tier}

## Platform: ${platform}

${platforms[platform] || platforms.vercel}

## Environment Variables

${tier === 'tier-fullstack' ? 'DATABASE_URL=postgresql://...' : 'No environment variables required'}

## Content Editing

All content lives in \`content/*.json\`. Edit these files to update
page text, products, services, and other dynamic content without
touching component code.
`;
}

const tier = process.argv[2] || 'tier-standard';
const outputDir = process.argv[3] || process.cwd();
const platformIdx = process.argv.indexOf('--platform');
const platform = platformIdx >= 0 ? process.argv[platformIdx + 1] : 'vercel';

fs.mkdirSync(outputDir, { recursive: true });

// Generate platform configs
fs.writeFileSync(path.join(outputDir, 'vercel.json'), generateVercelConfig(tier));
fs.writeFileSync(path.join(outputDir, 'netlify.toml'), generateNetlifyConfig(tier));
fs.writeFileSync(path.join(outputDir, 'Dockerfile'), generateDockerfile(tier));

if (tier === 'tier-fullstack') {
  fs.writeFileSync(path.join(outputDir, 'docker-compose.yml'), generateDockerCompose(tier));
}

fs.writeFileSync(path.join(outputDir, 'DEPLOY.md'), generateDEPLOYMD(tier, platform));

console.log(`Generated deploy configs for ${tier} (${platform})`);
