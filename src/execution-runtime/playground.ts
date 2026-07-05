import { RuntimeManager, type RuntimeSession } from './runtime-manager.js';
import { ProviderRegistry } from './providers/registry.js';
import { LocalProcessProvider } from './providers/local-process-provider.js';
import { EventEmitter } from './events/emitter.js';
import type { RuntimeSpec, CommandResult } from './types.js';
import { createEventId } from './events/types.js';

export interface PlaygroundResult {
  session: RuntimeSession;
  commandResults: CommandResult[];
  duration: number;
  events: import('./events/types.js').RuntimeEvent[];
}

export interface PlaygroundStep {
  command: string[];
  label?: string;
  timeout?: number;
}

export class ExecutionPlayground {
  private manager: RuntimeManager;
  private emitter: EventEmitter;
  private providerRegistry: ProviderRegistry;

  constructor() {
    this.emitter = new EventEmitter();
    this.providerRegistry = new ProviderRegistry();
    this.providerRegistry.register('local-process', new LocalProcessProvider());
    this.manager = new RuntimeManager(this.emitter, this.providerRegistry);
  }

  getManager(): RuntimeManager {
    return this.manager;
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }

  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }

  async runSequence(
    workspaceId: string,
    spec: RuntimeSpec,
    steps: PlaygroundStep[]
  ): Promise<PlaygroundResult> {
    const startTime = Date.now();
    const commandResults: CommandResult[] = [];

    const session = await this.manager.createRuntime(workspaceId, spec);
    await this.manager.startRuntime(session.id);

    for (const step of steps) {
      const result = await this.manager.executeCommand(session.id, {
        command: step.command,
        timeout: step.timeout ?? 30000,
      });
      commandResults.push(result);
    }

    await this.manager.destroyRuntime(session.id);

    const duration = Date.now() - startTime;
    const events = this.emitter.getEvents({ runtimeId: session.id });

    return { session, commandResults, duration, events };
  }

  async runInSession(
    workspaceId: string,
    spec: RuntimeSpec,
    fn: (session: RuntimeSession, manager: RuntimeManager) => Promise<void>
  ): Promise<PlaygroundResult> {
    const startTime = Date.now();
    const commandResults: CommandResult[] = [];

    const session = await this.manager.createRuntime(workspaceId, spec);
    await this.manager.startRuntime(session.id);

    const originalExecute = this.manager.executeCommand.bind(this.manager);

    const wrappedExecute = async (runtimeId: string, command: import('./types.js').CommandSpec) => {
      const result = await originalExecute(runtimeId, command);
      commandResults.push(result);
      return result;
    };

    const wrappedManager = new Proxy(this.manager, {
      get(target, prop) {
        if (prop === 'executeCommand') return wrappedExecute;
        return Reflect.get(target, prop);
      },
    });

    try {
      await fn(session, wrappedManager as RuntimeManager);
    } finally {
      if (session.state.state !== 'destroyed') {
        try {
          await this.manager.destroyRuntime(session.id);
        } catch {
          // best effort cleanup
        }
      }
    }

    const duration = Date.now() - startTime;
    const events = this.emitter.getEvents({ runtimeId: session.id });

    return { session, commandResults, duration, events };
  }
}
