# Repo Docs Reorg Design

Date: 2026-05-08
Branch: `codex/repo-instructions-cleanup-2026-05-08`
Release intent: patch

## Goal

Make Matrix Master's repository documentation easier to navigate and safer for
future agents by separating live instructions from historical planning notes,
removing duplicated workflow text, and cleaning obvious repository hygiene
issues without changing app behavior.

## Scope

This cleanup covers:
- `AGENTS.md` as the concise source of truth for contributor and agent rules.
- `README.md` as the product overview and quick-start entry point.
- `docs/` as the home for development, release, and archived planning docs.
- `.github/PULL_REQUEST_TEMPLATE.md` as a short release-aware PR checklist.
- `CHANGELOG.md` policy text so it does not duplicate the PR template.
- Root-level historical Matrix Master v2 planning docs.
- Safe hygiene issues such as duplicate patch files, local tool ignores, and
  tracked generated dependencies.

This cleanup does not change application runtime behavior, UI flows, math
engines, Electron packaging behavior, or release artifact requirements.

## Target Structure

```text
README.md
AGENTS.md
CHANGELOG.md
.github/PULL_REQUEST_TEMPLATE.md
docs/
  README.md
  development.md
  release.md
  archive/
    README.md
    matrixmaster-codex-cloud-update-plan-v2.md
    matrixmaster-codex-cloud-runbook-v2.md
    matrixmaster-v2-implementation-checklist.md
  superpowers/
    specs/
    plans/
```

## Live Document Responsibilities

`AGENTS.md` should answer "How do agents and contributors work here?" It keeps
project structure, command selection, branching, PRs, commits, changelog, tests,
release gates, and safety rules. It should point to `docs/development.md` and
`docs/release.md` instead of repeating long procedures.

`README.md` should answer "What is this app and how do I run it?" It keeps the
offline-first product description, feature overview, install commands, common
scripts, project layout summary, and troubleshooting. It should link to
`AGENTS.md` for contributor workflow.

`docs/development.md` should answer "What files and scripts matter while
developing?" It contains expanded project structure, command reference, testing
guidance, and local generated-artifact notes.

`docs/release.md` should answer "How do I prepare and verify a release?" It
contains SemVer guidance, release checklist, artifact expectations, CI
workflows, and rollback notes.

`CHANGELOG.md` should remain the versioned user-visible change log. It should
keep a compact update policy and the existing release entries.

The PR template should collect the release intent, summary, testing evidence,
changelog status, risk/rollback, and screenshots or notes for UI changes without
copying all of `AGENTS.md`.

## Archive Policy

The three root Matrix Master v2 planning documents are historical implementation
artifacts. Move them to `docs/archive/` with kebab-case names and add an archive
index that marks them as historical context, not current workflow instructions.
Do not rewrite their internal content beyond path-preserving move metadata unless
a link update is necessary.

## Hygiene Policy

Keep generated outputs out of version control:
- `dist/`
- `electron-dist/`
- `.cache/`
- `node_modules/`
- local tool directories such as `.claude/`

Remove the duplicate `patches/app-builder-lib+26.7.0 2.patch` only if it is
byte-identical to the canonical `patches/app-builder-lib+26.7.0.patch`.

If untracking `node_modules/` is too disruptive for the current turn, package it
as a follow-up prompt. If it is completed, keep it as a separate commit from the
documentation rewrite.

## Verification

For the docs/instructions slice:
- Run `git diff --check`.
- Run `npm run test` to confirm no accidental behavior regression.

For the generated-dependency hygiene slice:
- Confirm `node_modules/` remains ignored.
- Run `npm run test` after untracking because the working copy still depends on
  installed dependencies.

For release candidates after this cleanup:
- Follow `docs/release.md` and `AGENTS.md`; this cleanup does not relax release
  gates.

## Follow-Up Packaging

If any requested cleanup is not completed in this turn, provide a copy-paste
prompt with:
- exact files or directories involved,
- intended result,
- constraints,
- verification command,
- expected risk.
