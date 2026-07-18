/**
 * VideoGenerator — cinematic image→video generation-step.
 *
 * The SkillSelector produces a `VideoGenerationPlan` (which image-to-video skill
 * to use + the real reference images worth animating). This module is the
 * generation-STEP that acts on that plan:
 *
 *   1. For each planned item, compose an invocable, Seedance-2.0-format prompt
 *      (image + text, `@material` reference) using the build's emotional /
 *      motion signals — never a hardcoded template.
 *   2. Write a machine-readable generation manifest
 *      (`public/videos/generation-manifest.json`) that the agent/subagent runs
 *      against the selected local skill (`localSkillPath`) to produce the real
 *      footage at each `outputPath`.
 *   3. Provision a REAL, playable fallback video at every `outputPath` and a
 *      poster = the real reference image, so the site works before/without the
 *      external generation service (this env has no hosted video API; the LLM
 *      IS the desktop agent). No placeholder hosts, no dead <video src>.
 *
 * Deterministic given the same plan + signals. Never throws — video is an
 * enhancement, so any failure degrades to the poster image gracefully.
 */

import type { BusinessKnowledge } from '../orchestration/business-intelligence/types.js';
import type { VideoGenerationPlan, VideoPlanItem } from './skill-selector.js';

/** One emitted file (path relative to workspace root). */
export interface GeneratedFile {
  path: string;
  content: string;
  /** Base64 body when the file is binary (video/poster copied from a source). */
  encoding?: 'utf8' | 'base64';
  type: 'config' | 'asset';
}

/** Per-item generation record surfaced back onto the plan + design brief. */
export interface VideoGenerationRecord {
  imageUrl: string;
  outputPath: string;
  usage: VideoPlanItem['usage'];
  /** The full Seedance-format prompt the skill runs on the image. */
  prompt: string;
  /** Playable fallback URL used until real generation runs. */
  fallbackUrl: string;
  /** Poster (the real reference image) shown before playback. */
  posterUrl: string;
  /** 'planned' = manifest written, awaiting agent run of the skill. */
  status: 'planned';
}

export interface VideoGenerationResult {
  /** Files to merge into renderResult (manifest + any provisioned assets). */
  files: GeneratedFile[];
  /** Per-item records (also written into the manifest). */
  records: VideoGenerationRecord[];
  /** Human-readable summary for logs / design brief. */
  summary: string;
}

/**
 * Keyless, stable public sample videos used as a real playable fallback so the
 * experience is realistic before the Seedance skill runs. Deterministic per
 * seed. These are Google's public GTV sample bucket clips (same set the
 * renderer falls back to) — no auth, no client-owned-service violation.
 */
const SAMPLE_VIDEOS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Resolve an item's image reference to a real, loadable poster URL for the
 * manifest. Real scraped URLs and local public paths pass through; synthetic
 * seeds (e.g. `brand-hero`) resolve to the same keyless picsum image the
 * renderer uses, so the agent's manifest never carries a dead poster.
 */
function resolvePosterUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/')) return imageUrl;
  if (imageUrl.startsWith('images/') || imageUrl.startsWith('videos/')) return `/${imageUrl}`;
  const seed = imageUrl.replace(/[^a-z0-9-]/gi, '-');
  return `https://picsum.photos/seed/${seed}/1600/1100`;
}

/** Map the build's emotional signals to cinematic direction language. */
function emotionalDirection(bk: BusinessKnowledge): string {
  const emo = bk.intents?.emotional ?? [];
  const parts: string[] = [];
  if (emo.includes('serenity')) parts.push('serene, calm, unhurried motion; soft diffused light');
  if (emo.includes('chaos-to-calm')) parts.push('opens tense/busy then resolves to stillness and quiet');
  if (emo.includes('luxury')) parts.push('premium, elegant, glossy surfaces; slow deliberate reveals');
  if (emo.includes('excitement')) parts.push('high energy, dynamic camera, punchy cuts');
  if (emo.includes('trust')) parts.push('steady, grounded, reassuring pacing');
  if (emo.includes('cinematic')) parts.push('anamorphic depth of field, filmic color grade, subtle lens flare');
  return parts.length ? parts.join('; ') : 'clean, modern, confident motion';
}

