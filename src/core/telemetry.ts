import * as Sentry from '@sentry/node';
import { PostHog } from 'posthog-node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load env from engine root .env (safe: dotenv does not overwrite existing vars)
import 'dotenv/config';

let sentryInitialized = false;
let posthogClient: PostHog | null = null;
let supabaseClient: SupabaseClient | null = null;

function getSentryDsn(): string | null {
  return process.env.SENTRY_DSN || null;
}

function getPostHogConfig(): { apiKey: string; host: string } | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!apiKey) return null;
  return { apiKey, host };
}

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

function ensureSentry(): void {
  if (sentryInitialized) return;
  const dsn = getSentryDsn();
  if (!dsn) {
    console.warn('[telemetry] SENTRY_DSN not set — Sentry disabled');
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    integrations: [],
  });
  sentryInitialized = true;
  console.log('[telemetry] Sentry initialized');
}

function ensurePostHog(): PostHog | null {
  if (posthogClient) return posthogClient;
  const config = getPostHogConfig();
  if (!config) {
    console.warn('[telemetry] POSTHOG_API_KEY not set — PostHog disabled');
    return null;
  }
  posthogClient = new PostHog(config.apiKey, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
  });
  console.log('[telemetry] PostHog initialized');
  return posthogClient;
}

function safePostHogCapture(event: { distinctId: string; event: string; properties?: Record<string, unknown> }): void {
  const ph = ensurePostHog();
  if (!ph) return;
  try {
    ph.capture(event);
  } catch (err: any) {
    console.warn(`[telemetry] PostHog capture failed: ${err.message}`);
  }
}

function ensureSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const config = getSupabaseConfig();
  if (!config) {
    console.warn('[telemetry] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — Supabase disabled');
    return null;
  }
  // Supabase realtime-js requires native WebSocket (Node 22+) or the "ws" package.
  // Since we only use Supabase for data inserts (not realtime), skip if WebSocket
  // is unavailable to avoid crashing on Node 20.
  try {
    supabaseClient = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });
    console.log('[telemetry] Supabase initialized');
    return supabaseClient;
  } catch (err: any) {
    console.warn(`[telemetry] Supabase init failed (WebSocket unavailable): ${err.message}`);
    supabaseClient = null;
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────

export interface BuildEvent {
  workspaceId: string;
  prompt: string;
  pagesTotal: number;
  pagesSucceeded: number;
  pagesFailed: number;
  duration: number;
  success: boolean;
}

export interface PageEvent {
  workspaceId: string;
  pagePath: string;
  succeeded: boolean;
  attemptCount: number;
  lastError?: string;
  duration: number;
}

export interface ErrorEvent {
  workspaceId: string;
  error: string;
  code: string;
  file?: string;
  line?: number;
  phase: string;
}

export const TelemetryLayer = {
  init(): void {
    ensureSentry();
    ensurePostHog();
    ensureSupabase();
  },

  reportBuildStart(workspaceId: string, prompt: string): void {
    safePostHogCapture({
      distinctId: workspaceId,
      event: 'build_started',
      properties: { prompt: prompt.slice(0, 200), workspaceId },
    });
  },

  reportBuildStep(workspaceId: string, step: string, detail?: Record<string, unknown>): void {
    safePostHogCapture({
      distinctId: workspaceId,
      event: 'build_step',
      properties: { step, workspaceId, ...detail },
    });
  },

  reportPageComplete(workspaceId: string, event: PageEvent): void {
    safePostHogCapture({
      distinctId: workspaceId,
      event: 'page_compiled',
      properties: {
        workspaceId,
        pagePath: event.pagePath,
        succeeded: event.succeeded,
        attemptCount: event.attemptCount,
        duration: event.duration,
        lastError: event.lastError,
      },
    });
  },

  reportBuildComplete(event: BuildEvent): void {
    safePostHogCapture({
      distinctId: event.workspaceId,
      event: 'build_completed',
      properties: {
        workspaceId: event.workspaceId,
        pagesTotal: event.pagesTotal,
        pagesSucceeded: event.pagesSucceeded,
        pagesFailed: event.pagesFailed,
        duration: event.duration,
        success: event.success,
      },
    });

    const sb = ensureSupabase();
    if (sb) {
      sb.from('build_runs').insert({
        workspace_id: event.workspaceId,
        pages_total: event.pagesTotal,
        pages_succeeded: event.pagesSucceeded,
        pages_failed: event.pagesFailed,
        duration_ms: event.duration,
        success: event.success,
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.warn('[telemetry] Supabase insert failed:', error.message);
        else console.log('[telemetry] Supabase: build run synced');
      });
    }
  },

  reportError(event: ErrorEvent): void {
    if (sentryInitialized) {
      Sentry.captureException(new Error(`[${event.code}] ${event.error}`), {
        tags: {
          workspaceId: event.workspaceId,
          code: event.code,
          phase: event.phase,
        },
        extra: {
          file: event.file,
          line: event.line,
        },
      });
    }

    safePostHogCapture({
      distinctId: event.workspaceId,
      event: 'build_error',
      properties: {
        workspaceId: event.workspaceId,
        error: event.error,
        code: event.code,
        file: event.file,
        line: event.line,
        phase: event.phase,
      },
    });
  },

  reportHealing(workspaceId: string, attempt: number, errorCount: number): void {
    safePostHogCapture({
      distinctId: workspaceId,
      event: 'auto_healing',
      properties: { workspaceId, attempt, errorCount },
    });
  },

  async shutdown(): Promise<void> {
    if (sentryInitialized) {
      await Sentry.flush(3000);
      await Sentry.close(1000);
      sentryInitialized = false;
    }
    if (posthogClient) {
      posthogClient.shutdown();
      posthogClient = null;
    }
    supabaseClient = null;
    console.log('[telemetry] All telemetry flushed');
  },
};
