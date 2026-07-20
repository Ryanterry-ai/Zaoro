/**
 * Skill Orchestrator
 * ===================
 *
 * Matches task atoms to available skills, discovers missing skills,
 * and handles automatic installation. This is the bridge between
 * prompt decomposition and agentic execution.
 *
 * Flow:
 *   decomposed prompt → match skills → find missing → install → dispatch agents
 */

import { execSync } from 'child_process';
import type { TaskAtom, DecompositionResult } from './prompt-decomposer.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillManifest {
  /** Skill identifier (e.g., "gsap-scrolltrigger") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Skill description */
  description: string;
  /** Source repository (e.g., "vercel-labs/agent-skills") */
  source: string;
  /** Install count (popularity indicator) */
  installs: number;
  /** Whether this skill is installed locally */
  installed: boolean;
  /** Local path if installed */
  localPath?: string;
  /** Capabilities this skill provides */
  capabilities: string[];
  /** Dependencies on other skills */
  dependencies: string[];
  /** Categories this skill belongs to */
  categories: string[];
}

export interface SkillMatch {
  /** The task atom this match is for */
  atom: TaskAtom;
  /** Matched skill */
  skill: SkillManifest;
  /** Match confidence (0..1) */
  confidence: number;
  /** Whether this skill is installed */
  installed: boolean;
}

export interface OrchestrationPlan {
  /** All skill matches */
  matches: SkillMatch[];
  /** Skills that need to be installed */
  toInstall: string[];
  /** Skills already available */
  alreadyAvailable: string[];
  /** Recommended execution groups (parallelizable) */
  executionGroups: SkillMatch[][];
  /** Estimated total execution time */
  estimatedTime: string;
  /** Risk assessment */
  risks: string[];
}

// ─── Known Skills Database ──────────────────────────────────────────────────

/**
 * Local database of known skills from the system prompt.
 * In production, this would be synced from the skills ecosystem.
 */
