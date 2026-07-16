import { describe, it, expect } from 'vitest';
import { getRuntimeMode, isPromoted, promoteToDefault, readPromotion } from '../src/engine/runtime-mode.js';

describe('runtime promotion (Step 3)', () => {
  it('canonical runtime is the default', () => {
    expect(getRuntimeMode()).toBe('v4');
    expect(isPromoted()).toBe(true);
  });

  it('records promotion to a durable marker', async () => {
    const rec = await promoteToDefault('test: 9-industry benchmark passed', 9);
    expect(rec.mode).toBe('v4');
    expect(rec.benchmarkIndustries).toBe(9);
    const read = await readPromotion();
    expect(read?.mode).toBe('v4');
  });
});
