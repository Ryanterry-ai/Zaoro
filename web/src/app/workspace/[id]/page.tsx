"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useBuildEvents } from "@/lib/use-build-events";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { usePlanInspect } from "@/lib/use-plan-inspect";
import { ArchitectureGraph, buildArchGraph } from "@/components/ArchitectureGraph";
import { useBuildReport } from "@/lib/use-build-report";

interface ProgressStep {
  step: string;
  type?: string;
  message: string;
  ts: number;
  duration?: number;
  data?: Record<string, unknown> | null;
  metadata?: {
    llm?: {
      model?: string;
      provider?: string;
      tokensIn?: number;
      tokensOut?: number;
      duration?: number;
      retryCount?: number;
      fallbackUsed?: boolean;
      cacheHit?: boolean;
      attempt?: number;
      maxAttempts?: number;
      httpStatus?: number;
    };
    filePath?: string;
    action?: string;
    patchCount?: number;
    duration?: number;
    url?: string;
    [key: string]: unknown;
  } | null;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface ClonePhase {
  step?: string;
  phase?: string;
  phaseStatus?: string;
  message: string;
  ts: number;
  data?: Record<string, unknown> | null;
}

const BUILD_PIPELINE = [
  { id: "bi", label: "BI" },
  { id: "research", label: "Research" },
  { id: "design-dna", label: "Design DNA" },
  { id: "architect", label: "Architect" },
  { id: "design", label: "Design" },
  { id: "components", label: "Components" },
  { id: "assets", label: "Assets" },
  { id: "motion", label: "Motion" },
  { id: "synthesize", label: "Synthesize" },
  { id: "ux-eval", label: "UX" },
  { id: "biz-eval", label: "Biz" },
  { id: "assembly", label: "Assembly" },
  { id: "correction", label: "Fix" },
  { id: "compile", label: "Compile" },
  { id: "browser-verify", label: "Verify" },
  { id: "repair", label: "Repair" },
  { id: "preview", label: "Preview" },
  { id: "complete", label: "Done" },
  { id: "error", label: "Error" },
];

type DeviceFrame = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceFrame, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

type EngineStatus = "checking" | "online" | "offline";

const MAX_BUILD_RETRIES = 5;
const RETRY_BASE_MS = 2000;

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [phases, setPhases] = useState<ClonePhase[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [rightTab, setRightTab] = useState<"preview" | "files" | "provenance" | "architecture" | "report" | "inspector">("preview");
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildDone, setBuildDone] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [workspaceType, setWorkspaceType] = useState<"build" | "clone">("build");
  const [followUp, setFollowUp] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>("desktop");
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const buildTriggered = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEngine = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/workspace/${id}/meta`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setEngineStatus("online");
        return true;
      }
      setEngineStatus("offline");
      return false;
    } catch {
      setEngineStatus("offline");
      return false;
    }
  }, [id]);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {}
  }, [id]);

  const loadPreview = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}/preview`);
      if (res.ok) {
        const html = await res.text();
        setPreviewHtml(html);
        setPreviewKey((k) => k + 1);
      }
    } catch {}
  }, [id]);

  const pollProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}/progress`);
      if (!res.ok) return;
      const data = await res.json();
      const newSteps = data.steps || [];
      const newPhases = data.phases || [];
      setSteps(newSteps);
      setPhases(newPhases);

      const allEvents = workspaceType === "clone" ? newPhases : newSteps;
      const lastEvent = allEvents[allEvents.length - 1];
      const lastStep = lastEvent?.step || lastEvent?.phase || lastEvent?.phaseStatus || "";

      if (lastStep === "done" || lastEvent?.phaseStatus === "done" && lastEvent?.phase === "complete") {
        setIsBuilding(false);
        setBuildDone(true);
        setBuildError(null);
        loadFiles();
        loadPreview();
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      } else if (lastStep === "error" || lastEvent?.phaseStatus === "failed") {
        setIsBuilding(false);
        setBuildError(lastEvent?.message || "Build failed");
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch {}
  }, [id, loadFiles, loadPreview, workspaceType]);

  const loadFile = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(filePath);
      setRightTab("files");
    } catch {}
  }, [id]);

  const doBuild = useCallback(async (attempt = 0): Promise<void> => {
    try {
      const res = await fetch(`/api/workspace/${id}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setEngineStatus("online");
        setRetryCount(0);
        return;
      }
      if (res.status === 502 || res.status === 503) {
        if (attempt < MAX_BUILD_RETRIES) {
          const delay = RETRY_BASE_MS * Math.pow(1.5, attempt);
          setRetryCount(attempt + 1);
          setSteps((prev) => [
            ...prev,
            { step: "retry", message: `Engine unavailable, retrying in ${(delay / 1000).toFixed(0)}s... (attempt ${attempt + 1}/${MAX_BUILD_RETRIES})`, ts: Date.now() },
          ]);
          await new Promise((r) => { retryTimerRef.current = setTimeout(r, delay); });
          return doBuild(attempt + 1);
        }
        setEngineStatus("offline");
        setBuildError("Engine unreachable after retries. Make sure the engine is running.");
        setIsBuilding(false);
        return;
      }
    } catch {
      if (attempt < MAX_BUILD_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(1.5, attempt);
        setRetryCount(attempt + 1);
        setSteps((prev) => [
          ...prev,
          { step: "retry", message: `Connection failed, retrying in ${(delay / 1000).toFixed(0)}s... (attempt ${attempt + 1}/${MAX_BUILD_RETRIES})`, ts: Date.now() },
        ]);
        await new Promise((r) => { retryTimerRef.current = setTimeout(r, delay); });
        return doBuild(attempt + 1);
      }
      setEngineStatus("offline");
      setBuildError("Cannot reach engine. Make sure the engine is running and tunnel is active.");
      setIsBuilding(false);
    }
  }, [id]);

  const triggerBuild = useCallback(async () => {
    if (buildTriggered.current) return;
    buildTriggered.current = true;
    setBuildError(null);
    setSteps([{ step: "init", message: "Connecting to engine...", ts: Date.now() }]);
    const online = await checkEngine();
    if (!online) {
      await doBuild(0);
    } else {
      await doBuild(0);
    }
  }, [checkEngine, doBuild]);

  // SSE-based live events — feeds into existing state
  const buildEventsState = useBuildEvents(id, isBuilding);

  // Planning artifact inspector — feeds Architecture tab
  const planInspect = usePlanInspect(id, true);
  const buildReport = useBuildReport(id, buildEventsState.status === "complete");

  useEffect(() => {
    if (!buildEventsState.isLive || buildEventsState.events.length === 0) return;
    const existingIds = new Set(steps.map((s) => `${s.ts}-${s.step}`));
    const newSteps: ProgressStep[] = [];
    for (const ev of buildEventsState.events) {
      const key = `${ev.ts}-${ev.stage}`;
      if (!existingIds.has(key)) {
        newSteps.push({
          step: ev.stage,
          type: ev.status === "done" ? "completed" : ev.status === "failed" ? "error" : ev._source === "legacy" ? ev.stage : "info",
          message: ev.message,
          ts: ev.ts,
          data: ev.data || null,
        });
        existingIds.add(key);
      }
    }
    if (newSteps.length > 0) {
      setSteps((prev) => [...prev, ...newSteps]);
    }
    if (buildEventsState.status === "complete") {
      setIsBuilding(false);
      setBuildDone(true);
      setBuildError(null);
      loadFiles();
      loadPreview();
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    if (buildEventsState.status === "failed") {
      setIsBuilding(false);
      setBuildError(buildEventsState.error);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [buildEventsState.events, buildEventsState.status, buildEventsState.isLive, id, loadFiles, loadPreview, steps]);

  const handleFollowUp = async () => {
    if (!followUp.trim() || isBuilding) return;
    const msg = followUp.trim();
    setFollowUp("");
    setSteps((prev) => [...prev, { step: "user", message: msg, ts: Date.now() }]);
    buildTriggered.current = false;
    setIsBuilding(true);
    setBuildDone(false);
    setBuildError(null);
    setPreviewHtml(null);
    await triggerBuild();
  };

  const handleRetry = async () => {
    buildTriggered.current = false;
    setIsBuilding(true);
    setBuildDone(false);
    setBuildError(null);
    setPreviewHtml(null);
    setSteps([]);
    setPhases([]);
    await triggerBuild();
  };

  const openPreviewInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const metaRes = await fetch(`/api/workspace/${id}/meta`);
      const meta = await metaRes.json();
      if (cancelled) return;
      const type = meta.type === "clone" ? "clone" : "build";
      setWorkspaceType(type);
      if (type === "clone") {
        setIsBuilding(true);
        return;
      }
      await triggerBuild();
    }
    init();
    return () => { cancelled = true; };
  }, [id, triggerBuild]);

  useEffect(() => {
    if (!isBuilding) return;
    pollRef.current = setInterval(pollProgress, workspaceType === "clone" ? 500 : 1000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [isBuilding, pollProgress, workspaceType]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, phases]);

  const sourceFiles = files.filter(
    (f) => !f.isDirectory && (f.path.endsWith(".tsx") || f.path.endsWith(".ts") || f.path.endsWith(".css") || f.path.endsWith(".json")) && !f.path.includes("node_modules") && !f.path.includes("package-lock"),
  );

  const iframeWidth = DEVICE_WIDTHS[deviceFrame];

  if (isFullscreen && previewHtml) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-[10px] font-bold text-white">b</div>
              <span className="font-semibold text-xs text-zinc-300">build.same</span>
            </a>
            <span className="text-zinc-600 text-xs">/</span>
            <span className="text-xs text-zinc-500 truncate max-w-[200px]">{id}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
              {(["desktop", "tablet", "mobile"] as DeviceFrame[]).map((d) => (
                <button key={d} onClick={() => setDeviceFrame(d)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${deviceFrame === d ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`} title={d}>
                  {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
                </button>
              ))}
            </div>
            <button onClick={openPreviewInNewTab} className="px-3 py-1.5 rounded-lg text-[11px] text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-all">Open in Tab</button>
            <button onClick={toggleFullscreen} className="px-3 py-1.5 rounded-lg text-[11px] text-white bg-accent hover:bg-accent-hover transition-all">Exit Fullscreen</button>
          </div>
        </div>
        <div className="flex-1 flex justify-center bg-zinc-950 overflow-auto">
          <iframe key={previewKey} srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" className="border-0 bg-white" style={{ width: iframeWidth, maxWidth: "100%", height: "100%", transition: "width 0.3s ease" }} title="Preview" />
        </div>
      </div>
    );
  }

  const lastBuildStep = steps[steps.length - 1];
  const lastBuildStepId = lastBuildStep?.step || "";
  const buildHasError = lastBuildStepId === "error" || !!buildError;
  const buildIsComplete = lastBuildStepId === "done" || buildDone;

  const allEvents = workspaceType === "clone" ? phases : steps;
  const eventCount = allEvents.length;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-white">b</div>
            <span className="font-semibold text-sm">build.same</span>
          </a>
          <span className="text-muted text-xs">/</span>
          <span className="text-xs text-muted truncate max-w-[300px]">{id}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className={`w-1.5 h-1.5 rounded-full ${engineStatus === "online" ? "bg-green-400" : engineStatus === "checking" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
            <span className={engineStatus === "online" ? "text-green-400" : engineStatus === "checking" ? "text-yellow-400" : "text-red-400"}>
              {engineStatus === "online" ? "Engine online" : engineStatus === "checking" ? "Connecting..." : "Engine offline"}
            </span>
          </div>
          {isBuilding && (
            <div className="flex items-center gap-2 text-xs text-accent">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {workspaceType === "clone" ? "Cloning..." : steps.length > 0 ? `${BUILD_PIPELINE.find((p) => p.id === steps[steps.length - 1]?.step)?.label || "Building"}...` : "Building..."}
            </div>
          )}
          {buildDone && !isBuilding && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              {workspaceType === "clone" ? "Clone complete" : "Build complete"}
            </div>
          )}
          {buildError && !isBuilding && (
            <button onClick={handleRetry} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              Retry
            </button>
          )}
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all">Share</button>
          <a href={`/api/workspace/${id}/download`} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download
          </a>
          <button className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-all">Deploy</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar: Live Activity ─── */}
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          {/* Live Activity — fills sidebar space */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Live Activity</span>
              <div className="flex items-center gap-2">
                {buildEventsState.isLive && (
                  <span className="flex items-center gap-1 text-[9px] text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                )}
                <span className="text-[10px] text-muted">{eventCount} events</span>
              </div>
            </div>
            {workspaceType === "build" && (
              <div className="px-3 pt-2 pb-1 border-b border-border/50">
                <PipelineTimeline
                  events={buildEventsState.events.map((e) => ({ stage: e.stage, status: e.status }))}
                  compact
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-3 py-2" ref={chatEndRef}>
              {workspaceType === "clone"
                ? [...phases].reverse().map((ev, i) => {
                    const ts = new Date(ev.ts).toLocaleTimeString();
                    const isFile = ev.message?.startsWith("Wrote:");
                    const isDone = ev.phaseStatus === "done";
                    const isFailed = ev.phaseStatus === "failed";
                    return (
                      <div key={i} className={`flex items-start gap-2 text-[11px] py-[3px] border-b border-border/30 last:border-0 ${isFile ? "bg-green-500/5" : ""}`}>
                        <span className="text-muted/40 font-mono flex-shrink-0 w-[52px] text-[10px]">{ts}</span>
                        <span className={`flex-shrink-0 mt-0.5 text-[8px] ${isDone ? "text-green-400" : isFailed ? "text-red-400" : isFile ? "text-green-400" : "text-accent/60"}`}>
                          {isDone ? "●" : isFailed ? "●" : isFile ? "📄" : "◉"}
                        </span>
                        <span className={`leading-relaxed flex-1 min-w-0 ${isFile ? "text-green-400/80" : isFailed ? "text-red-400/80" : "text-foreground/60"}`}>
                          {ev.message}
                        </span>
                      </div>
                    );
                  })
                : [...steps].reverse().map((ev, i) => {
                    const ts = new Date(ev.ts).toLocaleTimeString();
                    const type = (ev as any).type || ev.step;
                    const meta = (ev as any).metadata;
                    const llm = meta?.llm;

                    // Event type styling
                    const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
                      info:         { icon: "◉", color: "text-foreground/60", bg: "" },
                      success:      { icon: "✓", color: "text-green-400", bg: "bg-green-500/5" },
                      warning:      { icon: "⚠", color: "text-yellow-400", bg: "bg-yellow-500/5" },
                      error:        { icon: "●", color: "text-red-400", bg: "bg-red-500/5" },
                      started:      { icon: "▶", color: "text-blue-400", bg: "bg-blue-500/5" },
                      completed:    { icon: "●", color: "text-green-400", bg: "bg-green-500/5" },
                      skipped:      { icon: "○", color: "text-muted", bg: "" },
                      waiting:      { icon: "◎", color: "text-yellow-400/60", bg: "" },
                      retrying:     { icon: "↻", color: "text-yellow-400", bg: "bg-yellow-500/5" },
                      cached:       { icon: "⚡", color: "text-cyan-400", bg: "bg-cyan-500/5" },
                      generated:    { icon: "✦", color: "text-purple-400", bg: "bg-purple-500/5" },
                      validated:    { icon: "✓", color: "text-green-400", bg: "" },
                      downloaded:   { icon: "↓", color: "text-cyan-400", bg: "" },
                      compiling:    { icon: "⚙", color: "text-amber-400", bg: "bg-amber-500/5" },
                      testing:      { icon: "⚡", color: "text-blue-400", bg: "" },
                      verifying:    { icon: "✓", color: "text-green-400", bg: "" },
                      llm_request:  { icon: "→", color: "text-violet-400", bg: "bg-violet-500/5" },
                      llm_response: { icon: "←", color: "text-green-400", bg: "bg-green-500/5" },
                      llm_fallback: { icon: "↻", color: "text-amber-400", bg: "bg-amber-500/5" },
                      research:     { icon: "🔍", color: "text-cyan-400", bg: "bg-cyan-500/5" },
                      crawling:     { icon: "🌐", color: "text-cyan-400/80", bg: "" },
                      extracting:   { icon: "📋", color: "text-cyan-400/60", bg: "" },
                      file_written: { icon: "📄", color: "text-green-400", bg: "bg-green-500/5" },
                      patch_applied:{ icon: "🔧", color: "text-green-400", bg: "" },
                    };

                    // Legacy step fallbacks
                    const stepConfig: Record<string, { icon: string; color: string; bg: string }> = {
                      done:   { icon: "●", color: "text-green-400", bg: "bg-green-500/5" },
                      error:  { icon: "●", color: "text-red-400", bg: "bg-red-500/5" },
                      retry:  { icon: "↻", color: "text-yellow-400", bg: "bg-yellow-500/5" },
                      init:   { icon: "◎", color: "text-blue-400", bg: "bg-blue-500/5" },
                      user:   { icon: "→", color: "text-accent", bg: "" },
                    };

                    const cfg = typeConfig[type] || stepConfig[ev.step] || typeConfig.info;
                    const isLlmDetail = !!llm;

                    return (
                      <div key={i} className={`flex items-start gap-2 text-[11px] py-[3px] border-b border-border/30 last:border-0 ${cfg.bg}`}>
                        <span className="text-muted/40 font-mono flex-shrink-0 w-[52px] text-[10px]">{ts}</span>
                        <span className={`flex-shrink-0 mt-0.5 text-[8px] ${cfg.color}`}>{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`leading-relaxed ${cfg.color}`}>{ev.message}</span>
                          {isLlmDetail && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[9px] text-muted/60">
                              <span>Model: {llm.provider}/{llm.model}</span>
                              {llm.duration && <span>{llm.duration}ms</span>}
                              {llm.tokensIn && <span>In: {llm.tokensIn}</span>}
                              {llm.tokensOut && <span>Out: {llm.tokensOut}</span>}
                              {llm.attempt && llm.maxAttempts && <span>Attempt {llm.attempt}/{llm.maxAttempts}</span>}
                              {llm.httpStatus && <span className="text-red-400">HTTP {llm.httpStatus}</span>}
                              {llm.fallbackUsed && <span className="text-amber-400">Fallback</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

              {/* Empty state — always shows something useful */}
              {eventCount === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted gap-3 py-8">
                  {engineStatus === "checking" && (
                    <>
                      <svg className="animate-spin h-5 w-5 text-accent" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs">Connecting to engine...</span>
                    </>
                  )}
                  {engineStatus === "offline" && (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="text-xs text-red-400">Engine offline</span>
                      <span className="text-[10px] text-muted text-center max-w-[200px]">
                        Run <code className="bg-surface-hover px-1 py-0.5 rounded">npm run server</code> and start a tunnel
                      </span>
                      <button onClick={handleRetry} className="mt-1 px-3 py-1.5 rounded-lg text-[11px] text-accent border border-accent/30 hover:bg-accent/10 transition-all">
                        Retry connection
                      </button>
                    </>
                  )}
                  {engineStatus === "online" && (
                    <>
                      <div className="animate-pulse text-lg text-accent">●</div>
                      <span className="text-xs">Initializing {workspaceType === "clone" ? "clone" : "build"}...</span>
                    </>
                  )}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Follow-up input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                placeholder="Describe changes..."
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all placeholder:text-muted"
                disabled={isBuilding}
              />
              <button onClick={handleFollowUp} disabled={isBuilding || !followUp.trim()} className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-30 transition-all">→</button>
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Preview + Files ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-surface">
            <div className="flex">
              <button onClick={() => setRightTab("preview")} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "preview" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>Preview</button>
              <button onClick={() => { setRightTab("files"); loadFiles(); }} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "files" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
                Files
                {sourceFiles.length > 0 && <span className="ml-1.5 text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">{sourceFiles.length}</span>}
              </button>
              <button onClick={() => setRightTab("provenance")} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "provenance" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
                Provenance
              </button>
              <button onClick={() => setRightTab("architecture")} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "architecture" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
                Architecture
              </button>
              <button onClick={() => setRightTab("report")} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "report" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
                Report
                {buildReport.report && <span className="ml-1.5 text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">✓</span>}
              </button>
              <button onClick={() => setRightTab("inspector")} className={`px-4 py-2.5 text-xs font-medium transition-all ${rightTab === "inspector" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
                Inspector
                {planInspect.snapshot && <span className="ml-1.5 text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">IR</span>}
              </button>
            </div>
            {rightTab === "preview" && (
              <div className="flex items-center gap-1.5 pr-3">
                <div className="flex items-center bg-background rounded-lg p-0.5 border border-border">
                  {(["desktop", "tablet", "mobile"] as DeviceFrame[]).map((d) => (
                    <button key={d} onClick={() => setDeviceFrame(d)} className={`px-2 py-1 rounded-md text-[11px] transition-all ${deviceFrame === d ? "bg-surface-hover text-foreground" : "text-muted hover:text-foreground"}`} title={d}>
                      {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📲"}
                    </button>
                  ))}
                </div>
                <button onClick={openPreviewInNewTab} disabled={!previewHtml} className="px-2.5 py-1 rounded-lg text-[11px] text-muted border border-border hover:bg-surface-hover disabled:opacity-30 transition-all" title="Open preview in new tab">↗ Tab</button>
                <button onClick={toggleFullscreen} disabled={!previewHtml} className="px-2.5 py-1 rounded-lg text-[11px] text-muted border border-border hover:bg-surface-hover disabled:opacity-30 transition-all" title="Fullscreen preview">⛶ Full</button>
              </div>
            )}
          </div>

          {rightTab === "preview" ? (
            <div className="flex-1 bg-zinc-100 relative flex justify-center overflow-auto">
              {isBuilding && !previewHtml ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <svg className="animate-spin h-8 w-8 text-accent mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-zinc-500">{workspaceType === "clone" ? "Cloning website..." : "Building your app..."}</p>
                    {buildError && <p className="text-xs text-red-400">{buildError}</p>}
                  </div>
                </div>
              ) : previewHtml ? (
                <div className="relative bg-white shadow-lg border border-zinc-200 overflow-hidden" style={{ width: iframeWidth, maxWidth: "100%", height: "100%", borderRadius: deviceFrame === "desktop" ? 0 : 12, transition: "width 0.3s ease, border-radius 0.3s ease" }}>
                  {deviceFrame !== "desktop" && <div className="absolute inset-0 pointer-events-none border border-zinc-300 rounded-xl" />}
                  <iframe key={previewKey} srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" className="w-full h-full border-0" title="Preview" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mx-auto shadow-sm">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <p className="text-sm text-zinc-500">No preview available</p>
                    {buildError && <p className="text-xs text-red-400 max-w-xs">{buildError}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : rightTab === "files" ? (
            <div className="flex-1 overflow-y-auto bg-surface">
              <div className="p-2">
                {sourceFiles.length === 0 ? (
                  <div className="text-center text-muted text-sm py-12">No files generated yet</div>
                ) : (
                  <div className="space-y-0.5">
                    {sourceFiles.map((f) => (
                      <button key={f.path} onClick={() => loadFile(f.path)} className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all ${selectedFile === f.path ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-surface-hover"}`}>
                        <span className="text-muted">{f.path.endsWith(".tsx") ? "◇" : f.path.endsWith(".ts") ? "◆" : f.path.endsWith(".css") ? "◎" : "▪"}</span>
                        <span className="font-mono truncate">{f.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : rightTab === "provenance" ? (
            <div className="flex-1 overflow-y-auto bg-surface">
              <div className="p-4 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-muted font-medium">BOS Provenance Chain</div>
                {/* Extract BOS events from steps */}
                {(() => {
                  const bosEvents = steps.filter(s => s.step === "bos");
                  if (bosEvents.length === 0) {
                    return <div className="text-center text-muted text-xs py-8">No BOS data yet — build in progress</div>;
                  }
                  const rulesEvent = bosEvents.find(e => e.message.includes("Rules engine produced"));
                  const constraintEvent = bosEvents.find(e => e.message.includes("Constraints:"));
                  const profileEvent = bosEvents.find(e => e.message.includes("Selected profile:"));
                  const blueprintEvent = bosEvents.find(e => e.message.includes("Blueprint compiled"));
                  const decisionsMatch = rulesEvent?.message.match(/(\d+) decisions/);
                  const violationsMatch = constraintEvent?.message.match(/\((\d+) violations?\)/);
                  const profileMatch = profileEvent?.message.match(/Selected profile: (.+?) \((\d+\.?\d*)\), pattern: (.+)/);
                  const pagesMatch = blueprintEvent?.message.match(/(\d+) pages, (\d+) entities, (\d+) workflows/);
                  return (
                    <>
                      {/* Rules Engine */}
                      <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          Rules Engine
                        </div>
                        <div className="text-[11px] text-foreground/70">{decisionsMatch ? `${decisionsMatch[1]} decisions fired` : "Evaluating..."}</div>
                      </div>
                      {/* Constraint Solver */}
                      <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className={`w-2 h-2 rounded-full ${violationsMatch && violationsMatch[1] === "0" ? "bg-green-400" : "bg-red-400"}`} />
                          Constraint Solver
                        </div>
                        <div className="text-[11px] text-foreground/70">{constraintEvent?.message || "Solving..."}</div>
                      </div>
                      {/* Scorer */}
                      {profileMatch && (
                        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Design Profile Scorer
                          </div>
                          <div className="text-[11px] text-foreground/70">
                            <span className="font-medium text-foreground/90">{profileMatch[1]}</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">{profileMatch[2]}</span>
                          </div>
                          <div className="text-[10px] text-muted">Pattern: {profileMatch[3]}</div>
                        </div>
                      )}
                      {/* Blueprint */}
                      {pagesMatch && (
                        <div className="rounded-xl border border-border bg-background p-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            Compiled Blueprint
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-surface-hover p-2">
                              <div className="text-lg font-bold text-foreground">{pagesMatch[1]}</div>
                              <div className="text-[10px] text-muted">Pages</div>
                            </div>
                            <div className="rounded-lg bg-surface-hover p-2">
                              <div className="text-lg font-bold text-foreground">{pagesMatch[2]}</div>
                              <div className="text-[10px] text-muted">Entities</div>
                            </div>
                            <div className="rounded-lg bg-surface-hover p-2">
                              <div className="text-lg font-bold text-foreground">{pagesMatch[3]}</div>
                              <div className="text-[10px] text-muted">Workflows</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : rightTab === "architecture" ? (
            <div className="flex-1 overflow-y-auto bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-4">Architecture Graph</div>
              <div className="w-full h-[400px] rounded-xl border border-border bg-background p-4">
                <ArchitectureGraph
                  {...buildArchGraph(
                    planInspect.snapshot?.breContext,
                    planInspect.snapshot?.blueprint
                      ? {
                          pages: planInspect.snapshot.blueprint.pages,
                          entities: planInspect.snapshot.blueprint.entities,
                          apis: planInspect.snapshot.blueprint.apis,
                        }
                      : null,
                    planInspect.snapshot?.executionBlueprint,
                    planInspect.snapshot?.applicationSpec,
                    (planInspect.status === "connecting" ? "pending" : planInspect.status) as "pending" | "connected" | "failed",
                  )}
                  height={360}
                />
              </div>
            </div>
          ) : rightTab === "report" ? (
            <div className="flex-1 overflow-y-auto bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-4">Build Report</div>
              {buildReport.loading ? (
                <div className="text-center text-muted text-xs py-8">Loading...</div>
              ) : buildReport.error === "pending" ? (
                <div className="text-center text-muted text-xs py-8">No report yet — build to generate</div>
              ) : buildReport.error ? (
                <div className="text-center text-red-400 text-xs py-8">{buildReport.error}</div>
              ) : buildReport.report ? (
                <div className="space-y-4">
                  {/* Summary grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Duration", value: `${(buildReport.report.duration / 1000).toFixed(1)}s` },
                      { label: "Status", value: buildReport.report.success ? "Success" : "Failed" },
                      { label: "Industry", value: buildReport.report.blueprint.industry },
                      { label: "App", value: buildReport.report.blueprint.appName || "Untitled" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                        <div className="text-[10px] text-muted uppercase tracking-wider">{s.label}</div>
                        <div className="text-sm font-medium mt-1">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Blueprint stats */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Blueprint</div>
                    <div className="grid grid-cols-5 gap-3 text-center">
                      {[
                        { label: "Pages", value: buildReport.report.blueprint.pagesCount },
                        { label: "Models", value: buildReport.report.blueprint.dataModelsCount },
                        { label: "APIs", value: buildReport.report.blueprint.apisCount },
                        { label: "Entities", value: buildReport.report.blueprint.entitiesCount },
                        { label: "Workflows", value: buildReport.report.blueprint.workflowsCount },
                      ].map((s) => (
                        <div key={s.label} className="rounded-lg bg-surface-hover p-2">
                          <div className="text-lg font-bold text-foreground">{s.value}</div>
                          <div className="text-[10px] text-muted">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Files breakdown */}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Generated Files ({(buildReport.report.files?.total ?? 0)})</div>
                    {buildReport.report.files?.byType && Object.keys(buildReport.report.files.byType).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(buildReport.report.files.byType).map(([ext, count]) => (
                          <div key={ext} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[11px] font-mono">
                            {ext || "(no ext)"} <span className="font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted">No file data</div>
                    )}
                    {buildReport.report.files?.paths && buildReport.report.files.paths.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-[11px] text-muted cursor-pointer hover:text-foreground">Show all paths</summary>
                        <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
                          {buildReport.report.files.paths.map((p: string) => (
                            <div key={p} className="text-[10px] font-mono text-muted/80">{p}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Warnings */}
                  {buildReport.report.warnings && buildReport.report.warnings.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Warnings ({(buildReport.report.warnings as string[]).length})</div>
                      <div className="space-y-1">
                        {(buildReport.report.warnings as string[]).map((w: string, i: number) => (
                          <div key={i} className="text-[11px] text-amber-400/80 font-mono">⚠ {w}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : rightTab === "inspector" ? (
            <div className="flex-1 overflow-y-auto bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-4">IR Inspector</div>
              {!planInspect.snapshot ? (
                <div className="text-center text-muted text-xs py-8">
                  {planInspect.status === "connecting" ? "Connecting to build stream..." : "No IR data yet — build to generate"}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* BRE Context */}
                  {planInspect.snapshot.breContext && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Business Context</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-[10px] text-muted">Industry</div>
                          <div className="text-sm font-medium">{planInspect.snapshot.breContext.industry}</div>
                        </div>
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-[10px] text-muted">App Name</div>
                          <div className="text-sm font-medium">{planInspect.snapshot.breContext.appName || "—"}</div>
                        </div>
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-[10px] text-muted">Business Models</div>
                          <div className="text-sm font-medium">{planInspect.snapshot.breContext.businessModels.join(", ")}</div>
                        </div>
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-[10px] text-muted">Entities</div>
                          <div className="text-sm font-medium">{planInspect.snapshot.breContext.entities.join(", ")}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rules Decisions */}
                  {planInspect.snapshot.rules.length > 0 && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Rules Engine ({planInspect.snapshot.rules.length} decisions)</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {planInspect.snapshot.rules.map((r, i) => (
                          <div key={i} className="rounded-lg bg-surface-hover p-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-foreground">{r.ruleName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${r.confidence > 0.8 ? "bg-green-500/10 text-green-400" : r.confidence > 0.5 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>
                                {(r.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-muted mt-1 font-mono text-[10px]">{r.trace}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blueprint */}
                  {planInspect.snapshot.blueprint && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Blueprint</div>
                      <div className="grid grid-cols-5 gap-3 text-center">
                        {[
                          { label: "Pages", value: planInspect.snapshot.blueprint.pages },
                          { label: "Entities", value: planInspect.snapshot.blueprint.entities },
                          { label: "APIs", value: planInspect.snapshot.blueprint.apis },
                          { label: "DB Tables", value: planInspect.snapshot.blueprint.database?.tables ?? 0 },
                          { label: "Tokens", value: planInspect.snapshot.blueprint.hasDesignTokens ? "✓" : "—" },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg bg-surface-hover p-2">
                            <div className="text-lg font-bold text-foreground">{s.value}</div>
                            <div className="text-[10px] text-muted">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {planInspect.snapshot.blueprint.vocabulary && Object.keys(planInspect.snapshot.blueprint.vocabulary).length > 0 && (
                        <div className="mt-3">
                          <div className="text-[10px] text-muted mb-1">Vocabulary</div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(planInspect.snapshot.blueprint.vocabulary).map(([k, v]) => (
                              <span key={k} className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono">{k}: {v}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Execution Blueprint */}
                  {planInspect.snapshot.executionBlueprint && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Execution Blueprint ({planInspect.snapshot.executionBlueprint.pages.length} pages)</div>
                      <div className="space-y-1.5">
                        {planInspect.snapshot.executionBlueprint.pages.map((p, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-[11px]">
                            <span className="font-mono text-foreground">{p.path}</span>
                            <span className="text-muted">{p.slots} slots</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Application Spec */}
                  {planInspect.snapshot.applicationSpec && (
                    <div className="rounded-xl border border-border bg-background p-4">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">Application Spec</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-lg font-bold text-foreground">{planInspect.snapshot.applicationSpec.pages}</div>
                          <div className="text-[10px] text-muted">Pages</div>
                        </div>
                        <div className="rounded-lg bg-surface-hover p-2">
                          <div className="text-lg font-bold text-foreground">{planInspect.snapshot.applicationSpec.totalComponents}</div>
                          <div className="text-[10px] text-muted">Components</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw JSON toggle */}
                  <details className="rounded-xl border border-border bg-background">
                    <summary className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted font-medium cursor-pointer hover:text-foreground">Raw IR JSON</summary>
                    <pre className="px-4 pb-4 text-[10px] font-mono text-muted/80 overflow-x-auto max-h-96 overflow-y-auto">{JSON.stringify(planInspect.snapshot, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
