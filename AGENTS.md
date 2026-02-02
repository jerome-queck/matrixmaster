# Repository Guidelines

## Project Structure & Module Organization
This repository is currently minimal and does not yet contain application source files. As the project is initialized, keep related code grouped in clear top-level directories and update this section with the actual layout. A common structure is:
- `/src` for source code
- `/tests` for automated tests
- `/assets` for static files (images, fixtures, etc.)
If you choose a different structure, document it here with concrete paths and examples.

## Build, Test, and Development Commands
No build or test tooling is configured yet. Once you add tooling, list the exact commands and what they do. Example pattern (replace with real commands):
- `npm run dev` — run the local development server
- `npm test` — run the full test suite
- `npm run lint` — check formatting and lint rules

## Coding Style & Naming Conventions
There are no repository-wide style rules configured yet. When you introduce a formatter or linter, document:
- Indentation (spaces vs tabs, and width)
- File and symbol naming patterns (e.g., `kebab-case` files, `CamelCase` classes)
- Required tooling (e.g., `prettier`, `eslint`, `black`, `gofmt`)
Until then, follow the standard style of the chosen language and keep names consistent within a module.

## Testing Guidelines
No testing framework or coverage requirements are defined yet. After selecting a framework, add:
- Test locations (e.g., `/tests` or `__tests__`)
- Naming conventions (e.g., `*.test.ts`, `*_test.py`)
- How to run unit vs integration tests

## Commit & Pull Request Guidelines
There is no established commit convention or PR template yet. If you adopt one (e.g., Conventional Commits), document it here with examples. For PRs, include a concise description, link related issues, and add screenshots or logs when changes are user-visible or operationally significant.

## Agent-Specific Instructions
If you add automation or agent tooling, list required setup steps and any commands that must be run before asking agents to modify code.
