#!/usr/bin/env bash
set -euo pipefail

printf "\n== Matrix Master: full verification ==\n"

./scripts/verify.sh
./scripts/verify-desktop.sh

printf "\n✅ Full verification complete.\n"
