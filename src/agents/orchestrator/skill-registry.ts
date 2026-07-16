/**
 * Skill Registry — maps agent tasks to installable skills.
 *
 * When an agent needs a capability it doesn't have, it can:
 * 1. Check this registry for a known skill
 * 2. Verify if the skill is already installed
 * 3. Discover new skills via `npx skills find`
 * 4. Install the skill via `npx skills add`
 * 5. Load the skill's instructions for use
 *
 * This follows the find-skills pattern: agents are self-sufficient
 * and can discover/install capabilities on demand.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Skill Definition ────────────────────────────────────────────────────────

export interface SkillDefinition {
  /** Unique skill identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this skill does */
  description: string;
  /** Task categories this skill covers */
  taskCategories: string[];
  /** GitHub package to install from (owner/repo@skill) */
  installPackage: string | undefined;
  /** Whether this skill is critical (pipeline fails without it) */
  critical: boolean;
}

// ─── Skill Search Result ─────────────────────────────────────────────────────

export interface SkillSearchResult {
  id: string;
  name: string;
  installs: number;
  source: string;
  installCommand: string;
}

// ─── Installed Skill ─────────────────────────────────────────────────────────

export interface InstalledSkill {
  id: string;
  name: string;
  path: string;
  instructions: string;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const KNOWN_SKILLS: SkillDefinition[] = [
  // ─── UI/UX Design Skills ────────────────────────────────────────────────
  {
    id: 'ui-ux-pro-max',
    name: 'UI/UX Pro Max',
    description: '50+ styles, 161 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types. Comprehensive design intelligence for web and mobile.',
    taskCategories: ['ui-design', 'ux-design', 'color-palette', 'typography', 'layout', 'accessibility', 'animation', 'design-system'],
    installPackage: undefined, // Local skill at ~/.claude/skills/ui-ux-pro-max-skill-main
    critical: true,
  },
  {
    id: 'frontend-design',
    name: 'Frontend Design',
    description: 'Create distinctive, production-grade frontend interfaces with high design quality.',
    taskCategories: ['frontend-design', 'landing-page', 'ui-components', 'web-design'],
    installPackage: undefined, // Local skill
    critical: true,
  },
  {
    id: 'motion-framer',
    name: 'Framer Motion',
    description: 'Modern animation library for React. Smooth, production-ready animations with motion components, variants, gestures.',
    taskCategories: ['animation', 'framer-motion', 'react-animation', 'micro-interactions'],
    installPackage: undefined, // Local skill
    critical: false,
  },
  {
    id: 'impeccable',
    name: 'Impeccable',
    description: 'UI polish, component design, animation decisions, and invisible details that make software feel great.',
    taskCategories: ['ui-polish', 'component-design', 'animation-decisions', 'visual-quality'],
    installPackage: undefined, // Local skill
    critical: false,
  },
  {
    id: 'high-end-visual-design',
    name: 'High-End Visual Design',
    description: 'Premium design standards - fonts, spacing, shadows, card structures, animations that make websites feel expensive.',
    taskCategories: ['premium-design', 'visual-quality', 'design-polish'],
    installPackage: undefined, // Local skill at soft-skill
    critical: false,
  },
  {
    id: 'modern-web-design',
    name: 'Modern Web Design',
    description: 'Modern web design trends, principles, and implementation patterns for 2024-2025.',
    taskCategories: ['web-design-trends', 'modern-design', 'design-patterns'],
    installPackage: undefined, // Local skill
    critical: false,
  },
  // ─── Research & Scraping Skills ──────────────────────────────────────────
  {
    id: 'ecommerce-competitor-analysis',
    name: 'Ecommerce Competitor Analysis',
    description: 'Cross-platform ecommerce competitor analysis and strategic intelligence.',
    taskCategories: ['competitor-analysis', 'market-research', 'competitive-intelligence'],
    installPackage: 'nexscope-ai/ecommerce-skills@ecommerce-competitor-analysis',
    critical: false,
  },
  {
    id: 'product-research',
    name: 'Product Research',
    description: 'Product/user research methodology and insight synthesis.',
    taskCategories: ['product-research', 'user-research', 'insight-synthesis'],
    installPackage: 'alirezarezvani/claude-skills@product-research',
    critical: false,
  },
  {
    id: 'scrapling-official',
    name: 'Scrapling',
    description: 'Anti-bot web scraping with Cloudflare bypass, stealth browsing, and spiders.',
    taskCategories: ['web-scraping', 'data-extraction', 'crawl'],
    installPackage: undefined,
    critical: false,
  },
];

// Search queries by task category
const TASK_SEARCH_QUERIES: Record<string, string[]> = {
  'competitor-analysis': ['competitor analysis', 'competitive intelligence', 'market research'],
  'product-research': ['product research', 'user research', 'ecommerce research'],
  'web-scraping': ['web scraping', 'data extraction', 'crawl'],
  'price-monitoring': ['price monitoring', 'price tracking', 'ecommerce prices'],
  'seo-analysis': ['seo analysis', 'search optimization', 'keyword research'],
  'content-extraction': ['content extraction', 'text extraction', 'web content'],
};

export class SkillRegistry {
  private installedSkills: Map<string, InstalledSkill> = new Map();
  private workspaceDir: string;
  private initialized = false;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Initialize the registry by checking installed skills.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check global skills
    const globalSkillsDir = join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills');
    if (existsSync(globalSkillsDir)) {
      const { readdirSync } = await import('fs');
      const dirs = readdirSync(globalSkillsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const skillPath = join(globalSkillsDir, dir.name);
          const skillMd = join(skillPath, 'SKILL.md');
          if (existsSync(skillMd)) {
            const instructions = readFileSync(skillMd, 'utf-8');
            this.installedSkills.set(dir.name, {
              id: dir.name,
              name: dir.name,
              path: skillPath,
              instructions,
            });
          }
        }
      }
    }

