#!/usr/bin/env bash
set -euo pipefail

printf "\n== Matrix Master: desktop verification (Electron) ==\n"

printf "\n[1/2] Building web + Electron main/preload...\n"
npm run electron:build

printf "\n[2/2] Packaging (Electron dist)...\n"
npm run electron:dist

printf "\n✅ Desktop verification complete.\n"
