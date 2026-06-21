"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "A SaaS dashboard with user authentication and analytics",
  "An e-commerce store with product listings and cart",
  "A portfolio website with blog and contact form",
  "A project management tool with kanban boards",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const router = useRouter();

  const handleBuild = async () => {
    if (!prompt.trim() || isBuilding) return;
    setIsBuilding(true);

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/workspace/${data.id}`);
      }
    } catch {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-sm font-bold">
            b
          </div>
          <span className="text-lg font-semibold">build.same</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>v4 Engine</span>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              Describe it.{" "}
              <span className="text-accent">We build it.</span>
            </h1>
            <p className="text-lg text-muted max-w-md mx-auto">
              AI-powered code generation with self-healing compilation.
              From prompt to production in seconds.
            </p>
          </div>

          {/* Prompt Input */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-surface p-1 transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleBuild();
                  }
                }}
                placeholder="What do you want to build?"
                rows={3}
                className="w-full bg-transparent px-4 py-3 text-base resize-none outline-none placeholder:text-muted"
                disabled={isBuilding}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-xs text-muted">
                  Press Enter to build
                </span>
                <button
                  onClick={handleBuild}
                  disabled={!prompt.trim() || isBuilding}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isBuilding ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Building...
                    </>
                  ) : (
                    <>
                      Build
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="px-4 py-2 rounded-full text-sm text-muted border border-border bg-surface hover:bg-surface-hover hover:text-foreground transition-all"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted pt-4">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Self-healing compilation
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              AST-first code synthesis
            </div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Live preview
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
