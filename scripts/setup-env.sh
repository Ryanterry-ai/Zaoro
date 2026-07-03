#!/usr/bin/env bash
# setup-env.sh — Ensure all runtime dependencies are present.
# Run after `npm install` to guarantee Playwright browsers and
# other binary dependencies are available.
set -euo pipefail

echo "=== Environment Setup ==="

# 1. Ensure Playwright browsers are installed
if command -v npx &> /dev/null; then
  echo "[1/2] Installing Playwright browsers..."
  npx playwright install chromium 2>&1 | tail -5
  echo "      Playwright chromium installed."
else
  echo "[1/2] SKIP: npx not found, Playwright browsers not installed"
fi

# 2. Verify critical binaries
echo "[2/2] Verifying critical binaries..."
MISSING=()
command -v node &> /dev/null || MISSING+=("node")
command -v npm &> /dev/null || MISSING+=("npm")
command -v npx &> /dev/null || MISSING+=("npx")

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing required binaries: ${MISSING[*]}"
  exit 1
fi

echo "=== Setup complete ==="
