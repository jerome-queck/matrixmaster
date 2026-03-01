# Matrix Master Electron overhaul plan for Codex Cloud

## Mission

Retrofit the existing Matrix Master Electron app instead of porting the uploaded Apple-platform package literally.

The overhaul must:
- preserve the current calm, core-first Matrix Master feel
- stay Electron + Vite + React + TypeScript for Windows and macOS
- keep current desktop update behavior and packaging intact
- keep `.mmatrix` as the canonical full-workspace/share format
- remain fully local with no cloud sync backend or account system
- promote Library into a visible fourth top-level destination
- preserve the current LaTeX rendering and export approach
- implement all features that are part of the main roadmap/spec, while excluding backlog-only study or collaboration extras unless they are later requested separately

---

## Locked owner decisions

These decisions are now fixed and should be treated as non-negotiable across all Codex streams:

1. **Platform stays Electron desktop only**
   - Windows + macOS only.
   - No native iOS/iPadOS/macOS app shell work.

2. **Navigation stays recognizably Matrix Master**
   - Keep the current primary posture and calm UX.
   - Promote Library into the primary navigation.
   - Keep More for secondary actions such as Advanced Tools, History, Export / Import, Settings, and Documentation.

3. **Workspace format stays `.mmatrix`**
   - `.mmatrix` remains the canonical full-state workspace/share file.
   - New schema versions are allowed, but the extension does not change.

4. **The overhaul is fully local**
   - No cloud sync backend.
   - No auth/account work.
   - No sync UI that implies remote replication.
   - Continuity comes from local persistence, versioned workspaces, history, recovery copies, and manual export/import.

5. **Main roadmap/spec is in scope**
   - Implement features that are described in the main roadmap/spec documents.
   - Do not spend time on backlog-only study tooling, collaboration, or marketplace ideas.

6. **Preserve current LaTeX behavior**
   - Keep the current renderer pattern, copy/export flows, and formatting utilities.
   - Extend them for new features instead of introducing a second math-rendering stack.

7. **Small new dependencies are acceptable**
   - Only when justified and documented.
   - No dependency should force a rewrite of current working flows.

---

## Translation of the uploaded package into this desktop app

Treat the uploaded package as a **product and feature spec**, not as an implementation template.

### Keep from the current app
- Electron desktop shell
- offline-first/local-first behavior
- current top-level mental model
- More menu for secondary destinations
- current update center in Settings
- existing advanced-tool posture
- current LaTeX rendering and export DNA

### Translate from the uploaded package
- Apple navigation shells -> Electron route/shell modules
- SwiftData/cloud-sync assumptions -> local persistence, schema versioning, recovery copies, import/export, and future-safe extension points only where they do not add UX clutter
- Apple package layout -> TS feature/domain/persistence/ui modules inside the existing repo
- iPhone/iPad/Mac parity requirements -> Windows/macOS desktop parity only

### Do not copy literally
- do not reproduce the Swift package tree 1:1
- do not turn the app into a giant sidebar-first desktop IDE if that breaks the current Matrix Master feel
- do not replace working desktop flows with mobile-derived patterns
- do not big-bang rewrite the repo

---

## Current repo realities to preserve while refactoring

The current repo already gives you the guardrails:
- `App.tsx` is the current shell and orchestrator
- `components/`, `hooks/`, `services/`, `tests/`, and `electron/` are live and must keep working during migration
- the app already ships core-first workflows, a More menu, local storage, `.mmatrix` sharing, LaTeX export/copy, Electron packaging, and update flows
- advanced tools such as sparse/iterative helpers already exist and should be re-homed or hardened instead of thrown away

The right move is a **strangler refactor**:
- wrap existing behavior first
- split seams second
- replace internals behind feature contracts third

---

## UX translation that is now locked

### Primary navigation
Use four visible top-level destinations in the desktop shell:
- **System Solver**
- **Matrix Operations**
- **Analysis**
- **Library**

This preserves the current labels and visual language while satisfying the spec requirement that Library becomes a real primary destination.

### More menu
Keep More for true secondary surfaces:
- Advanced Tools
- History
- Export / Import
- Settings
- Documentation

