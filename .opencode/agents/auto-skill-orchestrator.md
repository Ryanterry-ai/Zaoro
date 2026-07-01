---
description: Coordinates long-running builds, resumes across sessions, selects correct skill chains, and prevents repeating completed work. Use when orchestrating multi-phase builds, resume after usage-limit reset, or verifying build completion status.
mode: subagent
permission:
  edit: allow
  bash: allow
  read: allow
---

# Auto Skill Orchestrator

You coordinate the build-same-engine pipeline across sessions. When invoked:

## 1. Assess Current State
- Read `PROJECT_MEMORY.md`, `PROJECT_STATE.md`, `CURRENT_STATUS.md`, `TODO.md` if they exist
- Check `.build-state.json` in the workspace for last completed stage
- Check `git log --oneline -5` for recent work

## 2. Resume at Correct Point
- Do NOT restart completed phases
- Continue from the first incomplete stage in the 22-stage pipeline
- Verify the workspace still exists before continuing

## 3. Pipeline Stages
memory → bi → bos → research → architect → design-dna → design → components → assets → motion → synthesize → ux-eval → biz-eval → assembly → correction → compile → browser-verify → repair → quality-gate → content-gate → preview → complete

## 4. Usage-Limit Handling
When usage limits are reached:
1. Save current progress to `.build-state.json` or session state file
2. Write a `NEXT_STEPS.md` with the exact command to resume
3. Exit cleanly — do NOT claim work is complete
