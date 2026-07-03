"use client";

import { useState, useEffect, useCallback } from "react";
import { engineUrl } from "./engine-url";

export interface BuildReport {
  ts: number;
  duration: number;
  success: boolean;
  workspaceId: string;
  blueprint: {
    appName: string;
    industry: string;
    businessModels: string[];
    pagesCount: number;
    dataModelsCount: number;
    apisCount: number;
    entitiesCount: number;
    workflowsCount: number;
  };
  files: {
    total: number;
    byType: Record<string, number>;
    paths: string[];
  };
  pages: Array<{ path: string; title: string }>;
  warnings: string[];
  error: string | null;
  generatedAt: string;
}

export function useBuildReport(
  workspaceId: string,
  enabled: boolean,
): {
  report: BuildReport | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [report, setReport] = useState<BuildReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(engineUrl(`/api/workspace/${workspaceId}/report`));
      if (res.status === 404) {
        setReport(null);
        setError("pending");
        return;
      }
      if (!res.ok) {
        setError("Failed to load report");
        return;
      }
      setReport(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, enabled]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
