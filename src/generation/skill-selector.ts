/**
 * SkillSelector — signal-driven skill selection for the build engine.
 *
 * Principle: when a user signals a need (scroll experience, motion, 3D,
 * ecommerce, ...), the engine MUST select the RIGHT skill(s) from the
 * available ecosystem rather than hardcoding one library. Flow:
 *
 *   1. Derive capability signals from BusinessKnowledge intents.
 *   2. Query the known-skill ecosystem (findSkillsForCapability).
 *   3. For any selected skill that is not installed locally, install it via
 *      the Skills CLI (`npx skills add`) — install-on-demand.
 *   4. Return the selected skills so downstream stages (renderer, motion
 *      engine, subagents) use the matched technique, and record them in the
 *      design brief for auditability.
 *
 * This is deliberately provider-agnostic: the chosen library (gsap vs
 * framer-motion vs css) is computed from signals, never assumed.
 */

import { execSync } from 'child_process';
import { findSkillsForCapability } from '../orchestration/skill-orchestrator.js';
import { getSkillDiscovery } from '../core/skill-discovery.js';
import type { BusinessKnowledge, BusinessIntents } from '../orchestration/business-intelligence/types.js';

export interface SelectedSkill {
  id: string;
  name: string;
  source: string;
  capabilities: string[];
  installed: boolean;
  /** How this skill was chosen (which signal triggered it). */
  triggeredBy: string;
}

export interface SkillSelectionResult {
  /** All skills selected for this build, ordered by priority. */
  skills: SelectedSkill[];
  /** The animation library the renderer should emit (derived from selection). */
  animationLibrary: 'gsap' | 'framer-motion' | 'css';
  /** Whether smooth-scroll / scroll-narrative is part of the build. */
  scrollDriven: boolean;
  /** Whether any skill had to be installed on demand. */
  installedOnDemand: string[];
  /** Human-readable reasoning for the design brief. */
  reasoning: string;
  /**
   * Image → cinematic-video plan. When the build has real images AND the user
   * wants cinematic motion, we select an image-to-video skill (Seedance 2.0 /
   * Cinema World Builder / Nano Banana Pro Director) and record, per image,
   * which skill should turn it into motion footage. The agent/subagent runs
   * the skill on each image; the renderer references the planned output path.
   */
  videoPlan?: VideoGenerationPlan;
}

/** One collected image to be animated into cinematic video. */
export interface VideoPlanItem {
  /** Source image URL (real image collected during research). */
  imageUrl: string;
  /** Planned output path the renderer will reference (poster = imageUrl). */
  outputPath: string;
  /** The skill that should generate the video. */
  skillId: string;
  /** Where this video is used (hero / feature / background). */
  usage: 'hero' | 'feature' | 'background';
  /**
   * Real playable fallback URL, filled in by the video generation-step so
   * playback works before the image-to-video skill produces `outputPath`.
   */
  fallbackUrl?: string;
}

export interface VideoGenerationPlan {
  /** The single best image-to-video skill selected for this build. */
  skillId: string;
  /** Display name of the skill (for the design brief / agent handoff). */
  skillName: string;
  /** Whether the chosen skill is available locally (true for the bundled
   *  Seedance 2.0 / Cinema World / Nano Banana Pro Director skills). */
  skillInstalled: boolean;
  /** Local skill directory the agent invokes to run the image→video generation
   *  (e.g. higgsfield-seedance2-jineng-main). Empty when only registry install. */
  localSkillPath?: string;
  /** Items to animate. Empty if no real images / no cinematic intent. */
  items: VideoPlanItem[];
}

/**
 * Map the user's intent signals onto the capability queries we ask the skill
 * ecosystem. Each entry: [capabilityQuery, triggeredBySignal].
 */
function signalToCapabilities(intents: BusinessIntents): Array<{ capability: string; trigger: string }> {
  const queries: Array<{ capability: string; trigger: string }> = [];

  // Motion / animation intent → animation skills.
  if (intents.motion.length) {
    for (const m of intents.motion) {
      queries.push({ capability: m, trigger: `motion:${m}` });
    }
  }
  // Experience intent → scroll / immersive skills.
  for (const e of intents.experience) {
    if (e === 'immersive-scroll' || e === 'immersive-3d') {
      queries.push({ capability: 'scroll', trigger: `experience:${e}` });
      queries.push({ capability: 'animation', trigger: `experience:${e}` });
    }
    if (e === 'immersive-3d') queries.push({ capability: '3d', trigger: `experience:${e}` });
  }
  // Emotional cinematic / calm → cinematic motion skills.
  for (const em of intents.emotional) {
    if (['cinematic', 'serenity', 'excitement', 'chaos-to-calm'].includes(em)) {
      queries.push({ capability: 'cinematic', trigger: `emotional:${em}` });
    }
  }
  // Cinematic video intent → image-to-video skills (turn reference images into motion).
  if (
    intents.emotional.includes('cinematic') ||
    intents.motion.includes('cinematic') ||
    intents.experience.includes('immersive-scroll')
  ) {
    queries.push({ capability: 'cinematic-video', trigger: 'video:cinematic' });
    queries.push({ capability: 'image-to-video', trigger: 'video:image-to-video' });
  }
  // Interaction primitives → their dedicated skills.
  for (const i of intents.interaction) {
    queries.push({ capability: i, trigger: `interaction:${i}` });
  }
  // Component motion → Framer Motion (always available alongside cinematic video).
  if (intents.motion.length || intents.interaction.length || intents.experience.length) {
    queries.push({ capability: 'component-animation', trigger: 'motion:component' });
  }
  // Always ensure a baseline UI/design + react skill when building an app.
  queries.push({ capability: 'landing-page', trigger: 'baseline:ui' });
  queries.push({ capability: 'react', trigger: 'baseline:framework' });

  return queries;
}

