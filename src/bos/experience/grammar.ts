// ─── Universal Experience Grammar ───────────────────────────────────
// Instead of six independent grammars (Scene, Camera, Motion,
// Interaction, Audio, Lighting), we unify them into ONE grammar.
//
// Experience Grammar
//   Scene
//   Camera
//   Motion
//   Interaction
//   Audio
//   Lighting
//   Particles
//   Physics
//   Timing
//   Conversion
//
// One grammar.  Not six independent ones.
// The Creative Director composes instances of this grammar to build
// a CompiledExperience that the renderer consumes.

// ─── Grammar Dimensions ─────────────────────────────────────────────

export interface SceneGrammar {
  /** Number of scenes/sections. */
  sceneCount: number;
  /** Transition type between scenes. */
  transitionType: 'cut' | 'dissolve' | 'slide' | 'morph' | 'parallax' | 'scroll' | 'zoom';
  /** Depth layers per scene. */
  depthLayers: number;
  /** Background treatment. */
  background: 'solid' | 'gradient' | 'image' | 'video' | '3d-scene' | 'particles';
  /** Scene complexity (1–10). */
  complexity: number;
}

export interface CameraGrammar {
  /** Camera movement type. */
  movement: 'static' | 'pan' | 'tilt' | 'dolly' | 'orbit' | 'follow' | 'handheld' | 'none';
  /** Field of view. */
  fov: number;
  /** Depth of field enabled. */
  depthOfField: boolean;
  /** Camera speed (0–1). */
  speed: number;
  /** Camera angle. */
  angle: 'eye-level' | 'low' | 'high' | 'dutch' | 'overhead' | 'isometric';
}

export interface MotionGrammar {
  /** Primary motion type. */
  primaryType: 'scroll-driven' | 'time-based' | 'interaction-triggered' | 'physics-based' | 'procedural';
  /** Easing functions per animation. */
  easing: string[];
  /** Duration range (ms). */
  durationRange: [number, number];
  /** Stagger pattern. */
  stagger: 'none' | 'sequential' | 'random' | 'wave' | 'cascade';
  /** Motion intensity (0–1). */
  intensity: number;
  /** Motion principles (from primitive set). */
  principles: string[];
}

export interface InteractionGrammar {
  /** Input types supported. */
  inputs: Array<'scroll' | 'click' | 'hover' | 'drag' | 'touch' | 'voice' | 'gesture' | 'gyroscope'>;
  /** Feedback types per interaction. */
  feedback: Array<'visual' | 'haptic' | 'audio' | 'state-change'>;
  /** Interaction density (interactions per scene). */
  density: number;
  /** Micro-interaction complexity (1–10). */
  microComplexity: number;
}

export interface AudioGrammar {
  /** Audio layers. */
  layers: Array<{
    type: 'ambient' | 'music' | 'sfx' | 'voiceover' | 'silence';
    intensity: number;
    trigger: 'always' | 'scroll' | 'interaction' | 'scene-change';
  }>;
  /** Audio spatialization. */
  spatialized: boolean;
  /** Audio ducking (reduce when speech present). */
  ducking: boolean;
}

export interface LightingGrammar {
  /** Primary light source. */
  source: 'natural' | 'artificial' | 'ambient' | 'dynamic' | 'neon' | 'gradient';
  /** Color temperature (K). */
  temperature: number;
  /** Light direction. */
  direction: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'behind' | 'omnidirectional';
  /** Shadow treatment. */
  shadows: 'none' | 'soft' | 'hard' | 'colored';
  /** Lighting transitions. */
  transitions: boolean;
}

export interface ParticleGrammar {
  /** Particle system type. */
  type: 'none' | 'ambient-dust' | 'sparkle' | 'snow' | 'fire' | 'data-stream' | 'custom';
  /** Particle count. */
  count: number;
  /** Particle behavior. */
  behavior: 'drift' | 'orbit' | 'burst' | 'trail' | 'scatter';
  /** Particle interactivity. */
  interactive: boolean;
}

export interface PhysicsGrammar {
  /** Physics simulation type. */
  simulation: 'none' | 'spring' | 'cloth' | 'liquid' | 'rigid-body' | 'soft-body';
  /** Gravity strength (0–1). */
  gravity: number;
  /** Friction (0–1). */
  friction: number;
  /** Bounciness (0–1). */
  bounciness: number;
}