const KNOWN_SKILLS: SkillManifest[] = [
  // 3D & WebGL
  { id: 'threejs-webgl', name: 'Three.js WebGL', description: 'Comprehensive Three.js 3D web development', source: 'built-in', installs: 100000, installed: true, capabilities: ['3d', 'webgl', 'threejs', '3d-modeling', '3d-scroll', 'interactive', 'immersive', 'cinematic'], dependencies: [], categories: ['3d', 'webgl'] },
  { id: 'react-three-fiber', name: 'React Three Fiber', description: 'Declarative 3D scenes with React', source: 'built-in', installs: 80000, installed: true, capabilities: ['3d', 'react', 'threejs', 'interactive'], dependencies: ['react-expert'], categories: ['3d', 'react'] },
  { id: 'spline-interactive', name: 'Spline Interactive', description: 'Browser-based 3D design with visual editor', source: 'built-in', installs: 50000, installed: true, capabilities: ['3d', 'no-code', 'interactive', '3d-modeling'], dependencies: [], categories: ['3d', 'design'] },
  { id: 'aframe-webxr', name: 'A-Frame WebXR', description: 'Declarative WebXR with HTML', source: 'built-in', installs: 30000, installed: true, capabilities: ['3d', 'vr', 'ar', 'webxr', 'immersive'], dependencies: [], categories: ['3d', 'xr'] },
  { id: 'playcanvas-engine', name: 'PlayCanvas', description: 'Lightweight WebGL game engine', source: 'built-in', installs: 25000, installed: true, capabilities: ['3d', 'webgl', 'game', 'interactive'], dependencies: [], categories: ['3d', 'game'] },
  { id: 'pixijs-2d', name: 'PixiJS 2D', description: 'Fast 2D WebGL rendering', source: 'built-in', installs: 40000, installed: true, capabilities: ['2d', 'webgl', 'canvas', 'animation'], dependencies: [], categories: ['2d', 'webgl'] },
  { id: 'babylonjs-engine', name: 'Babylon.js', description: 'Full-featured 3D engine', source: 'built-in', installs: 35000, installed: true, capabilities: ['3d', 'webgl', 'webgpu', 'physics', 'interactive'], dependencies: [], categories: ['3d', 'engine'] },
  { id: 'blender-web-pipeline', name: 'Blender Web Pipeline', description: 'Export Blender models to web', source: 'built-in', installs: 20000, installed: true, capabilities: ['3d', 'blender', 'gltf', '3d-modeling'], dependencies: [], categories: ['3d', 'pipeline'] },

  // Animation & Motion
  { id: 'gsap-scrolltrigger', name: 'GSAP ScrollTrigger', description: 'Scroll-driven animations with GSAP', source: 'built-in', installs: 150000, installed: true, capabilities: ['scroll', 'animation', 'scroll-animation', 'parallax', 'scroll-triggered', 'hover', 'interactive', 'cinematic', 'mouse-tracking', 'cursor-effects', 'micro-interactions', '3d-scroll'], dependencies: [], categories: ['animation', 'scroll'] },
  { id: 'motion-framer', name: 'Framer Motion', description: 'Modern React animation library', source: 'built-in', installs: 120000, installed: true, capabilities: ['animation', 'react', 'micro-interactions', 'hover', 'page-transitions', 'react-animation', 'framer-motion', 'interactive'], dependencies: ['react-expert'], categories: ['animation', 'react'] },
  { id: 'animejs', name: 'Anime.js', description: 'Versatile JS animation engine', source: 'built-in', installs: 80000, installed: true, capabilities: ['animation', 'timeline', 'svg', 'stagger'], dependencies: [], categories: ['animation'] },
  { id: 'locomotive-scroll', name: 'Locomotive Scroll', description: 'Smooth scrolling with parallax', source: 'built-in', installs: 45000, installed: true, capabilities: ['scroll', 'smooth-scroll', 'parallax', 'scroll-animation'], dependencies: [], categories: ['scroll'] },
  { id: 'barba-js', name: 'Barba.js', description: 'Page transitions library', source: 'built-in', installs: 30000, installed: true, capabilities: ['page-transitions', 'smooth-scroll', 'animation'], dependencies: [], categories: ['animation', 'navigation'] },
  { id: 'lottie-animations', name: 'Lottie Animations', description: 'After Effects animations for web', source: 'built-in', installs: 60000, installed: true, capabilities: ['animation', 'after-effects', 'svg', 'micro-interactions'], dependencies: [], categories: ['animation'] },
  { id: 'rive-interactive', name: 'Rive Interactive', description: 'State machine vector animation', source: 'built-in', installs: 25000, installed: true, capabilities: ['animation', 'interactive', 'state-machine', 'micro-interactions'], dependencies: [], categories: ['animation', 'interactive'] },
  { id: 'react-spring-physics', name: 'React Spring', description: 'Physics-based React animations', source: 'built-in', installs: 40000, installed: true, capabilities: ['animation', 'react', 'physics', 'react-animation', 'react-spring', 'interactive'], dependencies: ['react-expert'], categories: ['animation', 'react'] },
  { id: 'scroll-reveal-libraries', name: 'Scroll Reveal', description: 'Simple scroll-triggered reveals', source: 'built-in', installs: 50000, installed: true, capabilities: ['scroll', 'animation', 'scroll-animation', 'scroll-triggered'], dependencies: [], categories: ['scroll', 'animation'] },
  { id: 'lightweight-3d-effects', name: 'Lightweight 3D Effects', description: 'Zdog, Vanta.js, Vanilla-Tilt', source: 'built-in', installs: 35000, installed: true, capabilities: ['3d', 'tilt', 'tilt-effects', 'mouse-tracking', 'cursor-effects', 'interactive'], dependencies: [], categories: ['3d', 'effects'] },
  { id: 'design-motion-principles', name: 'Motion Design Principles', description: 'Expert motion design auditing', source: 'built-in', installs: 15000, installed: true, capabilities: ['animation', 'design', 'motion', 'review'], dependencies: [], categories: ['design', 'animation'] },

  // UI & Design
  { id: 'frontend-design', name: 'Frontend Design', description: 'Production-grade frontend interfaces', source: 'built-in', installs: 200000, installed: true, capabilities: ['ui', 'design', 'landing-page', 'responsive', 'frontend', 'copywriting', 'images'], dependencies: [], categories: ['ui', 'design'] },
  { id: 'ui-ux-pro-max', name: 'UI/UX Pro Max', description: '67 UI styles, 161 palettes, 57 fonts', source: 'built-in', installs: 180000, installed: true, capabilities: ['ui', 'design', 'design-system', 'landing-page', 'dashboard', 'ui-components', 'responsive', 'charts', 'data-viz'], dependencies: [], categories: ['ui', 'design'] },
  { id: 'high-end-visual-design', name: 'High-End Visual Design', description: 'Premium agency-level design', source: 'built-in', installs: 90000, installed: true, capabilities: ['design', 'luxury', 'cinematic', 'editorial', 'premium'], dependencies: [], categories: ['design'] },
  { id: 'minimalist-ui', name: 'Minimalist UI', description: 'Clean editorial interfaces', source: 'built-in', installs: 60000, installed: true, capabilities: ['design', 'minimalist', 'editorial', 'clean'], dependencies: [], categories: ['design'] },
  { id: 'industrial-brutalist-ui', name: 'Brutalist UI', description: 'Raw mechanical interfaces', source: 'built-in', installs: 25000, installed: true, capabilities: ['design', 'brutalist', 'industrial', 'experimental'], dependencies: [], categories: ['design'] },
  { id: 'animated-component-libraries', name: 'Animated Components', description: 'Magic UI + React Bits', source: 'built-in', installs: 70000, installed: true, capabilities: ['ui', 'animation', 'components', 'landing-page', 'ui-components'], dependencies: [], categories: ['ui', 'animation'] },
  { id: 'image-to-code', name: 'Image to Code', description: 'Generate code from design images', source: 'built-in', installs: 50000, installed: true, capabilities: ['design', 'code', 'frontend', 'ui'], dependencies: [], categories: ['design', 'code'] },
  { id: 'imagegen-frontend-web', name: 'Web Image Generation', description: 'Premium website design references', source: 'built-in', installs: 40000, installed: true, capabilities: ['images', 'design', 'landing-page', 'ui'], dependencies: [], categories: ['design', 'images'] },

  // Frameworks
  { id: 'react-expert', name: 'React Expert', description: 'React 18+ with App Router', source: 'built-in', installs: 150000, installed: true, capabilities: ['react', 'nextjs', 'frontend', 'react-animation'], dependencies: [], categories: ['framework'] },
  { id: 'nextjs-developer', name: 'Next.js Developer', description: 'Next.js 14+ with App Router', source: 'built-in', installs: 130000, installed: true, capabilities: ['nextjs', 'react', 'frontend', 'deploy'], dependencies: ['react-expert'], categories: ['framework'] },
  { id: 'vue-expert', name: 'Vue Expert', description: 'Vue 3 with Composition API', source: 'built-in', installs: 80000, installed: true, capabilities: ['vue', 'frontend'], dependencies: [], categories: ['framework'] },
  { id: 'angular-architect', name: 'Angular Architect', description: 'Angular 17+ standalone components', source: 'built-in', installs: 60000, installed: true, capabilities: ['angular', 'frontend'], dependencies: [], categories: ['framework'] },

  // Backend & Data
  { id: 'api-designer', name: 'API Designer', description: 'REST & GraphQL API design', source: 'built-in', installs: 70000, installed: true, capabilities: ['api', 'graphql', 'rest', 'backend'], dependencies: [], categories: ['backend'] },
  { id: 'fastapi-expert', name: 'FastAPI Expert', description: 'High-performance Python APIs', source: 'built-in', installs: 50000, installed: true, capabilities: ['api', 'python', 'backend', 'fastapi'], dependencies: [], categories: ['backend'] },
  { id: 'nestjs-expert', name: 'NestJS Expert', description: 'Enterprise TypeScript backend', source: 'built-in', installs: 45000, installed: true, capabilities: ['api', 'typescript', 'backend', 'nestjs'], dependencies: [], categories: ['backend'] },
  { id: 'sql-pro', name: 'SQL Pro', description: 'Optimized SQL queries', source: 'built-in', installs: 60000, installed: true, capabilities: ['database', 'sql', 'backend'], dependencies: [], categories: ['database'] },
  { id: 'database-optimizer', name: 'Database Optimizer', description: 'Query performance tuning', source: 'built-in', installs: 40000, installed: true, capabilities: ['database', 'performance', 'backend'], dependencies: [], categories: ['database'] },

  // DevOps
  { id: 'deploy-to-vercel', name: 'Deploy to Vercel', description: 'Vercel deployment automation', source: 'built-in', installs: 100000, installed: true, capabilities: ['deploy', 'vercel', 'hosting'], dependencies: [], categories: ['devops'] },
  { id: 'devops-engineer', name: 'DevOps Engineer', description: 'Docker, K8s, CI/CD pipelines', source: 'built-in', installs: 80000, installed: true, capabilities: ['docker', 'ci-cd', 'kubernetes', 'deploy', 'devops'], dependencies: [], categories: ['devops'] },

  // Business Specific
  { id: 'shopify-expert', name: 'Shopify Expert', description: 'Shopify themes and apps', source: 'built-in', installs: 70000, installed: true, capabilities: ['ecommerce', 'shopify', 'store'], dependencies: [], categories: ['ecommerce'] },
  { id: 'wordpress-pro', name: 'WordPress Pro', description: 'Custom themes and plugins', source: 'built-in', installs: 90000, installed: true, capabilities: ['cms', 'wordpress', 'blog'], dependencies: [], categories: ['cms'] },

  // Security & Quality
  { id: 'secure-code-guardian', name: 'Secure Code Guardian', description: 'Security best practices', source: 'built-in', installs: 60000, installed: true, capabilities: ['security', 'auth', 'owasp'], dependencies: [], categories: ['security'] },
  { id: 'code-reviewer', name: 'Code Reviewer', description: 'Automated code review', source: 'built-in', installs: 50000, installed: true, capabilities: ['review', 'quality', 'refactoring'], dependencies: [], categories: ['quality'] },
  { id: 'test-master', name: 'Test Master', description: 'Test generation and strategy', source: 'built-in', installs: 55000, installed: true, capabilities: ['testing', 'e2e-testing', 'unit-testing'], dependencies: [], categories: ['testing'] },
  { id: 'playwright-expert', name: 'Playwright Expert', description: 'E2E browser testing', source: 'built-in', installs: 45000, installed: true, capabilities: ['e2e-testing', 'browser', 'automation'], dependencies: [], categories: ['testing'] },

  // Image → Cinematic Video (turn collected images into motion footage).
  // These are present locally under the higgsfield-seedance2 / arcads skill
  // dirs; mark installed:true so the engine selects + records them (the agent
  // invokes the matching local skill sub-dir to generate the video).
  { id: 'seedance-cinematic', name: 'Seedance 2.0 Cinematic', description: 'Turn images into cinematic video (Higgsfield/Seedance 2.0)', source: 'built-in', installs: 90000, installed: true, capabilities: ['video', 'image-to-video', 'cinematic', 'motion', 'cinematic-video'], dependencies: [], categories: ['video', 'animation'] },
  { id: 'seedance-product-360', name: 'Seedance Product 360', description: 'Product image to 360 cinematic video (Seedance 2.0)', source: 'built-in', installs: 70000, installed: true, capabilities: ['video', 'image-to-video', 'product', 'cinematic', 'cinematic-video'], dependencies: [], categories: ['video', 'ecommerce'] },
  { id: 'seedance-ecommerce-ad', name: 'Seedance Ecommerce Ad', description: 'Product image to cinematic ecommerce ad video (Seedance 2.0)', source: 'built-in', installs: 65000, installed: true, capabilities: ['video', 'image-to-video', 'ecommerce', 'cinematic', 'cinematic-video'], dependencies: [], categories: ['video', 'ecommerce'] },
  { id: 'seedance-brand-story', name: 'Seedance Brand Story', description: 'Image to cinematic brand-story video (Seedance 2.0)', source: 'built-in', installs: 60000, installed: true, capabilities: ['video', 'image-to-video', 'brand', 'cinematic', 'cinematic-video'], dependencies: [], categories: ['video', 'brand'] },
  { id: 'cinema-world-builder', name: 'Cinema World Builder', description: 'Turn still images into cinematic world/atmosphere video', source: 'built-in', installs: 55000, installed: true, capabilities: ['video', 'image-to-video', 'cinematic', 'world', 'cinematic-video'], dependencies: [], categories: ['video', 'animation'] },
  { id: 'nano-banana-pro-director', name: 'Nano Banana Pro Director', description: 'Director-grade image-to-cinematic-video prompts (Nano Banana Pro)', source: 'built-in', installs: 80000, installed: true, capabilities: ['video', 'image-to-video', 'cinematic', 'director', 'cinematic-video'], dependencies: [], categories: ['video', 'animation'] },

  { id: 'framer-motion', name: 'Motion (Framer Motion)', description: 'Production-ready React component animation, gestures, layout, exit transitions', source: 'built-in', installs: 250000, installed: true, capabilities: ['motion', 'animation', 'component-animation', 'transition', 'gesture'], dependencies: ['react'], categories: ['animation', 'react'] },
];

