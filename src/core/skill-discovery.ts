import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface SkillInfo {
  name: string;
  package: string;
  installed: boolean;
  path?: string | undefined;
  source?: 'local' | 'skills-cli' | '21st-dev' | 'github' | undefined;
}

export interface DiscoveryResult {
  found: SkillInfo[];
  missing: string[];
  installed: string[];
  errors: string[];
  twentyFirstDevAvailable: boolean;
}

/**
 * SkillDiscovery — discovers and auto-installs missing skills.
 *
 * When the build pipeline needs a skill (ui-ux-pro-max, framer-motion, etc.),
 * this module checks if it's available, finds it via the skills CLI if not,
 * and installs it automatically.
 *
 * Integrates with:
 * - Local .claude/skills/ directory
 * - Skills CLI (npx skills)
 * - 21st.dev registry (components, blocks, hooks)
 */
export class SkillDiscovery {
  private skillsDir: string;
  private installedCache: Map<string, SkillInfo> = new Map();
  private twentyFirstDevApiKey?: string | undefined;

  constructor() {
    // Skills are installed in ~/.claude/skills/ or project .claude/skills/
    this.skillsDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
    if (!fs.existsSync(this.skillsDir)) {
      this.skillsDir = path.join(process.cwd(), '.claude', 'skills');
    }

    // Check for 21st.dev API key
    this.twentyFirstDevApiKey = process.env.TWENTY_FIRST_DEV_API_KEY ?? process.env['21ST_DEV_API_KEY'] ?? undefined;
  }

  /**
   * Check if a skill is installed.
   */
  isSkillInstalled(skillName: string): boolean {
    if (this.installedCache.has(skillName)) {
      return this.installedCache.get(skillName)!.installed;
    }

    const skillPath = path.join(this.skillsDir, skillName);
    const installed = fs.existsSync(skillPath) && fs.existsSync(path.join(skillPath, 'SKILL.md'));

    this.installedCache.set(skillName, {
      name: skillName,
      package: skillName,
      installed,
      path: installed ? skillPath : undefined,
      source: installed ? 'local' : undefined,
    });

    return installed;
  }

