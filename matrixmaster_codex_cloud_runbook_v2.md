# Matrix Master Codex Cloud runbook

Use this runbook to drive 4 parallel Codex Cloud branches without wrecking the build.

---

## Working rules for all 4 branches

Every Codex branch must follow these rules:

1. This is a retrofit of the existing Electron repo, not a rewrite.
2. Preserve the current Matrix Master UX ideology and placements.
3. Keep the app desktop-only: Electron on Windows and macOS.
4. Keep `.mmatrix` as the canonical full-workspace/share format.
5. Keep the app fully local. Do not build cloud sync, auth, or account systems.
6. Keep the current LaTeX renderer/export approach. Extend it; do not replace it.
7. Keep the app buildable after each completed slice.
8. Respect `AGENTS.md` for PR, commit, verification, and release discipline.
9. Avoid broad simultaneous edits to `App.tsx`, `types.ts`, and `services/matrixService.ts`.
10. Prefer new modules and adapters over giant edits to old files.

### Required checks for each slice
```bash
npm run test
npm run build
npm run electron:build
```

### Required for larger checkpoints
```bash
npm run verify
npm run verify:desktop
```

### Release candidate check
```bash
npm run release:check
```

---

## Recommended branch names and PR intents

Use one Codex Cloud run per branch:

1. `codex/shell-library-route`
   - PR intent: `[minor] Shell seams and Library top-level route`

2. `codex/local-library-persistence`
   - PR intent: `[minor] Local Library, .mmatrix persistence, and history`

3. `codex/exact-algebra-spaces-maps`
   - PR intent: `[minor] Exact algebra, vectors, spaces, and linear maps`

4. `codex/analyze-orthogonality-advanced`
   - PR intent: `[minor] Analyze, orthogonality, and advanced roadmap tools`

### Changelog conflict avoidance
To reduce merge-conflict nonsense in `CHANGELOG.md`, have each stream append to its own subsection under `Unreleased`:
- `### Stream A`
- `### Stream B`
- `### Stream C`
- `### Stream D`

Only the final integration/release branch should collapse these into the final release notes.

---

## Merge order

### Merge first
1. Stream A slice 1
2. Stream A slice 2

### Merge next
3. Stream B slice 1
4. Stream C slice 1
5. Stream D slice 1

### Then continue in this order unless a dependency forces a swap
6. Stream B slice 2
7. Stream C slice 2
8. Stream C slice 3
9. Stream D slice 2
10. Stream B slice 3
11. Stream C slice 4
12. Stream D slice 3
13. Stream B slice 4
14. Stream C slice 5
15. Stream D slice 4
16. Stream B slice 5
17. Stream D slice 5
18. Final integration branch

This is not ceremonial wizard theater. It is how you avoid all four branches trying to sit in the same chair.

---

## Shared preamble for every Codex prompt

Paste this at the top of each Codex Cloud task:

```text
You are working in the existing Matrix Master Electron repository.
This is a retrofit, not a greenfield rewrite.
Preserve the current Matrix Master design ideology, calm desktop posture, primary workflow placements, More-menu posture, update-center behavior, and overall UX continuity.
The app must remain an Electron app for Windows and macOS only.
Do not build iOS, iPadOS, or native macOS shells.
Keep `.mmatrix` as the canonical full-workspace/share format.
This overhaul must remain fully local. Do not implement cloud sync, auth, account state, or remote backends.
Preserve the current LaTeX behavior. Keep the existing LaTeX renderer and export/copy approach; extend it for new features instead of replacing it.
Do not rewrite the whole app at once.
Keep the app buildable after every completed slice.
Prefer new modules and adapters over giant edits to old files.
Respect AGENTS.md, including PR discipline, commit discipline, verification gates, and release notes/changelog expectations.
Run and fix at least: npm run test && npm run build && npm run electron:build.
For larger slices, also run npm run verify && npm run verify:desktop.
Do not expose unfinished visible surfaces unless they are clearly gated.
```

