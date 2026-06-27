// src/engine/skills-loader.ts
// Loads SKILL.md files from skills/ directory.
// Provides skill metadata to the pipeline without LLM calls.

import * as fs from 'fs';
import * as path from 'path';

const SKILLS_DIR = path.resolve(__dirname, '../../skills');

export interface SkillInfo {
  name: string;
  path: string;
  bucket: 'A' | 'B' | 'unknown';
  description: string;
  isBusinessReasoning: boolean;
}

export interface SkillsManifest {
  pipeline: SkillInfo[];
  businessReasoning: SkillInfo[];
  total: number;
}

function parseSkillFrontmatter(content: string): { name: string; bucket: string; description: string } {
  const nameMatch = content.match(/name:\s*(.+)/);
  const bucketMatch = content.match(/bucket:\s*(.+)/);
  const descMatch = content.match(/description:\s*(.+)/);
  return {
    name: nameMatch?.[1]?.trim() || 'unknown',
    bucket: bucketMatch?.[1]?.trim() || 'unknown',
    description: descMatch?.[1]?.trim() || '',
  };
}

function loadSkillDir(dirPath: string): SkillInfo | null {
  const skillFile = path.join(dirPath, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;

  const content = fs.readFileSync(skillFile, 'utf-8');
  const parsed = parseSkillFrontmatter(content);

  return {
    name: parsed.name,
    path: dirPath,
    bucket: (parsed.bucket as 'A' | 'B') || 'unknown',
    description: parsed.description,
    isBusinessReasoning: false,
  };
}

export function loadAllSkills(): SkillsManifest {
  const pipeline: SkillInfo[] = [];
  const businessReasoning: SkillInfo[] = [];

  // Load pipeline skills (direct children of skills/)
  if (fs.existsSync(SKILLS_DIR)) {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'business-reasoning') {
        const skill = loadSkillDir(path.join(SKILLS_DIR, entry.name));
        if (skill) pipeline.push(skill);
      }
    }
  }

  // Load business-reasoning agents
  const brDir = path.join(SKILLS_DIR, 'business-reasoning');
  if (fs.existsSync(brDir)) {
    const entries = fs.readdirSync(brDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skill = loadSkillDir(path.join(brDir, entry.name));
        if (skill) {
          skill.isBusinessReasoning = true;
          businessReasoning.push(skill);
        }
      }
    }
  }

  return {
    pipeline,
    businessReasoning,
    total: pipeline.length + businessReasoning.length,
  };
}

export function getSkillContent(skillPath: string): string | null {
  const skillFile = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;
  return fs.readFileSync(skillFile, 'utf-8');
}

export function getSkillsByBucket(manifest: SkillsManifest, bucket: 'A' | 'B'): SkillInfo[] {
  return [...manifest.pipeline, ...manifest.businessReasoning].filter(s => s.bucket === bucket);
}
