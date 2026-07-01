"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "A SaaS dashboard with user authentication and analytics",
  "An e-commerce store with product listings and cart",
  "A portfolio website with blog and contact form",
  "A project management tool with kanban boards",
];

const STATS = [
  { label: "Pipeline stages", value: "22" },
  { label: "Avg. build time", value: "<45s" },
  { label: "Quality gates", value: "7" },
  { label: "Self-healing passes", value: "94%" },
];

const FEATURES = [
  {
    title: "Self-healing compilation",
    desc: "AST-first code synthesis that detects errors and repairs them automatically before you ever see a red screen.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "Business intelligence",
    desc: "Analyzes your prompt against market data, generates revenue models, and maps domain-specific workflows automatically.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: "BOS registry",
    desc: "Behavior-Object-Skill registry matches domain patterns to production-ready blueprints with zero cold starts.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    title: "Live preview",
    desc: "Instant iframe preview updates as the build progresses. No deployment required to see what you're getting.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: "Clone any site",
    desc: "Extractive mode clones existing websites with full asset localization, route coverage, and admin panel generation.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
    ),
  },
  {
    title: "SSE live feed",
    desc: "Server-Sent Events stream every pipeline stage, LLM call, and quality gate result to the UI in real time.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

const PIPELINE_STAGES = [
  { id: "bi", label: "BI" },
  { id: "research", label: "Research" },
  { id: "architect", label: "Architect" },
  { id: "design-dna", label: "Design DNA" },
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
  { id: "quality-gate", label: "Gate" },
  { id: "preview", label: "Preview" },
  { id: "complete", label: "Done" },
];

type Mode = "build" | "clone";

export default function Home() {
  const [mode, setMode] = useState<Mode>("build");
  const [prompt, setPrompt] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleBuild = async () => {
    if (isBuilding) return;
    if (mode === "clone") {
      if (!cloneUrl.trim()) return;
      setIsBuilding(true);
      try {
        const res = await fetch("/api/clone", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cloneUrl.trim() }),
        });
        const data = await res.json();
        if (data.id) router.push(`/workspace/${data.id}`);
        else setIsBuilding(false);
      } catch { setIsBuilding(false); }
    } else {
      if (!prompt.trim()) return;
      setIsBuilding(true);
      try {
        const res = await fetch("/api/create", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), pipeline: true }),
        });
        const data = await res.json();
        if (data.id) router.push(`/workspace/${data.id}`);
        else setIsBuilding(false);
      } catch { setIsBuilding(false); }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-[#ededed]">
      {/* Floating nav island */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 transition-opacity duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center justify-between px-5 py-2.5 w-[90%] max-w-5xl rounded-2xl border border-white/[0.06] bg-black/70 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              b
            </div>
            <span className="text-sm font-semibold tracking-tight">build.same</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#666] hover:text-[#ededed] transition-colors">
              GitHub
            </a>
            <div className="flex items-center gap-2 text-[11px] text-[#666]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="hidden sm:inline">Engine v4</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#6366f1]/[0.03] blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[#6366f1]/[0.02] blur-[100px]" />
        </div>

        <div className="w-full max-w-2xl space-y-8 relative z-10">
          <div className={`text-center space-y-5 transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-[11px] font-medium text-[#6366f1] tracking-wide mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              22-stage build pipeline
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Describe it.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366f1] to-[#818cf8]">We build it.</span>
            </h1>
            <p className="text-base md:text-lg text-[#666] max-w-md mx-auto leading-relaxed">
              AI-powered code generation with self-healing compilation.
              From prompt to production in seconds.
            </p>
          </div>

          {/* Pipeline stage bar */}
          <div className={`flex items-center justify-center gap-1.5 transition-all duration-700 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#222] border border-white/[0.04]" />
                <span className="text-[7px] font-medium text-[#444] tracking-tight">{stage.label}</span>
                {i < PIPELINE_STAGES.length - 1 && <div className="w-2 h-[1px] bg-[#222]" />}
              </div>
            ))}
          </div>

          {/* Mode + Input */}
          <div className={`space-y-4 transition-all duration-700 delay-300 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <div className="flex justify-center">
              <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-1 backdrop-blur-sm">
                <button onClick={() => setMode("build")} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mode === "build" ? "bg-[#6366f1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-[#666] hover:text-[#ededed]"}`}>
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                    Build
                  </span>
                </button>
                <button onClick={() => setMode("clone")} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mode === "clone" ? "bg-[#6366f1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-[#666] hover:text-[#ededed]"}`}>
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    Clone
                  </span>
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1 transition-all focus-within:border-[#6366f1]/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]">
              {mode === "clone" ? (
                <input type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBuild(); } }} placeholder="https://example.com" className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-[#444]" disabled={isBuilding} />
              ) : (
                <textarea ref={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBuild(); } }} placeholder="What do you want to build?" rows={3} className="w-full bg-transparent px-4 py-3 text-base resize-none outline-none placeholder:text-[#444]" disabled={isBuilding} />
              )}
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[11px] text-[#444]">{mode === "build" ? "Press Enter to build" : "Enter a URL to clone"}</span>
                <button onClick={handleBuild} disabled={(mode === "build" ? !prompt.trim() : !cloneUrl.trim()) || isBuilding} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#6366f1] text-white text-sm font-medium transition-all hover:bg-[#818cf8] disabled:opacity-20 disabled:cursor-not-allowed shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  {isBuilding ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{mode === "clone" ? "Cloning..." : "Building..."}</>
                  ) : (
                    <>{mode === "clone" ? "Clone" : "Build"}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          {mode === "build" && (
            <div className={`flex flex-wrap gap-2 justify-center transition-all duration-700 delay-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
              {EXAMPLE_PROMPTS.map((example) => (
                <button key={example} onClick={() => setPrompt(example)} className="px-4 py-2 rounded-full text-[12px] text-[#555] border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:text-[#ededed] transition-all">
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#ededed] tracking-tight">{stat.value}</div>
              <div className="text-[11px] text-[#555] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/[0.04] py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Built for production</h2>
            <p className="text-sm text-[#666] max-w-lg mx-auto">Every feature is designed to ship real code, not prototypes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="group relative p-5 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                <div className="w-9 h-9 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center text-[#6366f1] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-[#ededed] mb-2">{feature.title}</h3>
                <p className="text-[12px] text-[#555] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline detail */}
      <section className="border-t border-white/[0.04] py-24 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <span className="inline-flex px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-[10px] font-medium text-[#6366f1] tracking-wide">How it works</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">22-stage pipeline</h2>
            <p className="text-sm text-[#666] max-w-md mx-auto">From business intelligence to live preview, every stage is tracked, verified, and streamed in real time.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
            {[
              { phase: "Analysis", stages: "BI → Research → Architect" },
              { phase: "Generation", stages: "DNA → Design → Components → Assets → Motion" },
              { phase: "Validation", stages: "UX Eval → Biz Eval → Assembly → QA" },
              { phase: "Delivery", stages: "Compile → Gate → Preview → Deploy" },
            ].map((group) => (
              <div key={group.phase} className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02]">
                <div className="text-[10px] font-semibold text-[#6366f1] tracking-wide mb-1.5">{group.phase}</div>
                <div className="text-[11px] text-[#555] leading-relaxed">{group.stages}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#6366f1] flex items-center justify-center text-[8px] font-bold text-white">b</div>
            <span className="text-[11px] text-[#444]">build.same engine v4</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#444]">
            <span>SSE live</span>
            <span>22 stages</span>
            <span>7 quality gates</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
