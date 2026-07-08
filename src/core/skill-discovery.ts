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
 * Skills are embedded in SkillIntegrator and installed locally in .claude/skills/.
 * No CLI or npm install is needed. discoverAndInstall() reports all skills as found
 * so the pipeline proceeds without attempting external installs.
 */
export class SkillDiscovery {
  private skillsDir: string;
  private installedCache: Map<string, SkillInfo> = new Map();

  constructor() {
    this.skillsDir = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'skills');
    if (!fs.existsSync(this.skillsDir)) {
      this.skillsDir = path.join(process.cwd(), '.claude', 'skills');
    }
  }

  isSkillInstalled(skillName: string): boolean {
    if (this.installedCache.has(skillName)) {
      return this.installedCache.get(skillName)!.installed;
    }
    const skillPath = path.join(this.skillsDir, skillName);
    const installed = fs.existsSync(skillPath) && fs.existsSync(path.join(skillPath, 'SKILL.md'));
    this.installedCache.set(skillName, { name: skillName, package: skillName, installed, path: installed ? skillPath : undefined, source: installed ? 'local' : undefined });
    return installed;
  }

  async discoverAndInstall(requiredSkills: string[]): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      found: [],
      missing: [],
      installed: [],
      errors: [],
      twentyFirstDevAvailable: false,
    };

    for (const skillName of requiredSkills) {
      const installed = this.isSkillInstalled(skillName);
      result.found.push({
        name: skillName,
        package: skillName,
        installed,
        path: this.installedCache.get(skillName)?.path,
        source: installed ? 'local' : undefined,
      });
    }

    return result;
  }

  getSkillPath(skillName: string): string | undefined {
    return this.installedCache.get(skillName)?.path;
  }

  readSkillContent(skillName: string): string | null {
    const skillPath = this.getSkillPath(skillName);
    if (!skillPath) return null;
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) return null;
    return fs.readFileSync(skillMdPath, 'utf-8');
  }
}

let instance: SkillDiscovery | null = null;

export function getSkillDiscovery(): SkillDiscovery {
  if (!instance) {
    instance = new SkillDiscovery();
  }
  return instance;
}
