import { describe, it, expect } from 'vitest';
import { loadAllSkills, getSkillsByBucket, getSkillContent } from '../src/engine/skills-loader.js';

describe('SkillsLoader', () => {
  it('loadAllSkills should return all pipeline and business-reasoning skills', () => {
    const manifest = loadAllSkills();
    expect(manifest.total).toBeGreaterThan(0);
    expect(manifest.pipeline.length).toBeGreaterThan(0);
    expect(manifest.businessReasoning.length).toBe(20); // 19 business-os + 1 content-strategy
  });

  it('each skill should have required fields', () => {
    const manifest = loadAllSkills();
    for (const skill of [...manifest.pipeline, ...manifest.businessReasoning]) {
      expect(skill.name).toBeTruthy();
      expect(skill.path).toBeTruthy();
      expect(skill.bucket).toMatch(/^[AB]|unknown$/);
    }
  });

  it('pipeline skills should not be business-reasoning', () => {
    const manifest = loadAllSkills();
    for (const skill of manifest.pipeline) {
      expect(skill.isBusinessReasoning).toBe(false);
    }
  });

  it('business-reasoning skills should be marked as such', () => {
    const manifest = loadAllSkills();
    for (const skill of manifest.businessReasoning) {
      expect(skill.isBusinessReasoning).toBe(true);
    }
  });

  it('getSkillsByBucket should filter correctly', () => {
    const manifest = loadAllSkills();
    const bucketA = getSkillsByBucket(manifest, 'A');
    const bucketB = getSkillsByBucket(manifest, 'B');
    expect(bucketA.length + bucketB.length).toBeGreaterThan(0);
    for (const skill of bucketA) {
      expect(skill.bucket).toBe('A');
    }
    for (const skill of bucketB) {
      expect(skill.bucket).toBe('B');
    }
  });

  it('getSkillContent should return SKILL.md content', () => {
    const manifest = loadAllSkills();
    const firstSkill = manifest.pipeline[0];
    if (firstSkill) {
      const content = getSkillContent(firstSkill.path);
      expect(content).toBeTruthy();
      expect(content).toContain('name:');
    }
  });

  it('all 19 business-os agents should be present', () => {
    const manifest = loadAllSkills();
    const expectedAgents = [
      'automation', 'business-problems', 'business-research', 'compliance',
      'customer-journey', 'dashboard-generator', 'database-generator',
      'design-research', 'industry-intelligence', 'integrations',
      'mobile-app-architect', 'orchestration', 'reporting', 'revenue-model',
      'solution-generator', 'ui-research', 'ux-research', 'website-architect',
      'workflow-research',
    ];
    const brNames = manifest.businessReasoning.map(s => {
      const parts = s.path.split(/[/\\]/);
      return parts[parts.length - 1];
    });
    for (const agent of expectedAgents) {
      expect(brNames).toContain(agent);
    }
  });
});
