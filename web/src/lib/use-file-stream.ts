"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { engineUrl } from "./engine-url";

export interface GeneratedFile {
  path: string;
  type: string;
  ts: number;
}

export function useFileStream(
  workspaceId: string,
  enabled: boolean,
): {
  files: GeneratedFile[];
  total: number;
  status: "connecting" | "connected" | "failed";
} {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "failed">("connecting");
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
      setFiles([]);
      setStatus("connecting");
      return;
    }

    let cancelled = false;

    const connect = () => {
      const url = engineUrl(`/api/workspace/${workspaceId}/file-stream`);
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", () => {
        if (cancelled) return;
        setStatus("connected");
      });

      es.addEventListener("file", (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const file: GeneratedFile = JSON.parse(e.data);
          setFiles((prev) => {
            if (prev.some((f) => f.path === file.path && f.ts === file.ts)) return prev;
            return [...prev, file];
          });
        } catch {}
      });

      es.onerror = () => {
        if (cancelled) return;
        if (es.readyState === EventSource.CLOSED) {
          setStatus("failed");
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [workspaceId, enabled, cleanup]);

  return { files, total: files.length, status };
}
