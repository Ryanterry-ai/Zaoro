"use client";

import { useState, useEffect, useCallback } from "react";

export interface ReplayManifest {
  createdAt: string;
  stages: string[];
  totalStages: number;
  files: string[];
}

export function useBuildReplay(
  workspaceId: string,
  enabled: boolean,
): {
  manifest: ReplayManifest | null;
  loading: boolean;
  error: string | null;
  stageData: Record<string, unknown>;
  loadStage: (stage: string) => Promise<void>;
  currentStage: string | null;
} {
  const [manifest, setManifest] = useState<ReplayManifest | null>(null);
  const [stageData, setStageData] = useState<Record<string, unknown>>({});
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchManifest = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/replay`);
      if (!res.ok) {
        setManifest(null);
        return;
      }
      setManifest(await res.json());
    } catch {}
  }, [workspaceId, enabled]);

  useEffect(() => {
    fetchManifest();
  }, [fetchManifest]);

  const loadStage = useCallback(async (stage: string) => {
    setLoading(true);
    setError(null);
    setCurrentStage(stage);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/replay/${stage}`);
      if (!res.ok) {
        setError("Stage not available");
        return;
      }
      const data = await res.json();
      setStageData((prev: Record<string, unknown>) => ({ ...prev, [stage]: data }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  return { manifest, loading, error, stageData, loadStage, currentStage };
}
