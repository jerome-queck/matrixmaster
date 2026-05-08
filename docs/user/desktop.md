# Desktop App

Matrix Master packages the same offline-first workspace as an Electron desktop
app for macOS and Windows.

## Development

Run:

```bash
npm run electron:dev
```

This starts Vite and launches Electron against the dev server.

## Build

Run:

```bash
npm run electron:build
```

This builds the web app and compiles the Electron main/preload sources.

## Package

Run:

```bash
npm run electron:dist
```

This packages desktop artifacts through Electron Builder. Release candidates
should use `npm run release:check` so tests and artifact checks run in the same
gate.

## Updates

Desktop builds use GitHub Releases for update checks. The app remains fully
local for calculations and workspace data; update checks are the only expected
network call in packaged desktop builds.
