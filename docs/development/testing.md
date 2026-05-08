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

## Test Commands

- `npm run test` - run `test:calc` and `test:ui`.
- `npm run test:calc` - run calculation tests through Node and `ts-node`.
- `npm run test:ui` - run the Vitest suite.

## Verification Commands

- `npm run verify` - run tests, build the web bundle, and check the package
  version is set.
- `npm run verify:desktop` - build web and Electron sources, package desktop
  artifacts, and check update metadata.
- `npm run verify:full` - run both standard and desktop verification.
- `npm run release:check` - run version check, web build, tests, Electron
  packaging, and release artifact checks.

## Choosing A Gate

- Docs-only changes: `git diff --check`.
- Small code changes: `npm run test`.
- Shared behavior, routing, exports, or UI changes: `npm run verify`.
- Electron, patch-package, build output, or artifact changes:
  `npm run verify:desktop`.
- Release candidate: `npm run release:check`.