---

## Stream A prompt - shell, seams, Library route

```text
Use the shared preamble.

You own Stream A.
Branch name: codex/shell-library-route
PR intent: [minor] Shell seams and Library top-level route

Mission:
Make the shell modular and build-safe while keeping the app recognizably Matrix Master.

Locked decisions:
- Library must become a visible fourth top-level destination.
- More must remain for secondary actions.
- App labels should stay aligned with the current app: System Solver, Matrix Operations, Analysis, Library.
- Do not replace the current design language.

Primary tasks:
1. Extract shell and routing logic out of App.tsx into app/shell, app/routes, and app/registry modules.
2. Introduce FeatureRoute, ToolDescriptor, ResultAction, and route-registry contracts.
3. Add a visible top-level Library route while preserving current More items for Advanced Tools, History, Export / Import, Settings, and Documentation.
4. Create route-level extension points so other streams can register feature surfaces without editing App.tsx heavily.
5. Normalize the result-page shell so the structure is answer -> diagnostics -> actions -> steps -> explanation -> export.
6. Add command-palette shell and keyboard-shortcut scaffold only. Do not fully populate every command yet.
7. Add smoke tests proving current top-level flows still render and switch correctly.

Rules:
- no heavy math implementation
- no persistence overhaul beyond what is required for routing seams
- no cloud/account work
- avoid changing user-facing labels except where Library becomes top-level
- keep current modal behavior intact unless the route replacement is already ready

Slice plan:
- Slice 1: app/ shell extraction + route registry + thinner App.tsx
- Slice 2: visible Library destination + More cleanup
- Slice 3: command palette shell + shortcut scaffold
- Slice 4: result-shell normalization + visibility gates

Done means:
- App.tsx is substantially thinner
- Library is a visible primary destination
- More still contains only true secondary items
- other streams can register routes/tools without owning App.tsx
- npm run test passes
- npm run build passes
- npm run electron:build passes
```

---

## Stream B prompt - local Library, `.mmatrix`, history, reports

```text
Use the shared preamble.

You own Stream B.
Branch name: codex/local-library-persistence
PR intent: [minor] Local Library, .mmatrix persistence, and history

Mission:
Turn Library into a first-class local-only product surface with durable persistence and clean import/export continuity.

Locked decisions:
- `.mmatrix` remains the canonical workspace/share format.
- The app remains fully local. Do not build sync backends, auth, or account state.
- Replace sync-oriented spec language with local durability, history, recovery copies, import/export, and versioned workspaces.

Primary tasks:
1. Create a first-class features/library module that fits the new shell seams.
2. Expand saved objects beyond matrices to vectors, vector sets, bases, maps, and workspaces.
3. Introduce schema-versioned `.mmatrix` workspace snapshots while keeping `.mmatrix` canonical.
4. Add migration-safe import/export paths for current and future `.mmatrix` versions.
5. Add history, recents, folders, tags, and favorites where appropriate.
6. Add overwrite-safe recovery behavior and recovery copies for destructive operations or incompatible imports.
7. Add report-friendly saved outputs and metadata using the current result/export model rather than screen scraping.
8. Keep manual export/import clean and discoverable from Library and existing Export / Import flows.

Rules:
- no cloud or sync backend
- no fake sync status UI
- no broad shell rewrites beyond Stream A extension points
- keep current save/load behavior working until replacements are ready
- preserve `.mmatrix` compatibility
- preserve current LaTeX export/copy conventions when adding new saved object types

Slice plan:
- Slice 1: Library data model + local persistence v2
- Slice 2: versioned `.mmatrix` codec + migration tests
- Slice 3: saved object expansion beyond matrices
- Slice 4: history / recents / tags / folders / favorites
- Slice 5: recovery copies, report metadata, import/export hardening

Done means:
- Library is a route, not just a scattered modal pattern
- `.mmatrix` remains canonical and versioned
- matrices, vectors, bases, maps, and workspaces can be saved/loaded locally
- import/export/history are stable and tested
- npm run test passes
- npm run build passes
- npm run electron:build passes
```

