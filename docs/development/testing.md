# Testing And Verification

Use the scripts in `package.json`. The short version is:

- `npm run test` for normal development confidence.
- `npm run verify` for broader web/build confidence.
- `npm run verify:desktop` for Electron packaging confidence.
- `npm run release:check` for release candidates.

## Development Commands

- `npm run dev` - start the Vite dev server.
- `npm run build` - build the web bundle into `dist/`.
- `npm run preview` - preview the production web build locally.
- `npm run electron:dev` - run Electron with the Vite dev server.
- `npm run check:workspace` - fail on stray desktop metadata or Finder/iCloud
  duplicate conflict files in source-controlled areas.
- `npm run clean:generated` - remove generated web, Electron, cache, and
  desktop metadata outputs from the local workspace.

## Test Commands

- `npm run test` - run `test:calc` and `test:vitest`.
- `npm run test:calc` - run calculation tests through Node and `ts-node`.
- `npm run test:vitest` - run Vitest tests for UI, persistence, services, and hooks.
- `npm run test:ui` - compatibility alias for `test:vitest`.
- `npm run test:e2e` - run Playwright browser workflow tests against the Vite
  app on a strict local port.

## Browser Workflow Tests

`npm run test:e2e` starts Vite on `127.0.0.1:7429` with `--strictPort` and
runs Playwright tests in `tests/e2e/`. These tests are assertion-driven smoke
and workflow checks, not pixel-perfect snapshot baselines. They cover app-shell
rendering, primary route navigation, solver calculation, matrix operations,
analysis, command palette navigation, library loaded state, export/import
controls, and a narrow mobile viewport smoke check.

On a fresh machine, install the Chromium browser cache once before the first
local run:

```bash
npx playwright install chromium
```

Playwright screenshots, videos, traces, and HTML reports are generated only as
diagnostic artifacts on failure or retry. Keep `test-results/`,
`playwright-report/`, and `blob-report/` out of commits.

## Verification Commands

- `npm run verify` - clean generated outputs, check workspace hygiene, check
  package version metadata, run tests, and build the web bundle.
- `npm run verify:desktop` - clean generated outputs, package desktop artifacts
  through Electron, and check update metadata.
- `npm run verify:full` - run both standard and desktop verification.
- `npm run release:check` - check package and lockfile version metadata, run
  tests, package Electron artifacts, and check release metadata.

## Choosing A Gate

- Docs-only changes: `git diff --check`.
- Small code changes: `npm run test`.
- Shared behavior, routing, exports, or UI changes: `npm run verify`; add
  `npm run test:e2e` when browser workflow confidence matters.
- Electron, patch-package, build output, or artifact changes:
  `npm run verify:desktop`.
- Release candidate: `npm run release:check`.
