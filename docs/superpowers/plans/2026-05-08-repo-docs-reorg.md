# Repo Docs Reorg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Matrix Master's documentation and repository hygiene so live instructions are concise, root-level docs are intentional, and generated dependencies are no longer tracked.

**Architecture:** Keep root docs as entry points, move durable contributor detail into `docs/development/`, move desktop user details into `docs/user/`, and preserve old roadmap material under `docs/archive/2026-03-v2-overhaul/`. Keep repo hygiene changes in a separate slice from prose rewrites.

**Tech Stack:** Markdown documentation, git file moves, npm scripts already defined in `package.json`.

---

### Task 1: Move Historical Planning Docs Into Archive

**Files:**
- Move: `matrixmaster_codex_cloud_update_plan_v2.md` -> `docs/archive/2026-03-v2-overhaul/plan.md`
- Move: `matrixmaster_codex_cloud_runbook_v2.md` -> `docs/archive/2026-03-v2-overhaul/runbook.md`
- Move: `matrixmaster_v2_implementation_checklist.md` -> `docs/archive/2026-03-v2-overhaul/implementation-checklist.md`
- Create: `docs/archive/2026-03-v2-overhaul/README.md`
- Modify: `docs/archive/2026-03-v2-overhaul/implementation-checklist.md`

- [ ] **Step 1: Create archive directory**

Run: `mkdir -p docs/archive/2026-03-v2-overhaul`
Expected: directory exists.

- [ ] **Step 2: Move historical files with git**

Run:
```bash
git mv matrixmaster_codex_cloud_update_plan_v2.md docs/archive/2026-03-v2-overhaul/plan.md
git mv matrixmaster_codex_cloud_runbook_v2.md docs/archive/2026-03-v2-overhaul/runbook.md
git mv matrixmaster_v2_implementation_checklist.md docs/archive/2026-03-v2-overhaul/implementation-checklist.md
```
Expected: root no longer contains `matrixmaster_*.md`; moved files remain tracked.

- [ ] **Step 3: Add archive README**

Create `docs/archive/2026-03-v2-overhaul/README.md` explaining these files are historical March 2026 v2 implementation planning artifacts and not current workflow instructions.

- [ ] **Step 4: Update moved checklist source links**

In `docs/archive/2026-03-v2-overhaul/implementation-checklist.md`, replace:
```markdown
- `matrixmaster_codex_cloud_update_plan_v2.md`
- `matrixmaster_codex_cloud_runbook_v2.md`
```
with:
```markdown
- `./plan.md`
- `./runbook.md`
```

### Task 2: Add Focused Documentation Indexes

**Files:**
- Create: `docs/index.md`
- Create: `docs/development/project-structure.md`
- Create: `docs/development/testing.md`
- Create: `docs/development/release-process.md`
- Create: `docs/user/desktop.md`
- Create: `docs/user/troubleshooting.md`

- [ ] **Step 1: Create docs directories**

Run: `mkdir -p docs/development docs/user`
Expected: both directories exist.

- [ ] **Step 2: Add `docs/index.md`**

Include links to `../README.md`, `../AGENTS.md`, `../CHANGELOG.md`, `development/project-structure.md`, `development/testing.md`, `development/release-process.md`, `user/desktop.md`, `user/troubleshooting.md`, and `archive/2026-03-v2-overhaul/README.md`.

- [ ] **Step 3: Add development docs**

Create:
- `docs/development/project-structure.md` with the current source tree responsibilities.
- `docs/development/testing.md` with exact npm commands from `package.json`.
- `docs/development/release-process.md` with SemVer, changelog, local release gate, GitHub Actions, artifacts, and cleanup notes.

- [ ] **Step 4: Add user docs**

Create:
- `docs/user/desktop.md` with Electron development/build/update notes.
- `docs/user/troubleshooting.md` with unsigned app warnings and export/download notes.

### Task 3: Simplify Live Root Docs and PR Template

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] **Step 1: Rewrite `AGENTS.md`**

Keep it as the concise source of truth for contributor and agent workflow:
- purpose,
- repo map,
- commands,
- working flow,
- commit discipline,
- changelog and release rules,
- testing gates,
- quality and safety standards,
- agent behavior.

Link to `docs/development/testing.md` and `docs/development/release-process.md` for detail.

- [ ] **Step 2: Rewrite `README.md`**

Keep product overview, features, quick start, desktop commands, common scripts, documentation links, offline behavior, and troubleshooting link. Remove detailed release checklist and long structure detail now covered in `docs/`.

- [ ] **Step 3: Trim `CHANGELOG.md` policy**

Keep changelog-specific rules only. Clarify that every release-relevant PR updates `Unreleased`; docs-only/internal-only PRs may state `No changelog entry` in the PR when there is no user-visible or release-note impact.

- [ ] **Step 4: Simplify PR template**

Use one concise template with:
- summary,
- release intent,
- user-facing changes,
- testing,
- risk and rollback,
- docs/screenshots,
- checklist.

### Task 4: Apply Safe Repo Hygiene

**Files:**
- Modify: `.gitignore`
- Delete: `patches/app-builder-lib+26.7.0 2.patch`
- Untrack: `node_modules/`

- [ ] **Step 1: Ignore local tool state**

Add `.claude/` to `.gitignore` so local launcher config does not appear as a new file.

- [ ] **Step 2: Delete duplicate patch**

After confirming the duplicate patch is byte-identical to `patches/app-builder-lib+26.7.0.patch`, delete `patches/app-builder-lib+26.7.0 2.patch`.

- [ ] **Step 3: Untrack generated dependencies**

Run: `git rm -r --cached node_modules`
Expected: `node_modules/` files are staged as removed from git but remain on disk and ignored.

### Task 5: Verify and Commit

**Files:**
- All files changed by Tasks 1-4.

- [ ] **Step 1: Check links/references**

Run: `rg -n "matrixmaster_codex_cloud_update_plan_v2|matrixmaster_codex_cloud_runbook_v2|matrixmaster_v2_implementation_checklist|app-builder-lib\\+26\\.7\\.0 2" -g '!node_modules' -g '!dist' -g '!electron-dist'`
Expected: no stale root-path references; only intentional historical changelog text may remain if not linked.

- [ ] **Step 2: Check whitespace**

Run: `git diff --check`
Expected: no whitespace errors.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: calculation and UI tests pass.

- [ ] **Step 4: Commit slices**

Create commits for:
- planning/spec docs,
- docs reorganization and instruction simplification,
- generated dependency hygiene.

Use detailed commit messages following `AGENTS.md`.