  /**
   * Find a skill using the skills CLI.
   */
  async findSkill(query: string): Promise<{ name: string; package: string; installs: number } | null> {
    try {
      const output = execSync(`npx skills find "${query}" --json`, {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const results = JSON.parse(output);
      if (results && results.length > 0) {
        // Return the most popular result
        return results.sort((a: any, b: any) => (b.installs || 0) - (a.installs || 0))[0];
      }
      return null;
    } catch (err: any) {
      console.warn(`[skill-discovery] Failed to find skill "${query}":`, err.message);
      return null;
    }
  }

  /**
   * Install a skill using the skills CLI.
   */
  async installSkill(packageName: string): Promise<boolean> {
    try {
      console.log(`[skill-discovery] Installing skill: ${packageName}`);
      execSync(`npx skills add "${packageName}" -g -y`, {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      console.log(`[skill-discovery] Successfully installed: ${packageName}`);
      return true;
    } catch (err: any) {
      console.error(`[skill-discovery] Failed to install "${packageName}":`, err.message);
      return false;
    }
  }

  /**
   * Search 21st.dev registry for components.
   */
  async search21stDev(query: string): Promise<{ name: string; component: string; code: string }[]> {
    if (!this.twentyFirstDevApiKey) {
      console.log('[skill-discovery] No 21st.dev API key found, skipping registry search');
      return [];
    }

    try {
      // Use the 21st CLI to search components
      const output = execSync(`npx @21st-dev/cli@latest search "${query}" --json`, {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, API_KEY: this.twentyFirstDevApiKey },
      });

      const results = JSON.parse(output);
      return results || [];
    } catch (err: any) {
      console.warn(`[skill-discovery] 21st.dev search failed:`, err.message);
      return [];
    }
  }

  /**
   * Install a 21st.dev component.
   */
  async install21stDevComponent(componentName: string): Promise<string | null> {
    if (!this.twentyFirstDevApiKey) {
      return null;
    }

    try {
      const output = execSync(`npx @21st-dev/cli@latest install ${componentName}`, {
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, API_KEY: this.twentyFirstDevApiKey },
      });

      return output;
    } catch (err: any) {
      console.error(`[skill-discovery] Failed to install 21st.dev component:`, err.message);
      return null;
    }
  }

  /**
   * Discover and install missing skills.
   * Returns a list of all required skills with their status.
   */
  async discoverAndInstall(requiredSkills: string[]): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      found: [],
      missing: [],
      installed: [],
      errors: [],
      twentyFirstDevAvailable: !!this.twentyFirstDevApiKey,
    };

    for (const skillName of requiredSkills) {
      // Check if already installed locally
      if (this.isSkillInstalled(skillName)) {
        result.found.push({
          name: skillName,
          package: skillName,
          installed: true,
          path: this.installedCache.get(skillName)?.path,
          source: 'local',
        });
        continue;
      }

      // Try to find via skills CLI
      console.log(`[skill-discovery] Skill "${skillName}" not found locally, searching...`);
      const found = await this.findSkill(skillName);

      if (found) {
        // Try to install it
        const installed = await this.installSkill(found.package);
        if (installed) {
          result.installed.push(skillName);
          result.found.push({
            name: skillName,
            package: found.package,
            installed: true,
            source: 'skills-cli',
          });
        } else {
          result.missing.push(skillName);
          result.errors.push(`Failed to install: ${found.package}`);
        }
      } else {
        // Try common package patterns
        const commonPackages = [
          `anthropics/skills@${skillName}`,
          `vercel-labs/agent-skills@${skillName}`,
          `ComposioHQ/awesome-claude-skills@${skillName}`,
          `21st-dev/skill@${skillName}`,
        ];

        let installed = false;
        for (const pkg of commonPackages) {
          if (await this.installSkill(pkg)) {
            result.installed.push(skillName);
            result.found.push({
              name: skillName,
              package: pkg,
              installed: true,
              source: 'github',
            });
            installed = true;
            break;
          }
        }

        if (!installed) {
          // Try 21st.dev registry for component-related skills
          if (this.twentyFirstDevApiKey) {
            const components = await this.search21stDev(skillName);
            if (components.length > 0) {
              console.log(`[skill-discovery] Found ${components.length} components on 21st.dev for "${skillName}"`);
              // Components found, but we need to convert them to usable code
              // For now, mark as found with 21st.dev source
              result.found.push({
                name: skillName,
                package: `21st-dev:${skillName}`,
                installed: true,
                source: '21st-dev',
              });
            } else {
              result.missing.push(skillName);
              result.errors.push(`Skill "${skillName}" not found in any known registry`);
            }
          } else {
            result.missing.push(skillName);
            result.errors.push(`Skill "${skillName}" not found in any known registry`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Get the path to an installed skill.
   */
  getSkillPath(skillName: string): string | undefined {
    return this.installedCache.get(skillName)?.path;
  }

  /**
   * Read a skill's SKILL.md content.
   */
  readSkillContent(skillName: string): string | null {
    const skillPath = this.getSkillPath(skillName);
    if (!skillPath) return null;

    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return null;

    return fs.readFileSync(skillMdPath, 'utf-8');
  }

  /**
   * Check if 21st.dev is available and configured.
   */
  is21stDevAvailable(): boolean {
    return !!this.twentyFirstDevApiKey;
  }

  /**
   * Get 21st.dev API key status.
   */
  get21stDevStatus(): { configured: boolean; keyPreview?: string } {
    if (!this.twentyFirstDevApiKey) {
      return { configured: false };
    }
    return {
      configured: true,
      keyPreview: this.twentyFirstDevApiKey.slice(0, 8) + '...',
    };
  }
}

// Singleton instance
let instance: SkillDiscovery | null = null;

export function getSkillDiscovery(): SkillDiscovery {
  if (!instance) {
    instance = new SkillDiscovery();
  }
  return instance;
}
