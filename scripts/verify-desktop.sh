#!/usr/bin/env bash
set -euo pipefail

export ELECTRON_BUILDER_CACHE="${ELECTRON_BUILDER_CACHE:-$PWD/.cache/electron-builder}"
mkdir -p "$ELECTRON_BUILDER_CACHE"

printf "\n== Matrix Master: desktop verification (Electron) ==\n"

printf "\n[1/3] Cleaning generated outputs...\n"
npm run clean:generated

printf "\n[2/3] Packaging desktop artifacts...\n"
npm run electron:dist -- --publish=never

printf "\n[3/3] Checking release artifacts...\n"
node scripts/check-release-artifacts.js

printf "\n✅ Desktop verification complete.\n"