### Analyze information architecture
Within Analyze, organize tools by internal categories while preserving the answer-first result style:
- Matrix properties
- Subspaces and bases
- Linear maps
- Eigen and canonical forms
- Orthogonality and least squares
- Advanced / applied extras that are in the main roadmap/spec

### Result layout order
All new result surfaces should conform to the existing Matrix Master result posture:
1. primary answer
2. diagnostics / status
3. reuse actions
4. derivation steps
5. explanation
6. export/copy

---

## Scope map: what is in and what is out

### In scope
The overhaul must cover the main roadmap/spec items, including:
- Solve core refinement
- Operate core refinement
- Library as a first-class route
- vectors, bases, subspaces, coordinates, and dimensions
- linear maps, kernel/range, basis-relative representations, and change of basis
- orthogonality, Gram-Schmidt, projections, orthogonal complements, and least squares
- eigen workflows, diagonalization, and fast powers
- minimal polynomial and Jordan form if they are present in the main roadmap/spec
- sparse and iterative desktop tools where they are part of the main roadmap/spec
- applied extras only where they are named in the main roadmap/spec

### Explicitly out of scope for this overhaul
Unless you later choose otherwise, do **not** spend time on:
- cloud sync backends
- auth/account flows
- collaboration features
- backlog-only study tooling such as challenge mode, glossary cards, theorem reference index, or a course shell posture
- plugin marketplace work
- mobile/native Apple shells
- Android/web targets

---

## LaTeX continuity contract

This overhaul must **stay the course** with the current app's LaTeX behavior.

### Rules
1. Keep `components/LatexRenderer.tsx` as the canonical renderer abstraction.
2. Keep KaTeX-based rendering behavior and its current concerns:
   - display vs inline mode
   - render caching
   - lazy rendering support
   - row styling support for matrix/table rendering
3. Reuse and extend existing formatting utilities instead of inventing parallel ones:
   - symbolic fraction -> LaTeX
   - exact matrix -> LaTeX
   - augmented matrix -> LaTeX
   - numeric matrix -> LaTeX
   - steps bundle generation
4. Any new feature that returns a mathematical object must define:
   - display LaTeX
   - copy LaTeX behavior where appropriate
   - export LaTeX behavior where appropriate
5. Do not introduce MathJax, markdown-only math rendering, screenshot-based rendering, or mixed renderer behavior.
6. Do not silently change the style of current matrix/step exports.

### Practical implication
If a new feature lands without fitting the existing LaTeX rendering/export path, it is not finished.

---

## Build-safe target architecture

Add these directories incrementally. They are a target structure, not a demand for a one-shot migration.

```text
app/
  shell/
  routes/
  registry/
  state/

domain/
  objects/
  requests/
  results/
  errors/
  latex/

engines/
  exact/
  numeric/
  adapters/

features/
  solve/
  operate/
  analyze/
  library/
  spaces/
  maps/
  orthogonality/
  advanced/

persistence/
  local/
  workspace/
  history/
  exports/
  recovery/

ui/
  editors/
  results/
  library/
  panels/
  primitives/
```

### Migration rules
- New work goes into the new module structure wherever practical.
- Existing working logic may be wrapped from `services/` until the replacement is proven.
- `App.tsx` must shrink into composition and routing, not remain the universal state blob.
- `types.ts` should stop growing as a junk drawer; new contracts should go into `domain/`.
- `services/matrixService.ts` should be split by behavior behind exact/numeric adapters, not rewritten all at once.

---

## Shared contracts to land first

These contracts should be introduced before heavy parallel feature work starts landing:

- `FeatureRoute`
- `ToolDescriptor`
- `ResultAction`
- `WorkspaceSnapshot`
- `WorkspaceSchemaVersion`
- `LibraryItem`
- `MatrixObject`
- `VectorObject`
- `VectorSetObject`
- `BasisObject`
- `SubspaceObject`
- `LinearMapObject`
- `ComputationRequest`
- `ComputationResult`
- `ExactEngine`
- `NumericEngine`
- `LatexRenderable`
- `ExportPayload`

These should be additive. Do not force a repo-wide type migration in the same PR.

---

## Build gates and integration rules

Every stream must keep the repo buildable.

### Mandatory checks for every PR
```bash
npm run test
npm run build
npm run electron:build
```

### Required for larger slices or integration checkpoints
```bash
npm run verify
npm run verify:desktop
```

