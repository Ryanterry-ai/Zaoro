"use client";

import { useState } from "react";

interface PipelineStage {
  id: string;
  label: string;
  phase: string;
}

interface PipelineEvent {
  stage: string;
  status: "active" | "done" | "failed" | "skipped";
  ts?: number;
  message?: string;
}

const PIPELINE: PipelineStage[] = [
  { id: "bi", label: "BI", phase: "Understanding Business" },
  { id: "research", label: "Research", phase: "Understanding Business" },
  { id: "design-dna", label: "DNA", phase: "Understanding Business" },
  { id: "architect", label: "Arch", phase: "Planning Application" },
  { id: "design", label: "Design", phase: "Planning Application" },
  { id: "components", label: "Comp", phase: "Generating Code" },
  { id: "assets", label: "Assets", phase: "Generating Code" },
  { id: "motion", label: "Motion", phase: "Generating Code" },
  { id: "synthesize", label: "Synth", phase: "Generating Code" },
  { id: "ux-eval", label: "UX", phase: "Generating Code" },
  { id: "biz-eval", label: "Biz", phase: "Generating Code" },
  { id: "assembly", label: "Assembly", phase: "Generating Code" },
  { id: "correction", label: "Fix", phase: "Generating Code" },
  { id: "compile", label: "Compile", phase: "Quality Check" },
  { id: "browser-verify", label: "Verify", phase: "Quality Check" },
  { id: "repair", label: "Repair", phase: "Quality Check" },
  { id: "quality-gate", label: "Gate", phase: "Quality Check" },
  { id: "content-gate", label: "Content", phase: "Quality Check" },
  { id: "preview", label: "Preview", phase: "Quality Check" },
  { id: "complete", label: "Done", phase: "Quality Check" },
];

const PHASES = ["Understanding Business", "Planning Application", "Generating Code", "Quality Check"];

function statusForStage(
  stageId: string,
  events: PipelineEvent[],
): "pending" | "active" | "done" | "failed" | "skipped" {
  for (const ev of events) {
    if (ev.stage === stageId) {
      if (ev.status === "failed") return "failed";
      if (ev.status === "done") return "done";
      if (ev.status === "active") return "active";
      if (ev.status === "skipped") return "skipped";
    }
  }
  const doneIdx = events.findIndex((e) => e.status === "done");
  if (doneIdx >= 0) {
    const stageIdx = PIPELINE.findIndex((s) => s.id === stageId);
    const lastDoneIdx = PIPELINE.findIndex(
      (s) => s.id === events[doneIdx]?.stage,
    );
    if (stageIdx < lastDoneIdx) return "done";
  }
  return "pending";
}

function phaseStatus(
  phase: string,
  events: PipelineEvent[],
): "pending" | "active" | "done" | "failed" {
  const stages = PIPELINE.filter((s) => s.phase === phase);
  let hasFailed = false;
  let hasActive = false;
  let allDone = true;

  for (const stage of stages) {
    const s = statusForStage(stage.id, events);
    if (s === "failed") hasFailed = true;
    if (s === "active") hasActive = true;
    if (s !== "done" && s !== "skipped") allDone = false;
  }

  if (hasFailed) return "failed";
  if (hasActive) return "active";
  if (allDone) return "done";
  return "pending";
}

function phaseDuration(
  phase: string,
  events: PipelineEvent[],
): number | null {
  const stages = PIPELINE.filter((s) => s.phase === phase);
  const timestamps = events
    .filter((e) => stages.some((s) => s.id === e.stage) && e.ts)
    .map((e) => e.ts!);
  if (timestamps.length < 2) return null;
  return Math.max(...timestamps) - Math.min(...timestamps);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function PipelineTimeline({
  events,
  compact,
}: {
  events: PipelineEvent[];
  compact?: boolean;
}) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  if (compact) {
    const done = events.filter((e) => e.status === "done").length;
    const totalDuration = events.length > 0 && events[0].ts
      ? (events[events.length - 1]?.ts ?? Date.now()) - events[0].ts
      : null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 flex-1">
            {PIPELINE.map((stage) => {
              const s = statusForStage(stage.id, events);
              return (
                <div
                  key={stage.id}
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                    s === "done"
                      ? "bg-green-500"
                      : s === "active"
                        ? "bg-accent animate-pulse"
                        : s === "failed"
                          ? "bg-red-500"
                          : s === "skipped"
                            ? "bg-zinc-600"
                            : "bg-zinc-700"
                  }`}
                  title={`${stage.label}: ${s}`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-muted flex-shrink-0">
            {done}/{PIPELINE.length}
            {totalDuration !== null && <span className="ml-1">({formatDuration(totalDuration)})</span>}
          </span>
        </div>

        {/* Phase summary */}
        <div className="flex items-center gap-1.5">
          {PHASES.map((phase) => {
            const ps = phaseStatus(phase, events);
            const dur = phaseDuration(phase, events);
            return (
              <button
                key={phase}
                onClick={() => setExpandedPhase(expandedPhase === phase ? null : phase)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
                  ps === "done"
                    ? "bg-green-500/10 text-green-400"
                    : ps === "active"
                      ? "bg-accent/10 text-accent"
                      : ps === "failed"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-zinc-700/50 text-zinc-600"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  ps === "done" ? "bg-green-500" : ps === "active" ? "bg-accent" : ps === "failed" ? "bg-red-500" : "bg-zinc-600"
                }`} />
                {phase.split(" ")[0]}
                {dur !== null && <span className="opacity-60">{formatDuration(dur)}</span>}
              </button>
            );
          })}
        </div>

        {/* Expanded phase details */}
        {expandedPhase && (
          <div className="rounded-lg bg-surface-hover border border-border p-2 space-y-1">
            {PIPELINE.filter((s) => s.phase === expandedPhase).map((stage) => {
              const s = statusForStage(stage.id, events);
              const ev = events.find((e) => e.stage === stage.id);
              return (
                <div key={stage.id} className="flex items-center justify-between text-[10px] px-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      s === "done" ? "bg-green-500" : s === "active" ? "bg-accent" : s === "failed" ? "bg-red-500" : "bg-zinc-600"
                    }`} />
                    <span className={s === "done" ? "text-green-400" : s === "active" ? "text-accent" : s === "failed" ? "text-red-400" : "text-zinc-600"}>
                      {stage.label}
                    </span>
                  </div>
                  {ev?.message && <span className="text-muted truncate max-w-[200px]">{ev.message}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-1 overflow-x-auto">
      {PIPELINE.map((stage) => {
        const s = statusForStage(stage.id, events);
        return (
          <div
            key={stage.id}
            className="flex flex-col items-center gap-0.5 flex-shrink-0"
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                s === "done"
                  ? "bg-green-500"
                  : s === "active"
                    ? "bg-accent animate-pulse"
                    : s === "failed"
                      ? "bg-red-500"
                      : s === "skipped"
                        ? "bg-zinc-600"
                        : "bg-zinc-700"
              }`}
            />
            <span
              className={`text-[8px] font-medium ${
                s === "active"
                  ? "text-accent"
                  : s === "done"
                    ? "text-green-400"
                    : s === "failed"
                      ? "text-red-400"
                      : "text-zinc-600"
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