/**
 * Install a missing skill via the Skills CLI. Best-effort: if the network or
 * CLI is unavailable we degrade gracefully (the build still proceeds with the
 * library it can emit). Returns true if install was attempted & succeeded.
 */
function installSkillOnDemand(skillId: string): boolean {
  const discovery = getSkillDiscovery();
  if (discovery.isSkillInstalled(skillId)) return true;
  try {
    console.log(`[skill-selector] installing missing skill: ${skillId}`);
    execSync(`npx -y skills add ${skillId}`, {
      stdio: 'inherit',
      timeout: 120_000,
      env: { ...process.env },
    });
    return discovery.isSkillInstalled(skillId);
  } catch (err) {
    console.warn(`[skill-selector] install failed for ${skillId} (continuing):`, (err as Error).message);
    return false;
  }
}

/**
 * Select the right skills for a build from the user's intent. Installs any
 * missing skills on demand. Deterministic given the same intents.
 */
export function selectSkillsForBuild(bk: BusinessKnowledge): SkillSelectionResult {
  const intents = bk.intents;
  const queries = signalToCapabilities(intents);
  const discovery = getSkillDiscovery();

  const seen = new Set<string>();
  const skills: SelectedSkill[] = [];
  const installedOnDemand: string[] = [];

  for (const { capability, trigger } of queries) {
    const matches = findSkillsForCapability(capability);
    // Pick the highest-install, already-installed skill first; otherwise the
    // top candidate (and attempt to install it).
    const installed = matches.find((m) => m.installed);
    const chosen = installed ?? matches[0];
    if (!chosen || seen.has(chosen.id)) continue;
    seen.add(chosen.id);

    let isInstalled = !!chosen.installed || discovery.isSkillInstalled(chosen.id);
    if (!isInstalled) {
      if (installSkillOnDemand(chosen.id)) {
        isInstalled = true;
        installedOnDemand.push(chosen.id);
      }
    }
    skills.push({
      id: chosen.id,
      name: chosen.name,
      source: chosen.source,
      capabilities: chosen.capabilities,
      installed: isInstalled,
      triggeredBy: trigger,
    });
  }

  // Determine the animation library from the selected motion skills:
  // scroll-driven → GSAP ScrollTrigger; component motion → Framer Motion;
  // fallback → css. Prefer GSAP when scroll/parallax is explicitly requested.
  const scrollDriven =
    intents.experience.includes('immersive-scroll') ||
    intents.motion.includes('scroll-driven') ||
    intents.motion.includes('parallax') ||
    skills.some((s) => s.capabilities.includes('scroll-animation') || s.capabilities.includes('scroll'));

  const hasGsap = skills.some((s) => s.id === 'gsap-scrolltrigger');
  const hasFramer = skills.some((s) => s.id === 'motion-framer' || s.id === 'framer-motion');
  const animationLibrary: SkillSelectionResult['animationLibrary'] = scrollDriven && hasGsap
    ? 'gsap'
    : hasFramer || hasGsap
      ? (hasGsap ? 'gsap' : 'framer-motion')
      : 'css';

  const reasoning = [
    `Selected ${skills.length} skill(s) from intent signals.`,
    `Animation library: ${animationLibrary} (scrollDriven=${scrollDriven}, gsap=${hasGsap}, framer=${hasFramer}).`,
    `Triggers: ${[...new Set(skills.map((s) => s.triggeredBy))].join(', ')}.`,
  ].join(' ');

  // ── Image → Cinematic Video plan ────────────────────────────────────────
  // Source the REAL reference images we collected (attached screenshots /
  // brand boards / scraped imagery). The chosen image-to-video skill turns each
  // into cinematic motion footage; the renderer references the planned output.
  const videoPlan = buildVideoPlan(bk, skills);

  return { skills, animationLibrary, scrollDriven, installedOnDemand, reasoning, videoPlan };
}