---

## Stream C prompt - exact algebra, vectors, spaces, and maps

```text
Use the shared preamble.

You own Stream C.
Branch name: codex/exact-algebra-spaces-maps
PR intent: [minor] Exact algebra, vectors, spaces, and linear maps

Mission:
Fill the biggest exact-math and object-model gaps while preserving current solve/operate behavior.

Locked decisions:
- Keep the current exact-vs-numeric posture.
- Preserve current LaTeX formatting style and extend it for new exact objects/results.
- New exact objects must support reuse, save-to-library, and export/copy hooks.

Primary tasks:
1. Add vector, vector-set, ordered-basis, subspace, and linear-map object models.
2. Build vector editor, set-of-vectors editor, and ordered-basis editor in the existing Matrix Master UI language.
3. Add vector arithmetic and matrix-vector product workflows where the current app is thin or missing.
4. Harden exact solve/operate flows where needed: pivot/free-variable summaries, homogeneous-system reuse, inverse-by-row-reduction reuse, and better result actions.
5. Harden exact determinant/minors/cofactors/adjugate/Cramer's rule surfaces where the current app is incomplete, inconsistent, or not reusable enough.
6. Implement span membership, independence/dependence witnesses, basis extraction/testing, ordered bases, coordinate vectors, and dimension.
7. Implement row/column/null space and rank-nullity surfaces.
8. Implement subspace sum/intersection/direct sum.
9. Implement linear maps defined by matrix or basis images, plus kernel/range and injective/surjective/bijective checks.
10. Implement basis-relative matrix representations, change of basis, and similarity workflows.
11. Add exact tests and certificate/witness outputs for yes-no claims.
12. Route all new exact results into the current LaTeX/export conventions.

Rules:
- no cloud/account work
- avoid broad App.tsx edits
- avoid giant rewrites of services/matrixService.ts; add adapters and split incrementally
- feature UIs must plug in through registries or feature-local entry points
- do not land new math surfaces without result actions and export hooks

Slice plan:
- Slice 1: exact object models + vector/basis editors
- Slice 2: vector arithmetic + matrix-vector products + solve/operate exact reuse hardening
- Slice 3: span / independence / basis / coordinates / dimension
- Slice 4: fundamental subspaces + rank-nullity + subspace operations
- Slice 5: linear maps + basis change + similarity

Done means:
- the app supports vectors, bases, spaces, and maps as first-class workflows
- new exact features fit the current UX and LaTeX posture
- reusable result actions exist throughout
- npm run test passes
- npm run build passes
- npm run electron:build passes
```

---

## Stream D prompt - Analyze, orthogonality, canonical forms, advanced tools

