# Matrix Master

Matrix Master is an offline-first linear algebra workspace for numeric and
symbolic computation. It runs fully locally, stores workspace data on the
machine, and packages as a desktop app for macOS and Windows.

## Feature Overview

### Core Workflows

- **System Solver** - row-reduction with step-by-step elimination.
- **Matrix Operations** - expressions such as `A * B`, `A^2`, and
  `(A + B) * C`.
- **Analysis** - rank, trace, decompositions, eigen workflows, and diagnostics.
- **Library** - local workspace and saved-object management.

### Advanced Tools

- Exact algebra workflows for vectors, bases, subspaces, and linear maps.
- Numeric workflows for LU/QR/SVD, orthogonality, least squares, iterative
  solvers, sparse views, and related analysis tools.
- Report, export, clipboard, and `.mmatrix` workspace flows.

### Desktop App

- macOS and Windows packaging through Electron.
- Local-first operation with optional update checks through GitHub Releases.
- Update status and controls in the desktop settings surface.

## Requirements

- Node.js 22.12+.
- npm.

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Desktop

```bash
npm run electron:dev
npm run electron:dist
```

More desktop details live in [docs/user/desktop.md](docs/user/desktop.md).

## Common Scripts

- `npm run dev` - start the Vite dev server.
- `npm run build` - build the web bundle.
- `npm run preview` - preview the production web build.
- `npm run test` - run calculation and Vitest tests.
- `npm run test:vitest` - run Vitest tests for UI, persistence, services, and hooks.
- `npm run verify` - run the standard verification gate.
- `npm run verify:desktop` - run desktop packaging verification.
- `npm run release:check` - run the release-candidate gate.

See [docs/development/testing.md](docs/development/testing.md) for the complete
command guide.

## Documentation

- [Documentation index](docs/index.md)
- [Repository guidelines](AGENTS.md)
- [Project structure](docs/development/project-structure.md)
- [Testing and verification](docs/development/testing.md)
- [Release process](docs/development/release-process.md)
- [Troubleshooting](docs/user/troubleshooting.md)
- [Changelog](CHANGELOG.md)

## Offline Behavior

Calculations, exports, saved objects, and `.mmatrix` workspaces are handled
locally. The only expected network call in desktop builds is the optional update
check against GitHub Releases.

## License

TBD
