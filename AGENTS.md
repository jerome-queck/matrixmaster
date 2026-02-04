# Repository Guidelines

## Purpose & Non-Goals
AGENTS.md is the single source of truth for how work is planned, implemented,
tested, and released in this repository.

Purpose:
- Define the workflow for features, fixes, refactors, and releases.
- Encode release-driven PR and commit discipline.

Non-goals:
- Not a product spec.
- Not an architecture deep-dive.

## Project Structure & Module Organization
Top-level layout (current reality):
- `App.tsx` main React app shell.
- `index.tsx` entry point.
- `index.css` global styles.
- `components/` UI components.
- `hooks/` React hooks.
- `services/` domain and service logic.
- `types.ts` shared types.
- `tests/` automated tests.
- `electron/` Electron app entry/config.
- `scripts/` verification and release helpers.
- `dist/` web build output (generated).
- `electron-dist/` Electron build output (generated).
- `vite.config.ts` Vite config.
- `vitest.config.ts` Vitest config.

Notes:
- `tests/` includes `tests/calculation.test.ts` and a Vitest suite.
- `electron/` contains Electron entry and build config.
- `scripts/` hosts `verify` scripts used as CI/local quality gates.

## Build, Test, and Development Commands
Use the repository scripts exactly as defined in `package.json`:
- `npm run dev` — run the local Vite dev server.
- `npm run build` — build the web bundle to `dist/`.
- `npm run test` — run all tests (`test:calc` + `test:ui`).
- `npm run test:calc` — run calculation tests via node + ts-node.
- `npm run test:ui` — run Vitest UI suite.
- `npm run verify` — run standard verification checks.
- `npm run verify:desktop` — desktop-focused verification.
- `npm run verify:full` — full verification battery.
- `npm run release:check` — release gating checks (build + tests + electron dist).

Guidance:
- Small changes: `npm run test`.
- Larger behavior changes: `npm run verify`.
- Release candidates: `npm run release:check`.
- When rebuilding `dist/` for release, ensure the build artifacts are complete and the release checks pass before proceeding.

## PR Policy (Release-Driven)
Every meaningful change gets its own PR. This includes features, fixes,
refactors, or any behavior change.

Rules:
- Each PR targets a release intent: `patch`, `minor`, or `major`.
- If work starts without a PR, the agent must immediately ask to create one.
- Each PR should be scoped to a single theme.
- Every PR must use the repository template: `.github/PULL_REQUEST_TEMPLATE.md`.

## Branching & PR Naming
Branch naming:
- `codex/<short-scope>-<ticket-or-date>`

PR title format:
- `[vX.Y.Z] <summary>` or `[minor|patch|major] <summary>`

## Commit Guidelines (Detailed + Granular)
Commit discipline exists to enable safe rollback and time travel.

Rules:
- One logical change per commit.
- Commit every completed feature slice (user-visible or internal milestone).
- If a feature completes and tests pass, commit immediately.
- Never batch unrelated changes into one commit.

Commit message format:
- Subject: 50-72 chars, imperative.
- Body: context, scope, behavior, risk, test coverage, rollback notes.
- Include a short "why" and "impact" in the body.

Commit template:
```
<imperative subject (50-72 chars)>

Context:
- Why this change is needed.

Scope:
- What files/areas are touched.

Behavior:
- What changes for users/system.

Risk:
- Known risks or edge cases.

Tests:
- Commands run and results.

Rollback:
- How to revert or mitigate if needed.
```

## Testing & Confidence Gates
Testing levels:
- Quick checks: `npm run test`
- Deeper: `npm run verify` or `npm run verify:full`
- Release candidate: `npm run release:check`
- PR merge gate: GitHub Actions "Release Check" (macOS + Windows) must pass.

Definition of Done:
- Appropriate tests run for the size/risk of change.
- No build/test failures.
- UI changes include screenshots or notes in the PR.

When confidence gates pass, the agent should recommend:
- Merge the PR.
- Release the new version.

## Release Management & Versioning
Versioning:
- Use SemVer: `major.minor.patch`.
- Each PR must propose a version bump category.
- `package.json` version must be updated before release.
- Each PR must update `CHANGELOG.md` under `Unreleased`.
- Each release compiles `Unreleased` into a new versioned entry.
 - When a new version is released, merge the PR as part of the release flow.

Release checklist:
- Bump `package.json` version.
- Update changelog or release notes.
- Run `npm run release:check`.
- Clean workspace artifacts (revert `node_modules/` and `package-lock.json`, remove `.cache/`) before finalizing.
- Run CI debug pass before finalizing release: wait for PR checks to finish, recheck status, and investigate any failures.
- Produce both macOS and Windows artifacts before the final PR commit (`npm run electron:dist` and `npx electron-builder --win --x64 --publish=never`).
- Tag and publish via GitHub (if that is current process).
- Confirm `CHANGELOG.md` `Unreleased` is empty post-release.
- Ensure a new version section exists with the release date.

## Quality Standards (Culture Forward)
Code quality:
- Keep functions small and focused.
- Use clear, intention-revealing naming.
- Minimize side effects.
- Avoid tight coupling between UI and business logic.

Security & safety:
- Never commit secrets.
- Validate inputs.
- Handle edge cases explicitly.

Performance:
- Guard heavy calculations.
- Avoid blocking the UI thread.

Accessibility:
- Keyboard navigation works.
- Use ARIA where appropriate.

## Review & Documentation Practices
PR description template:
- Summary
- Reasoning
- Testing
- Screenshots/notes (for UI changes)
- Risk and rollback

Docs/notes requirement:
- Update README or inline docs for behavior changes.

Release notes template (required in PR description):
- Summary
- User-facing changes
- Breaking changes (if any)
- Migration/upgrade steps (if any)
- Testing (commands + results)
- Risks/rollbacks
- Known issues or follow-ups

PR template requirement:
- Use `.github/PULL_REQUEST_TEMPLATE.md` for every PR.
- Ensure release notes and changelog updates are consistent.

## Agent-Specific Instructions
Required agent behavior:
- Always ask to create a PR before starting a feature if none exists.
- Commit after each feature slice with detailed commit messages.
- Suggest merge + release after sufficient tests pass.
- Each new PR must target a new version release.
- After merging a PR, delete the remote branch.