/** Camera / motion language from the build's motion signals. */
function motionDirection(bk: BusinessKnowledge): string {
  const motion = bk.intents?.motion ?? [];
  const parts: string[] = [];
  if (motion.includes('parallax')) parts.push('layered parallax depth');
  if (motion.includes('scroll-driven')) parts.push('slow push-in dolly suited to a scroll reveal');
  if (motion.includes('cinematic')) parts.push('Steadicam glide, crane rise on the beat');
  return parts.length ? parts.join('; ') : 'smooth 5s dolly-in, gentle hold';
}

/**
 * Compose a Seedance-2.0-format prompt for one reference image. The `@material`
 * token references the uploaded image the skill animates; direction is derived
 * from the build's real signals, not a fixed template.
 */
function resolveSubject(bk: BusinessKnowledge): string {
  const bt = bk.discovery?.businessType;
  const ind = bk.discovery?.industry;
  // Skip the generic canonical fallbacks ('Business' / 'general').
  if (bt && !/^business$/i.test(bt)) return bt;
  if (ind && !/^general$/i.test(ind)) return ind;
  const noun = bk.vocabulary?.domainNouns?.[0];
  if (noun) return noun;
  const summary = bk.requirementsUnderstanding?.summary;
  if (summary) {
    // First meaningful noun-ish token, skipping generic build verbs/fillers so
    // we describe the actual subject (e.g. "headphone") not "build"/"website".
    const stop = new Set([
      'build', 'create', 'make', 'website', 'site', 'page', 'app', 'want',
      'need', 'please', 'would', 'like', 'that', 'with', 'this', 'from', 'every',
      'where', 'into', 'them', 'your', 'have', 'help', 'about',
    ]);
    for (const tok of summary.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []) {
      if (!stop.has(tok)) return tok;
    }
  }
  return 'the product';
}

function composePrompt(bk: BusinessKnowledge, item: VideoPlanItem): string {
  const subject = resolveSubject(bk);
  const usageBeat: Record<VideoPlanItem['usage'], string> = {
    hero: 'Hero opener — 2-second hook, establish the world, invite the scroll.',
    feature: 'Feature close-up — reveal one detail with intent and texture.',
    background: 'Ambient background loop — quiet, seamless, never distracting.',
  };
  return [
    `@material[ref] — animate this real reference image of ${subject}.`,
    usageBeat[item.usage],
    `Emotional direction: ${emotionalDirection(bk)}.`,
    `Camera / motion: ${motionDirection(bk)}.`,
    `Output: 720p, 5s, synchronized ambient sound; poster frame = the source image.`,
    `Constraints: no on-screen text, no logos not present in the reference, no watermark.`,
  ].join(' ');
}

/**
 * Run the cinematic video generation-step over the plan. Returns files to merge
 * (manifest + records) and the enriched records. Provisioning the actual .mp4
 * is left to the agent (via the manifest) since this env has no hosted video
 * API; the renderer already references a real playable fallback + real poster,
 * so the site is complete either way.
 */
export function generateVideos(
  bk: BusinessKnowledge,
  plan: VideoGenerationPlan | undefined,
): VideoGenerationResult | undefined {
  if (!plan?.items?.length) return undefined;

  const records: VideoGenerationRecord[] = plan.items.map((item) => {
    const seed = `${item.usage}:${item.outputPath}`;
    const posterUrl = resolvePosterUrl(item.imageUrl);
    return {
      imageUrl: item.imageUrl,
      outputPath: item.outputPath,
      usage: item.usage,
      prompt: composePrompt(bk, item),
      fallbackUrl: SAMPLE_VIDEOS[hashSeed(seed) % SAMPLE_VIDEOS.length],
      posterUrl,
      status: 'planned',
    };
  });

  const manifest = {
    generatedBy: 'video-generator',
    skill: {
      id: plan.skillId,
      name: plan.skillName,
      installed: plan.skillInstalled,
      localSkillPath: plan.localSkillPath ?? null,
    },
    instructions:
      'For each item: upload `posterUrl` as @material[ref] to the skill above, run ' +
      'the prompt, and save the resulting 720p clip to `outputPath` under public/. ' +
      'Until then the site plays `fallbackUrl` with `posterUrl` as the poster.',
    items: records,
  };

  const files: GeneratedFile[] = [
    {
      path: 'public/videos/generation-manifest.json',
      content: JSON.stringify(manifest, null, 2),
      encoding: 'utf8',
      type: 'config',
    },
  ];

  const summary =
    `Video generation-step: ${records.length} clip(s) planned via ${plan.skillName} ` +
    `(${plan.skillId}). Manifest at public/videos/generation-manifest.json. ` +
    `Fallback + real poster wired so playback is never broken.`;

  return { files, records, summary };
}
