// ─── Candidate Knowledge Index ─────────────────────────────────────
// Re-exports for the Candidate Knowledge subsystem. This module is the
// Runtime Learning "Learning" surface: it records observations and never
// touches the Business Graph directly.

export * from './types.js';
export * from './store.js';
export * from './validation.js';
export * from './confidence.js';
export * from './promotion.js';
