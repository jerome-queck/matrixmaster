# Project Structure

Matrix Master is a Vite, React, TypeScript, and Electron app. The repository is
organized around app shell, feature surfaces, math engines, persistence, and
desktop packaging.

## Root

- `App.tsx` - main React app composition.
- `index.tsx` - React entry point.
- `index.html` - Vite HTML template.
- `index.css` - global styles and design tokens.
- `types.ts` - shared app types.
- `global.d.ts` - ambient declarations.
- `metadata.json` - app metadata consumed by the UI.

## Application Modules

- `app/` - core primary route ownership, route registry, shell navigation,
  command palette, and result shell.
- `components/` - reusable UI components and view-level building blocks.
- `features/` - feature surfaces for solve, operate, analyze, library, spaces,
  maps, orthogonality, and advanced tools. Do not redeclare core primary
  navigation routes from `app/routes/coreRoutes.ts`.
- `hooks/` - React hooks for workers, batch flows, and delayed state.
- `services/` - matrix service logic, exports, clipboard, storage, hashing, LRU,
  async dedupe, and worker entry points.

## Math And Persistence

- `engines/exact/` - exact algebra contracts, engine logic, and result actions.
- `engines/numeric/` - numeric decompositions, eigen/canonical routines,
  orthogonality, iterative solvers, and helpers.
- `persistence/local/` - local library store.
- `persistence/workspace/` - `.mmatrix` codec and workspace persistence.
- `persistence/recovery/` - recovery copy helpers.
- `persistence/exports/` - export and report metadata helpers.

## Desktop, Tests, And Tooling

- `electron/` - Electron main and preload sources plus Electron TypeScript
  config.
- `tests/` - calculation, persistence, service, hook, React UI, and Playwright
  e2e tests.
- `scripts/` - normalized test workflow runner and release artifact checks.
- `assets/` - desktop app icons and build resources.
- `.github/workflows/` - release check and artifact build workflows.
- `patches/` - `patch-package` patches applied after install.

## Export Boundaries

Use `index.ts` barrel files only for stable domain boundaries such as
`persistence/` or numeric engine exports. Within a domain, prefer direct imports
from the file that owns the behavior. Do not add barrels to every folder just
for symmetry.

## Generated Outputs

These should stay out of version control:

- `node_modules/`
- `dist/`
- `electron-dist/`
- `.cache/`