    // Check project skills
    const projectSkillsDir = join(this.workspaceDir, '.claude', 'skills');
    if (existsSync(projectSkillsDir)) {
      const { readdirSync } = await import('fs');
      const dirs = readdirSync(projectSkillsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const skillPath = join(projectSkillsDir, dir.name);
          const skillMd = join(skillPath, 'SKILL.md');
          if (existsSync(skillMd)) {
            const instructions = readFileSync(skillMd, 'utf-8');
            this.installedSkills.set(dir.name, {
              id: dir.name,
              name: dir.name,
              path: skillPath,
              instructions,
            });
          }
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Check if a skill is installed.
   */
  hasSkill(skillId: string): boolean {
    return this.installedSkills.has(skillId);
  }

  /**
   * Get an installed skill's instructions.
   */
  getSkill(skillId: string): InstalledSkill | undefined {
    return this.installedSkills.get(skillId);
  }

  /**
   * Find the best skill for a task category.
   */
  findSkillForTask(taskCategory: string): SkillDefinition | undefined {
    // First check known skills
    const known = KNOWN_SKILLS.find(s => s.taskCategories.includes(taskCategory));
    if (known && this.hasSkill(known.id)) {
      return known;
    }

    // Return the known skill definition even if not installed yet
    return known;
  }

  /**
   * Discover new skills via `npx skills find`.
   */
  async discoverSkills(query: string): Promise<SkillSearchResult[]> {
    try {
      const output = execSync(`npx skills find "${query}" 2>&1`, {
        encoding: 'utf-8',
        timeout: 30000,
        cwd: this.workspaceDir,
      });

      const results: SkillSearchResult[] = [];
      const lines = output.split('\n');

      for (const line of lines) {
        // Match lines like: owner/repo@skill  123 installs
        const match = line.match(/(\S+@\S+)\s+([\d,.]+[KkMm]?)\s+installs/);
        if (match) {
          const packageId = match[1] ?? '';
          const installsStr = match[2] ?? '0';
          let installs = parseInt(installsStr.replace(/[,KkMm]/g, ''), 10);
          if (installsStr.match(/[Kk]/)) installs *= 1000;
          if (installsStr.match(/[Mm]/)) installs *= 1000000;

          const skillId = packageId.split('@').pop() || packageId;
          const source = packageId.split('@')[0] || '';

          results.push({
            id: skillId,
            name: skillId,
            installs,
            source,
            installCommand: `npx skills add ${packageId}`,
          });
        }
      }

      return results.sort((a, b) => b.installs - a.installs);
    } catch {
      return [];
    }
  }

  /**
   * Install a skill by package ID.
   */
  async installSkill(packageId: string): Promise<boolean> {
    try {
      execSync(`npx skills add ${packageId} -g -y 2>&1`, {
        encoding: 'utf-8',
        timeout: 60000,
        cwd: this.workspaceDir,
      });

      // Refresh installed skills
      this.installedSkills.clear();
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Auto-discover and install skills for a task category.
   * Returns the installed skill if successful.
   */
  async ensureSkillForTask(taskCategory: string): Promise<InstalledSkill | undefined> {
    // Check if we already have a skill for this task
    const known = this.findSkillForTask(taskCategory);
    if (known && this.hasSkill(known.id)) {
      return this.installedSkills.get(known.id);
    }

    // Try to install the known skill if we have a package
    if (known?.installPackage) {
      const installed = await this.installSkill(known.installPackage);
      if (installed) {
        return this.installedSkills.get(known.id);
      }
    }

    // Discover new skills
    const queries = TASK_SEARCH_QUERIES[taskCategory] || [taskCategory];
    for (const query of queries) {
      const discovered = await this.discoverSkills(query);
      if (discovered.length > 0) {
        // Install the most popular one
        const best = discovered[0];
        if (best) {
          const packageId = best.installCommand.replace('npx skills add ', '');
          const installed = await this.installSkill(packageId);
          if (installed) {
            return this.installedSkills.get(best.id);
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Get all installed skills.
   */
  getAllInstalled(): InstalledSkill[] {
    return Array.from(this.installedSkills.values());
  }

  /**
   * Get all known skills.
   */
  getAllKnown(): SkillDefinition[] {
    return KNOWN_SKILLS;
  }
}
