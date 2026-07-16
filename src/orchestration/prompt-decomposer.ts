/**
 * Prompt Decomposer
 * ==================
 *
 * Breaks a complex user request into discrete "task atoms" that can be
 * matched to specific skills, agents, or tools.
 *
 * Example:
 *   Input:  "Build me a fully interactive real estate website experience
 *            with 3D scroll effects, mouse tracking, cinematic visuals"
 *
 *   Output: [
 *     { type: 'industry', value: 'real-estate', confidence: 0.95 },
 *     { type: 'capability', value: '3d-scroll', requiredSkills: ['gsap-scrolltrigger', 'threejs-webgl'] },
 *     { type: 'capability', value: 'mouse-tracking', requiredSkills: ['gsap-scrolltrigger', 'motion-framer'] },
 *     { type: 'capability', value: 'cinematic-visuals', requiredSkills: ['gsap-scrolltrigger', 'threejs-webgl'] },
 *     { type: 'capability', value: 'interactive-experience', requiredSkills: ['gsap-scrolltrigger', 'motion-framer'] },
 *   ]
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskAtomType =
  | 'industry'       // Business vertical (real-estate, fitness, etc.)
  | 'capability'     // Technical capability (3d, animation, scroll, etc.)
  | 'visual-style'   // Visual direction (cinematic, minimalist, brutalist, etc.)
  | 'interaction'    // Interaction pattern (mouse-tracking, parallax, drag, etc.)
  | 'platform'       // Target platform (web, mobile, desktop)
  | 'framework'      // Preferred framework (react, nextjs, vue, etc.)
  | 'content'        // Content needs (copy, images, data)
  | 'integration';   // Third-party integration (stripe, firebase, etc.)

export interface TaskAtom {
  /** Type of task atom */
  type: TaskAtomType;
  /** Normalized value (kebab-case) */
  value: string;
  /** Raw text from the prompt */
  rawText: string;
  /** Confidence that this atom was correctly detected (0..1) */
  confidence: number;
  /** Skills known to handle this atom */
  knownSkills: string[];
  /** Whether this atom is critical (build fails without it) */
  critical: boolean;
  /** Dependencies on other atoms */
  dependsOn: string[];
}

export interface DecompositionResult {
  /** All task atoms extracted from the prompt */
  atoms: TaskAtom[];
  /** Grouped by type for easy consumption */
  byType: Record<TaskAtomType, TaskAtom[]>;
  /** All unique skills needed across all atoms */
  allRequiredSkills: string[];
  /** Skills that are already available locally */
  availableSkills: string[];
  /** Skills that need to be installed */
  missingSkills: string[];
  /** Overall complexity score (0..1, higher = more complex) */
  complexity: number;
  /** Suggested execution order (topological sort of atoms) */
  executionOrder: string[];
  /** Human-readable summary of the decomposition */
  summary: string;
}

// ─── Skill Knowledge Base ───────────────────────────────────────────────────

/**
 * Maps capability keywords to known skills.
 * This is the "knowledge" the decomposer uses to match tasks to skills.
 *
 * Sources:
 * - System prompt available_skills list
 * - Skills CLI (npx skills find)
 * - Built-in skill registry
 */
