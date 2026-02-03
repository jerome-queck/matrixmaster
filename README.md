# Matrix Master

Offline-first linear algebra workspace for numeric and symbolic computation. Designed to run fully offline with local storage, exports, and desktop packaging.

## Highlights
- System solver with step-by-step elimination
- Matrix operations, determinant of operation, and analysis tools
- Iterative solvers (Jacobi, GS, CG, GMRES)
- Symbolic simplifier with rule-by-rule output
- Practice mode, command palette, and project versions
- Export to CSV/JSON/LaTeX and clipboard copy
- Desktop apps for macOS and Windows (Electron)

## Requirements
- Node.js 18+ (recommended)
- npm

## Quick Start (Web)
```bash
npm install
npm run dev
```
Open the dev URL printed by Vite.

## Desktop App (Electron)
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

## Export / Import
- Export matrices as CSV or LaTeX
- Copy matrices to clipboard as CSV/LaTeX/JSON
- Export full app state as JSON or share file (`.mmatrix`)
- Import CSV/TSV/LaTeX into a selected matrix target

## Updates (Desktop)
- Auto-updates are wired to GitHub Releases
- Settings shows current version, latest version, and update status
- Manual controls: check, download, restart to apply
- Toast appears when an update is available

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
