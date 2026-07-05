import type { SandboxProvider } from './interface.js';

export class ProviderRegistry {
  private providers = new Map<string, SandboxProvider>();
  private defaultName: string | undefined;

  register(name: string, provider: SandboxProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }
    this.providers.set(name, provider);
    if (!this.defaultName) {
      this.defaultName = name;
    }
  }

  get(name: string): SandboxProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found. Available: ${this.list().join(', ')}`);
    }
    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  getDefault(): SandboxProvider {
    if (!this.defaultName) {
      throw new Error('No providers registered');
    }
    return this.get(this.defaultName);
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Cannot set default: provider '${name}' not registered`);
    }
    this.defaultName = name;
  }
}