const CAPABILITY_SKILL_MAP: Record<string, string[]> = {
  // 3D & WebGL
  '3d': ['threejs-webgl', 'react-three-fiber', 'spline-interactive', 'babylonjs-engine'],
  '3d-scroll': ['threejs-webgl', 'gsap-scrolltrigger', 'react-three-fiber'],
  '3d-modeling': ['threejs-webgl', 'blender-web-pipeline', 'substance-3d-texturing'],
  'webgl': ['threejs-webgl', 'pixijs-2d', 'playcanvas-engine'],
  'webxr': ['aframe-webxr'],
  'vr': ['aframe-webxr'],
  'ar': ['aframe-webxr'],

  // Animation & Motion
  'scroll-effects': ['gsap-scrolltrigger', 'locomotive-scroll', 'scroll-reveal-libraries'],
  'scroll-animation': ['gsap-scrolltrigger', 'locomotive-scroll'],
  'parallax': ['gsap-scrolltrigger', 'locomotive-scroll'],
  'smooth-scroll': ['locomotive-scroll', 'barba-js'],
  'page-transitions': ['barba-js', 'motion-framer', 'react-view-transitions'],
  'animation': ['gsap-scrolltrigger', 'motion-framer', 'animejs', 'lottie-animations'],
  'micro-interactions': ['motion-framer', 'gsap-scrolltrigger', 'rive-interactive'],
  'hover-effects': ['gsap-scrolltrigger', 'motion-framer'],
  'mouse-tracking': ['gsap-scrolltrigger', 'motion-framer', 'lightweight-3d-effects'],
  'cursor-effects': ['gsap-scrolltrigger', 'lightweight-3d-effects'],
  'tilt-effects': ['lightweight-3d-effects', 'vanilla-tilt'],

  // React Animation
  'react-animation': ['motion-framer', 'react-spring-physics'],
  'react-motion': ['motion-framer', 'react-spring-physics'],
  'framer-motion': ['motion-framer'],
  'react-spring': ['react-spring-physics'],

  // Visual Styles
  'cinematic': ['gsap-scrolltrigger', 'threejs-webgl', 'high-end-visual-design'],
  'minimalist': ['minimalist-ui', 'frontend-design'],
  'brutalist': ['industrial-brutalist-ui'],
  'glassmorphism': ['frontend-design', 'ui-ux-pro-max'],
  'editorial': ['gpt-taste', 'high-end-visual-design'],
  'luxury': ['high-end-visual-design', 'ui-ux-pro-max'],

  // Frontend & UI
  'landing-page': ['frontend-design', 'ui-ux-pro-max', 'animated-component-libraries'],
  'dashboard': ['ui-ux-pro-max', 'frontend-design'],
  'design-system': ['ckm:design-system', 'ui-ux-pro-max'],
  'responsive': ['frontend-design', 'ui-ux-pro-max'],
  'accessibility': ['web-design-guidelines', 'frontend-design'],
  'ui-components': ['ui-ux-pro-max', 'animated-component-libraries'],

  // Frameworks
  'react': ['react-expert', 'nextjs-developer', 'react-three-fiber'],
  'nextjs': ['nextjs-developer', 'react-expert'],
  'vue': ['vue-expert'],
  'angular': ['angular-architect'],
  'svelte': ['frontend-design'],

  // Backend & Data
  'api': ['api-designer', 'fastapi-expert', 'nestjs-expert'],
  'database': ['sql-pro', 'postgres-pro', 'database-optimizer'],
  'auth': ['secure-code-guardian', 'fullstack-guardian'],

  // DevOps & Deploy
  'deploy': ['deploy-to-vercel', 'devops-engineer'],
  'docker': ['devops-engineer'],
  'ci-cd': ['devops-engineer'],

  // Content & Media
  'copywriting': ['frontend-design', 'ui-ux-pro-max'],
  'images': ['imagegen-frontend-web', 'brandkit'],
  'video': ['seedance-cinematic', 'seedance-motion-design-ad'],
  'thumbnails': ['generate-youtube-thumbnail'],

  // Specific Business Types
  'ecommerce': ['shopify-expert', 'frontend-design'],
  'saas': ['nextjs-developer', 'frontend-design'],
  'real-estate': ['threejs-webgl', 'gsap-scrolltrigger', 'frontend-design'],
  'restaurant': ['frontend-design', 'ui-ux-pro-max'],
  'fitness': ['frontend-design', 'ui-ux-pro-max'],
  'healthcare': ['frontend-design', 'ui-ux-pro-max'],
  'portfolio': ['frontend-design', 'gsap-scrolltrigger'],
  'blog': ['nextjs-developer', 'frontend-design'],

  // Interactive Experiences
  'interactive': ['gsap-scrolltrigger', 'motion-framer', 'threejs-webgl'],
  'immersive': ['threejs-webgl', 'gsap-scrolltrigger', 'aframe-webxr'],
  'experimental': ['gsap-scrolltrigger', 'threejs-webgl', 'lightweight-3d-effects'],

  // Data Visualization
  'charts': ['ui-ux-pro-max'],
  'data-viz': ['threejs-webgl', 'pixijs-2d'],

  // Testing
  'e2e-testing': ['playwright-expert', 'test-master'],
  'unit-testing': ['test-master', 'test-driven-development'],

  // Code Quality
  'code-review': ['code-reviewer', 'security-reviewer'],
  'refactoring': ['code-reviewer'],
};

