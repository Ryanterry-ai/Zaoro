#!/bin/bash
# Build Engine — Sync Agent Rules
# Regenerates platform-specific instruction files from AGENTS.md
# Usage: bash scripts/sync-agent-rules.sh

set -e

AGENTS_FILE="AGENTS.md"

if [ ! -f "$AGENTS_FILE" ]; then
  echo "Error: $AGENTS_FILE not found"
  exit 1
fi

echo "Syncing agent rules from $AGENTS_FILE..."

# Copy AGENTS.md to platform-specific files
cp "$AGENTS_FILE" "CLAUDE.md"
cp "$AGENTS_FILE" "GEMINI.md"
cp "$AGENTS_FILE" "COPILOT.md"

# OPENCODE.md is hand-curated — only copy the hard-rules section
if [ -f "OPENCODE.md" ]; then
  # Extract AGENTS.md hard rules and pipeline selection sections
  echo "" >> "OPENCODE.md"
  echo "<!-- BEGIN:hard-rules -->" >> "OPENCODE.md"
  sed -n '/^## Hard rules/,/^## /p' "$AGENTS_FILE" >> "OPENCODE.md"
  echo "<!-- END:hard-rules -->" >> "OPENCODE.md"
fi

echo "Synced to: CLAUDE.md, GEMINI.md, COPILOT.md"
echo "Done."