### Required for release candidate integration
```bash
npm run release:check
```

### Non-negotiable rules
- no PR merges that only work in dev mode
- no unfinished visible routes unless clearly gated
- no branch is allowed to rewrite `App.tsx`, `types.ts`, and `services/matrixService.ts` all in one go
- no branch is allowed to break `.mmatrix` import/export compatibility
- no branch is allowed to ship new math features without reuse/export hooks

---

## File ownership rules for 4 parallel Codex streams

### Stream A owns freely
- `App.tsx`
- `app/`
- primary navigation and shell composition
- route registry plumbing
- shell-level modals and command palette infrastructure
- route-level feature visibility checks

### Stream B owns freely
- `features/library/`
- `persistence/`
- workspace codecs
- local storage models
- history/recovery/report metadata
- export/import flows

### Stream C owns freely
- `features/solve/`
- `features/operate/`
- `features/spaces/`
- `features/maps/`
- `engines/exact/`
- vector/basis editors
- exact algebra extensions

### Stream D owns freely
- `features/analyze/`
- `features/orthogonality/`
- `features/advanced/`
- `engines/numeric/`
- advanced analyze categorization
- sparse/iterative re-home and advanced extras

### Shared-file danger zone
Avoid simultaneous broad edits to:
- `App.tsx`
- `types.ts`
- `services/matrixService.ts`
- giant central registries
- current modal orchestration blocks

### Safer pattern
- add new contract files
- add wrapper adapters around old services
- register features through descriptors
- migrate one surface at a time

---

## The 4-stream Codex strategy

Run four Codex branches in parallel, but merge them in a controlled order.

### Stream A - Shell, seams, Library top-level route

#### Mission
Make the app shell modular without changing the recognizable Matrix Master feel.

#### Deliverables
- route/shell extraction from `App.tsx`
- primary navigation becomes four destinations with visible Library
- feature registry and tool registry
- route ownership boundaries for other streams
- command palette shell and shortcut scaffold
- shared result-layout shell contract
- smoke tests proving the old top-level flows still work

#### Must not do
- no heavy math work
- no persistence overhaul beyond what is needed for routing seams
- no large design rewrite

#### PR slices
1. shell extraction and route registry
2. visible Library top-level route, keeping More for secondary items
3. command palette shell and keyboard scaffold
4. result-shell normalization and feature visibility gates

---

### Stream B - Local Library, persistence, `.mmatrix`, history, reports

#### Mission
Turn Library into a true product surface with local-only durability and manual continuity.

#### Deliverables
- first-class Library route
- saved matrices, vectors, vector sets, bases, maps, and workspaces
- `.mmatrix` schema versioning while keeping `.mmatrix` canonical
- local persistence with migration support
- history / recents / folders / tags / favorites
- recovery copies and overwrite-safe workflows
- export/import flows for saved items and workspaces
- report-friendly saved outputs and metadata

#### Must not do
- no cloud backend
- no fake sync UI
- no broad shell rewrites beyond extension points supplied by Stream A

#### PR slices
1. Library route data model + local persistence v2
2. `.mmatrix` schema versioning and compatibility layer
3. saved object expansion beyond matrices
4. history / recents / tags / folders / favorites
5. recovery copies, report metadata, and import/export hardening

---

### Stream C - Exact algebra, vectors, spaces, and linear maps

#### Mission
Fill the biggest exact-math and object-model gaps while preserving current solve/operate behavior.

#### Deliverables
- vector editor
- set-of-vectors editor
- ordered basis editor
- vector arithmetic and matrix-vector products
- exact solve improvements where needed: pivot/free-variable summaries, homogeneous-system reuse, inverse-by-row-reduction reuse
- determinant/minors/cofactors/adjugate/Cramer's rule hardening where existing flows are incomplete or not reusable enough
- span membership
- independence and dependence witnesses
- basis extraction / basis testing / coordinate vectors / dimension
- row/column/null space and rank-nullity surfaces
- subspace sum/intersection/direct sum
- linear maps defined by matrix or basis images
- kernel/range and injective/surjective/bijective checks
- basis-relative matrix representations
- change of basis and similarity workflows
- strong exact tests and certificate-style outputs

#### Must not do
- no cloud or account work
- no shell ownership beyond registered routes and actions
- no giant monolithic rewrite of `matrixService`

