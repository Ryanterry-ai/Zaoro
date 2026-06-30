FROM node:22-slim

# Install Playwright system dependencies + Chromium in one layer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for tsx, esbuild, prisma CLI)
RUN npm install

# Install Playwright Chromium browser
RUN npx playwright install chromium

# Copy source code
COPY . .

# Generate Prisma client using LOCAL binary (pinned at 5.10.2)
# --no-install ensures it fails loudly if prisma isn't in node_modules
# Placeholder URL is only needed for schema parsing, never connects
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx --no-install prisma generate --schema=prisma/platform.prisma

# Create workspace directory
RUN mkdir -p sandbox_workspaces .prompts .progress

# Expose engine port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV ENGINE_PORT=3001

# Start the engine
CMD ["npx", "tsx", "src/server.ts"]