/**
 * Pick the single best image-to-video skill for this build's domain, then lay
 * out a plan turning each REAL reference image into cinematic motion footage.
 *
 * Source images = the reference images we actually collected during research
 * (attached screenshots / brand boards / scraped imagery), copied to
 * public/images/reference. If none are present we fall back to a hero/feature
 * seed so the build still gets a cinematic video asset.
 *
 * The chosen skill (Seedance 2.0 Cinematic / Product 360 / Ecommerce Ad /
 * Brand Story / Cinema World Builder / Nano Banana Pro Director) is installed
 * on demand. The renderer references `/videos/<seed>.mp4` (poster = imageUrl);
 * the agent/subagent runs the skill on each image to produce that file.
 */
/** Higher rank = more worth turning into cinematic motion footage. */
function rankPurpose(p?: string): number {
  switch (p) {
    case 'hero': return 4;
    case 'product': return 3;
    case 'feature': return 2;
    case 'background': return 1;
    default: return 0;
  }
}

function buildVideoPlan(bk: BusinessKnowledge, skills: SelectedSkill[]): VideoGenerationPlan | undefined {
  const videoSkill = skills.find((s) =>
    s.capabilities.includes('image-to-video') || s.capabilities.includes('cinematic-video'),
  );
  if (!videoSkill) return undefined;

  // Collect real reference image paths (relative to public/).
  const refImages: string[] = [];
  const attached = bk.references?.images ?? [];
  for (const p of attached) {
    const name = p.split(/[\\/]/).pop();
    if (name) refImages.push(`images/reference/${name}`);
  }
  // Draw from scraped/web-research evidence: REAL competitor imagery collected
  // via OpenClaw. Prefer hero/feature/product images (the ones worth animating).
  const evidenceAssets = bk.evidence?.assets?.value ?? [];
  const scrapedImgs = evidenceAssets
    .filter((a) => (a.kind === 'image' || a.kind === 'og-image') && a.url)
    .sort((a, b) => rankPurpose(b.purpose) - rankPurpose(a.purpose))
    .map((a) => a.url);
  for (const u of scrapedImgs.slice(0, 6)) refImages.push(u);

  const seeds = refImages.length
    ? refImages
    : [`brand-hero`, `brand-feature`];

  const usage: VideoPlanItem['usage'][] = ['hero', 'feature', 'background'];
  const items: VideoPlanItem[] = seeds.map((img, i) => ({
    imageUrl: img,
    outputPath: `videos/${bk.discovery?.industry ?? 'brand'}-${i}.mp4`,
    skillId: videoSkill.id,
    usage: usage[i % usage.length],
  }));

  // Map the selected skill id to its local skill directory so the agent can
  // invoke it directly (no registry round-trip).
  const localMap: Record<string, string> = {
    'seedance-cinematic': 'higgsfield-seedance2-jineng-main/higgsfield-seedance2-jineng-main/skills/01-cinematic',
    'seedance-product-360': 'higgsfield-seedance2-jineng-main/higgsfield-seedance2-jineng-main/skills/09-product-360',
    'seedance-ecommerce-ad': 'higgsfield-seedance2-jineng-main/higgsfield-seedance2-jineng-main/skills/07-ecommerce-ad',
    'seedance-brand-story': 'higgsfield-seedance2-jineng-main/higgsfield-seedance2-jineng-main/skills/12-brand-story',
    'cinema-world-builder': 'higgsfield-seedance2-jineng-main/higgsfield-seedance2-jineng-main/skills/01-cinematic',
    'nano-banana-pro-director': 'nano-banana-ui-prompts-main/nano-banana-ui-prompts-main',
  };

  return {
    skillId: videoSkill.id,
    skillName: videoSkill.name,
    skillInstalled: videoSkill.installed,
    localSkillPath: localMap[videoSkill.id],
    items,
  };
}

/**
 * Superpowers meta-skills belong at specific pipeline stages, not bolted onto
 * the renderer. They are the most powerful reasoning skills we have and must be
 * invoked by the agent at the right moment:
 *   - brainstorming      → before ANY creative build (clarify intent/design)
 *   - writing-plans      → before a multi-step implementation begins
 *   - executing-plans    → to run the plan with review checkpoints
 *   - systematic-debugging → inside the verify→repair loop on any failure
 *   - verification-before-completion → as the gate before marking "done"
 *   - requesting-code-review → after a major feature lands
 * This selector returns which stages are relevant given the build's signals so
 * the orchestrator can recommend them to the agent.
 */
export function selectSuperpowersHooks(bk: BusinessKnowledge): string[] {
  const hooks: string[] = [];
  const intents = bk.intents;
  const isCreative =
    intents.experience.length || intents.motion.length || intents.emotional.length || intents.content.length;
  if (isCreative) hooks.push('brainstorming');
  hooks.push('writing-plans');
  hooks.push('executing-plans');
  hooks.push('systematic-debugging');
  hooks.push('verification-before-completion');
  hooks.push('requesting-code-review');
  return [...new Set(hooks)];
}