// ─── Skill Discovery ────────────────────────────────────────────────────────

/**
 * Find skills that match a given capability.
 */
export function findSkillsForCapability(capability: string): SkillManifest[] {
  const lower = capability.toLowerCase();
  return KNOWN_SKILLS.filter(skill =>
    skill.capabilities.some(c => c.includes(lower) || lower.includes(c))
  ).sort((a, b) => b.installs - a.installs);
}

/**
 * Find the best skill for a task atom.
 */
export function findBestSkill(atom: TaskAtom): SkillMatch | null {
  const candidates = findSkillsForCapability(atom.value);

  if (candidates.length === 0) {
    // Try parent capability (e.g., "3d-scroll" → "3d")
    const parentCap = atom.value.split('-')[0];
    const parentCandidates = findSkillsForCapability(parentCap);
    if (parentCandidates.length > 0) {
      return {
        atom,
        skill: parentCandidates[0],
        confidence: atom.confidence * 0.7,
        installed: parentCandidates[0].installed,
      };
    }
    return null;
  }

  // Prefer installed skills, then highest installs
  const installed = candidates.filter(c => c.installed);
  const best = installed.length > 0 ? installed[0] : candidates[0];

  return {
    atom,
    skill: best,
    confidence: atom.confidence * (best.installed ? 1 : 0.8),
    installed: best.installed,
  };
}

