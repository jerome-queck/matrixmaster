#!/usr/bin/env bash
set -euo pipefail

export ELECTRON_BUILDER_CACHE="${ELECTRON_BUILDER_CACHE:-$PWD/.cache/electron-builder}"
mkdir -p "$ELECTRON_BUILDER_CACHE"

printf "\n== Matrix Master: release candidate check ==\n"

printf "\n[1/4] Checking package version...\n"
node scripts/check-version.js

printf "\n[2/4] Running tests...\n"
npm run test

printf "\n[3/4] Packaging desktop artifacts...\n"
npm run electron:dist -- --publish=never

printf "\n[4/4] Checking release artifacts...\n"
node scripts/check-release-artifacts.js

printf "\nRelease candidate check complete.\n"
