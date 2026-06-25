"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

interface ProgressStep {
  step: string;
  message: string;
  ts: number;
  data?: Record<string, unknown> | null;
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
  { id: "intent", label: "Intent" },
  { id: "enrich", label: "Enrich" },
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

const CLONE_PHASES = [
  { id: "analyze", label: "Analyze" },
  { id: "crawl", label: "Crawl" },
  { id: "assets", label: "Assets" },
  { id: "generate", label: "Generate" },
  { id: "self-contain", label: "Contain" },
  { id: "visual-diff", label: "Diff" },
  { id: "preview", label: "Preview" },
  { id: "complete", label: "Done" },
];

type DeviceFrame = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceFrame, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

type StageStatus = "pending" | "active" | "done" | "error";
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
  const [rightTab, setRightTab] = useState<"preview" | "files">("preview");
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

  const buildStageOrder = BUILD_PIPELINE.map((p) => p.id);
  const lastBuildStep = steps[steps.length - 1];
  const lastBuildStepId = lastBuildStep?.step || "";
  const buildHasError = lastBuildStepId === "error" || !!buildError;
  const buildIsComplete = lastBuildStepId === "done" || buildDone;
  const buildActiveIdx = buildIsComplete ? BUILD_PIPELINE.length - 1 : buildHasError ? buildStageOrder.indexOf(lastBuildStepId) : buildStageOrder.indexOf(lastBuildStepId);

  const getBuildStageStatus = (stageId: string, idx: number): StageStatus => {
    if (buildIsComplete) return "done";
    if (buildHasError && idx === buildActiveIdx) return "error";
    if (idx < buildActiveIdx) return "done";
    if (stageId === lastBuildStepId && !buildIsComplete && !buildHasError) return "active";
    return "pending";
  };

  const buildEventCounts: Record<string, number> = {};
  const buildStageEvents: Record<string, ProgressStep[]> = {};
  for (const ev of steps) {
    const stage = ev.step || "unknown";
    buildEventCounts[stage] = (buildEventCounts[stage] || 0) + 1;
    if (!buildStageEvents[stage]) buildStageEvents[stage] = [];
    buildStageEvents[stage].push(ev);
  }

  const getBuildStageProgress = (stageId: string): { current: number; total: number } | null => {
    const evts = buildStageEvents[stageId] || [];
    for (let i = evts.length - 1; i >= 0; i--) {
      const d = evts[i].data;
      if (d && typeof d.index === "number" && typeof d.total === "number") {
        return { current: d.index + 1, total: d.total };
      }
    }
    return null;
  };

  const lastClonePhase = phases.length > 0 ? (phases[phases.length - 1].phase || phases[phases.length - 1].step || "") : "";
  const lastCloneStatus = phases.length > 0 ? phases[phases.length - 1].phaseStatus : "";
  const cloneIsComplete = lastCloneStatus === "done" && lastClonePhase === "complete";
  const cloneIsFailed = lastCloneStatus === "failed";
  const clonePhaseOrder = CLONE_PHASES.map((p) => p.id);
  const cloneActiveIdx = cloneIsComplete ? CLONE_PHASES.length - 1 : cloneIsFailed ? clonePhaseOrder.indexOf(lastClonePhase) : clonePhaseOrder.indexOf(lastClonePhase);

  const getClonePhaseStatus = (phaseId: string, idx: number): StageStatus => {
    if (cloneIsComplete) return "done";
    if (cloneIsFailed && idx === cloneActiveIdx) return "error";
    if (idx < cloneActiveIdx) return "done";
    if (phaseId === lastClonePhase && !cloneIsComplete && !cloneIsFailed) return "active";
    return "pending";
  };

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
        {/* ─── Left Sidebar: Phase Chips + Live Activity ─── */}
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          {/* Phase progress chips — always visible when building */}
          {workspaceType === "build" && (
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1 flex-wrap">
                {BUILD_PIPELINE.filter((s) => s.id !== "error").map((stage, idx) => {
                  const status = getBuildStageStatus(stage.id, idx);
                  const progress = getBuildStageProgress(stage.id);
                  return (
                    <span key={stage.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${status === "done" ? "bg-green-500/10 text-green-400" : status === "active" ? "bg-accent/10 text-accent" : status === "error" ? "bg-red-500/10 text-red-400" : "text-muted/40"}`}>
                      {status === "done" ? "✓" : status === "active" ? <span className="animate-pulse">●</span> : status === "error" ? "✕" : "○"}
                      {stage.label}
                      {progress && status === "active" && (
                        <span className="font-mono text-[9px]">{progress.current}/{progress.total}</span>
                      )}
                    </span>
                  );
                })}
              </div>
              {(() => {
                const activeProgress = getBuildStageProgress(lastBuildStepId);
                if (!activeProgress || getBuildStageStatus(lastBuildStepId, buildActiveIdx) !== "active") return null;
                const pct = Math.round((activeProgress.current / activeProgress.total) * 100);
                return (
                  <div className="w-full h-1 bg-surface-hover rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                );
              })()}
            </div>
          )}

          {workspaceType === "clone" && (
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1 flex-wrap">
                {CLONE_PHASES.map((phase, idx) => {
                  const status = getClonePhaseStatus(phase.id, idx);
                  return (
                    <span key={phase.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${status === "done" ? "bg-green-500/10 text-green-400" : status === "active" ? "bg-accent/10 text-accent" : status === "error" ? "bg-red-500/10 text-red-400" : "text-muted/40"}`}>
                      {status === "done" ? "✓" : status === "active" ? <span className="animate-pulse">●</span> : status === "error" ? "✕" : "○"}
                      {phase.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Activity — fills remaining sidebar space */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Live Activity</span>
              <span className="text-[10px] text-muted">{eventCount} events</span>
            </div>
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
                    const isFile = ev.message?.startsWith("Wrote:");
                    const isDone = ev.step === "done";
                    const isFailed = ev.step === "error";
                    const isUser = ev.step === "user";
                    const isRetry = ev.step === "retry";
                    const isInit = ev.step === "init";
                    return (
                      <div key={i} className={`flex items-start gap-2 text-[11px] py-[3px] border-b border-border/30 last:border-0 ${isFile ? "bg-green-500/5" : ""}`}>
                        <span className="text-muted/40 font-mono flex-shrink-0 w-[52px] text-[10px]">{ts}</span>
                        <span className={`flex-shrink-0 mt-0.5 text-[8px] ${isDone ? "text-green-400" : isFailed ? "text-red-400" : isFile ? "text-green-400" : isUser ? "text-accent" : isRetry ? "text-yellow-400" : isInit ? "text-blue-400" : "text-accent/60"}`}>
                          {isDone ? "●" : isFailed ? "●" : isFile ? "📄" : isUser ? "→" : isRetry ? "↻" : isInit ? "◎" : "◉"}
                        </span>
                        <span className={`leading-relaxed flex-1 min-w-0 ${isFile ? "text-green-400/80" : isFailed ? "text-red-400/80" : isUser ? "text-accent font-medium" : isRetry ? "text-yellow-400/80" : isInit ? "text-blue-400/80" : "text-foreground/60"}`}>
                          {ev.message}
                        </span>
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