// ─── Orchestration Planning ─────────────────────────────────────────────────

/**
 * Create a full orchestration plan from a decomposed prompt.
 */
export function createOrchestrationPlan(
  decomposition: DecompositionResult,
): OrchestrationPlan {
  const matches: SkillMatch[] = [];

  // Match each atom to a skill
  for (const atom of decomposition.atoms) {
    const match = findBestSkill(atom);
    if (match) {
      matches.push(match);
    }
  }

  // Separate installed vs missing
  const toInstall = matches
    .filter(m => !m.installed)
    .map(m => m.skill.id);
  const alreadyAvailable = matches
    .filter(m => m.installed)
    .map(m => m.skill.id);

  // Deduplicate
  const uniqueToInstall = [...new Set(toInstall)];
  const uniqueAvailable = [...new Set(alreadyAvailable)];

  // Group by execution dependencies (parallelizable)
  const executionGroups = groupByExecutionOrder(matches);

  // Risk assessment
  const risks = assessRisks(matches, uniqueToInstall, decomposition);

  // Estimated time
  const estimatedTime = estimateTime(matches, uniqueToInstall);

  return {
    matches,
    toInstall: uniqueToInstall,
    alreadyAvailable: uniqueAvailable,
    executionGroups,
    estimatedTime,
    risks,
  };
}

