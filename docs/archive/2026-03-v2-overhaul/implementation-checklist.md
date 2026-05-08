# Matrix Master v2 Plan Coverage Checklist

Date: 2026-03-02
Sources:
- `./plan.md`
- `./runbook.md`

Status legend:
- `done`
- `partial`
- `not done`

## Cross-cutting locked decisions

- Electron desktop only (Windows/macOS), no mobile/native Apple shell: `done`
- `.mmatrix` remains canonical workspace/share format: `partial`
- Fully local (no cloud/auth/account): `done`
- Preserve LaTeX renderer/export path: `partial`
- Keep Matrix Master UX posture and More-menu model: `done`

## Stream A (Shell, seams, Library top-level route)

- Shell extraction from `App.tsx` into `app/shell`, `app/routes`, `app/registry`: `partial`
- Four primary destinations (System Solver, Matrix Operations, Analysis, Library): `done`
- More menu limited to secondary actions: `done`
- Contracts added (`FeatureRoute`, `ToolDescriptor`, `ResultAction`): `done`
- Command palette shell + keyboard scaffold: `done`
- Result-shell normalization contract (answer -> diagnostics -> actions -> steps -> explanation -> export): `done`
- Smoke tests for route switching and command palette path: `partial`

Evidence:
- `app/registry/contracts.ts`
- `app/registry/routeRegistry.ts`
- `app/routes/coreRoutes.ts`
- `app/shell/TopNavigation.tsx`
- `app/shell/MoreMenu.tsx`
- `app/shell/CommandPalette.tsx`
- `app/shell/ResultShell.tsx`
- `App.tsx`
- `tests/ui/App.integration.test.tsx`

## Stream B (Local Library, persistence, `.mmatrix`, history/recovery/import-export)

- First-class Library route visible in shell: `done`
- Local persistence v2 plumbing: `partial`
- `.mmatrix` schema versioning + compatibility layer: `partial`
- Saved object expansion beyond matrices (vectors, vector sets, bases, maps, workspaces): `partial`
- History/recents/folders/tags/favorites integration: `partial`
- Recovery-copy + report metadata plumbing: `partial`
- Import/export runtime wiring to new codec/store path: `partial`

Evidence:
- `features/library/contracts.ts`
- `features/library/state.ts`
- `features/library/compat.ts`
- `persistence/local/libraryStore.ts`
- `persistence/workspace/mmatrixCodec.ts`
- `persistence/recovery/recoveryCopies.ts`
- `persistence/exports/reportMetadata.ts`
- `tests/persistence/libraryStore.test.ts`
- `tests/persistence/mmatrixCodec.test.ts`
- `App.tsx`

## Stream C (Exact algebra, vectors/spaces/maps)

- Exact object models: `done`
- Vector/vector-set/matrix editors: `partial`
- Vector arithmetic + matrix-vector workflows: `done`
- Span/independence/basis/coordinates/dimension: `done`
- Fundamental subspaces + rank-nullity + subspace operations: `done`
- Linear maps + basis representations + change of basis + similarity: `done`
- Result actions + LaTeX/export integration into existing global UX/report flows: `partial`

Evidence:
- `engines/exact/contracts.ts`
- `engines/exact/algebraEngine.ts`
- `engines/exact/resultActions.ts`
- `features/operate/ExactEditors.tsx`
- `features/operate/OperateSurface.tsx`
- `features/spaces/SpacesSurface.tsx`
- `features/maps/MapsSurface.tsx`
- `features/solve/SolveSurface.tsx`
- `features/solve/ExactAlgebraStudio.tsx`
- `App.tsx`

## Stream D (Analyze, orthogonality, canonical forms, advanced desktop tools)

- Analyze category registry/discoverability contracts: `partial`
- LU/QR/SVD/eigen hardening: `partial`
- Orthogonality + least-squares workflows: `partial`
- Minimal polynomial/Jordan canonical workflows: `partial`
- Sparse/iterative re-home to coherent Analyze/Advanced structure: `partial`
- Integration into app routes/UI with consistent reuse/export/LaTeX conventions: `partial`

Evidence:
- `features/analyze/contracts.ts`
- `features/analyze/registry.ts`
- `features/advanced/contracts.ts`
- `features/advanced/registry.ts`
- `features/orthogonality/workflows.ts`
- `engines/numeric/decompositions.ts`
- `engines/numeric/eigenCanonical.ts`
- `engines/numeric/orthogonality.ts`
- `engines/numeric/iterative.ts`
- `App.tsx`

## Ordered remaining execution queue

1. Stream A: Register feature-route extensions at app bootstrap and consume them in routing/command-palette flows.
2. Stream A: Add smoke tests for all four primary routes and command palette open/filter/execute route behavior.
3. Stream B: Wire App runtime save/load/import/export to `persistence/local/libraryStore` and `persistence/workspace/mmatrixCodec` with legacy fallback.
4. Stream B: Move Library UI state from legacy `SavedMatrix[]` shape toward catalog-backed state (`features/library/state`), including favorites/recents/history plumbing.
5. Stream C: Promote Exact Algebra Studio discoverability beyond modal-only launch (route/registry driven).
6. Stream C: Bridge Exact result surfaces into global report/export pipeline.
7. Stream D: Expose Analyze/Advanced workflows via consistent route-driven surfaces (reduce modal-only dependencies).
8. Stream D: Normalize Stream D reuse/export/LaTeX/report behavior across all advanced workflows.
9. Stream C/D: Add targeted tests for new routing, export wiring, and critical math workflow regressions.

## Queue execution update (2026-03-02, follow-up pass)

- Queue 1: `done`
  - Feature-route bootstrap added and consumed at app init.
  - Route-extension registration made idempotent.
- Queue 2: `done`
  - Added route switching and command-palette smoke coverage in UI tests.
- Queue 3: `done`
  - App import/export now attempts codec-first `.mmatrix` handling with explicit legacy fallback.
  - App library bootstrap/save now wired through `libraryStore`.
- Queue 4: `partial`
  - Updated to `done` in follow-up pass:
  - App runtime and Library UI are now catalog-first, with kind filtering and favorites/recents/history visibility while preserving compatibility flows.
- Queue 5: `done`
  - Exact Algebra Studio now has route-driven discoverability from Analysis + command palette.
- Queue 6: `done`
  - Exact outputs are now auto-bridged into shared report/export behavior through adapter-driven publishing from exact surfaces.
  - Caveat: exact cards without matrix actions may use fallback/prior matrix context for shared report shape.
- Queue 7: `done`
  - Analyze/Advanced discoverability panel added with route-mapped launcher behavior.
- Queue 8: `done`
  - Stream D route-driven normalization now covers decomposition, eigen/canonical, orthogonality/least-squares, iterative, and matrix-functions surfaced paths.
  - Caveat: routes that require user-provided inputs cannot publish normalized computed results until valid data is available.
- Queue 9: `done` (test additions)
  - Added targeted tests for route discovery, codec migration/fallback behavior (codec-layer), and report/adaptor normalization.
