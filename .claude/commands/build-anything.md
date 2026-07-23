Run the Build.Anything pipeline for the given prompt.

Steps:
1. Execute: `npx tsx src/app/build-anything-cli.ts "$ARGUMENTS"`
2. Wait for the CLI to write `agent-task.md` to the project workspace
3. Read `agent-task.md` in full
4. Follow the ## ⚡ Action Required section exactly — write every component
   file listed to the exact paths specified
5. Do not summarize or describe the files — write them to disk

The pipeline is deterministic. Your job is to generate the TSX files the
spec describes. You ARE the LLM in this loop.