```text
Use the shared preamble.

You own Stream D.
Branch name: codex/analyze-orthogonality-advanced
PR intent: [minor] Analyze, orthogonality, and advanced roadmap tools

Mission:
Complete the Analyze roadmap, normalize advanced-tool discoverability, and ship the advanced topics that are part of the main roadmap/spec.

Locked decisions:
- Keep the current Analysis posture and answer-first feel.
- Preserve the current advanced-tool calmness; do not dump everything into the main surface at once.
- Implement main-roadmap/spec advanced topics, but do not chase backlog-only study tooling.
- Preserve current LaTeX/export behavior for all new result surfaces.

Primary tasks:
1. Create a clearer Analyze category registry: matrix properties, subspaces and bases, linear maps, eigen/canonical forms, orthogonality/least squares, and advanced desktop extras.
2. Harden current LU / QR / SVD / eigen workflows where needed.
3. Complete eigenspaces, diagonalization, algebraic vs geometric multiplicity, and fast powers via diagonalization.
4. Implement inner products, norms, distances, orthogonality checks, and orthonormal basis workflows.
5. Implement Gram-Schmidt, projection onto vector/subspace, orthogonal complements, and least squares with useful diagnostics.
6. Integrate minimal polynomial and Jordan form if they are part of the main roadmap/spec for this overhaul.
7. Re-home current sparse/iterative tools into a cleaner Analyze/Advanced information architecture.
8. Add roadmap-level applied extras only where they are named in the main roadmap/spec. Do not pull in backlog-only study tooling.
9. Ensure every new result surface supports current reuse/export/LaTeX conventions.

Rules:
- no shell rewrites
- no persistence ownership except where export/reuse contracts require it
- do not build fake sync/account UX
- do not add backlog-only challenge/glossary/courseware surfaces
- use feature-local registries and avoid giant central switches

Slice plan:
- Slice 1: analyze category registry + existing advanced-tool re-home
- Slice 2: eigen workflow completion + diagonalization + fast powers
- Slice 3: orthogonality + Gram-Schmidt + projections + least squares
- Slice 4: minimal polynomial + Jordan + canonical forms navigation
- Slice 5: sparse/iterative polish + roadmap-level applied extras

Done means:
- Analyze is more coherent and discoverable
- orthogonality and least-squares workflows are complete and reusable
- advanced roadmap topics fit normal navigation instead of becoming a junk drawer
- npm run test passes
- npm run build passes
- npm run electron:build passes
```

---

## Follow-up prompt after the first merge wave

Use this only after Stream A slice 1-2 and Stream B/C/D slice 1 have merged.

```text
Use the shared preamble.

You are on a post-merge integration branch.
Mission: reconcile the first merge wave and prepare the repo for the deeper feature slices.

Tasks:
1. Rebase the current modular shell against merged Stream A/B/C/D slice-1 work.
2. Remove any temporary adapters that are now redundant.
3. Normalize feature registration for Library, exact objects, and Analyze categories.
4. Ensure the visible Library route, current More menu, and current Settings/update behavior still feel coherent.
5. Add or repair smoke tests for the merged shell.
6. Run npm run test && npm run build && npm run electron:build && npm run verify && npm run verify:desktop.
7. Update CHANGELOG Unreleased sections so later slices can continue with minimal conflict.

Done means the repo is stable enough for Stream B/C/D deeper slices to continue without shell churn.
```

---

## Final integration prompt

Use this after all stream slices are merged.

```text
Use the shared preamble.

You are on the final integration/release-prep branch.
Mission: harden the fully merged Electron overhaul into one coherent release candidate.

Tasks:
1. Audit for any leftover temporary adapters, placeholder routes, or hidden unfinished features.
2. Ensure all top-level routes and major Analyze categories are coherent and discoverable.
3. Verify `.mmatrix` save/load/import/export continuity across legacy and new schema versions.
4. Verify all major results support reuse, save to Library, copy/export, and LaTeX rendering where appropriate.
5. Verify current LaTeX renderer behavior is still the canonical path and no alternate renderer was introduced.
6. Run the full verification battery, including npm run release:check.
7. Clean CHANGELOG Unreleased into a single release-ready summary.
8. Confirm package version, release notes, and any desktop packaging requirements match AGENTS.md.
9. Fix any last integration regressions without broad new refactors.

Done means the repo is release-candidate ready for the Electron desktop app.
```

---

## What to watch for while merging

### Common merge-conflict hotspots
- `App.tsx`
- `types.ts`
- `services/matrixService.ts`
- global modal wiring
- top-nav labels and mode switching
- export/import action wiring
- library save/load actions

### Preferred conflict resolution stance
- keep Stream A's shell ownership
- prefer new contract files over edits to old shared files
- move duplicated logic behind adapters rather than choosing one giant branch wholesale
- when in doubt, keep the currently shipping UX and re-attach new behavior behind it

### Red flags
Stop and repair immediately if a branch introduces any of these:
- Library disappearing back into a hidden modal-only pattern
- `.mmatrix` compatibility regressions
- math features with no reuse/export actions
- a second LaTeX renderer path
- visible sync/account UI despite the local-only decision
- packaged Electron build regressions

