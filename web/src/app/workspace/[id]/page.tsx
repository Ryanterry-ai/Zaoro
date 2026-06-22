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
  step: string;
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
    } catch {}
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
    pollRef.current = setInterval(pollProgress, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isBuilding, pollProgress]);

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

  // Extract rich analysis data from phases
  const analysisPhase = [...phases].reverse().find(p => p.step === "clone" && p.data);
  const analysisData = analysisPhase?.data as AnalysisData | undefined;

  const assetsPhase = [...phases].reverse().find(p => p.message?.includes("assets") || p.message?.includes("Download"));
  const assetsData = (assetsPhase?.data as AssetsData | undefined) || null;

  const generatePhase = [...phases].reverse().find(p => p.message?.includes("Generating") || p.message?.includes("components"));
  const generateData = (generatePhase?.data as GenerateData | undefined) || null;

  const layoutData = null;
  const applyData = null;

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

  // ── Clone Progress View (left panel) ──
  const renderCloneProgress = () => {
    if (workspaceType !== "clone") return null;

    const phaseList = [
      { id: "analysis", icon: "🔍", label: "Site Analysis" },
      { id: "assets", icon: "📦", label: "Asset Download" },
      { id: "generate", icon: "⚡", label: "Component Generation" },
      { id: "layout", icon: "🏗", label: "Layout & Navigation" },
      { id: "apply", icon: "✍", label: "Write Files" },
    ];

    // Find which phases have data by matching message patterns
    const getPhaseStatus = (phaseId: string): "pending" | "active" | "done" | "error" => {
      const lastMsg = phases[phases.length - 1]?.message || "";
      const hasError = lastMsg.includes("failed") || lastMsg.includes("error");

      // Check by phase order
      const phaseIdx = phaseList.findIndex(p => p.id === phaseId);
      const currentPhaseIdx = (() => {
        if (lastMsg.includes("Site Analysis") || lastMsg.includes("Scraping")) return 0;
        if (lastMsg.includes("Asset") || lastMsg.includes("assets")) return 1;
        if (lastMsg.includes("Generating") || lastMsg.includes("component")) return 2;
        if (lastMsg.includes("Layout") || lastMsg.includes("navigation")) return 3;
        if (lastMsg.includes("Write") || lastMsg.includes("file")) return 4;
        if (lastMsg.includes("Clone complete") || lastMsg.includes("Clone completed")) return 5;
        return -1;
      })();

      if (phaseIdx < currentPhaseIdx) return "done";
      if (phaseIdx === currentPhaseIdx) {
        if (hasError && phaseIdx === currentPhaseIdx) return "error";
        return "active";
      }
      return "pending";
    };

    return (
      <div className="space-y-2">
        {phaseList.map((phase) => {
          const status = getPhaseStatus(phase.id);
          return (
            <div key={phase.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              status === "active" ? "bg-accent/10 border border-accent/20" :
              status === "done" ? "bg-green-500/5 border border-green-500/10" :
              status === "error" ? "bg-red-500/5 border border-red-500/10" :
              "bg-surface border border-border"
            }`}>
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
                <div className="text-xs font-medium text-foreground">{phase.label}</div>
                {status === "active" && (
                  <div className="text-[11px] text-muted mt-0.5 truncate">{lastPhaseMessage}</div>
                )}
              </div>
              {status === "done" && <span className="text-[10px] text-green-400/60">✓</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // Render rich analysis data cards
  const renderAnalysisCards = () => {
    if (!analysisData) return null;

    return (
      <div className="space-y-3 mt-3 animate-slide-up">
        {/* Site Title */}
        <div className="px-3 py-2 rounded-xl bg-surface border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Website</div>
          <div className="text-sm font-medium text-foreground">{analysisData.title || "Untitled"}</div>
          {analysisData.description && (
            <div className="text-[11px] text-muted mt-0.5 line-clamp-2">{analysisData.description}</div>
          )}
        </div>

        {/* Technologies */}
        {analysisData.technologies.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Technologies Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {analysisData.technologies.map((tech, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-medium">{tech}</span>
              ))}
            </div>
          </div>
        )}

        {/* Pages Found */}
        {analysisData.pagesFound.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Pages Discovered ({analysisData.pagesFound.length})</div>
            <div className="space-y-1">
              {analysisData.pagesFound.map((page, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="text-green-400">✓</span>
                  <span className="text-foreground/80 truncate">{page.title || page.path}</span>
                  <span className="text-muted ml-auto">{page.sections} sections</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        {analysisData.navigation.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Navigation ({analysisData.navigation.length} items)</div>
            <div className="flex flex-wrap gap-1.5">
              {analysisData.navigation.map((nav, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px]">{nav.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {analysisData.images.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Images ({analysisData.images.length})</div>
            <div className="grid grid-cols-4 gap-1">
              {analysisData.images.slice(0, 12).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg bg-surface-hover border border-border overflow-hidden flex items-center justify-center">
                  {img.src.startsWith("http") ? (
                    <img src={img.src} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-[10px] text-muted">IMG</span>
                  )}
                </div>
              ))}
            </div>
            {analysisData.images.length > 12 && (
              <div className="text-[10px] text-muted mt-1">+{analysisData.images.length - 12} more</div>
            )}
          </div>
        )}

        {/* Videos */}
        {analysisData.videos.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Videos ({analysisData.videos.length})</div>
            <div className="space-y-1">
              {analysisData.videos.map((vid, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="text-purple-400">▶</span>
                  <span className="text-foreground/80 truncate">{vid.src}</span>
                  <span className="text-muted ml-auto">{vid.format}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Design Tokens */}
        {analysisData.designTokens && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Design Tokens</div>
            <div className="space-y-1.5">
              {analysisData.designTokens.colors.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted mb-1">Colors</div>
                  <div className="flex flex-wrap gap-1">
                    {analysisData.designTokens.colors.slice(0, 10).map((color, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm border border-white/10" style={{ backgroundColor: color }} />
                        <span className="text-[9px] text-muted font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysisData.designTokens.fonts.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted mb-1">Fonts</div>
                  <div className="flex flex-wrap gap-1">
                    {analysisData.designTokens.fonts.slice(0, 5).map((font, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-surface-hover text-[10px] text-foreground/70">{font.split(",")[0].replace(/"/g, "")}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links Summary */}
        <div className="px-3 py-2 rounded-xl bg-surface border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Link Analysis</div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-foreground/70"><strong className="text-foreground">{analysisData.links.total}</strong> total</span>
            <span className="text-green-400/70"><strong>{analysisData.links.internal}</strong> internal</span>
            <span className="text-blue-400/70"><strong>{analysisData.links.external}</strong> external</span>
          </div>
        </div>

        {/* Blocked Pages */}
        {analysisData.blockedPages.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
            <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Blocked Pages ({analysisData.blockedPages.length})</div>
            <div className="space-y-1">
              {analysisData.blockedPages.map((bp, i) => (
                <div key={i} className="text-[11px] text-red-400/80">
                  <span className="truncate">{bp.url}</span>
                  <span className="text-muted ml-1">— {bp.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forms */}
        {analysisData.forms.length > 0 && (
          <div className="px-3 py-2 rounded-xl bg-surface border border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Forms ({analysisData.forms.length})</div>
            <div className="space-y-1">
              {analysisData.forms.map((form, i) => (
                <div key={i} className="text-[11px] text-foreground/70">
                  <span className="text-muted">{form.method.toUpperCase()}</span> {form.action || "—"}
                  <span className="text-muted ml-1">({form.fields.length} fields)</span>
                </div>
              ))}
            </div>
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
              {workspaceType === "clone" ? "Cloning..." : "Building..."}
            </div>
          )}
          {buildDone && !isBuilding && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              {workspaceType === "clone" ? "Clone complete" : "Build complete"}
            </div>
          )}
          <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all">Share</button>
          <button className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-all">Deploy</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          <div className="flex border-b border-border">
            <button onClick={() => setActiveTab("chat")} className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${activeTab === "chat" ? "text-foreground border-b-2 border-accent" : "text-muted hover:text-foreground"}`}>
              {workspaceType === "clone" ? "Progress" : "Chat"}
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
                    {renderAnalysisCards()}
                  </>
                ) : workspaceType === "clone" && phases.length === 0 ? (
                  <div className="text-center text-muted text-sm py-12">
                    <div className="animate-pulse text-lg mb-2 text-accent">●</div>
                    Initializing clone engine...
                  </div>
                ) : (
                  <>
                    {/* Build mode: chat steps */}
                    {visibleSteps.length === 0 && (
                      <div className="text-center text-muted text-sm py-12">
                        <div className="animate-pulse text-lg mb-2 text-accent">●</div>
                        Initializing build.same engine...
                      </div>
                    )}
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
