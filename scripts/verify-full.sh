#!/usr/bin/env bash
set -euo pipefail

export ELECTRON_BUILDER_CACHE="${ELECTRON_BUILDER_CACHE:-$PWD/.cache/electron-builder}"
mkdir -p "$ELECTRON_BUILDER_CACHE"

printf "\n== Matrix Master: full verification ==\n"

./scripts/verify.sh
./scripts/verify-desktop.sh

printf "\n✅ Full verification complete.\n"
