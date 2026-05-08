# Changelog

Purpose:
- Provide a single, versioned record of user-visible changes.
- Ensure PRs map cleanly to release notes.

Update rules:
- Every user-visible or release-relevant PR must update `Unreleased` with
  bullet(s) in the right section.
- Docs-only or internal-only PRs with no release-note impact may state
  `No changelog entry` in the PR.
- On release, move `Unreleased` entries into a new version section.
- Use the actual release date (YYYY-MM-DD).

Source of truth:
- Release notes drive entries here.

## Unreleased
### Added

### Changed
- Reorganized repository documentation and contributor instructions under
  `docs/`, `README.md`, and `AGENTS.md` with no app behavior changes.
- Standardized development and release verification scripts so local tests,
  desktop packaging, release metadata checks, and CI artifact builds follow the
  same command flow.

### Fixed

### Deprecated

### Removed
- Removed tracked generated `node_modules/` files and a duplicate
  `patch-package` patch from version control.
- Removed stale internal Superpowers planning artifacts from the active docs
  tree.

### Security

## 1.4.0 - 2026-04-19
### Added
- Added the "Lab" theme — a warm parchment / inkwell-red aesthetic redesign handed off from Claude Design. Introduces full `--lab-*` design tokens (parchment surfaces, inkwell red / lab green / ink blue accents, Newsreader serif display + JetBrains Mono matrices + Caveat handwritten accents) and makes it the default visual direction.
- Added a macOS-style window chrome shell around the workspace (red/yellow/green traffic lights, centered `Matrix Master — Workspace.mmatrix` title) rendered on a dark radial-gradient "desktop" backdrop.
- Added a reusable hand-drawn `Bracket` SVG primitive (`components/lab/Bracket.tsx`) — the signature Lab aesthetic for matrix rendering.
- Added a new Lab-branded app icon (`assets/app-icon.png`, 512×512) and wired it as the site favicon.
- Added Google Fonts loading for Newsreader, JetBrains Mono, and Caveat in the Vite HTML template.

### Changed
- Default theme is now `lab`; default density is `compact` (previously `dark` / `comfortable`). Legacy stored `dark` / `light` values auto-migrate to `lab` on load so existing users flip to the new aesthetic without action.
- Restyled top-nav pill bar, panels, buttons, and inputs to use Lab tokens when `data-theme="lab"` is active. Retrofits legacy `--accent`, `--glass-*`, `.glass-btn-primary`, `.aurora-title`, and Tailwind blue/indigo utility classes into the parchment/inkwell-red palette so the whole surface inherits the new theme without rewriting each component.
- Hid the aurora blue radial-gradient wash and removed the residual blue gradient on `.tab.active` when in Lab theme.
- Dev server, `wait-on` script, and Electron `VITE_DEV_SERVER_URL` default moved from port `3000` → `5180` to avoid collisions with other local services on 3000.

### Fixed

### Deprecated

### Removed

### Security

## 1.3.1 - 2026-03-02
### Added
- Added route-bootstrap registration for feature routes so extension surfaces are wired into top-level navigation/command discovery without direct `App.tsx` edits.
- Added Analysis discovery panel and route-driven launch commands for advanced/exact workflows.
- Added deterministic input-required placeholder results for route entries that need user inputs before computation.
- Added targeted UI/persistence regression coverage for route discovery, report adapters, and `.mmatrix` compatibility behaviors.

### Changed
- Migrated runtime library persistence flow to catalog-first storage wiring while preserving legacy compatibility paths.
- Expanded shared report/export adapter wiring so exact and advanced route-driven workflows publish normalized result payloads more consistently.
- Updated report-mode resolution to infer from normalized result shape for better analysis/operations report rendering consistency.

### Fixed
- Removed prior/fallback matrix reuse for exact-card report adaptation; exact cards now publish deterministic per-card context instead of stale matrix state.
- Fixed analyze-route placeholder smoke tests to assert robustly with accessible-name/multi-match-safe queries.

### Deprecated

### Removed

### Security

## 1.3.0 - 2026-03-02
### Added
- Stream A: Added modular shell routing contracts (`FeatureRoute`, `ToolDescriptor`, `ResultAction`) and registry-driven top navigation with Library as a visible fourth primary destination.
- Stream A: Added command palette and keyboard shortcut scaffold, plus a result-shell wrapper contract for normalized output section ordering.
- Stream B: Added first-class local Library contracts/state for matrices, vectors, vector sets, bases, linear maps, and workspaces.
- Stream B: Added versioned `.mmatrix` workspace codec (schema v3), migration-safe decoding for legacy payloads, recovery-copy helpers, and report metadata utilities.
- Stream C: Added an exact algebra studio with workflows for vector arithmetic, matrix-vector products, span/independence/basis operations, subspace operations, and linear maps.
- Stream D: Added numeric analyze modules for decomposition/eigen workflows, orthogonality/least-squares workflows, iterative solver wrappers, and canonical-form descriptors.

