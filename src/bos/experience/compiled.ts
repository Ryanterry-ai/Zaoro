// ─── CompiledExperience ─────────────────────────────────────────────
// The final output of the Experience Reasoning Engine.  This is what the
// renderer consumes.  The renderer NEVER decides anything — it only
// translates this structure into React / Flutter / Unity / WebGL / Native.
//
// CompiledExperience is universal: it contains no industry-specific
// knowledge, no hardcoded component choices, no per-vertical logic.
// It is a pure description of:
//   - What the experience should feel like (emotional arc)
//   - What the experience should look like (grammar)
//   - What the experience should do (conversion, interaction)
//   - How the sections flow (narrative structure)
//
// The renderer maps these to composable components.

import type { ExperienceGrammar } from './grammar.js';
import type { ResolvedPrimitive } from '../primitives/types.js';

// ─── Section (universal narrative structure) ───────────────────────

export type UniversalSectionRole =
  | 'hook'          // grab attention
  | 'problem'       // articulate the pain
  | 'solution'      // present the offering
  | 'proof'         // evidence / social proof
  | 'interaction'   // let them try / configure
  | 'conversion';   // primary CTA

export interface CompiledSection {
  role: UniversalSectionRole;
  emotion: string;
  grammar: Partial<ExperienceGrammar>;
  primitives: string[];
  contentIntent: string;
  conversionRole: 'awareness' | 'interest' | 'desire' | 'action' | 'retention';
}

// ─── CompiledExperience ─────────────────────────────────────────────

export interface CompiledExperience {
  conceptId: string;
  conceptName: string;
  grammar: ExperienceGrammar;
  primitives: ResolvedPrimitive[];
  sections: CompiledSection[];
  coherence: number;
  rendererTarget: 'react' | 'flutter' | 'unity' | 'webgl' | 'native';
  motionLanguage: 'organic' | 'mechanical' | 'elegant' | 'luxury' | 'playful' | 'scientific' | 'precise' | 'calm' | 'aggressive';
  /** True when the selected concept/theme is scroll-driven (e.g. a
   *  noise→silence transformation). Tells the renderer to emit scroll-linked
   *  animation rather than static section reveals. */
  scrollDriven?: boolean;
  /** Scroll-linked animation specs emitted for scroll-driven experiences. */
  scrollTriggers?: Array<{ selector: string; property: string; scrollRange: [number, number]; outputRange: [number, number]; easing: string }>;
  cameraLanguage: 'macro' | 'orbit' | 'tracking' | 'close-up' | 'wide' | 'push' | 'pull' | 'parallax' | 'rack-focus';
  typographyPersonality: 'luxury' | 'friendly' | 'technical' | 'editorial' | 'playful' | 'corporate' | 'experimental';
  reasoning: string[];
  provenance: {
    primitiveSetHash: string;
    grammarHash: string;
    coherenceScore: number;
    rejectedConcepts: Array<{ id: string; reason: string }>;
  };
}
