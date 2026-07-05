import type { RuntimeStatus } from './types.js';
import type { RuntimeStateEvent } from './events/types.js';
import type { EventEmitter } from './events/emitter.js';
import { createEventId } from './events/types.js';

export interface StateTransition {
  from: RuntimeStatus;
  event: string;
  to: RuntimeStatus;
}

const TRANSITIONS: StateTransition[] = [
  { from: 'pending', event: 'create_requested', to: 'creating' },
  { from: 'creating', event: 'created', to: 'created' },
  { from: 'creating', event: 'create_failed', to: 'failed' },
  { from: 'created', event: 'start_requested', to: 'starting' },
  { from: 'starting', event: 'started', to: 'running' },
  { from: 'starting', event: 'start_failed', to: 'failed' },
  { from: 'running', event: 'install_started', to: 'installing' },
  { from: 'installing', event: 'install_complete', to: 'running' },
  { from: 'installing', event: 'install_failed', to: 'running' },
  { from: 'running', event: 'build_started', to: 'building' },
  { from: 'building', event: 'build_complete', to: 'ready' },
  { from: 'building', event: 'build_failed', to: 'running' },
  { from: 'running', event: 'health_degraded', to: 'degraded' },
  { from: 'degraded', event: 'health_restored', to: 'running' },
  { from: 'degraded', event: 'health_dead', to: 'stopping' },
  { from: 'running', event: 'stop_requested', to: 'stopping' },
  { from: 'ready', event: 'stop_requested', to: 'stopping' },
  { from: 'installing', event: 'stop_requested', to: 'stopping' },
  { from: 'building', event: 'stop_requested', to: 'stopping' },
  { from: 'degraded', event: 'stop_requested', to: 'stopping' },
  { from: 'stopping', event: 'stopped', to: 'destroying' },
  { from: 'stopping', event: 'stop_failed', to: 'destroying' },
  { from: 'destroying', event: 'destroyed', to: 'destroyed' },
  { from: 'failed', event: 'destroy_requested', to: 'destroying' },
  { from: 'created', event: 'destroy_requested', to: 'destroying' },
  { from: 'destroyed', event: 'error', to: 'failed' },
];

export class StateMachine {
  private runtimeId: string;
  private workspaceId: string;
  private currentState: RuntimeStatus;
  private emitter: EventEmitter;
  private transitions: Map<string, StateTransition>;

  constructor(runtimeId: string, workspaceId: string, emitter: EventEmitter) {
    this.runtimeId = runtimeId;
    this.workspaceId = workspaceId;
    this.currentState = 'pending';
    this.emitter = emitter;
    this.transitions = new Map();

    for (const t of TRANSITIONS) {
      this.transitions.set(`${t.from}::${t.event}`, t);
    }
  }

  get state(): RuntimeStatus {
    return this.currentState;
  }

  can(event: string): boolean {
    return this.transitions.has(`${this.currentState}::${event}`);
  }

  send(event: string, reason?: string): RuntimeStatus {
    const key = `${this.currentState}::${event}`;
    const transition = this.transitions.get(key);
    if (!transition) {
      throw new Error(
        `Invalid transition: '${this.currentState}' cannot accept event '${event}'`
      );
    }

    const from = this.currentState;
    this.currentState = transition.to;

    const stateEvent: RuntimeStateEvent = {
      type: 'runtime.state_change',
      runtimeId: this.runtimeId,
      from,
      to: this.currentState,
      reason: reason ?? undefined,
      timestamp: Date.now(),
      metadata: undefined,
    };

    this.emitter.emit({
      type: 'runtime.state_change',
      runtimeId: this.runtimeId,
      workspaceId: this.workspaceId,
      data: stateEvent as unknown as Record<string, unknown>,
      severity: this.currentState === 'failed' ? 'error' : 'info',
    });

    return this.currentState;
  }

  sendWithError(event: string, error: Error): RuntimeStatus {
    return this.send(event, error.message);
  }

  reset(): void {
    this.currentState = 'pending';
  }
}