### Changed
- Stream A: Refactored app shell seams into `app/shell`, `app/routes`, and `app/registry` modules while preserving the existing Matrix Master UX posture.
- Stream B: Extended shared workspace/library typing contracts to support additive local-persistence integration without replacing existing save/load behavior.
- Stream D: Introduced coherent Analyze category/advanced registries for improved discoverability and cleaner tool organization.
- Documentation: Updated `docs/archive/2026-03-v2-overhaul/plan.md` and `docs/archive/2026-03-v2-overhaul/runbook.md` to Codex CLI language with explicit 4-sub-agent mapping.

### Fixed
- Integration: Fixed JSX rendering parse failure in `features/maps/MapsSurface.tsx` for the basis-change label text.
- Build: Fixed `npm run electron:build` TypeScript type-library resolution by setting explicit Node types in `electron/tsconfig.json`.

### Deprecated

### Removed

### Security

## 1.2.2 - 2026-02-09
### Added

### Changed
- Narrowed Electron packaging inputs to include only runtime web assets (`dist/index.html` and `dist/assets/**`) to prevent recursive artifact bundling.

### Fixed
- Fixed Electron packaging reliability with modern Node versions by applying a persistent upstream patch for `app-builder-lib` command spawning.
- Normalized desktop installer artifact sizes by excluding release outputs from packaged app contents.

### Deprecated

### Removed

### Security

## 1.2.1 - 2026-02-06
### Added
- Added a core-first interface surface setting (`core` default, optional `advanced`) with persistence in local storage and shared-state imports.
- Added a consolidated `More` menu for secondary navigation: Advanced Tools, History, Export/Import, Settings, and Documentation.
- Added an Advanced Tools category hub (Data & Sharing, Study & Practice, Specialist Math, Workspace Utilities).

### Changed
- Simplified the default top-level UI to emphasize the three primary modes plus Calculate/Analyze, Reset, and matrix Save/Load.
- Removed dense top-right shortcut buttons and home quick-action cards from the default surface.
- Renamed Sparse View entry point to the student-friendly label "Sparse Matrix View."
- Updated integration coverage for the new More -> Advanced Tools navigation flow.
- Expanded integration coverage for the simplified core-first UX, including ui-surface persistence and cross-mode primary-action regression checks.

### Fixed

### Deprecated

### Removed

### Security

## 1.1.1 - 2026-02-05
### Added

### Changed
- Deferred command palette and library search filtering to keep typing responsive.
- Virtualized the library list in the load modal to reduce navigation stalls.
- Avoided rendering closed modal content to cut unnecessary UI work.

### Fixed

### Deprecated

### Removed

### Security

## 1.1.0 - 2026-02-04
### Added
- Added analysis metrics (determinant, norms, condition number) to results, reports, and exports.

### Changed
- Improved matrix operations expression UX with validation and matrix-name insert chips.
- Enhanced the operation builder with reorder/duplicate/insert controls, inline dimensions, and clearer error summaries.
- Cached matrix expression parsing and builder conversion to reduce recomputation.
- Added analysis warnings for singular or ill-conditioned matrices when SVD is computed.

### Fixed

### Deprecated

### Removed
- Removed the Determinant of Operation mode; legacy states now load as Matrix Operations.

### Security

## 1.0.6 - 2026-02-04
### Added

### Changed
- Added package metadata fields to improve desktop packaging diagnostics.

### Fixed
- Ensured desktop update actions report unsupported states instead of failing silently in dev builds.
- Made desktop updates manual to align with the UI-driven flow.
- Prevented Windows installs from failing on macOS-only `dmg-license`.

### Deprecated

### Removed

### Security

## 1.0.5 - 2026-02-04
### Added

### Changed

### Fixed
- Prevented calculation views from crashing when summarized row-operation steps omit matrices.
- Fixed result detail panels referencing an undefined `props` value during rendering.

### Deprecated

### Removed

### Security

## 1.0.4 - 2026-02-04
### Added

### Changed

### Fixed
- Guarded storage access to prevent crashes when storage is blocked or full.
- Improved clipboard operations with safe fallbacks and error handling.
- Hardened auto-update error messaging and release artifact checks.

### Deprecated

### Removed

### Security

## 1.0.3 - 2026-02-04
### Added

### Changed
- Documented release-driven workflow, changelog policy, and PR template usage.

### Fixed

### Deprecated

### Removed

### Security
