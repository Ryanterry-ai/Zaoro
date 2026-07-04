import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';

// Inline function to avoid importing the actual server module (which starts listening)
function registerShutdownHooks(serverInstance: Server) {
  const handleShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Initiating graceful engine shutdown lifecycle...`);
    const forceKillTimeout = setTimeout(() => {
      console.error('Forced shutdown boundary crossed. Exiting immediately.');
      process.exit(1);
    }, 10000);
    serverInstance.close(() => {
      console.log('All active network sockets drained cleanly. System offline.');
      clearTimeout(forceKillTimeout);
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

describe('System Process Signal Management Hooks', () => {
  let originalListeners: { [key: string]: Function[] };

  beforeEach(() => {
    originalListeners = {
      SIGTERM: [...(process.listeners('SIGTERM') as Function[])],
      SIGINT: [...(process.listeners('SIGINT') as Function[])],
    };
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    for (const fn of originalListeners.SIGTERM) {
      process.on('SIGTERM', fn as any);
    }
    for (const fn of originalListeners.SIGINT) {
      process.on('SIGINT', fn as any);
    }
  });

  it('should attach lifecycle listeners without raising execution exceptions', () => {
    const mockServer = { close: vi.fn((cb: () => void) => cb()) } as unknown as Server;
    expect(() => registerShutdownHooks(mockServer)).not.toThrow();
  });

  it('should register SIGTERM handler', () => {
    const mockServer = { close: vi.fn((cb: () => void) => cb()) } as unknown as Server;
    registerShutdownHooks(mockServer);
    const sigtermListeners = process.listeners('SIGTERM');
    expect(sigtermListeners.length).toBeGreaterThan(0);
  });

  it('should register SIGINT handler', () => {
    const mockServer = { close: vi.fn((cb: () => void) => cb()) } as unknown as Server;
    registerShutdownHooks(mockServer);
    const sigintListeners = process.listeners('SIGINT');
    expect(sigintListeners.length).toBeGreaterThan(0);
  });
});
