"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "A SaaS dashboard with user authentication and analytics",
  "An e-commerce store with product listings and cart",
  "A portfolio website with blog and contact form",
  "A project management tool with kanban boards",
];

const INDUSTRY_TEMPLATES = [
  { label: "SaaS Dashboard", desc: "Analytics, auth, billing", icon: "◆" },
  { label: "E-commerce", desc: "Products, cart, checkout", icon: "■" },
  { label: "Healthcare", desc: "Patients, appointments, records", icon: "▲" },
  { label: "Real Estate", desc: "Listings, tours, mortgage calc", icon: "●" },
  { label: "ERP/Enterprise", desc: "Employees, inventory, finance", icon: "◆" },
  { label: "Restaurant", desc: "Menu, reservations, delivery", icon: "■" },
  { label: "Fitness", desc: "Classes, plans, scheduling", icon: "▲" },
  { label: "Education", desc: "Courses, students, grades", icon: "●" },
  { label: "Finance", desc: "Accounts, transactions, reports", icon: "◆" },
  { label: "Media/Content", desc: "Articles, galleries, subs", icon: "■" },
  { label: "Legal", desc: "Cases, documents, billing", icon: "▲" },
  { label: "Agency", desc: "Portfolio, services, quotes", icon: "●" },
];

const CAPABILITIES = [
  { label: "Landing Pages", desc: "Beautiful marketing sites with hero, features, pricing" },
  { label: "Dashboards", desc: "Admin panels with charts, tables, and data" },
  { label: "E-commerce", desc: "Full storefronts with cart, checkout, inventory" },
  { label: "SaaS Apps", desc: "Subscription products with auth and billing" },
  { label: "Portfolios", desc: "Personal and agency sites with galleries" },
  { label: "Enterprise", desc: "ERP, CRM, HRM with roles and workflows" },
];

type Mode = "build" | "clone";

export default function Home() {
  const [mode, setMode] = useState<Mode>("build");
  const [prompt, setPrompt] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [recentBuilds, setRecentBuilds] = useState<Array<{ id: string; prompt: string; createdAt: string }>>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => setRecentBuilds(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {});
  }, []);

  const handleBuild = async () => {
    if (isBuilding) return;

    if (mode === "clone") {
      if (!cloneUrl.trim()) return;
      setIsBuilding(true);
      try {
        const res = await fetch("/api/clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cloneUrl.trim() }),
        });
        const data = await res.json();
        if (data.id) {
          router.push(`/workspace/${data.id}`);
        }
      } catch {
        setIsBuilding(false);
      }
    } else {
      if (!prompt.trim()) return;
      setIsBuilding(true);
      try {
        const res = await fetch("/api/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), pipeline: true }),
        });
        const data = await res.json();
        if (data.id) {
          router.push(`/workspace/${data.id}`);
        }
      } catch {
        setIsBuilding(false);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-sm font-bold">b</div>
          <span className="text-lg font-semibold">build.same</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>v4 Engine</span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 pb-24">
        <div className="w-full max-w-2xl mt-16 mb-12 text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Describe it.{" "}
            <span className="text-accent">We build it.</span>
          </h1>
          <p className="text-lg text-muted max-w-md mx-auto">
            AI-powered code generation with self-healing compilation.
            From prompt to production in seconds.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-xl border border-border bg-surface p-1">
            <button
              onClick={() => setMode("build")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mode === "build" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                Build
              </span>
            </button>
            <button
              onClick={() => setMode("clone")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${mode === "clone" ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                Clone
              </span>
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="w-full max-w-2xl mb-8">
          <div className="rounded-2xl border border-border bg-surface p-1 transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            {mode === "clone" ? (
              <input
                type="url" value={cloneUrl} onChange={(e) => setCloneUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBuild(); } }}
                placeholder="https://example.com"
                className="w-full bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted"
                disabled={isBuilding}
              />
            ) : (
              <textarea
                value={prompt} onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBuild(); } }}
                placeholder="What do you want to build?"
                rows={3}
                className="w-full bg-transparent px-4 py-3 text-base resize-none outline-none placeholder:text-muted"
                disabled={isBuilding}
              />
            )}
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-xs text-muted">{mode === "build" ? "Press Enter to build" : "Enter a URL to clone"}</span>
              <button
                onClick={handleBuild}
                disabled={(mode === "build" ? !prompt.trim() : !cloneUrl.trim()) || isBuilding}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isBuilding ? (
                  <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{mode === "clone" ? "Cloning..." : "Building..."}</>
                ) : (
                  <>{mode === "clone" ? "Clone" : "Build"}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
                )}
              </button>
            </div>
          </div>

          {/* Examples (build mode only) */}
          {mode === "build" && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {EXAMPLE_PROMPTS.map((example) => (
                <button key={example} onClick={() => setPrompt(example)}
                  className="px-4 py-2 rounded-full text-sm text-muted border border-border bg-surface hover:bg-surface-hover hover:text-foreground transition-all"
                >{example}</button>
              ))}
            </div>
          )}
        </div>

        {/* Templates section */}
        <div className="w-full max-w-4xl mb-12">
          <div className="text-sm font-medium text-muted mb-4 text-center">Industry Templates</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {INDUSTRY_TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => { setPrompt(`Build a ${t.label.toLowerCase()}: ${t.desc}`); setMode("build"); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/50 transition-all"
              >
                <span className="text-lg text-accent">{t.icon}</span>
                <span className="text-[11px] font-medium text-foreground">{t.label}</span>
                <span className="text-[9px] text-muted text-center leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities showcase */}
        <div className="w-full max-w-4xl mb-12">
          <div className="text-sm font-medium text-muted mb-4 text-center">What you can build</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CAPABILITIES.map((c) => (
              <button key={c.label} onClick={() => { setPrompt(`Build a ${c.label.toLowerCase()}: ${c.desc}`); setMode("build"); }}
                className="text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/50 transition-all"
              >
                <div className="text-sm font-medium text-foreground">{c.label}</div>
                <div className="text-[11px] text-muted mt-1">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent builds */}
        {recentBuilds.length > 0 && (
          <div className="w-full max-w-4xl mb-12">
            <div className="text-sm font-medium text-muted mb-4 text-center">Recent Builds</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentBuilds.map((b) => (
                <button key={b.id} onClick={() => router.push(`/workspace/${b.id}`)}
                  className="text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-all"
                >
                  <div className="text-[11px] font-mono text-muted/60">{b.id.slice(0, 20)}...</div>
                  <div className="text-xs text-foreground mt-1 line-clamp-2">{b.prompt || "Untitled"}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 text-sm text-muted">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Self-healing compilation
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            AST-first code synthesis
          </div>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            Live preview
          </div>
        </div>
      </main>
    </div>
  );
}
