# Troubleshooting

## macOS Warns The App Is Unsigned

Current local builds are unsigned. macOS Gatekeeper may warn the first time you
open a downloaded build.

## Windows SmartScreen Warns The App Is Unsigned

Current local Windows builds are unsigned. SmartScreen may warn before first
launch.

## Exports Look Empty In The Browser

Allow file downloads for the browser tab and try the export again. Matrix
exports are generated locally.

## Desktop Update Metadata Is Missing

Run:

```bash
npm run verify:desktop
```

This rebuilds desktop artifacts and runs `scripts/check-release-artifacts.js`.
