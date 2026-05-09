#!/usr/bin/env bash
set -euo pipefail

printf "\n== Matrix Master: quick verification (web) ==\n"

printf "\n[1/5] Cleaning generated outputs...\n"
npm run clean:generated

printf "\n[2/5] Checking workspace hygiene...\n"
npm run check:workspace

printf "\n[3/5] Checking package version...\n"
node scripts/check-version.js

printf "\n[4/5] Running tests...\n"
npm run test

printf "\n[5/5] Building web bundle...\n"
npm run build

printf "\n✅ Quick verification complete.\n"
