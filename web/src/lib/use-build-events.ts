"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCountRef = useRef(0);

  const reset = useCallback(() => {
    lastCountRef.current = 0;
    setState({ events: [], status: "connecting", error: null, isLive: false });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    lastCountRef.current = 0;

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/progress`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const rawEvents: any[] = data.steps || data.phases || [];

        if (rawEvents.length > lastCountRef.current) {
          const newRaw = rawEvents.slice(lastCountRef.current);
          lastCountRef.current = rawEvents.length;

          const newEvents: BuildEvent[] = newRaw.map((e: any) => ({
            ts: e.ts,
            stage: e.step || e.phase || "unknown",
            status:
              e.step === "done" || e.phaseStatus === "done"
                ? ("done" as const)
                : e.step === "error" || e.phaseStatus === "failed"
                  ? ("failed" as const)
                  : ("active" as const),
            message: e.message,
            data: e.data ?? null,
            _source: "poll",
          }));

          setState((prev) => ({
            ...prev,
            isLive: true,
            status: prev.status === "connecting" ? "connected" : prev.status,
            events: [...prev.events, ...newEvents],
          }));
        }

        // Detect terminal states
        const lastStep = rawEvents[rawEvents.length - 1]?.step || "";
        const lastPhase = rawEvents[rawEvents.length - 1]?.phaseStatus || "";
        if (lastStep === "done" || lastPhase === "done") {
          setState((prev) => ({ ...prev, status: "complete" }));
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (lastStep === "error" || lastPhase === "failed") {
          const msg = rawEvents[rawEvents.length - 1]?.message || "Build failed";
          setState((prev) => ({ ...prev, status: "failed", error: msg }));
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // network hiccup — keep polling
      }
    };

    // Immediate first tick, then every 1.5s
    tick();
    pollRef.current = setInterval(tick, 1500);

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [workspaceId, enabled]);

  return { ...state, reset };
}