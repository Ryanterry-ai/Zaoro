import * as fs from 'fs';
import * as path from 'path';

export const ARTIFACTS_DIR = '.build-artifacts';

export interface ArtifactInfo {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

export interface InspectorState {
  artifacts: ArtifactInfo[];
  summary: {
    totalArtifacts: number;
    totalSizeBytes: number;
    stages: string[];
    hasBlueprint: boolean;
    hasIR: boolean;
    hasReport: boolean;
    hasFiles: boolean;
    generatedAt: string | null;
  };
}

export function saveArtifact(workspacePath: string, name: string, data: unknown): string {
  const artifactsDir = path.join(workspacePath, ARTIFACTS_DIR);
  fs.mkdirSync(artifactsDir, { recursive: true });
  const targetPath = path.join(artifactsDir, name);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  return targetPath;
}

export function saveBuildArtifacts(
  workspacePath: string,
  prompt: string,
  breContext: Record<string, unknown>,
  breResult: { decisions: unknown[]; constraintReport: unknown; confidence: number; selectedDesignProfile: unknown; selectedPattern: unknown; usedLLMPlanning: boolean },
  blueprint: { pages: Array<{ path: string; title?: string }>; entities: unknown[]; apis: unknown[]; workflows: unknown[]; dataModels?: Array<{ name: string }>; confidence?: number; warnings?: string[] },
  executionBlueprint: { pages: Array<{ path: string; [key: string]: unknown }> },
  applicationSpec: { pages: Array<{ [key: string]: unknown }> },
  renderResult: { files: Array<{ path: string; type: string; content?: string }>; warnings: string[] },
  graphStats?: { nodes: number; edges: number; [key: string]: unknown },
  healingResult?: { success: boolean; iterations: number; errorsFixed: number; remainingErrors: Array<{ file: string; message: string }> },
): string[] {
  const written: string[] = [];
  const ts = Date.now();

  written.push(saveArtifact(workspacePath, '00-manifest.json', {
    createdAt: new Date().toISOString(),
    ts,
    prompt: prompt.slice(0, 200),
    stages: ['bre-context', 'rules-decisions', 'blueprint', 'execution-blueprint', 'application-spec', 'render-result', 'quality-report'],
    totalStages: 7,
  }));

  written.push(saveArtifact(workspacePath, '01-bre-context.json', breContext));

  written.push(saveArtifact(workspacePath, '02-rules-decisions.json', {
    decisions: (breResult.decisions ?? []).map((d: any) => ({
      ruleId: d.ruleId, ruleName: d.ruleName, action: d.action, confidence: d.confidence, trace: d.trace,
    })),
    constraints: breResult.constraintReport,
  }));

  written.push(saveArtifact(workspacePath, '03-blueprint.json', {
    pages: (blueprint.pages ?? []).map(p => ({ path: p.path, title: p.title || p.path })),
    entities: (blueprint.entities ?? []).map((e: any) => e.name || e),
    apis: (blueprint.apis ?? []).length,
    workflows: (blueprint.workflows ?? []).length,
    dataModels: (blueprint.dataModels ?? []).map((m: { name: string }) => m.name),
    confidence: blueprint.confidence ?? breResult.confidence,
    warnings: blueprint.warnings ?? [],
  }));

  written.push(saveArtifact(workspacePath, '04-execution-blueprint.json', {
    pages: (executionBlueprint.pages ?? []).map(p => ({
      path: p.path,
      slots: ((p as any).slots ?? []).length,
    })),
  }));

  written.push(saveArtifact(workspacePath, '05-application-spec.json', {
    pages: (applicationSpec.pages ?? []).map(p => ({
      components: ((p as any).components ?? []).length,
      layout: (p as any).layout,
    })),
    totalPages: (applicationSpec.pages ?? []).length,
    totalComponents: (applicationSpec.pages ?? []).reduce((s: number, p: any) => s + (p.components ?? []).length, 0),
  }));

  written.push(saveArtifact(workspacePath, '06-render-result.json', {
    files: renderResult.files.map(f => ({ path: f.path, type: f.type })),
    warnings: renderResult.warnings,
    graphStats,
  }));

  if (healingResult) {
    written.push(saveArtifact(workspacePath, '07-self-healing.json', {
      success: healingResult.success,
      iterations: healingResult.iterations,
      errorsFixed: healingResult.errorsFixed,
      remainingErrors: healingResult.remainingErrors.map(e => ({ file: e.file, message: e.message })),
    }));
  }

  return written;
}

export function inspectArtifacts(workspacePath: string): InspectorState {
  const artifactsDir = path.join(workspacePath, ARTIFACTS_DIR);
  if (!fs.existsSync(artifactsDir)) {
    return { artifacts: [], summary: { totalArtifacts: 0, totalSizeBytes: 0, stages: [], hasBlueprint: false, hasIR: false, hasReport: false, hasFiles: false, generatedAt: null } };
  }

  const artifacts: ArtifactInfo[] = [];
  const walkDir = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkDir(full);
      else if (entry.isFile()) {
        const stat = fs.statSync(full);
        artifacts.push({ name: path.relative(artifactsDir, full), path: full, size: stat.size, modifiedAt: stat.mtimeMs });
      }
    }
  };
  walkDir(artifactsDir);

  const stageFiles = artifacts.filter(a => /^\d{2}-/.test(a.name));
  const totalSize = artifacts.reduce((s, a) => s + a.size, 0);
  const manifest = artifacts.find(a => a.name === '00-manifest.json');

  return {
    artifacts,
    summary: {
      totalArtifacts: artifacts.length,
      totalSizeBytes: totalSize,
      stages: stageFiles.map(a => a.name.replace(/^\d{2}-/, '').replace('.json', '')),
      hasBlueprint: artifacts.some(a => a.name.includes('blueprint')),
      hasIR: fs.existsSync(path.join(workspacePath, '.ir.json')),
      hasReport: artifacts.some(a => a.name.includes('render-result')),
      hasFiles: artifacts.some(a => a.name === 'files'),
      generatedAt: manifest ? readManifestTimestamp(artifactsDir) : null,
    },
  };
}

function readManifestTimestamp(artifactsDir: string): string | null {
  try {
    const raw = fs.readFileSync(path.join(artifactsDir, '00-manifest.json'), 'utf-8');
    const manifest = JSON.parse(raw);
    return manifest.createdAt || null;
  } catch { return null; }
}

export function loadArtifact<T = unknown>(workspacePath: string, name: string): T | null {
  const artifactPath = path.join(workspacePath, ARTIFACTS_DIR, name);
  if (!fs.existsSync(artifactPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf-8')) as T;
  } catch { return null; }
}
