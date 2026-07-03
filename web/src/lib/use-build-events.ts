"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { engineUrl } from "./engine-url";

export interface BuildEvent {
  ts: number;
  stage: string;
  status: "active" | "done" | "failed" | "skipped";
  message: string;
  data?: Record<string, unknown> | null;
  _source?: string;
  _id?: string;
}

export interface BuildEventsState {
  events: BuildEvent[];
  status: "connecting" | "connected" | "complete" | "failed" | "stalled";
  error: string | null;
  isLive: boolean;
}

export function useBuildEvents(
  workspaceId: string,
  enabled: boolean,
): BuildEventsState & { reset: () => void } {
  const [state, setState] = useState<BuildEventsState>({
    events: [],
    status: "connecting",
    error: null,
    isLive: false,
  });
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setState({ events: [], status: "connecting", error: null, isLive: false });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connectSSE = () => {
      const url = engineUrl(`/api/workspace/${workspaceId}/events`);
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", () => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: "connected", isLive: true, error: null }));
      });

      es.addEventListener("progress", (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const ev: BuildEvent = JSON.parse(e.data);
          setState((prev) => {
            const exists = prev.events.some(
              (p) => p.ts === ev.ts && p.stage === ev.stage && p.message === ev.message,
            );
            if (exists) return prev;
            return { ...prev, events: [...prev.events, ev] };
          });
        } catch {}
      });

      es.addEventListener("complete", () => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, status: "complete" }));
        es.close();
      });

      es.addEventListener("error", (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          setState((prev) => ({
            ...prev,
            status: "failed",
            error: data.message || "Build failed",
          }));
        } catch {
          setState((prev) => ({ ...prev, status: "failed", error: "Build failed" }));
        }
        es.close();
      });

      es.onerror = () => {
        // EventSource auto-reconnects; if we never got connected, fall back to polling
        if (!cancelled && state.status === "connecting") {
          fallbackTimer.current = setTimeout(() => {
            if (!cancelled && esRef.current?.readyState !== EventSource.OPEN) {
              es.close();
              startPolling();
            }
          }, 4000);
        }
      };

      es.onopen = () => {
        if (fallbackTimer.current) {
          clearTimeout(fallbackTimer.current);
          fallbackTimer.current = null;
        }
      };
    };

    const startPolling = () => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, isLive: false, error: null }));
      let lastEvents: any[] = [];

      const tick = async () => {
        if (cancelled) return;
        try {
          const res = await fetch(engineUrl(`/api/workspace/${workspaceId}/progress`));
          if (!res.ok) return;
          const data = await res.json();
          const rawEvents = data.steps || data.phases || [];
          if (rawEvents.length > lastEvents.length) {
            const newEvents = rawEvents.slice(lastEvents.length).map((e: any) => ({
              ts: e.ts,
              stage: e.step || e.phase || e.phaseStatus || "unknown",
              status:
                e.phaseStatus === "done" || e.step === "done"
                  ? "done"
                  : e.phaseStatus === "failed" || e.step === "error"
                    ? "failed"
                    : "active",
              message: e.message,
              data: e.data,
            }));
            lastEvents = rawEvents;
            setState((prev) => ({
              ...prev,
              events: [...prev.events, ...newEvents],
              status: prev.status === "connecting" ? ("connected" as const) : prev.status,
            }));
          }

          if (data.status === "complete") {
            setState((prev) => ({ ...prev, status: "complete" }));
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } else if (data.status === "failed") {
            setState((prev) => ({
              ...prev,
              status: "failed",
              error: data.message || "Build failed",
            }));
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        } catch {}
      };

      pollRef.current = setInterval(tick, 1000);
      tick();
    };

    connectSSE();

    return () => {
      cancelled = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
    };
    // Only reconnect when workspaceId/enabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, enabled]);

  return { ...state, reset };
}
