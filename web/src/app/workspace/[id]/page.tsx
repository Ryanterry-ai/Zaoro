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

interface AnalysisData {
  url: string;
  title: string;
  description: string;
  technologies: string[];
  pagesFound: Array<{ url: string; path: string; title: string; sections: number }>;
  navigation: Array<{ label: string; href: string }>;
  images: Array<{ src: string; alt: string; format: string; type: string }>;
  videos: Array<{ src: string; format: string; type: string }>;
  blockedPages: Array<{ url: string; reason: string }>;
  designTokens: {
    colors: string[];
    fonts: string[];
    fontSizes: string[];
    borderRadii: string[];
    gradients: string[];
  };
  links: { total: number; internal: number; external: number };
  forms: Array<{ action: string; method: string; fields: Array<{ name: string; type: string }> }>;
}

interface AssetsData {
  totalDiscovered: number;
  downloaded: number;
  failed: number;
  assets: Array<{ url: string; localPath: string; size: number; status: string }>;
  videosEmbedded: number;
}

interface GenerateData {
  pagesTotal: number;
  pagesDone: number;
  currentPage: string;
  pages: Array<{ path: string; componentName: string; status: string; patches: number }>;
}

interface LayoutData {
  components: string[];
  hasNav: boolean;
  hasFooter: boolean;
  patches: number;
}

interface ApplyData {
  totalPatches: number;
  appliedPatches: number;
  filesWritten: string[];
}

const BUILD_PIPELINE = [
  { id: "bi", label: "BI" },
  { id: "research", label: "Research" },
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
];

const CLONE_PHASES = [
  { id: "analyze", label: "Analyze" },
  { id: "crawl", label: "Crawl" },
  { id: "assets", label: "Assets" },
  { id: "generate", label: "Generate" },
  { id: "self-contain", label: "Self-Contain" },
  { id: "preview", label: "Preview" },
  { id: "complete", label: "Complete" },
];

type DeviceFrame = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceFrame, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

