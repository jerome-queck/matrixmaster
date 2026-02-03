# Matrix Master

Matrix Master is an offline-first linear algebra workspace for numeric and symbolic computation. It runs fully offline, stores data locally, and supports desktop packaging for macOS and Windows.

## Feature Overview

### Core Solvers
- **System Solver** — Row-reduction with step-by-step elimination.
- **Matrix Operations** — Evaluate expressions like `A * B`, `A^T`, `A^{-1}` and more.
- **Determinant of Operation** — Compute determinants of matrix expressions.
- **Analysis** — Rank, trace, LU/QR/SVD, eigenvalues/vectors, and related diagnostics.

### Advanced Tools
- **Iterative Solvers** — Jacobi, Gauss–Seidel, CG, GMRES with preconditioning.
- **Symbolic Simplifier** — Rule-by-rule algebra cleanup.
- **Batch Runner** — Run expressions or analysis across saved matrices.
- **Sparse View** — CSR/CSC representations.

### Productivity
- **Command Palette** — Quick actions (Cmd/Ctrl+K).
- **Project Versions** — Save/restore snapshots of your workspace.
- **History** — Time-based entries for previous runs.
- **Tutor Mode** — Guided explanations.

### Export & Sharing
- **CSV / LaTeX / JSON** export for matrices.
- **Clipboard** copy in CSV / LaTeX / JSON.
- **Share files** (`.mmatrix`) to transfer full workspace state.
- **Steps export**: Markdown + LaTeX, plus LaTeX-only copy/export for full workings.
- **Copy LaTeX on results** — one-click copy on displayed steps and matrices.

### Desktop App (Electron)
- **macOS + Windows** builds.
- **Auto-updates** via GitHub Releases.
- **Update center** in Settings with status, progress, and manual controls.
- **Update toast** when a new release is available.

## Requirements
- Node.js 18+ (recommended)
- npm

## Quick Start (Web)
```bash
npm install
npm run dev
```
Open the dev URL printed by Vite.

## Desktop App

### Development
```bash
npm run electron:dev
```

### Build (packaged installers)
```bash
npm run electron:dist
```
Artifacts are written to `dist/`.

### Windows build (from macOS)
```bash
npx electron-builder --win --x64 --publish=never
```

## Scripts
- `npm run dev` — Vite dev server
- `npm run build` — production web build
- `npm run preview` — preview web build
- `npm test` — calculation tests
- `npm run electron:dev` — Electron dev (Vite + main process)
- `npm run electron:dist` — packaged desktop installers

## Project Structure
- `App.tsx` — main UI and orchestration
- `components/` — UI building blocks
- `services/` — math + operations
- `tests/` — calculation tests
- `electron/` — Electron main/preload

## Offline Behavior
All calculations and exports run locally. The only network call in desktop builds is the optional update check against GitHub Releases.

## Troubleshooting
- macOS builds are unsigned; Gatekeeper may warn on first launch.
- Windows builds are unsigned; SmartScreen may warn on first launch.
- If exports appear empty, allow file downloads in your browser.

## License
TBD