/**
 * Industry detection keywords (mirrors taxonomy but optimized for decomposition).
 */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'real-estate': ['real estate', 'property', 'realtor', 'listing', 'apartment', 'house', 'commercial property', 'luxury property'],
  'ecommerce': ['shop', 'store', 'ecommerce', 'e-commerce', 'product', 'cart', 'checkout'],
  'fitness': ['gym', 'fitness', 'workout', 'exercise', 'crossfit', 'yoga', 'personal training'],
  'restaurant': ['restaurant', 'cafe', 'coffee', 'bakery', 'dining', 'food', 'menu'],
  'healthcare': ['clinic', 'hospital', 'doctor', 'dental', 'medical', 'healthcare', 'veterinary', 'vet'],
  'saas': ['saas', 'dashboard', 'analytics', 'platform', 'software', 'cloud'],
  'education': ['school', 'course', 'learn', 'tutor', 'coaching', 'education'],
  'portfolio': ['portfolio', 'personal', 'showcase', 'creative'],
  'beauty': ['salon', 'beauty', 'spa', 'skincare', 'makeup'],
  'legal': ['law', 'legal', 'attorney', 'lawyer', 'litigation'],
  'media': ['blog', 'news', 'magazine', 'podcast', 'media'],
  'fintech': ['fintech', 'banking', 'payment', 'crypto', 'insurance'],
  'nonprofit': ['charity', 'donation', 'nonprofit', 'foundation'],
  'luxury': ['luxury', 'premium', 'high-end', 'exclusive', 'bespoke'],
};

/**
 * Visual style detection keywords.
 */
const VISUAL_STYLE_KEYWORDS: Record<string, string[]> = {
  'cinematic': ['cinematic', 'film', 'movie', 'dramatic', 'epic', 'hollywood'],
  'minimalist': ['minimal', 'clean', 'simple', 'minimalist', 'stripped'],
  'brutalist': ['brutalist', 'raw', 'industrial', 'mechanical'],
  'luxury': ['luxury', 'premium', 'elegant', 'sophisticated', 'high-end'],
  'playful': ['playful', 'fun', 'colorful', 'vibrant', 'whimsical'],
  'dark': ['dark', 'moody', 'gothic', 'noir', 'shadow'],
  'bright': ['bright', 'light', 'airy', 'pastel', 'soft'],
  'tech': ['tech', 'futuristic', 'cyber', 'neon', 'digital'],
  'organic': ['organic', 'natural', 'earth', 'green', 'sustainable'],
  'editorial': ['editorial', 'magazine', 'typographic', 'print'],
};

// ─── Decomposer ─────────────────────────────────────────────────────────────

/**
 * Decompose a complex prompt into task atoms.
 *
 * @param prompt - The user's full request
 * @param availableSkills - Skills currently installed/available
 * @returns DecompositionResult with all atoms, skills, and execution plan
 */