export interface TimingGrammar {
  /** Beats per minute (pacing). */
  bpm: number;
  /** Rhythm pattern. */
  rhythm: 'steady' | 'syncopated' | 'accelerating' | 'decelerating' | 'organic';
  /** Pause points (sections that breathe). */
  pausePoints: number[];
  /** CTA timing (when in the sequence). */
  ctaTiming: 'early' | 'middle' | 'late' | 'progressive';
}

export interface ConversionGrammar {
  /** CTA types. */
  ctaTypes: Array<'primary' | 'secondary' | 'urgency' | 'social-proof' | 'trust'>;
  /** Trust signals. */
  trustSignals: Array<'testimonials' | 'reviews' | 'certifications' | 'guarantees' | 'stats' | 'logos'>;
  /** Funnel stage per scene. */
  funnelMapping: Array<'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase'>;
  /** Conversion pressure (0–1). */
  pressure: number;
}

// ─── Unified Grammar ────────────────────────────────────────────────

export interface ExperienceGrammar {
  scene: SceneGrammar;
  camera: CameraGrammar;
  motion: MotionGrammar;
  interaction: InteractionGrammar;
  audio: AudioGrammar;
  lighting: LightingGrammar;
  particles: ParticleGrammar;
  physics: PhysicsGrammar;
  timing: TimingGrammar;
  conversion: ConversionGrammar;
}

// ─── Grammar Factory ────────────────────────────────────────────────

/**
 * Build an ExperienceGrammar from a primitive set and emotional arc.
 *
 * CRITICAL: This function contains NO industry logic and NO hardcoded
 * per-concept branching.  Every dimension is derived from the resolved
 * primitive weights — the semantic graph, not a decision tree.
 *
 * The same primitive weights that drive "cinematic" for one business
 * drive "calm" for another.  No if (style === 'x') decisions.
 */
