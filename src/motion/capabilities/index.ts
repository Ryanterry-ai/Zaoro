// ─── Motion Capabilities Barrel ─────────────────────────────────────────────

export type {
  MotionCapability,
  MotionCapabilityCategory,
  CapabilitySignals,
} from './types.js';

export { CAPABILITIES, CAPABILITY_BY_ID } from './presets.js';

export {
  CapabilityRegistry,
  capabilityRegistry,
  selectCapabilities,
  performanceTierFromBudget,
} from './registry.js';
export type { SelectionInput } from './registry.js';
