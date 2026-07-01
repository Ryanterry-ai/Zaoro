"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface PlanSnapshot {
  ts: number;
  breContext: {
    industry: string;
    businessModels: string[];
    entities: string[];
    appName?: string;
  } | null;
  rules: Array<{
    ruleId: string;
    ruleName: string;
    action: Record<string, unknown>;
    confidence: number;
    trace: string;
  }>;
  blueprint: {
    pages: number;
    entities: number;
    apis: number;
    database: { engine: string; tables: number } | null;
    hasDesignTokens: boolean;
    vocabulary?: Record<string, string>;
  } | null;
  executionBlueprint: {
    pages: Array<{
      path: string;
      slots: number;
    }>;
  } | null;
  applicationSpec: {
    pages: number;
    totalComponents: number;
  } | null;
}

export type InspectStatus = "pending" | "connecting" | "connected" | "failed";

export function usePlanInspect(
  workspaceId: string,
  enabled: boolean,
): {
  snapshot: PlanSnapshot | null;
  status: InspectStatus;
  error: string | null;
} {
  const [snapshot, setSnapshot] = useState<PlanSnapshot | null>(null);
  const [status, setStatus] = useState<InspectStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      setSnapshot(null);
      setStatus("pending");
      setError(null);
      return;
    }

    let cancelled = false;

    const connect = () => {
      const url = `/api/workspace/${workspaceId}/inspect`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", () => {
        if (cancelled) return;
        setStatus("connected");
        setError(null);
      });

      es.addEventListener("snapshot", (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(e.data);
          if (data.status === "pending") {
            setSnapshot(null);
            setStatus("pending");
          } else {
            setSnapshot(data);
            setStatus("connected");
          }
        } catch {
          // ignore parse errors
        }
      });

      es.onerror = () => {
        if (cancelled) return;
        if (es.readyState === EventSource.CLOSED) {
          setStatus("failed");
          setError("Connection lost");
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [workspaceId, enabled, cleanup]);

  return { snapshot, status, error };
}