export function buildGrammar(input: {
  primitiveWeights: Record<string, number>;
  emotionalArc: string[];
}): ExperienceGrammar {
  const w = input.primitiveWeights;
  const arcLen = input.emotionalArc.length;

  // Scene: complexity from primitive count, transitions from motion primitives
  const scene: SceneGrammar = {
    sceneCount: Math.max(3, Math.min(8, arcLen)),
    transitionType: (w['cinematic'] ?? 0) > 0.6 ? 'dissolve' :
                    (w['movement'] ?? 0) > 0.6 ? 'parallax' :
                    (w['narrative'] ?? 0) > 0.6 ? 'scroll' :
                    (w['energy'] ?? 0) > 0.6 ? 'parallax' : 'slide',
    depthLayers: (w['minimalism'] ?? 0) > 0.7 ? 2 :
                 (w['future'] ?? 0) > 0.7 ? 5 : 3,
    background: (w['dark'] ?? 0) > 0.7 ? 'gradient' :
                (w['neon'] ?? 0) > 0.6 ? 'particles' :
                (w['future'] ?? 0) > 0.7 ? '3d-scene' : 'gradient',
    complexity: Math.round(((w['minimalism'] ?? 0) > 0.7 ? 3 : 7) *
                 ((w['energy'] ?? 0) > 0.6 ? 1 : 0.6)),
  };

  // Camera: from motion + emotion primitives
  const camera: CameraGrammar = {
    movement: (w['speed'] ?? 0) > 0.7 ? 'dolly' :
              (w['heritage'] ?? 0) > 0.7 ? 'static' :
              (w['future'] ?? 0) > 0.6 ? 'orbit' : 'static',
    fov: (w['minimalism'] ?? 0) > 0.7 ? 50 : 65,
    depthOfField: (w['precision'] ?? 0) > 0.6 || (w['craftsmanship'] ?? 0) > 0.6,
    speed: (w['speed'] ?? 0) * 0.8 + (w['energy'] ?? 0) * 0.2,
    angle: (w['confidence'] ?? 0) > 0.7 ? 'eye-level' :
           (w['desire'] ?? 0) > 0.7 ? 'low' : 'eye-level',
  };

  // Motion: from motion + emotion primitives
  const motion: MotionGrammar = {
    primaryType: (w['movement'] ?? 0) > 0.7 ? 'scroll-driven' :
                 (w['craftsmanship'] ?? 0) > 0.7 ? 'time-based' : 'scroll-driven',
    easing: [(w['calm'] ?? 0) > 0.6 ? 'ease-out' : 'ease-in-out'],
    durationRange: (w['speed'] ?? 0) > 0.7 ? [200, 600] : [400, 1200],
    stagger: (w['energy'] ?? 0) > 0.7 ? 'cascade' :
             (w['minimalism'] ?? 0) > 0.7 ? 'none' : 'sequential',
    intensity: Math.min(1,
      (w['energy'] ?? 0) * 0.4 +
      (w['movement'] ?? 0) * 0.3 +
      (w['speed'] ?? 0) * 0.3
    ),
    principles: Object.entries(w)
      .filter(([, v]) => v > 0.5)
      .map(([k]) => k)
      .slice(0, 5),
  };

  // Interaction
  const interaction: InteractionGrammar = {
    inputs: ['scroll', 'click', 'hover'],
    feedback: ['visual'],
    density: (w['energy'] ?? 0) > 0.7 ? 4 : 2,
    microComplexity: (w['precision'] ?? 0) > 0.7 ? 8 : 5,
  };

  // Audio
  const audio: AudioGrammar = {
    layers: [
      { type: 'ambient', intensity: 0.3, trigger: 'always' },
      ...((w['cinematic'] ?? 0) > 0.6 ? [{ type: 'music' as const, intensity: 0.5, trigger: 'scroll' as const }] : []),
    ],
    spatialized: (w['future'] ?? 0) > 0.7,
    ducking: true,
  };

  // Lighting
  const lighting: LightingGrammar = {
    source: (w['dark'] ?? 0) > 0.7 ? 'neon' :
            (w['warm-palette'] ?? 0) > 0.7 ? 'natural' : 'ambient',
    temperature: (w['warm-palette'] ?? 0) > 0.7 ? 3200 : 6500,
    direction: 'top',
    shadows: (w['minimalism'] ?? 0) > 0.7 ? 'soft' : 'hard',
    transitions: true,
  };

  // Particles
  const particles: ParticleGrammar = {
    type: (w['neon'] ?? 0) > 0.6 ? 'sparkle' :
           (w['energy'] ?? 0) > 0.6 ? 'data-stream' : 'none',
    count: (w['neon'] ?? 0) > 0.6 ? 200 : 0,
    behavior: 'drift',
    interactive: (w['innovation'] ?? 0) > 0.6,
  };

  // Physics
  const physics: PhysicsGrammar = {
    simulation: (w['energy'] ?? 0) > 0.7 ? 'spring' :
                (w['craftsmanship'] ?? 0) > 0.7 ? 'rigid-body' : 'none',
    gravity: 0.8,
    friction: 0.5,
    bounciness: 0.3,
  };

  // Timing
  const timing: TimingGrammar = {
    bpm: (w['speed'] ?? 0) > 0.7 ? 120 :
         (w['calm'] ?? 0) > 0.7 ? 60 : 80,
    rhythm: (w['energy'] ?? 0) > 0.7 ? 'syncopated' :
            (w['calm'] ?? 0) > 0.7 ? 'steady' : 'organic',
    pausePoints: input.emotionalArc
      .map((_, i) => i)
      .filter(i => input.emotionalArc[i] === 'calm' || input.emotionalArc[i] === 'trust'),
    ctaTiming: input.emotionalArc.length > 5 ? 'late' : 'middle',
  };

  // Conversion
  const conversion: ConversionGrammar = {
    ctaTypes: (['primary'] as Array<'primary' | 'secondary' | 'urgency' | 'social-proof' | 'trust'>)
      .concat((w['urgency'] ?? 0) > 0.5 ? (['urgency', 'social-proof'] as Array<'primary' | 'secondary' | 'urgency' | 'social-proof' | 'trust'>) : []),
    trustSignals: ['testimonials', 'reviews', 'stats'],
    funnelMapping: input.emotionalArc.map((emotion) => {
      if (emotion === 'curiosity' || emotion === 'interest') return 'awareness';
      if (emotion === 'desire' || emotion === 'excitement') return 'consideration';
      if (emotion === 'action' || emotion === 'purchase') return 'purchase';
      return 'interest';
    }),
    pressure: (w['urgency'] ?? 0) * 0.6 + (w['energy'] ?? 0) * 0.4,
  };

  return { scene, camera, motion, interaction, audio, lighting, particles, physics, timing, conversion };
}
