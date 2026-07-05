import type { ProviderRegistry } from './providers/registry.js';
import type { SandboxProvider } from './providers/interface.js';
import type { EventEmitter } from './events/emitter.js';
import type { RuntimeSpec, RuntimeInstance, StopOptions, HealthStatus } from './types.js';
import { StateMachine } from './state-machine.js';
import { createEventId } from './events/types.js';

export interface RuntimeSession {
  id: string;
  workspaceId: string;
  state: StateMachine;
  provider: SandboxProvider;
  instance: RuntimeInstance;
  createdAt: number;
  lastActivityAt: number;
}

export class RuntimeManager {
  private sessions = new Map<string, RuntimeSession>();
  private emitter: EventEmitter;
  private providerRegistry: ProviderRegistry;

  constructor(emitter: EventEmitter, providerRegistry: ProviderRegistry) {
    this.emitter = emitter;
    this.providerRegistry = providerRegistry;
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }

  async createRuntime(
    workspaceId: string,
    spec: RuntimeSpec,
    providerName?: string
  ): Promise<RuntimeSession> {
    const provider = providerName
      ? this.providerRegistry.get(providerName)
      : this.providerRegistry.getDefault();

    const state = new StateMachine(spec.id, workspaceId, this.emitter);

    state.send('create_requested');
    const instance = await provider.create(spec);
    state.send('created');

    const session: RuntimeSession = {
      id: spec.id,
      workspaceId,
      state,
      provider,
      instance,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    this.sessions.set(spec.id, session);

    this.emitter.emit({
      type: 'runtime.created',
      runtimeId: spec.id,
      workspaceId,
      data: { spec, provider: provider.name },
      severity: 'info',
    });

    return session;
  }

  async startRuntime(runtimeId: string): Promise<RuntimeInstance> {
    const session = this.getSession(runtimeId);
    session.state.send('start_requested');

    try {
      const instance = await session.provider.start(runtimeId);
      session.instance = instance;
      session.state.send('started');
      session.lastActivityAt = Date.now();

      this.emitter.emit({
        type: 'runtime.started',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { url: instance.url, allocatedPort: instance.allocatedPort },
        severity: 'info',
      });

      return instance;
    } catch (err) {
      session.state.sendWithError('start_failed', err instanceof Error ? err : new Error(String(err)));

      this.emitter.emit({
        type: 'runtime.failed',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { error: err instanceof Error ? err.message : String(err), phase: 'start' },
        severity: 'error',
      });

      throw err;
    }
  }

  async stopRuntime(runtimeId: string, options?: StopOptions): Promise<void> {
    const session = this.getSession(runtimeId);
    session.state.send('stop_requested');

    try {
      await session.provider.stop(runtimeId, options);
      session.state.send('stopped');
      session.lastActivityAt = Date.now();

      this.emitter.emit({
        type: 'runtime.stopped',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { stoppedAt: Date.now() },
        severity: 'info',
      });
    } catch (err) {
      session.state.sendWithError('stop_failed', err instanceof Error ? err : new Error(String(err)));

      this.emitter.emit({
        type: 'runtime.failed',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { error: err instanceof Error ? err.message : String(err), phase: 'stop' },
        severity: 'error',
      });
    }
  }

  async destroyRuntime(runtimeId: string): Promise<void> {
    const session = this.getSession(runtimeId);
    const canDestroy = session.state.can('destroy_requested');

    if (!canDestroy && session.state.state !== 'destroyed') {
      await this.stopRuntime(runtimeId);
    }

    if (session.state.can('destroy_requested')) {
      session.state.send('destroy_requested');
    }

    try {
      const provider = session.provider;
      await provider.destroy(runtimeId);
    } catch (err) {
      this.emitter.emit({
        type: 'runtime.failed',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { error: err instanceof Error ? err.message : String(err), phase: 'destroy' },
        severity: 'error',
      });
    }

    this.sessions.delete(runtimeId);

    this.emitter.emit({
      type: 'runtime.destroyed',
      runtimeId,
      workspaceId: session.workspaceId,
      data: { destroyedAt: Date.now() },
      severity: 'info',
    });
  }

  async executeCommand(runtimeId: string, command: import('./types.js').CommandSpec) {
    const session = this.getSession(runtimeId);
    session.lastActivityAt = Date.now();

    this.emitter.emit({
      type: 'runtime.command_start',
      runtimeId,
      workspaceId: session.workspaceId,
      data: { command: command.command },
      severity: 'info',
    });

    try {
      const result = await session.provider.execute(runtimeId, command);

      this.emitter.emit({
        type: 'runtime.command_complete',
        runtimeId,
        workspaceId: session.workspaceId,
        data: {
          exitCode: result.exitCode,
          duration: result.duration,
          truncated: result.truncated,
        },
        severity: result.exitCode === 0 ? 'info' : 'warning',
      });

      return result;
    } catch (err) {
      this.emitter.emit({
        type: 'runtime.command_failed',
        runtimeId,
        workspaceId: session.workspaceId,
        data: { error: err instanceof Error ? err.message : String(err) },
        severity: 'error',
      });
      throw err;
    }
  }

  async checkHealth(runtimeId: string): Promise<HealthStatus> {
    const session = this.getSession(runtimeId);
    const health = await session.provider.health(runtimeId);

    if (health.status === 'unhealthy') {
      if (session.state.can('health_dead')) {
        session.state.send('health_dead');
      }
    } else if (health.status === 'healthy' && session.state.state === 'degraded') {
      if (session.state.can('health_restored')) {
        session.state.send('health_restored');
      }
    }

    return health;
  }

  getSession(runtimeId: string): RuntimeSession {
    const session = this.sessions.get(runtimeId);
    if (!session) {
      throw new Error(`Runtime session '${runtimeId}' not found`);
    }
    return session;
  }

  listSessions(workspaceId?: string): RuntimeSession[] {
    const sessions = Array.from(this.sessions.values());
    if (workspaceId) {
      return sessions.filter((s) => s.workspaceId === workspaceId);
    }
    return sessions;
  }

  getStatus(): { active: number; total: number; byStatus: Record<string, number> } {
    const byStatus: Record<string, number> = {};
    let active = 0;

    for (const session of this.sessions.values()) {
      const s = session.state.state;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
      if (s === 'running' || s === 'ready' || s === 'installing' || s === 'building') {
        active++;
      }
    }

    return {
      active,
      total: this.sessions.size,
      byStatus,
    };
  }
}
