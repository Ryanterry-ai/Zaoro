"use client";

interface PipelineStage {
  id: string;
  label: string;
}

interface PipelineEvent {
  stage: string;
  status: "active" | "done" | "failed" | "skipped";
}

const PIPELINE: PipelineStage[] = [
  { id: "bi", label: "BI" },
  { id: "research", label: "Research" },
  { id: "design-dna", label: "DNA" },
  { id: "architect", label: "Arch" },
  { id: "design", label: "Design" },
  { id: "components", label: "Comp" },
  { id: "assets", label: "Assets" },
  { id: "motion", label: "Motion" },
  { id: "synthesize", label: "Synth" },
  { id: "ux-eval", label: "UX" },
  { id: "biz-eval", label: "Biz" },
  { id: "assembly", label: "Assembly" },
  { id: "correction", label: "Fix" },
  { id: "compile", label: "Compile" },
  { id: "browser-verify", label: "Verify" },
  { id: "repair", label: "Repair" },
  { id: "quality-gate", label: "Gate" },
  { id: "content-gate", label: "Content" },
  { id: "preview", label: "Preview" },
  { id: "complete", label: "Done" },
];

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

export function PipelineTimeline({
  events,
  compact,
}: {
  events: PipelineEvent[];
  compact?: boolean;
}) {
  if (compact) {
    const active = events.find((e) => e.status === "active");
    const done = events.filter((e) => e.status === "done").length;
    return (
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
        </span>
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
