"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

interface ProgressStep {
  step: string;
  message: string;
  ts: number;
}

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

const HIDDEN_STEPS = new Set(["debug", "engine", "created"]);

export default function WorkspacePage() {
  const params = useParams();
  const id = params.id as string;

  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");
  const [rightTab, setRightTab] = useState<"preview" | "files" | "code">("preview");
  const [isBuilding, setIsBuilding] = useState(true);
  const [buildDone, setBuildDone] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const buildTriggered = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}/progress`);
      const data = await res.json();
      setSteps(data.steps || []);

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
  }, [id]);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {}
  }, [id]);

  const loadFile = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setFileContent(data.content || "");
      setSelectedFile(filePath);
      setRightTab("code");
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

  useEffect(() => {
    triggerBuild();
  }, [triggerBuild]);

  useEffect(() => {
    if (!isBuilding) return;
    pollRef.current = setInterval(pollProgress, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isBuilding, pollProgress]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  const sourceFiles = files.filter(
    (f) =>
      !f.isDirectory &&
      (f.path.endsWith(".tsx") ||
        f.path.endsWith(".ts") ||
        f.path.endsWith(".css") ||
        f.path.endsWith(".json")) &&
      !f.path.includes("node_modules") &&
      !f.path.includes("package-lock")
  );

  const visibleSteps = steps.filter((s) => !HIDDEN_STEPS.has(s.step));

  const formatLabel = (step: string) => {
    switch (step) {
      case "llm": return "AI Agent";
      case "agent": return "Agent";
      case "done": return "Complete";
      case "error": return "Error";
      case "user": return "You";
      default: return step;
    }
  };

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
              Building...
            </div>
          )}
          {buildDone && !isBuilding && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Build complete
            </div>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border hover:bg-surface-hover transition-all"
          >
            Share
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs bg-accent text-white hover:bg-accent-hover transition-all">
            Deploy
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Chat */}
        <div className="flex flex-col w-[380px] border-r border-border bg-surface">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${
                activeTab === "chat"
                  ? "text-foreground border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all ${
                activeTab === "code"
                  ? "text-foreground border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Code Editor
            </button>
          </div>

          {activeTab === "chat" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        <div className="bg-accent text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">
                          {s.message}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${
                          s.step === "done"
                            ? "bg-green-500/20 border-green-500/30 text-green-400"
                            : s.step === "error"
                            ? "bg-red-500/20 border-red-500/30 text-red-400"
                            : "bg-surface-hover border-border text-muted"
                        }`}>
                          {s.step === "done" ? "✓" : s.step === "error" ? "✕" : "b"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-medium text-muted uppercase tracking-wide">
                              {formatLabel(s.step)}
                            </span>
                            <span className="text-[10px] text-muted/50">
                              {new Date(s.ts).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {s.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
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
                  <button
                    onClick={handleFollowUp}
                    disabled={isBuilding || !followUp.trim()}
                    className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover disabled:opacity-30 transition-all"
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                {selectedFile ? (
                  <pre className="p-4 text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {fileContent}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                    Select a file from the Files tab
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Preview + Files */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-surface">
            <button
              onClick={() => setRightTab("preview")}
              className={`px-4 py-2.5 text-xs font-medium transition-all ${
                rightTab === "preview"
                  ? "text-foreground border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => {
                setRightTab("files");
                loadFiles();
              }}
              className={`px-4 py-2.5 text-xs font-medium transition-all ${
                rightTab === "files"
                  ? "text-foreground border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Files
              {sourceFiles.length > 0 && (
                <span className="ml-1.5 text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded-full">
                  {sourceFiles.length}
                </span>
              )}
            </button>
          </div>

          {rightTab === "preview" ? (
            <div className="flex-1 bg-white relative">
              {isBuilding && !previewHtml ? (
                <div className="flex items-center justify-center h-full bg-zinc-50">
                  <div className="text-center space-y-3">
                    <svg className="animate-spin h-8 w-8 text-accent mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-sm text-zinc-500">Building your app...</p>
                  </div>
                </div>
              ) : previewHtml ? (
                <iframe
                  key={previewKey}
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-zinc-50">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted">No preview available</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-surface">
              <div className="p-2">
                {sourceFiles.length === 0 ? (
                  <div className="text-center text-muted text-sm py-12">
                    No files generated yet
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {sourceFiles.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => loadFile(f.path)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                          selectedFile === f.path
                            ? "bg-accent/10 text-accent"
                            : "text-foreground/70 hover:bg-surface-hover"
                        }`}
                      >
                        <span className="text-muted">
                          {f.path.endsWith(".tsx")
                            ? "◇"
                            : f.path.endsWith(".ts")
                            ? "◆"
                            : f.path.endsWith(".css")
                            ? "◎"
                            : "▪"}
                        </span>
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