/**
 * Get locally installed skills.
 */
export function getInstalledSkills(): string[] {
  return KNOWN_SKILLS.filter(s => s.installed).map(s => s.id);
}

/**
 * Check if a specific skill is installed.
 */
export function isSkillInstalled(skillId: string): boolean {
  return KNOWN_SKILLS.some(s => s.id === skillId && s.installed);
}

/**
 * Install a skill (wrapper around `npx skills add`).
 * Returns true if installation succeeded.
 */
export function installSkill(skillId: string): boolean {
  const skill = KNOWN_SKILLS.find(s => s.id === skillId);
  if (!skill) {
    console.error(`[skill-orchestrator] Unknown skill: ${skillId}`);
    return false;
  }

  if (skill.installed) {
    console.log(`[skill-orchestrator] Skill already installed: ${skillId}`);
    return true;
  }

  try {
    const source = skill.source === 'built-in'
      ? skillId // Built-in skills are already available
      : skill.source;

    console.log(`[skill-orchestrator] Installing skill: ${skillId} from ${source}`);
    // In production, this would run: npx skills add ${source} -g -y
    // For now, mark as installed in the local registry
    skill.installed = true;
    return true;
  } catch (error) {
    console.error(`[skill-orchestrator] Failed to install skill ${skillId}:`, error);
    return false;
  }
}

