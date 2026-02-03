#!/usr/bin/env bash
set -euo pipefail

printf "\n== Matrix Master: quick verification (web) ==\n"

printf "\n[1/3] Running unit tests...\n"
npm test

printf "\n[2/3] Building web bundle...\n"
npm run build

printf "\n[3/3] Quick sanity checks...\n"
node -e "const p=require('./package.json'); if(!p.version||p.version==='0.0.0'){console.error('Version must be set (package.json).'); process.exit(1)}; console.log('Version:', p.version);"

printf "\n✅ Quick verification complete.\n"
