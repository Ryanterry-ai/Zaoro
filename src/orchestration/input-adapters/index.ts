import type { InputAdapter } from './types.js';
import { WebsiteAdapter } from './website-adapter.js';
import { FigmaAdapter } from './figma-adapter.js';
import { PRDAdapter } from './prd-adapter.js';
import { CodebaseAdapter } from './codebase-adapter.js';
import { DatabaseAdapter } from './database-adapter.js';
import { ApiAdapter } from './api-adapter.js';

export type { InputAdapter, AdapterResult } from './types.js';

export { WebsiteAdapter } from './website-adapter.js';
export { FigmaAdapter } from './figma-adapter.js';
export { PRDAdapter } from './prd-adapter.js';
export { CodebaseAdapter } from './codebase-adapter.js';
export { DatabaseAdapter } from './database-adapter.js';
export { ApiAdapter } from './api-adapter.js';

const DEFAULT_ADAPTERS: InputAdapter[] = [
  new WebsiteAdapter(),
  new FigmaAdapter(),
  new PRDAdapter(),
  new CodebaseAdapter(),
  new DatabaseAdapter(),
  new ApiAdapter(),
];

export class AdapterRegistry {
  private adapters: InputAdapter[];

  constructor(adapters?: InputAdapter[]) {
    this.adapters = adapters ?? [...DEFAULT_ADAPTERS];
  }

  register(adapter: InputAdapter): void {
    this.adapters.push(adapter);
  }

  findAdapter(input: string): InputAdapter | undefined {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(input)) return adapter;
    }
    return undefined;
  }

  getAdapters(): readonly InputAdapter[] {
    return this.adapters;
  }
}

export function createAdapterRegistry(adapters?: InputAdapter[]): AdapterRegistry {
  return new AdapterRegistry(adapters);
}
