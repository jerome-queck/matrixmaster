#!/usr/bin/env bash
set -euo pipefail

printf "\n== Matrix Master: quick verification (web) ==\n"

printf "\n[1/3] Checking package version...\n"
node scripts/check-version.js

printf "\n[2/3] Running tests...\n"
npm run test

printf "\n[3/3] Building web bundle...\n"
npm run build

printf "\n✅ Quick verification complete.\n"
