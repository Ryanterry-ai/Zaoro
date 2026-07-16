import { describe, it, expect } from 'vitest';
import {
  parseCommand,
  executeFindSkills,
  executeBuildAnything,
  type CommandInput,
  type CommandResult,
} from '../src/orchestration/command-router.js';

describe('Command Router', () => {
  describe('parseCommand', () => {
    it('should parse /build-anything command', () => {
      const input = '/build-anything Build me a real estate website with 3D effects';
      const result = parseCommand(input);

      expect(result.command).toBe('build-anything');
      expect(result.prompt).toBe('Build me a real estate website with 3D effects');
      expect(result.options).toEqual({});
    });

    it('should parse /find-skills command', () => {
      const input = '/find-skills three.js animation scroll';
      const result = parseCommand(input);

      expect(result.command).toBe('find-skills');
      expect(result.prompt).toBe('three.js animation scroll');
      expect(result.options).toEqual({});
    });

    it('should parse unknown commands', () => {
      const input = 'some random text';
      const result = parseCommand(input);

      expect(result.command).toBe('unknown');
      expect(result.prompt).toBe('some random text');
      expect(result.options).toEqual({});
    });

    it('should extract options from prompt', () => {
      const input = '/build-anything Build a website --framework react --verbose true';
      const result = parseCommand(input);

      expect(result.command).toBe('build-anything');
      expect(result.prompt).toContain('--framework');
      expect(result.options).toEqual({
        framework: 'react',
        verbose: 'true',
      });
    });

    it('should handle empty prompt', () => {
      const input = '/build-anything';
      const result = parseCommand(input);

      expect(result.command).toBe('build-anything');
      expect(result.prompt).toBe('');
    });
  });

  describe('executeFindSkills', () => {
    it('should analyze skills for a simple prompt', () => {
      const result = executeFindSkills('Build a real estate website');

      expect(result.decomposition).toBeDefined();
      expect(result.decomposition.atoms.length).toBeGreaterThan(0);
      expect(result.neededSkills.length).toBeGreaterThan(0);
      expect(result.summary).toContain('Skills Analysis');
    });

    it('should detect industry correctly', () => {
      const result = executeFindSkills('Build a fitness website');

      expect(result.decomposition.byType.industry.length).toBe(1);
      expect(result.decomposition.byType.industry[0].value).toBe('fitness');
    });

    it('should detect capabilities correctly', () => {
      const result = executeFindSkills('Build a website with 3D effects and scroll animations');

      const capabilities = result.decomposition.byType.capability;
      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities.some(a => a.value.includes('3d'))).toBe(true);
      expect(capabilities.some(a => a.value.includes('scroll'))).toBe(true);
    });

    it('should identify installed vs missing skills', () => {
      const result = executeFindSkills('Build a Next.js website with Framer Motion');

      expect(result.neededSkills.length).toBeGreaterThan(0);
      // Most built-in skills should be installed
      const installedCount = result.neededSkills.filter(s => s.installed).length;
      expect(installedCount).toBeGreaterThan(0);
    });
  });

  describe('executeBuildAnything', () => {
    it('should execute a dry run', async () => {
      const result = await executeBuildAnything('Build a real estate website', {
        dryRun: true,
        verbose: false,
      });

      expect(result.command).toBe('build-anything');
      expect(result.decomposition).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.loopResult).toBeUndefined(); // Dry run doesn't execute loop
      expect(result.summary).toContain('BUILD.ANYTHING');
    });

    it('should detect industry in decomposition', async () => {
      const result = await executeBuildAnything('Build a real estate website with 3D effects', {
        dryRun: true,
      });

      expect(result.decomposition.byType.industry.length).toBe(1);
      expect(result.decomposition.byType.industry[0].value).toBe('real-estate');
    });

    it('should create orchestration plan', async () => {
      const result = await executeBuildAnything('Build a restaurant website', {
        dryRun: true,
      });

      expect(result.plan.matches.length).toBeGreaterThan(0);
      expect(result.plan.alreadyAvailable.length).toBeGreaterThan(0);
      expect(result.plan.estimatedTime).toBeDefined();
    });

    it('should detect visual styles', async () => {
      const result = await executeBuildAnything('Build a luxury website with cinematic visuals', {
        dryRun: true,
      });

      const styles = result.decomposition.byType['visual-style'];
      expect(styles.length).toBeGreaterThan(0);
      expect(styles.some(a => a.value === 'luxury')).toBe(true);
      expect(styles.some(a => a.value === 'cinematic')).toBe(true);
    });

    it('should handle complex multi-capability prompts', async () => {
      const result = await executeBuildAnything(
        'Build a real estate website with 3D scroll effects, mouse tracking, and cinematic visuals',
        { dryRun: true }
      );

      expect(result.decomposition.atoms.length).toBeGreaterThan(3);
      expect(result.decomposition.complexity).toBeGreaterThan(0.5);
      expect(result.plan.matches.length).toBeGreaterThan(3);
    });
  });
});