export function decomposePrompt(
  prompt: string,
  availableSkills: string[] = [],
): DecompositionResult {
  const lower = prompt.toLowerCase();
  const atoms: TaskAtom[] = [];

  // 1. Detect industry
  const industryAtom = detectIndustry(lower, prompt);
  if (industryAtom) atoms.push(industryAtom);

  // 2. Detect capabilities (3D, scroll, animation, etc.)
  const capabilityAtoms = detectCapabilities(lower, prompt);
  atoms.push(...capabilityAtoms);

  // 3. Detect visual style
  const styleAtoms = detectVisualStyles(lower, prompt);
  atoms.push(...styleAtoms);

  // 4. Detect interactions
  const interactionAtoms = detectInteractions(lower, prompt);
  atoms.push(...interactionAtoms);

  // 5. Detect framework preference
  const frameworkAtom = detectFramework(lower);
  if (frameworkAtom) atoms.push(frameworkAtom);

  // 6. Detect platform
  const platformAtom = detectPlatform(lower);
  if (platformAtom) atoms.push(platformAtom);

  // 7. Deduplicate atoms
  const deduped = deduplicateAtoms(atoms);

  // 8. Compute required skills
  const allRequiredSkills = computeRequiredSkills(deduped);
  const available = allRequiredSkills.filter(s => availableSkills.some(a => a.includes(s) || s.includes(a)));
  const missing = allRequiredSkills.filter(s => !available.some(a => a.includes(s) || s.includes(a)));

  // 9. Compute complexity
  const complexity = computeComplexity(deduped, missing);

  // 10. Compute execution order
  const executionOrder = topologicalSort(deduped);

  // 11. Group by type
  const byType: Record<TaskAtomType, TaskAtom[]> = {
    industry: [], capability: [], 'visual-style': [], interaction: [],
    platform: [], framework: [], content: [], integration: [],
  };
  for (const atom of deduped) {
    byType[atom.type].push(atom);
  }

  // 12. Generate summary
  const summary = generateSummary(deduped, allRequiredSkills, missing, complexity);

  return {
    atoms: deduped,
    byType,
    allRequiredSkills,
    availableSkills: available,
    missingSkills: missing,
    complexity,
    executionOrder,
    summary,
  };
}

// ─── Detection Functions ────────────────────────────────────────────────────

function detectIndustry(lower: string, raw: string): TaskAtom | null {
  let bestMatch = '';
  let bestConfidence = 0;

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const confidence = kw.length > 5 ? 0.95 : 0.85;
        if (confidence > bestConfidence) {
          bestMatch = industry;
          bestConfidence = confidence;
        }
      }
    }
  }

  if (!bestMatch) return null;

  return {
    type: 'industry',
    value: bestMatch,
    rawText: extractMatchingText(raw, INDUSTRY_KEYWORDS[bestMatch]),
    confidence: bestConfidence,
    knownSkills: CAPABILITY_SKILL_MAP[bestMatch] || [],
    critical: true,
    dependsOn: [],
  };
}

function detectCapabilities(lower: string, raw: string): TaskAtom[] {
  const atoms: TaskAtom[] = [];

  const CAPABILITY_PATTERNS: Array<{ pattern: string; value: string; keywords: string[] }> = [
    { pattern: '3d', value: '3d', keywords: ['3d', 'three-dimensional', '3-dimensional'] },
    { pattern: '3d-scroll', value: '3d-scroll', keywords: ['3d scroll', '3d parallax', 'three.js scroll'] },
    { pattern: 'scroll', value: 'scroll-effects', keywords: ['scroll effect', 'scroll animation', 'scroll reveal', 'scroll-driven'] },
    { pattern: 'parallax', value: 'parallax', keywords: ['parallax', 'depth effect', 'layered scroll'] },
    { pattern: 'mouse', value: 'mouse-tracking', keywords: ['mouse track', 'cursor follow', 'mouse follow', 'mouse interaction'] },
    { pattern: 'hover', value: 'hover-effects', keywords: ['hover effect', 'hover animation', 'hover interact'] },
    { pattern: 'cinematic', value: 'cinematic-visuals', keywords: ['cinematic', 'film', 'movie', 'dramatic visual'] },
    { pattern: 'immersive', value: 'immersive-experience', keywords: ['immersive', 'immersion', 'fully immersive'] },
    { pattern: 'interactive', value: 'interactive-experience', keywords: ['interactive', 'interactivity', 'fully interactive'] },
    { pattern: 'smooth', value: 'smooth-scroll', keywords: ['smooth scroll', 'buttery smooth', 'fluid scroll'] },
    { pattern: 'page-transition', value: 'page-transitions', keywords: ['page transition', 'route transition', 'screen transition'] },
    { pattern: 'animation', value: 'animation', keywords: ['animation', 'animate', 'motion', 'moving'] },
    { pattern: 'micro-interaction', value: 'micro-interactions', keywords: ['micro interaction', 'micro-interaction', 'subtle animation'] },
    { pattern: 'cursor', value: 'cursor-effects', keywords: ['cursor effect', 'custom cursor', 'cursor design'] },
    { pattern: 'tilt', value: 'tilt-effects', keywords: ['tilt', '3d tilt', 'perspective tilt'] },
    { pattern: 'drag', value: 'drag-interaction', keywords: ['drag', 'swipe', 'gesture'] },
    { pattern: 'loading', value: 'loading-animation', keywords: ['loading', 'skeleton', 'shimmer', 'loader'] },
  ];

  for (const { pattern, value, keywords } of CAPABILITY_PATTERNS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        atoms.push({
          type: 'capability',
          value,
          rawText: extractMatchingText(raw, [kw]),
          confidence: kw.length > 5 ? 0.9 : 0.8,
          knownSkills: CAPABILITY_SKILL_MAP[value] || CAPABILITY_SKILL_MAP[pattern] || [],
          critical: false,
          dependsOn: [],
        });
        break;
      }
    }
  }

  return atoms;
}

