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

echo "Synced to: CLAUDE.md, GEMINI.md, COPILOT.md"
echo "Done."
