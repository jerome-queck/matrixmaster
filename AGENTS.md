# Repository Guidelines

AGENTS.md is the source of truth for how agents and contributors work in this
repository. It covers workflow rules; product requirements and historical plans
belong in `README.md` or `docs/`.

## Project Map

- `App.tsx`, `index.tsx`, `index.html`, `index.css` - Vite/React app shell.
- `app/` - shell, route, and registry contracts.
- `components/` - reusable UI components.
- `features/` - user-facing workflow surfaces.
- `engines/` - exact and numeric math logic.
- `services/` - domain services and worker helpers.
- `persistence/` - local library, workspace codec, recovery, and exports.
- `hooks/` - React hooks.
- `types.ts`, `global.d.ts` - shared and ambient types.
- `tests/` - calculation, persistence, Vitest UI tests, and Playwright e2e tests.
- `electron/` - Electron main/preload build sources.
- `scripts/` - normalized test workflow runner plus release helper scripts.
- `assets/` - desktop icons and build resources.
- `docs/` - contributor, release, user, and archived planning docs.
- `dist/`, `electron-dist/`, `.cache/`, `node_modules/` - generated outputs.

## Commands

Use scripts from `package.json`.

- `npm run dev` - start the Vite dev server.
- `npm run build` - build the web bundle.
- `npm run preview` - preview the production web build.
- `npm run test` - run the fast unit profile: calculation and Vitest tests.
- `npm run test:calc` - run calculation tests.
- `npm run test:vitest` - run Vitest tests for UI, persistence, services, and hooks.
- `npm run test:ui` - compatibility alias for `test:vitest`.
- `npm run test:e2e` - run Playwright browser workflow tests.
- `npm run test:all` - run calculation, Vitest, and Playwright tests.
- `npm run verify` - run normalized web verification: clean, hygiene,
  version, unit tests, browser tests, and build.
- `npm run verify:desktop` - run desktop packaging verification.
- `npm run verify:full` - run web, browser, and desktop verification.
- `npm run release:check` - run the local release gate.
- `npm run electron:dev` - run Electron against the dev server.
- `npm run electron:build` - build web assets plus Electron main/preload.
- `npm run electron:dist` - package desktop artifacts.

More detail lives in `docs/development/testing.md` and
`docs/development/release-process.md`.

## Working Flow

- Use a branch for meaningful code, docs, or release work.
- Branch names should use `codex/<short-scope>-<ticket-or-date>` unless the
  user asks for a different name.
- Every meaningful change should have a focused PR with release intent:
  `patch`, `minor`, or `major`.
- If work begins on `main` without an existing PR or branch, ask before making
  edits.
- Keep each PR to one theme.
- Use `.github/PULL_REQUEST_TEMPLATE.md` for PR descriptions.
- Update `CHANGELOG.md` under `Unreleased` for user-visible or
  release-relevant changes. For docs-only or internal-only PRs with no release
  note impact, state `No changelog entry` in the PR.

## Commit Discipline

- Commit completed slices separately; do not batch unrelated work.
- Commit messages use an imperative subject, ideally 50-72 characters.
- Include body sections for context, scope, behavior, risk, tests, and rollback.

Template:

```text
<imperative subject>

Context:
- Why this change is needed.

Scope:
- What files or areas are touched.

Behavior:
- What changes for users or the system.

Risk:
- Known risks or edge cases.

Tests:
- Commands run and results.

Rollback:
- How to revert or mitigate if needed.
```

## Testing Gates

- Small docs or metadata changes: run `git diff --check`.
- Small behavior changes: run `npm run test`.
- Broader frontend or build changes: run `npm run verify`.
- Desktop packaging changes: run `npm run verify:desktop`.
- Release candidates: run `npm run release:check`.

Report any skipped check and why.

## Release Rules

- Use SemVer in `package.json`.
- Each release PR declares the version bump category.
- Before release, update `package.json` and move `CHANGELOG.md` `Unreleased`
  entries into a dated version section.
- `npm run release:check` is the canonical local release gate.
- GitHub Actions "Release Check" must pass on macOS and Windows before merge.
- Desktop release artifacts must include the required update metadata. See
  `docs/development/release-process.md`.
- After publishing a release, confirm `Unreleased` is empty and the released
  version section has the actual release date.

## Quality Standards

- Keep functions small and focused.
- Prefer clear names over comments.
- Keep UI code and business logic loosely coupled.
- Validate inputs and handle edge cases explicitly.
- Avoid blocking the UI thread with heavy calculations.
- Preserve keyboard navigation and use ARIA where appropriate.
- Never commit secrets or generated dependency/build outputs.

## Agent Rules

- Protect user changes. Do not revert work you did not make unless the user
  explicitly asks.
- Follow existing project patterns before introducing new structure.
- Keep generated files out of commits unless a release process explicitly needs
  them.
- For UI changes, include screenshot notes or recordings in the PR when useful.
- When tests or builds fail, report the command and failure clearly before
  changing direction.
- When confidence gates pass, recommend merge and release when appropriate.