#### PR slices
1. object models and vector/basis editors
2. solve/operate exact reuse + vector arithmetic + matrix-vector products
3. span / independence / basis / coordinates / dimension
4. fundamental subspaces + subspace operations
5. linear maps + basis change + similarity

---

### Stream D - Analyze, orthogonality, canonical forms, advanced desktop tools

#### Mission
Complete the Analyze roadmap, normalize the advanced tool posture, and land roadmap-level advanced topics.

#### Deliverables
- analyze category routing and discoverability
- LU / QR / SVD / eigen workflow hardening where needed
- eigenspaces and diagonalization
- algebraic vs geometric multiplicity summaries
- fast powers via diagonalization
- inner products, norms, distances, and orthogonality checks
- orthonormal basis workflows
- Gram-Schmidt
- projection onto vector/subspace
- orthogonal complement
- least squares with diagnostics
- minimal polynomial and Jordan form when they are part of the main roadmap/spec
- sparse inspector / sparse matrix views
- iterative solver surfaces re-homed into Analyze/Advanced in a cleaner structure
- roadmap-level applied extras only if they are named in the main roadmap/spec

#### Must not do
- no shell rewrites
- no persistence ownership except through export/reuse contracts
- no backlog-only study tooling unless separately requested

#### PR slices
1. analyze category registry + existing advanced-tool re-home
2. eigen workflow completion + diagonalization + fast powers
3. orthogonality + Gram-Schmidt + projections + least squares
4. minimal polynomial + Jordan + canonical forms navigation
5. sparse/iterative polish and roadmap-level applied extras

---

## Merge order that keeps trunk alive

### Phase 0 - Foundation merge
Merge **Stream A slices 1-2** first.

This establishes:
- shell seams
- route ownership
- visible Library destination
- feature registry
- safer extension points for the other streams

### Phase 1 - Parallel merge window
After Stream A foundation lands:
1. Stream B slice 1
2. Stream C slice 1
3. Stream D slice 1

These can be developed in parallel, but merge in the order above if conflicts appear.

### Phase 2 - Core feature expansion
Recommended merge order:
1. Stream B slice 2
2. Stream C slice 2
3. Stream C slice 3
4. Stream D slice 2
5. Stream B slice 3
6. Stream C slice 4
7. Stream D slice 3
8. Stream B slice 4
9. Stream C slice 5
10. Stream D slice 4
11. Stream B slice 5
12. Stream D slice 5

### Why this order works
- Library route and persistence land before large reuse flows depend on them.
- Vector/basis contracts land before orthogonality and advanced map workflows need them.
- Advanced/canonical work lands after the common result, export, and library seams exist.
- The app stays shippable after each merge instead of becoming a dramatic crater.

---

## Milestone acceptance criteria

### Milestone 1 - Shell + Library route
- visible top-level Library destination exists
- More remains intact for secondary items
- current Solve / Operate / Analyze flows still work
- build/test/electron build all pass

### Milestone 2 - Local persistence baseline
- `.mmatrix` remains the canonical full-state format
- versioned workspace snapshots load/save cleanly
- local library/history/recent flows work
- import/export is backward-compatible

### Milestone 3 - Exact spaces/maps layer
- vectors, bases, subspaces, and linear maps work end-to-end
- results can be reused, saved, copied, and exported
- witness/certificate outputs exist where meaningful

### Milestone 4 - Orthogonality and least squares
- Gram-Schmidt, projections, and least squares are discoverable and tested
- diagnostics are clear and fit the current answer-first UI

### Milestone 5 - Advanced roadmap completion
- canonical forms and advanced analyze topics are integrated into normal navigation
- sparse/iterative tools are cleaner and not hidden junk drawers
- any roadmap-level applied extras included in scope are shipped behind the same quality bar

---

## Final implementation stance

This should be executed as a sequence of safe, vertical, tested upgrades to the existing Electron app.

Do not ask Codex Cloud to "replace Matrix Master with the zip." That is how one summons merge-conflict goblins.

Ask Codex to:
- preserve the current product DNA
- add the missing roadmap/spec capability
- split seams first
- keep `.mmatrix` and local-only persistence intact
- preserve current LaTeX behavior
- pass the build after every merge