/**
 * Batch install multiple skills.
 */
export function installSkills(skillIds: string[]): { installed: string[]; failed: string[] } {
  const installed: string[] = [];
  const failed: string[] = [];

  for (const id of skillIds) {
    if (installSkill(id)) {
      installed.push(id);
    } else {
      failed.push(id);
    }
  }

  return { installed, failed };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByExecutionOrder(matches: SkillMatch[]): SkillMatch[][] {
  // Group into parallelizable batches:
  // Group 1: Foundation (industry, framework, platform)
  // Group 2: Core capabilities (3d, animation)
  // Group 3: Visual layer (styles, interactions)
  // Group 4: Quality (testing, review)

  const groups: SkillMatch[][] = [[], [], [], []];

  for (const match of matches) {
    const atom = match.atom;
    if (atom.type === 'industry' || atom.type === 'framework' || atom.type === 'platform') {
      groups[0].push(match);
    } else if (atom.type === 'capability') {
      groups[1].push(match);
    } else if (atom.type === 'visual-style' || atom.type === 'interaction') {
      groups[2].push(match);
    } else {
      groups[3].push(match);
    }
  }

  return groups.filter(g => g.length > 0);
}

function assessRisks(
  matches: SkillMatch[],
  toInstall: string[],
  decomposition: DecompositionResult,
): string[] {
  const risks: string[] = [];

  if (toInstall.length > 0) {
    risks.push(`Need to install ${toInstall.length} skills: ${toInstall.join(', ')}`);
  }

  if (decomposition.complexity > 0.7) {
    risks.push('High complexity build — may require multiple iterations');
  }

  const has3D = matches.some(m => m.atom.value.includes('3d'));
  const hasAnimation = matches.some(m => m.atom.value.includes('scroll') || m.atom.value.includes('animation'));

  if (has3D && hasAnimation) {
    risks.push('Combined 3D + animation may have performance implications');
  }

  if (matches.length > 8) {
    risks.push('Many skills involved — coordination overhead is significant');
  }

  return risks;
}

function estimateTime(matches: SkillMatch[], toInstall: string[]): string {
  let minutes = 2; // Base overhead

  // Each skill adds ~1-3 minutes
  minutes += matches.length * 2;

  // Installation adds time
  minutes += toInstall.length * 1;

  // Complexity multiplier
  if (matches.length > 5) minutes *= 1.5;
  if (matches.length > 8) minutes *= 2;

  if (minutes < 5) return '< 5 minutes';
  if (minutes < 15) return '5-15 minutes';
  if (minutes < 30) return '15-30 minutes';
  return '30+ minutes';
}
