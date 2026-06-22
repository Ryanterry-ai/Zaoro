import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

function getDatabaseUrl(): string | undefined {
  return process.env.PLATFORM_DATABASE_URL || process.env.DATABASE_URL;
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error('PLATFORM_DATABASE_URL or DATABASE_URL must be set for platform persistence');
  }
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = url;
  }
  return new PrismaClient();
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export function isPersistenceAvailable(): boolean {
  return Boolean(getDatabaseUrl());
}

function requirePrisma(): PrismaClient {
  if (!isPersistenceAvailable()) {
    throw new Error('Platform persistence is not configured. Set PLATFORM_DATABASE_URL or DATABASE_URL.');
  }
  return getPrisma();
}

// ─── User ──────────────────────────────────────────────────────────

export async function getOrCreateUser(email: string, name?: string, avatarUrl?: string) {
  const prisma = requirePrisma();
  return prisma.user.upsert({
    where: { email },
    create: { email, name: name ?? null, avatarUrl: avatarUrl ?? null },
    update: { name: name ?? null, avatarUrl: avatarUrl ?? null },
  });
}

export async function getUser(id: string) {
  const prisma = requirePrisma();
  return prisma.user.findUnique({ where: { id } });
}

// ─── Project ───────────────────────────────────────────────────────

export async function createProject(userId: string, name: string, prompt: string, description?: string) {
  const prisma = requirePrisma();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  let finalSlug = slug;
  let counter = 1;
  while (await prisma.project.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter++}`;
  }

  return prisma.project.create({
    data: { userId, name, slug, prompt, description: description ?? null },
  });
}

export async function getProject(id: string) {
  const prisma = requirePrisma();
  return prisma.project.findUnique({ where: { id } });
}

export async function getProjectBySlug(slug: string) {
  const prisma = requirePrisma();
  return prisma.project.findUnique({ where: { slug } });
}

export async function listProjects(userId: string, limit = 20, offset = 0) {
  const prisma = requirePrisma();
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
    include: { builds: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
}

export async function updateProjectStatus(id: string, status: string) {
  const prisma = requirePrisma();
  return prisma.project.update({ where: { id }, data: { status } });
}

// ─── Build ─────────────────────────────────────────────────────────

export async function createBuild(projectId: string, prompt: string, llmProvider?: string) {
  const prisma = requirePrisma();
  return prisma.build.create({
    data: { projectId, prompt, llmProvider: llmProvider ?? null },
  });
}

export async function updateBuild(
  id: string,
  data: { status?: string; error?: string; duration?: number; fileCount?: number; patchCount?: number; completedAt?: Date },
) {
  const prisma = requirePrisma();
  return prisma.build.update({ where: { id }, data });
}

export async function getBuilds(projectId: string, limit = 10) {
  const prisma = requirePrisma();
  return prisma.build.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ─── Workspace ─────────────────────────────────────────────────────

export async function upsertWorkspace(projectId: string, files: Record<string, string>) {
  const prisma = requirePrisma();
  return prisma.workspace.upsert({
    where: { projectId },
    create: { projectId, files },
    update: { files },
  });
}

export async function getWorkspace(projectId: string) {
  const prisma = requirePrisma();
  return prisma.workspace.findUnique({ where: { projectId } });
}

export async function getWorkspaceFile(projectId: string, filePath: string): Promise<string | null> {
  const prisma = requirePrisma();
  const ws = await prisma.workspace.findUnique({ where: { projectId } });
  if (!ws) return null;
  const files = ws.files as Record<string, string>;
  return files[filePath] ?? null;
}

export async function setWorkspaceFile(projectId: string, filePath: string, content: string) {
  const prisma = requirePrisma();
  const ws = await prisma.workspace.findUnique({ where: { projectId } });
  if (!ws) throw new Error(`Workspace not found for project ${projectId}`);
  const files = ws.files as Record<string, string>;
  files[filePath] = content;
  return prisma.workspace.update({ where: { projectId }, data: { files } });
}

// ─── Message ───────────────────────────────────────────────────────

export async function createMessage(projectId: string, role: string, content: string) {
  const prisma = requirePrisma();
  return prisma.message.create({
    data: { projectId, role, content },
  });
}

export async function getMessages(projectId: string, limit = 50) {
  const prisma = requirePrisma();
  return prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

// ─── Health Check ──────────────────────────────────────────────────

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!isPersistenceAvailable()) return false;
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