function detectVisualStyles(lower: string, raw: string): TaskAtom[] {
  const atoms: TaskAtom[] = [];

  for (const [style, keywords] of Object.entries(VISUAL_STYLE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        atoms.push({
          type: 'visual-style',
          value: style,
          rawText: extractMatchingText(raw, [kw]),
          confidence: 0.85,
          knownSkills: CAPABILITY_SKILL_MAP[style] || [],
          critical: false,
          dependsOn: [],
        });
        break;
      }
    }
  }

  return atoms;
}

function detectInteractions(lower: string, raw: string): TaskAtom[] {
  const atoms: TaskAtom[] = [];

  const INTERACTION_PATTERNS: Array<{ value: string; keywords: string[] }> = [
    { value: 'mouse-tracking', keywords: ['mouse track', 'cursor follow', 'mouse follow'] },
    { value: 'scroll-triggered', keywords: ['scroll trigger', 'scroll activated', 'scroll based'] },
    { value: 'drag-and-drop', keywords: ['drag', 'drop', 'drag and drop'] },
    { value: 'gesture-based', keywords: ['gesture', 'swipe', 'pinch'] },
    { value: 'voice-controlled', keywords: ['voice', 'speech', 'voice control'] },
    { value: 'gesture-based', keywords: ['gesture', 'hand tracking'] },
  ];

  for (const { value, keywords } of INTERACTION_PATTERNS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        atoms.push({
          type: 'interaction',
          value,
          rawText: extractMatchingText(raw, [kw]),
          confidence: 0.85,
          knownSkills: CAPABILITY_SKILL_MAP[value] || [],
          critical: false,
          dependsOn: [],
        });
        break;
      }
    }
  }

  return atoms;
}

function detectFramework(lower: string): TaskAtom | null {
  const FRAMEWORKS: Array<{ value: string; keywords: string[] }> = [
    { value: 'react', keywords: ['react', 'reactjs', 'react.js'] },
    { value: 'nextjs', keywords: ['next.js', 'nextjs', 'next '] },
    { value: 'vue', keywords: ['vue', 'vuejs', 'vue.js', 'vue3'] },
    { value: 'angular', keywords: ['angular', 'angularjs'] },
    { value: 'svelte', keywords: ['svelte', 'sveltekit'] },
  ];

  for (const { value, keywords } of FRAMEWORKS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return {
          type: 'framework',
          value,
          rawText: kw,
          confidence: 0.9,
          knownSkills: CAPABILITY_SKILL_MAP[value] || [],
          critical: false,
          dependsOn: [],
        };
      }
    }
  }

  return null;
}

