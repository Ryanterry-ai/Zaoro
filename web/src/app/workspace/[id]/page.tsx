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

const HIDDEN_STEPS = new Set(["debug", "engine", "created"]);

const BUILD_PHASES = [
  { id: "bi", icon: "🔍", label: "Analyzing Requirements", doneWhen: "architect" },
  { id: "architect", icon: "📐", label: "Designing Architecture", doneWhen: "structure" },
  { id: "structure", icon: "📁", label: "Creating Project Structure", doneWhen: "llm" },
  { id: "llm", icon: "🤖", label: "Generating Code with AI", doneWhen: "compile" },
  { id: "compile", icon: "⚙️", label: "Compiling & Validating", doneWhen: "preview" },
  { id: "preview", icon: "🖼️", label: "Rendering Preview", doneWhen: "done" },
];

type DeviceFrame = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceFrame, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [phases, setPhases] = useState<ClonePhase[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");
  const [rightTab, setRightTab] = useState<"preview" | "files" | "code">("preview");
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
        console.warn(`[progress] HTTP ${res.status} — proxy may be down, engine may not be running`);
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
      console.error('[progress] Poll failed:', err);
    }
  }, [id, loadFiles, loadPreview]);

  const loadFile = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(filePath);
      setRightTab("code");
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
    return () => { cancelled = true; };
  }, [id, pollProgress, triggerBuild]);

  useEffect(() => {
    if (!isBuilding) return;
    pollRef.current = setInterval(pollProgress, workspaceType === "clone" ? 500 : 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

  const visibleSteps = steps.filter((s) => !HIDDEN_STEPS.has(s.step));

  const formatLabel = (step: string) => {
    switch (step) {
      case "llm": return "AI Agent";
      case "clone": return "Clone";
      case "agent": return "Agent";
      case "done": return "Complete";
      case "error": return "Error";
      case "user": return "You";
      default: return step;
    }
  };

  const iframeWidth = DEVICE_WIDTHS[deviceFrame];

  // ── Fullscreen overlay mode ──
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

  // ── Clone Progress View ──
  const renderCloneProgress = () => {
    if (workspaceType !== "clone") return null;

    const lastMsg = phases[phases.length - 1]?.message || "";
    const lastPhase = phases[phases.length - 1]?.phase || "";
    const isComplete = lastMsg.includes("Clone complete") || lastMsg.includes("Clone finished");
    const isFailed = lastMsg.includes("Clone failed");

    const CLONE_PHASES = [
      { id: "analyze", icon: "🔍", label: "Analyze Site", description: "Detecting tech stack, sitemap, robots.txt" },
      { id: "crawl", icon: "🕷", label: "Crawl Pages", description: "Extracting content from each page" },
      { id: "assets", icon: "📦", label: "Download Assets", description: "Images, videos, fonts, SVGs" },
      { id: "generate", icon: "⚡", label: "Generate Code", description: "Creating page components" },
      { id: "self-contain", icon: "🔒", label: "Self-Contain", description: "Rewriting URLs, removing dependencies" },
      { id: "preview", icon: "🖼", label: "Preview", description: "Preparing live preview" },
      { id: "complete", icon: "✅", label: "Complete", description: "Ready to download or deploy" },
    ];

    // Determine which phase is active
    const phaseOrder = CLONE_PHASES.map(p => p.id);
    const activePhaseIdx = isComplete ? CLONE_PHASES.length - 1 : isFailed ? phaseOrder.indexOf(lastPhase) : phaseOrder.indexOf(lastPhase);

    const getPhaseStatus = (phaseId: string, idx: number): "pending" | "active" | "done" | "error" => {
      if (isComplete) return "done";
      if (isFailed && idx === activePhaseIdx) return "error";
      if (idx < activePhaseIdx) return "done";
      if (phaseId === lastPhase && !isComplete && !isFailed) return "active";
      return "pending";
    };

    // Count events per phase and extract progress data
    const eventCounts: Record<string, number> = {};
    const phaseEvents: Record<string, any[]> = {};
    for (const ev of phases) {
      const phaseKey = ev.phase || ev.step || 'unknown';
      eventCounts[phaseKey] = (eventCounts[phaseKey] || 0) + 1;
      if (!phaseEvents[phaseKey]) phaseEvents[phaseKey] = [];
      phaseEvents[phaseKey].push(ev);
    }

    // Get latest message per phase
    const latestPerPhase: Record<string, string> = {};
    for (const ev of phases) {
      const phaseKey = ev.phase || ev.step || 'unknown';
      latestPerPhase[phaseKey] = ev.message;
    }

    // Extract progress counters from events
    const getPhaseProgress = (phaseId: string): { current: number; total: number } | null => {
      const evts = phaseEvents[phaseId] || [];
      for (let i = evts.length - 1; i >= 0; i--) {
        const d = evts[i].data;
        if (d && typeof d.index === 'number' && typeof d.total === 'number') {
          return { current: d.index + 1, total: d.total };
        }
      }
      return null;
    };

    return (
      <div className="space-y-2">
        {CLONE_PHASES.map((phase, idx) => {
          const status = getPhaseStatus(phase.id, idx);
          const eventCount = eventCounts[phase.id] || 0;
          const latestMsg = latestPerPhase[phase.id] || "";
          const progress = getPhaseProgress(phase.id);
          const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

          return (
            <div key={phase.id} className={`rounded-xl text-sm transition-all overflow-hidden ${
              status === "active" ? "bg-accent/10 border border-accent/20" :
              status === "done" ? "bg-green-500/5 border border-green-500/10" :
              status === "error" ? "bg-red-500/5 border border-red-500/10" :
              "bg-surface border border-border"
            }`}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                  status === "active" ? "bg-accent/20 text-accent animate-pulse" :
                  status === "done" ? "bg-green-500/20 text-green-400" :
                  status === "error" ? "bg-red-500/20 text-red-400" :
                  "bg-surface-hover text-muted"
                }`}>
                  {status === "done" ? "✓" : status === "error" ? "✕" : status === "active" ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <span className="text-[11px]">{phase.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{phase.label}</span>
                    {eventCount > 0 && status !== "pending" && (
                      <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">{eventCount}</span>
                    )}
                    {progress && status === "active" && (
                      <span className="text-[10px] text-accent font-mono">{progress.current}/{progress.total}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {progress && status === "active" && (
                    <div className="w-full h-1 bg-surface-hover rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {status === "active" && latestMsg && (
                    <div className="text-[11px] text-muted mt-1 truncate">{latestMsg}</div>
                  )}
                  {status === "done" && (
                    <div className="text-[11px] text-green-400/70 mt-0.5">{phase.description}</div>
                  )}
                  {status === "pending" && (
                    <div className="text-[11px] text-muted/50 mt-0.5">{phase.description}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live event feed — per-operation progress */}
        {phases.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted">Live Activity</span>
              <span className="text-[10px] text-muted">{phases.length} events</span>
            </div>
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto" ref={chatEndRef}>
              {[...phases].reverse().slice(0, 50).map((ev, i) => {
                const ts = new Date(ev.ts).toLocaleTimeString();
                const phaseLabel = ev.phase || ev.step || '';
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px] py-0.5">
                    <span className="text-muted/50 font-mono flex-shrink-0 w-[60px]">{ts}</span>
                    <span className={`flex-shrink-0 mt-0.5 ${
                      ev.phaseStatus === 'done' ? 'text-green-400' :
                      ev.phaseStatus === 'failed' ? 'text-red-400' : 'text-accent'
                    }`}>
                      {ev.phaseStatus === 'done' ? '●' : ev.phaseStatus === 'failed' ? '●' : '◉'}
                    </span>
                    <span className="text-foreground/70 leading-relaxed">{ev.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Download button when complete */}
        {isComplete && (
          <div className="mt-3 flex gap-2">
            <a
              href={`/api/workspace/${id}/download`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download as ZIP
            </a>
            <button
              onClick={() => loadPreview()}
              className="px-4 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-surface-hover transition-all"
            >
              Preview
            </button>
          </div>
        )}

        {/* Rich data cards below phases */}
        {renderPhaseDetails()}
      </div>
    );
  };

  const renderPhaseDetails = () => {
    const cards: React.ReactNode[] = [];

    // Helper to find events by phase
    const findEvents = (phase: string) => phases.filter(p => (p.phase || p.step) === phase);
    const findLastEvent = (phase: string) => [...phases].reverse().find(p => (p.phase || p.step) === phase);
    const findEventWith = (phase: string, substr: string) => phases.find(p => (p.phase || p.step) === phase && p.message.includes(substr));

    // Analyze phase details
    const analyzeDone = findEventWith('analyze', 'Analysis complete');
    if (analyzeDone?.data) {
      const d = analyzeDone.data as any;
      cards.push(
        <div key="analyze" className="px-3 py-2 rounded-xl bg-surface border border-border animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Site Analysis</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><strong className="text-foreground">{d.analyzeResult?.pages?.length || '?'}</strong> <span className="text-muted">pages found</span></div>
            <div><strong className="text-foreground">{d.analyzeResult?.navItems?.length || '?'}</strong> <span className="text-muted">nav items</span></div>
            <div><strong className="text-foreground">{d.analyzeResult?.techStack?.framework || '?'}</strong> <span className="text-muted">framework</span></div>
            <div><strong className="text-foreground">{d.analyzeResult?.techStack?.cms || 'none'}</strong> <span className="text-muted">CMS</span></div>
          </div>
        </div>
      );
    }

    // Crawl phase details
    const crawlDone = findLastEvent('crawl');
    if (crawlDone?.data) {
      const d = crawlDone.data as any;
      const crawlResults = d.crawlResults || [];
      const ok = crawlResults.filter((r: any) => r.status === 'done').length;
      const failed = crawlResults.filter((r: any) => r.status === 'failed').length;
      cards.push(
        <div key="crawl" className="px-3 py-2 rounded-xl bg-surface border border-border animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Crawled Pages ({ok}/{crawlResults.length})</div>
          <div className="space-y-1 max-h-[150px] overflow-y-auto">
            {crawlResults.slice(0, 15).map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className={r.status === 'done' ? 'text-green-400' : 'text-red-400'}>{r.status === 'done' ? '✓' : '✕'}</span>
                <span className="text-foreground/80 truncate flex-1">{r.title || r.path}</span>
                <span className="text-muted">{r.imagesFound}img</span>
                {r.videosFound > 0 && <span className="text-purple-400">{r.videosFound}vid</span>}
                <span className="text-muted/50">{r.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Assets phase details
    const assetsDone = findLastEvent('assets');
    if (assetsDone?.data) {
      const d = assetsDone.data as any;
      const byCat = d.byCategory || {};
      cards.push(
        <div key="assets" className="px-3 py-2 rounded-xl bg-surface border border-border animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Assets Downloaded</div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="text-green-400/70"><strong>{d.assetsOk || 0}</strong> downloaded</span>
            {(d.assetsFailed || 0) > 0 && <span className="text-red-400/70"><strong>{d.assetsFailed}</strong> failed</span>}
            {Object.entries(byCat).map(([cat, count]) => (
              <span key={cat} className="text-muted">{cat}: <strong>{count as number}</strong></span>
            ))}
          </div>
        </div>
      );
    }

    // Generate phase details
    const genDone = findLastEvent('generate');
    if (genDone?.data) {
      const d = genDone.data as any;
      const genResults = d.generateResults || [];
      cards.push(
        <div key="gen" className="px-3 py-2 rounded-xl bg-surface border border-border animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Generated Pages ({genResults.length})</div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {genResults.slice(0, 15).map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className={r.status === 'done' ? 'text-green-400' : r.status === 'failed' ? 'text-red-400' : 'text-muted'}>{r.status === 'done' ? '✓' : r.status === 'failed' ? '✕' : '○'}</span>
                <span className="text-foreground/80 truncate flex-1">{r.path}</span>
                <span className="text-muted">{r.componentCount}patch</span>
              </div>
            ))}
          </div>
          <div className="mt-1 text-[10px] text-muted">{d.totalPatches} total patches, {d.totalLlmCalls} LLM calls</div>
        </div>
      );
    }

    // Self-contain details
    const selfContainDone = findLastEvent('self-contain');
    if (selfContainDone?.data) {
      const d = selfContainDone.data as any;
      cards.push(
        <div key="selfcontain" className="px-3 py-2 rounded-xl bg-surface border border-border animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Self-Contained</div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-foreground/70"><strong>{d.filesWritten?.length || 0}</strong> files</span>
            <span className="text-foreground/70"><strong>{d.filesModified || 0}</strong> scrubbed</span>
            <span className={d.externalUrlsRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}><strong>{d.externalUrlsRemaining || 0}</strong> external URLs</span>
          </div>
        </div>
      );
    }

    // Completion summary
    const completeDone = findLastEvent('complete');
    if (completeDone?.data && (completeDone.phaseStatus || 'done') === 'done') {
      const d = completeDone.data as any;
      cards.push(
        <div key="complete" className="px-3 py-3 rounded-xl bg-green-500/5 border border-green-500/10 animate-slide-up">
          <div className="text-[10px] uppercase tracking-wider text-green-400 mb-1.5">Clone Complete</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><strong className="text-foreground">{d.pages || 0}</strong> <span className="text-muted">pages</span></div>
            <div><strong className="text-foreground">{d.assets || 0}</strong> <span className="text-muted">assets</span></div>
            <div><strong className="text-foreground">{d.files || 0}</strong> <span className="text-muted">files</span></div>
            <div><strong className="text-foreground">{d.duration ? (d.duration / 1000).toFixed(1) : '0'}s</strong> <span className="text-muted">duration</span></div>
          </div>
        </div>
      );
    }

    return cards.length > 0 ? <div className="space-y-2 mt-3">{cards}</div> : null;
  };

  const renderBuildProgress = () => {
    if (workspaceType !== "build") return null;
    if (steps.length === 0) return null;

    const lastStep = steps[steps.length - 1];
    const lastMsg = lastStep?.message || "";
    const lastStepId = lastStep?.step || "";
    const hasError = lastStepId === "error";
    const isComplete = lastStepId === "done";

    // Build phases from events
    const BUILD_PIPELINE = [
      { id: "bi", icon: "🔍", label: "Business Intelligence", description: "Analyzing requirements, industry, competitors" },
      { id: "research", icon: "📊", label: "Research Agent", description: "Competitors, market, content strategy" },
      { id: "architect", icon: "📐", label: "Architect", description: "Page structure, components, state stores" },
      { id: "design", icon: "🎨", label: "Design System", description: "Typography, colors, spacing, layout" },
      { id: "components", icon: "🧩", label: "Component Sourcer", description: "Section compositions, shared components" },
      { id: "assets", icon: "🖼", label: "Asset Intelligence", description: "Images, icons, illustrations" },
      { id: "motion", icon: "✨", label: "Motion Engine", description: "Animations, micro-interactions" },
      { id: "synthesize", icon: "🤖", label: "Synthesizer + LLM", description: "Domain-specific code generation" },
      { id: "ux-eval", icon: "👁", label: "UX Evaluator", description: "Accessibility, hierarchy, contrast" },
      { id: "biz-eval", icon: "💼", label: "Business Validator", description: "Revenue, flows, market fit" },
      { id: "assembly", icon: "🏗", label: "Assembly QA", description: "File writing, integrity checks" },
      { id: "correction", icon: "🔄", label: "Self-Correction", description: "Re-plan and re-generate if needed" },
      { id: "compile", icon: "⚙", label: "Compile & Validate", description: "TypeScript compilation" },
      { id: "browser-verify", icon: "🌐", label: "Browser Verification", description: "E2E tests, console errors, broken assets" },
      { id: "repair", icon: "🔧", label: "Repair Loop", description: "Auto-fix issues found during verification" },
      { id: "preview", icon: "🖼", label: "Preview", description: "Render live preview" },
      { id: "complete", icon: "✅", label: "Complete", description: "Ready to download or deploy" },
    ];

    // Count events per stage and extract progress data
    const eventCounts: Record<string, number> = {};
    const stageEvents: Record<string, any[]> = {};
    for (const ev of steps) {
      const stage = ev.step || 'unknown';
      eventCounts[stage] = (eventCounts[stage] || 0) + 1;
      if (!stageEvents[stage]) stageEvents[stage] = [];
      stageEvents[stage].push(ev);
    }

    // Get latest message per stage
    const latestPerStage: Record<string, string> = {};
    for (const ev of steps) {
      const stage = ev.step || 'unknown';
      latestPerStage[stage] = ev.message;
    }

    // Extract progress counters from events
    const getStageProgress = (stageId: string): { current: number; total: number } | null => {
      const evts = stageEvents[stageId] || [];
      for (let i = evts.length - 1; i >= 0; i--) {
        const d = evts[i].data;
        if (d && typeof d.index === 'number' && typeof d.total === 'number') {
          return { current: d.index + 1, total: d.total };
        }
      }
      return null;
    };

    // Determine active stage
    const stageOrder = BUILD_PIPELINE.map(p => p.id);
    const activeIdx = isComplete ? BUILD_PIPELINE.length - 1 : stageOrder.indexOf(lastStepId);

    const getStageStatus = (stageId: string, idx: number): "pending" | "active" | "done" | "error" => {
      if (isComplete) return "done";
      if (hasError && idx === activeIdx) return "error";
      if (idx < activeIdx) return "done";
      if (stageId === lastStepId && !isComplete && !hasError) return "active";
      return "pending";
    };

    return (
      <div className="space-y-2">
        {BUILD_PIPELINE.map((phase, idx) => {
          const status = getStageStatus(phase.id, idx);
          const eventCount = eventCounts[phase.id] || 0;
          const latestMsg = latestPerStage[phase.id] || "";
          const progress = getStageProgress(phase.id);
          const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

          return (
            <div key={phase.id} className={`rounded-xl text-sm transition-all overflow-hidden ${
              status === "active" ? "bg-accent/10 border border-accent/20" :
              status === "done" ? "bg-green-500/5 border border-green-500/10" :
              status === "error" ? "bg-red-500/5 border border-red-500/10" :
              "bg-surface border border-border"
            }`}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                  status === "active" ? "bg-accent/20 text-accent animate-pulse" :
                  status === "done" ? "bg-green-500/20 text-green-400" :
                  status === "error" ? "bg-red-500/20 text-red-400" :
                  "bg-surface-hover text-muted"
                }`}>
                  {status === "done" ? "✓" : status === "error" ? "✕" : status === "active" ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <span className="text-[11px]">{phase.icon}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{phase.label}</span>
                    {eventCount > 0 && status !== "pending" && (
                      <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">{eventCount}</span>
                    )}
                    {progress && status === "active" && (
                      <span className="text-[10px] text-accent font-mono">{progress.current}/{progress.total}</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  {progress && status === "active" && (
                    <div className="w-full h-1 bg-surface-hover rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {status === "active" && latestMsg && (
                    <div className="text-[11px] text-muted mt-1 truncate">{latestMsg}</div>
                  )}
                  {status === "done" && (
                    <div className="text-[11px] text-green-400/70 mt-0.5">{phase.description}</div>
                  )}
                  {status === "pending" && (
                    <div className="text-[11px] text-muted/50 mt-0.5">{phase.description}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live event feed — per-operation progress */}
        {steps.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-muted">Live Activity</span>
              <span className="text-[10px] text-muted">{steps.length} events</span>
            </div>
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto" ref={chatEndRef}>
              {[...steps].reverse().slice(0, 50).map((ev, i) => {
                const ts = new Date(ev.ts).toLocaleTimeString();
                return (
                  <div key={i} className="flex items-start gap-2 text-[11px] py-0.5">
                    <span className="text-muted/50 font-mono flex-shrink-0 w-[60px]">{ts}</span>
                    <span className={`flex-shrink-0 mt-0.5 ${
                      ev.step === 'done' ? 'text-green-400' :
                      ev.step === 'error' ? 'text-red-400' : 'text-accent'
                    }`}>
                      {ev.step === 'done' ? '●' : ev.step === 'error' ? '●' : '◉'}
                    </span>
                    <span className="text-foreground/70 leading-relaxed">{ev.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Score cards when complete */}
        {isComplete && (
          <div className="mt-3 space-y-2">
            {lastMsg.includes("UX:") && (
              <div className="px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                <div className="text-[10px] uppercase tracking-wider text-green-400 mb-1.5">Build Complete</div>
                <div className="text-[11px] text-foreground/80">{lastMsg}</div>
              </div>
            )}
            <a
              href={`/api/workspace/${id}/download`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download as ZIP
            </a>
          </div>
        )}
      </div>
    );
  };

  const lastPhaseMessage = phases.length > 0 ? phases[phases.length - 1].message : "";

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top Bar */}
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
              {workspaceType === "clone" ? "Cloning..." : steps.length > 0 ? `${BUILD_PHASES.find(p => p.id === steps[steps.length - 1]?.step)?.label || "Building"}...` : "Building..."}
            </div>
          )}
          {buildDone && !isBuilding && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              {workspaceType === "clone" ? "Clone complete" : "Build complete"}
            </div>
          )}
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all">Share</button>
          {buildDone && workspaceType === "clone" && (
            <a href={`/api/workspace/${id}/download`} className="px-3 py-1.5 rounded-lg text-xs bg-green-500 text-white hover:bg-green-600 transition-all flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </a>
          )}
          <button className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-all">Deploy</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          <div className="flex border-b border-border">
            <button onClick={() => setActiveTab("chat")} className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "chat" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
              {workspaceType === "clone" ? "Progress" : isBuilding ? "Progress" : "Chat"}
            </button>
            <button onClick={() => setActiveTab("code")} className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "code" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
              Code Editor
            </button>
          </div>

          {activeTab === "chat" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Clone mode: show phase progress */}
                {workspaceType === "clone" && phases.length > 0 ? (
                  <>
                    {renderCloneProgress()}
                  </>
                ) : workspaceType === "clone" && phases.length === 0 ? (
                  <div className="text-center text-muted text-sm py-12">
                    <div className="animate-pulse text-lg mb-2 text-accent">●</div>
                    Initializing clone engine...
                  </div>
                ) : (
                  <>
                    {/* Build mode: show progress tracker while building, chat after done */}
                    {isBuilding && steps.length > 0 ? (
                      renderBuildProgress()
                    ) : isBuilding ? (
                      <div className="text-center text-muted text-sm py-12">
                        <div className="animate-pulse text-lg mb-2 text-accent">●</div>
                        Initializing build.same engine...
                      </div>
                    ) : (
                      <>
                        {visibleSteps.map((s, i) => (
                          <div key={i} className="animate-slide-up">
                            {s.step === "user" ? (
                              <div className="flex justify-end">
                                <div className="bg-accent text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">{s.message}</div>
                              </div>
                            ) : (
                              <div className="flex gap-3">
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${
                                  s.step === "done" ? "bg-green-500/20 border-green-500/30 text-green-400" :
                                  s.step === "error" ? "bg-red-500/20 border-red-500/30 text-red-400" :
                                  "bg-surface-hover border-border text-muted"
                                }`}>
                                  {s.step === "done" ? "✓" : s.step === "error" ? "✕" : "b"}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-medium text-muted uppercase tracking-wide">{formatLabel(s.step)}</span>
                                    <span className="text-[10px] text-muted/50">{new Date(s.ts).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-sm text-foreground/80 leading-relaxed">{s.message}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <div className="p-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                    placeholder={workspaceType === "clone" ? "Describe changes after clone..." : "Describe changes..."}
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all placeholder:text-muted"
                    disabled={isBuilding}
                  />
                  <button onClick={handleFollowUp} disabled={isBuilding || !followUp.trim()} className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-30 transition-all">→</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                {selectedFile ? (
                  <pre className="p-4 text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">{fileContent}</pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">Select a file from the Files tab</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Preview + Files */}
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
