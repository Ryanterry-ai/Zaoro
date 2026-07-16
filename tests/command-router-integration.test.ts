/**
 * Integration test demonstrating the command-router pipeline.
 * 
 * This test shows how the decomposition → orchestration → agentic loop
 * pipeline works together to handle complex multi-capability prompts.
 */

import { describe, it, expect } from 'vitest';
import {
  parseCommand,
  executeFindSkills,
  executeBuildAnything,
} from '../src/orchestration/command-router.js';

describe('Command Router Integration', () => {
  it('should handle a complex real estate website request', async () => {
    const input = '/build-anything Build a luxury real estate website with 3D property tours, smooth scroll animations, and cinematic visuals';
    
    // Parse the command
    const command = parseCommand(input);
    expect(command.command).toBe('build-anything');
    expect(command.prompt).toContain('real estate');
    
    // Execute find-skills to see what's needed
    const skillsResult = executeFindSkills(command.prompt);
    expect(skillsResult.decomposition.atoms.length).toBeGreaterThan(3);
    expect(skillsResult.decomposition.byType.industry[0].value).toBe('real-estate');
    
    // Check that we detected the capabilities
    const capabilities = skillsResult.decomposition.byType.capability;
    expect(capabilities.some(a => a.value.includes('3d'))).toBe(true);
    expect(capabilities.some(a => a.value.includes('scroll'))).toBe(true);
    
    // Check visual styles
    const styles = skillsResult.decomposition.byType['visual-style'];
    expect(styles.some(a => a.value === 'luxury')).toBe(true);
    expect(styles.some(a => a.value === 'cinematic')).toBe(true);
    
    // Execute a dry run to see the orchestration plan
    const buildResult = await executeBuildAnything(command.prompt, { dryRun: true });
    expect(buildResult.plan.matches.length).toBeGreaterThan(5);
    expect(buildResult.plan.alreadyAvailable.length).toBeGreaterThan(0);
    
    // Print the summary for debugging
    console.log('\n=== Integration Test Summary ===');
    console.log(buildResult.summary);
  });

  it('should handle a SaaS dashboard request', async () => {
    const input = '/build-anything Create a modern SaaS analytics dashboard with real-time charts and dark mode';
    
    const command = parseCommand(input);
    expect(command.command).toBe('build-anything');
    
    const buildResult = await executeBuildAnything(command.prompt, { dryRun: true });
    expect(buildResult.decomposition.byType.industry[0].value).toBe('saas');
    
    // Should detect at least some capabilities or visual styles
    const allAtoms = buildResult.decomposition.atoms;
    expect(allAtoms.length).toBeGreaterThan(1);
  });

  it('should handle a restaurant website request', async () => {
    const input = '/build-anything Build a restaurant website with online ordering and menu display';
    
    const command = parseCommand(input);
    expect(command.command).toBe('build-anything');
    
    const buildResult = await executeBuildAnything(command.prompt, { dryRun: true });
    expect(buildResult.decomposition.byType.industry[0].value).toBe('restaurant');
    
    // Should have at least one match for the restaurant industry
    expect(buildResult.plan.matches.length).toBeGreaterThanOrEqual(1);
  });
});
