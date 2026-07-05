export type RuntimeEventType =
  | 'runtime.created'
  | 'runtime.started'
  | 'runtime.stopped'
  | 'runtime.destroyed'
  | 'runtime.failed'
  | 'runtime.state_change'
  | 'runtime.heartbeat'
  | 'runtime.heartbeat_lost'
  | 'runtime.health_change'
  | 'runtime.resource_warning'
  | 'runtime.resource_violation'
  | 'runtime.timeout'
  | 'runtime.command_start'
  | 'runtime.command_complete'
  | 'runtime.command_failed'
  | 'runtime.command_output'
  | 'security.violation'
  | 'security.attempt_blocked'
  | 'security.capability_dropped'
  | 'security.network_blocked'
  | 'system.startup'
  | 'system.shutdown'
  | 'system.warm_pool_ready'
  | 'system.cache_hit'
  | 'system.cache_miss'
  | 'system.config_change';

export type RuntimeEventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  runtimeId: string;
  workspaceId: string;
  data: Record<string, unknown>;
  timestamp: string;
  severity: RuntimeEventSeverity;
}

export interface EventFilter {
  runtimeId?: string;
  workspaceId?: string;
  type?: string | RegExp;
  severity?: RuntimeEventSeverity;
  since?: string;
  until?: string;
  limit?: number;
}

export interface RuntimeStateEvent {
  type: 'runtime.state_change';
  runtimeId: string;
  from: string;
  to: string;
  reason: string | undefined;
  timestamp: number;
  metadata: Record<string, unknown> | undefined;
}

export function createEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