type StageStatus = "pending" | "active" | "done" | "error";

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
  const [workspaceType, setWorkspaceType] = useState<"build" | "clone">("build");
  const [followUp, setFollowUp] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>("desktop");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const buildTriggered = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (!res.ok) {
        console.warn(`[progress] HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setSteps(data.steps || []);
      setPhases(data.phases || []);

      const lastStep = data.steps?.[data.steps.length - 1];
      if (lastStep?.step === "done") {
        setIsBuilding(false);
        setBuildDone(true);
        loadFiles();
        loadPreview();
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } else if (lastStep?.step === "error") {
        setIsBuilding(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      console.error("[progress] Poll failed:", err);
    }
  }, [id, loadFiles, loadPreview]);

  const loadFile = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(filePath);
      setRightTab("files");
    } catch {}
  }, [id]);

  const triggerBuild = useCallback(async () => {
    if (buildTriggered.current) return;
    buildTriggered.current = true;
    try {
      await fetch(`/api/workspace/${id}/build`, { method: "POST" });
    } catch {}
  }, [id]);

  const handleFollowUp = async () => {
    if (!followUp.trim() || isBuilding) return;
    const msg = followUp.trim();
    setFollowUp("");
    setSteps((prev) => [
      ...prev,
      { step: "user", message: msg, ts: Date.now() },
    ]);
    buildTriggered.current = false;
    setIsBuilding(true);
    setBuildDone(false);
    setPreviewHtml(null);
    try {
      await fetch(`/api/workspace/${id}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUp: msg }),
      });
    } catch {}
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
    async function initWorkspace() {
      try {
        const metaRes = await fetch(`/api/workspace/${id}/meta`);
        const meta = await metaRes.json();
        if (cancelled) return;
        const type = meta.type === "clone" ? "clone" : "build";
        setWorkspaceType(type);
        if (type === "clone") {
          setIsBuilding(true);
          pollProgress();
          return;
        }
        await triggerBuild();
      } catch {
        if (!cancelled) await triggerBuild();
      }
    }
    initWorkspace();
    return () => {
      cancelled = true;
    };
  }, [id, pollProgress, triggerBuild]);

  useEffect(() => {
    if (!isBuilding) return;
    pollRef.current = setInterval(pollProgress, workspaceType === "clone" ? 500 : 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isBuilding, pollProgress, workspaceType]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps, phases]);

  const sourceFiles = files.filter(
    (f) =>
      !f.isDirectory &&
      (f.path.endsWith(".tsx") || f.path.endsWith(".ts") || f.path.endsWith(".css") || f.path.endsWith(".json")) &&
      !f.path.includes("node_modules") &&
      !f.path.includes("package-lock")
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
  const buildHasError = lastBuildStepId === "error";
  const buildIsComplete = lastBuildStepId === "done";
  const buildActiveIdx = buildIsComplete ? BUILD_PIPELINE.length - 1 : buildStageOrder.indexOf(lastBuildStepId);

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

  const lastCloneMsg = phases.length > 0 ? phases[phases.length - 1].message : "";
  const cloneIsComplete = lastCloneMsg.includes("Clone complete") || lastCloneMsg.includes("Clone finished");
  const cloneIsFailed = lastCloneMsg.includes("Clone failed");
  const lastClonePhase = phases.length > 0 ? (phases[phases.length - 1].phase || phases[phases.length - 1].step || "") : "";
  const clonePhaseOrder = CLONE_PHASES.map((p) => p.id);
  const cloneActiveIdx = cloneIsComplete ? CLONE_PHASES.length - 1 : cloneIsFailed ? clonePhaseOrder.indexOf(lastClonePhase) : clonePhaseOrder.indexOf(lastClonePhase);

  const getClonePhaseStatus = (phaseId: string, idx: number): StageStatus => {
    if (cloneIsComplete) return "done";
    if (cloneIsFailed && idx === cloneActiveIdx) return "error";
    if (idx < cloneActiveIdx) return "done";
    if (phaseId === lastClonePhase && !cloneIsComplete && !cloneIsFailed) return "active";
    return "pending";
  };

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
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all">Share</button>
          <a href={`/api/workspace/${id}/download`} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Download
          </a>
          <button className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-all">Deploy</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          {workspaceType === "build" && steps.length > 0 && (
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center gap-1 flex-wrap">
                {BUILD_PIPELINE.map((stage, idx) => {
                  const status = getBuildStageStatus(stage.id, idx);
                  const progress = getBuildStageProgress(stage.id);
                  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;
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

          {workspaceType === "clone" && phases.length > 0 && (
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

          {!isBuilding && workspaceType === "clone" && phases.length === 0 && (
            <div className="px-3 py-2 border-b border-border text-center text-muted text-xs">Initializing clone engine...</div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-3 py-2 flex items-center justify-between border-b border-border">
              <span className="text-[10px] uppercase tracking-wider text-muted font-medium">Live Activity</span>
              <span className="text-[10px] text-muted">{workspaceType === "clone" ? phases.length : steps.length} events</span>
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
                    return (
                      <div key={i} className={`flex items-start gap-2 text-[11px] py-[3px] border-b border-border/30 last:border-0 ${isFile ? "bg-green-500/5" : ""}`}>
                        <span className="text-muted/40 font-mono flex-shrink-0 w-[52px] text-[10px]">{ts}</span>
                        <span className={`flex-shrink-0 mt-0.5 text-[8px] ${isDone ? "text-green-400" : isFailed ? "text-red-400" : isFile ? "text-green-400" : isUser ? "text-accent" : "text-accent/60"}`}>
                          {isDone ? "●" : isFailed ? "●" : isFile ? "📄" : isUser ? "→" : "◉"}
                        </span>
                        <span className={`leading-relaxed flex-1 min-w-0 ${isFile ? "text-green-400/80" : isFailed ? "text-red-400/80" : isUser ? "text-accent font-medium" : "text-foreground/60"}`}>
                          {ev.message}
                        </span>
                      </div>
                    );
                  })}
              {((workspaceType === "clone" && phases.length === 0) || (workspaceType === "build" && steps.length === 0)) && (
                <div className="flex flex-col items-center justify-center h-full text-muted">
                  <div className="animate-pulse text-lg mb-2 text-accent">●</div>
                  <span className="text-xs">{workspaceType === "clone" ? "Waiting for clone events..." : "Waiting for build events..."}</span>
                </div>
              )}
            </div>
          </div>

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
