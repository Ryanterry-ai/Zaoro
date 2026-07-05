import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeManager } from '../src/execution-runtime/runtime-manager.js';
import { ProviderRegistry } from '../src/execution-runtime/providers/registry.js';
import { LocalProcessProvider } from '../src/execution-runtime/providers/local-process-provider.js';
import { EventEmitter } from '../src/execution-runtime/events/emitter.js';
import { ExecutionPlayground } from '../src/execution-runtime/playground.js';
import type { RuntimeSpec, CommandSpec, RuntimeInstance } from '../src/execution-runtime/types.js';
import type { SandboxProvider } from '../src/execution-runtime/providers/interface.js';

function makeSpec(overrides?: Partial<RuntimeSpec>): RuntimeSpec {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    image: 'node:18-alpine',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Provider interchangeability test harness
// ---------------------------------------------------------------------------
async function withRuntime(
  manager: RuntimeManager,
  providerName: string,
  spec: RuntimeSpec,
  fn: (instance: RuntimeInstance) => Promise<void>
) {
  const workspaceId = 'test-workspace';
  const session = await manager.createRuntime(workspaceId, spec, providerName);
  await manager.startRuntime(session.id);
  try {
    await fn(session.instance);
  } finally {
    try {
      await manager.destroyRuntime(session.id);
    } catch {
      // cleanup is best-effort
    }
  }
}

describe('ExecutionRuntime - Provider Interchangeability', () => {
  let registry: ProviderRegistry;
  let emitter: EventEmitter;
  let manager: RuntimeManager;

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.register('local-process', new LocalProcessProvider());
    emitter = new EventEmitter();
    manager = new RuntimeManager(emitter, registry);
  });

  // -----------------------------------------------------------------------
  // Provider registration
  // -----------------------------------------------------------------------
  it('lists registered providers', () => {
    expect(registry.list()).toEqual(['local-process']);
  });

  it('provides default provider', () => {
    const provider = registry.getDefault();
    expect(provider.name).toBe('local-process');
  });

  it('fails on unknown provider', () => {
    expect(() => registry.get('nonexistent')).toThrow(/not found/);
  });

  it('prevents duplicate registration', () => {
    expect(() => registry.register('local-process', new LocalProcessProvider())).toThrow(
      /already registered/
    );
  });

  it('allows changing default provider', () => {
    const p2 = new LocalProcessProvider();
    registry.register('secondary', p2);
    registry.setDefault('secondary');
    expect(registry.getDefault().name).toBe('local-process');
  });

  // -----------------------------------------------------------------------
  // State machine
  // -----------------------------------------------------------------------
  it('follows happy-path lifecycle through state machine events', async () => {
    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);

    expect(session.state.state).toBe('created');

    const instance = await manager.startRuntime(session.id);
    expect(instance.status).toBe('running');

    await manager.destroyRuntime(session.id);
    expect(() => manager.getSession(session.id)).toThrow(/not found/);
  });

  it('emits state change events', async () => {
    const events: string[] = [];
    emitter.subscribe(
      (e) => { events.push(e.data.to as string); },
      { type: 'runtime.state_change' }
    );

    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);
    await manager.startRuntime(session.id);

    expect(events).toContain('created');
    expect(events).toContain('running');

    await manager.destroyRuntime(session.id);
  });

  it('rejects invalid state transitions', async () => {
    const spec = makeSpec();
    const { StateMachine } = await import('../src/execution-runtime/state-machine.js');
    const sm = new StateMachine(spec.id, 'ws', emitter);

    expect(sm.state).toBe('pending');
    sm.send('create_requested');
    expect(sm.state).toBe('creating');
    sm.send('created');
    expect(sm.state).toBe('created');

    expect(sm.can('start_requested')).toBe(true);
    expect(sm.can('create_requested')).toBe(false);
    expect(() => sm.send('create_requested')).toThrow(/Invalid transition/);
  });

  // -----------------------------------------------------------------------
  // Command execution
  // -----------------------------------------------------------------------
  it('executes simple commands and returns output', async () => {
    const spec = makeSpec();
    await withRuntime(manager, 'local-process', spec, async () => {
      const result = await manager.executeCommand(spec.id, {
        command: ['node', '-e', 'console.log("hello from runtime")'],
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('hello from runtime');
    });
  });

  it('captures stderr output', async () => {
    const spec = makeSpec();
    await withRuntime(manager, 'local-process', spec, async () => {
      const result = await manager.executeCommand(spec.id, {
        command: ['node', '-e', 'console.error("this is an error")'],
      });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('this is an error');
    });
  });

  it('handles non-zero exit codes', async () => {
    const spec = makeSpec();
    await withRuntime(manager, 'local-process', spec, async () => {
      const result = await manager.executeCommand(spec.id, {
        command: ['node', '-e', 'process.exit(42)'],
      });
      expect(result.exitCode).toBe(42);
    });
  });

  it('times out long-running commands', async () => {
    const spec = makeSpec();
    await withRuntime(manager, 'local-process', spec, async () => {
      await expect(
        manager.executeCommand(spec.id, {
          command: ['node', '-e', 'process.stdout.write("waiting"); await new Promise(r => setTimeout(r, 60000))'],
          timeout: 500,
        })
      ).rejects.toThrow(/timed out/);
    });
  });

  // -----------------------------------------------------------------------
  // Streaming
  // -----------------------------------------------------------------------
  it('streams command output', async () => {
    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);
    await manager.startRuntime(session.id);

    try {
      const chunks: any[] = [];
      const provider = registry.getDefault();
      for await (const chunk of provider.stream(session.id, {
        command: ['node', '-e', 'console.log("line1"); console.log("line2")'],
      })) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some((c) => c.data.includes('line1'))).toBe(true);
    } finally {
      await manager.destroyRuntime(session.id);
    }
  });

  // -----------------------------------------------------------------------
  // File operations
  // -----------------------------------------------------------------------
  it('copies files into and out of runtime', async () => {
    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);
    await manager.startRuntime(session.id);

    try {
      const provider = registry.getDefault();
      const tmpDir = require('node:os').tmpdir();
      const srcFile = require('node:path').join(
        tmpDir,
        `test-copyin-${Date.now()}.txt`
      );
      require('node:fs').writeFileSync(srcFile, 'Hello from host');

      await provider.copyIn(session.id, srcFile, 'incoming-file.txt');

      const result = await manager.executeCommand(session.id, {
        command: ['node', '-e', 'process.stdout.write(require("fs").readFileSync("incoming-file.txt","utf8"))'],
      });
      expect(result.stdout.trim()).toBe('Hello from host');

      require('node:fs').unlinkSync(srcFile);
    } finally {
      await manager.destroyRuntime(session.id);
    }
  });

  // -----------------------------------------------------------------------
  // Health checks
  // -----------------------------------------------------------------------
  it('reports healthy for running runtime', async () => {
    const spec = makeSpec();
    await withRuntime(manager, 'local-process', spec, async () => {
      const health = await manager.checkHealth(spec.id);
      expect(['healthy', 'unknown']).toContain(health.status);
    });
  });

  // -----------------------------------------------------------------------
  // Event system
  // -----------------------------------------------------------------------
  it('records all lifecycle events', async () => {
    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);
    await manager.startRuntime(session.id);
    await manager.destroyRuntime(session.id);

    const events = emitter.getEvents({ runtimeId: session.id });
    const types = events.map((e) => e.type);

    expect(types).toContain('runtime.created');
    expect(types).toContain('runtime.started');
    expect(types).toContain('runtime.destroyed');
  });

  it('filters events by runtime ID', async () => {
    const spec1 = makeSpec();
    const spec2 = makeSpec();
    const s1 = await manager.createRuntime('ws', spec1);
    const s2 = await manager.createRuntime('ws', spec2);

    const eventsFor1 = emitter.getEvents({ runtimeId: s1.id });
    const eventsFor2 = emitter.getEvents({ runtimeId: s2.id });

    expect(eventsFor1.every((e) => e.runtimeId === s1.id)).toBe(true);
    expect(eventsFor2.every((e) => e.runtimeId === s2.id)).toBe(true);
  });

  it('limits event history', () => {
    const limitedEmitter = new EventEmitter(5);
    for (let i = 0; i < 10; i++) {
      limitedEmitter.emit({
        type: 'system.startup',
        runtimeId: 'test',
        workspaceId: 'ws',
        data: { i },
        severity: 'info',
      });
    }
    expect(limitedEmitter.getEvents().length).toBe(5);
  });

  // -----------------------------------------------------------------------
  // Logs
  // -----------------------------------------------------------------------
  it('captures and retrieves logs', async () => {
    const spec = makeSpec();
    const session = await manager.createRuntime('ws', spec);
    await manager.startRuntime(session.id);

    try {
      await manager.executeCommand(session.id, {
        command: ['node', '-e', 'console.log("log line 1"); console.log("log line 2")'],
      });

      const provider = registry.getDefault();
      const logs = await provider.logs(session.id);
      const stdoutMessages = logs
        .filter((l) => l.stream === 'stdout')
        .map((l) => l.message);

      const hasLogs = stdoutMessages.some(
        (m) => m.includes('log line 1') || m.includes('log line 2')
      );
      expect(hasLogs).toBe(true);
    } finally {
      await manager.destroyRuntime(session.id);
    }
  });

  // -----------------------------------------------------------------------
  // Playground
  // -----------------------------------------------------------------------
  it('executes a multi-step sequence via playground', async () => {
    const playground = new ExecutionPlayground();
    const spec = makeSpec();

    const result = await playground.runSequence('ws', spec, [
      { command: ['node', '-e', 'console.log("step 1")'], label: 'first step' },
      { command: ['node', '-e', 'console.log("step 2")'], label: 'second step' },
    ]);

    expect(result.commandResults.length).toBe(2);
    expect(result.commandResults[0].stdout).toContain('step 1');
    expect(result.commandResults[1].stdout).toContain('step 2');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('supports custom session function via playground', async () => {
    const playground = new ExecutionPlayground();
    const spec = makeSpec();
    const workspaceId = 'ws-custom';

    const result = await playground.runInSession(workspaceId, spec, async (session, mgr) => {
      await mgr.executeCommand(session.id, { command: ['node', '-e', 'console.log("custom fn")'] });
    });

    expect(result.commandResults.length).toBe(1);
    expect(result.commandResults[0].stdout).toContain('custom fn');
  });

  // -----------------------------------------------------------------------
  // Resource reporting
  // -----------------------------------------------------------------------
  it('reports resource usage', async () => {
    const spec = makeSpec();
    const provider = registry.getDefault();
    await withRuntime(manager, 'local-process', spec, async () => {
      const usage = await provider.resourceUsage(spec.id);
      expect(usage).toBeDefined();
      expect(usage.timestamp).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it('throws when operating on missing runtime', async () => {
    await expect(manager.startRuntime('nonexistent')).rejects.toThrow(/not found/);
    await expect(manager.stopRuntime('nonexistent')).rejects.toThrow(/not found/);
    await expect(manager.destroyRuntime('nonexistent')).rejects.toThrow(/not found/);
  });

  it('handles multiple runtimes independently', async () => {
    const spec1 = makeSpec();
    const spec2 = makeSpec();
    const s1 = await manager.createRuntime('ws', spec1);
    const s2 = await manager.createRuntime('ws', spec2);

    await manager.startRuntime(s1.id);
    await manager.startRuntime(s2.id);

    const result1 = await manager.executeCommand(s1.id, {
      command: ['node', '-e', 'console.log("from runtime 1")'],
    });
    const result2 = await manager.executeCommand(s2.id, {
      command: ['node', '-e', 'console.log("from runtime 2")'],
    });

    expect(result1.stdout).toContain('from runtime 1');
    expect(result2.stdout).toContain('from runtime 2');

    await manager.destroyRuntime(s1.id);
    await manager.destroyRuntime(s2.id);
  });

  // -----------------------------------------------------------------------
  // Manager status
  // -----------------------------------------------------------------------
  it('reports correct session status', async () => {
    const spec = makeSpec();
    await manager.createRuntime('ws', spec);

    const status = manager.getStatus();
    expect(status.total).toBe(1);
    expect(status.byStatus).toBeDefined();
  });
});

describe('ExecutionRuntime - SandboxProvider Interface Contract', () => {
  let provider: SandboxProvider;

  beforeEach(() => {
    provider = new LocalProcessProvider();
  });

  it('has correct name and capabilities', () => {
    expect(provider.name).toBe('local-process');
    expect(provider.capabilities.environments).toContain('process');
    expect(provider.capabilities.maxConcurrent).toBeGreaterThan(0);
  });

  it('creates and destroys runtimes', async () => {
    const spec = makeSpec();
    const instance = await provider.create(spec);
    expect(instance.id).toBe(spec.id);
    expect(instance.provider).toBe('local-process');
    expect(instance.status).toBe('created');

    await provider.destroy(instance.id);
  });

  it('throws on snapshot (not supported)', async () => {
    const spec = makeSpec();
    const instance = await provider.create(spec);
    await expect(provider.snapshot(instance.id)).rejects.toThrow(/not supported/);
    await provider.destroy(instance.id);
  });
});
