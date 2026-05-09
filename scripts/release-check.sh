#!/usr/bin/env bash
set -euo pipefail

export ELECTRON_BUILDER_CACHE="${ELECTRON_BUILDER_CACHE:-$PWD/.cache/electron-builder}"
mkdir -p "$ELECTRON_BUILDER_CACHE"

printf "\n== Matrix Master: release candidate check ==\n"

printf "\n[1/6] Cleaning generated outputs...\n"
npm run clean:generated

printf "\n[2/6] Checking workspace hygiene...\n"
npm run check:workspace

printf "\n[3/6] Checking package version...\n"
node scripts/check-version.js

printf "\n[4/6] Running tests...\n"
npm run test

printf "\n[5/6] Packaging desktop artifacts...\n"
npm run electron:dist -- --publish=never

printf "\n[6/6] Checking release artifacts...\n"
node scripts/check-release-artifacts.js

printf "\nRelease candidate check complete.\n"