function detectPlatform(lower: string): TaskAtom | null {
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android')) {
    return {
      type: 'platform',
      value: 'mobile',
      rawText: 'mobile',
      confidence: 0.9,
      knownSkills: ['react-native-expert', 'flutter-expert'],
      critical: false,
      dependsOn: [],
    };
  }
  if (lower.includes('desktop') || lower.includes('electron')) {
    return {
      type: 'platform',
      value: 'desktop',
      rawText: 'desktop',
      confidence: 0.85,
      knownSkills: ['electron'],
      critical: false,
      dependsOn: [],
    };
  }
  // Default: web
  return null;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function extractMatchingText(raw: string, keywords: string[]): string {
  const lower = raw.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      return raw.slice(Math.max(0, idx - 20), idx + kw.length + 20).trim();
    }
  }
  return raw.slice(0, 50);
}

function deduplicateAtoms(atoms: TaskAtom[]): TaskAtom[] {
  const seen = new Map<string, TaskAtom>();
  for (const atom of atoms) {
    const key = `${atom.type}:${atom.value}`;
    if (!seen.has(key) || atom.confidence > seen.get(key)!.confidence) {
      seen.set(key, atom);
    }
  }
  return Array.from(seen.values());
}

function computeRequiredSkills(atoms: TaskAtom[]): string[] {
  const skillSet = new Set<string>();
  for (const atom of atoms) {
    for (const skill of atom.knownSkills) {
      skillSet.add(skill);
    }
  }
  return Array.from(skillSet);
}

function computeComplexity(atoms: TaskAtom[], missingSkills: string[]): number {
  let score = 0;

  // More atoms = higher complexity
  score += Math.min(atoms.length / 10, 0.4);

  // More missing skills = higher complexity
  score += Math.min(missingSkills.length / 5, 0.3);

  // 3D and animation are inherently complex
  const has3D = atoms.some(a => a.value.includes('3d'));
  const hasAnimation = atoms.some(a => a.value.includes('scroll') || a.value.includes('animation'));
  const hasInteraction = atoms.some(a => a.type === 'interaction');

  if (has3D) score += 0.15;
  if (hasAnimation) score += 0.1;
  if (hasInteraction) score += 0.1;

  return Math.min(score, 1);
}

function topologicalSort(atoms: TaskAtom[]): string[] {
  // Simple dependency-aware ordering
  // 1. Industry first (foundation)
  // 2. Framework (determines toolchain)
  // 3. Capabilities (build on framework)
  // 4. Visual style (applies on top)
  // 5. Interactions (final layer)
  const order: TaskAtomType[] = ['industry', 'platform', 'framework', 'capability', 'visual-style', 'interaction', 'content', 'integration'];

  const sorted: string[] = [];
  for (const type of order) {
    const ofType = atoms.filter(a => a.type === type);
    for (const atom of ofType) {
      sorted.push(`${atom.type}:${atom.value}`);
    }
  }

  return sorted;
}

function generateSummary(
  atoms: TaskAtom[],
  allSkills: string[],
  missing: string[],
  complexity: number,
): string {
  const lines: string[] = [];

  const industry = atoms.find(a => a.type === 'industry');
  const caps = atoms.filter(a => a.type === 'capability');
  const styles = atoms.filter(a => a.type === 'visual-style');
  const interactions = atoms.filter(a => a.type === 'interaction');

  lines.push(`Industry: ${industry?.value || 'generic'}`);
  if (caps.length > 0) lines.push(`Capabilities: ${caps.map(c => c.value).join(', ')}`);
  if (styles.length > 0) lines.push(`Visual Style: ${styles.map(s => s.value).join(', ')}`);
  if (interactions.length > 0) lines.push(`Interactions: ${interactions.map(i => i.value).join(', ')}`);
  lines.push(`Skills Needed: ${allSkills.length} (${missing.length} missing)`);
  lines.push(`Complexity: ${(complexity * 100).toFixed(0)}%`);

  return lines.join('\n');
}
