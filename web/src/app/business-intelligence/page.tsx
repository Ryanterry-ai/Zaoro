"use client";

import { useState } from "react";

interface BIProblem {
  id: string;
  title: string;
  description: string;
  severity: string;
  impact_scores: { revenue: number; customer: number; operational: number; technical: number };
  total_impact: number;
  root_cause: string;
}

interface BIComponent {
  type: string;
  name: string;
  description: string;
  revenue_impact: number;
  features: string[];
  solves_problems: string[];
}

interface BIResult {
  report: {
    business_domain: string;
    industry: string;
    business_model: string;
    customer_type: string;
    primary_problem: string;
    desired_outcome: string;
    revenue_model: string;
  };
  problems: BIProblem[];
  solution: {
    components: BIComponent[];
    summary: string;
    total_revenue_impact: number;
    implementation_order: string[];
  };
  architecture: {
    system: { frontend: string[]; backend: string[]; database: string[]; apis: string[] };
    ai: { agents: Array<{ name: string; purpose: string; capabilities: string[] }> };
  };
  validation: { score: number; passed: boolean; deficiencies: string[] };
  total_duration_ms: number;
}

const EXAMPLE_PROMPTS = [
  "I run a dental clinic with 3 dentists. We use paper records and WhatsApp for appointments. I want to modernize and get more patients.",
  "We have a small online store selling handmade jewelry on Shopify. We do about $5K/month but want to scale to $50K.",
  "I am starting a coworking space in Bangalore. 200 seats, targeting startups and freelancers.",
  "We are a law firm with 5 attorneys. We need a CRM to track cases, clients, and billing.",
];

export default function BusinessIntelligencePage() {
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<string>("");

  const handleAnalyze = async () => {
    if (isAnalyzing || !prompt.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setPhase("Starting analysis...");

    try {
      const res = await fetch("/api/business-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.result);
      setPhase("");
    } catch (err: any) {
      setError(err.message);
      setPhase("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const severityColor = (s: string) =>
    s === "critical" ? "text-red-400 bg-red-950 border-red-800" :
    s === "important" ? "text-amber-400 bg-amber-950 border-amber-800" :
    "text-blue-400 bg-blue-950 border-blue-800";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-zinc-800 bg-zinc-950/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">Z</div>
            <span className="font-semibold text-lg">Zaoro</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Builder</a>
            <span className="text-sm text-emerald-400 font-medium">BI Engine</span>
          </div>
        </div>
      </nav>

      <main className="pt-24 px-6 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Business <span className="text-emerald-400">Intelligence</span> Engine
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Describe your business problem. The AI will analyze your industry, identify problems, and design a solution.
          </p>
        </div>

        {/* Input */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your business problem or opportunity..."
            className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
            disabled={isAnalyzing}
          />
          <div className="flex flex-wrap gap-2 mt-3 mb-4">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {ex.substring(0, 50)}...
              </button>
            ))}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !prompt.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? "Analyzing..." : "Run BI Pipeline"}
          </button>
          {phase && <p className="text-zinc-500 text-sm mt-2">{phase}</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl p-4 mb-8">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 pb-20">
            {/* Validation Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
              result.validation.passed
                ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                : "bg-amber-950 border-amber-800 text-amber-400"
            }`}>
              Validation: {result.validation.score}% {result.validation.passed ? "PASSED" : "NEEDS WORK"}
              <span className="text-zinc-500 ml-2">({(result.total_duration_ms / 1000).toFixed(1)}s)</span>
            </div>

            {/* Business Report */}
            <Section title="Business Analysis">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoCard label="Domain" value={result.report.business_domain} />
                <InfoCard label="Industry" value={result.report.industry} />
                <InfoCard label="Model" value={result.report.business_model} />
                <InfoCard label="Revenue" value={result.report.revenue_model} />
              </div>
              <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-400 font-medium">Primary Problem</p>
                <p className="text-white">{result.report.primary_problem}</p>
              </div>
              <div className="mt-2 p-4 bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-400 font-medium">Desired Outcome</p>
                <p className="text-white">{result.report.desired_outcome}</p>
              </div>
            </Section>

            {/* Problems */}
            <Section title={`Problems Identified (${result.problems.length})`}>
              <div className="space-y-3">
                {result.problems.map((p) => (
                  <div key={p.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 font-mono text-xs">{p.id}</span>
                          <h3 className="font-semibold text-white">{p.title}</h3>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{p.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">Root cause: {p.root_cause}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded border font-medium ${severityColor(p.severity)}`}>
                        {p.severity}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <ImpactBar label="Revenue" score={p.impact_scores.revenue} color="bg-red-500" />
                      <ImpactBar label="Customer" score={p.impact_scores.customer} color="bg-blue-500" />
                      <ImpactBar label="Ops" score={p.impact_scores.operational} color="bg-amber-500" />
                      <ImpactBar label="Tech" score={p.impact_scores.technical} color="bg-purple-500" />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Solution */}
            <Section title="Proposed Solution">
              <div className="p-4 bg-zinc-800 rounded-lg mb-4">
                <p className="text-white">{result.solution.summary}</p>
                <p className="text-emerald-400 text-sm mt-2 font-medium">
                  Revenue Impact: +{result.solution.total_revenue_impact}%
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.solution.components.map((c, i) => (
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{c.name}</h3>
                      <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-1 rounded">{c.type}</span>
                    </div>
                    <p className="text-sm text-zinc-400">{c.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.features.map((f, fi) => (
                        <span key={fi} className="text-xs bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-500 mt-2">+{c.revenue_impact}% revenue</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                <p className="text-sm text-zinc-400 font-medium mb-2">Build Order</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {result.solution.implementation_order.map((name, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs px-3 py-1 rounded-full">
                        {i + 1}. {name}
                      </span>
                      {i < result.solution.implementation_order.length - 1 && (
                        <span className="text-zinc-600">→</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </Section>

            {/* Architecture */}
            <Section title="System Architecture">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ArchCard title="Frontend" items={result.architecture.system.frontend} color="blue" />
                <ArchCard title="Backend" items={result.architecture.system.backend} color="purple" />
                <ArchCard title="Database" items={result.architecture.system.database} color="amber" />
              </div>
              {result.architecture.ai.agents.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-zinc-400 font-medium mb-2">AI Agents</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.architecture.ai.agents.map((a, i) => (
                      <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                        <h4 className="font-medium text-white text-sm">{a.name}</h4>
                        <p className="text-xs text-zinc-400 mt-1">{a.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3">
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function ImpactBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-400">{score}/10</span>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

function ArchCard({ title, items, color }: { title: string; items: string[]; color: string }) {
  const border: Record<string, string> = { blue: "border-blue-800", purple: "border-purple-800", amber: "border-amber-800" };
  const text: Record<string, string> = { blue: "text-blue-400", purple: "text-purple-400", amber: "text-amber-400" };
  return (
    <div className={`bg-zinc-800 border ${border[color]} rounded-lg p-4`}>
      <h3 className={`font-semibold ${text[color]} text-sm mb-2`}>{title}</h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-zinc-400">• {item}</li>
        ))}
      </ul>
    </div>
  );
}
